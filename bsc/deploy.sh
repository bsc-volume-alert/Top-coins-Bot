#!/usr/bin/env bash
# BSC auto-deploy loop: pulls the `bsc` branch every 30s and reloads tracker-bsc on change.
cd /root/tracker-bsc || exit 1
while true; do
  git fetch -q origin bsc 2>/dev/null
  LOCAL=$(git rev-parse HEAD 2>/dev/null); REMOTE=$(git rev-parse origin/bsc 2>/dev/null)
  if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
    echo "[deploy] $(date -u +%FT%TZ) updating $LOCAL -> $REMOTE"
    git reset -q --hard origin/bsc
    npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1
    pm2 startOrReload bsc/ecosystem.config.cjs --only tracker-bsc --update-env >/dev/null 2>&1
    echo "[deploy] done: $(git log -1 --pretty=%s)"
  fi
  sleep 30
done
