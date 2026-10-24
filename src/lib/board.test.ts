import { describe, expect, it } from 'vitest'
import { filterByDirection, selectNext } from './board'
import type { Departure } from './types'

function dep(minutes: number, destIndex: number, trainId = `W:${minutes}`): Departure {
  return {
    minutes,
    trainId,
    trainNumber: null,
    destination: 'X',
    destinationIndex: destIndex,
    origin: 'Y',
    pattern: 'S',
    note: '',
    platform: '',
    side: '',
  }
}

describe('selectNext', () => {
  const deps = [dep(100, 20), dep(200, 20), dep(300, 0), dep(400, 20)]
  it('returns remaining departures from now-1 in order', () => {
    const got = selectNext(deps, 201, 10)
    expect(got.map((d) => d.minutes)).toEqual([200, 300, 400, 100, 200, 300, 400])
    expect(got.map((d) => d.tomorrow)).toEqual([false, false, false, true, true, true, true])
  })
  it('appends next-day departures when today runs out, never empty', () => {
    const got = selectNext(deps, 1439, 3)
    expect(got).toHaveLength(3)
    expect(got.every((d) => d.tomorrow)).toBe(true)
    expect(got[0].minutes).toBe(100)
  })
  it('respects count', () => {
    expect(selectNext(deps, 0, 2)).toHaveLength(2)
  })
})

describe('filterByDirection', () => {
  const deps = [dep(100, 5), dep(200, 25), dep(300, 15)]
  it('A keeps lower destinations plus terminating', () => {
    expect(filterByDirection(deps, 15, 'A').map((d) => d.minutes)).toEqual([100, 300])
  })
  it('B keeps higher destinations plus terminating', () => {
    expect(filterByDirection(deps, 15, 'B').map((d) => d.minutes)).toEqual([200, 300])
  })
  it('all keeps everything', () => {
    expect(filterByDirection(deps, 15, 'all')).toHaveLength(3)
  })
})
