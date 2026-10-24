// Version-aware cache invalidation (§7.1).
export const VERSION_KEY = 'tt-version'
export const DATA_CACHES = ['timetable-data', 'timetable-index']

/** Pure comparison: purge only when a stored version exists and differs. */
export function isVersionChanged(stored: string | null, current: string): boolean {
  return stored !== null && stored !== current
}

export async function ensureCacheVersion(
  currentVersion: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
  cachesApi: CacheStorage | undefined = typeof caches !== 'undefined' ? caches : undefined,
): Promise<boolean> {
  const stored = storage.getItem(VERSION_KEY)
  if (!isVersionChanged(stored, currentVersion)) {
    storage.setItem(VERSION_KEY, currentVersion)
    return false
  }
  if (cachesApi) {
    await Promise.all(DATA_CACHES.map((name) => cachesApi.delete(name)))
  }
  storage.setItem(VERSION_KEY, currentVersion)
  return true
}
