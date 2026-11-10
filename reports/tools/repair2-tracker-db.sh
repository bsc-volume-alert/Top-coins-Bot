#!/usr/bin/env bash
# repair2-tracker-db.sh — 10 Nov 2026 08:35 UK (reliability). The 07:52 repair left the tracker on the slow volume (copy to the main disk failed: the old
# file's space was still held open by launcher/scope). This: lock → stop tracker, launcher, scope (so nothing holds the DB) → WAL checkpoint (must be
# fully done) → copy volume DB to the main disk (space, size + header check) → swap the symlink for the file → start tracker, launcher, scope →
# then, with the tracker running, merge the damaged DB's rows from 04:58:49 UTC on (repair-merge.mjs v3). Nothing is deleted: the volume copy and the
# damaged DB stay on the volume.
set -u
V=$(findmnt -rn -o TARGET | grep -E '^/mnt/volume' | head -1); DB=/root/tracker/data/tracker.db; R="$V/tracker-db/tracker.db"; DMG="$V/tracker-db/tracker.db.damaged-20261110"
back() { echo "[repair2] $1 — tracker stays on the volume DB"; pm2 start tracker >/dev/null 2>&1; sleep 15; pm2 start launcher >/dev/null 2>&1; pm2 start scope >/dev/null 2>&1; exit 1; }
[ -L "$DB" ] && [ "$(readlink "$DB")" = "$R" ] || { echo "[repair2] ABORT tracker.db is not the symlink to $R"; exit 1; }
touch /root/tracker/data/maint.lock; trap "rm -f /root/tracker/data/maint.lock" EXIT
T0=$(date -u +%H:%M:%S); pm2 stop tracker >/dev/null 2>&1; pm2 stop launcher >/dev/null 2>&1; pm2 stop scope >/dev/null 2>&1; sleep 3; echo "[repair2] tracker, launcher, scope stopped $T0"
H=$(lsof -t "$R" "$R-wal" 2>/dev/null | sort -u | tr '\n' ' '); [ -n "$H" ] && { echo "[repair2] still open by: $H"; ps -o pid,args -p ${H// /,} 2>/dev/null | cut -c1-150 | sed 's/^/[repair2]   /'; }
cd /root/tracker && CK=$(node -e 'const D=require("better-sqlite3");const d=new D(process.argv[1]);const r=d.pragma("wal_checkpoint(TRUNCATE)")[0];d.close();console.log(r.busy+" "+r.log+" "+r.checkpointed)' "$R" 2>&1); echo "[repair2] checkpoint busy/log/done: $CK"
set -- $CK; [ "${1:-1}" = "0" ] || back "checkpoint not complete"
W=$(stat -c %s "$R-wal" 2>/dev/null || echo 0); [ "$W" = "0" ] || back "WAL not empty ($W bytes)"
NEED=$(( $(stat -c %s "$R") / 1024 + 3*1024*1024 )); FREE=$(df -k --output=avail / | tail -1); [ "$FREE" -gt "$NEED" ] || back "not enough space on the main disk (free ${FREE}K, need ${NEED}K)"
echo "[repair2] copying $(du -h "$R" | cut -f1) to the main disk $(date -u +%H:%M:%S)"
cp "$R" "$DB.new" && [ "$(stat -c %s "$R")" = "$(stat -c %s "$DB.new")" ] && [ "$(head -c 15 "$DB.new")" = "SQLite format 3" ] || { rm -f "$DB.new"; back "copy failed"; }
rm -f "$DB" "$DB-wal" "$DB-shm" && mv "$DB.new" "$DB" || back "swap failed"
pm2 start tracker >/dev/null 2>&1; T1=$(date -u +%H:%M:%S); echo "[repair2] tracker started on the MAIN disk $T1 (recording gap $T0 → $T1)"
sleep 20; pm2 start launcher >/dev/null 2>&1; pm2 start scope >/dev/null 2>&1; echo "[repair2] launcher + scope started $(date -u +%H:%M:%S)"
ls -la "$DB"; df -h / "$V" | tail -2 | sed 's/^/[repair2] /'
echo "[repair2] merging the damaged DB's rows from 04:58:49 UTC (tracker running) $(date -u +%H:%M:%S)"
nice -n 10 node reports/tools/repair-merge.mjs "$DMG" "$DB" 1794286729 2>&1 | sed 's/^/[repair2] /'
node -e 'const D=require("better-sqlite3");const d=new D(process.argv[1],{readonly:true});for(const [a,b] of [[1794283200,1794286800],[1794286800,1794290400],[1794290400,1794294000],[1794294000,1794297600],[1794297600,1794301200]]){console.log("[repair2] tokens created",new Date(a*1000).toISOString().slice(11,16),"-",new Date(b*1000).toISOString().slice(11,16),"UTC:",d.prepare("SELECT COUNT(*) c FROM tokens WHERE create_ts>=? AND create_ts<?").get(a,b).c)}' "$DB" 2>&1
echo "[repair2] done $(date -u +%H:%M:%S)"
