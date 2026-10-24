#!/usr/bin/env python3
"""
Decode m-Indicator's mumbaidb.zip local-train timetable.

Format reverse-engineered from the APK (com.mobond.mindicator 18.0.369):
  - index parser ......... pa.h.k   (big-endian, see parse_index)
  - station record parser  pa.h.e   (4-byte records, see decode_record)
  - zip-vs-assets resolver ra.d.p   (app reads entries straight out of
                                     filesDir/mumbaidb.zip; it never
                                     unpacks the zip into a database)

Usage:
    python3 decode_mumbaidb.py [mumbaidb.zip | extracted_dir] [out_dir]

Defaults: mumbaidb.zip next to this script, output in ./decoded_timetable/
Outputs:
    timetable_all.csv       one row per (line, station, train stop)
    timetable_by_train.csv  same stops grouped/ordered train-by-train
    trains.csv              one row per train definition in each index
    stations.csv            station list per line (in index order)
    summary.json            counts + validation report
"""
import csv, json, os, struct, sys, zipfile
from collections import Counter, defaultdict

def u32(d, o): return struct.unpack_from('>I', d, o)[0]
def u16(d, o): return struct.unpack_from('>H', d, o)[0]

# ---------- index (pa.h.k) ----------
def parse_index(data: bytes):
    o = 0
    n = u32(data, o); o += 4
    stations = data[o:o+n].decode('utf-8', 'replace').split(','); o += n
    n = data[o]; o += 1
    hdr_a = data[o:o+n].decode('utf-8', 'replace'); o += n      # pa.f.g (e.g. CHURCHGATE)
    n = data[o]; o += 1
    hdr_b = data[o:o+n].decode('utf-8', 'replace'); o += n      # pa.f.h (e.g. VIRAR, DAHANU)

    block_len = u32(data, o); o += 4
    end = o + block_len
    trains = []  # pa.k: a=origin, b=destination, c=dest display, d=str3, e=str4(note), f=day byte
    while o < end:
        src, dst, day = u16(data, o), u16(data, o+2), data[o+4]
        ln = data[o+5]; o += 6
        str3 = data[o:o+ln].decode('utf-8', 'replace'); o += ln
        ln = data[o]; o += 1
        str4 = data[o:o+ln].decode('utf-8', 'replace'); o += ln
        # NOTE: the byte at +4 is NOT a day code. Across all 5714 trains it is
        # 100% correlated with travel direction: 1/3 = towards lower station
        # index, 2/4 = towards higher station index (3/4 = rare variant, 9 each).
        # pa.h.z/x filter on it when the user picks a destination direction.
        # Day validity ("Not on Sunday" etc.) lives only in the free-text note.
        trains.append(dict(origin_idx=src, destination_idx=dst, direction_code=day,
                           service_pattern=str3, note=str4))

    overrides = {}  # pa.f.j: hex(first 3 record bytes) -> pa.d(platform_str, b_str)
    if o < len(data):
        n = u32(data, o); o += 4
        txt = data[o:o+n].decode('utf-8', 'replace'); o += n
        parts = txt.split(',') if txt else []
        for i in range(0, len(parts) - 2, 3):
            overrides[parts[i]] = (parts[i+1], parts[i+2])

    train_numbers = {}  # pa.f.k: train seq (1-based) -> official train no. e.g. 90001
    if o < len(data):
        n = u32(data, o); o += 4
        txt = data[o:o+n].decode('utf-8', 'replace'); o += n
        for line in txt.split('\n'):
            if ',' in line:
                k, v = line.split(',', 1)
                try: train_numbers[int(k)] = v
                except ValueError: pass

    trailer = {}  # pa.f.l: 3-byte packed entries, key=(v>>12)&4095 -> v&4095 (purpose unlabelled)
    if o < len(data):
        n = u32(data, o); o += 4
        raw = data[o:o+n]; o += n
        for i in range(0, len(raw) - 2, 3):
            v = (raw[i] << 16) | (raw[i+1] << 8) | raw[i+2]
            trailer[(v >> 12) & 4095] = v & 4095

    return dict(stations=stations, hdr_a=hdr_a, hdr_b=hdr_b, trains=trains,
                overrides=overrides, train_numbers=train_numbers, trailer=trailer,
                bytes_consumed=o, file_size=len(data))

# Mobond ships BOTH spellings of some station files (e.g. C/AMBARNATH and
# C/AMBERNATH, H/SEAWOOD DARAVE and H/SEAWOOD DARAVE KARAVE). Only the index
# spelling is canonical: the app requests local/<line>/<station> using names
# from the index station list, and train destinations use that spelling.
# The other file is stale legacy data from an older DB revision (proved for
# AMBERNATH: under current train numbering its records are geographically
# impossible, e.g. CSMT->THANE train 97301 "stops" there 44 min after
# terminating at Thane). Decoder keeps those rows but flags them
# station_in_index='' so they never pollute per-train runs.

def dest_display(name: str) -> str:  # pa.k.b()
    return {'CHURCHGATE': 'CHG', 'BORIVALI': 'BO', 'VASAI ROAD': 'VASAI',
            'DAHANU ROAD': 'DAHANU'}.get(name, name.upper())

# ---------- station file records (pa.h.e) ----------
def decode_record(b: bytes):
    b0, b1, b2, b3 = b
    return dict(
        train_seq=(b2 & 0xFF) + ((b1 & 0x0F) << 8),          # 1-based into index trains[]
        minutes=((b0 & 0xFF) << 4) + ((b1 & 0xF0) >> 4),     # minutes since midnight
        platform_raw=(b3 >> 3) & 31,
        override_flag=(b3 & 4) == 4,
        side={1: 'L', 2: 'R', 3: 'B'}.get(b3 & 3, ''),
        side_code=b3 & 3,
        hexkey=''.join(f'{x:02X}' for x in b[:3]),            # ra.d.C(first 3 bytes)
    )

def hhmm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'mumbaidb.zip')
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), 'decoded_timetable')
    os.makedirs(out, exist_ok=True)

    # Read like the app does (ra.d.p): entries straight out of the zip, no unpacking.
    if os.path.isdir(src):
        read = lambda name: open(os.path.join(src, name), 'rb').read()
        names = []
        for root, _, files in os.walk(os.path.join(src, 'local')):
            for f in files:
                names.append(os.path.relpath(os.path.join(root, f), src).replace(os.sep, '/'))
    else:
        zf = zipfile.ZipFile(src)
        read = lambda name: zf.read(name)
        names = zf.namelist()

    lines = sorted({n.split('/')[1] for n in names
                    if n.startswith('local/') and n.count('/') >= 2 and not n.endswith('/')})
    version = ''
    try: version = read('version.txt').decode('utf-8', 'replace').strip()
    except Exception: pass

    report = dict(source=os.path.abspath(src), zip_version_txt=version, lines={},
                  total_stop_rows=0, problems=[])
    all_rows, train_rows, station_rows = [], [], []

    for line in lines:
        try:
            idx = parse_index(read(f'local/{line}/index'))
        except Exception as e:
            report['problems'].append(f'{line}: index parse failed: {e}')
            continue
        st = idx['stations']
        for i, s in enumerate(st):
            station_rows.append(dict(line=line, station_index=i, station=s))
        for seq, t in enumerate(idx['trains'], start=1):
            origin = st[t['origin_idx']] if t['origin_idx'] < len(st) else f"#{t['origin_idx']}"
            dest = st[t['destination_idx']] if t['destination_idx'] < len(st) else f"#{t['destination_idx']}"
            train_rows.append(dict(line=line, train_seq=seq,
                                   train_number=idx['train_numbers'].get(seq, ''),
                                   origin=origin, destination=dest,
                                   destination_display=dest_display(dest),
                                   direction_code=t['direction_code'],
                                   direction=('towards_higher_station_index' if t['destination_idx'] > t['origin_idx']
                                              else 'towards_lower_station_index' if t['destination_idx'] < t['origin_idx'] else ''),
                                   service_pattern=t['service_pattern'], note=t['note'],
                                   trailer_value=idx['trailer'].get(seq, '')))

        files = sorted(n.split('/')[2] for n in names
                       if n.startswith(f'local/{line}/') and n.count('/') == 2
                       and not n.endswith('/') and n.split('/')[2] != 'index'
                       and not n.split('/')[2].startswith('.'))  # skip .DS_Store junk
        n_stops = 0
        for fname in files:
            data = read(f'local/{line}/{fname}')
            if len(data) % 4:
                report['problems'].append(f'{line}/{fname}: size {len(data)} not multiple of 4')
            sidx = st.index(fname) if fname in st else ''
            for off in range(0, len(data) - 3, 4):
                r = decode_record(data[off:off+4])
                seq = r['train_seq']
                if not (1 <= seq <= len(idx['trains'])):
                    report['problems'].append(f'{line}/{fname}@{off}: train_seq {seq} out of range')
                    continue
                t = idx['trains'][seq - 1]
                origin = st[t['origin_idx']] if t['origin_idx'] < len(st) else ''
                dest = st[t['destination_idx']] if t['destination_idx'] < len(st) else ''
                plat = str(r['platform_raw']) if r['platform_raw'] else ''
                side = r['side']
                ov_plat = ov_b = ''
                if r['override_flag'] and r['hexkey'] in idx['overrides']:
                    ov_plat, ov_b = idx['overrides'][r['hexkey']]
                    plat = ov_plat
                    if not side: side = ov_b
                all_rows.append(dict(
                    line=line, station=fname, station_index=sidx,
                    station_in_index='Y' if sidx != '' else '',
                    time_24h=hhmm(r['minutes']), minutes_since_midnight=r['minutes'],
                    train_seq=seq, train_number=idx['train_numbers'].get(seq, ''),
                    origin=origin, destination=dest, destination_display=dest_display(dest),
                    direction_code=t['direction_code'],
                    direction=('towards_higher_station_index' if t['destination_idx'] > t['origin_idx']
                               else 'towards_lower_station_index' if t['destination_idx'] < t['origin_idx'] else ''),
                    service_pattern=t['service_pattern'], note=t['note'],
                    platform=plat, platform_raw=r['platform_raw'],
                    platform_override='Y' if r['override_flag'] else '',
                    override_platform=ov_plat, override_b=ov_b,
                    side=side, side_code=r['side_code'],
                    record_hex=data[off:off+4].hex().upper()))
                n_stops += 1
        report['lines'][line] = dict(stations=len(st), station_files=len(files),
                                     trains=len(idx['trains']), stop_rows=n_stops,
                                     index_header_a=idx['hdr_a'], index_header_b=idx['hdr_b'],
                                     platform_overrides=len(idx['overrides']),
                                     train_numbers=len(idx['train_numbers']),
                                     trailer_entries=len(idx['trailer']),
                                     index_bytes_consumed=idx['bytes_consumed'],
                                     index_file_size=idx['file_size'])
        report['total_stop_rows'] += n_stops

    # Train-by-train: order stops along the line direction (origin idx -> destination idx),
    # which is how pa.h.c reconstructs one train's full run.
    by_train = defaultdict(list)
    for r in all_rows:
        if r['station_in_index'] == 'Y':  # canonical stations only, like pa.h.c
            by_train[(r['line'], r['train_seq'])].append(r)
    ordered = []
    for (line, seq), rows_ in by_train.items():
        t = next(t for t in train_rows if t['line'] == line and t['train_seq'] == seq)
        oi = [s['station_index'] for s in station_rows if s['line'] == line and s['station'] == t['origin']]
        di = [s['station_index'] for s in station_rows if s['line'] == line and s['station'] == t['destination']]
        reverse = bool(oi and di and oi[0] > di[0])
        rows_.sort(key=lambda r: (r['station_index'] if isinstance(r['station_index'], int) else 999),
                   reverse=reverse)
        # Y-shaped lines (Harbour: Goregaon branch + Panvel branch share one
        # station list) cannot be ordered by index alone -- the 20 Goregaon->
        # Panvel trains prove it. Fall back to time order for those.
        ms = [r['minutes_since_midnight'] for r in rows_]
        if any(b < a for a, b in zip(ms, ms[1:])) and not (ms and ms[0] > 1200 and min(ms) < 200):
            rows_.sort(key=lambda r: r['minutes_since_midnight'])
        for i, r in enumerate(rows_, 1):
            ordered.append(dict(stop_order=i, **r))
    ordered.sort(key=lambda r: (r['line'], r['train_seq'], r['stop_order']))

    def dump(fn, rows):
        if not rows: return
        with open(os.path.join(out, fn), 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    dump('timetable_all.csv', sorted(all_rows, key=lambda r: (r['line'], r['station'], r['minutes_since_midnight'])))
    dump('timetable_by_train.csv', ordered)
    dump('trains.csv', train_rows)
    dump('stations.csv', station_rows)
    with open(os.path.join(out, 'summary.json'), 'w') as f:
        json.dump(report, f, indent=2)

    print(json.dumps(report, indent=2))
    print(f"\nWrote {len(all_rows)} stop rows, {len(train_rows)} trains, "
          f"{len(station_rows)} stations -> {out}")

if __name__ == '__main__':
    main()
