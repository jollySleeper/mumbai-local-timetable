import { titleCase } from '../lib/format'
import type { StationInfo } from '../lib/types'

export interface StationOption {
  lineCode: string
  lineName: string
  station: StationInfo
}

export default function StationPicker({
  label,
  options,
  onSelect,
}: {
  label: string
  options: StationOption[]
  onSelect: (opt: StationOption) => void
}) {
  if (options.length === 0) {
    return <p className="text-sm text-zinc-500">No stations match your search.</p>
  }
  return (
    <ul aria-label={label} className="divide-y divide-zinc-200 rounded-lg border border-zinc-300 dark:divide-zinc-800 dark:border-zinc-700">
      {options.slice(0, 100).map((opt) => (
        <li key={`${opt.lineCode}:${opt.station.index}`}>
          <button
            type="button"
            onClick={() => onSelect(opt)}
            className="flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <span>{titleCase(opt.station.name)}</span>
            <span className="text-sm text-zinc-500">{opt.lineName}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
