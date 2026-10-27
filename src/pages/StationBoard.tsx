import { ArrowLeft, SlidersHorizontal, Star, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import DepartureRow, { type MergedBoardDeparture } from '../components/DepartureRow'
import { useJson } from '../hooks/useJson'
import {
  applyBoardFilters,
  dedupeDepartures,
  departingTrains,
  relativeFor,
  selectNext,
  type PatternFilter,
} from '../lib/board'
import { getDepartures, getMeta, getStations } from '../lib/data'
import { isFavourite, loadFavourites, toggleFavourite, type FavRoute } from '../lib/favourites'
import { titleCase } from '../lib/format'
import {
  departureCluster,
  directionGroups,
  mergeStations,
  type UnifiedStation,
} from '../lib/stations'
import { nowMinutesIST } from '../lib/time'
import type { Departure } from '../lib/types'

type Bar = 'NEXT' | 'ALL' | 'SLOW' | 'FAST' | 'AC'

interface BoardData {
  station: UnifiedStation
  label: string
  cluster: string
  deps: (Departure & { lineCode: string; instanceIndex: number })[]
}

function LegacyRedirect() {
  const { line = '', stationIndex = '' } = useParams()
  const q = useJson(getStations)
  if (q.loading) return <main className="px-4 py-4">Loading…</main>
  const lineInfo = q.data?.lines.find((l) => l.code === line)
  const st = lineInfo?.stations.find((s) => s.index === Number(stationIndex))
  if (!st) return <main className="px-4 py-4">Station not found.</main>
  return <Navigate to={`/s/${encodeURIComponent(st.name)}`} replace />
}

export default function StationBoard() {
  const params = useParams()
  if (params.line) return <LegacyRedirect />
  return <UnifiedBoard />
}

function UnifiedBoard() {
  const { name = '', cluster: slug = '' } = useParams()
  const stationName = decodeURIComponent(name)
  const [now, setNow] = useState(() => nowMinutesIST())
  const [bar, setBar] = useState<Bar>('NEXT')
  const [originatingFrom, setOriginatingFrom] = useState('')
  const [terminatingAt, setTerminatingAt] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [favs, setFavs] = useState(loadFavourites)
  const metaQ = useJson(getMeta)

  const boardQ = useJson(async (): Promise<BoardData> => {
    const stations = await getStations()
    const station = mergeStations(stations.lines).find((s) => s.name === stationName)
    if (!station) throw new Error(`Unknown station ${stationName}`)
    const group = directionGroups(station).find((g) => g.slug === slug)
    if (!group) throw new Error(`Unknown direction ${slug}`)
    const perInstance = await Promise.all(
      station.instances.map(async (inst) => {
        const file = await getDepartures(inst.lineCode, inst.stationIndex)
        return file.departures.map((d) => ({ ...d, lineCode: inst.lineCode, instanceIndex: inst.stationIndex }))
      }),
    )
    return { station, label: group.label, cluster: group.cluster, deps: perInstance.flat() }
  }, [stationName, slug])

  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutesIST()), 30_000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const station = boardQ.data?.station
  useEffect(() => {
    if (!station) return
    try {
      localStorage.setItem(
        'tt-last-station',
        JSON.stringify({ stationName: station.name, line: station.instances[0]?.lineCode ?? '', stationIndex: station.instances[0]?.stationIndex ?? 0, lineName: '' }),
      )
    } catch {
      /* ignore */
    }
  }, [station])

  const clusterDeps = useMemo(() => {
    if (!boardQ.data) return []
    const { station: st, deps, cluster } = boardQ.data
    const byLine = new Map(st.instances.map((i) => [i.lineCode, i]))
    return departingTrains(dedupeDepartures(deps), st.name).filter((d) => {
      const inst = byLine.get(d.lineCode)
      return inst ? departureCluster(inst, d.destinationIndex) === cluster : false
    })
  }, [boardQ.data])

  const origins = useMemo(() => [...new Set(clusterDeps.map((d) => d.origin))].sort(), [clusterDeps])
  const destinations = useMemo(() => [...new Set(clusterDeps.map((d) => d.destination))].sort(), [clusterDeps])

  const display: MergedBoardDeparture[] = useMemo(() => {
    const pattern: PatternFilter = bar === 'SLOW' || bar === 'FAST' || bar === 'AC' ? bar : 'ALL'
    const filtered = applyBoardFilters(clusterDeps, {
      originatingFrom: originatingFrom || undefined,
      terminatingAt: terminatingAt || undefined,
      pattern,
    })
    if (bar === 'ALL') {
      return [...filtered].sort((a, b) => a.minutes - b.minutes).map((d) => ({ ...d, tomorrow: false }))
    }
    return selectNext(filtered, now, 100)
  }, [clusterDeps, originatingFrom, terminatingAt, bar, now])

  const route: FavRoute | null = boardQ.data
    ? { stationName, cluster: boardQ.data.cluster, slug, label: boardQ.data.label }
    : null
  const starred = route ? isFavourite(favs, route.stationName, route.slug) : false
  const filterFieldClass =
    'min-h-[48px] w-full rounded-2xl border border-zinc-900/10 bg-white/80 px-3 dark:border-white/10 dark:bg-zinc-900/80'

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10">
      {/* Header panel */}
      <div className="nf-panel rounded-3xl p-4 sm:p-5">
        <div className="flex items-start gap-2">
          <Link
            to={`/s/${encodeURIComponent(stationName)}`}
            className="flex min-h-[44px] items-center gap-1.5 rounded-full px-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]"
            aria-label={`Back to ${titleCase(stationName)} directions`}
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
            <span className="hidden sm:inline">Directions</span>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl">{titleCase(stationName)}</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Towards {boardQ.data?.label ?? '…'} · Scheduled
              {metaQ.data && <span className="text-zinc-500 dark:text-zinc-400"> · Timetable {metaQ.data.version}</span>}
            </p>
          </div>
          <button
            type="button"
            aria-label={starred ? 'Remove saved route' : 'Save this route'}
            aria-pressed={starred}
            onClick={() => route && setFavs(toggleFavourite(route))}
            className="min-h-[44px] shrink-0 px-2 text-[#f5a524] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]"
          >
            <Star aria-hidden="true" className="h-6 w-6" fill={starred ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            aria-label="Filters: originating from and terminating at"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
            className="min-h-[44px] shrink-0 px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] lg:hidden"
          >
            <SlidersHorizontal aria-hidden="true" className="h-6 w-6" />
          </button>
        </div>

        {!online && (
          <p role="status" className="mt-3 rounded-2xl bg-[#f5a524]/20 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            Offline — showing saved timetable
          </p>
        )}

        {/* Two precise filters — always visible on desktop, toggle on mobile. */}
        <section
          aria-label="Board filters"
          className={`${filtersOpen ? 'grid' : 'hidden'} mt-4 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid`}
        >
          <div>
            <label htmlFor="originating-from" className="mb-1 block text-sm font-semibold">Originating from</label>
            <select id="originating-from" value={originatingFrom} onChange={(e) => setOriginatingFrom(e.target.value)} className={filterFieldClass}>
              <option value="">Any station</option>
              {origins.map((o) => (
                <option key={o} value={o}>{titleCase(o)}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Only trains that start their journey at the chosen station.</p>
          </div>
          <div>
            <label htmlFor="terminating-at" className="mb-1 block text-sm font-semibold">Terminating at</label>
            <select id="terminating-at" value={terminatingAt} onChange={(e) => setTerminatingAt(e.target.value)} className={filterFieldClass}>
              <option value="">Any station</option>
              {destinations.map((d) => (
                <option key={d} value={d}>{titleCase(d)}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Only trains whose final destination is the chosen station.</p>
          </div>
        </section>

        {(originatingFrom || terminatingAt) && (
          <p className="mt-3 flex flex-wrap gap-2">
            {originatingFrom && (
              <button type="button" onClick={() => setOriginatingFrom('')} className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-emerald-700 px-3 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]">
                <X aria-hidden="true" className="h-4 w-4" /> Originating from {titleCase(originatingFrom)}
              </button>
            )}
            {terminatingAt && (
              <button type="button" onClick={() => setTerminatingAt('')} className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-emerald-700 px-3 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]">
                <X aria-hidden="true" className="h-4 w-4" /> Terminating at {titleCase(terminatingAt)}
              </button>
            )}
          </p>
        )}

        {/* Pattern tabs + colour legend */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Departure view">
            {(['NEXT', 'ALL', 'SLOW', 'FAST', 'AC'] as Bar[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={bar === value}
                onClick={() => setBar(value)}
                className={`min-h-[44px] rounded-full px-4 text-sm font-bold tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] ${
                  bar === value ? 'nf-glow-accent bg-[#d93a3e] text-white' : 'border border-zinc-900/10 bg-white/60 dark:border-white/10 dark:bg-white/5'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="ml-auto flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400" aria-label="Colour legend">
            <span className="nf-pill-fast inline-flex rounded-full px-2 py-0.5 font-bold uppercase">Fast</span>
            <span className="nf-pill-slow inline-flex rounded-full px-2 py-0.5 font-bold uppercase">Slow</span>
            <span className="nf-pill-ac inline-flex rounded-full px-2 py-0.5 font-bold uppercase">❄ AC</span>
            <span className="nf-pill-muted inline-flex rounded-full px-2 py-0.5 font-bold uppercase">15 Car</span>
          </p>
        </div>
      </div>

      {/* Departures */}
      <section aria-label="Departures" className="nf-panel mt-4 overflow-hidden rounded-3xl">
        {boardQ.loading && (
          <div aria-live="polite" className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-zinc-900/8 dark:bg-white/8" />
            ))}
            <p className="sr-only">Loading departures…</p>
          </div>
        )}
        {boardQ.error && (
          <div role="alert" className="m-4 rounded-2xl border border-red-300 p-3 dark:border-red-800">
            <p>Couldn&apos;t load timetable — check connection.</p>
            <button type="button" onClick={boardQ.reload} className="mt-2 min-h-[44px] rounded-full bg-[#d93a3e] px-4 font-semibold text-white">Retry</button>
          </div>
        )}
        {boardQ.data && display.length === 0 && <p className="p-4">No departures match these filters.</p>}
        {boardQ.data && display.length > 0 && (
          <ul className="divide-y divide-zinc-900/6 dark:divide-white/8">
            {display.map((dep, i) => (
              <DepartureRow
                key={`${dep.trainId}-${dep.minutes}-${dep.tomorrow ? 't' : 'd'}-${i}`}
                dep={dep}
                relative={bar !== 'ALL' && i < 10 ? relativeFor(dep.minutes, now, dep.tomorrow) : ''}
                nextScheduled={bar !== 'ALL' && i === 0}
              />
            ))}
          </ul>
        )}
      </section>
      <p className="px-1 pt-3 text-xs text-zinc-500 dark:text-zinc-400">
        NEXT shows the next scheduled departures from now; SLOW / FAST / AC filter by train type. Trains terminating at {titleCase(stationName)} are arrivals and are not shown. Times are scheduled — trains may run late.
      </p>
    </main>
  )
}
