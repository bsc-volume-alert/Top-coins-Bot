#!/usr/bin/env bash
# launcher 0.1.0: publish the launcher's export (launches.csv, posts.csv, the first raw stream events, status.json — public wallet address only, never a key)
# to the repo's `launcher-data` branch — force-pushed, one commit — so the chat can check every launch. Read-only on everything else.
set -u
D=/root/tracker-launcher-data; SRC=${LAUNCH_OUT:-/root/tracker/data/launcher_out}
[ -d "$SRC" ] || exit 0
if [ ! -d "$D/.git" ]; then mkdir -p "$D"; git -C "$D" init -q; git -C "$D" remote add origin https://github.com/bsc-volume-alert/Top-coins-Bot.git; fi
cd "$D" || exit 1
git checkout -q --orphan ld-new 2>/dev/null || git checkout -q --orphan "ld-$$" 2>/dev/null || true
git rm -rfq --cached . 2>/dev/null || true; rm -rf launcher; mkdir -p launcher
cp -f "$SRC"/* launcher/ 2>/dev/null || true
date -u +%FT%TZ > launcher/pushed_at.txt
git add -A launcher
git -c user.name=launcher -c user.email=launcher@tracker commit -q -m "launcher data $(date -u +%FT%TZ)" || exit 0
git branch -q -M launcher-data
timeout 120 git push -q -f origin launcher-data && echo "[launcher] pushed"
