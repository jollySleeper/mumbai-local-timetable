import { describe, expect, it } from 'vitest'
import { ensureCacheVersion, isVersionChanged } from './cacheVersion'

describe('isVersionChanged', () => {
  it('is false on first run and when unchanged, true on bump', () => {
    expect(isVersionChanged(null, '20260417')).toBe(false)
    expect(isVersionChanged('20260417', '20260417')).toBe(false)
    expect(isVersionChanged('20260417', '20260501')).toBe(true)
  })
})

describe('ensureCacheVersion', () => {
  it('purges data caches and stores the new version on bump', async () => {
    const store = new Map<string, string>([['tt-version', '20260417']])
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    }
    const deleted: string[] = []
    const cachesApi = {
      delete: async (name: string) => {
        deleted.push(name)
        return true
      },
    } as unknown as CacheStorage
    await expect(ensureCacheVersion('20260501', storage, cachesApi)).resolves.toBe(true)
    expect(deleted).toEqual(expect.arrayContaining(['timetable-data', 'timetable-index']))
    expect(store.get('tt-version')).toBe('20260501')
  })
})
