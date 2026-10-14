#!/usr/bin/env bash
# One-time setup for the BSC tracker droplet. Run as root:
#   curl -fsSL https://raw.githubusercontent.com/bsc-volume-alert/Top-coins-Bot/bsc/bootstrap-bsc.sh | bash
# Safe to re-run: keeps an existing .env unless new values are passed in.
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
echo "== 4/5 secrets → $APP/.env"
# Values can be passed in the environment (one-line install) or typed at the prompts (hidden).
T="${BSC_TG_BOT_TOKEN:-}"; C="${BSC_TG_CHAT_ID:-}"; N="${NODEREAL_API_KEY:-}"
if [ -z "$T" ] && [ -f "$APP/.env" ]; then echo "   keeping existing .env"; else
  [ -n "$T" ] || { read -r -s -p "   BSC_TG_BOT_TOKEN: " T </dev/tty; echo; }
  if [ -z "$C" ]; then # find the group the bot was added to / last messaged in
    C=$(curl -s "https://api.telegram.org/bot$T/getUpdates" | grep -o '"chat":{"id":-[0-9]*' | tail -1 | grep -o -- '-[0-9]*')
    [ -n "$C" ] && echo "   found chat ID $C from the bot's recent messages"
  fi
  [ -n "$C" ] || { read -r -p "   BSC_TG_CHAT_ID (e.g. -100123...): " C </dev/tty; }
  if [ -z "$N" ] && [ -z "${BSC_SKIP_NODEREAL:-}" ]; then read -r -s -p "   NODEREAL_API_KEY (optional, Enter to skip): " N </dev/tty || true; echo; fi
  umask 077; printf 'BSC_TG_BOT_TOKEN=%s\nBSC_TG_CHAT_ID=%s\nNODEREAL_API_KEY=%s\n' "$T" "$C" "$N" > "$APP/.env"
  echo "   saved (only root can read it) · chat $C · nodereal $([ -n "$N" ] && echo set || echo "not set")"
fi
echo "== 5/5 install + start"
cd "$APP" && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1
pm2 startOrReload bsc/ecosystem.config.cjs --update-env >/dev/null
pm2 save >/dev/null && pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
pm2 ls
echo "Done. Check your BSC Telegram chat for '🟡 BSC tracker online'."
