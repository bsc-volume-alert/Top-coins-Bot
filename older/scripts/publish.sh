#!/usr/bin/env bash
# Every 10 minutes: push the dashboard's data files (no keys) to the GitHub branch "older-data" so the run can be watched remotely.
HERE="$(cd "$(dirname "$0")/.." && pwd)"; OUT="${OLDER_OUT:-/mnt/volume_1794164707392/older}"; URL="$(git -C "$HERE" remote get-url origin)"
while true; do
  sleep 600
  [ -f "$OUT/pub/state.json" ] || continue
  if grep -rIlE 'api-key=[A-Za-z0-9]{8}|jup_[0-9a-f]{16}|X-APIKEY' "$OUT/pub" >/dev/null 2>&1; then echo "possible key in pub files - not publishing"; continue; fi
  T="$(mktemp -d)"; cp "$OUT"/pub/*.json "$T"/ 2>/dev/null; pm2 logs older --nostream --lines 30 2>/dev/null | sed -E 's/api-key=[A-Za-z0-9-]+/api-key=***/g; s/jup_[0-9a-f]+/jup_***/g' > "$T/log-tail.txt" || true
  ( cd "$T" && git init -q && git checkout -q -b older-data && git add . && git -c user.name="older-data" -c user.email="noreply@example.com" commit -q -m "older data $(date -u +%FT%TZ)" && git push -q -f "$URL" older-data ) >/dev/null 2>&1 && echo "published $(date -u +%T)" || echo "publish failed $(date -u +%T)"
  rm -rf "$T"
done
