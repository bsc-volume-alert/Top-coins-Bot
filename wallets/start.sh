#!/usr/bin/env bash
# Start (or restart) the wallet collector under pm2 as its own process "wallets". Read-only research: it never signs or sends a
# transaction, never prints a key, and does not stop, start or change any other process (the paper bot is not touched).
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"; DATA="${WALLETS_DATA:-/root/wallets-data}"; URL="$(git -C "$HERE" remote get-url origin)"
if [ ! -d "$DATA/.git" ]; then
  if git ls-remote --exit-code --heads "$URL" wallets-data >/dev/null 2>&1; then git clone -q -b wallets-data --single-branch "$URL" "$DATA"
  else mkdir -p "$DATA"; git -C "$DATA" init -q; git -C "$DATA" checkout -q -b wallets-data; git -C "$DATA" remote add origin "$URL"; fi
fi
git -C "$DATA" config user.name "wallets-data"; git -C "$DATA" config user.email "noreply@example.com"
pm2 delete wallets >/dev/null 2>&1 || true
WALLETS_DATA="$DATA" pm2 start wallets/watch.sh --name wallets --cwd "$HERE" --interpreter bash --time >/dev/null
pm2 save --force >/dev/null
echo "wallet collector started (code $(git -C "$HERE" rev-parse --short HEAD), data in $DATA)"
pm2 ls | grep -E "wallets|name" || true
