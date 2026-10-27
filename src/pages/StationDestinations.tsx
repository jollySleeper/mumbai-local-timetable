import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import DestinationGroups from '../components/DestinationGroups'
import { useJson } from '../hooks/useJson'
import { getStations } from '../lib/data'
import { titleCase } from '../lib/format'
import { mergeStations } from '../lib/stations'

export default function StationDestinations() {
  const { name = '' } = useParams()
  const decoded = decodeURIComponent(name)
  const stationsQ = useJson(getStations)
  const station = stationsQ.data ? mergeStations(stationsQ.data.lines).find((s) => s.name === decoded) : undefined
  const lineNames = station ? [...new Map(station.instances.map((i) => [i.badge, i.lineName])).entries()] : []

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10">
      <Link
        to="/"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] dark:text-zinc-300"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        All stations
      </Link>
      <div className="mt-2 mb-5">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{titleCase(decoded)}</h1>
        {station && (
          <p className="mt-3 flex flex-wrap gap-2" aria-label="Lines serving this station">
            {lineNames.map(([badge, lineName]) => (
              <span key={badge} className="rounded-full border border-zinc-900/12 px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-white/15 dark:text-zinc-300">
                {lineName} · {badge}
              </span>
            ))}
          </p>
        )}
      </div>
      {stationsQ.loading && <p className="py-4" aria-live="polite">Loading…</p>}
      {stationsQ.error && (
        <div role="alert" className="nf-panel rounded-3xl p-4">
          <p>Couldn&apos;t load timetable — check connection.</p>
          <button type="button" onClick={stationsQ.reload} className="mt-2 min-h-[44px] rounded-full bg-[#d93a3e] px-4 font-semibold text-white">Retry</button>
        </div>
      )}
      {stationsQ.data && !station && <p className="py-4">Station not found.</p>}
      {station && <DestinationGroups station={station} />}
    </main>
  )
}
