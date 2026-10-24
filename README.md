# Mumbai Local Timetable

A free, open-source, mobile-first web app (installable PWA) that shows the Mumbai suburban (local) train timetable — plus the metro and monorail lines included in the same data source — hosted on GitHub Pages with no backend. Pick a line and station to see the departure board in time order, and tap any departure for the full stop-by-stop run.

## Disclaimer

This is an **unofficial, independent, research/educational project**, not affiliated with Mobond, m-Indicator, Western Railway, Central Railway, or any operator. The timetable data originates from Mobond's published `mumbaidb.zip` (itself a compilation of official railway timetables). Train times are factual data; the *compilation* is Mobond's work. The code in this repository is MIT-licensed; **no licence is claimed over the timetable data itself.** If you are the rights holder and want this changed or removed, open an issue — it will be honoured promptly.

The source zip, decoded CSVs and generated JSON are deliberately not stored in this repository; every deployment regenerates them from upstream (see `BUILD_SPEC.md`).

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
