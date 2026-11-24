#!/usr/bin/env bash
# 60-MINUTE PAPER VALIDATION of older-10 — launcher for reports/older/2026-11-24/VALIDATION-PROTOCOL.md
#
#   FOR REVIEW. NOT RUN YET. Do not run before (1) Codex has reviewed the commit, (2) the owner has said "go" and named the
#   commit and the option. PAPER ONLY: nothing here builds, signs or sends a transaction, and no key is printed or published.
#
# Usage — from a SEPARATE checkout of branch older-10-review (never from /root/older, the shakedown bot's own checkout):
#   bash older/scripts/validate10.sh <full commit sha> beside     option A: the shakedown bot keeps running (two-process contention test)
#   bash older/scripts/validate10.sh <full commit sha> alone      option B: the shakedown bot was ALREADY stopped by the owner
#
# This script NEVER stops, starts, restarts or deletes the shakedown processes (pm2 "older", "older-pub"). It only reads their
# state. Option B's stop and restart of the shakedown bot are the owner's own, separate commands.
# It never deletes or moves an existing file: if its database or output folder already exists it refuses to start.
set -euo pipefail
die() { echo "[validate10] REFUSED: $*" >&2; exit 1; }
SHA="${1:-}"; MODE="${2:-}"
[ "${#SHA}" = 40 ] || die "give the full 40-character commit to validate"
[ "$MODE" = beside ] || [ "$MODE" = alone ] || die "second argument must be 'beside' (option A) or 'alone' (option B)"
HERE="$(cd "$(dirname "$0")/.." && pwd)"                       # …/older of THIS checkout
case "$HERE" in /root/older|/root/older/*) die "this is the shakedown bot's checkout — use a separate one" ;; esac
[ "$(git -C "$HERE" rev-parse HEAD)" = "$SHA" ] || die "this checkout is not at $SHA"
[ -z "$(git -C "$HERE" status --porcelain -- .)" ] || die "this checkout has local changes"
command -v node >/dev/null || die "node not found"; command -v pm2 >/dev/null || die "pm2 not found"; command -v curl >/dev/null || die "curl not found"

ROOT="${OLDER_VAL_ROOT:-/mnt/volume_1794164707392/older}"; OUT="$ROOT/validation10"; DB="$OUT/older-validation10.db"; PORT=8794; NAME=older-val
[ ! -e "$OUT" ] || die "$OUT already exists — a previous validation must be kept; choose a new folder with OLDER_VAL_ROOT"
FREE_GB="$(df -BG --output=avail "$ROOT" | tail -1 | tr -dc 0-9)"; [ "${FREE_GB:-0}" -ge 10 ] || die "less than 10 GB free on $ROOT"

# state of the shakedown bot (read only). pm2 jlist contains environment values, so it is always filtered through node.
pm2state() { pm2 jlist 2>/dev/null | node -e 'let d="";process.stdin.on("data",x=>d+=x).on("end",()=>{let a=[];try{a=JSON.parse(d)}catch{};const want=process.argv.slice(1);console.log(JSON.stringify(a.filter(p=>!want.length||want.includes(p.name)).map(p=>({name:p.name,pid:p.pid,status:p.pm2_env&&p.pm2_env.status,restarts:p.pm2_env&&p.pm2_env.restart_time,uptime_ms:p.pm2_env&&p.pm2_env.pm_uptime?Date.now()-p.pm2_env.pm_uptime:null,cpu_pct:p.monit&&p.monit.cpu,mem_mb:p.monit?Math.round(p.monit.memory/1048576):null}))))})' "$@"; }
SHAKE="$(pm2state older | node -e 'let d="";process.stdin.on("data",x=>d+=x).on("end",()=>{const a=JSON.parse(d||"[]");console.log(a[0]?a[0].status:"absent")})')"
if [ "$MODE" = alone ]; then [ "$SHAKE" != online ] || die "option B needs the shakedown bot stopped first (the owner's own command); it is online"
else [ "$SHAKE" = online ] || die "option A is a test beside the running shakedown bot; it is '$SHAKE'"; fi
pm2state "$NAME" | grep -q '"name"' && die "a pm2 process called $NAME already exists"

mkdir -p "$OUT/snap"; umask 077
ENVF="${OLDER_ENV:-/root/older/.env}"
KEYF="$(mktemp)"; trap 'rm -f "$KEYF"' EXIT          # the page key, in a private temp file: never on a command line, never in the output
grep -E '^WEB_KEY=' "$ENVF" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"'\r\n' > "$KEYF" || true
SITE_KEY="$(cat "$KEYF")"
[ -d "$HERE/node_modules" ] || (cd "$HERE" && npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1)

ev() { echo "$(date -u +%FT%T.%3NZ) $*" | tee -a "$OUT/events.txt"; }
snap() { # $1 = label. One status read (no keys in it), the filtered process table, and the server's load.
  local f="$OUT/snap/$1"
  curl -s -m 8 --get --data-urlencode "k@$KEYF" "http://127.0.0.1:$PORT/api/state" -o "$f.state.json" -w '%{time_total}\n' > "$f.http_s.txt" 2>/dev/null || echo "status read failed" > "$f.http_s.txt"
  pm2state older older-pub "$NAME" > "$f.proc.json" || true
  { date -u +%FT%TZ; uptime; free -m; df -BM --output=avail "$ROOT" | tail -1; ls -l "$DB"* 2>/dev/null | awk '{print $5, $9}'; } > "$f.sys.txt" 2>&1 || true
}
# non-secret settings only, by name (an allow-list — nothing else is copied out of the settings file)
CONF="$(grep -E '^(OLDER_SOLANA_WIDE|OLDER_REBUY|GMGN_WPS|JUP_RPS|INV_MIN_MC_USD|INV_MAX_POOLS|OLDER_QUOTE_FAST_S|OLDER_QUOTE_SLOW_S|OLDER_HOT_S|OLDER_COLD_S|OLDER_RES_MODE)=' "$ENVF" 2>/dev/null | tr '\n' ';' || true)"

T0="$(date +%s)"; ev "START option=$MODE commit=$SHA node=$(node -v) shakedown=$SHAKE db=$DB port=$PORT settings=[OLDER_SOLANA_WIDE=1(set by launcher);${CONF}]"
( cd "$HERE" && OLDER_OUT="$OUT" OLDER_DB="$DB" OLDER_PORT="$PORT" OLDER_SOLANA_WIDE=1 OLDER_SITE_KEY="$SITE_KEY" OLDER_RUN_NAME=validation10 OLDER_COMMIT="$SHA" \
    pm2 start src/main.mjs --name "$NAME" --cwd "$HERE" --node-args="--max-old-space-size=1100" --kill-timeout 20000 --time >/dev/null )
# deliberately NO "pm2 save": the validation process must not come back after a reboot
ev "EPOCH 1 begins (cold start, empty database)"

RESTART_MIN=35; END_MIN=60; restarted=0
for min in $(seq 0 "$END_MIN"); do
  until [ "$(( $(date +%s) - T0 ))" -ge "$(( min * 60 ))" ]; do sleep 1; done
  if [ "$min" = "$RESTART_MIN" ] && [ "$restarted" = 0 ]; then
    snap "$(printf '%03d' "$min")-before-restart"; ev "RESTART of $NAME only (planned stop, then start) — EPOCH 1 ends"
    pm2 restart "$NAME" >/dev/null; restarted=1; ev "EPOCH 2 begins (same database; price memory read back if the stop was under 60 s)"
    sleep 5; snap "$(printf '%03d' "$min")-after-restart"; continue
  fi
  snap "$(printf '%03d' "$min")"; [ "$min" = 15 ] && ev "MARK minute 15: end of the cold-start segment"
  pm2state "$NAME" | grep -q '"status":"online"' || ev "WARNING: $NAME is not online at minute $min"
done
snap "final"; ev "STOP of $NAME"
pm2 stop "$NAME" >/dev/null || true; sleep 3
pm2 logs "$NAME" --nostream --lines 400 2>/dev/null | sed -E 's/api-key=[A-Za-z0-9-]+/api-key=***/g; s/jup_[0-9a-f]+/jup_***/g' > "$OUT/log-tail.txt" || true
pm2 delete "$NAME" >/dev/null || true
ev "END. Database kept at $DB (not published by this script). Shakedown bot state now: $(pm2state older | tr -d '\n')"

# ---- publish the small result files only (never the database), after a key check
PUB="$(mktemp -d)"; cp -r "$OUT/snap" "$OUT/events.txt" "$OUT/log-tail.txt" "$PUB"/ 2>/dev/null || true
BAD=0; grep -rIlE 'api-key=[A-Za-z0-9]{8}|jup_[0-9a-f]{16}|X-APIKEY|PRIVATE KEY' "$PUB" >/dev/null 2>&1 && BAD=1
[ -s "$KEYF" ] && grep -rIlF -f "$KEYF" "$PUB" >/dev/null 2>&1 && BAD=1
if [ "$BAD" = 1 ]; then echo "[validate10] a result file looks like it contains a key — NOT publishing; results stay in $OUT"; exit 1; fi
( cd "$PUB" && git init -q && git checkout -q -b older-validation10 && git add . && git -c user.name="older-validation" -c user.email="noreply@example.com" commit -q -m "older-10 validation $SHA ($MODE) $(date -u +%FT%TZ)" \
  && git push -q -f "$(git -C "$HERE" remote get-url origin)" older-validation10 ) && echo "[validate10] result files published to branch older-validation10" || echo "[validate10] could not publish — results are in $OUT"
rm -rf "$PUB"
