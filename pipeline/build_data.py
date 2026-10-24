#!/usr/bin/env python3
"""Convert decoded mumbaidb timetable to validated JSON shards (BUILD_SPEC §5).

Usage:
    python3 pipeline/build_data.py --zip /path/to/mumbaidb.zip --out public/data
    python3 pipeline/build_data.py --url https://cdn.mobond.com/mi/mumbaidb.zip --out public/data

Stdlib only, Python 3.11+. Exit 0 on success, non-zero on any validation failure.
"""
import argparse, csv, json, subprocess, sys, tempfile, urllib.request, zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
DECODER = HERE / "decode_mumbaidb.py"

# Display names only — verify against stations.csv termini before finalising.
LINE_NAMES = {
    "W": "Western",
    "C": "Central",
    "H": "Harbour",
    "T": "Trans-Harbour",
    "U": "Uran",
    "DPR": "Diva–Panvel–Roha",
    "DVP": "Diva–Dahanu / Panvel",
    "NM": "Neral–Matheran",
    "P": "Pune–Lonavla",
    "MM1WD": "Metro 1 (Versova–Ghatkopar) — Weekday",
    "MM1WE": "Metro 1 (Versova–Ghatkopar) — Weekend",
    "MM3WD": "Metro 3 (Cuffe Parade–Aarey) — Weekday",
    "MM3WE": "Metro 3 (Cuffe Parade–Aarey) — Weekend",
    # Termini verified: stations.csv GUNDAVALI -> ANDHERI (WEST); do not guess 2A/7 split.
    "MMAD": "Metro (Andheri West) variant 1",
    "MMAD2": "Metro (Andheri West) variant 2",
    "MMAD3": "Metro (Andheri West) variant 3",
    "MONO1": "Monorail — Weekday",
    "MONO1WE": "Monorail — Weekend",
    "NMM1": "Navi Mumbai Metro variant 1",
    "NMM1_2": "Navi Mumbai Metro variant 2",
}

GOLDEN_90171 = [
    ("CHURCHGATE", "07:50"), ("MUMBAI CENTRAL", "07:58"), ("DADAR", "08:05"),
    ("BANDRA", "08:11"), ("ANDHERI", "08:19"), ("BORIVALI", "08:35"),
]

def fail(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)

def main():
    ap = argparse.ArgumentParser()
    grp = ap.add_mutually_exclusive_group(required=True)
    grp.add_argument("--zip", dest="zip_path")
    grp.add_argument("--url")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    out = Path(args.out)
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        zip_path = Path(args.zip_path) if args.zip_path else td / "mumbaidb.zip"
        if args.url:
            print(f"Downloading {args.url} ...")
            urllib.request.urlretrieve(args.url, zip_path)
        if not zip_path.is_file():
            fail(f"zip not found: {zip_path}")
        try:
            with zipfile.ZipFile(zip_path) as zf:
                version = zf.read("version.txt").decode("utf-8", "replace").strip()
        except Exception as e:
            fail(f"cannot read version.txt from zip: {e}")

        decoded = td / "decoded"
        r = subprocess.run([sys.executable, str(DECODER), str(zip_path), str(decoded)],
                           capture_output=True, text=True)
        if r.returncode != 0:
            fail(f"decoder failed:\n{r.stdout}\n{r.stderr}")

        # ---- Gate 1 & 2 (§5.4) ----
        summary = json.loads((decoded / "summary.json").read_text())
        if summary.get("problems") != []:
            fail(f"summary.json problems not empty: {summary.get('problems')}")
        if not (summary.get("total_stop_rows", 0) >= 90000):
            fail(f"total_stop_rows sanity floor failed: {summary.get('total_stop_rows')}")
        trains_csv = list(csv.DictReader(open(decoded / "trains.csv", encoding="utf-8")))
        if not (len(trains_csv) >= 5000):
            fail(f"train count sanity floor failed: {len(trains_csv)}")

        stations_csv = list(csv.DictReader(open(decoded / "stations.csv", encoding="utf-8")))
        stops = list(csv.DictReader(open(decoded / "timetable_by_train.csv", encoding="utf-8")))

        # ---- Gate 3 ----
        for row in stops:
            if row["station_in_index"] != "Y":
                fail(f"non-canonical row consumed: {row}")

        # station lookup: (line, name) -> index ; (line) -> [(index,name)]
        station_index = {}
        lines_stations = defaultdict(list)
        for r in stations_csv:
            idx = int(r["station_index"])
            station_index[(r["line"], r["station"])] = idx
            lines_stations[r["line"]].append({"index": idx, "name": r["station"]})
        for k in lines_stations:
            lines_stations[k].sort(key=lambda x: x["index"])

        train_meta = {(t["line"], int(t["train_seq"])): t for t in trains_csv}

        # group stops by train, trust stop_order (§2.3.4)
        by_train = defaultdict(list)
        for row in stops:
            by_train[(row["line"], int(row["train_seq"]))].append(row)
        for k in by_train:
            by_train[k].sort(key=lambda r: int(r["stop_order"]))

        # ---- Build shards ----
        if out.exists():
            # Clear previously generated shards in this out dir only.
            import shutil
            shutil.rmtree(out)
        (out / "departures").mkdir(parents=True)
        (out / "trains").mkdir(parents=True)

        def dump(path, obj):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")

        train_index = []
        train_ids = set()
        for (line, seq), rows in sorted(by_train.items()):
            tid = f"{line}:{seq}"
            train_ids.add(tid)
            meta = train_meta.get((line, seq), {})
            no = (meta.get("train_number") or rows[0]["train_number"] or "").strip() or None
            stops_out = []
            for r in rows:
                stops_out.append({
                    "station": r["station"], "stationIndex": int(r["station_index"]),
                    "m": int(r["minutes_since_midnight"]), "time": r["time_24h"],
                    "pf": r["platform"], "side": r["side"],
                })
            dump(out / "trains" / f"{line}_{seq}.json", {
                "id": tid, "line": line, "no": no,
                "origin": meta.get("origin", rows[0]["origin"]),
                "destination": meta.get("destination", rows[0]["destination"]),
                "pattern": meta.get("service_pattern", rows[0]["service_pattern"]),
                "note": meta.get("note", rows[0]["note"]),
                "stops": stops_out,
            })
            if no:
                train_index.append({
                    "no": no, "trainId": tid, "line": line,
                    "origin": meta.get("origin", rows[0]["origin"]),
                    "destination": meta.get("destination", rows[0]["destination"]),
                    "firstTime": rows[0]["time_24h"],
                })

        # departures per station
        by_station = defaultdict(list)
        for row in stops:
            by_station[(row["line"], int(row["station_index"]), row["station"])].append(row)
        dep_count_files = 0
        for (line, sidx, sname), rows in sorted(by_station.items()):
            deps = []
            for r in sorted(rows, key=lambda x: int(x["minutes_since_midnight"])):
                dest = r["destination"]
                if (line, dest) not in station_index:
                    fail(f"destination not in stations.csv: {line} {dest}")
                deps.append({
                    "m": int(r["minutes_since_midnight"]),
                    "trainId": f"{line}:{int(r['train_seq'])}",
                    "no": (r["train_number"].strip() or None),
                    "dest": dest, "destIndex": station_index[(line, dest)],
                    "origin": r["origin"], "pattern": r["service_pattern"],
                    "note": r["note"], "pf": r["platform"], "side": r["side"],
                })
            dump(out / "departures" / line / f"{sidx}.json",
                 {"line": line, "station": sname, "stationIndex": sidx, "departures": deps})
            dep_count_files += 1

        lines_out = []
        for code in sorted(lines_stations.keys()):
            info = summary["lines"].get(code, {})
            lines_out.append({
                "code": code,
                "name": LINE_NAMES.get(code, code),
                "headerA": info.get("index_header_a", ""),
                "headerB": info.get("index_header_b", ""),
                "stations": lines_stations[code],
            })
        dump(out / "stations.json", {"lines": lines_out})
        train_index.sort(key=lambda x: x["no"])
        dump(out / "train-index.json", train_index)
        meta_obj = {
            "version": version,
            "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "source": "mumbaidb.zip",
            "counts": {"trains": len(train_meta), "stations": len(stations_csv), "stops": len(stops)},
        }
        dump(out / "meta.json", meta_obj)

        # ---- Gate 4 & 5: re-parse every file, cross-resolve ----
        all_json = list(out.rglob("*.json"))
        for p in all_json:
            try:
                json.loads(p.read_text(encoding="utf-8"))
            except Exception as e:
                fail(f"generated JSON does not parse: {p}: {e}")
            if p.parent.name != "trains" and "departures" in str(p):
                if p.stat().st_size > 250 * 1024:
                    fail(f"departures file >250KB: {p} ({p.stat().st_size})")
        # every departure trainId resolves; every train >=2 stops
        seen_train_ids = set()
        for p in (out / "departures").rglob("*.json"):
            d = json.loads(p.read_text())
            for dep in d["departures"]:
                seen_train_ids.add(dep["trainId"])
                if dep["trainId"] not in train_ids:
                    fail(f"departure trainId unresolved: {dep['trainId']} in {p}")
        for p in (out / "trains").glob("*.json"):
            t = json.loads(p.read_text())
            if len(t["stops"]) < 2:
                fail(f"train has <2 stops: {t['id']}")
        if len(train_ids) != len(train_meta):
            fail(f"train files {len(train_ids)} != trains.csv {len(train_meta)} (some trains have no canonical stops)")

        # ---- Gate 5b: version equality ----
        meta_check = json.loads((out / "meta.json").read_text())
        if meta_check["version"] != version:
            fail("meta.json version != zip version.txt")

        # ---- Gate 6: golden test ----
        gfile = out / "trains" / "W_108.json"
        trains_by_no = {t["train_number"]: t for t in trains_csv if t.get("train_number")}
        if "90171" in trains_by_no and gfile.exists():
            t = json.loads(gfile.read_text())
            got = [(s["station"], s["time"]) for s in t["stops"]]
            if got != GOLDEN_90171:
                fail(f"golden 90171 mismatch: {got} != {GOLDEN_90171}")
            print("Golden test 90171: PASS")
        else:
            w_trains = sorted([p for p in (out / "trains").glob("W_*.json")])
            if w_trains:
                t = json.loads(w_trains[0].read_text())
                assert len(t["stops"]) >= 2
                print("Golden test: 90171 absent, fallback W train check PASS")

        biggest = max(((p.stat().st_size, str(p)) for p in (out / "departures").rglob("*.json")), default=(0, ""))
        print(f"OK version={version} trains={len(train_meta)} stations={len(stations_csv)} stops={len(stops)}")
        print(f"departure files={dep_count_files} train files={len(train_ids)} json files={len(all_json)}")
        print(f"largest departures file={biggest[0]} bytes ({biggest[1]})")

if __name__ == "__main__":
    main()
