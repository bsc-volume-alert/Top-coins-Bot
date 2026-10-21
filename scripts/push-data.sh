#!/usr/bin/env bash
# v0.18.114 — every 4 hours (cron): publish the A–D data set and the executor's book to the repo's `data` branch, so the scheduled
# study (which runs in Claude's cloud workspace and cannot reach this box) can read it. Read-only on the bot; never touches /root/tracker's checkout.
# v0.18.119: + launches.csv (every launch of the last 24 h, Project S base rates) and wallets.csv (our wallet leaderboard). The branch is
# rewritten as a single commit each time (force-pushed): the files are complete snapshots, and keeping 10 MB of launches six times a day would
# swell the repo by ~1 GB a month. The study keeps its own copy of what it analysed in reports/history.
set -u
D=/root/tracker-data; T=/root/tracker; E=/root/executor
KEY=$(grep -E '^WEB_KEY=' $T/.env | cut -d= -f2- | tr -d '"'); PORT=$(grep -E '^WEB_PORT=' $T/.env | cut -d= -f2- | tr -d '"'); PORT=${PORT:-8787}
[ -z "$KEY" ] && { echo "[push-data] WEB_KEY not set"; exit 1; }
if [ ! -d "$D/.git" ]; then mkdir -p "$D"; git -C "$D" init -q; git -C "$D" remote add origin https://github.com/bsc-volume-alert/Top-coins-Bot.git; fi
cd "$D" || exit 1
git checkout -q --orphan data-new 2>/dev/null || { git checkout -q --orphan data-new-$$ 2>/dev/null || true; }
git rm -rfq --cached . 2>/dev/null || true
mkdir -p data
curl -s -m 120 "http://127.0.0.1:${PORT}/api/p5data?key=${KEY}" -o data/abcd.csv || { echo "[push-data] csv fetch failed"; exit 1; }
[ "$(wc -c < data/abcd.csv)" -lt 200 ] && { echo "[push-data] csv too small: $(head -c 200 data/abcd.csv)"; exit 1; }
(cd "$T" && nice -n 19 node scripts/dump-live.cjs) > data/executor.json 2>/tmp/dump-live.err || { echo "[push-data] executor dump failed: $(head -c 300 /tmp/dump-live.err)"; }
cp -f "$E/status.json" data/status.json 2>/dev/null || true
(cd "$T" && HOURS=24 nice -n 19 ionice -c 3 node scripts/dump-launches.cjs launches) > data/launches.csv 2>/tmp/dump-launches.err || { echo "[push-data] launches dump failed: $(head -c 300 /tmp/dump-launches.err)"; }
(cd "$T" && nice -n 19 ionice -c 3 node scripts/dump-launches.cjs wallets) > data/wallets.csv 2>/tmp/dump-wallets.err || { echo "[push-data] wallets dump failed: $(head -c 300 /tmp/dump-wallets.err)"; }
(cd "$T" && nice -n 19 node scripts/dump-launches.cjs smart) > data/smart_wallets.csv 2>/dev/null || true
(cd "$T" && nice -n 19 ionice -c 3 node scripts/dump-launches.cjs others) > data/others.csv 2>/tmp/dump-others.err || { echo "[push-data] others dump failed: $(head -c 300 /tmp/dump-others.err)"; } # v0.18.148: the paper strategies the website no longer shows
[ -f "$T/data/revival_klines.jsonl.gz" ] && cp -f "$T/data/revival_klines.jsonl.gz" data/revival_klines.jsonl.gz # v0.18.154: the revival back-test candles (one-off job)
FP=$(grep -E '^FOMO_PORT=' $T/.env | cut -d= -f2- | tr -d '"'); FP=${FP:-8789} # v0.18.179: the fomo watcher's data (7 days) — hourly flow per coin, paper trades, theses
for f in flow_hourly trades theses; do curl -s -m 60 "http://127.0.0.1:${FP}/api/csv/${f}?days=7" -o data/fomo_${f}.csv || echo "[push-data] fomo ${f} fetch failed"; done
[ -f "$T/data/fomo_finds.json" ] && cp -f "$T/data/fomo_finds.json" data/fomo_finds.json; [ -f "$T/data/fomo_finds.log" ] && tail -c 4000 "$T/data/fomo_finds.log" > data/fomo_finds_log.txt
[ -f "$T/data/fomo_following.csv" ] && cp -f "$T/data/fomo_following.csv" data/fomo_following.csv; [ -f "$T/data/fomo_import.log" ] && tail -c 3000 "$T/data/fomo_import.log" > data/fomo_import_log.txt; curl -s -m 30 "http://127.0.0.1:${FP}/api/status" -o data/fomo_status.json || true
[ -f "$T/data/job.log" ] && tail -c 4000 "$T/data/job.log" > data/job_log.txt
date -u +%FT%TZ > data/pushed_at.txt
git add -A data
git -c user.name=droplet -c user.email=droplet@tracker commit -q -m "data $(date -u +%FT%TZ): $(($(wc -l < data/abcd.csv) - 1)) triggers, $(($(wc -l < data/launches.csv 2>/dev/null || echo 1) - 1)) launches" || { echo "[push-data] nothing new"; exit 0; }
git branch -q -M data
git push -q -f origin data && echo "[push-data] pushed $(date -u +%FT%TZ)"
