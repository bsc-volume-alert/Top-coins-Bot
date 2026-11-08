#!/bin/bash
# vol-setup.sh — 8 Nov 2026 (owner created a 100 GB DigitalOcean volume, 19:05 UK). Moves the tracker's database backups onto the
# volume and leaves a symlink, so backup.js (data/backups) writes there and its free-space check sees the volume. No restart needed.
# Safe order: copy, verify every file's size, only then remove the originals. Prints everything to the deploy log.
set -u
V=$(findmnt -rn -o TARGET | grep -E '^/mnt/volume' | head -1)
echo "[vol] mount: ${V:-NONE}"; lsblk -o NAME,SIZE,MOUNTPOINT | grep -v loop
grep -E '/mnt/volume' /etc/fstab && echo "[vol] fstab entry present" || echo "[vol] WARNING no fstab entry"
[ -z "$V" ] && { echo "[vol] ABORT: no /mnt/volume* mounted"; exit 1; }
touch "$V/.w" && rm -f "$V/.w" || { echo "[vol] ABORT: volume not writable"; exit 1; }
B=/root/tracker/data/backups
if [ -L "$B" ]; then echo "[vol] backups already a symlink -> $(readlink $B)"; df -h / "$V" | tail -2; exit 0; fi
mkdir -p "$V/backups"
ls -la "$B"
ls "$B" | grep -q '\.part$' && { echo "[vol] ABORT: a backup is being written"; exit 1; }
cp -a "$B/." "$V/backups/" || { echo "[vol] ABORT: copy failed"; exit 1; }
ok=1; for f in "$B"/*; do n=$(basename "$f"); [ "$(stat -c %s "$f")" = "$(stat -c %s "$V/backups/$n" 2>/dev/null)" ] || { ok=0; echo "[vol] size mismatch $n"; }; done
[ $ok = 1 ] || { echo "[vol] ABORT: verification failed, originals kept"; exit 1; }
rm -rf "$B" && ln -s "$V/backups" "$B" && echo "[vol] backups moved to $V/backups, symlink in place"
ls -la "$V/backups"; df -h / "$V" | tail -2
