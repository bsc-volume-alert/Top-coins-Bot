#!/usr/bin/env bash
# drop-premove.sh — removes /root/tracker/data/tracker.db.pre-move* ONLY if tracker.db is the volume symlink and the tracker has written to it since the move.
set -u; DB=/root/tracker/data/tracker.db
[ -L "$DB" ] || { echo "[premove] ABORT tracker.db is not the symlink"; exit 1; }
T=$(readlink "$DB"); [ "$(find "$T" -newer "$DB.pre-move" 2>/dev/null)" ] || [ "$(find "$T-wal" -newer "$DB.pre-move" 2>/dev/null)" ] || { echo "[premove] ABORT no writes to the new DB yet"; exit 1; }
cd /root/tracker && node -e 'const D=require("better-sqlite3");const d=new D(process.argv[1],{readonly:true});console.log("[premove] new DB tokens",d.prepare("SELECT COUNT(*) c FROM tokens").get().c,"max create",d.prepare("SELECT MAX(create_ts) m FROM tokens").get().m)' "$DB" || { echo "[premove] ABORT new DB unreadable"; exit 1; }
rm -f "$DB.pre-move" "$DB-wal.pre-move" "$DB-shm.pre-move" && echo "[premove] removed pre-move copies"; df -h / | tail -1
