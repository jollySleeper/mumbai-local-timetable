import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null
  return (
    <div role="alert" className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[640px] p-3 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
        <p className="flex-1 text-sm">New timetable/app version available</p>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="min-h-[44px] rounded bg-red-700 px-3 text-white"
        >
          Reload
        </button>
        <button type="button" onClick={() => setNeedRefresh(false)} className="min-h-[44px] px-2">
          Later
        </button>
      </div>
    </div>
  )
}
