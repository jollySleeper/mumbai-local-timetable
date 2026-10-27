import { ChevronRight, Clock3, House, Info, Map as MapIcon, Rows3, Search, Star, TrainFront, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import skylineDark from '../assets/night-flare-skyline-dark.jpg'
import skylineLight from '../assets/night-flare-skyline-light.jpg'
import { useJson } from '../hooks/useJson'
import { getStations, getTrainIndex } from '../lib/data'
import { loadFavourites } from '../lib/favourites'
import { titleCase } from '../lib/format'
import { badgeFor, mergeStations, type UnifiedStation } from '../lib/stations'
import type { TrainIndexEntry } from '../lib/types'

const RAILWAY = new Set(['W', 'C', 'H', 'T', 'U', 'DPR', 'DVP', 'NM', 'P'])

// Friendly tab labels — raw dataset codes (DPR, MMAD…) mean nothing to riders.
const TAB_LABELS: Record<string, string> = {
  W: 'Western',
  C: 'Central',
  H: 'Harbour',
  T: 'Trans-Harbour',
  MM1: 'Metro 1',
  MM3: 'Metro 3',
  MONO: 'Monorail',
  DPR: 'Diva–Roha',
  DVP: 'Diva–Dahanu',
  NM: 'Neral–Matheran',
  P: 'Pune–Lonavla',
  U: 'Uran',
  MMAD: 'Metro · Andheri West',
  MMAD2: 'Metro · Andheri West 2',
  MMAD3: 'Metro · Andheri West 3',
  NMM1: 'Navi Mumbai Metro',
  NMM1_2: 'Navi Mumbai Metro 2',
}

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
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode')
  const stationsQ = useJson(getStations)
  const indexQ = useJson(getTrainIndex)
  const [tab, setTab] = useState<'station' | 'train'>(mode === 'train' ? 'train' : 'station')
  const [query, setQuery] = useState('')
  // Browse tab: 'ALL' or a display badge/family (W, C, H, T, MM1, MM3, MONO…)
  const [browseTab, setBrowseTab] = useState<string>('ALL')
  const [trainQuery, setTrainQuery] = useState('')
  const [trainResults, setTrainResults] = useState<TrainIndexEntry[] | null>(null)
  const favs = useMemo(loadFavourites, [mode])
  const lastName = useMemo(readLastName, [])
  const showSaved = mode === 'saved'

  const lines = stationsQ.data?.lines ?? []
  const unified = useMemo(() => mergeStations(lines), [lines])

  // Browse tabs: All + each distinct display badge, railway first.
  const browseTabs = useMemo(() => {
    const badges = [...new Set(unified.flatMap((s) => s.badges))]
    const preferred = ['W', 'C', 'H', 'T', 'MM1', 'MM3', 'MONO']
    const head = preferred.filter((b) => badges.includes(b))
    const rest = badges.filter((b) => !head.includes(b)).sort()
    return ['ALL', ...head, ...rest]
  }, [unified])

  const lineNameFor = (badge: string): string => {
    const line = lines.find((l) => badgeFor(l.code) === badge)
    return line ? line.name : badge
  }

  const display: UnifiedStation[] = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (q) return unified.filter((s) => s.name.includes(q))
    if (browseTab !== 'ALL') {
      const inTab = unified.filter((s) => s.badges.includes(browseTab))
      // Line order when a single raw line represents this tab (e.g. W).
      const rawLine = lines.find((l) => l.code === browseTab)
      if (!rawLine) return inTab
      const byName = new Map(unified.map((s) => [s.name, s]))
      const ordered = rawLine.stations.map((st) => byName.get(st.name)).filter((s): s is UnifiedStation => !!s)
      return ordered.length ? ordered : inTab
    }
    if (lastName && unified.some((s) => s.name === lastName)) {
      return [unified.find((s) => s.name === lastName)!, ...unified.filter((s) => s.name !== lastName)]
    }
    return unified
  }, [unified, lines, browseTab, query, lastName])

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

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 lg:max-w-none lg:px-0">
      {/* Desktop sidebar (finalized Night Flare home) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-zinc-900/8 bg-[#f7f4ee]/90 px-4 py-5 backdrop-blur-xl lg:flex dark:border-white/10 dark:bg-[#0a0a10]/92" aria-label="Home sidebar">
        <Link to="/" className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]">
          <span className="nf-glow-accent flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d93a3e] text-white">
            <TrainFront aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-wide uppercase">Mumbai Local</span>
            <span className="block text-sm font-bold tracking-wide uppercase">Timetable</span>
          </span>
        </Link>
        <nav className="mt-8 space-y-1 text-[15px]" aria-label="Primary">
          <a href="#top" className="flex min-h-[44px] items-center gap-3 rounded-xl bg-[#d93a3e]/10 px-3 font-semibold text-[#d93a3e] dark:bg-white/8 dark:text-zinc-50">
            <House aria-hidden="true" className="h-5 w-5" /> Home
          </a>
          <a href="#browse-stations" className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-zinc-600 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/8">
            <Rows3 aria-hidden="true" className="h-5 w-5" /> Stations
          </a>
          <a href="#browse-stations" className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-zinc-600 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/8">
            <MapIcon aria-hidden="true" className="h-5 w-5" /> Lines
          </a>
          <Link to="/?mode=saved" className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-zinc-600 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/8">
            <Star aria-hidden="true" className="h-5 w-5" /> Saved
          </Link>
          <Link to="/?mode=train" className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-zinc-600 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/8">
            <TrainFront aria-hidden="true" className="h-5 w-5" /> Train No.
          </Link>
        </nav>
        <div className="mt-auto flex gap-2.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="block font-semibold text-zinc-700 dark:text-zinc-200">Timetables you can trust</span>
            Scheduled times · 24-hour IST. Always check the station board before you travel.
          </p>
        </div>
      </aside>

      {/* Mobile top bar (home has its own; the app header is hidden here) */}
      <div className="sticky top-0 z-30 -mx-4 flex items-center gap-2.5 border-b border-zinc-900/8 bg-[#f7f4ee]/85 px-4 py-3 backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-[#0a0a10]/85">
        <span className="nf-glow-accent flex h-9 w-9 items-center justify-center rounded-xl bg-[#d93a3e] text-white">
          <TrainFront aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="flex-1 leading-tight">
          <span className="block text-sm font-bold tracking-wide uppercase">Mumbai Local Timetable</span>
        </span>
        <Link to="/?mode=saved" className="flex min-h-[44px] items-center gap-1.5 rounded-full px-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]">
          <Star aria-hidden="true" className="h-4 w-4 text-[#f5a524]" /> Saved
        </Link>
      </div>

      <div className="lg:pl-[248px]">
      {/* Hero — Night Flare skyline banner, as finalized. */}
      <section id="top" className="relative -mx-4 overflow-hidden px-4 pt-10 pb-8 sm:pt-14 lg:mx-0 lg:rounded-b-[2rem] lg:px-8">
        <img src={skylineLight} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover dark:hidden" />
        <img src={skylineDark} alt="" aria-hidden="true" className="absolute inset-0 hidden h-full w-full object-cover dark:block" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#f7f4ee]/55 via-[#f7f4ee]/25 to-[#f7f4ee] dark:from-[#0a0a10]/45 dark:via-[#0a0a10]/25 dark:to-[#0a0a10]" />
        <div className="relative mx-auto max-w-2xl text-center">
        <p className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.18em] text-zinc-600 uppercase dark:text-zinc-300">
          <Clock3 aria-hidden="true" className="h-4 w-4 text-[#d93a3e] dark:text-[#f5a524]" />
          Scheduled · 24-hour IST
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Find your station</h1>
        <p className="mx-auto mt-2 max-w-xl text-zinc-700 dark:text-zinc-300">
          Mumbai local train timetables — search, pick a saved route, or scroll down to browse stations by line.
        </p>

        <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Search mode">
          {(
            [
              ['station', 'Station'],
              ['train', 'Train No.'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`min-h-[44px] rounded-full px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] ${
                tab === value ? 'nf-glow-accent bg-[#d93a3e] text-white' : 'nf-panel'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'train' ? (
          <form onSubmit={searchTrain} className="nf-panel mt-4 rounded-3xl p-4">
            <label htmlFor="train-search" className="mb-1 block font-semibold">Train number</label>
            <div className="flex gap-2">
              <input
                id="train-search"
                inputMode="numeric"
                type="search"
                value={trainQuery}
                onChange={(e) => { setTrainQuery(e.target.value); setTrainResults(null) }}
                placeholder="e.g. 90171"
                className="min-h-[48px] w-full rounded-2xl border border-zinc-900/10 bg-white/80 px-3 dark:border-white/10 dark:bg-zinc-900/80"
              />
              <button type="submit" className="min-h-[48px] shrink-0 rounded-2xl bg-[#d93a3e] px-5 font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]">
                Search
              </button>
            </div>
            {trainResults && trainResults.length === 0 && <p className="mt-2 text-sm">No train found with that number.</p>}
            {trainResults && trainResults.length > 1 && (
              <ul className="mt-3 divide-y divide-zinc-900/8 dark:divide-white/10">
                {trainResults.map((t) => {
                  const [l, seq] = t.trainId.split(':')
                  return (
                    <li key={t.trainId}>
                      <Link to={`/train/${l}/${seq}`} className="block min-h-[44px] py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]">
                        {t.no} — {titleCase(t.origin)} → {titleCase(t.destination)} ({t.firstTime}, {t.line})
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </form>
        ) : (
          <div className="nf-panel mt-4 flex items-center rounded-full py-1 pr-1 pl-4">
            <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-zinc-400" />
            <label className="sr-only" htmlFor="station-search">Search stations</label>
            <input
              id="station-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stations — try Andheri"
              className="min-h-[48px] w-full bg-transparent px-2 text-base outline-none placeholder:text-zinc-400"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="min-h-[44px] shrink-0 px-3">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Saved routes */}
        <section aria-label="Saved routes" className={`mt-6 ${showSaved ? 'nf-panel rounded-3xl p-4' : ''}`}>
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-300">
            <Star aria-hidden="true" className="h-4 w-4 text-[#f5a524]" fill="currentColor" />
            Saved routes
          </h2>
          {favs.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No saved routes yet — open a departure board and tap the star to save a station + direction here.
            </p>
          ) : (
            <ul className="flex flex-wrap justify-center gap-2">
              {favs.map((f) => (
                <li key={`${f.stationName}:${f.slug}`}>
                  <Link
                    to={`/board/${encodeURIComponent(f.stationName)}/${f.slug}`}
                    className="nf-panel flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]"
                  >
                    <Star aria-hidden="true" className="h-4 w-4 text-[#f5a524]" fill="currentColor" />
                    {titleCase(f.stationName)} → {f.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {lastName && (
            <p className="mt-3 text-sm">
              <Link to={`/s/${encodeURIComponent(lastName)}`} className="inline-flex min-h-[44px] items-center gap-1 font-medium text-[#d93a3e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] dark:text-[#f26d6d]">
                <TrainFront aria-hidden="true" className="h-4 w-4" />
                Continue at {titleCase(lastName)}
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </p>
          )}
        </section>
        </div>
      </section>

      {/* Browse stations by line — the scroll-down explorer. */}
      {tab === 'station' && (
        <section id="browse-stations" aria-label="Browse stations by line" className="nf-panel relative z-10 mx-0 mb-10 rounded-3xl p-4 sm:p-5 lg:mx-8">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold tracking-tight">Browse stations by line</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {query ? `${display.length} matching` : browseTab === 'ALL' ? `${unified.length} stations` : lineNameFor(browseTab)}
            </p>
          </div>

          {!query && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Line filter">
              {browseTabs.map((badge) => (
                <button
                  key={badge}
                  role="tab"
                  aria-selected={browseTab === badge}
                  onClick={() => setBrowseTab(badge)}
                  className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-semibold whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] ${
                    browseTab === badge
                      ? 'nf-glow-accent bg-[#d93a3e] text-white'
                      : 'border border-zinc-900/10 bg-white/60 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                  }`}
                >
                  {badge === 'ALL' ? 'All' : (TAB_LABELS[badge] ?? badge)}
                </button>
              ))}
            </div>
          )}

          {stationsQ.loading && <p className="py-4" aria-live="polite">Loading stations…</p>}
          {stationsQ.error && (
            <div role="alert" className="rounded-2xl border border-red-300 p-3 dark:border-red-800">
              <p>Couldn&apos;t load timetable — check connection.</p>
              <button type="button" onClick={stationsQ.reload} className="mt-2 min-h-[44px] rounded-full bg-[#d93a3e] px-4 font-semibold text-white">Retry</button>
            </div>
          )}

          <ul className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
            {display.map((st) => {
              const sub = subtitle(st)
              const isLast = lastName === st.name && browseTab === 'ALL' && !query
              return (
                <li key={st.name} className="border-b border-zinc-900/6 dark:border-white/8">
                  <Link
                    to={`/s/${encodeURIComponent(st.name)}`}
                    className="flex min-h-[52px] items-center gap-2 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]"
                    aria-label={`${titleCase(st.name)}${isLast ? ', last station' : ''}`}
                  >
                    <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${isLast ? 'bg-[#d93a3e] shadow-[0_0_10px_rgba(217,58,62,0.8)]' : 'bg-zinc-400 dark:bg-zinc-500'}`} />
                    <span className="flex-1">
                      <span className="block text-[17px] font-medium">{titleCase(st.name)}</span>
                      {sub && <span className="block text-xs text-zinc-500 dark:text-zinc-400">{sub}</span>}
                    </span>
                    {/* Badges only where they add information: All/search views.
                        Inside one line tab the badge would just repeat the tab. */}
                    {(browseTab === 'ALL' || query) && (
                      <span className="flex shrink-0 gap-1">
                        {st.badges.map((b) => (
                          <span key={b} className="rounded-full border border-zinc-900/12 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-white/15 dark:text-zinc-300">
                            {b}
                          </span>
                        ))}
                      </span>
                    )}
                    <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-400" />
                  </Link>
                </li>
              )
            })}
          </ul>
          {stationsQ.data && display.length === 0 && <p className="py-4 text-sm text-zinc-500">No matching station found</p>}
        </section>
      )}
      </div>
    </main>
  )
}
