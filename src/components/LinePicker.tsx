import type { LineInfo } from '../lib/types'

export const LINE_COLORS: Record<string, string> = {
  W: '#2563eb',
  C: '#dc2626',
  H: '#16a34a',
  T: '#9333ea',
  U: '#0891b2',
  DPR: '#ea580c',
  DVP: '#ea580c',
  NM: '#65a30d',
  P: '#db2777',
}

export function lineColor(code: string): string {
  return LINE_COLORS[code] ?? '#71717a'
}

const RAILWAY = new Set(['W', 'C', 'H', 'T', 'U', 'DPR', 'DVP', 'NM', 'P'])

export default function LinePicker({
  lines,
  value,
  onChange,
}: {
  lines: LineInfo[]
  value: string
  onChange: (code: string) => void
}) {
  const railway = lines.filter((l) => RAILWAY.has(l.code))
  const metro = lines.filter((l) => !RAILWAY.has(l.code))
  const render = (l: LineInfo) => (
    <button
      key={l.code}
      type="button"
      aria-pressed={value === l.code}
      onClick={() => onChange(l.code)}
      className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
        value === l.code
          ? 'border-red-700 bg-red-50 font-semibold dark:bg-red-950'
          : 'border-zinc-300 dark:border-zinc-700'
      }`}
    >
      <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: lineColor(l.code) }} />
      {l.name}
      <span className="text-zinc-500">({l.code})</span>
    </button>
  )
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">Line</legend>
      <p className="mb-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">Railway</p>
      <div className="mb-3 grid grid-cols-2 gap-2">{railway.map(render)}</div>
      <p className="mb-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">Metro / Monorail</p>
      <div className="grid grid-cols-1 gap-2">{metro.map(render)}</div>
    </fieldset>
  )
}
