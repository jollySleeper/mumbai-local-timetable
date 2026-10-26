import { describe, expect, it } from 'vitest'
import { isFavourite, loadFavourites, toggleFavourite } from './favourites'

function memStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('favourites', () => {
  it('toggles a route on and off and persists it', () => {
    const storage = memStorage()
    const route = { stationName: 'VIRAR', cluster: 'SOUTH', slug: 'south', label: 'Churchgate' }
    const after = toggleFavourite(route, storage)
    expect(isFavourite(after, 'VIRAR', 'south')).toBe(true)
    expect(loadFavourites(storage)).toHaveLength(1)
    const off = toggleFavourite(route, storage)
    expect(off).toHaveLength(0)
  })
})
