import { Link } from 'react-router-dom'
import type { BoardDeparture } from '../lib/board'
import { patternLabel, platformLabel, titleCase } from '../lib/format'
import { formatMinutes } from '../lib/time'
import NoteChips, { isAC } from './NoteChips'

export type MergedBoardDeparture = BoardDeparture & { lineCode: string; instanceIndex: number }

/**
 * One departure row. No hero treatment for the first row beyond a subtle
 * "next scheduled" tag (set by the board via `nextScheduled`): with scheduled
 * data only, a big next-train hero would over-promise. The muted live-status
 * slot below the route line is where live text renders when a live proxy
 * exists; timetable-only builds leave it empty.
 */
export default function DepartureRow({
  dep,
  relative,
  nextScheduled = false,
}: {
  dep: MergedBoardDeparture
  relative: string
  nextScheduled?: boolean
}) {
  const [trainLine, seq] = dep.trainId.split(':')
  const label = patternLabel(dep.pattern)
  const isFast = label === 'Fast'
  const ac = isAC(dep.note)
  return (
    <li>
      <Link
        to={`/train/${trainLine}/${seq}?from=${dep.lineCode}:${dep.instanceIndex}`}
        className={`flex min-h-[56px] items-center gap-3 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d93a3e] sm:px-4 ${
          nextScheduled ? 'border-l-4 border-l-[#d93a3e] bg-[#d93a3e]/5 dark:bg-[#d93a3e]/10' : 'border-l-4 border-l-transparent'
        }`}
        aria-label={`${formatMinutes(dep.minutes)} to ${titleCase(dep.destination)}${dep.trainNumber ? `, train ${dep.trainNumber}` : ''}${nextScheduled ? ', next scheduled' : ''}`}
      >
        <span className="w-[62px] shrink-0">
          <span className="font-mono text-lg font-bold tracking-tight">{formatMinutes(dep.minutes)}</span>
          {dep.tomorrow && <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">tomorrow</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold tracking-wide uppercase">{dep.destinationDisplay}</span>
            {label && (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${isFast ? 'nf-pill-fast' : 'nf-pill-slow'}`}>
                {label}
              </span>
            )}
            {ac && <span className="nf-pill-ac inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase">❄ AC</span>}
            {nextScheduled && (
              <span className="inline-flex rounded-full bg-[#d93a3e] px-2 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase">
                Next scheduled
              </span>
            )}
          </span>
          {relative && <span className="block text-xs font-medium text-emerald-700 dark:text-emerald-400">{relative}</span>}
          <span className="block truncate text-sm text-zinc-600 dark:text-zinc-400">
            {dep.trainNumber ? `${dep.trainNumber} · ` : ''}{titleCase(dep.origin)} — {titleCase(dep.destination)}
          </span>
          {/* Live status slot (live-ready): renders only when live data exists. */}
          <NoteChips note={dep.note} hideAC />
        </span>
        {dep.platform && (
          <span className="shrink-0 text-right">
            <span className="block text-[10px] tracking-widest text-zinc-500 dark:text-zinc-400">PF</span>
            <span className="block font-mono text-xl leading-none font-bold text-[#3e63dd] dark:text-[#6e8dff]">{dep.platform.replace(/\|/g, '/')}</span>
            <span className="sr-only">{platformLabel(dep.platform)}</span>
          </span>
        )}
      </Link>
    </li>
  )
}
