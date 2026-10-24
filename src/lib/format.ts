// Display formatting helpers (BUILD_SPEC §2.3.6–2.3.8, §6, Commit 6).

const TITLE_EXCEPTIONS: Record<string, string> = {
  CSMT: 'CSMT',
}

function titleWord(word: string): string {
  const upper = word.replace(/[()]/g, '').toUpperCase()
  if (TITLE_EXCEPTIONS[upper]) {
    return word.startsWith('(') ? `(${TITLE_EXCEPTIONS[upper]})` : TITLE_EXCEPTIONS[upper]
  }
  const lower = word.toLowerCase()
  // "(west)" -> "(West)", "jn" -> "Jn", "road" -> "Road"
  return lower.replace(/\(?([a-z])/, (c) => c.toUpperCase())
}

/** Title-case a raw uppercase station name for display only. Never use for lookups. */
export function titleCase(raw: string): string {
  if (!raw) return ''
  return raw.split(' ').map(titleWord).join(' ')
}

/** Normalise messy service_pattern for display (§2.3.6). Always keep raw for detail. */
export function patternLabel(pattern: string): string {
  const p = (pattern || '').trim()
  if (!p) return ''
  if (p.startsWith('SF')) return 'Fast'
  if (p.startsWith('S')) return 'Slow'
  if (p.startsWith('F')) return 'Fast'
  return p
}

/** Platform display (§2.3.7): "" -> "", "3|4" -> "PF 3/4", "6" -> "PF 6". */
export function platformLabel(pf: string): string {
  if (!pf) return ''
  return `PF ${pf.replace(/\|/g, '/')}`
}
