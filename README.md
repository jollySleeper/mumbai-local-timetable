# Mumbai Local Timetable

A free, open-source, mobile-first web app (installable PWA) that shows the Mumbai suburban (local) train timetable — plus the metro and monorail lines included in the same data source — hosted on GitHub Pages with no backend. Search for a station, choose a direction, and see a unified departure board in 24-hour time; tap any departure for its full stop-by-stop run.

## Disclaimer

This is an **unofficial, independent, research/educational project**, not affiliated with Mobond, m-Indicator, Western Railway, Central Railway, or any operator. The timetable data originates from Mobond's published `mumbaidb.zip` (itself a compilation of official railway timetables). Train times are factual data; the *compilation* is Mobond's work. The code in this repository is MIT-licensed; **no licence is claimed over the timetable data itself.** If you are the rights holder and want this changed or removed, open an issue — it will be honoured promptly.

The source zip, decoded CSVs and generated JSON are deliberately not stored in this repository; every deployment regenerates them from upstream (see `BUILD_SPEC.md`).

## Features

- **Station-first browsing** — stations are unified across lines (Andheri shows Western, Harbour and Metro directions together), with line badges, a last-station shortcut and A–Z/line-order browsing.
- **Unified departure boards** — pick a station and direction to see departures in 24-hour time order, with Slow/Fast/AC and next-trains views, platform, destination codes, and note chips (`AC`, `15 CAR`, `Not on Sunday`). Trains terminating at the current station are arrivals and are not shown as departures.
- **Two precise filters** — *Originating from* only matches trains whose journey starts at the chosen station; *Terminating at* only matches trains whose final destination is the chosen station. They are separate filters, never guessed from one input.
- **Favourite routes** — star a station + direction (e.g. Virar → South) for one-tap access; favourites are stored locally only.
- **Train detail** — tap any departure, or search by train number, for the full stop-by-stop run with times, platforms, platform side where known and major-station highlighting. Numberless metro/monorail services are handled gracefully, and trains can be shared with the system share sheet or a copied link.
- **Installable PWA** — works offline for every station/train you have viewed; prompts (never forces) when a new version is available.
- **Automated updates** — a weekly GitHub Actions workflow checks for a new upstream timetable, regenerates and validates the data, and redeploys only when it changed.

## How it works (methodology)

The timetable originates from Mobond's published `mumbaidb.zip`, a proprietary binary database (custom 4-byte-record format) that was reverse-engineered from the m-Indicator Android app. The proven decoder in `pipeline/decode_mumbaidb.py` reads the zip directly and emits CSVs; `pipeline/build_data.py` then converts those into compact per-station and per-train JSON shards (about 6,200 files, ~24 MB total, fetched on demand — only what you view is downloaded) with strict validation gates, including a golden test on train 90171. The full, verified design is in `BUILD_SPEC.md`.

The app itself is React + TypeScript + Vite + Tailwind CSS, hosted as static files on GitHub Pages. There is no backend, no account, no analytics, and no tracking.

## Limitations

- Times are schedule data from the source zip version shown on each station board; there is no live running/disruption information.
- Day-of-week validity exists only as free-text notes in the source (e.g. "Not on Sunday"); the app displays those notes and never silently filters trains by them.
- Weekday/weekend metro and monorail variants are separate datasets upstream; the app automatically uses the weekend variant on Saturdays and Sundays (IST).
- Offline on iOS is best-effort: Safari may evict cached data after long inactivity.

## Local development

```bash
npm install
python3 pipeline/build_data.py --url https://cdn.mobond.com/mi/mumbaidb.zip --out public/data
npm run dev
```

Other commands: `npm run build`, `npm test`, `npm run typecheck`, `npm run lint`.

## Deployment (one-time setup)

GitHub Pages must be served by Actions, not a branch:

1. In the GitHub repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

After that, deployment is automatic:

- The `Deploy` workflow runs weekly (Mondays ~08:47 IST) and on manual `workflow_dispatch`.
- It compares the deployed `data/meta.json` version with upstream `mumbaidb.zip`'s `version.txt`. If unchanged on a scheduled run, it exits without deploying; manual runs always redeploy.
- It regenerates and validates the timetable (`pipeline/build_data.py`); any validation failure fails the job and the live site keeps serving the previous timetable.
- On success it builds the app and deploys the GitHub Pages artifact. No timetable data is ever committed to git.

## Installing as an app

- **Android (Chrome):** open the site, then Install app / Add to Home screen when prompted.
- **iOS (Safari):** Share → **Add to Home Screen**. iOS may evict cached data after long inactivity, so offline is best-effort there.

Stations and trains you view are cached automatically and work offline; a timetable version update purges stale cached data on next launch.

## Contributing

Issues and pull requests are welcome. Please keep timetable data, the source zip, and CSVs out of git history (they are gitignored) — deployments regenerate them from upstream. Run `npm run lint`, `npm run typecheck`, and `npm test` before opening a PR; CI runs the full pipeline including data generation.

## Licence

Code in this repository is MIT-licensed (see `LICENSE`). No licence is claimed over the timetable data itself; see the disclaimer above.
