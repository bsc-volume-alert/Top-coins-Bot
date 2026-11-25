#!/usr/bin/env bash
# publish-once.sh — run ONE publish of the dashboard data files by hand and SHOW why it fails (owner's request, 25 Nov 2026).
# publish.sh hides every error (it only prints "publish failed"). This does the same steps once, prints each step's result,
# and masks anything that could be a credential (text between // and @ in a URL, GitHub tokens, api-key=, jup_).
# It does not touch the bot (pm2 "older") or the publisher (pm2 "older-pub"). It never prints the remote URL.
#   bash publish-once.sh          (run from anywhere on the server)
OUT="${OLDER_OUT:-/mnt/volume_1794164707392/older}"
mask() { sed -E 's#//[^@/[:space:]]+@#//***@#g; s/(gh[pousr]_|github_pat_)[A-Za-z0-9_]+/\1***/g; s/api-key=[A-Za-z0-9-]+/api-key=***/g; s/jup_[0-9a-f]+/jup_***/g'; }
HERE="${OLDER_CODE:-}"
[ -n "$HERE" ] || HERE="$(pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s.slice(s.indexOf("[{")));const p=a.find(x=>x.name==="older-pub")||a.find(x=>x.name==="older");console.log(p?p.pm2_env.pm_cwd:"")}catch(e){console.log("")}})' 2>/dev/null)"
for c in "$HERE" /root/older-review/older /root/older/older; do [ -n "$c" ] && [ -f "$c/scripts/publish.sh" ] && { HERE="$c"; break; }; done
echo "publish test $(date -u +%FT%TZ)"; echo "code folder: $HERE"
URL="$(git -C "$HERE" remote get-url origin 2>/dev/null)"
[ -n "$URL" ] || { echo "STOP: no git remote found in $HERE"; exit 1; }
case "$URL" in *//*@*) CRED="a credential is stored inside the remote address (hidden)";; git@*|ssh://*) CRED="uses an SSH key";; *) CRED="no credential in the address (uses a helper or none)";; esac
echo "remote: $(printf '%s' "$URL" | mask | sed -E 's#^[a-z]+://(\*\*\*@)?##') — $CRED"
echo "--- disk"; df -h / /tmp "$OUT" 2>/dev/null | awk 'NR==1||!seen[$0]++' | cut -c1-90
echo "--- data files"
[ -f "$OUT/pub/state.json" ] || { echo "STOP: $OUT/pub/state.json does not exist"; exit 1; }
ls -l --time-style=+%H:%M:%S "$OUT"/pub/*.json 2>/dev/null | awk '{print $5, $6, $7}' | sed "s#$OUT/pub/##"
echo "now $(date +%H:%M:%S) server time"
if grep -rIlE 'api-key=[A-Za-z0-9]{8}|jup_[0-9a-f]{16}|X-APIKEY' "$OUT/pub" >/dev/null 2>&1; then echo "STOP: possible key in the data files - not publishing"; exit 1; fi
T="$(mktemp -d 2>&1)" || { echo "STOP: cannot make a temporary folder: $T"; exit 1; }
step() { local name="$1"; shift; local o; o="$("$@" 2>&1)"; local rc=$?; if [ $rc -eq 0 ]; then echo "ok      $name"; else echo "FAILED  $name (exit $rc)"; printf '%s\n' "$o" | mask | tail -15; fi; return $rc; }
echo "--- steps"
step "copy data files" bash -c "cp '$OUT'/pub/*.json '$T'/" \
 && { pm2 logs older --nostream --lines 30 2>/dev/null | mask > "$T/log-tail.txt" || true; } \
 && cd "$T" \
 && step "git init" git init -q \
 && step "git branch" git checkout -q -b older-data \
 && step "git add" git add . \
 && step "git commit" git -c user.name="older-data" -c user.email="noreply@example.com" commit -q -m "older data $(date -u +%FT%TZ)" \
 && step "git push to GitHub" git push -q -f "$URL" older-data \
 && echo "PUBLISHED $(date -u +%T) UTC"
cd /; rm -rf "$T"
echo "done"
