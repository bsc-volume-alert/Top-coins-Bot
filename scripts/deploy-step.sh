#!/usr/bin/env bash
# v0.18.85: one deploy step — called by deploy.sh every 30 s. New code is syntax-checked and booted against a throwaway database
# for 45 s (SMOKE=1: no Telegram, no command polling, own web port) BEFORE the live bot is reloaded. If it fails, the previous
# version stays live and Telegram gets a message. Lives in its own file so changes apply without restarting the deployer.
cd /root/tracker || exit 1
# 11 Nov 2026 (Codex 12:51 UK via owner: report coverage, ingestion delay and stalls continuously): read-only hourly collection metrics, at most every 10 min
M=/root/tracker/data/launcher_out/collection_metrics.json; if [ -f /root/tracker/reports/tools/collection-metrics.mjs ] && { [ ! -f "$M" ] || [ $(( $(date +%s) - $(stat -c %Y "$M") )) -gt 600 ]; }; then touch "$M"; (cd /root/tracker && nohup flock -n /tmp/collection-metrics.lock nice -n 19 ionice -c3 timeout 300 node reports/tools/collection-metrics.mjs >> /root/tracker/data/metrics.log 2>&1 &); fi
git fetch -q origin tracker 2>/dev/null
LOCAL=$(git rev-parse HEAD 2>/dev/null); REMOTE=$(git rev-parse origin/tracker 2>/dev/null)
[ -z "$REMOTE" ] && exit 0; [ "$LOCAL" = "$REMOTE" ] && exit 0
echo "[deploy] $(date -u +%FT%TZ) updating $LOCAL -> $REMOTE"
git reset -q --hard origin/tracker
npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1
TOKEN=$(grep -E '^TG_BOT_TOKEN=' .env | cut -d= -f2-); CHAT=$(grep -E '^TG_CHAT_ID=' .env | cut -d= -f2-)
notify() { [ -n "$TOKEN" ] && curl -s -m 10 -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" -d chat_id="$CHAT" -d parse_mode=HTML --data-urlencode text="$1" >/dev/null 2>&1; }
# v0.18.93: a push that touches only executor/ (and docs) leaves the tracker alone — no smoke boot, no reload, no lost P5 restore
TRACKER_CHANGED=1
if ! git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -vqE '^(executor/|fomo/|scope/|agents/|radar/|launcher/|reports/|scripts/push-data\.sh$|scripts/dump-live\.cjs$|scripts/dump-launches\.cjs$|scripts/study\.mjs$|scripts/push-now\.txt$|scripts/job-now\.txt$|scripts/executor-off$|scripts/apps-off$|scripts/deploy-step\.sh$|scripts/revival-pull\.mjs$|scripts/s10-check\.cjs$|.*\.md$)'; then TRACKER_CHANGED=0; echo "[deploy] tracker untouched — executor / reports / data-script push"; fi # v0.18.114: the 4-hourly study's reports and the data scripts never restart the bot
# owner, 30 Oct 2026 22:36 UK ("stop everything … only this dev launch"): every app named in scripts/apps-off is kept stopped and never reloaded
[ -f scripts/apps-off ] && grep -qx tracker scripts/apps-off && TRACKER_CHANGED=0
FAIL=""
if [ "$TRACKER_CHANGED" = "1" ]; then
for f in src/*.js; do node --check "$f" 2>/tmp/deploy-check.err || { FAIL="syntax: $f $(head -c 300 /tmp/deploy-check.err)"; break; }; done
if [ -z "$FAIL" ]; then
  rm -f /root/tracker/data/smoke.db /root/tracker/data/smoke.db-wal /root/tracker/data/smoke.db-shm
  SMOKE=1 SMOKE_MS=45000 DB_PATH=/root/tracker/data/smoke.db WEB_PORT=18787 timeout 90 node src/index.js >/tmp/deploy-smoke.log 2>&1
  RC=$?
  [ "$RC" != "0" ] && FAIL="smoke boot exited with code $RC: $(grep -E 'Error|error|at ' /tmp/deploy-smoke.log | head -5 | tr '\n' ' ' | head -c 400)"
fi
if [ -n "$FAIL" ]; then
  echo "[deploy] REJECTED $(git log -1 --pretty=%s): $FAIL"
  git reset -q --hard "$LOCAL"; npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1
  notify "⛔ <b>Deploy rejected</b> — the live bot stays on $(git log -1 --pretty=%s | head -c 80). Reason: <code>$(echo "$FAIL" | head -c 500)</code>"
  exit 0
fi
# tracker 0.19.7: a reload does not pick up new node arguments (heap size) — same as scope 0.6.0 — so when the ecosystem file changed the app is restarted from it
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^ecosystem.config.cjs$'; then pm2 delete tracker >/dev/null 2>&1; echo "[deploy] tracker: ecosystem changed — fresh start"; fi
pm2 startOrReload ecosystem.config.cjs --only tracker --update-env >/dev/null 2>&1; pm2 save >/dev/null 2>&1
echo "[deploy] done: $(git log -1 --pretty=%s)"
fi
# v0.18.185 (owner, 23 Oct 19:44 UK: stop the bots): while scripts/executor-off exists the executor is kept stopped and is never reloaded; delete the file to bring it back on the next deploy
if [ -f scripts/executor-off ]; then if pm2 jlist 2>/dev/null | grep -q '"name":"executor"' && pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.exit(JSON.parse(s).some(p=>p.name==="executor"&&p.pm2_env.status==="online")?0:1)}catch(e){process.exit(1)}})'; then pm2 stop executor >/dev/null 2>&1 && pm2 save >/dev/null 2>&1 && echo "[deploy] executor stopped (scripts/executor-off)" && notify "⏹ <b>Executor stopped</b> — the trading bot is off (owner, 23 Oct). Delete scripts/executor-off to bring it back."; fi; fi
# v0.18.90: the executor (live buy/sell bot) deploys only when its own folder changed, with its own libraries and its own smoke boot
if [ ! -f scripts/executor-off ] && git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^executor/'; then
  echo "[deploy] executor changed — installing and checking"
  (cd executor && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1)
  EFAIL=""
  for f in executor/src/*.mjs; do node --check "$f" 2>/tmp/deploy-exec.err || { EFAIL="syntax: $f $(head -c 300 /tmp/deploy-exec.err)"; break; }; done
  if [ -z "$EFAIL" ]; then
    mkdir -p /root/executor
    (cd executor && EXEC_SMOKE=1 EXEC_SMOKE_MS=15000 timeout 60 node src/index.mjs >/tmp/deploy-exec-smoke.log 2>&1); ERC=$?
    [ "$ERC" != "0" ] && EFAIL="executor smoke boot exited with code $ERC: $(grep -E 'Error|error|at ' /tmp/deploy-exec-smoke.log | head -5 | tr '\n' ' ' | head -c 400)"
  fi
  if [ -n "$EFAIL" ]; then echo "[deploy] EXECUTOR REJECTED: $EFAIL"; notify "⛔ <b>Executor deploy rejected</b> — the running executor stays as it was. Reason: <code>$(echo "$EFAIL" | head -c 500)</code>"
  elif pm2 startOrReload executor/ecosystem.config.cjs --only executor --update-env >/tmp/deploy-exec-pm2.log 2>&1; then pm2 save >/dev/null 2>&1; echo "[deploy] executor reloaded"
  else echo "[deploy] EXECUTOR START FAILED: $(tail -c 300 /tmp/deploy-exec-pm2.log)"; notify "⛔ <b>Executor start failed</b> — <code>$(tail -c 300 /tmp/deploy-exec-pm2.log)</code>"; fi
fi
# v0.18.179: the fomo watcher (fomo/, pm2 app `fomo`, own database and port) deploys only when its own folder changed — own npm install, syntax check, 20-s smoke boot, own reload; the tracker and the executor are never touched by it
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep '^fomo/' | grep -vqE '^fomo/(finds\.txt|watch/)'; then
  echo "[deploy] fomo changed — installing and checking"
  (cd fomo && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1)
  FFAIL=""
  for f in fomo/src/*.mjs; do node --check "$f" 2>/tmp/deploy-fomo.err || { FFAIL="syntax: $f $(head -c 300 /tmp/deploy-fomo.err)"; break; }; done
  if [ -z "$FFAIL" ]; then
    rm -f /root/tracker/data/fomo-smoke.db /root/tracker/data/fomo-smoke.db-wal /root/tracker/data/fomo-smoke.db-shm
    (cd fomo && FOMO_SMOKE=1 FOMO_SMOKE_MS=20000 FOMO_DB_PATH=/root/tracker/data/fomo-smoke.db FOMO_PORT=18789 timeout 60 node src/index.mjs >/tmp/deploy-fomo-smoke.log 2>&1); FRC=$?
    [ "$FRC" != "0" ] && FFAIL="fomo smoke boot exited with code $FRC: $(grep -E 'Error|error|at ' /tmp/deploy-fomo-smoke.log | head -5 | tr '\n' ' ' | head -c 400)"
  fi
  if [ -n "$FFAIL" ]; then echo "[deploy] FOMO REJECTED: $FFAIL"; notify "⛔ <b>fomo deploy rejected</b> — the running fomo watcher stays as it was. Reason: <code>$(echo "$FFAIL" | head -c 500)</code>"
  elif pm2 startOrReload fomo/ecosystem.config.cjs --only fomo --update-env >/tmp/deploy-fomo-pm2.log 2>&1; then pm2 save >/dev/null 2>&1; echo "[deploy] fomo reloaded"
  else echo "[deploy] FOMO START FAILED: $(tail -c 300 /tmp/deploy-fomo-pm2.log)"; notify "⛔ <b>fomo start failed</b> — <code>$(tail -c 300 /tmp/deploy-fomo-pm2.log)</code>"; fi
fi
# scope 0.1.0 (owner, 23 Oct 2026: a separate website for coin analysis): coin scope (scope/, pm2 app `scope`, port SCOPE_PORT 8791 (8790 is fomo's public page), same key as the tracker page) deploys only when its own folder changed — own npm install, syntax check, smoke boot, own reload; the tracker, the executor and fomo are never touched by it
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^scope/'; then
  echo "[deploy] scope changed — installing and checking"
  (cd scope && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1)
  SFAIL=""
  for f in scope/src/*.mjs; do node --check "$f" 2>/tmp/deploy-scope.err || { SFAIL="syntax: $f $(head -c 300 /tmp/deploy-scope.err)"; break; }; done
  if [ -z "$SFAIL" ]; then (cd scope && SCOPE_SMOKE=1 SCOPE_SMOKE_MS=5000 SCOPE_PORT=18791 timeout 40 node src/index.mjs >/tmp/deploy-scope-smoke.log 2>&1); SRC=$?; [ "$SRC" != "0" ] && SFAIL="scope smoke boot exited with code $SRC: $(grep -E 'Error|error|at ' /tmp/deploy-scope-smoke.log | head -5 | tr '\n' ' ' | head -c 400)"; fi
  if [ -n "$SFAIL" ]; then echo "[deploy] SCOPE REJECTED: $SFAIL"; notify "⛔ <b>coin scope deploy rejected</b> — Reason: <code>$(echo "$SFAIL" | head -c 500)</code>"
  else
    # scope 0.6.0: a reload does not pick up new node arguments (heap size), so when the ecosystem file changed the app is restarted from it
    if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^scope/ecosystem.config.cjs$'; then pm2 delete scope >/dev/null 2>&1; echo "[deploy] scope: ecosystem changed — fresh start"; fi
    if pm2 startOrReload scope/ecosystem.config.cjs --only scope --update-env >/tmp/deploy-scope-pm2.log 2>&1; then pm2 save >/dev/null 2>&1; echo "[deploy] scope reloaded"
    SP=$(grep -E '^SCOPE_PORT=' .env | cut -d= -f2- | tr -d '"'); SP=${SP:-8791}
    if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active" && ! ufw status | grep -q "^$SP/tcp"; then ufw allow "$SP/tcp" >/dev/null 2>&1 && echo "[deploy] firewall: opened $SP/tcp for coin scope"; fi
    else echo "[deploy] SCOPE START FAILED: $(tail -c 300 /tmp/deploy-scope-pm2.log)"; notify "⛔ <b>coin scope start failed</b> — <code>$(tail -c 300 /tmp/deploy-scope-pm2.log)</code>"; fi
  fi
fi
# agents 0.1.0 (owner, 11 Nov 2026 17:49 UK: the research agents on their own website): agents/, pm2 app `agents`, port AGENTS_PORT (default 8792),
# deploys only when agents/ changed — syntax check, smoke boot, own reload, firewall port; never touches the tracker, launcher or coin scope
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^agents/'; then
  echo "[deploy] agents changed — checking"
  AFAIL=""
  for f in agents/src/*.mjs; do node --check "$f" 2>/tmp/deploy-agents.err || { AFAIL="syntax: $f $(head -c 300 /tmp/deploy-agents.err)"; break; }; done
  if [ -z "$AFAIL" ]; then (cd agents && AGENTS_SMOKE=1 AGENTS_PORT=18792 timeout 30 node src/index.mjs >/tmp/deploy-agents-smoke.log 2>&1); ARC=$?; [ "$ARC" != "0" ] && AFAIL="agents smoke boot exited with code $ARC: $(tail -c 300 /tmp/deploy-agents-smoke.log)"; fi
  if [ -n "$AFAIL" ]; then echo "[deploy] AGENTS REJECTED: $AFAIL"
  elif pm2 startOrReload agents/ecosystem.config.cjs --only agents --update-env >/tmp/deploy-agents-pm2.log 2>&1; then pm2 save >/dev/null 2>&1; echo "[deploy] agents reloaded"
    AP=$(grep -E '^AGENTS_PORT=' .env | cut -d= -f2- | tr -d '"'); AP=${AP:-8792}
    if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active" && ! ufw status | grep -q "^$AP/tcp"; then ufw allow "$AP/tcp" >/dev/null 2>&1 && echo "[deploy] firewall: opened $AP/tcp for agents"; fi
    sleep 4; echo "[deploy] agents local check: HTTP $(curl -s -o /dev/null -w %{http_code} -m 5 http://127.0.0.1:$AP/) (403 = up, key required)"
  else echo "[deploy] AGENTS START FAILED: $(tail -c 300 /tmp/deploy-agents-pm2.log)"; fi
fi
# radar 0.1.0 (owner, 24 Oct 2026 16:22 UK): records GMGN / Birdeye / FOMO on every coin the tracker's GMGN scanner flags ($100K in 5 min) — own pm2 app
# `radar`, deploys only when radar/ changed (own npm install, syntax check, smoke run, own reload); never touches the tracker, executor, fomo or coin scope
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^radar/'; then
  echo "[deploy] radar changed — installing and checking"
  (cd radar && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1)
  RFAIL=""
  for f in radar/src/*.mjs; do node --check "$f" 2>/tmp/deploy-radar.err || { RFAIL="syntax: $f $(head -c 300 /tmp/deploy-radar.err)"; break; }; done
  if [ -z "$RFAIL" ]; then (cd radar && RADAR_SMOKE=1 RADAR_DB=/tmp/radar-smoke.db timeout 40 node src/index.mjs >/tmp/deploy-radar-smoke.log 2>&1); RRC=$?; rm -f /tmp/radar-smoke.db*; [ "$RRC" != "0" ] && RFAIL="radar smoke run exited with code $RRC: $(grep -E 'Error|error|at ' /tmp/deploy-radar-smoke.log | head -5 | tr '\n' ' ' | head -c 400)"; fi
  if [ -n "$RFAIL" ]; then echo "[deploy] RADAR REJECTED: $RFAIL"; notify "⛔ <b>radar deploy rejected</b> — Reason: <code>$(echo "$RFAIL" | head -c 500)</code>"
  elif pm2 startOrReload radar/ecosystem.config.cjs --only radar --update-env >/tmp/deploy-radar-pm2.log 2>&1; then pm2 save >/dev/null 2>&1; echo "[deploy] radar reloaded"
  else echo "[deploy] RADAR START FAILED: $(tail -c 300 /tmp/deploy-radar-pm2.log)"; notify "⛔ <b>radar start failed</b> — <code>$(tail -c 300 /tmp/deploy-radar-pm2.log)</code>"; fi
fi
# launcher 0.1.0 (owner, 24 Oct 2026 20:08–20:15 UK): X posts → pump.fun coins from its own wallet — own pm2 app `launcher`, deploys only when launcher/
# changed (own npm install, syntax check, smoke run, own reload). Its mode (paper / shadow / live) is set only in /root/launcher/.env, never by a push.
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep '^launcher/' | grep -vq '^launcher/push-now\.txt$'; then
  echo "[deploy] launcher changed — installing and checking"
  (cd launcher && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1)
  LFAIL=""
  for f in launcher/src/*.mjs; do node --check "$f" 2>/tmp/deploy-launcher.err || { LFAIL="syntax: $f $(head -c 300 /tmp/deploy-launcher.err)"; break; }; done
  if [ -z "$LFAIL" ]; then (cd launcher && LAUNCH_SMOKE=1 LAUNCH_HOME=/tmp/launcher-smoke LAUNCH_DB=/tmp/launcher-smoke.db LAUNCH_OUT=/tmp/launcher-smoke-out timeout 40 node src/index.mjs >/tmp/deploy-launcher-smoke.log 2>&1); LRC=$?; rm -rf /tmp/launcher-smoke.db* /tmp/launcher-smoke /tmp/launcher-smoke-out; [ "$LRC" != "0" ] && LFAIL="launcher smoke run exited with code $LRC: $(grep -E 'Error|error|at ' /tmp/deploy-launcher-smoke.log | head -5 | tr '\n' ' ' | head -c 400)"; fi
  if [ -n "$LFAIL" ]; then echo "[deploy] LAUNCHER REJECTED: $LFAIL"; notify "⛔ <b>launcher deploy rejected</b> — Reason: <code>$(echo "$LFAIL" | head -c 500)</code>"
  else if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^launcher/ecosystem.config.cjs$'; then pm2 delete launcher >/dev/null 2>&1; echo "[deploy] launcher: ecosystem changed — fresh start"; fi # 0.9.40: a reload keeps the old node arguments (heap size)
  if pm2 startOrReload launcher/ecosystem.config.cjs --only launcher --update-env >/tmp/deploy-launcher-pm2.log 2>&1; then pm2 save >/dev/null 2>&1; echo "[deploy] launcher reloaded"
  else echo "[deploy] LAUNCHER START FAILED: $(tail -c 300 /tmp/deploy-launcher-pm2.log)"; notify "⛔ <b>launcher start failed</b> — <code>$(tail -c 300 /tmp/deploy-launcher-pm2.log)</code>"; fi; fi
fi
# launcher: changing launcher/push-now.txt makes the box push the launcher's data now
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^launcher/push-now\.txt$'; then (nohup bash -c 'sleep 90; bash /root/tracker/launcher/push.sh' >> /root/tracker/data/push-now.log 2>&1 &); fi
# fomo 0.1.3: a change to fomo/finds.txt resolves those trades to wallets on the box (fomo/scripts/find-batch.mjs against the running fomo app), then pushes the data
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^fomo/finds\.txt$'; then echo "[deploy] fomo finds"; (cd /root/tracker/fomo && nohup nice -n 19 bash -c 'sleep 25; node scripts/find-batch.mjs > /root/tracker/data/fomo_finds.log 2>&1; bash /root/tracker/scripts/push-data.sh >> /root/tracker/data/push-now.log 2>&1' >/dev/null 2>&1 &); fi
# fomo 0.1.9: a change to fomo/data/handles.txt adds those wallets to the watcher
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^fomo/watch/handles\.txt$'; then echo "[deploy] fomo handles"; (cd /root/tracker/fomo && nohup bash -c 'sleep 5; node scripts/watch-handles.mjs >> /root/tracker/data/fomo_handles.log 2>&1' >/dev/null 2>&1 &); fi
# fomo 0.2.1: changing fomo/data/import-now.txt imports the owner's fomo following list as watched wallets, then pushes the data
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^fomo/watch/import-now\.txt$'; then echo "[deploy] fomo import following"; (cd /root/tracker/fomo && nohup bash -c 'sleep 20; node scripts/import-following.mjs > /root/tracker/data/fomo_import.log 2>&1; bash /root/tracker/scripts/push-data.sh >> /root/tracker/data/push-now.log 2>&1' >/dev/null 2>&1 &); fi
# v0.18.143: an on-demand data push — changing scripts/push-now.txt makes the box run the 4-hourly push (abcd / executor / launches …) now, in the background, at low priority
# v0.18.154: a one-off job — changing scripts/job-now.txt runs the revival price pull (GMGN 5-min candles for every graduated coin), then the data push
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^scripts/job-now\.txt$'; then JOB=$(head -c 40 scripts/job-now.txt | awk '{print $1}'); echo "[deploy] one-off job: $JOB"; case "$JOB" in scope-check) ( K=$(grep -E '^(SCOPE_KEY|WEB_KEY)=' .env | head -1 | cut -d= -f2- | tr -d '"'); P=$(grep -E '^SCOPE_PORT=' .env | cut -d= -f2- | tr -d '"'); P=${P:-8791}; for u in /fd2 /api/fd /api/fd?days=1; do echo "[deploy] scope-check $u: $(curl -s -o /dev/null -w '%{http_code} %{time_total}s %{size_download}B' -m 60 "http://127.0.0.1:$P$u$(case $u in *\?*) echo '&';; *) echo '?';; esac)key=$K")"; done; echo "[deploy] scope-check agents: $(curl -s -o /dev/null -w '%{http_code} %{time_total}s' -m 10 http://127.0.0.1:8792/)"; echo "[deploy] scope-check listen: $(ss -ltnp 2>/dev/null | grep -E ':(8791|8792) ' | awk '{print $4}' | tr '\n' ' ')"; echo "[deploy] scope-check ufw: $(ufw status 2>/dev/null | grep -E '^(8791|8792)' | tr -s ' ' | tr '\n' ';')"; tail -n 12 /root/.pm2/logs/scope-error.log 2>/dev/null | cut -c1-180 | sed 's/^/[deploy] scope-err: /'; tail -n 6 /root/.pm2/logs/scope-out.log 2>/dev/null | cut -c1-180 | sed 's/^/[deploy] scope-out: /' ) ;; tail-tracker) ( (date -u; pm2 jlist 2>/dev/null | node -e "let s=\"\";process.stdin.on(\"data\",d=>s+=d).on(\"end\",()=>{for(const p of JSON.parse(s))if(p.name===\"tracker\")console.log(p.name,p.pm2_env.status,p.pm2_env.restart_time,new Date(p.pm2_env.pm_uptime).toISOString())})"; echo ---err; tail -n 60 /root/.pm2/logs/tracker-error.log | cut -c1-400; echo ---out; tail -n 40 /root/.pm2/logs/tracker-out.log | cut -c1-300) > /root/tracker/data/launcher_out/tracker_tail.txt 2>&1; echo "[deploy] tracker tail written") ;; slowsql) (grep -h -E "^\[(slowsql|stall)\]" /root/.pm2/logs/tracker-error.log 2>/dev/null | tail -300 > /root/tracker/data/launcher_out/slowsql_log.txt; echo "[deploy] slowsql log written $(wc -l < /root/tracker/data/launcher_out/slowsql_log.txt) lines") ;; stall-log) ( (echo "now $(date -u +%FT%TZ)"; ls -la --time-style=+%FT%T /root/.pm2/logs/tracker-out* /root/.pm2/logs/tracker-error* 2>&1 | sed "s/^//"; for F in $(ls -tr /root/.pm2/logs/tracker-out*.log /root/.pm2/logs/tracker-error*.log 2>/dev/null); do echo "FILE $F first: $(head -c 120 $F | head -1)"; grep -n -E "^\[stall\]" "$F" | awk -F"blocked " "{split(\$2,a,\" \"); if (a[1]+0>=30) print}" | cut -c1-260 | tail -80 | sed "s/^//"; done) > /root/tracker/data/launcher_out/stalls_log.txt 2>&1; echo "[deploy] stall-log written") ;; k100-audit) (cd /root/tracker && nohup nice -n 19 ionice -c3 node reports/tools/k100-audit-export.mjs > /root/tracker/data/k100audit.log 2>&1 &) ;; wal-trunc) (cd /root/tracker && ls -la /root/tracker/data/tracker.db-wal | sed "s/^/[deploy] [wal] before /"; timeout 120 node -e 'const D=require("better-sqlite3");const d=new D(process.argv[1],{timeout:3000});const t=Date.now();let r;try{r=d.pragma("wal_checkpoint(TRUNCATE)")}catch(e){r=e.message}console.log("[deploy] [wal] checkpoint",JSON.stringify(r),Date.now()-t,"ms");d.close()' /root/tracker/data/tracker.db 2>&1; ls -la /root/tracker/data/tracker.db-wal | sed "s/^/[deploy] [wal] after /"; df -h / | tail -1 | sed "s/^/[deploy] [wal] /") ;; repair-merge) (V=$(findmnt -rn -o TARGET | grep -E "^/mnt/volume" | head -1); cd /root/tracker && MERGE_TIMEOUT_MS=120000 MERGE_DEDUP_VOLLOG=1 nohup nice -n 10 node reports/tools/repair-merge.mjs "$V/tracker-db/tracker.db.damaged-20261110" /root/tracker/data/tracker.db 1794286729 2>&1 | sed "s/^/[repair3] /" >> /root/.pm2/logs/deployer-out.log &) ;; repair-db2) (nohup bash /root/tracker/reports/tools/repair2-tracker-db.sh >> /root/.pm2/logs/deployer-out.log 2>&1 &) ;; repair-db) (nohup bash /root/tracker/reports/tools/repair-tracker-db.sh >> /root/.pm2/logs/deployer-out.log 2>&1 &) ;; db-check) (V=$(findmnt -rn -o TARGET | grep -E "^/mnt/volume" | head -1); cd /root/tracker && nohup nice -n 15 ionice -c3 node reports/tools/db-check.mjs /root/tracker/data/tracker.db "$V/tracker-db/tracker.db" >> /root/.pm2/logs/deployer-out.log 2>&1 &) ;; gap-compare) (V=$(findmnt -rn -o TARGET | grep -E "^/mnt/volume" | head -1); cd /root/tracker && timeout 600 nice -n 10 node reports/tools/gap-merge.mjs compare "$V/tracker-db/tracker.db" 2>&1 | sed "s/^/[deploy] /") ;; gap-merge) (V=$(findmnt -rn -o TARGET | grep -E "^/mnt/volume" | head -1); cd /root/tracker && nohup nice -n 10 node reports/tools/gap-merge.mjs merge "$V/tracker-db/tracker.db" >> /root/.pm2/logs/deployer-out.log 2>&1 &) ;; ls-dbs) (V=$(findmnt -rn -o TARGET | grep -E "^/mnt/volume" | head -1); ls -la --time-style=+%H:%M:%S /root/tracker/data/ "$V/tracker-db/" "$V/backups" 2>&1; du -sh /root/tracker/data/* "$V"/* /root/.pm2/logs /var/log /tmp /root/.npm /root/.cache /root/tracker/.git /root/* 2>/dev/null | sort -h | tail -22 2>&1 | sed "s/^/[deploy] [lsdb] /"; cd /root/tracker && node -e 'const D=require("better-sqlite3");for(const p of process.argv.slice(1)){try{const d=new D(p,{readonly:true,fileMustExist:true});console.log("[lsdb]",p,"max trade ts",d.prepare("SELECT MAX(ts) m FROM trades").get().m,"max token create",d.prepare("SELECT MAX(create_ts) m FROM tokens").get().m);d.close()}catch(e){console.log("[lsdb]",p,"error",e.message)}}' /root/tracker/data/tracker.db "$V/tracker-db/tracker.db" 2>&1 | sed "s/^/[deploy] /") ;; mv-tracker-db-back) (nohup bash /root/tracker/reports/tools/move-tracker-db-back.sh >> /root/.pm2/logs/deployer-out.log 2>&1 &) ;; mv-tracker-db) (nohup bash /root/tracker/reports/tools/move-tracker-db.sh >> /root/.pm2/logs/deployer-out.log 2>&1 &) ;; drop-premove) (bash /root/tracker/reports/tools/drop-premove.sh 2>&1 | sed "s/^/[deploy] /") ;; mv-idle-dbs) (bash /root/tracker/reports/tools/move-idle-dbs.sh 2>&1 | sed "s/^/[deploy] /") ;; audit) (bash /root/tracker/reports/tools/mint-audit.sh 2>&1 | sed "s/^/[deploy] /") ;; virt-check) (cd /root/tracker && timeout 60 node reports/tools/pool-virtual-check.mjs 2>&1 | sed "s/^/[deploy] /") ;; vault-check) (cd /root/tracker && timeout 120 node reports/tools/pool-vault-check.mjs 2>&1 | sed "s/^/[deploy] /") ;; k100b) (cd /root/tracker && nohup nice -n 19 bash -c 'K100_FROM=1794150000 K100_TO=1794214800 node reports/tools/k100-export.mjs > /root/tracker/data/k100b.log 2>&1' >/dev/null 2>&1 &);; vol-ls) (V=$(findmnt -rn -o TARGET | grep -E "^/mnt/volume" | head -1); echo "[deploy] [vol-ls] mount ${V:-NONE}"; ls -la --time-style=+%d%b%H:%M "$V/backups" | sed "s/^/[deploy] [vol-ls] /"; df -h / "$V" | sed "s/^/[deploy] [vol-ls] /") ;; supp-k100) (cd /root/tracker && nohup nice -n 19 bash -c 'SUPP_MINTSET=window SUPP_FROM=1794081600 SUPP_TO=1794150000 SUPP_MIN_FREE_GB=4 SUPP_CLEAN=1 node reports/tools/supp-export.mjs > /root/tracker/data/supp_k100.log 2>&1' >/dev/null 2>&1 &);; vol-fix) (bash /root/tracker/reports/tools/vol-fix.sh 2>&1 | sed "s/^/[deploy] /") ;; vol-setup) (bash /root/tracker/reports/tools/vol-setup.sh 2>&1 | sed "s/^/[deploy] /") ;; prune-backups) (B=/root/tracker/data/backups; echo "[deploy] backups before:"; ls -la --time-style=+%d%b%H:%M $B | grep tracker- ; N=$(ls $B | grep -cE "^tracker-[0-9-]+\.db$"); if [ "$N" -gt 2 ]; then ls $B | grep -E "^tracker-[0-9-]+\.db$" | sort | head -n $((N-2)) | while read F; do rm -f "$B/$F" && echo "[deploy] removed oldest backup $F (owner go 8 Nov 18:59 UK: keep 2)"; done; fi; df -h / | tail -1) ;; clean-supp) (cd /root/tracker && git ls-remote origin refs/heads/entry-supp-20261107t1433 | grep -q ba9d688d && rm -rf /root/tracker/data/supp_20261107T1433 && echo "[deploy] removed local supp_20261107T1433 (published on entry-supp-20261107t1433 @ ba9d688d)") ;; diag) (nohup bash /root/tracker/reports/tools/diag.sh >/dev/null 2>&1 &);; k100) (cd /root/tracker && nohup nice -n 19 bash -c 'K100_FROM=1793950800 K100_TO=1794150000 node reports/tools/k100-export.mjs > /root/tracker/data/k100.log 2>&1' >/dev/null 2>&1 &);; supp-all) (cd /root/tracker && nohup nice -n 19 bash -c 'SUPP_MINTSET=window SUPP_FROM=1793950800 SUPP_TO=1794081600 SUPP_MIN_FREE_GB=4 SUPP_CLEAN=1 node reports/tools/supp-export.mjs > /root/tracker/data/supp_all.log 2>&1' >/dev/null 2>&1 &);; supp-publish) (cd /root/tracker && nohup nice -n 19 bash -c 'SUPP_PUBLISH_DIR=$(ls -d /root/tracker/data/supp_2* | sort | tail -1) node reports/tools/supp-export.mjs > /root/tracker/data/supp_publish.log 2>&1' >/dev/null 2>&1 &);; supp) (cd /root/tracker && nohup nice -n 19 bash -c 'node reports/tools/supp-export.mjs > /root/tracker/data/supp.log 2>&1' >/dev/null 2>&1 &);; s10) (cd /root/tracker && nohup nice -n 19 bash -c 'node scripts/s10-check.cjs > /root/tracker/data/job.log 2>&1; grep -h "\[sn10\]" /root/.pm2/logs/tracker-out*.log 2>/dev/null | tail -50 >> /root/tracker/data/job.log; bash /root/tracker/scripts/push-data.sh >> /root/tracker/data/push-now.log 2>&1' >/dev/null 2>&1 &);; *) (cd /root/tracker && nohup nice -n 19 bash -c 'node scripts/revival-pull.mjs > /root/tracker/data/job.log 2>&1; bash /root/tracker/scripts/push-data.sh >> /root/tracker/data/push-now.log 2>&1' >/dev/null 2>&1 &);; esac; fi
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^scripts/push-now\.txt$'; then echo "[deploy] on-demand data push"; (nohup nice -n 19 bash /root/tracker/scripts/push-data.sh >>/root/tracker/data/push-now.log 2>&1 &); fi
# 3 Nov 2026 10:45 UK (owner: the operator census needs the launch recorder): an app NOT in scripts/apps-off that is stopped is started again (tracker is record-only, BOOKS_OFF)
for A in tracker; do if [ -f /root/tracker/data/maint.lock ]; then echo "[deploy] maintenance lock present — not auto-starting $A"; continue; fi; if ! grep -qx "$A" scripts/apps-off 2>/dev/null; then
  if pm2 jlist 2>/dev/null | A="$A" node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.exit(JSON.parse(s).some(p=>p.name===process.env.A&&p.pm2_env.status==="stopped")?0:1)}catch(e){process.exit(1)}})'; then
    pm2 start "$A" >/dev/null 2>&1 && pm2 save >/dev/null 2>&1 && echo "[deploy] $A started (no longer in scripts/apps-off)"; fi; fi; done
# owner, 30 Oct 2026 22:36 UK: stop (and keep stopped) every app listed in scripts/apps-off — run last, so nothing reloaded above stays up
if [ -f scripts/apps-off ]; then for A in $(grep -Eo '^[a-z0-9-]+' scripts/apps-off); do
  if pm2 jlist 2>/dev/null | A="$A" node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.exit(JSON.parse(s).some(p=>p.name===process.env.A&&p.pm2_env.status!=="stopped")?0:1)}catch(e){process.exit(1)}})'; then
    pm2 stop "$A" >/dev/null 2>&1 && pm2 save >/dev/null 2>&1 && echo "[deploy] $A stopped (scripts/apps-off)"; fi; done; fi
