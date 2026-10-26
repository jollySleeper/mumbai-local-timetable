import { describe, expect, it } from 'vitest'
import { clusterOf, directionGroups, mergeStations } from './stations'
import type { LineInfo } from './types'

const lines: LineInfo[] = [
  {
    code: 'W', name: 'Western', headerA: 'CHURCHGATE', headerB: 'VIRAR, DAHANU',
    stations: [{ index: 0, name: 'CHURCHGATE' }, { index: 15, name: 'ANDHERI' }, { index: 36, name: 'DAHANU ROAD' }],
  },
  {
    code: 'H', name: 'Harbour', headerA: 'CSMT', headerB: 'PANVEL, ANDHERI/GOREGAON',
    stations: [{ index: 0, name: 'CSMT' }, { index: 14, name: 'ANDHERI' }, { index: 34, name: 'PANVEL' }],
  },
  {
    code: 'MM1WD', name: 'Metro 1 — Weekday', headerA: 'VERSOVA', headerB: 'GHATKOPAR',
    stations: [{ index: 0, name: 'VERSOVA' }, { index: 3, name: 'ANDHERI' }, { index: 11, name: 'GHATKOPAR' }],
  },
  {
    code: 'MM1WE', name: 'Metro 1 — Weekend', headerA: 'VERSOVA', headerB: 'GHATKOPAR',
    stations: [{ index: 0, name: 'VERSOVA' }, { index: 3, name: 'ANDHERI' }, { index: 11, name: 'GHATKOPAR' }],
  },
]

describe('mergeStations', () => {
  it('merges Andheri across lines and picks one metro variant', () => {
    const all = mergeStations(lines, false)
    const andheri = all.find((s) => s.name === 'ANDHERI')!
    expect(andheri.instances.map((i) => i.lineCode).sort()).toEqual(['H', 'MM1WD', 'W'])
    expect(andheri.badges.sort()).toEqual(['H', 'MM1', 'W'])
    const weekend = mergeStations(lines, true).find((s) => s.name === 'ANDHERI')!
    expect(weekend.instances.map((i) => i.lineCode)).toContain('MM1WE')
  })
})

describe('directionGroups', () => {
  it('merges Churchgate and CSMT into the SOUTH cluster', () => {
    const andheri = mergeStations(lines, false).find((s) => s.name === 'ANDHERI')!
    const groups = directionGroups(andheri)
    const south = groups.find((g) => g.slug === 'south')!
    expect(south.label).toContain('Churchgate')
    expect(south.label).toContain('CSMT')
    expect(south.directions).toHaveLength(2)
    expect(clusterOf('VIRAR, DAHANU')).toBe('VIRAR')
  })
})
