#!/usr/bin/env bash
# Start (or restart) the older-coin PAPER run under pm2. Nothing here signs or sends a transaction; no key is printed.
#   bash older/scripts/start.sh [name=shakedown]
# Each name has its own database on the volume, so a shakedown run never mixes with the seven-day run.
set -euo pipefail
NAME="${1:-shakedown}"; HERE="$(cd "$(dirname "$0")/.." && pwd)"; cd "$HERE"
OUT="${OLDER_OUT:-/mnt/volume_1794164707392/older}"; mkdir -p "$OUT/pub"
[ -d node_modules ] || npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1
SITE_KEY="$(grep -E '^WEB_KEY=' /root/older/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"'' || true)"
pm2 delete older older-pub >/dev/null 2>&1 || true
OLDER_OUT="$OUT" OLDER_DB="$OUT/older-$NAME.db" OLDER_SOLANA_WIDE=1 OLDER_SITE_KEY="$SITE_KEY" OLDER_RUN_NAME="$NAME" \
  pm2 start src/main.mjs --name older --cwd "$HERE" --node-args="--max-old-space-size=1100" --time >/dev/null
OLDER_OUT="$OUT" pm2 start scripts/publish.sh --name older-pub --cwd "$HERE" --interpreter bash >/dev/null
pm2 save --force >/dev/null
IP="$(hostname -I | awk '{print $1}')"
echo "started: run '$NAME', database $OUT/older-$NAME.db"
echo "dashboard: http://$IP:8793/${SITE_KEY:+?k=$SITE_KEY}"
pm2 ls | grep -E "older|name" || true
