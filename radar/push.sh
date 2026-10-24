#!/usr/bin/env bash
# radar 0.1.0: publish the radar's export (features.csv for every coin, the last 24 h of raw snapshots, the tracker's GMGN flag history, status)
# to the repo's `radar-data` branch — force-pushed, one commit — so the chat can analyse it. Read-only on everything else.
set -u
D=/root/tracker-radar-data; SRC=${RADAR_OUT:-/root/tracker/data/radar_out}
[ -d "$SRC" ] || exit 0
if [ ! -d "$D/.git" ]; then mkdir -p "$D"; git -C "$D" init -q; git -C "$D" remote add origin https://github.com/bsc-volume-alert/Top-coins-Bot.git; fi
cd "$D" || exit 1
git checkout -q --orphan rd-new 2>/dev/null || git checkout -q --orphan "rd-$$" 2>/dev/null || true
git rm -rfq --cached . 2>/dev/null || true; rm -rf radar; mkdir -p radar
cp -f "$SRC"/* radar/ 2>/dev/null || true
date -u +%FT%TZ > radar/pushed_at.txt
git add -A radar
git -c user.name=radar -c user.email=radar@tracker commit -q -m "radar data $(date -u +%FT%TZ)" || exit 0
git branch -q -M radar-data
timeout 120 git push -q -f origin radar-data && echo "[radar] pushed"
