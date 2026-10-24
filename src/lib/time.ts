// IST time helpers (BUILD_SPEC §6.3). All timetable times are Asia/Kolkata.
// Never use the device's local timezone for "next train" logic.

export function nowMinutesIST(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return (h % 24) * 60 + m
}

/** 499 -> "08:19". Values wrap modulo a day. */
export function formatMinutes(m: number): string {
  const norm = ((m % 1440) + 1440) % 1440
  const hh = Math.floor(norm / 60)
  const mm = norm % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Same-day relative label: "now" | "in 5 min" | "" (already past). */
export function relativeLabel(m: number, now: number): string {
  const diff = m - now
  if (diff < 0) return ''
  if (diff === 0) return 'now'
  return `in ${diff} min`
}
