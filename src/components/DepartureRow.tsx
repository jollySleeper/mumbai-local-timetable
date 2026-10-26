import { Link } from 'react-router-dom'
import type { BoardDeparture } from '../lib/board'
import { patternLabel, platformLabel, titleCase } from '../lib/format'
import { formatMinutes } from '../lib/time'
import NoteChips from './NoteChips'

export type MergedBoardDeparture = BoardDeparture & { lineCode: string; instanceIndex: number }

export default function DepartureRow({
  dep,
  relative,
}: {
  dep: MergedBoardDeparture
  relative: string
}) {
  const [trainLine, seq] = dep.trainId.split(':')
  const label = patternLabel(dep.pattern)
  const isFast = label === 'Fast'
  return (
    <li className="bg-white dark:bg-zinc-950">
      <Link
        to={`/train/${trainLine}/${seq}?from=${dep.lineCode}:${dep.instanceIndex}`}
        className="flex min-h-[52px] items-stretch gap-2 pr-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]"
        aria-label={`${formatMinutes(dep.minutes)} to ${titleCase(dep.destination)}${dep.trainNumber ? `, train ${dep.trainNumber}` : ''}`}
      >
        <span
          aria-hidden="true"
          className={`flex w-5 shrink-0 items-center justify-center text-[11px] font-bold text-white ${isFast ? 'bg-[#c8102e]' : 'bg-green-700'}`}
        >
          {isFast ? 'F' : 'S'}
        </span>
        <span className="min-w-0 flex-1 py-2">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-lg font-semibold">{formatMinutes(dep.minutes)}</span>
            <span className="font-semibold tracking-wide uppercase">{dep.destinationDisplay}</span>
            {label && <span className="text-sm text-zinc-500">{dep.pattern}</span>}
            {dep.tomorrow && <span className="text-xs text-zinc-500">tomorrow</span>}
          </span>
          {relative && <span className="block text-xs font-medium text-green-700 dark:text-green-400">{relative}</span>}
          <span className="block truncate text-sm text-zinc-600 dark:text-zinc-400">
            {dep.trainNumber ? `${dep.trainNumber} : ` : ''}{titleCase(dep.origin)} — {titleCase(dep.destination)}
          </span>
          {/* Live status slot (live-ready UI): rendered only when live data exists; timetable-only v2 has none. */}
          <NoteChips note={dep.note} />
        </span>
        {dep.platform && (
          <span className="shrink-0 py-2 text-right">
            <span className="block text-[10px] tracking-wide text-zinc-500">PF</span>
            <span className="block text-xl leading-none font-semibold">{dep.platform.replace(/\|/g, '/')}</span>
            <span className="sr-only">{platformLabel(dep.platform)}</span>
          </span>
        )}
      </Link>
    </li>
  )
}
