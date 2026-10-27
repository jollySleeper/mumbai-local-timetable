import { ChevronRight, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isFavourite, loadFavourites, toggleFavourite, type FavRoute } from '../lib/favourites'
import { titleCase } from '../lib/format'
import { directionGroups, type UnifiedStation } from '../lib/stations'

export default function DestinationGroups({ station }: { station: UnifiedStation }) {
  const groups = directionGroups(station)
  const [favs, setFavs] = useState(loadFavourites)

  return (
    <div className="nf-panel rounded-3xl p-3 sm:p-4">
      <p className="px-1 pt-1 pb-2 text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase dark:text-zinc-400">
        Choose direction
      </p>
      <ul className="divide-y divide-zinc-900/6 dark:divide-white/8">
        {groups.map((g) => {
          const route: FavRoute = { stationName: station.name, cluster: g.cluster, slug: g.slug, label: g.label }
          const starred = isFavourite(favs, station.name, g.slug)
          const badges = [...new Set(g.directions.map((d) => d.instance.badge))]
          return (
            <li key={g.slug} className="flex items-center">
              <Link
                to={`/board/${encodeURIComponent(station.name)}/${g.slug}`}
                className="flex min-h-[56px] flex-1 items-center gap-3 py-2 pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]"
                aria-label={`Trains from ${titleCase(station.name)} towards ${g.label}`}
              >
                <span className="flex-1">
                  <span className="block text-[17px] font-semibold">Towards {g.label}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {badges.join(' · ')}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-zinc-400" />
              </Link>
              <button
                type="button"
                aria-label={starred ? `Remove saved route ${titleCase(station.name)} to ${g.label}` : `Save route ${titleCase(station.name)} to ${g.label}`}
                aria-pressed={starred}
                onClick={() => setFavs(toggleFavourite(route))}
                className="min-h-[44px] shrink-0 px-2 text-[#f5a524] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d93a3e]"
              >
                <Star aria-hidden="true" className="h-5 w-5" fill={starred ? 'currentColor' : 'none'} />
              </button>
            </li>
          )
        })}
      </ul>
      <p className="px-1 pt-2 pb-1 text-xs text-zinc-500 dark:text-zinc-400">
        Trains terminating at {titleCase(station.name)} are arrivals and are not shown on its departure boards. Station maps are not available in this web app.
      </p>
    </div>
  )
}
