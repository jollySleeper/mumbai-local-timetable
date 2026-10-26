import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { directionGroups, type UnifiedStation } from '../lib/stations'

export default function DestinationGroups({ station }: { station: UnifiedStation }) {
  const groups = directionGroups(station)
  return (
    <div className="bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
      <p className="flex items-center gap-2 py-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#c8102e]" />
        Local/Metro Destination
      </p>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {groups.map((g) => (
          <li key={g.slug}>
            <Link
              to={`/board/${encodeURIComponent(station.name)}/${g.slug}`}
              className="flex min-h-[44px] items-center gap-2 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]"
            >
              <span className="flex shrink-0 gap-1">
                {[...new Set(g.directions.map((d) => d.instance.badge))].map((b) => (
                  <span key={b} className="rounded bg-[#23265d] px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {b}
                  </span>
                ))}
              </span>
              <span className="flex-1 font-medium text-zinc-900 dark:text-zinc-50">{g.label}</span>
              <ChevronRight aria-hidden="true" className="h-4 w-4 text-zinc-400" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="py-1 text-xs text-zinc-500">Station maps are not available in this web app.</p>
    </div>
  )
}
