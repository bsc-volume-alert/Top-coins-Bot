#!/usr/bin/env bash
# coin scope 0.4.2: after a lookup, publish the last 3 lookups to the repo's `scope-data` branch (force-pushed, one commit), so the chat can check them
# against the chain within a minute — independent of the slow 4-hourly data push. Read-only on everything else.
set -u
D=/root/tracker-scope-data; SRC=${SCOPE_DUMP_DIR:-/root/tracker/data/scope_last}
[ -d "$SRC" ] || exit 0
if [ ! -d "$D/.git" ]; then mkdir -p "$D"; git -C "$D" init -q; git -C "$D" remote add origin https://github.com/bsc-volume-alert/Top-coins-Bot.git; fi
cd "$D" || exit 1
git checkout -q --orphan sd-new 2>/dev/null || git checkout -q --orphan "sd-$$" 2>/dev/null || true
git rm -rfq --cached . 2>/dev/null || true; rm -rf scope; mkdir -p scope
ls -t "$SRC"/*.json 2>/dev/null | head -3 | while read f; do cp -f "$f" scope/; done
date -u +%FT%TZ > scope/pushed_at.txt
git add -A scope
git -c user.name=scope -c user.email=scope@tracker commit -q -m "scope lookups $(date -u +%FT%TZ)" || exit 0
git branch -q -M scope-data
timeout 60 git push -q -f origin scope-data && echo "[scope-dump] pushed"
