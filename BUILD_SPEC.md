# Mumbai Local Timetable — Build Specification

> **Purpose of this document:** This is a complete, self-contained handoff spec. Give the
> entire file to an LLM (or a human developer) and they should be able to build the project
> from scratch, in small commits, without needing any other context.
>
> **How to use it (instructions for the building agent):**
> 1. Read §1–§4 first. They contain verified facts. Do not re-derive or contradict them
>    without evidence.
> 2. Build in the exact commit order in §10. One commit = one concern. Run that commit's
>    "Verify" step before committing. Do not batch multiple commits into one.
> 3. If anything in this spec conflicts with what you observe in the actual data, STOP and
>    report the conflict instead of silently improvising.
> 4. Never commit timetable data, the source zip, CSVs, or the APK to git (see §9).

---

## 1. What we are building

A **free, open-source, mobile-first web app** that shows the Mumbai suburban (local) train
timetable — plus metro/monorail lines included in the same data source — as a fast,
installable **PWA** hosted on **GitHub Pages** with **no backend**.

### v1 scope (build exactly this)

1. **Station departure board** — pick a line and station, see departures in time order,
   with "next trains from now" behaviour, direction filter, destination, Slow/Fast,
   platform, and notes.
2. **Train detail view** — tap any departure (or search by train number) to see the full
   stop-by-stop run with times and platforms.
3. **Installable PWA** — app shell works offline; every station/train the user views is
   cached automatically for offline use.
4. **Automated timetable updates** — a scheduled GitHub Actions workflow detects when the
   upstream timetable changes, regenerates the data, validates it, and redeploys.
   No human involvement, no data committed to the repo.

### Explicitly out of scope for v1 (do not build)

- Live running status (designed for in §12, but not built).
- Trains-between-two-stations journey search.
- Favourites / recent stations (planned as first fast-follow, §12).
- Full-offline one-tap download pack (fast-follow on the same caching plumbing, §12).
- User accounts, analytics, ads, any server-side code of any kind.
- Bus / auto / ferry / taxi data (exists in the source zip in other formats; ignore it).

---

## 2. Background and provenance (verified facts)

These facts were established by reverse-engineering the m-Indicator Android app
(`com.mobond.mindicator` v18.0.369) and live-testing its servers on **24 Oct 2026**.
Treat them as ground truth.

### 2.1 Where the timetable comes from

- The app does **not** fetch the local timetable from any official railway API. It uses a
  proprietary, manually maintained database published by Mobond as a single zip:
  **`https://cdn.mobond.com/mi/mumbaidb.zip`** (≈1.3 MB, HTTPS works).
- The zip's `version.txt` currently contains **`20260417`** (last modified 17 Apr 2026).
  Updates are irregular — weeks or months apart. The currently published zip is
  byte-identical to the reference copy used to develop the decoder.
- Inside the zip, `local/<LINE>/index` plus one binary file per station encode the entire
  timetable in a custom 4-byte-record binary format. A proven decoder already exists:
  **`decode_mumbaidb.py`** (Python 3, no third-party dependencies). It reads the zip
  directly (or an extracted folder) and emits CSVs + a `summary.json` validation report.
  **Reuse it. Do not rewrite the binary parsing.**

### 2.2 Decoded data (reference numbers for version `20260417`)

- **20 line codes:** `W, C, H, T, U, DPR, DVP, NM, P, MM1WD, MM1WE, MM3WD, MM3WE, MMAD,
  MMAD2, MMAD3, MONO1, MONO1WE, NMM1, NMM1_2`
- **5,714 trains**, **448 line-station entries** (254 unique station names — the same
  station appears once per line serving it, e.g. DADAR is on both `W` and `C`),
  **104,011 stop records** total, of which **102,928 are canonical** (see §2.3).
- **3,442 trains have an official train number** (e.g. `90171`). All numbered trains are on
  the railway lines (`W, C, H, T, U, DPR, DVP, NM, P`). Metro/monorail lines
  (`MM*`, `MONO*`, `NMM1*`) have **no** train numbers — 2,272 trains identified only by
  line + sequence + origin time. The UI must handle numberless trains gracefully.
- Decoder output files (in `decoded_timetable/`):
  - `trains.csv` — one row per train: `line, train_seq, train_number, origin, destination,
    destination_display, direction_code, direction, service_pattern, note, trailer_value`
  - `timetable_by_train.csv` — one row per stop, already grouped and correctly ordered
    per train run: `stop_order, line, station, station_index, station_in_index, time_24h,
    minutes_since_midnight, train_seq, train_number, origin, destination,
    destination_display, direction_code, direction, service_pattern, note, platform,
    platform_raw, platform_override, override_platform, override_b, side, side_code,
    record_hex`
  - `timetable_all.csv` — same stops sorted by station/time instead (not needed by the
    converter if you derive departures from `timetable_by_train.csv`; see §5.2).
  - `stations.csv` — `line, station_index, station`.
  - `summary.json` — per-line counts and a `problems` list. For the reference version:
    `total_stop_rows = 104011`, `problems = []`.

### 2.3 Data quirks you MUST handle (all empirically proven)

1. **Stale duplicate station files (1,083 rows).** The source ships misspelt/legacy station
   files (e.g. `AMBERNATH` vs the canonical `AMBARNATH`). `timetable_all.csv` keeps these
   rows with `station_in_index = ''`. `timetable_by_train.csv` already **excludes** them.
   → Build all app data from `timetable_by_train.csv` + `trains.csv` + `stations.csv`
   only, and assert every row used has `station_in_index = 'Y'`.
2. **No day-of-week field exists.** The binary's per-train byte is a *direction* code
   (proven 100% correlated with direction, 0% with days). Day validity exists **only** as
   free text in `note` (e.g. `Not on Sunday`, `15 CAR, Not on Sunday`,
   `AC, General on Saturday and Sunday`). → v1 must **display** notes, never silently
   filter by them. You may highlight keywords (`AC`, `15 CAR`, `Not on Sunday`) as chips,
   but the train always stays in the list.
3. **Weekday/weekend variants are separate line codes.** `MM1WD` vs `MM1WE`, `MM3WD` vs
   `MM3WE`, `MONO1` vs `MONO1WE`, `MMAD/MMAD2/MMAD3`, `NMM1` vs `NMM1_2` are distinct
   datasets with (mostly) identical station lists but different schedules. → Never merge
   them. Present them as separate, clearly labelled entries in the line picker
   (e.g. "Metro 1 — Weekday", "Metro 1 — Weekend"). Railway lines have no such variants;
   their Sunday variations live only in `note` (quirk 2).
4. **Y-shaped Harbour line.** Line `H` shares one station list across branches
   (Panvel branch + Andheri/Goregaon branch), so station-index order is not always travel
   order. `timetable_by_train.csv` already resolves this (time-order fallback).
   → Always trust `stop_order` from that file; never re-sort a train's stops by
   `station_index`.
5. **Post-midnight trains.** Some runs end after midnight; a few legitimately have a stop
   time "earlier" than the previous stop for this reason. Times are stored as minutes
   since midnight (0–1439) of the *service day*. → Don't "fix" or drop non-monotonic
   runs; display times as-is.
6. **Service pattern is messy free text.** Values include `S` (Slow, 4,901 trains), `F`
   (Fast), `F*`, `F-Mulund`, `F-Adh`, `F-Diva`, `SF-Bhandup`, and occasionally empty.
   → Normalise for display only: pattern starting with `S` (but not `SF`) → "Slow";
   starting with `F` or `SF` → "Fast"; always also show the raw string in train detail.
   Never drop a train because its pattern is unrecognised.
7. **Platform is often empty** (≈48% of stops, mostly metro/monorail) and can be a range
   like `3|4`. `side` is `L` / `R` / `B` (platform side) or empty. → Render empty platform
   as nothing (not "PF –"), render `3|4` as "PF 3/4".
8. **Station names are uppercase with spaces** (`SANDHURST ROAD`, `VASAI ROAD`).
   → Display title-cased in the UI ("Sandhurst Road") but keep the raw name as the data
   key. Beware: title-casing is display-only; never slugify for lookups — use
   `line + station_index` as the canonical station ID everywhere.

### 2.4 Live data (NOT in v1 — context for §12 only)

- Live local-train status comes from Mobond's crowdsourced GPS system:
  `GET https://mobond.com/mtracker/getalllivetrains?s=<STATION>&l=<LINE>` returns a JSON
  map of *all* live trains (the server ignores the station params; the app filters
  locally), and `GET https://mobond.com/mtracker/getlivetraininfo?tn=<number>` returns one
  train's position. Full details are in the companion doc `API_DOCUMENTATION.md`.
- **Verified 24 Oct 2026: neither `mobond.com` nor `cdn.mobond.com` sends an
  `Access-Control-Allow-Origin` header.** Browsers therefore cannot call them directly.
  This is why v1 has no live data and why §12 requires a Cloudflare Worker proxy.
  Do not attempt direct browser calls to Mobond — they will fail with CORS errors.

---

## 3. Architecture

```
┌──────────────────────── GitHub (public repo) ────────────────────────┐
│  Source code only: React app, Python pipeline, workflow YAML.        │
│  NO timetable data, NO zip, NO CSVs in git history.                  │
│                                                                      │
│  GitHub Actions (weekly cron + manual dispatch):                     │
│    1. Download mumbaidb.zip from Mobond CDN                          │
│    2. Compare version.txt vs deployed site's data/meta.json          │
│    3. If newer → decode (decode_mumbaidb.py) → convert (§5)          │
│    4. Validate (§5.4) — abort deploy on any failure                  │
│    5. Build React app (Vite) → upload Pages artifact → deploy        │
└──────────────────────────────────────────────────────────────────────┘
                              │ serves static files only
                              ▼
   User's phone browser / installed PWA
     • App shell (JS/CSS/icons) — precached by service worker
     • data/*.json — fetched on demand, runtime-cached (§7)
     • No API keys, no backend, no tracking
```

### 3.1 Decisions already made (do not relitigate)

| Decision | Choice | Rationale |
|---|---|---|
| Hosting | GitHub Pages via Actions artifact (not a `gh-pages` branch) | Free; data never enters git history |
| Frontend | React + TypeScript + Vite | Maintainer's choice; TS catches data-shape changes at build time |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` | No legacy config file; utility-first suits list-heavy UI |
| Routing | React Router, clean URLs, `404.html` fallback | SPA on Pages needs the fallback trick (§6.4) |
| PWA | `vite-plugin-pwa` (Workbox), `registerType: 'prompt'` | Never auto-reload mid-journey; user taps to update |
| Data format | Compact per-station + per-train JSON shards (§5.3) | Largest station file ≈185 KB (W/Andheri, 1,260 departures, ~17 KB gz; corrected 2026-10-24 — original 55 KB estimate was arithmetically inconsistent with the §5.3 schema) — fetch only what's viewed |
| Data fetching | Typed `fetch` + small custom hooks | TanStack Query deferred until live polling exists (§12) |
| Backend | None. No Go binary, no server. | A binary doesn't remove hosting for a public URL; same `dist/` can be wrapped later if ever wanted (§12) |
| UI library | None (hand-rolled Tailwind components); `lucide-react` for icons | Keep bundle and dependency surface minimal |

### 3.2 Repository layout (create exactly this)

```
mumbai-local-timetable/
├── .github/workflows/
│   ├── ci.yml                # lint + typecheck + test + build on PRs/pushes
│   └── deploy.yml            # scheduled/manual production deploy (§8)
├── index.html                # (repo root IS the Vite app root)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   ├── icons/                # PWA icons (§7.2)
│   └── data/                 # GENERATED locally for dev; gitignored (§9)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.tsx
│   ├── lib/
│   │   ├── types.ts          # shared TS interfaces (§5.3 is the source of truth)
│   │   ├── data.ts           # typed fetchers for the JSON shards
│   │   ├── time.ts           # IST clock helpers (§6.3)
│   │   └── format.ts         # title-case, platform, pattern normalisation
│   ├── hooks/
│   │   └── useJson.ts        # fetch + loading/error state hook
│   ├── components/
│   │   ├── LinePicker.tsx
│   │   ├── StationPicker.tsx
│   │   ├── DepartureRow.tsx
│   │   ├── NoteChips.tsx
│   │   └── UpdatePrompt.tsx  # PWA update prompt (§7)
│   └── pages/
│       ├── StationBoard.tsx  # route: /station/:line/:stationIndex
│       ├── TrainDetail.tsx   # route: /train/:line/:seq
│       └── Home.tsx          # line/station pickers + train-number search
├── pipeline/
│   ├── decode_mumbaidb.py    # copied verbatim from reference decoder (§5.1)
│   └── build_data.py         # zip → validated JSON shards (§5)
├── scripts/
│   └── sample_data.sh        # optional local dev convenience (§10, commit 4)
├── BUILD_SPEC.md             # this document
├── README.md
├── LICENSE                   # MIT, code only (§11)
└── .gitignore
```

> **Note on layout:** keep the Vite app at the repo root (not in a subfolder). It makes
> the Pages workflow, `base` path handling, and local dev all simpler.

---

## 4. Naming and identity

- Repo name (assumed): `mumbai-local-timetable` → Pages URL
  `https://<user>.github.io/mumbai-local-timetable/`. If the repo is renamed, the Vite
  `base` must change with it (§6.4). Prefer making `base` configurable via the
  `VITE_BASE` env var in the workflow (default `/mumbai-local-timetable/`).
- App display name: **"Mumbai Local Timetable"** (short name: `Local Trains`).
  Do **not** use the name "m-Indicator" or Mobond branding anywhere — this is an
  unofficial, independent project (§11).
- Default line/station on first load: Western line, Andheri — a sensible, busy default
  so the first paint is useful without any input.

---

## 5. Data pipeline (`pipeline/build_data.py`)

This is the heart of the project. It runs in GitHub Actions (and locally for dev),
**never** in the browser.

### 5.1 Inputs

- Downloads (or accepts a local path to) `mumbaidb.zip`.
- Runs `decode_mumbaidb.py` (copied verbatim into `pipeline/`) against it into a temp
  directory, producing the CSVs + `summary.json` described in §2.2.
- Reads only: `timetable_by_train.csv`, `trains.csv`, `stations.csv`, `summary.json`.
  Do **not** read `timetable_all.csv` (it contains the stale-station rows, §2.3.1).

### 5.2 Derivation rules

- **Departures for a station** = all rows of `timetable_by_train.csv` for that
  `(line, station)`, sorted by `minutes_since_midnight`. (This automatically excludes
  stale stations and gives you each train's destination/platform for free.)
- **A train's run** = its rows in `stop_order` order. Never re-sort (§2.3.4).
- **Train identity:** `id = "<line>:<train_seq>"` (e.g. `W:108`). `train_seq` is stable
  *within one timetable version only* — never persist it across versions (favourites in
  the fast-follow must re-validate; note this in code comments where relevant).
  Display identity is `train_number` when present.
- **Direction for filtering:** a departure's direction is toward its `destination`.
  Include the destination's station index (`destIndex`) in each departure record so the
  UI can offer "towards <terminal A>" / "towards <terminal B>" filters by comparing
  indices, using the line's two terminal labels from `summary.json`
  (`index_header_a` / `index_header_b`) as filter labels.
- **Line display metadata:** create a small hand-maintained map in `build_data.py`
  (or a `pipeline/lines.json`) giving each line code a human name. Required entries —
  verify each against `stations.csv` termini before finalising:
  `W` Western, `C` Central, `H` Harbour, `T` Trans-Harbour, `U` Uran,
  `DPR` Diva–Panvel–Roha, `DVP` Diva–Dahanu/Panvel (branch line — check stations),
  `NM` Neral–Matheran, `P` Pune–Lonavla,
  `MM1WD/MM1WE` Metro 1 (Versova–Ghatkopar) Weekday/Weekend,
  `MM3WD/MM3WE` Metro 3 (Cuffe Parade–Aarey) Weekday/Weekend,
  `MMAD/MMAD2/MMAD3` Metro 2A/7 variants (label from termini: Gundavali–Andheri West;
  if unsure, label literally "Metro (Andheri West) variant 1/2/3" rather than guessing),
  `MONO1/MONO1WE` Monorail Weekday/Weekend,
  `NMM1/NMM1_2` Navi Mumbai Metro variants.
  Mark this map with a comment: "Display names only — verify against stations.csv."

### 5.3 Output JSON schemas (write to `public/data/` locally, `dist/data/` in CI)

All JSON is compact (no pretty-printing). Field names are short on purpose — this is a
wire format; map to readable names in TypeScript (§6.2).

**`data/meta.json`**
```json
{ "version": "20260417", "generatedAt": "<ISO-8601 UTC>", "source": "mumbaidb.zip",
  "counts": { "trains": 5714, "stations": 448, "stops": 102928 } }
```

**`data/stations.json`** — everything the pickers need, one file:
```json
{ "lines": [
  { "code": "W", "name": "Western", "headerA": "CHURCHGATE", "headerB": "VIRAR, DAHANU",
    "stations": [ { "index": 0, "name": "CHURCHGATE" }, { "index": 1, "name": "MARINE LINES" } ] }
] }
```
(Station arrays in `station_index` order, from `stations.csv`.)

**`data/departures/<LINE>/<stationIndex>.json`** — one per line-station (448 files):
```json
{ "line": "W", "station": "ANDHERI", "stationIndex": 15,
  "departures": [
    { "m": 499, "trainId": "W:108", "no": "90171", "dest": "BORIVALI", "destIndex": 21,
      "origin": "CHURCHGATE", "pattern": "F*", "note": "", "pf": "6", "side": "R" }
  ] }
```
- `m` = minutes since midnight. `no` = `null` for numberless (metro) trains.
- Sorted by `m` ascending. Largest known file: W/Andheri ≈ 185 KB uncompressed (1,260 departures; verified 2026-10-24) — if any
  generated file exceeds 250 KB, fail validation (something is wrong).

**`data/trains/<LINE>_<seq>.json`** — one per train (5,714 files):
```json
{ "id": "W:108", "line": "W", "no": "90171", "origin": "CHURCHGATE",
  "destination": "BORIVALI", "pattern": "F*", "note": "",
  "stops": [
    { "station": "CHURCHGATE", "stationIndex": 0, "m": 470, "time": "07:50", "pf": "3|4", "side": "B" },
    { "station": "ANDHERI", "stationIndex": 15, "m": 499, "time": "08:19", "pf": "6", "side": "R" }
  ] }
```
Reference check (must hold for timetable `20260417`): train `90171` is
Churchgate 07:50 → Mumbai Central 07:58 → Dadar 08:05 → Bandra 08:11 → Andheri 08:19
(PF 6) → Borivali 08:35. Add this as an automated test (§5.4).

**`data/train-index.json`** — for train-number search (numbered trains only):
```json
[ { "no": "90171", "trainId": "W:108", "line": "W", "origin": "CHURCHGATE",
    "destination": "BORIVALI", "firstTime": "07:50" } ]
```

**Total expected output size:** ≈ 24.5 MB uncompressed across ~6,200 files (verified 2026-10-24: departures 14.6 MB + trains 9.4 MB; only individual shards are fetched on demand). GitHub Pages
(site limit 1 GB) and the Actions artifact both handle this easily.

### 5.4 Validation gates (pipeline must exit non-zero if any fail)

1. `summary.json` → `problems` is empty.
2. `total_stop_rows` ≥ 90,000 and number of trains ≥ 5,000 (sanity floors, not exact
   counts — future timetable versions will legitimately differ slightly; do **not**
   hard-code 104,011 as a pass/fail equality).
3. Every row consumed from `timetable_by_train.csv` has `station_in_index = 'Y'`.
4. Every generated JSON file parses; every departure's `trainId` resolves to a generated
   train file and vice versa (every train has ≥ 2 stops).
5. No departures file > 250 KB; `meta.json` version equals the zip's `version.txt`.
6. **Golden test:** train `90171`'s stops equal the reference in §5.3 (skip only if
   `90171` is absent in a future version — then pick the first `W` train and assert it
   has ≥ 2 stops and non-decreasing `stop_order`).

### 5.5 CLI contract

```bash
python3 pipeline/build_data.py --zip /path/to/mumbaidb.zip --out public/data
python3 pipeline/build_data.py --url https://cdn.mobond.com/mi/mumbaidb.zip --out public/data
```
Exit 0 on success (prints version + counts), non-zero with a clear message on any
validation failure. No third-party Python dependencies (stdlib only, matching the
decoder). Works on Python 3.11+.

---

## 6. Frontend (`src/`)

### 6.1 Pages and behaviour

**Home (`/`)**
- Line picker (group railway lines vs metro/monorail; metro variants labelled per §5.2).
- Station picker for the chosen line (search-as-you-type filter over that line's
  stations; also allow searching a station name across lines — if a name exists on
  multiple lines, show each line variant, e.g. "Dadar — Western" / "Dadar — Central").
- Train-number search box (uses `train-index.json`; numeric input; on submit navigates
  to the train detail).
- Selecting a station navigates to the station board. Remember last line+station in
  `localStorage` and offer it as a one-tap shortcut on next visit.

**Station board (`/station/:line/:stationIndex`)**
- Header: station name (title-cased), line name, timetable version (from `meta.json`,
  small print).
- "Next trains" list: departures with `m >= nowIST - 1` first, in time order; a toggle
  to view the full day's list. When today's remaining departures run out, append the
  first departures of the day labelled as next-day (e.g. "tomorrow") rather than
  showing an empty screen.
- Direction filter: All / towards headerA terminal / towards headerB terminal
  (compare `destIndex` with the current `stationIndex`; a departure whose
  `destIndex == stationIndex` terminates here — show it in "All" and in the towards-
  destination direction, marked "Terminates here").
- Each row: time (24h `HH:MM`, plus relative "in 12 min" for the next few), destination,
  Slow/Fast badge, train number (if any), platform ("PF 6", "PF 3/4", or nothing),
  note chips (§2.3.2). Row tap → train detail, passing the board's station so the
  detail can highlight it.
- Auto-refresh the relative times every 30 s (recompute from already-fetched data;
  no network refetch).
- Loading skeleton and a clear error state ("Couldn't load timetable — check
  connection") with retry. If the fetch fails but a cached copy exists (offline),
  the service worker serves it (§7) and the page should show a subtle "Offline —
  showing saved timetable" notice by detecting `navigator.onLine === false`.

**Train detail (`/train/:line/:seq`)**
- Header: train number (or origin departure time + "Metro service" label if
  numberless), origin → destination, raw service pattern, full note text.
- Stop list in order: station (title-cased), time, platform/side. Highlight the
  station passed from the board (via query param `?from=<stationIndex>`).
  Mark origin "Starts here" and destination "Ends here".
- A "View departures from this station" link per stop → that station's board.

### 6.2 TypeScript types (`src/lib/types.ts`)

Define interfaces mirroring §5.3 exactly (`Meta`, `LineInfo`, `StationInfo`,
`Departure`, `DeparturesFile`, `TrainRun`, `TrainStop`, `TrainIndexEntry`) and map the
short wire fields to readable names at the fetch boundary in `src/lib/data.ts`
(e.g. `m` → `minutes`). Components should never see raw wire field names.

### 6.3 Time handling (`src/lib/time.ts`)

- All timetable times are **Asia/Kolkata**. Compute "now in IST" via
  `Intl.DateTimeFormat` with `timeZone: 'Asia/Kolkata'` — never the device's local
  timezone. (A user travelling abroad should still see Mumbai "next train" logic.)
- Provide: `nowMinutesIST(): number`, `formatMinutes(m): "HH:MM"`,
  `relativeLabel(m, now): "in 5 min" | "now" | ""`.
- Unit-test these (§10, commit 9), including the midnight boundary.

### 6.4 Routing on GitHub Pages

- `vite.config.ts`: `base: process.env.VITE_BASE ?? '/mumbai-local-timetable/'`.
- React Router `basename` = `import.meta.env.BASE_URL`.
- Post-build step (npm script `postbuild`): copy `dist/index.html` → `dist/404.html`
  so deep links like `/station/W/15` survive a refresh on Pages. Verify locally by
  serving `dist/` with a static server and hard-refreshing a deep link.

### 6.5 Design and UX requirements

- **Mobile-first.** Max content width ~640 px centred on desktop; bottom-safe-area
  padding (`env(safe-area-inset-bottom)`); tap targets ≥ 44 px; base font ≥ 16 px
  (prevents iOS input zoom).
- System font stack (no web-font downloads — faster, offline-safe).
- Dark mode via `prefers-color-scheme`, using Tailwind's `dark:` variants.
- Colour-code lines with a small left border/dot per line (Western, Central, Harbour
  at minimum get distinct colours; metro lines may share a neutral colour). Always pair
  colour with the line name text (never colour alone).
- Accessibility: semantic landmarks, labelled controls, visible focus rings, and the
  departure list must be readable by screen readers (time + destination as text, not
  icon-only).

---

## 7. PWA requirements

### 7.1 Service worker strategy (`vite-plugin-pwa`, Workbox `generateSW`)

- `registerType: 'prompt'` with an `UpdatePrompt` component ("New timetable/app version
  available — Reload"). Never force-reload.
- **Precache (install-time):** only the app shell — hashed JS/CSS, `index.html`, icons.
  Configure Workbox `globPatterns`/`globIgnores` so `data/**` is **excluded** from the
  precache (thousands of small files must not be downloaded on first visit).
- **Runtime caching:**
  - `data/stations.json`, `data/train-index.json`, `data/meta.json` → `NetworkFirst`
    (3 s network timeout) into cache `timetable-index`, so updates arrive promptly but
    offline still works.
  - `data/departures/**` and `data/trains/**` → `NetworkFirst` into cache
    `timetable-data` with an expiration (e.g. max 500 entries, 30 days). This is what
    makes every viewed station/train available offline automatically.
- **Version invalidation:** on app launch, after fetching `meta.json`, compare its
  `version` with the value stored in `localStorage` (`tt-version`). If different,
  delete the `timetable-data` and `timetable-index` caches (via the Cache Storage API)
  and store the new version, *before* rendering boards. This prevents serving a stale
  timetable forever after an upstream update. Implement as a tiny module with a unit
  test for the comparison logic.

### 7.2 Manifest and icons

- `name: "Mumbai Local Timetable"`, `short_name: "Local Trains"`,
  `display: "standalone"`, `theme_color`/`background_color` matching the app header,
  `start_url` and `scope` relative (`.` / `./`) so the subpath deployment works.
- Icons: generate `192x192`, `512x512`, and a maskable `512x512` PNG (simple train
  glyph or "ML" monogram on a solid background — no Mobond assets). Commit the icons;
  they are project assets, not timetable data.
- Document in the README: iOS install is Share → Add to Home Screen, and iOS may evict
  cached data after long inactivity — offline is best-effort there.

---

## 8. CI/CD (`.github/workflows/`)

### 8.1 `ci.yml` — on every push and PR

Steps: checkout → setup Node 22 (cache npm) → `npm ci` → `npm run lint` →
`npm run typecheck` (`tsc --noEmit`) → `npm test` → generate data (download zip, run
pipeline) → `npm run build`. This proves the whole chain on every change.

### 8.2 `deploy.yml` — production

Triggers: `schedule: cron '17 3 * * 1'` (weekly, Mondays ~08:47 IST — deliberately
off-the-hour) and `workflow_dispatch` (manual, for known timetable changes).

Steps:
1. Checkout; setup Node 22 and Python 3.12.
2. Fetch the currently deployed version:
   `curl -fs https://<user>.github.io/mumbai-local-timetable/data/meta.json`
   (tolerate 404 on the very first deploy → treat as version `none`).
3. Download `https://cdn.mobond.com/mi/mumbaidb.zip` to a temp dir; read `version.txt`.
4. **If versions match and the trigger is `schedule`, exit successfully without
   deploying.** (Manual `workflow_dispatch` always redeploys.)
5. Run the pipeline into `public/data` (§5.5) — validation gates (§5.4) run here;
   any failure fails the job and the live site keeps serving the previous timetable.
6. `npm ci && npm run build` (with `VITE_BASE` set for the repo name).
7. `actions/upload-pages-artifact` with `dist/`, then `actions/deploy-pages`.
   Required workflow permissions: `pages: write`, `id-token: write`.

The repo's Pages setting must be "GitHub Actions" (not branch deployment). Document
this one-time manual step in the README — an LLM cannot click it for the user.

---

## 9. What must NEVER be committed

Add to `.gitignore` and enforce in review:

- `mumbaidb.zip`, any `*.zip`, the APK/XAPK, `decoded_timetable/`, `*.csv` outputs,
  `public/data/`, `dist/`, `node_modules/`, `.env*`.
- Rationale (state it in the README): the repo publishes **code**; the timetable itself
  is generated fresh from the upstream source at deploy time. This keeps the repo small
  (the generated site is ~7 MB; the raw CSVs are 26 MB), gives every deployment a
  provenance trail (which zip version produced it), and respects the data's origin.
- One exception: `pipeline/decode_mumbaidb.py` and small test fixtures (a handful of
  rows, hand-written) are code — commit those.

---

## 10. Build order — small commits

Work on `main` (or short-lived branches per commit if preferred). Each commit below is
independently reviewable and leaves the tree working. **Run the listed Verify step and
show its output before committing.** Commit messages are given verbatim.

### Commit 1 — Repo scaffold and hygiene
- **Do:** `git init`; create `.gitignore` (§9), `LICENSE` (MIT, §11), `README.md`
  (title, one-paragraph description, disclaimer from §11 — features come later),
  copy this `BUILD_SPEC.md` in.
- **Verify:** `git status` shows only the intended files.
- **Message:** `chore: initialise repo with spec, license and gitignore`

### Commit 2 — Vite + React + TypeScript skeleton
- **Do:** `npm create vite@latest . -- --template react-ts` (merge with existing
  files); add scripts: `dev`, `build` (`tsc -b && vite build`), `preview`,
  `typecheck`, `lint`. Confirm `vite.config.ts` has the `base` handling from §6.4.
- **Verify:** `npm run dev` serves the default Vite page; `npm run build` succeeds.
- **Message:** `feat: scaffold Vite + React + TypeScript app`

### Commit 3 — Tailwind CSS v4
- **Do:** install `tailwindcss` + `@tailwindcss/vite`; wire the Vite plugin; add
  `@import "tailwindcss"` to the CSS entry; replace the demo page with a minimal
  mobile-first shell (header + placeholder text) using Tailwind classes incl. a
  `dark:` variant.
- **Verify:** `npm run build`; open the dev server — styles apply, dark mode toggles
  with the OS setting.
- **Message:** `feat: add Tailwind CSS v4 with dark-mode shell`

### Commit 4 — Decoder into the pipeline
- **Do:** copy the reference `decode_mumbaidb.py` verbatim into `pipeline/` (do not
  edit its logic; a header comment noting provenance is fine). Add
  `scripts/sample_data.sh` that decodes a local zip into a temp folder for dev use.
- **Verify:** `python3 pipeline/decode_mumbaidb.py <zip> /tmp/decoded` prints a report
  with `total_stop_rows: 104011` and `problems: []` for the reference zip (if no zip is
  available locally, download it to a **gitignored** temp path first — never into the
  repo tree).
- **Message:** `feat(pipeline): vendor proven mumbaidb decoder`

### Commit 5 — Data converter with validation
- **Do:** implement `pipeline/build_data.py` per §5.1–§5.5 (schemas, derivation rules,
  line display-name map, all six validation gates, golden test for train `90171`).
- **Verify:** run it against the reference zip into `public/data`; assert
  `meta.json` version `20260417`, ~448 departure files, ~5,714 train files, biggest
  departures file < 250 KB, golden test passes. Spot-check
  `public/data/departures/W/15.json` contains `90171` at `m: 499`, `pf: "6"`.
- **Message:** `feat(pipeline): convert decoded timetable to validated JSON shards`

### Commit 6 — TypeScript types and data layer
- **Do:** `src/lib/types.ts` + `src/lib/data.ts` (§6.2) with fetchers
  (`getMeta`, `getStations`, `getDepartures`, `getTrain`, `getTrainIndex`) that build
  URLs from `import.meta.env.BASE_URL + 'data/…'` and validate response shapes
  minimally (throw on non-OK). Add `src/lib/format.ts` (title-case with an exceptions
  list for e.g. `CSMT` → keep "CSMT", `DIVA JN` → "Diva Jn"; pattern normaliser §2.3.6;
  platform formatter §2.3.7).
- **Verify:** `npm run typecheck` clean; a temporary dev page (or console check)
  fetches `stations.json` and logs 20 lines. Remove the temporary page before commit.
- **Message:** `feat: add typed data layer for timetable JSON`

### Commit 7 — Time utilities + first unit tests
- **Do:** install `vitest`; implement `src/lib/time.ts` (§6.3) and tests: IST conversion
  from a known UTC instant, `formatMinutes(499) === "08:19"`, relative labels,
  midnight boundary (23:59 → 00:02 next-day handling). Add `npm test` script.
- **Verify:** `npm test` green.
- **Message:** `feat: add IST time utilities with tests`

### Commit 8 — Home page: line/station pickers + train search
- **Do:** React Router setup (§6.4) with the three routes; `Home.tsx` with
  `LinePicker`, `StationPicker` (incl. cross-line station search), train-number
  search; last-station shortcut from `localStorage`. Board/train pages may be
  placeholders at this commit.
- **Verify:** dev server — pick Western → Andheri and Central → Dadar; search `90171`;
  navigation URLs are correct. `npm run typecheck` clean.
- **Message:** `feat: home page with line/station pickers and train search`

### Commit 9 — Station departure board
- **Do:** `StationBoard.tsx` + `DepartureRow` + `NoteChips` implementing §6.1 fully
  (next-trains logic, full-day toggle, direction filter with headerA/headerB labels,
  next-day tail, 30 s relative-time refresh, loading/error/offline states).
- **Verify:** with dev data — at any IST time, Andheri (W/15) shows upcoming trains in
  order; direction filter splits correctly; `90171` appears at 08:19 PF 6 before
  08:19 IST (mock the clock in a test or temporarily offset `now` to check). Add a
  unit test for the next-trains + next-day-tail logic.
- **Message:** `feat: station departure board with next-train logic`

### Commit 10 — Train detail view
- **Do:** `TrainDetail.tsx` per §6.1 (header, ordered stops, `?from=` highlight,
  per-stop board links, numberless-train header treatment).
- **Verify:** `90171` detail matches the §5.3 golden run exactly; a metro train
  (pick any `MM1WD` service from a station board) renders without a number and
  without errors.
- **Message:** `feat: train detail view with stop-by-stop run`

### Commit 11 — Routing fallback and production build polish
- **Do:** `postbuild` copy `index.html` → `404.html`; verify `VITE_BASE` handling;
  add `<meta name="theme-color">`, page `<title>`, favicon (project-generated).
- **Verify:** `npm run build` → serve `dist/` statically → hard-refresh
  `/station/W/15` and `/train/W/108` deep links — both render the app (not a 404).
- **Message:** `fix: GitHub Pages SPA fallback and build polish`

### Commit 12 — PWA: manifest, icons, service worker
- **Do:** install/configure `vite-plugin-pwa` per §7 (prompt updates, precache shell
  only, runtime caches as specified); generate and commit icons; `UpdatePrompt`
  component; version-invalidation module (§7.1) + unit test.
- **Verify:** production build → Lighthouse (or manual devtools check): installable,
  service worker active; load a station online, go offline (devtools), reload —
  board renders from cache with the offline notice; bump `meta.json` version in a
  local test and confirm caches purge.
- **Message:** `feat: installable PWA with version-aware offline cache`

### Commit 13 — CI workflow
- **Do:** `.github/workflows/ci.yml` per §8.1 (including running the data pipeline
  so data-shape regressions fail CI).
- **Verify:** push and watch the Actions run go green (or `act`-style local dry run
  of the same commands if Actions is unavailable). All steps pass from a clean
  checkout.
- **Message:** `ci: lint, typecheck, test, data pipeline and build on push`

### Commit 14 — Deploy workflow
- **Do:** `.github/workflows/deploy.yml` per §8.2 (version comparison, gated deploy,
  Pages artifact). README: add the one-time "Settings → Pages → Source: GitHub
  Actions" instruction, local dev instructions, and how updates work.
- **Verify:** manual `workflow_dispatch` run deploys successfully; the live URL
  serves the app and `data/meta.json`; a second scheduled-style run with no upstream
  change exits early (check the job log). Hard-refresh a deep link on the live site.
- **Message:** `ci: scheduled auto-update and GitHub Pages deploy`

### Commit 15 — README, disclaimer and final polish
- **Do:** complete the README (screenshots optional), methodology section (how the
  timetable was decoded, link to the decoder), limitations (§11), contributing note.
  Final accessibility pass (§6.5) and empty-state copy review.
- **Verify:** fresh-clone walkthrough: follow the README from zero to a running dev
  server without any undocumented step.
- **Message:** `docs: complete README with methodology and limitations`

> **Total: 15 commits.** Do not squash them during development; the history is the
> project's documentation. (The repo owner may squash on merge of PRs if desired.)

---

## 11. Legal, attribution and limitations (include in README verbatim-ish)

- This is an **unofficial, independent, research/educational project**, not affiliated
  with Mobond, m-Indicator, Western Railway, Central Railway, or any operator.
- The timetable data originates from Mobond's published `mumbaidb.zip` (itself a
  compilation of official railway timetables). Train times are factual data; the
  *compilation* is Mobond's work. The code in this repo is MIT-licensed; **no licence
  is claimed over the timetable data itself.** If you are the rights holder and want
  this changed or removed, open an issue — it will be honoured promptly.
- Accuracy limits: times are schedule data from the source zip's version (shown in the
  app footer); day-of-week validity exists only as free-text notes in the source
  (§2.3.2) and is displayed, not computed; there is no live disruption info in v1.
- The source zip, decoded CSVs and generated JSON are deliberately not stored in this
  repository (§9); every deployment regenerates them from upstream.

---

## 12. Future work (designed for, not built in v1)

1. **Favourites & recents** — `localStorage`-backed pinned stations/trains on Home.
   Remember: `train_seq` is only stable within a timetable version (§5.2) — store
   train number where available and re-resolve.
2. **Full-offline pack** — a Settings button that fetches all 448 departure files
   (+ optionally train files for favourited trains) into the existing
   `timetable-data` cache, with progress UI. Same plumbing as §7; mostly a UX task.
3. **Live running status** — a Cloudflare Worker (free tier) proxying
   `https://mobond.com/mtracker/getalllivetrains` and `…/getlivetraininfo?tn=`,
   adding `Access-Control-Allow-Origin: *` and a 20–30 s edge cache (never hammer
   Mobond faster than that). Frontend: a `LIVE_API_BASE` config (empty = disabled),
   TanStack Query polling every 30 s, overlaying live strings onto board rows by
   train number, and surfacing `<number>_i` announcement entries (Cancelled,
   Short-Terminated, pattern changes) as banners on the train detail. Full API
   contract is in `API_DOCUMENTATION.md`. Numberless metro trains have no live data —
   hide the UI for them.
4. **Nearest station** — the source zip also ships `local/all_stations_lat_lon.csv`
   (162 stations with coordinates — partial coverage). A "near me" feature is possible
   but must degrade gracefully for the ~90 stations without coordinates.
5. **Go binary wrapper** — the built `dist/` can be embedded (`embed.FS`) into a Go
   binary with a static server and a native live-proxy, distributed via GitHub
   Releases for fully self-hosted/offline use. Optional; the web app stands alone.

---

## 12A. v2 redesign (implemented after v1)

The v2 UI is station-first and modelled on the physical flow of a timetable board,
while remaining an independent implementation with no Mobond branding or assets:

- **Unified station identity.** Stations with the same name across lines are one
  place (e.g. Andheri = Western + Harbour + Metro 1). Weekday/weekend variants
  (`MM1WD/MM1WE`, `MM3WD/MM3WE`, `MONO1/MONO1WE`) collapse to one displayed line,
  using the IST weekend variant on Saturday/Sunday.
- **Direction clusters.** A board is station + terminal cluster, not one line
  only. `CHURCHGATE` and `CSMT` are merged as the `SOUTH` cluster because both are
  southbound termini from shared stations; other clusters use the primary header
  terminal. Duplicate departures for the same numbered train/time/destination are
  removed when a service appears in more than one line file.
- **Terminating trains are excluded from departure boards.** A departure whose
  final destination equals the current station is an arrival, not a departure
  for this board.
- **Two distinct user filters, never conflated.** *Originating from* uses the
  train journey's origin; *Terminating at* uses the train journey's final
  destination. These are independent filters and must never be inferred from a
  single generic destination input.
- **Favourite routes** are stored in `localStorage` as station + direction cluster
  only (never `train_seq`). A board remembers the last unified station.
- **Live-ready, not live.** The board has a reserved live-status slot, but no live
  data is fetched until a permissive proxy such as the Cloudflare Worker in §12.3
  exists. Social/chat/crowd features from any other app are out of scope.

---

## 13. Definition of done (v1)

- [ ] All 15 commits in §10 exist, each with its Verify step demonstrably run.
- [ ] Live GitHub Pages URL serves the app; deep links survive refresh.
- [ ] Station board and train detail work for railway **and** metro lines,
      including numberless trains.
- [ ] App installs as a PWA on Android Chrome and iOS Safari; viewed stations work
      offline; a timetable version bump purges stale caches.
- [ ] A manual workflow run deploys; a scheduled run with no upstream change is a
      no-op; a corrupt-zip run (simulated) fails without touching the live site.
- [ ] No timetable data, zip, or CSV exists anywhere in `git log --all --name-only`.
- [ ] README contains the §11 disclaimer and the one-time Pages setup step.

---

*Spec written 24 Oct 2026 against timetable version `20260417` and m-Indicator
v18.0.369. If upstream facts change, update this document in the same commit as the
code that adapts to them.*
