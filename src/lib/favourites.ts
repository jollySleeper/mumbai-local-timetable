// Favourite routes (redesign v2): a starred station -> direction-cluster
// route, e.g. Virar -> Churchgate/Csmt (SOUTH). Stored in localStorage only.
// Note: train_seq is only stable within one timetable version (BUILD_SPEC
// §5.2), so favourites store station + direction, never train ids.

export interface FavRoute {
  stationName: string
  cluster: string
  slug: string
  label: string
}

const KEY = 'tt-fav-routes'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): StorageLike | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

export function loadFavourites(storage: StorageLike | null = defaultStorage()): FavRoute[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as FavRoute[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function isFavourite(
  favs: FavRoute[],
  stationName: string,
  slug: string,
): boolean {
  return favs.some((f) => f.stationName === stationName && f.slug === slug)
}

export function toggleFavourite(
  route: FavRoute,
  storage: StorageLike | null = defaultStorage(),
): FavRoute[] {
  const current = loadFavourites(storage)
  const next = isFavourite(current, route.stationName, route.slug)
    ? current.filter((f) => !(f.stationName === route.stationName && f.slug === route.slug))
    : [...current, route]
  try {
    storage?.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable */
  }
  return next
}
