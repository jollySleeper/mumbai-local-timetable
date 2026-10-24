import type { Departure } from './types'

export interface BoardDeparture extends Departure {
  tomorrow: boolean
}

export type DirectionFilter = 'all' | 'A' | 'B'

/**
 * Filter by direction (§6.1): compare destination index with current station.
 * A = towards headerA (lower indices), B = towards headerB (higher indices).
 * A departure terminating here is shown in All and in any direction view,
 * marked by the caller via destinationIndex === stationIndex.
 */
export function filterByDirection(
  deps: Departure[],
  stationIndex: number,
  dir: DirectionFilter,
): Departure[] {
  if (dir === 'all') return deps
  return deps.filter((d) => {
    if (d.destinationIndex === stationIndex) return true // terminates here
    return dir === 'A' ? d.destinationIndex < stationIndex : d.destinationIndex > stationIndex
  })
}

/**
 * Next-trains list (§6.1): departures with minutes >= now-1 first, in order;
 * filled up to `count` with the first departures of the day labelled tomorrow,
 * so the board never shows an empty screen at end of service.
 */
export function selectNext(deps: Departure[], now: number, count = 50): BoardDeparture[] {
  const sorted = [...deps].sort((a, b) => a.minutes - b.minutes)
  const remaining = sorted.filter((d) => d.minutes >= now - 1)
  const result: BoardDeparture[] = remaining.slice(0, count).map((d) => ({ ...d, tomorrow: false }))
  if (result.length < count) {
    for (const d of sorted) {
      if (result.length >= count) break
      result.push({ ...d, tomorrow: true })
    }
  }
  return result
}

/** Relative label taking tomorrow into account: minutes may be +1440. */
export function relativeFor(minutes: number, now: number, tomorrow: boolean): string {
  const diff = minutes + (tomorrow ? 1440 : 0) - now
  if (diff < 0) return ''
  if (diff === 0) return 'now'
  if (diff < 60) return `in ${diff} min`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m ? `in ${h}h ${m}m` : `in ${h}h`
}
