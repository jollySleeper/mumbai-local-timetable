export default function App() {
  return (
    <div className="min-h-dvh bg-white font-sans text-base text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-red-700 text-white dark:border-zinc-800">
        <div className="mx-auto w-full max-w-[640px] px-4 py-4">
          <h1 className="text-xl font-bold">Mumbai Local Timetable</h1>
          <p className="text-sm text-red-100">Local, metro &amp; monorail schedules</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[640px] px-4 py-6 pb-[env(safe-area-inset-bottom)]">
        <p className="text-zinc-600 dark:text-zinc-400">
          Pick a line and station to see departures. Timetable data loads here once the pipeline is wired up.
        </p>
      </main>
    </div>
  )
}
