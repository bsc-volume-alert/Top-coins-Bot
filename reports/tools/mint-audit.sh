#!/usr/bin/env bash
# mint-audit.sh — READ-ONLY: runs mint-audit.mjs for the mint prefixes after "audit" in scripts/job-now.txt and pushes the CSVs to a new branch audit-<stamp>.
set -u
S=$(date -u +%Y%m%dt%H%M); D=/root/tracker/data/audit_$S; mkdir -p "$D"
M=$(head -c 400 /root/tracker/scripts/job-now.txt | awk '{print $2}')
cd /root/tracker && AUDIT_MINTS="$M" timeout 300 nice -n 19 node reports/tools/mint-audit.mjs "$D"
cd "$D" && git init -q && git checkout -q --orphan "audit-$S" && git add -A && git -c user.name=launcher -c user.email=launcher@tracker commit -q -m "mint audit $S" && git remote add origin https://github.com/bsc-volume-alert/Top-coins-Bot.git && timeout 180 git push -q origin "audit-$S" 2>&1 | grep -vE 'https?://[^ ]*@' | tail -3
cd / && rm -rf "$D"; echo "[audit] pushed audit-$S"
