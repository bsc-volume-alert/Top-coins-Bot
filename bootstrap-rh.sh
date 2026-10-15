#!/usr/bin/env bash
# One-time setup for the Robinhood Chain tracker. Run as root (safe on the BSC droplet: separate folder and pm2 apps):
#   curl -fsSL https://raw.githubusercontent.com/bsc-volume-alert/Top-coins-Bot/rh/bootstrap-rh.sh | bash
# Safe to re-run: keeps an existing .env unless new values are passed in.
set -e
APP=/root/tracker-rh
REPO=https://github.com/bsc-volume-alert/Top-coins-Bot.git
echo "== 1/5 system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq git curl ca-certificates build-essential >/dev/null
echo "== 2/5 Node 22 + pm2"
if ! node -v 2>/dev/null | grep -q '^v22'; then curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null && apt-get install -y -qq nodejs >/dev/null; fi
command -v pm2 >/dev/null || npm install -g pm2 --silent >/dev/null
echo "   node $(node -v) · pm2 $(pm2 -v)"
echo "== 3/5 code (branch rh → $APP)"
if [ -d "$APP/.git" ]; then git -C "$APP" fetch -q origin rh && git -C "$APP" reset -q --hard origin/rh; else git clone -q -b rh "$REPO" "$APP"; fi
echo "== 4/5 secrets → $APP/.env"
# Values can be passed in the environment (one-line install) or typed at the prompts (hidden).
T="${RH_TG_BOT_TOKEN:-}"; C="${RH_TG_CHAT_ID:-}"; A="${ALCHEMY_API_KEY:-}"
if [ -z "$T" ] && [ -f "$APP/.env" ]; then echo "   keeping existing .env"; else
  [ -n "$T" ] || { read -r -s -p "   RH_TG_BOT_TOKEN: " T </dev/tty; echo; }
  if curl -s "https://api.telegram.org/bot$T/getMe" | grep -q '"ok":true'; then echo "   bot token OK"
  else echo "   ❌ Telegram rejected this bot token (revoked or mistyped). Copy the current token from @BotFather and run again."; exit 1; fi
  if [ -z "$C" ]; then # find the group the bot was added to / last messaged in
    C=$(curl -s "https://api.telegram.org/bot$T/getUpdates" | grep -o '"chat":{"id":-[0-9]*' | tail -1 | grep -o -- '-[0-9]*' || true)
    if [ -n "$C" ]; then echo "   found chat ID $C from the bot's recent messages"; else echo "   no group message found yet — send /start@<botname> in the group, or type the chat ID:"; fi
  fi
  [ -n "$C" ] || { read -r -p "   RH_TG_CHAT_ID (e.g. -100123...): " C </dev/tty; }
  if [ -z "$A" ] && [ -z "${RH_SKIP_ALCHEMY:-}" ]; then read -r -s -p "   ALCHEMY_API_KEY (optional, Enter to skip): " A </dev/tty || true; echo; fi
  if [ -n "$A" ]; then
    if curl -s -X POST "https://robinhood-mainnet.g.alchemy.com/v2/$A" -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' | grep -q '"0x1237"'; then echo "   Alchemy key OK (Robinhood Chain 4663)"
    else echo "   ⚠️ Alchemy didn't answer for Robinhood Chain with this key — check the app is set to Robinhood Chain Mainnet. Carrying on without it."; A=""; fi
  fi
  umask 077; printf 'RH_TG_BOT_TOKEN=%s\nRH_TG_CHAT_ID=%s\nALCHEMY_API_KEY=%s\n' "$T" "$C" "$A" > "$APP/.env"
  echo "   saved (only root can read it) · chat $C · alchemy $([ -n "$A" ] && echo set || echo "not set")"
fi
echo "== 5/5 install + start"
cd "$APP" && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1
pm2 startOrReload rh/ecosystem.config.cjs --update-env >/dev/null
pm2 save >/dev/null && pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
pm2 ls
echo "Done. Check your Robinhood Telegram chat for '🟢 Robinhood tracker online'."
