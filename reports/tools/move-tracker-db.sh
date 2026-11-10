#!/usr/bin/env bash
# move-tracker-db.sh — 10 Nov 2026 (reliability: tracker.db 18 GB on a 48 GB disk growing ~0.3 GB/h). Moves the live tracker database to the 100 GB volume.
# Order: stop tracker → checkpoint WAL into the DB (sqlite3/node, while stopped) → copy DB to the volume → size check + header check → rename the original to
# tracker.db.pre-move (kept until the new one is verified) → symlink → start tracker → restart launcher (it holds the old file open read-only).
# Any failure before the symlink: originals untouched, tracker restarted. The .pre-move copy is removed only by a separate job after verification.
set -u
V=$(findmnt -rn -o TARGET | grep -E '^/mnt/volume' | head -1); [ -z "$V" ] && { echo "[mvtdb] ABORT no volume"; exit 1; }
DB=/root/tracker/data/tracker.db; [ -L "$DB" ] && { echo "[mvtdb] already a symlink -> $(readlink $DB)"; exit 0; }
pgrep -f "backup" >/dev/null 2>&1; ls /mnt/volume*/backups/*.part >/dev/null 2>&1 && { echo "[mvtdb] ABORT a backup is being written"; exit 1; }
need=$(( $(stat -c %s "$DB") / 1024 + 1048576 )); free=$(df -k --output=avail "$V" | tail -1); [ "$free" -lt "$need" ] && { echo "[mvtdb] ABORT volume too small"; exit 1; }
touch /root/tracker/data/maint.lock; trap "rm -f /root/tracker/data/maint.lock" EXIT   # stops deploy-step auto-starting the tracker mid-copy
T0=$(date -u +%H:%M:%S); pm2 stop tracker >/dev/null 2>&1; echo "[mvtdb] tracker stopped $T0"
cd /root/tracker && node -e 'const D=require("better-sqlite3");const d=new D(process.argv[1]);console.log("[mvtdb] wal checkpoint",JSON.stringify(d.pragma("wal_checkpoint(TRUNCATE)")));d.close()' "$DB" 2>&1
mkdir -p "$V/tracker-db"; ok=1
cp -a "$DB" "$V/tracker-db/tracker.db" || ok=0
[ $ok = 1 ] && [ "$(stat -c %s "$DB")" = "$(stat -c %s "$V/tracker-db/tracker.db")" ] || ok=0
[ $ok = 1 ] && [ "$(head -c 15 "$V/tracker-db/tracker.db")" = "SQLite format 3" ] || ok=0
if [ $ok != 1 ]; then echo "[mvtdb] FAILED copy/verify — original kept"; rm -f "$V/tracker-db/tracker.db"; pm2 start tracker >/dev/null 2>&1; echo "[mvtdb] tracker restarted $(date -u +%H:%M:%S)"; exit 1; fi
for x in -wal -shm; do [ -f "$DB$x" ] && mv "$DB$x" "$DB$x.pre-move"; done
mv "$DB" "$DB.pre-move" && ln -s "$V/tracker-db/tracker.db" "$DB"
pm2 start tracker >/dev/null 2>&1; T1=$(date -u +%H:%M:%S); echo "[mvtdb] tracker started $T1 (capture gap $T0 → $T1)"
sleep 20; pm2 restart launcher >/dev/null 2>&1; pm2 restart scope >/dev/null 2>&1; echo "[mvtdb] launcher + scope restarted $(date -u +%H:%M:%S)"
ls -la "$DB" "$V/tracker-db/"; df -h / "$V" | tail -2
