const KEYWORDS = ['15 CAR', '12 CAR', 'AC', 'Not on Sunday', 'Not on Saturday', 'Sunday', 'Saturday']

/** Highlight day/AC/car keywords as chips (§2.3.2). Never filters the train out. */
export default function NoteChips({ note, hideAC = false }: { note: string; hideAC?: boolean }) {
  const text = (note || '').trim()
  if (!text) return null
  const matched = KEYWORDS.filter((k) => text.toLowerCase().includes(k.toLowerCase()))
  const chips = matched.filter((k) => !(hideAC && k === 'AC'))
  if (matched.length > 0 && chips.length === 0) return null
  if (chips.length === 0) {
    return (
      <span className="nf-pill-muted inline-flex rounded-full px-2 py-0.5 text-xs font-medium">{text}</span>
    )
  }
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c}
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            c === 'AC'
              ? 'nf-pill-ac'
              : 'bg-[#f5a524]/20 text-amber-800 dark:text-amber-200'
          }`}
        >
          {c === 'AC' ? '❄ AC' : c}
        </span>
      ))}
    </span>
  )
}

/** True when the source note marks this service as air-conditioned. */
export function isAC(note: string): boolean {
  return (note || '').toUpperCase().includes('AC')
}
