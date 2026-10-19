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
if ! git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null | grep -vqE '^(executor/|reports/|scripts/push-data\.sh$|scripts/dump-live\.cjs$|scripts/study\.mjs$|.*\.md$)'; then TRACKER_CHANGED=0; echo "[deploy] tracker untouched — executor / reports / data-script push"; fi # v0.18.114: the 4-hourly study's reports and the data scripts never restart the bot
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
