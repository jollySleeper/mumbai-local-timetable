import { Share2, TrainFront } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import NoteChips from '../components/NoteChips'
import { useJson } from '../hooks/useJson'
import { getTrainByParts } from '../lib/data'
import { patternLabel, platformLabel, titleCase } from '../lib/format'
import { MAJOR_STATIONS, sideLabel } from '../lib/major'

export default function TrainDetail() {
  const { line = '', seq = '' } = useParams()
  const [search] = useSearchParams()
  const [shared, setShared] = useState(false)
  const fromRaw = search.get('from')
  // New boards pass "<line>:<stationIndex>"; legacy boards passed just the index.
  const fromLine = fromRaw?.includes(':') ? fromRaw.split(':')[0] : null
  const fromIndex = fromRaw ? Number(fromRaw.split(':').pop()) : null

  const trainQ = useJson(() => getTrainByParts(line, seq), [line, seq])
  const train = trainQ.data

  const share = async () => {
    const url = window.location.href
    const title = train ? `${train.trainNumber ?? ''} ${titleCase(train.origin)} - ${titleCase(train.destination)}` : 'Train'
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setShared(true)
      }
    } catch {
      /* user cancelled share */
    }
  }

  return (
    <main className="mx-auto w-full max-w-[640px] pb-[env(safe-area-inset-bottom)]">
      {trainQ.loading && (
        <div aria-live="polite" className="space-y-2 px-4 py-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          ))}
          <p className="sr-only">Loading train…</p>
        </div>
      )}
      {trainQ.error && (
        <div role="alert" className="m-4 rounded border border-red-300 p-3">
          <p>Couldn&apos;t load timetable — check connection.</p>
          <button type="button" onClick={trainQ.reload} className="mt-2 min-h-[44px] rounded bg-[#c8102e] px-3 text-white">Retry</button>
        </div>
      )}
      {train && (
        <>
          <div className="flex items-center gap-2 bg-[#c8102e] px-4 py-3 text-white">
            <TrainFront aria-hidden="true" className="h-6 w-6 shrink-0" />
            <h2 className="flex-1 text-lg leading-tight font-bold tracking-wide uppercase">
              {titleCase(train.origin)} - {titleCase(train.destination)}
            </h2>
            {train.trainNumber && <span className="shrink-0 text-sm font-semibold">{train.trainNumber}</span>}
            <button type="button" onClick={share} aria-label="Share this train" className="min-h-[44px] shrink-0 px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Share2 aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <div className="bg-white px-4 py-2 dark:bg-zinc-900">
            <p className="text-xs tracking-widest text-zinc-500 uppercase">
              Scheduled{patternLabel(train.pattern) ? ` — ${patternLabel(train.pattern)}` : ''}
              {/* EXPECTED (live) column appears only when a live proxy is configured; timetable-only v2 omits it. */}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {train.trainNumber ? `Train ${train.trainNumber} · ` : `Departs ${titleCase(train.origin)} ${train.stops[0]?.time ?? ''} · `}
              Pattern: {train.pattern || '—'} · Line {train.line}
              {shared && <span className="ml-2 text-green-700 dark:text-green-400">Link copied</span>}
            </p>
            {train.note && (
              <p className="mt-1 flex items-center gap-2 text-sm">
                <span>{train.note}</span>
                <NoteChips note={train.note} />
              </p>
            )}
          </div>

          <ol className="relative bg-white dark:bg-zinc-950">
            <span aria-hidden="true" className="absolute top-0 bottom-0 left-[86px] w-px bg-zinc-300 dark:bg-zinc-700" />
            {train.stops.map((stop, i) => {
              const highlighted =
                fromIndex !== null &&
                stop.stationIndex === fromIndex &&
                (fromLine === null || fromLine === train.line)
              const major = MAJOR_STATIONS.has(stop.station)
              const isFirst = i === 0
              const isLast = i === train.stops.length - 1
              return (
                <li key={`${stop.stationIndex}-${stop.minutes}-${i}`} className={`relative ${highlighted ? 'bg-red-50 dark:bg-red-950' : ''}`}>
                  <div className="flex min-h-[52px] items-start gap-3 px-3 py-2">
                    <span className={`w-12 shrink-0 pt-0.5 text-right font-mono font-semibold ${major ? 'text-green-600 dark:text-green-400' : ''}`}>
                      {stop.time}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                        highlighted ? 'border-[#c8102e] bg-[#c8102e]' : 'border-zinc-400 bg-white dark:border-zinc-500 dark:bg-zinc-950'
                      }`}
                    />
                    <span className="flex-1">
                      <Link
                        to={`/s/${encodeURIComponent(stop.station)}`}
                        className={`font-medium tracking-wide uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e] ${major ? 'text-green-600 dark:text-green-400' : ''}`}
                        aria-current={highlighted ? 'true' : undefined}
                      >
                        {titleCase(stop.station)}
                      </Link>
                      <span className="block text-xs text-zinc-500">
                        {stop.platform && <>{platformLabel(stop.platform)}{stop.side ? ` ${sideLabel(stop.side)}` : ''}</>}
                        {isFirst && ' · Starts here'}
                        {isLast && ' · Ends here'}
                        {highlighted && ' · Your station'}
                      </span>
                      <Link to={`/s/${encodeURIComponent(stop.station)}`} className="text-xs text-[#c8102e] underline dark:text-red-400">
                        Trains from this station
                      </Link>
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </main>
  )
}
