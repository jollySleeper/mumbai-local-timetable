import type { Departure } from './types'

export interface BoardDeparture extends Departure {
  tomorrow: boolean
}

export type DirectionFilter = 'all' | 'A' | 'B'

export type PatternFilter = 'ALL' | 'SLOW' | 'FAST' | 'AC'

/**
 * Dedupe merged departures: the same numbered train can appear in two line
 * files at an interchange (e.g. 98702 Goregaon-CSMT in both H and W at
 * Andheri). Numberless (metro) trains keep their line identity.
 */
export function dedupeDepartures<T extends { trainNumber: string | null; minutes: number; destination: string; origin: string; lineCode?: string }>(deps: T[]): T[] {
  const seen = new Set<string>()
  return deps.filter((d) => {
    const key = d.trainNumber
      ? `${d.trainNumber}|${d.minutes}|${d.destination}`
      : `${d.origin}|${d.destination}|${d.minutes}|${d.lineCode ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Trains you can actually board: exclude trains terminating at this station. */
export function departingTrains<T extends { destination: string }>(deps: T[], stationName: string): T[] {
  return deps.filter((d) => d.destination !== stationName)
}

/**
 * Specific filters (redesign v2, per user request — kept separate, never a
 * guessed combined list):
 * - originatingFrom: only trains whose journey starts at that station
 * - terminatingAt: only trains whose final destination is that station
 * - pattern: ALL / SLOW / FAST / AC (AC via the note text, §2.3.2)
 */
export function applyBoardFilters<T extends { origin: string; destination: string; pattern: string; note: string }>(
  deps: T[],
  opts: { originatingFrom?: string; terminatingAt?: string; pattern?: PatternFilter },
): T[] {
  let out = deps
  if (opts.originatingFrom) out = out.filter((d) => d.origin === opts.originatingFrom)
  if (opts.terminatingAt) out = out.filter((d) => d.destination === opts.terminatingAt)
  if (opts.pattern && opts.pattern !== 'ALL') {
    out = out.filter((d) => {
      if (opts.pattern === 'AC') return d.note.toUpperCase().includes('AC')
      const p = d.pattern.trim()
      const isFast = p.startsWith('F') || p.startsWith('SF')
      const isSlow = p.startsWith('S') && !p.startsWith('SF')
      return opts.pattern === 'FAST' ? isFast : isSlow
    })
  }
  return out
}

/**
 * Filter by direction (§6.1): compare destination index with current station.
 * A = towards headerA (lower indices), B = towards headerB (higher indices).
 * A departure terminating here is shown in All and in any direction view,
 * marked by the caller via destinationIndex === stationIndex.
 */
export function filterByDirection(
  deps: Departure[],
  stationIndex: number,
  dir: DirectionFilter,
): Departure[] {
  if (dir === 'all') return deps
  return deps.filter((d) => {
    if (d.destinationIndex === stationIndex) return true // terminates here
    return dir === 'A' ? d.destinationIndex < stationIndex : d.destinationIndex > stationIndex
  })
}

/**
 * Next-trains list (§6.1): departures with minutes >= now-1 first, in order;
 * filled up to `count` with the first departures of the day labelled tomorrow,
 * so the board never shows an empty screen at end of service.
 */
export function selectNext(deps: Departure[], now: number, count = 50): BoardDeparture[] {
  const sorted = [...deps].sort((a, b) => a.minutes - b.minutes)
  const remaining = sorted.filter((d) => d.minutes >= now - 1)
  const result: BoardDeparture[] = remaining.slice(0, count).map((d) => ({ ...d, tomorrow: false }))
  if (result.length < count) {
    for (const d of sorted) {
      if (result.length >= count) break
      result.push({ ...d, tomorrow: true })
    }
  }
  return result
}

/** Relative label taking tomorrow into account: minutes may be +1440. */
export function relativeFor(minutes: number, now: number, tomorrow: boolean): string {
  const diff = minutes + (tomorrow ? 1440 : 0) - now
  if (diff < 0) return ''
  if (diff === 0) return 'now'
  if (diff < 60) return `in ${diff} min`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m ? `in ${h}h ${m}m` : `in ${h}h`
}
