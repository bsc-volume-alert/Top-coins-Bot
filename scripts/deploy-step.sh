#!/usr/bin/env bash
# v0.18.85: one deploy step — called by deploy.sh every 30 s. New code is syntax-checked and booted against a throwaway database
# for 45 s (SMOKE=1: no Telegram, no command polling, own web port) BEFORE the live bot is reloaded. If it fails, the previous
# version stays live and Telegram gets a message. Lives in its own file so changes apply without restarting the deployer.
cd /root/tracker || exit 1
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
if ! git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -vqE '^(executor/|fomo/|scope/|radar/|launcher/|reports/|scripts/push-data\.sh$|scripts/dump-live\.cjs$|scripts/dump-launches\.cjs$|scripts/study\.mjs$|scripts/push-now\.txt$|scripts/job-now\.txt$|scripts/executor-off$|scripts/apps-off$|scripts/deploy-step\.sh$|scripts/revival-pull\.mjs$|scripts/s10-check\.cjs$|.*\.md$)'; then TRACKER_CHANGED=0; echo "[deploy] tracker untouched — executor / reports / data-script push"; fi # v0.18.114: the 4-hourly study's reports and the data scripts never restart the bot
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
pm2 startOrReload ecosystem.config.cjs --only tracker --update-env >/dev/null 2>&1
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
  elif pm2 startOrReload launcher/ecosystem.config.cjs --only launcher --update-env >/tmp/deploy-launcher-pm2.log 2>&1; then pm2 save >/dev/null 2>&1; echo "[deploy] launcher reloaded"
  else echo "[deploy] LAUNCHER START FAILED: $(tail -c 300 /tmp/deploy-launcher-pm2.log)"; notify "⛔ <b>launcher start failed</b> — <code>$(tail -c 300 /tmp/deploy-launcher-pm2.log)</code>"; fi
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
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^scripts/job-now\.txt$'; then JOB=$(head -c 40 scripts/job-now.txt | awk '{print $1}'); echo "[deploy] one-off job: $JOB"; case "$JOB" in s10) (cd /root/tracker && nohup nice -n 19 bash -c 'node scripts/s10-check.cjs > /root/tracker/data/job.log 2>&1; grep -h "\[sn10\]" /root/.pm2/logs/tracker-out*.log 2>/dev/null | tail -50 >> /root/tracker/data/job.log; bash /root/tracker/scripts/push-data.sh >> /root/tracker/data/push-now.log 2>&1' >/dev/null 2>&1 &);; *) (cd /root/tracker && nohup nice -n 19 bash -c 'node scripts/revival-pull.mjs > /root/tracker/data/job.log 2>&1; bash /root/tracker/scripts/push-data.sh >> /root/tracker/data/push-now.log 2>&1' >/dev/null 2>&1 &);; esac; fi
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^scripts/push-now\.txt$'; then echo "[deploy] on-demand data push"; (nohup nice -n 19 bash /root/tracker/scripts/push-data.sh >>/root/tracker/data/push-now.log 2>&1 &); fi
# owner, 30 Oct 2026 22:36 UK: stop (and keep stopped) every app listed in scripts/apps-off — run last, so nothing reloaded above stays up
if [ -f scripts/apps-off ]; then for A in $(grep -Eo '^[a-z0-9-]+' scripts/apps-off); do
  if pm2 jlist 2>/dev/null | A="$A" node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.exit(JSON.parse(s).some(p=>p.name===process.env.A&&p.pm2_env.status!=="stopped")?0:1)}catch(e){process.exit(1)}})'; then
    pm2 stop "$A" >/dev/null 2>&1 && pm2 save >/dev/null 2>&1 && echo "[deploy] $A stopped (scripts/apps-off)"; fi; done; fi
