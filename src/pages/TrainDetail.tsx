import { ArrowLeft, Share2 } from 'lucide-react'
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

  const stops = train?.stops ?? []
  const boardingIndex = train
    ? stops.findIndex((s) => s.stationIndex === fromIndex && (fromLine === null || fromLine === train.line))
    : -1
  const durationMin = stops.length > 1 ? stops[stops.length - 1].minutes - stops[0].minutes : 0
  // Desktop route strip: origin, boarding, major stations, destination.
  const stripStops = train
    ? stops.filter(
        (s, i) =>
          i === 0 ||
          i === stops.length - 1 ||
          i === boardingIndex ||
          MAJOR_STATIONS.has(s.station),
      )
    : []

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10">
      <Link
        to="/"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] dark:text-zinc-300"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Stations
      </Link>

      {trainQ.loading && (
        <div aria-live="polite" className="mt-4 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-zinc-900/8 dark:bg-white/8" />
          ))}
          <p className="sr-only">Loading train…</p>
        </div>
      )}
      {trainQ.error && (
        <div role="alert" className="nf-panel mt-4 rounded-3xl p-4">
          <p>Couldn&apos;t load timetable — check connection.</p>
          <button type="button" onClick={trainQ.reload} className="mt-2 min-h-[44px] rounded-full bg-[#d93a3e] px-4 font-semibold text-white">Retry</button>
        </div>
      )}

      {train && (
        <>
          {/* Headline + desktop route strip */}
          <section className="nf-panel mt-2 rounded-3xl p-4 sm:p-5">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {train.trainNumber ? `${train.trainNumber} ` : ''}
                  {titleCase(train.origin)} to {titleCase(train.destination)}
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {patternLabel(train.pattern) || 'Service'} · Scheduled · Line {train.line}
                  {shared && <span className="ml-2 font-medium text-emerald-700 dark:text-emerald-400">Link copied</span>}
                </p>
                {train.note && (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span>{train.note}</span>
                    <NoteChips note={train.note} />
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={share}
                aria-label="Share this train"
                className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-[#d93a3e] px-4 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]"
              >
                <Share2 aria-hidden="true" className="h-4 w-4" />
                Share
              </button>
            </div>

            {stripStops.length > 1 && (
              <div className="mt-5 hidden md:block" aria-hidden="true">
                <div className="flex items-start">
                  {stripStops.map((s, i) => {
                    const isBoarding = stops.indexOf(s) === boardingIndex
                    return (
                      <div key={`${s.stationIndex}-${i}`} className="relative min-w-0 flex-1 text-center">
                        {i > 0 && <span className="absolute top-[5px] right-1/2 left-[-50%] h-0.5 bg-zinc-900/15 dark:bg-white/15" />}
                        <span
                          className={`relative z-10 mx-auto block h-3 w-3 rounded-full ${
                            isBoarding ? 'bg-[#d93a3e] shadow-[0_0_12px_rgba(217,58,62,0.9)]' : 'border-2 border-zinc-400 bg-white dark:border-zinc-500 dark:bg-zinc-900'
                          }`}
                        />
                        <span className={`mt-1.5 block truncate px-1 text-xs ${isBoarding ? 'font-bold text-[#d93a3e] dark:text-[#f26d6d]' : 'text-zinc-500 dark:text-zinc-400'}`}>
                          {titleCase(s.station)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
            {/* Summary */}
            <aside className="nf-panel order-2 rounded-3xl p-4 lg:order-1" aria-label="Train summary">
              <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Train summary</h2>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-zinc-500 dark:text-zinc-400">Train</dt><dd className="font-semibold">{train.trainNumber ?? '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500 dark:text-zinc-400">From</dt><dd className="font-semibold">{titleCase(train.origin)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500 dark:text-zinc-400">To</dt><dd className="font-semibold">{titleCase(train.destination)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500 dark:text-zinc-400">Stops</dt><dd className="font-semibold">{stops.length}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500 dark:text-zinc-400">Scheduled duration</dt><dd className="font-semibold">{durationMin > 0 ? `${Math.floor(durationMin / 60)}h ${String(durationMin % 60).padStart(2, '0')}m` : '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-zinc-500 dark:text-zinc-400">Pattern</dt><dd className="font-semibold">{train.pattern || '—'}</dd></div>
              </dl>
              {boardingIndex >= 0 && (
                <div className="mt-4 rounded-2xl bg-[#d93a3e]/8 p-3 dark:bg-[#d93a3e]/15">
                  <h3 className="text-sm font-bold">Your journey</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    Boarding at {titleCase(stops[boardingIndex].station)}
                    {stops[boardingIndex].platform ? ` · ${platformLabel(stops[boardingIndex].platform)}` : ''}
                    {' · '}
                    {stops.length - 1 - boardingIndex} stops to {titleCase(train.destination)}
                  </p>
                </div>
              )}
            </aside>

            {/* Timeline */}
            <section className="nf-panel order-1 overflow-hidden rounded-3xl lg:order-2" aria-label="Stop timetable">
              <ol className="relative">
                <span aria-hidden="true" className="absolute top-0 bottom-0 left-[86px] w-px bg-zinc-900/12 dark:bg-white/12" />
                {stops.map((stop, i) => {
                  const highlighted = i === boardingIndex
                  const major = MAJOR_STATIONS.has(stop.station)
                  const isFirst = i === 0
                  const isLast = i === stops.length - 1
                  return (
                    <li key={`${stop.stationIndex}-${stop.minutes}-${i}`} className={`relative ${highlighted ? 'bg-[#d93a3e]/6 dark:bg-[#d93a3e]/12' : ''}`}>
                      <div className="flex min-h-[52px] items-start gap-3 px-3 py-2">
                        <span className={`w-12 shrink-0 pt-0.5 text-right font-mono font-semibold ${major ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                          {stop.time}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                            highlighted ? 'border-[#d93a3e] bg-[#d93a3e] shadow-[0_0_10px_rgba(217,58,62,0.8)]' : 'border-zinc-400 bg-white dark:border-zinc-500 dark:bg-zinc-950'
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <Link
                            to={`/s/${encodeURIComponent(stop.station)}`}
                            className={`font-medium tracking-wide uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] ${major ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                            aria-current={highlighted ? 'true' : undefined}
                          >
                            {titleCase(stop.station)}
                          </Link>
                          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                            {stop.platform && <>{platformLabel(stop.platform)}{stop.side ? ` ${sideLabel(stop.side)}` : ''}</>}
                            {isFirst && ' · Starts here'}
                            {isLast && ' · Ends here'}
                            {highlighted && ' · Your station'}
                          </span>
                          <Link to={`/s/${encodeURIComponent(stop.station)}`} className="text-xs font-medium text-[#d93a3e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] dark:text-[#f26d6d]">
                            Trains from this station
                          </Link>
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>

            {/* Live-ready panel — deliberately small today; live columns/status
                appear here when a live proxy is connected, without redesign. */}
            <aside className="nf-panel order-3 rounded-3xl p-4" aria-label="Live status">
              <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Live status</h2>
              <p className="mt-2 flex items-center gap-2 text-sm">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-zinc-400" />
                Scheduled only
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Expected times and delay status will appear here when live data is connected. Until then, every time on this page is the published schedule.
              </p>
            </aside>
          </div>
        </>
      )}
    </main>
  )
}
