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

  return (
    <main className="mx-auto w-full max-w-[640px] px-0 py-0">
      <div className="bg-[#c8102e] px-4 py-3 text-white">
        <Link to="/" className="text-sm text-red-100">← All stations</Link>
        <h2 className="text-xl font-bold uppercase">{titleCase(decoded)}</h2>
        {station && (
          <p className="flex gap-1 pt-1">
            {station.badges.map((b) => (
              <span key={b} className="rounded bg-[#23265d] px-1.5 py-0.5 text-[11px] font-bold">{b}</span>
            ))}
          </p>
        )}
      </div>
      {stationsQ.loading && <p className="px-4 py-4">Loading…</p>}
      {stationsQ.error && <p role="alert" className="px-4 py-4">Couldn&apos;t load timetable — check connection.</p>}
      {stationsQ.data && !station && <p className="px-4 py-4">Station not found.</p>}
      {station && <DestinationGroups station={station} />}
    </main>
  )
}
