#!/usr/bin/env bash
# Robinhood auto-deploy loop: pulls the `rh` branch every 30s and reloads tracker-rh on change.
cd /root/tracker-rh || exit 1
while true; do
  git fetch -q origin rh 2>/dev/null
  LOCAL=$(git rev-parse HEAD 2>/dev/null); REMOTE=$(git rev-parse origin/rh 2>/dev/null)
  if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
    echo "[deploy] $(date -u +%FT%TZ) updating $LOCAL -> $REMOTE"
    git reset -q --hard origin/rh
    npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1
    pm2 startOrReload rh/ecosystem.config.cjs --only tracker-rh --update-env >/dev/null 2>&1
    echo "[deploy] done: $(git log -1 --pretty=%s)"
  fi
  sleep 30
done
