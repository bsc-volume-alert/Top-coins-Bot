#!/usr/bin/env bash
# Auto-deploy loop: every 30 s run one deploy step (scripts/deploy-step.sh: fetch, pre-deploy check, reload on success).
# v0.18.85: the step lives in its own file so it can change without restarting this loop. Restart the loop once after this
# version lands:  pm2 restart deployer
cd /root/tracker || exit 1
while true; do
  if [ -x scripts/deploy-step.sh ]; then bash scripts/deploy-step.sh; else
    git fetch -q origin tracker 2>/dev/null; LOCAL=$(git rev-parse HEAD 2>/dev/null); REMOTE=$(git rev-parse origin/tracker 2>/dev/null)
    if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then git reset -q --hard origin/tracker; npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1; pm2 startOrReload ecosystem.config.cjs --only tracker --update-env >/dev/null 2>&1; fi
  fi
  sleep 30
done
