#!/usr/bin/env bash
# diag 1.0 (7–8 Nov 2026): READ-ONLY server diagnostics for the control chat when the regular data upload is failing. Collects pm2 status, disk,
# the last lines of the upload / deploy / launcher logs (lines containing URLs with credentials are dropped; no .env is read) and pushes them to a NEW
# branch diag-<stamp>. Changes nothing on the server. Run by deploy-step.sh when scripts/job-now.txt starts with "diag".
set -u
S=$(date -u +%Y%m%dt%H%M); D=/root/tracker/data/diag_$S; mkdir -p "$D"; cd "$D" || exit 1
{ echo "# diag $S UTC"; date -u; uptime; df -h / ; free -m; } > system.txt 2>&1
pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.stringify(JSON.parse(s).map(p=>({name:p.name,status:p.pm2_env.status,restarts:p.pm2_env.restart_time,mem_mb:Math.round((p.monit&&p.monit.memory||0)/1048576),cpu:p.monit&&p.monit.cpu,uptime:p.pm2_env.pm_uptime})),null,1))}catch(e){console.log("[]")}})' > pm2.json 2>&1
for f in /root/tracker/data/push-now.log /root/.pm2/logs/launcher-out.log /root/.pm2/logs/launcher-error.log /root/.pm2/logs/deployer-out.log /root/.pm2/logs/tracker-error.log; do echo "===== $f"; tail -n 80 "$f" 2>/dev/null | grep -vE 'https?://[^ ]*@|api-key=|apikey|token=|secret|password|PRIVATE' ; done > logs.txt 2>&1
{ echo "===== launcher-data repo"; cd /root/tracker-launcher-data 2>/dev/null && git log -3 --format='%cd %h %s' --date=iso 2>&1; git status --short 2>&1 | head -20; du -sh .git 2>/dev/null; ls -la launcher 2>/dev/null | sort -k5 -n | tail -8; } > publish_repo.txt 2>&1
cd "$D" && git init -q && git checkout -q --orphan "diag-$S" && git add -A && git -c user.name=launcher -c user.email=launcher@tracker commit -q -m "diag $S" && git remote add origin https://github.com/bsc-volume-alert/Top-coins-Bot.git && timeout 120 git push -q origin "diag-$S" 2>&1 | grep -vE 'https?://[^ ]*@' | tail -3
cd / && rm -rf "$D"
