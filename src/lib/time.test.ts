import { describe, expect, it } from 'vitest'
import { formatMinutes, nowMinutesIST, relativeLabel } from './time'

describe('nowMinutesIST', () => {
  it('converts a known UTC instant to IST (UTC+5:30)', () => {
    // 2026-01-01T00:00:00Z is 05:30 IST
    expect(nowMinutesIST(new Date('2026-01-01T00:00:00Z'))).toBe(330)
  })
  it('handles the midnight boundary', () => {
    // 18:29 UTC = 23:59 IST; 18:31 UTC = 00:01 IST next day
    expect(nowMinutesIST(new Date('2026-01-01T18:29:00Z'))).toBe(1439)
    expect(nowMinutesIST(new Date('2026-01-01T18:31:00Z'))).toBe(1)
  })
})

describe('formatMinutes', () => {
  it('formats 499 as 08:19', () => {
    expect(formatMinutes(499)).toBe('08:19')
  })
  it('formats midnight and wraps', () => {
    expect(formatMinutes(0)).toBe('00:00')
    expect(formatMinutes(1439)).toBe('23:59')
    expect(formatMinutes(1442)).toBe('00:02')
  })
})

describe('relativeLabel', () => {
  it('labels future, now and past', () => {
    expect(relativeLabel(505, 500)).toBe('in 5 min')
    expect(relativeLabel(500, 500)).toBe('now')
    expect(relativeLabel(499, 500)).toBe('')
  })
  it('is empty across the same-day midnight boundary (caller adds a day)', () => {
    expect(relativeLabel(2, 1439)).toBe('')
  })
})
