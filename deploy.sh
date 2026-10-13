#!/usr/bin/env bash
# Auto-deploy loop: pulls the `tracker` branch every 30s and reloads the app on change.
cd /root/tracker || exit 1
while true; do
  git fetch -q origin tracker 2>/dev/null
  LOCAL=$(git rev-parse HEAD 2>/dev/null); REMOTE=$(git rev-parse origin/tracker 2>/dev/null)
  if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
    echo "[deploy] $(date -u +%FT%TZ) updating $LOCAL -> $REMOTE"
    git reset -q --hard origin/tracker
    npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1
    pm2 startOrReload ecosystem.config.cjs --only tracker --update-env >/dev/null 2>&1
    echo "[deploy] done: $(git log -1 --pretty=%s)"
  fi
  sleep 30
done
