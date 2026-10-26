import { ChevronRight, Search, Star, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DestinationGroups from '../components/DestinationGroups'
import { useJson } from '../hooks/useJson'
import { getStations, getTrainIndex } from '../lib/data'
import { loadFavourites } from '../lib/favourites'
import { titleCase } from '../lib/format'
import { mergeStations, type UnifiedStation } from '../lib/stations'
import type { TrainIndexEntry } from '../lib/types'

const RAILWAY = new Set(['W', 'C', 'H', 'T', 'U', 'DPR', 'DVP', 'NM', 'P'])

function subtitle(st: UnifiedStation): string {
  const codes = st.instances.map((i) => i.lineCode)
  const hasRail = codes.some((c) => RAILWAY.has(c))
  const hasMetro = codes.some((c) => !RAILWAY.has(c))
  if (hasRail && hasMetro) return 'Railway & Metro Station'
  if (st.instances.length > 1) return 'Interchange Station'
  return ''
}

function readLastName(): string | null {
  try {
    const raw = localStorage.getItem('tt-last-station')
    if (!raw) return null
    const v = JSON.parse(raw) as { stationName?: string }
    return v.stationName ?? null
  } catch {
    return null
  }
}

export default function Home() {
  const navigate = useNavigate()
  const stationsQ = useJson(getStations)
  const indexQ = useJson(getTrainIndex)
  const [tab, setTab] = useState<'station' | 'train'>('station')
  const [query, setQuery] = useState('')
  const [lineFilter, setLineFilter] = useState<string>('ALL')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showFavs, setShowFavs] = useState(false)
  const [trainQuery, setTrainQuery] = useState('')
  const [trainResults, setTrainResults] = useState<TrainIndexEntry[] | null>(null)
  const favs = useMemo(loadFavourites, [showFavs])
  const lastName = useMemo(readLastName, [])

  const lines = stationsQ.data?.lines ?? []
  const unified = useMemo(() => mergeStations(lines), [lines])

  const display: UnifiedStation[] = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (q) return unified.filter((s) => s.name.includes(q))
    if (lineFilter !== 'ALL') {
      const line = lines.find((l) => l.code === lineFilter)
      if (!line) return unified
      const byName = new Map(unified.map((s) => [s.name, s]))
      return line.stations.map((st) => byName.get(st.name)).filter((s): s is UnifiedStation => !!s)
    }
    // ALL: last station pinned on top, then A-Z (m-Indicator pins recents too)
    const rest = unified
    if (lastName && rest.some((s) => s.name === lastName)) {
      return [rest.find((s) => s.name === lastName)!, ...rest.filter((s) => s.name !== lastName)]
    }
    return rest
  }, [unified, lines, lineFilter, query, lastName])

  const searchTrain = (e: React.FormEvent) => {
    e.preventDefault()
    const q = trainQuery.trim()
    if (!q || !indexQ.data) return
    const matches = indexQ.data.filter((t) => t.no === q)
    setTrainResults(matches)
    if (matches.length === 1) {
      const [l, seq] = matches[0].trainId.split(':')
      navigate(`/train/${l}/${seq}`)
    }
  }

  const quickLines = ['W', 'C', 'H', 'T']

  return (
    <main className="mx-auto w-full max-w-[640px]">
      {/* Red tabs, familiar layout */}
      <div className="flex bg-[#c8102e] text-white" role="tablist" aria-label="Search mode">
        {(
          [
            ['station', 'STATION'],
            ['train', 'TRAIN NO.'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`min-h-[44px] flex-1 text-sm font-semibold tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              tab === value ? 'border-b-4 border-white' : 'opacity-80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'train' ? (
        <form onSubmit={searchTrain} className="px-4 py-4">
          <label htmlFor="train-search" className="mb-1 block font-semibold">Train number</label>
          <div className="flex gap-2">
            <input
              id="train-search"
              inputMode="numeric"
              type="search"
              value={trainQuery}
              onChange={(e) => { setTrainQuery(e.target.value); setTrainResults(null) }}
              placeholder="e.g. 90171"
              className="min-h-[44px] w-full rounded border border-zinc-300 px-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button type="submit" className="min-h-[44px] shrink-0 rounded bg-[#c8102e] px-4 font-semibold text-white">Search</button>
          </div>
          {trainResults && trainResults.length === 0 && <p className="mt-2 text-sm">No train found with that number.</p>}
          {trainResults && trainResults.length > 1 && (
            <ul className="mt-2 divide-y divide-zinc-200 border border-zinc-300 dark:divide-zinc-800 dark:border-zinc-700">
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
      ) : (
        <>
          {/* You are at? + favourites star */}
          <div className="flex items-center border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <Search aria-hidden="true" className="ml-3 h-5 w-5 shrink-0 text-zinc-400" />
            <label className="sr-only" htmlFor="station-search">You are at?</label>
            <input
              id="station-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="You are at?"
              className="min-h-[48px] w-full bg-transparent px-2 text-base outline-none placeholder:text-zinc-400"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="min-h-[44px] px-2">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Favourite routes"
              aria-pressed={showFavs}
              onClick={() => setShowFavs((v) => !v)}
              className="min-h-[48px] px-3 text-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]"
            >
              <Star aria-hidden="true" className="h-6 w-6" fill={showFavs ? 'currentColor' : 'none'} />
            </button>
          </div>

          {showFavs && (
            <section aria-label="Favourite routes" className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="mb-2 font-semibold">Favourite routes</h2>
              {favs.length === 0 ? (
                <p className="text-sm text-zinc-500">No Favourite Trains — star a route on a departure board and it will appear here.</p>
              ) : (
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {favs.map((f) => (
                    <li key={`${f.stationName}:${f.slug}`}>
                      <Link to={`/board/${encodeURIComponent(f.stationName)}/${f.slug}`} className="flex min-h-[44px] items-center justify-between py-2">
                        <span>{titleCase(f.stationName)} → {f.label}</span>
                        <ChevronRight aria-hidden="true" className="h-4 w-4 text-zinc-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Navy line filter bar */}
          <div className="flex items-stretch bg-[#23265d] text-white" aria-label="Line filter">
            <button
              type="button"
              aria-pressed={lineFilter === 'ALL'}
              onClick={() => setLineFilter('ALL')}
              className={`min-h-[44px] flex-1 px-1 text-center ${lineFilter === 'ALL' ? 'font-bold' : 'opacity-75'}`}
            >
              <span className="block text-base leading-tight">ALL</span>
              <span className="block text-[10px] tracking-wide">STATIONS</span>
            </button>
            {quickLines.map((code) => {
              const line = lines.find((l) => l.code === code)
              if (!line) return null
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lineFilter === code}
                  onClick={() => setLineFilter(code)}
                  className={`min-h-[44px] flex-1 px-1 text-center ${lineFilter === code ? 'font-bold' : 'opacity-75'}`}
                >
                  <span className="block text-base leading-tight">{code}</span>
                  <span className="block text-[10px] tracking-wide uppercase">{line.name.split(' ')[0]}</span>
                </button>
              )
            })}
            <button type="button" onClick={() => setSheetOpen(true)} className="min-h-[44px] flex-1 px-1 text-center opacity-90">
              <span className="block text-base leading-tight">•••</span>
              <span className="block text-[10px] tracking-wide">LINES</span>
            </button>
          </div>

          {sheetOpen && (
            <div className="fixed inset-0 z-20 bg-black/50" role="dialog" aria-modal="true" aria-label="Select line" onClick={() => setSheetOpen(false)}>
              <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[80dvh] w-full max-w-[640px] overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
                <h2 className="mb-2 text-lg font-bold">Select Line</h2>
                <button type="button" className="block min-h-[44px] w-full py-2 text-left" onClick={() => { setLineFilter('ALL'); setSheetOpen(false) }}>
                  <span className="block font-medium">All Stations</span>
                  <span className="block text-sm text-zinc-500">Show all stations</span>
                </button>
                {lines.map((l) => (
                  <button key={l.code} type="button" className="block min-h-[44px] w-full py-2 text-left" onClick={() => { setLineFilter(l.code); setSheetOpen(false) }}>
                    <span className="block font-medium">{l.name} <span className="text-zinc-500">({l.code})</span></span>
                    <span className="block text-sm text-zinc-500">{titleCase(l.headerA)} — {titleCase(l.headerB)}</span>
                  </button>
                ))}
                <button type="button" className="mt-2 min-h-[44px] w-full rounded bg-zinc-200 py-2 dark:bg-zinc-800" onClick={() => setSheetOpen(false)}>Close</button>
              </div>
            </div>
          )}

          {stationsQ.loading && <p className="px-4 py-4" aria-live="polite">Loading stations…</p>}
          {stationsQ.error && (
            <div role="alert" className="m-4 rounded border border-red-300 p-3">
              <p>Couldn&apos;t load timetable — check connection.</p>
              <button type="button" onClick={stationsQ.reload} className="mt-2 min-h-[44px] rounded bg-[#c8102e] px-3 text-white">Retry</button>
            </div>
          )}

          <ul className="bg-white dark:bg-zinc-950">
            {display.map((st) => {
              const isOpen = expanded === st.name
              const sub = subtitle(st)
              return (
                <li key={st.name} className="border-b border-zinc-100 dark:border-zinc-900">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : st.name)}
                    className="flex min-h-[52px] w-full items-center gap-2 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]"
                  >
                    <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${lastName === st.name ? 'bg-[#c8102e]' : 'bg-zinc-400'}`} />
                    <span className="flex-1">
                      <span className="block text-[17px]">{titleCase(st.name)}</span>
                      {sub && <span className="block text-xs text-zinc-500">{sub}</span>}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      {st.badges.map((b) => (
                        <span key={b} className="rounded bg-[#23265d] px-1.5 py-0.5 text-[11px] font-bold text-white">{b}</span>
                      ))}
                    </span>
                  </button>
                  {isOpen && <DestinationGroups station={st} />}
                </li>
              )
            })}
          </ul>
          {stationsQ.data && display.length === 0 && <p className="px-4 py-4 text-sm text-zinc-500">No matching station found</p>}
        </>
      )}
    </main>
  )
}
