#!/usr/bin/env bash
# launcher 0.1.0: publish the launcher's export (launches.csv, posts.csv, the first raw stream events, status.json — public wallet address only, never a key)
# to the repo's `launcher-data` branch — force-pushed, one commit — so the chat can check every launch. Read-only on everything else.
set -u
D=/root/tracker-launcher-data; SRC=${LAUNCH_OUT:-/root/tracker/data/launcher_out}
[ -d "$SRC" ] || exit 0
if [ ! -d "$D/.git" ]; then mkdir -p "$D"; git -C "$D" init -q; git -C "$D" remote add origin https://github.com/bsc-volume-alert/Top-coins-Bot.git; fi
cd "$D" || exit 1
git checkout -q --orphan ld-new 2>/dev/null || git checkout -q --orphan "ld-$$" 2>/dev/null || true
git rm -rfq --cached . 2>/dev/null || true; rm -rf launcher; mkdir -p launcher
cp -f "$SRC"/* launcher/ 2>/dev/null || true
date -u +%FT%TZ > launcher/pushed_at.txt
# 30 Oct 2026: which pm2 apps are running, and the deployer's recent log (public info only — no keys)
(pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.stringify(JSON.parse(s).map(p=>({name:p.name,status:p.pm2_env.status,restarts:p.pm2_env.restart_time,mem_mb:Math.round((p.monit&&p.monit.memory||0)/1048576),max_mem:p.pm2_env.max_memory_restart||null,uptime:p.pm2_env.pm_uptime||null})),null,1))}catch(e){console.log("[]")}})' > launcher/pm2_all.json) 2>/dev/null
# 0.9.54 (7 Nov 15:15 UK): disk report at most once an hour, each du capped at 15 s, written in the background — 0.9.52 ran it on every push
# (du over ~25 GB, up to 3×60 s) and pushed the whole script past its 180-s limit: uploads failed 14:58–15:15 UK.
DU=/root/tracker/data/disk_usage.txt
if [ ! -f "$DU" ] || [ -n "$(find "$DU" -mmin +60 2>/dev/null)" ]; then (nice -n 19 bash -c '{ date -u +%FT%TZ; df -h / | tail -1; timeout 15 du -xsh /root/tracker-launcher-data /root/tracker/data /root/tracker-data /root/launcher /root/.pm2/logs /var/log 2>/dev/null; timeout 15 du -xsh /root/tracker/data/* 2>/dev/null | sort -rh | head -12; } > /root/tracker/data/disk_usage.tmp 2>&1; mv /root/tracker/data/disk_usage.tmp /root/tracker/data/disk_usage.txt' >/dev/null 2>&1 </dev/null &) ; fi
{ df -h / | tail -1; cat "$DU" 2>/dev/null; } > launcher/disk_usage.txt
tail -c 3000 /root/.pm2/logs/deployer-out.log > launcher/deploy_log.txt 2>/dev/null; tail -c 3000 /root/.pm2/logs/launcher-error.log > launcher/launcher_err.txt 2>/dev/null
git add -A launcher
git -c user.name=launcher -c user.email=launcher@tracker commit -q -m "launcher data $(date -u +%FT%TZ)" || exit 0
git branch -q -M launcher-data
# 0.7.8 (4 Nov 2026): GitHub's secret scanner flags ordinary wallet addresses in the chain data (GH013 "Push cannot contain secrets",
# study_buyers.jsonl:35352 on 4 Nov) and silently stalls every publish. Drop each flagged line and push again, up to 4 times.
for attempt in 1 2 3 4; do
  OUT=$(timeout 120 git push -q -f origin launcher-data 2>&1) && { echo "[launcher] pushed"; git reflog expire --expire=now --all 2>/dev/null; nice -n 19 git prune --expire=now 2>/dev/null; exit 0; } # 0.9.52: earlier uploads are on GitHub — drop their local copies (they filled the disk: 16 GB on 7 Nov 03:30, again 95.6% at 14:18 UK)
  echo "$OUT" | grep -q "GH013" || { echo "[launcher] push failed: $(echo "$OUT" | grep -vE 'https?://[^ ]*@' | tail -3 | tr '\n' ' ' | head -c 300)"; exit 1; }
  echo "$OUT" | grep -oE 'path: launcher/[^:]+:[0-9]+' | sed 's/path: //' | sort -t: -k1,1 -k2,2nr | uniq | while IFS=: read -r f ln; do [ -f "$f" ] && sed -i "${ln}d" "$f" && echo "[launcher] dropped flagged line $ln of $f"; done
  git add -A launcher; git -c user.name=launcher -c user.email=launcher@tracker commit -q --amend --no-edit || true
done
echo "[launcher] push failed after 4 attempts (secret scanner)"; exit 1
