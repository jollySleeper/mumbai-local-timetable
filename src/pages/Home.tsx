import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LinePicker from '../components/LinePicker'
import StationPicker, { type StationOption } from '../components/StationPicker'
import { useJson } from '../hooks/useJson'
import { getStations, getTrainIndex } from '../lib/data'
import type { TrainIndexEntry } from '../lib/types'
import { titleCase } from '../lib/format'

const LAST_KEY = 'tt-last-station'

export interface LastStation {
  line: string
  stationIndex: number
  stationName: string
  lineName: string
}

export function readLastStation(): LastStation | null {
  try {
    const raw = localStorage.getItem(LAST_KEY)
    return raw ? (JSON.parse(raw) as LastStation) : null
  } catch {
    return null
  }
}

export default function Home() {
  const navigate = useNavigate()
  const stationsQ = useJson(getStations)
  const indexQ = useJson(getTrainIndex)
  const [line, setLine] = useState('W')
  const [stationQuery, setStationQuery] = useState('')
  const [trainQuery, setTrainQuery] = useState('')
  const [trainResults, setTrainResults] = useState<TrainIndexEntry[] | null>(null)
  const [trainSearched, setTrainSearched] = useState(false)
  const last = useMemo(readLastStation, [])

  const lines = stationsQ.data?.lines ?? []
  const currentLine = lines.find((l) => l.code === line) ?? lines[0]

  const stationOptions: StationOption[] = useMemo(() => {
    const q = stationQuery.trim().toUpperCase()
    if (q) {
      // Cross-line station search: same name may exist on multiple lines.
      return lines.flatMap((l) =>
        l.stations
          .filter((s) => s.name.includes(q))
          .map((station) => ({ lineCode: l.code, lineName: l.name, station })),
      )
    }
    if (!currentLine) return []
    return currentLine.stations.map((station) => ({
      lineCode: currentLine.code,
      lineName: currentLine.name,
      station,
    }))
  }, [lines, currentLine, stationQuery])

  const selectStation = (opt: StationOption) => {
    const value: LastStation = {
      line: opt.lineCode,
      stationIndex: opt.station.index,
      stationName: opt.station.name,
      lineName: opt.lineName,
    }
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(value))
    } catch {
      /* storage unavailable */
    }
    navigate(`/station/${opt.lineCode}/${opt.station.index}`)
  }

  const searchTrain = (e: React.FormEvent) => {
    e.preventDefault()
    const q = trainQuery.trim()
    if (!q || !indexQ.data) return
    const matches = indexQ.data.filter((t) => t.no === q)
    setTrainResults(matches)
    setTrainSearched(true)
    if (matches.length === 1) {
      const [lineCode, seq] = matches[0].trainId.split(':')
      navigate(`/train/${lineCode}/${seq}`)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-6">
      <h2 className="sr-only">Choose a station or search by train number</h2>

      {last && (
        <Link
          to={`/station/${last.line}/${last.stationIndex}`}
          className="mb-4 block rounded-lg bg-red-700 px-4 py-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          Continue: {titleCase(last.stationName)} — {last.lineName}
        </Link>
      )}

      {stationsQ.loading && <p aria-live="polite">Loading lines…</p>}
      {stationsQ.error && (
        <div role="alert" className="rounded-lg border border-red-300 p-3">
          <p>Couldn&apos;t load timetable — check connection.</p>
          <button type="button" onClick={stationsQ.reload} className="mt-2 min-h-[44px] rounded bg-red-700 px-3 text-white">
            Retry
          </button>
        </div>
      )}

      {currentLine && (
        <>
          <LinePicker lines={lines} value={currentLine.code} onChange={(c) => { setLine(c); setStationQuery('') }} />

          <div className="mt-5">
            <label htmlFor="station-search" className="mb-1 block font-semibold">
              Station on {currentLine.name} (or search any line)
            </label>
            <input
              id="station-search"
              type="search"
              value={stationQuery}
              onChange={(e) => setStationQuery(e.target.value)}
              placeholder="Search station, e.g. Dadar"
              className="min-h-[44px] w-full rounded-lg border border-zinc-300 px-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="mt-2">
              <StationPicker label="Stations" options={stationOptions} onSelect={selectStation} />
            </div>
          </div>
        </>
      )}

      <form onSubmit={searchTrain} className="mt-6">
        <label htmlFor="train-search" className="mb-1 block font-semibold">
          Train number
        </label>
        <div className="flex gap-2">
          <input
            id="train-search"
            inputMode="numeric"
            type="search"
            value={trainQuery}
            onChange={(e) => { setTrainQuery(e.target.value); setTrainSearched(false) }}
            placeholder="e.g. 90171"
            className="min-h-[44px] w-full rounded-lg border border-zinc-300 px-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button type="submit" className="min-h-[44px] shrink-0 rounded-lg bg-red-700 px-4 text-white">
            Search
          </button>
        </div>
        {indexQ.loading && <p className="mt-1 text-sm text-zinc-500">Loading train index…</p>}
        {trainSearched && Array.isArray(trainResults) && trainResults.length === 0 && (
          <p className="mt-2 text-sm">No train found with that number.</p>
        )}
        {Array.isArray(trainResults) && trainResults.length > 1 && (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-300 dark:divide-zinc-800 dark:border-zinc-700">
            {trainResults.map((t) => {
              const [l, seq] = t.trainId.split(':')
              return (
                <li key={t.trainId}>
                  <Link to={`/train/${l}/${seq}`} className="block min-h-[44px] px-3 py-2">
                    {t.no} — {titleCase(t.origin)} → {titleCase(t.destination)} ({t.firstTime}, {t.line})
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </form>
    </main>
  )
}
