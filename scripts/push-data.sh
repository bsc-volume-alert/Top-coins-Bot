#!/usr/bin/env bash
# v0.18.114 — every 4 hours (cron): publish the A–D data set and the executor's book to the repo's `data` branch, so the scheduled
# study (which runs in Claude's cloud workspace and cannot reach this box) can read it. Read-only on the bot; never touches /root/tracker's checkout.
set -u
D=/root/tracker-data; T=/root/tracker; E=/root/executor
KEY=$(grep -E '^WEB_KEY=' $T/.env | cut -d= -f2- | tr -d '"'); PORT=$(grep -E '^WEB_PORT=' $T/.env | cut -d= -f2- | tr -d '"'); PORT=${PORT:-8787}
[ -z "$KEY" ] && { echo "[push-data] WEB_KEY not set"; exit 1; }
if [ ! -d "$D/.git" ]; then mkdir -p "$D"; git -C "$D" init -q; git -C "$D" remote add origin https://github.com/bsc-volume-alert/Top-coins-Bot.git; fi
cd "$D" || exit 1
if git fetch -q origin data 2>/dev/null; then git checkout -q -B data FETCH_HEAD; else git checkout -q --orphan data 2>/dev/null || true; fi
mkdir -p data
curl -s -m 120 "http://127.0.0.1:${PORT}/api/p5data?key=${KEY}" -o data/abcd.csv || { echo "[push-data] csv fetch failed"; exit 1; }
[ "$(wc -c < data/abcd.csv)" -lt 200 ] && { echo "[push-data] csv too small: $(head -c 200 data/abcd.csv)"; exit 1; }
(cd "$T" && node scripts/dump-live.cjs) > data/executor.json 2>/tmp/dump-live.err || { echo "[push-data] executor dump failed: $(head -c 300 /tmp/dump-live.err)"; }
cp -f "$E/status.json" data/status.json 2>/dev/null || true
date -u +%FT%TZ > data/pushed_at.txt
git add -A
git -c user.name=droplet -c user.email=droplet@tracker commit -q -m "data $(date -u +%FT%TZ): $(($(wc -l < data/abcd.csv) - 1)) triggers" || { echo "[push-data] nothing new"; exit 0; }
git push -q origin data && echo "[push-data] pushed $(date -u +%FT%TZ)"
