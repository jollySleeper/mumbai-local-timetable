const KEYWORDS = ['15 CAR', '12 CAR', 'AC', 'Not on Sunday', 'Not on Saturday', 'Sunday', 'Saturday']

/** Highlight day/AC/car keywords as chips (§2.3.2). Never filters the train out. */
export default function NoteChips({ note }: { note: string }) {
  const text = (note || '').trim()
  if (!text) return null
  const chips = KEYWORDS.filter((k) => text.toLowerCase().includes(k.toLowerCase()))
  return (
    <span className="flex flex-wrap gap-1">
      {chips.length > 0 ? (
        chips.map((c) => (
          <span key={c} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
            {c}
          </span>
        ))
      ) : (
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{text}</span>
      )}
    </span>
  )
}
