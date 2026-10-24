import { Link, useParams, useSearchParams } from 'react-router-dom'
import NoteChips from '../components/NoteChips'
import { useJson } from '../hooks/useJson'
import { getTrainByParts } from '../lib/data'
import { patternLabel, platformLabel, titleCase } from '../lib/format'

export default function TrainDetail() {
  const { line = '', seq = '' } = useParams()
  const [search] = useSearchParams()
  const from = search.get('from')
  const fromIndex = from !== null && from !== '' ? Number(from) : null

  const trainQ = useJson(() => getTrainByParts(line, seq), [line, seq])
  const train = trainQ.data

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-4 pb-[env(safe-area-inset-bottom)]">
      {trainQ.loading && (
        <div aria-live="polite" className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ))}
          <p className="sr-only">Loading train…</p>
        </div>
      )}
      {trainQ.error && (
        <div role="alert" className="rounded-lg border border-red-300 p-3 dark:border-red-800">
          <p>Couldn&apos;t load timetable — check connection.</p>
          <button type="button" onClick={trainQ.reload} className="mt-2 min-h-[44px] rounded bg-red-700 px-3 text-white">
            Retry
          </button>
        </div>
      )}
      {train && (
        <>
          <header className="mb-4">
            {train.trainNumber ? (
              <h2 className="text-2xl font-bold">Train {train.trainNumber}</h2>
            ) : (
              <h2 className="text-2xl font-bold">
                {train.stops[0]?.time ?? ''} {titleCase(train.origin)} — Metro service
              </h2>
            )}
            <p className="mt-1 font-medium">
              {titleCase(train.origin)} → {titleCase(train.destination)}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {patternLabel(train.pattern) && <span>{patternLabel(train.pattern)} </span>}
              <span>Pattern: {train.pattern || '—'}</span>
              {train.line && <span> · Line {train.line}</span>}
            </p>
            {train.note && (
              <p className="mt-1 flex items-center gap-2 text-sm">
                <span>{train.note}</span>
                <NoteChips note={train.note} />
              </p>
            )}
          </header>

          <ol className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {train.stops.map((stop, i) => {
              const highlighted = fromIndex !== null && stop.stationIndex === fromIndex
              const isFirst = i === 0
              const isLast = i === train.stops.length - 1
              return (
                <li
                  key={`${stop.stationIndex}-${stop.minutes}-${i}`}
                  className={highlighted ? 'bg-red-50 dark:bg-red-950' : ''}
                  aria-current={highlighted ? 'true' : undefined}
                >
                  <div className="flex min-h-[44px] items-center gap-3 px-3 py-2">
                    <span className="w-14 shrink-0 font-mono font-semibold">{stop.time}</span>
                    <span className="flex-1">
                      <Link
                        to={`/station/${train.line}/${stop.stationIndex}`}
                        className="font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                      >
                        {titleCase(stop.station)}
                      </Link>
                      {isFirst && <span className="ml-2 text-xs text-zinc-500">Starts here</span>}
                      {isLast && <span className="ml-2 text-xs text-zinc-500">Ends here</span>}
                      {highlighted && <span className="ml-2 text-xs font-medium text-red-700 dark:text-red-400">Your station</span>}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {stop.platform && <span>{platformLabel(stop.platform)}</span>}
                      {stop.side && <span> · {stop.side}</span>}
                    </span>
                  </div>
                  <Link
                    to={`/station/${train.line}/${stop.stationIndex}`}
                    className="block px-3 pb-2 pl-[4.25rem] text-xs text-red-700 underline dark:text-red-400"
                  >
                    View departures from this station
                  </Link>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </main>
  )
}
