#!/usr/bin/env bash
# repair-tracker-db.sh — 10 Nov 2026 (reliability; my 04:57 copy left the live tracker DB malformed). Tracker stopped under the maintenance lock;
# repair-merge.mjs adds the live DB's post-04:58:49 rows to the sound volume copy and checkpoints it; the damaged live DB is MOVED to the volume
# (kept as tracker.db.damaged-20261110, not deleted); the repaired DB is copied to the main disk (size + header check); tracker started; launcher + scope restarted.
set -u
V=$(findmnt -rn -o TARGET | grep -E '^/mnt/volume' | head -1); DB=/root/tracker/data/tracker.db; R="$V/tracker-db/tracker.db"
[ -L "$DB" ] && { echo "[repairdb] ABORT tracker.db is a symlink"; exit 1; }
touch /root/tracker/data/maint.lock; trap "rm -f /root/tracker/data/maint.lock" EXIT
T0=$(date -u +%H:%M:%S); pm2 stop tracker >/dev/null 2>&1; echo "[repairdb] tracker stopped $T0"
cd /root/tracker && node reports/tools/repair-merge.mjs "$DB" "$R" 1794286729 2>&1 | sed 's/^/[repairdb] /'
grep -q . /dev/null; [ -s "$R" ] && [ "$(head -c 15 "$R")" = "SQLite format 3" ] || { echo "[repairdb] ABORT repaired DB missing — restarting tracker on the live DB"; pm2 start tracker >/dev/null 2>&1; exit 1; }
mv "$DB" "$V/tracker-db/tracker.db.damaged-20261110" && for x in -wal -shm; do [ -f "$DB$x" ] && mv "$DB$x" "$V/tracker-db/tracker.db.damaged-20261110$x"; done; echo "[repairdb] damaged DB moved to the volume $(date -u +%H:%M:%S)"
cp -a "$R" "$DB.new" && [ "$(stat -c %s "$R")" = "$(stat -c %s "$DB.new")" ] && [ "$(head -c 15 "$DB.new")" = "SQLite format 3" ] && mv "$DB.new" "$DB" || { echo "[repairdb] FAILED copy — running the tracker on the repaired volume copy via symlink"; rm -f "$DB.new"; ln -s "$R" "$DB"; }
pm2 start tracker >/dev/null 2>&1; T1=$(date -u +%H:%M:%S); echo "[repairdb] tracker started $T1 (recording gap $T0 → $T1)"
sleep 20; pm2 restart launcher >/dev/null 2>&1; pm2 restart scope >/dev/null 2>&1; echo "[repairdb] launcher + scope restarted"
ls -la "$DB"; df -h / "$V" | tail -2 | sed 's/^/[repairdb] /'; echo "[repairdb] done"
