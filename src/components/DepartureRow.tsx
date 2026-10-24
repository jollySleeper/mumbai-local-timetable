import { Link } from 'react-router-dom'
import { patternLabel, platformLabel, titleCase } from '../lib/format'
import { formatMinutes } from '../lib/time'
import type { BoardDeparture } from '../lib/board'
import NoteChips from './NoteChips'

export default function DepartureRow({
  dep,
  stationIndex,
  relative,
}: {
  dep: BoardDeparture
  stationIndex: number
  relative: string
}) {
  const [trainLine, seq] = dep.trainId.split(':')
  const terminates = dep.destinationIndex === stationIndex
  const label = patternLabel(dep.pattern)
  return (
    <li>
      <Link
        to={`/train/${trainLine}/${seq}?from=${stationIndex}`}
        className="flex min-h-[44px] items-start gap-3 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        aria-label={`${formatMinutes(dep.minutes)} to ${titleCase(dep.destination)}${dep.trainNumber ? `, train ${dep.trainNumber}` : ''}`}
      >
        <span className="w-14 shrink-0">
          <span className="block font-mono text-base font-semibold">{formatMinutes(dep.minutes)}</span>
          {relative && <span className="block text-xs text-red-700 dark:text-red-400">{relative}</span>}
          {dep.tomorrow && <span className="block text-xs text-zinc-500">tomorrow</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {titleCase(dep.destination)}
            {terminates && <span className="ml-1 text-xs text-zinc-500">(Terminates here)</span>}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            {label && (
              <span className={`rounded px-1.5 py-0.5 font-medium ${label === 'Fast' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100'}`}>
                {label}
              </span>
            )}
            {dep.trainNumber && <span>#{dep.trainNumber}</span>}
            {dep.platform && <span>{platformLabel(dep.platform)}</span>}
            <NoteChips note={dep.note} />
          </span>
        </span>
      </Link>
    </li>
  )
}
