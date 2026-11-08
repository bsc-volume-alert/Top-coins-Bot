#!/bin/bash
# vol-fix.sh — 8 Nov 2026 19:30 UK. Two follow-ups to vol-setup:
# 1) the volume had NO /etc/fstab entry, so after a reboot it would not mount and backup.js would write into the empty mount-point
#    directory on the main disk. Adds a UUID entry with nofail (boot never blocks on the volume). Backs up fstab first; mount -a test.
# 2) restore test of the moved backups (Codex's request): read-only SQLite quick_check of each .db, gzip -t of each .gz,
#    plus sha256 recorded for future comparison. Runs detached at low priority; results are appended to the deployer log.
set -u
if [ "${1:-}" = restore ]; then V=$(findmnt -rn -o TARGET | grep -E '^/mnt/volume' | head -1); LOG=/root/.pm2/logs/deployer-out.log; cd /root/tracker
  for f in "$V"/backups/*; do
    case "$f" in
      *.db) r=$(nice -n 19 ionice -c3 node -e 'const D=require("better-sqlite3");const d=new D(process.argv[1],{readonly:true,fileMustExist:true});console.log(d.pragma("quick_check",{simple:true}), d.prepare("SELECT COUNT(*) c FROM sqlite_master").get().c+" schema rows")' "$f" 2>&1 | tr "\n" " ");;
      *.gz) r=$(nice -n 19 ionice -c3 gzip -t "$f" 2>&1 && echo "gzip ok");;
      *) r="skipped";;
    esac
    s=$(nice -n 19 ionice -c3 sha256sum "$f" | cut -c1-16)
    echo "[volfix] restore-test $(basename "$f"): $r sha256 $s" >> "$LOG"
  done; echo "[volfix] restore-test finished $(date -u +%H:%M:%S)" >> "$LOG"; exit 0; fi
V=$(findmnt -rn -o TARGET | grep -E '^/mnt/volume' | head -1); [ -z "$V" ] && { echo "[volfix] ABORT no volume mounted"; exit 1; }
DEV=$(findmnt -rn -o SOURCE "$V"); UUID=$(blkid -s UUID -o value "$DEV"); [ -z "$UUID" ] && { echo "[volfix] ABORT no UUID for $DEV"; exit 1; }
if grep -q "$UUID" /etc/fstab; then echo "[volfix] fstab already has $UUID"; else
  cp /etc/fstab /etc/fstab.bak-20261108 && echo "UUID=$UUID $V ext4 defaults,nofail,discard,noatime 0 2" >> /etc/fstab
  mount -a && echo "[volfix] fstab entry added for $V (UUID $UUID), mount -a OK" || { cp /etc/fstab.bak-20261108 /etc/fstab; echo "[volfix] mount -a FAILED, fstab restored"; }
fi
grep "$V" /etc/fstab
setsid nohup bash /root/tracker/reports/tools/vol-fix.sh restore </dev/null >/dev/null 2>&1 &
echo "[volfix] restore test started in background"
