import { describe, expect, it } from 'vitest'
import { applyBoardFilters, dedupeDepartures, departingTrains, filterByDirection, selectNext } from './board'
import type { Departure } from './types'

function dep(minutes: number, destIndex: number, trainId = `W:${minutes}`): Departure {
  return {
    minutes,
    trainId,
    trainNumber: null,
    destination: 'X',
    destinationIndex: destIndex,
    destinationDisplay: 'X',
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

describe('departingTrains + applyBoardFilters (v2)', () => {
  it('excludes trains terminating at the board station', () => {
    const deps = [dep(100, 20), { ...dep(200, 15), destination: 'ANDHERI' }]
    expect(departingTrains(deps, 'ANDHERI')).toHaveLength(1)
  })
  it('originating-from and terminating-at are separate filters', () => {
    const a = { ...dep(100, 20), origin: 'VIRAR', destination: 'CHURCHGATE', pattern: 'F', note: '' }
    const b = { ...dep(200, 20), origin: 'BORIVALI', destination: 'CHURCHGATE', pattern: 'S', note: 'AC' }
    const c = { ...dep(300, 20), origin: 'VIRAR', destination: 'BORIVALI', pattern: 'S', note: '' }
    const all = [a, b, c]
    expect(applyBoardFilters(all, { originatingFrom: 'VIRAR' })).toEqual([a, c])
    expect(applyBoardFilters(all, { terminatingAt: 'CHURCHGATE' })).toEqual([a, b])
    expect(applyBoardFilters(all, { originatingFrom: 'VIRAR', terminatingAt: 'CHURCHGATE' })).toEqual([a])
    expect(applyBoardFilters(all, { pattern: 'AC' })).toEqual([b])
    expect(applyBoardFilters(all, { pattern: 'FAST' })).toEqual([a])
  })
})

describe('dedupeDepartures', () => {
  it('keeps one copy of a numbered train present in two line files', () => {
    const a = { ...dep(18, 0), trainNumber: '98702', lineCode: 'H' }
    const b = { ...dep(18, 0), trainNumber: '98702', lineCode: 'W' }
    const c = { ...dep(18, 0), trainNumber: null, lineCode: 'MM1WD' }
    const d = { ...dep(18, 0), trainNumber: null, lineCode: 'MM3WD' }
    expect(dedupeDepartures([a, b, c, d])).toEqual([a, c, d])
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
