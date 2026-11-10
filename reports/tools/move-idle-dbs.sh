#!/usr/bin/env bash
# move-idle-dbs.sh — 10 Nov 2026 02:25 UK (reliability: main disk 11 GB free, tracker DB +4.5 GB/day). Moves the databases of the STOPPED apps
# radar and fomo (2.7 + 2.2 GB) onto the 100 GB volume and leaves symlinks, so nothing is deleted and the apps would still find them if restarted.
# Refuses if either app is running. Copy → size check → replace with symlink. Prints to the deploy log.
set -u
V=$(findmnt -rn -o TARGET | grep -E '^/mnt/volume' | head -1); [ -z "$V" ] && { echo "[mvdb] ABORT no volume"; exit 1; }
for a in radar fomo; do s=$(pm2 jlist 2>/dev/null | A=$a node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).find(x=>x.name===process.env.A);console.log(p?p.pm2_env.status:"absent")})'); echo "[mvdb] $a status $s"; [ "$s" = "online" ] && { echo "[mvdb] ABORT $a is running"; exit 1; }; done
mkdir -p "$V/idle-dbs"
for f in /root/tracker/data/radar.db /root/tracker/data/radar.db-wal /root/tracker/data/radar.db-shm /root/tracker/data/fomo.db /root/tracker/data/fomo.db-wal /root/tracker/data/fomo.db-shm; do
  [ -f "$f" ] && [ ! -L "$f" ] || continue
  n=$(basename "$f"); cp -a "$f" "$V/idle-dbs/$n" && [ "$(stat -c %s "$f")" = "$(stat -c %s "$V/idle-dbs/$n")" ] && rm -f "$f" && ln -s "$V/idle-dbs/$n" "$f" && echo "[mvdb] moved $n ($(du -h "$V/idle-dbs/$n" | cut -f1))" || echo "[mvdb] FAILED $n (original kept)"
done
df -h / "$V" | tail -2 | sed 's/^/[mvdb] /'
