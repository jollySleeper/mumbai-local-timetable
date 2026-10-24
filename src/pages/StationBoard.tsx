import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import DepartureRow from '../components/DepartureRow'
import { useJson } from '../hooks/useJson'
import { filterByDirection, relativeFor, selectNext, type DirectionFilter } from '../lib/board'
import { getDepartures, getMeta, getStations } from '../lib/data'
import { titleCase } from '../lib/format'
import { nowMinutesIST } from '../lib/time'

export default function StationBoard() {
  const { line = 'W', stationIndex: stationIndexRaw = '15' } = useParams()
  const stationIndex = Number(stationIndexRaw)
  const [now, setNow] = useState(() => nowMinutesIST())
  const [fullDay, setFullDay] = useState(false)
  const [dir, setDir] = useState<DirectionFilter>('all')
  const [online, setOnline] = useState(() => navigator.onLine)

  const depsQ = useJson(() => getDepartures(line, stationIndex), [line, stationIndex])
  const stationsQ = useJson(getStations)
  const metaQ = useJson(getMeta)

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

  const lineInfo = stationsQ.data?.lines.find((l) => l.code === line)
  const stationName = depsQ.data?.station ?? lineInfo?.stations.find((s) => s.index === stationIndex)?.name ?? ''

  useEffect(() => {
    if (!lineInfo || !stationName) return
    try {
      localStorage.setItem(
        'tt-last-station',
        JSON.stringify({ line, stationIndex, stationName, lineName: lineInfo.name }),
      )
    } catch {
      /* ignore */
    }
  }, [line, stationIndex, lineInfo, stationName])

  const filtered = useMemo(() => {
    if (!depsQ.data) return []
    return filterByDirection(depsQ.data.departures, stationIndex, dir)
  }, [depsQ.data, stationIndex, dir])

  const boardDeps = useMemo(() => {
    if (fullDay) {
      return [...filtered]
        .sort((a, b) => a.minutes - b.minutes)
        .map((d) => ({ ...d, tomorrow: false }))
    }
    return selectNext(filtered, now, 100)
  }, [filtered, fullDay, now])

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-4 pb-[env(safe-area-inset-bottom)]">
      <header className="mb-3">
        <h2 className="text-2xl font-bold">{stationName ? titleCase(stationName) : 'Station'}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {lineInfo ? `${lineInfo.name} line` : line}
          {metaQ.data && <span> · Timetable {metaQ.data.version}</span>}
        </p>
        {!online && (
          <p role="status" className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
            Offline — showing saved timetable
          </p>
        )}
      </header>

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Direction filter">
        {(
          [
            ['all', 'All'],
            ['A', lineInfo ? `Towards ${titleCase(lineInfo.headerA)}` : 'Towards A'],
            ['B', lineInfo ? `Towards ${titleCase(lineInfo.headerB)}` : 'Towards B'],
          ] as [DirectionFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={dir === value}
            onClick={() => setDir(value)}
            className={`min-h-[44px] rounded-full border px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
              dir === value ? 'border-red-700 bg-red-700 text-white' : 'border-zinc-300 dark:border-zinc-700'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={fullDay}
          onClick={() => setFullDay((v) => !v)}
          className={`min-h-[44px] rounded-full border px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
            fullDay ? 'border-red-700 bg-red-700 text-white' : 'border-zinc-300 dark:border-zinc-700'
          }`}
        >
          {fullDay ? 'Showing full day' : 'Show full day'}
        </button>
      </div>

      {depsQ.loading && (
        <div aria-live="polite" className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ))}
          <p className="sr-only">Loading departures…</p>
        </div>
      )}

      {depsQ.error && (
        <div role="alert" className="rounded-lg border border-red-300 p-3 dark:border-red-800">
          <p>Couldn&apos;t load timetable — check connection.</p>
          <button type="button" onClick={depsQ.reload} className="mt-2 min-h-[44px] rounded bg-red-700 px-3 text-white">
            Retry
          </button>
        </div>
      )}

      {depsQ.data && boardDeps.length === 0 && <p>No departures for this filter.</p>}

      {depsQ.data && boardDeps.length > 0 && (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {boardDeps.map((dep, i) => (
            <DepartureRow
              key={`${dep.trainId}-${dep.minutes}-${dep.tomorrow ? 't' : 'd'}-${i}`}
              dep={dep}
              stationIndex={stationIndex}
              relative={!fullDay && i < 10 ? relativeFor(dep.minutes, now, dep.tomorrow) : ''}
            />
          ))}
        </ul>
      )}
    </main>
  )
}
