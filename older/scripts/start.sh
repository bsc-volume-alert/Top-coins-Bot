#!/usr/bin/env bash
# Start (or restart) the older-coin PAPER run under pm2. Nothing here signs or sends a transaction; no key is printed.
#   bash older/scripts/start.sh [name=shakedown] [entry-days] [settings] [previous-name]
# entry-days (e.g. 7): new entries stop that many days after this name's FIRST start (the date is written once to
# <name>.until and reused on every restart, so a restart never extends the window); exits and runner tracking continue.
# Use "" to leave it open. Each name has its own database on the volume, so one run never mixes with another.
# settings (older-11): the run's rule set. Written once to <name>.profile and reused on every restart of that name, so a
#   restart can never silently change what a run buys. Empty = the settings of older-10 (every legacy book, no gates).
#   older-11 = the owner's 13 books; every signal paper-bought as before and LABELLED with his GMGN checks (passed in time /
#              failed / late / no reading — OLDER_GATE_MODE=label, the default; =cancel in the environment cancels instead);
#              coins from 6 hours old; buying again off; pump.fun pool coins only — the sampled "rest of Solana" adapter is
#              OFF (its buys are priced from quotes and the checks are not applied to them).
# previous-name (older-11): only when <name> has no database yet. The new database is prepared from that run's database —
#   coin identities and pools only, read-only on the old file, NO buys / decisions / bars (scripts/seed-db.mjs).
#   PRICE MEMORY is carried in ONLY from a run that had the SAME settings (e.g. from the validation run into the scored run):
#   then the hour-scale books do not start empty. From a run with other settings — the old bot — nothing but identities
#   comes across and the start is COLD: its price memory was built by code with known faults (second opinion, 25 Nov).
#   The previous run's database is kept exactly as it is. Nothing is deleted. Positions still open in it are no longer
#   managed once it is stopped: they stay in that database as they were, and are not results.
set -euo pipefail
NAME="${1:-shakedown}"; HERE="$(cd "$(dirname "$0")/.." && pwd)"; cd "$HERE"
OUT="${OLDER_OUT:-/mnt/volume_1794164707392/older}"; mkdir -p "$OUT/pub"
[ -d node_modules ] || npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1
SITE_KEY="$(grep -E '^WEB_KEY=' /root/older/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"'' || true)"
DAYS="${2:-}"; UNTIL=""
if [ -f "$OUT/$NAME.until" ]; then UNTIL="$(cat "$OUT/$NAME.until")"; elif [ -n "$DAYS" ]; then UNTIL="$(( $(date +%s) + DAYS * 86400 ))"; echo "$UNTIL" > "$OUT/$NAME.until"; fi
# ---- the run's settings: fixed at the first start of this name
PROFILE="${3:-}"; FROM="${4:-}"; DB="$OUT/older-$NAME.db"
if [ -f "$OUT/$NAME.profile" ]; then SAVED="$(cat "$OUT/$NAME.profile")"
  if [ -n "$PROFILE" ] && [ "$PROFILE" != "$SAVED" ]; then echo "run '$NAME' was started with settings '$SAVED' — it cannot be restarted as '$PROFILE'. Use a new name for a new rule set. Nothing was changed."; exit 1; fi
  PROFILE="$SAVED"
elif [ -n "$PROFILE" ] && [ -f "$DB" ]; then echo "run '$NAME' already has a database that was started WITHOUT settings '$PROFILE'. Use a new name for a new rule set. Nothing was changed."; exit 1; fi
BOOKS=""; GATES=""; REBUY=""; MINAGE=""; WIDE=1
case "$PROFILE" in
  "") ;;
  older-11) BOOKS=older-11; GATES=older-11; REBUY=0; MINAGE=6; WIDE=0 ;;
  *) echo "unknown settings '$PROFILE' (known: older-11). Nothing was changed."; exit 1 ;;
esac
# ---- the new-coin books (NEW-5M, NEW-10M): on for a run once the file <name>.newcoins exists (scripts/newcoins.sh creates it,
#      with the date). They are an addition to the run's own books, recorded beside its settings; removing the file and
#      restarting stops NEW buys by them (open ones are managed to their exits as always).
NEWCOINS=0; [ -f "$OUT/$NAME.newcoins" ] && NEWCOINS=1
# ---- a new run prepared from a previous one (before anything is stopped: a failure here leaves the running bot untouched)
WARM_FROM=""
if [ -n "$FROM" ] && [ ! -f "$DB" ]; then
  [ -f "$OUT/older-$FROM.db" ] || { echo "previous run '$FROM' has no database at $OUT/older-$FROM.db. Nothing was changed."; exit 1; }
  node scripts/seed-db.mjs "$OUT/older-$FROM.db" "$DB" $([ "$WIDE" = 0 ] && echo --live-only)
  if [ -n "$PROFILE" ] && [ -f "$OUT/$FROM.profile" ] && [ "$(cat "$OUT/$FROM.profile")" = "$PROFILE" ]; then WARM_FROM="$OUT/older-$FROM.db.warm"; echo "price memory will be carried from run '$FROM' (same settings)"; else echo "cold start: run '$FROM' had other settings — only coin identities come across, no price memory"; fi
fi
[ -n "$PROFILE" ] && [ ! -f "$OUT/$NAME.profile" ] && echo "$PROFILE" > "$OUT/$NAME.profile"
pm2 delete older older-pub >/dev/null 2>&1 || true
OLDER_OUT="$OUT" OLDER_DB="$DB" OLDER_SOLANA_WIDE="$WIDE" OLDER_SITE_KEY="$SITE_KEY" OLDER_RUN_NAME="$NAME" OLDER_ENTRIES_UNTIL="$UNTIL" OLDER_COMMIT="$(git -C "$HERE" rev-parse HEAD 2>/dev/null || true)" \
  OLDER_BOOKS="$BOOKS" OLDER_GATES="$GATES" OLDER_REBUY="$REBUY" OLDER_MIN_AGE_H="$MINAGE" OLDER_WARM_FROM="$WARM_FROM" OLDER_GATE_MODE="${OLDER_GATE_MODE:-}" OLDER_REPAIR="${OLDER_REPAIR:-}" OLDER_NEWCOINS="$NEWCOINS" \
  pm2 start src/main.mjs --name older --cwd "$HERE" --node-args="--max-old-space-size=1100" --kill-timeout 20000 --time >/dev/null
OLDER_OUT="$OUT" pm2 start scripts/publish.sh --name older-pub --cwd "$HERE" --interpreter bash >/dev/null
pm2 save --force >/dev/null
IP="$(hostname -I | awk '{print $1}')"
[ "$NEWCOINS" = 1 ] && echo "new-coin books ON (NEW-5M, NEW-10M)"
echo "started: run '$NAME'${PROFILE:+ (settings $PROFILE)}, database $DB, code $(git -C "$HERE" rev-parse --short HEAD 2>/dev/null)${UNTIL:+, entries until $(date -u -d @"$UNTIL" '+%d %b %H:%M UTC')}"
echo "dashboard: http://$IP:8793/${SITE_KEY:+?k=$SITE_KEY}"
pm2 ls | grep -E "older|name" || true
