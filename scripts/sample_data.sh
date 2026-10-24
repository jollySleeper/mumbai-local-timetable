#!/usr/bin/env bash
# Decode a local mumbaidb.zip into a temp folder for dev use.
# Usage: scripts/sample_data.sh [/path/to/mumbaidb.zip] [/tmp/decoded_timetable]
# If no zip is given, downloads it to a temp path (never into the repo tree).
set -euo pipefail

ZIP="${1:-}"
OUT="${2:-/tmp/decoded_timetable}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "$ZIP" ]; then
  ZIP="/tmp/mumbaidb.zip"
  if [ ! -f "$ZIP" ]; then
    echo "Downloading mumbaidb.zip to $ZIP (temp, gitignored)..."
    curl -fsSL "https://cdn.mobond.com/mi/mumbaidb.zip" -o "$ZIP"
  fi
fi

python3 "$ROOT/pipeline/decode_mumbaidb.py" "$ZIP" "$OUT"
echo "Decoded output in $OUT"
