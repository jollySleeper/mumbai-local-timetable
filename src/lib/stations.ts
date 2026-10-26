import { titleCase } from './format'
import type { LineInfo } from './types'

// Unified stations (redesign v2): merge line-stations by raw station name so
// Andheri is one station with W/H/MM1 instances, like m-Indicator.
// Weekday/weekend variant datasets (MM1WD/MM1WE etc.) are NOT both shown:
// the active variant for today is picked (spec §2.3.3 datasets stay separate
// on disk; only one is ever displayed at a time).

export interface StationInstance {
  lineCode: string
  lineName: string
  stationIndex: number
  stationCount: number
  headerA: string
  headerB: string
  badge: string
}

export interface UnifiedStation {
  name: string
  instances: StationInstance[]
  badges: string[]
}

const VARIANTS: Record<string, { family: string; kind: 'WD' | 'WE' }> = {
  MM1WD: { family: 'MM1', kind: 'WD' },
  MM1WE: { family: 'MM1', kind: 'WE' },
  MM3WD: { family: 'MM3', kind: 'WD' },
  MM3WE: { family: 'MM3', kind: 'WE' },
  MONO1: { family: 'MONO', kind: 'WD' },
  MONO1WE: { family: 'MONO', kind: 'WE' },
}

export function badgeFor(lineCode: string): string {
  return VARIANTS[lineCode]?.family ?? lineCode
}

/** IST weekend (Sat/Sun) via Intl, never device-local day for schedule choice. */
export function isWeekendIST(now: Date = new Date()): boolean {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(now)
  return wd === 'Sat' || wd === 'Sun'
}

function activeInstances(instances: StationInstance[], weekend: boolean): StationInstance[] {
  const byFamily = new Map<string, StationInstance[]>()
  const passthrough: StationInstance[] = []
  for (const inst of instances) {
    const v = VARIANTS[inst.lineCode]
    if (!v) {
      passthrough.push(inst)
    } else {
      const arr = byFamily.get(v.family) ?? []
      arr.push(inst)
      byFamily.set(v.family, arr)
    }
  }
  const picked: StationInstance[] = []
  for (const [family, arr] of byFamily) {
    const want = weekend ? 'WE' : 'WD'
    picked.push(arr.find((i) => VARIANTS[i.lineCode].kind === want) ?? arr[0])
    void family
  }
  return [...passthrough, ...picked]
}

export function mergeStations(lines: LineInfo[], weekend: boolean = isWeekendIST()): UnifiedStation[] {
  const map = new Map<string, StationInstance[]>()
  for (const line of lines) {
    for (const st of line.stations) {
      const inst: StationInstance = {
        lineCode: line.code,
        lineName: line.name,
        stationIndex: st.index,
        stationCount: line.stations.length,
        headerA: line.headerA,
        headerB: line.headerB,
        badge: badgeFor(line.code),
      }
      const arr = map.get(st.name) ?? []
      arr.push(inst)
      map.set(st.name, arr)
    }
  }
  return [...map.entries()]
    .map(([name, instances]) => {
      const active = activeInstances(instances, weekend)
      return { name, instances: active, badges: [...new Set(active.map((i) => i.badge))] }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

// --- Direction clusters -------------------------------------------------
// A direction is identified by the cluster of the terminal it heads to.
// Churchgate and CSMT are both the south Mumbai terminal cluster.

const CLUSTER_ALIASES: Record<string, string> = {
  CHURCHGATE: 'SOUTH',
  CSMT: 'SOUTH',
}

export function clusterOf(header: string): string {
  const first = (header || '').split(',')[0].trim().toUpperCase()
  return CLUSTER_ALIASES[first] ?? (first || 'OTHER')
}

export function clusterSlug(cluster: string): string {
  return cluster.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export interface DirectionGroup {
  cluster: string
  slug: string
  label: string
  directions: { instance: StationInstance; dir: 'A' | 'B' }[]
}

function headerLabel(header: string): string {
  return header
    .split(/[,/]/)
    .map((p) => titleCase(p.trim()))
    .filter(Boolean)
    .join(' / ')
}

/** Destination groups for the station expansion, merged by terminal cluster. */
export function directionGroups(station: UnifiedStation): DirectionGroup[] {
  const groups = new Map<string, DirectionGroup>()
  const add = (instance: StationInstance, dir: 'A' | 'B') => {
    const header = dir === 'A' ? instance.headerA : instance.headerB
    const cluster = clusterOf(header)
    const slug = clusterSlug(cluster)
    let g = groups.get(slug)
    if (!g) {
      g = { cluster, slug, label: headerLabel(header), directions: [] }
      groups.set(slug, g)
    } else {
      // Merge labels, e.g. SOUTH -> "Churchgate / CSMT"
      const parts = new Set(g.label.split(' / '))
      headerLabel(header)
        .split(' / ')
        .forEach((p) => parts.add(p))
      g.label = [...parts].join(' / ')
    }
    g.directions.push({ instance, dir })
  }
  for (const inst of station.instances) {
    if (inst.stationIndex > 0) add(inst, 'A')
    if (inst.stationIndex < inst.stationCount - 1) add(inst, 'B')
  }
  return [...groups.values()]
}

/** Cluster a departure belongs to from one station instance, or null if it terminates there. */
export function departureCluster(instance: StationInstance, destIndex: number): string | null {
  if (destIndex === instance.stationIndex) return null
  const header = destIndex < instance.stationIndex ? instance.headerA : instance.headerB
  return clusterOf(header)
}
