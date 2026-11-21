#!/usr/bin/env bash
# Read-only technical validation on the server. PAPER ONLY — nothing here signs or sends a transaction, and no key is printed.
#   bash older/scripts/validate.sh [minutes=10]
# Writes results to $OLDER_OUT (default: the 100 GB volume) and publishes ONLY those result files to the GitHub branch
# "older-validation" so they can be reviewed. It does not touch the tracker, its database or its branch.
set -euo pipefail
MIN="${1:-10}"; HERE="$(cd "$(dirname "$0")/.." && pwd)"; cd "$HERE"
OUT="${OLDER_OUT:-/mnt/volume_1794164707392/older}"; mkdir -p "$OUT"; export OLDER_OUT="$OUT"
command -v node >/dev/null || { echo "node not found"; exit 1; }
[ -d node_modules ] || npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1
echo "[validate] 1/4 live feed for ${MIN} min (own database on the volume; port 8793)"
rm -f "$OUT"/older-validation.db*
OLDER_DB="$OUT/older-validation.db" INV_MAX_POOLS="${INV_MAX_POOLS:-60000}" OLDER_RUN_MINUTES="$MIN" node --max-old-space-size=900 src/main.mjs > "$OUT/run.log" 2>&1 || echo "[validate] run ended with an error — see run.log"
echo "[validate] 2/4 transaction evidence (120 recent PumpSwap transactions)"
node src/validate-tx.mjs 120 > "$OUT/tx-validation.json" 2> "$OUT/tx-validation.err" || true
echo "[validate] 3/4 GMGN (paced) and 4/4 Jupiter (keyless unless a key is set)"
node src/probe-gmgn.mjs > "$OUT/gmgn-probe.json" 2>/dev/null || true
node src/probe-jupiter.mjs > "$OUT/jupiter-probe.json" 2>/dev/null || true
tail -n 40 "$OUT/run.log" | sed -E 's/api-key=[A-Za-z0-9-]+/api-key=***/g' > "$OUT/run-tail.txt"
# publish the result files only
PUB="$(mktemp -d)"; cp "$OUT"/validation-run.json "$OUT"/tx-validation.json "$OUT"/gmgn-probe.json "$OUT"/jupiter-probe.json "$OUT"/run-tail.txt "$PUB"/ 2>/dev/null || true
if grep -rIlE 'api-key=[A-Za-z0-9]{8}|X-APIKEY' "$PUB" >/dev/null 2>&1; then echo "[validate] a result file looks like it contains a key — NOT publishing"; exit 1; fi
cd "$PUB" && git init -q && git checkout -q -b older-validation && git add . && git -c user.name="older-validation" -c user.email="noreply@example.com" commit -q -m "older validation results $(date -u +%FT%TZ)" \
  && git push -q -f "$(git -C "$HERE" remote get-url origin)" older-validation && echo "[validate] results published to branch older-validation" || echo "[validate] could not publish — results are in $OUT"
