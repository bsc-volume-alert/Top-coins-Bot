#!/usr/bin/env bash
# move-tracker-db-back.sh — 10 Nov 2026 04:50 UK. REVERT: on the DigitalOcean volume the tracker's synchronous SQLite writes stalled its event loop
# for 4–175 s (tracker-error.log). Moves tracker.db back to the main disk. Order: lock → stop tracker → WAL checkpoint → remove the stale .pre-move copy
# (the 04:20 original; superseded by the volume DB) → copy volume DB to the main disk → size/header check → swap symlink for the file → start → restart
# launcher + scope. The volume copy is kept until a separate check.
set -u
V=$(findmnt -rn -o TARGET | grep -E '^/mnt/volume' | head -1); DB=/root/tracker/data/tracker.db; SRC="$V/tracker-db/tracker.db"
[ -L "$DB" ] || { echo "[mvback] ABORT tracker.db is not a symlink"; exit 1; }
touch /root/tracker/data/maint.lock; trap "rm -f /root/tracker/data/maint.lock" EXIT
T0=$(date -u +%H:%M:%S); pm2 stop tracker >/dev/null 2>&1; echo "[mvback] tracker stopped $T0"
cd /root/tracker && node -e 'const D=require("better-sqlite3");const d=new D(process.argv[1]);console.log("[mvback] wal checkpoint",JSON.stringify(d.pragma("wal_checkpoint(TRUNCATE)")));d.close()' "$SRC" 2>&1
rm -f "$DB.pre-move" "$DB-wal.pre-move" "$DB-shm.pre-move"; df -h / | tail -1 | sed 's/^/[mvback] /'
cp -a "$SRC" "$DB.new" && [ "$(stat -c %s "$SRC")" = "$(stat -c %s "$DB.new")" ] && [ "$(head -c 15 "$DB.new")" = "SQLite format 3" ] && ok=1 || ok=0
if [ $ok != 1 ]; then echo "[mvback] FAILED copy — tracker restarted on the volume DB"; rm -f "$DB.new"; pm2 start tracker >/dev/null 2>&1; exit 1; fi
rm -f "$DB" "$DB-wal" "$DB-shm" && mv "$DB.new" "$DB"
pm2 start tracker >/dev/null 2>&1; T1=$(date -u +%H:%M:%S); echo "[mvback] tracker started on the main disk $T1 (capture gap $T0 → $T1)"
sleep 20; pm2 restart launcher >/dev/null 2>&1; pm2 restart scope >/dev/null 2>&1; echo "[mvback] launcher + scope restarted $(date -u +%H:%M:%S)"
ls -la "$DB"; df -h / "$V" | tail -2 | sed 's/^/[mvback] /'
