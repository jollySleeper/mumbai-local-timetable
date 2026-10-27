import { Star, TrainFront } from 'lucide-react'
import { useEffect } from 'react'
import { BrowserRouter, Link, useLocation } from 'react-router-dom'
import UpdatePrompt from './components/UpdatePrompt'
import { ensureCacheVersion } from './lib/cacheVersion'
import { getMeta } from './lib/data'
import AppRoutes from './routes'

export default function App() {
  useEffect(() => {
    getMeta()
      .then((meta) => ensureCacheVersion(meta.version))
      .catch(() => {
        /* offline / no data yet: keep serving cached timetable */
      })
  }, [])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Shell />
    </BrowserRouter>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  return (
      <div className="min-h-dvh bg-[#f7f4ee] font-sans text-base text-zinc-900 antialiased dark:bg-[#0a0a10] dark:text-zinc-50">
        <div aria-hidden="true" className="nf-glow" />
        {!isHome && (
        <header className="sticky top-0 z-30 border-b border-zinc-900/8 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/70">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
            <Link
              to="/"
              className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]"
              aria-label="Mumbai Local Timetable — home"
            >
              <span className="nf-glow-accent flex h-9 w-9 items-center justify-center rounded-xl bg-[#d93a3e] text-white">
                <TrainFront aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="leading-tight">
                <span className="block font-bold tracking-tight">Mumbai Local Timetable</span>
                <span className="block text-[11px] tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Scheduled timetable</span>
              </span>
            </Link>
            <nav aria-label="Primary" className="ml-auto flex items-center gap-1 text-sm">
              <Link
                to="/"
                className="hidden min-h-[44px] items-center rounded-full px-3 py-2 hover:bg-zinc-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] sm:flex dark:hover:bg-white/10"
              >
                Stations
              </Link>
              <Link
                to="/?mode=train"
                className="hidden min-h-[44px] items-center rounded-full px-3 py-2 hover:bg-zinc-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] sm:flex dark:hover:bg-white/10"
              >
                Train No.
              </Link>
              <Link
                to="/?mode=saved"
                className="flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2 hover:bg-zinc-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e] dark:hover:bg-white/10"
              >
                <Star aria-hidden="true" className="h-4 w-4 text-[#f5a524]" />
                <span className="hidden sm:inline">Saved routes</span>
                <span className="sm:hidden">Saved</span>
              </Link>
            </nav>
          </div>
        </header>
        )}
        <AppRoutes />
        <footer className={`mx-auto w-full max-w-6xl px-4 py-8 text-xs text-zinc-500 dark:text-zinc-400 ${isHome ? 'lg:mr-0 lg:ml-[248px] lg:w-[calc(100%-248px)]' : ''}`}>
          Unofficial timetable — not affiliated with any railway operator. Times are scheduled data in 24-hour IST; trains may run late, so check station boards before travelling. Live status will appear here when live data is connected.
        </footer>
        <UpdatePrompt />
      </div>
  )
}
