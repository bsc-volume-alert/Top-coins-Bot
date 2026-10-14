#!/usr/bin/env bash
# One-time setup for the BSC tracker droplet. Run as root:
#   curl -fsSL https://raw.githubusercontent.com/bsc-volume-alert/Top-coins-Bot/bsc/bootstrap-bsc.sh | bash
# Safe to re-run: keeps an existing .env unless you choose to replace it.
set -e
APP=/root/tracker-bsc
REPO=https://github.com/bsc-volume-alert/Top-coins-Bot.git
echo "== 1/5 system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq git curl ca-certificates build-essential >/dev/null
echo "== 2/5 Node 22 + pm2"
if ! node -v 2>/dev/null | grep -q '^v22'; then curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null && apt-get install -y -qq nodejs >/dev/null; fi
command -v pm2 >/dev/null || npm install -g pm2 --silent >/dev/null
echo "   node $(node -v) · pm2 $(pm2 -v)"
echo "== 3/5 code (branch bsc → $APP)"
if [ -d "$APP/.git" ]; then git -C "$APP" fetch -q origin bsc && git -C "$APP" reset -q --hard origin/bsc; else git clone -q -b bsc "$REPO" "$APP"; fi
echo "== 4/5 secrets → $APP/.env (typing is hidden; press Enter to leave one blank for now)"
write_env=1
if [ -f "$APP/.env" ]; then read -r -p "   .env already exists — replace it? [y/N] " a </dev/tty; [ "$a" = "y" ] || write_env=0; fi
if [ $write_env = 1 ]; then
  read -r -s -p "   BSC_TG_BOT_TOKEN: " T </dev/tty; echo
  read -r    -p "   BSC_TG_CHAT_ID (e.g. -100123...): " C </dev/tty
  read -r -s -p "   NODEREAL_API_KEY (optional): " N </dev/tty; echo
  umask 077; printf 'BSC_TG_BOT_TOKEN=%s\nBSC_TG_CHAT_ID=%s\nNODEREAL_API_KEY=%s\n' "$T" "$C" "$N" > "$APP/.env"
  echo "   saved (only root can read it)"
fi
echo "== 5/5 install + start"
cd "$APP" && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1
pm2 startOrReload bsc/ecosystem.config.cjs --update-env >/dev/null
pm2 save >/dev/null && pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
pm2 ls
echo "Done. Check your BSC Telegram chat for '🟡 BSC tracker online'."
