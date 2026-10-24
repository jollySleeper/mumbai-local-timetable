import { BrowserRouter, Link } from 'react-router-dom'
import AppRoutes from './routes'

export default function App() {
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
      </div>
    </BrowserRouter>
  )
}
