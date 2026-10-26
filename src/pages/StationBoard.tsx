import { SlidersHorizontal, Star, X } from 'lucide-react'
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

  return (
    <main className="mx-auto w-full max-w-[640px] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-1 bg-[#c8102e] px-2 py-3 text-white">
        <Link to={`/s/${encodeURIComponent(stationName)}`} className="min-h-[44px] px-2 py-2 text-sm">←</Link>
        <h2 className="flex-1 text-lg font-bold tracking-wide uppercase">{titleCase(stationName)}</h2>
        <button
          type="button"
          aria-label={starred ? 'Remove favourite route' : 'Add favourite route'}
          aria-pressed={starred}
          onClick={() => route && setFavs(toggleFavourite(route))}
          className="min-h-[44px] px-2 text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Star aria-hidden="true" className="h-6 w-6" fill={starred ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          aria-label="Filters: originating from and terminating at"
          aria-pressed={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
          className="min-h-[44px] px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <SlidersHorizontal aria-hidden="true" className="h-6 w-6" />
        </button>
      </div>
      <p className="bg-white px-4 py-2 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
        Towards {boardQ.data?.label ?? '…'}
        {metaQ.data && <span className="text-zinc-400"> · Timetable {metaQ.data.version}</span>}
      </p>
      {!online && (
        <p role="status" className="bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
          Offline — showing saved timetable
        </p>
      )}

      {filtersOpen && (
        <section aria-label="Board filters" className="grid grid-cols-1 gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <label htmlFor="originating-from" className="mb-1 block text-sm font-semibold">Originating from</label>
            <select
              id="originating-from"
              value={originatingFrom}
              onChange={(e) => setOriginatingFrom(e.target.value)}
              className="min-h-[44px] w-full rounded border border-zinc-300 bg-transparent px-2 dark:border-zinc-700"
            >
              <option value="">All origins</option>
              {origins.map((o) => (
                <option key={o} value={o}>{titleCase(o)}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">Only trains that start their journey at the chosen station.</p>
          </div>
          <div>
            <label htmlFor="terminating-at" className="mb-1 block text-sm font-semibold">Terminating at</label>
            <select
              id="terminating-at"
              value={terminatingAt}
              onChange={(e) => setTerminatingAt(e.target.value)}
              className="min-h-[44px] w-full rounded border border-zinc-300 bg-transparent px-2 dark:border-zinc-700"
            >
              <option value="">All final destinations</option>
              {destinations.map((d) => (
                <option key={d} value={d}>{titleCase(d)}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">Only trains whose final destination is the chosen station.</p>
          </div>
        </section>
      )}

      {terminatingAt && (
        <p className="bg-white px-4 py-1 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setTerminatingAt('')}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-green-700 px-2 text-sm text-white"
          >
            <X aria-hidden="true" className="h-4 w-4" /> Terminating at {titleCase(terminatingAt)}
          </button>
        </p>
      )}
      {originatingFrom && (
        <p className="bg-white px-4 py-1 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setOriginatingFrom('')}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-green-700 px-2 text-sm text-white"
          >
            <X aria-hidden="true" className="h-4 w-4" /> Originating from {titleCase(originatingFrom)}
          </button>
        </p>
      )}

      {boardQ.loading && (
        <div aria-live="polite" className="space-y-2 px-4 py-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          ))}
          <p className="sr-only">Loading departures…</p>
        </div>
      )}
      {boardQ.error && (
        <div role="alert" className="m-4 rounded border border-red-300 p-3">
          <p>Couldn&apos;t load timetable — check connection.</p>
          <button type="button" onClick={boardQ.reload} className="mt-2 min-h-[44px] rounded bg-[#c8102e] px-3 text-white">Retry</button>
        </div>
      )}
      {boardQ.data && display.length === 0 && <p className="px-4 py-4">No departures match these filters.</p>}
      {boardQ.data && display.length > 0 && (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {display.map((dep, i) => (
            <DepartureRow
              key={`${dep.trainId}-${dep.minutes}-${dep.tomorrow ? 't' : 'd'}-${i}`}
              dep={dep}
              relative={bar !== 'ALL' && i < 10 ? relativeFor(dep.minutes, now, dep.tomorrow) : ''}
            />
          ))}
        </ul>
      )}

      <nav aria-label="Departure filters" className="sticky bottom-0 flex bg-[#23265d] text-white">
        {(['SLOW', 'FAST', 'AC', 'NEXT', 'ALL'] as Bar[]).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={bar === value}
            onClick={() => setBar(value)}
            className={`min-h-[48px] flex-1 text-sm tracking-wide ${bar === value ? 'font-bold' : 'opacity-70'}`}
          >
            {value}
          </button>
        ))}
      </nav>
      <p className="bg-white px-4 py-2 text-xs text-zinc-500 dark:bg-zinc-900">
        NEXT shows next departing trains from now; SLOW/FAST/AC filter those next trains by type. Trains terminating at {titleCase(stationName)} are arrivals and are not shown.
      </p>
    </main>
  )
}
