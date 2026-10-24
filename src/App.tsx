import { useEffect } from 'react'
import { BrowserRouter, Link } from 'react-router-dom'
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
      <div className="min-h-dvh bg-white font-sans text-base text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        <header className="border-b border-zinc-200 bg-red-700 text-white dark:border-zinc-800">
          <div className="mx-auto w-full max-w-[640px] px-4 py-4">
            <Link to="/" className="text-xl font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              Mumbai Local Timetable
            </Link>
            <p className="text-sm text-red-100">Local, metro &amp; monorail schedules</p>
          </div>
        </header>
        <AppRoutes />
        <footer className="mx-auto w-full max-w-[640px] px-4 py-6 text-xs text-zinc-500 dark:text-zinc-400">
          Unofficial timetable — not affiliated with any railway operator. Times are schedule data; check station boards for live changes.
        </footer>
        <UpdatePrompt />
      </div>
    </BrowserRouter>
  )
}
