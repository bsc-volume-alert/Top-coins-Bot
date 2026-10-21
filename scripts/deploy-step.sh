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
if ! git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -vqE '^(executor/|fomo/|reports/|scripts/push-data\.sh$|scripts/dump-live\.cjs$|scripts/dump-launches\.cjs$|scripts/study\.mjs$|scripts/push-now\.txt$|scripts/job-now\.txt$|scripts/revival-pull\.mjs$|scripts/s10-check\.cjs$|.*\.md$)'; then TRACKER_CHANGED=0; echo "[deploy] tracker untouched — executor / reports / data-script push"; fi # v0.18.114: the 4-hourly study's reports and the data scripts never restart the bot
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
# v0.18.90: the executor (live buy/sell bot) deploys only when its own folder changed, with its own libraries and its own smoke boot
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^executor/'; then
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
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep '^fomo/' | grep -vq '^fomo/finds\.txt$'; then
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
# fomo 0.1.3: a change to fomo/finds.txt resolves those trades to wallets on the box (fomo/scripts/find-batch.mjs against the running fomo app), then pushes the data
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^fomo/finds\.txt$'; then echo "[deploy] fomo finds"; (cd /root/tracker/fomo && nohup nice -n 19 bash -c 'sleep 25; node scripts/find-batch.mjs > /root/tracker/data/fomo_finds.log 2>&1; bash /root/tracker/scripts/push-data.sh >> /root/tracker/data/push-now.log 2>&1' >/dev/null 2>&1 &); fi
# v0.18.143: an on-demand data push — changing scripts/push-now.txt makes the box run the 4-hourly push (abcd / executor / launches …) now, in the background, at low priority
# v0.18.154: a one-off job — changing scripts/job-now.txt runs the revival price pull (GMGN 5-min candles for every graduated coin), then the data push
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^scripts/job-now\.txt$'; then JOB=$(head -c 40 scripts/job-now.txt | awk '{print $1}'); echo "[deploy] one-off job: $JOB"; case "$JOB" in s10) (cd /root/tracker && nohup nice -n 19 bash -c 'node scripts/s10-check.cjs > /root/tracker/data/job.log 2>&1; grep -h "\[sn10\]" /root/.pm2/logs/tracker-out*.log 2>/dev/null | tail -50 >> /root/tracker/data/job.log; bash /root/tracker/scripts/push-data.sh >> /root/tracker/data/push-now.log 2>&1' >/dev/null 2>&1 &);; *) (cd /root/tracker && nohup nice -n 19 bash -c 'node scripts/revival-pull.mjs > /root/tracker/data/job.log 2>&1; bash /root/tracker/scripts/push-data.sh >> /root/tracker/data/push-now.log 2>&1' >/dev/null 2>&1 &);; esac; fi
if git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -q '^scripts/push-now\.txt$'; then echo "[deploy] on-demand data push"; (nohup nice -n 19 bash /root/tracker/scripts/push-data.sh >>/root/tracker/data/push-now.log 2>&1 &); fi
