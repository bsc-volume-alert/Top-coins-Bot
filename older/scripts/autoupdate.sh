#!/usr/bin/env bash
# AUTO-UPDATE of the PAPER bot on the server (owner 28 Nov 2026 00:31 UK: "Can you just not automatically update my
# Termius? Do I have to keep cutting and pasting?").
#
# Runs on the server under pm2. Once a minute it asks GitHub for the head of ONE branch (default older-11-review — the
# branch the three pasted lines fetch). When that head has CHANGED since it last looked, it does exactly what the three
# pasted lines did — checkout that commit, start.sh <run> — and then watches the bot for a minute. If the bot is not up
# (pm2 does not show it online, or it keeps restarting), it goes back to the code that was running before, starts that,
# and says so in its log; that commit is not tried again. A commit it has already handled is never started twice, so a
# start by hand (the three lines, or a rollback to an older commit) is left alone until the branch moves again.
#
# Paper only: nothing here signs or sends a transaction, and no key is read or printed. It runs whatever is pushed to
# that branch — so only what the owner asked for or approved is pushed there (CLAUDE.md: propose, wait for his "go").
#
#   install, once:  pm2 start older/scripts/autoupdate.sh --name older-auto --interpreter bash -- valid11 && pm2 save
#   switch it off:  pm2 delete older-auto && pm2 save      (the three pasted lines work as before, with or without it)
#   what it did:    pm2 logs older-auto --lines 30 --nostream
main() {
  set -u
  local RUN="${1:-valid11}" BR="${2:-older-11-review}" EVERY="${3:-60}" SETTLE="${AUTO_SETTLE_S:-40}" WATCH="${AUTO_WATCH_S:-20}" REPO LAST="" NEW CUR
  REPO="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$REPO" || exit 1
  say() { echo "$(date -u '+%Y-%m-%d %H:%M:%S') [auto] $*"; }
  # "online 3" = pm2's status of the bot and how many times it has restarted it; "none 0" when it is not there
  st() { pm2 jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>{try{const p=JSON.parse(s).find((x)=>x.name==="older");console.log(p?p.pm2_env.status+" "+p.pm2_env.restart_time:"none 0")}catch(e){console.log("none 0")}})' 2>/dev/null || echo "none 0"; }
  # up: online, and not restarted again while we watched
  up() { local a b; sleep "$SETTLE"; a="$(st)"; sleep "$WATCH"; b="$(st)"; [ "${a%% *}" = online ] && [ "$a" = "$b" ]; }
  start() { git checkout -q "$1" 2>/dev/null && bash older/scripts/start.sh "$RUN" >/dev/null 2>&1; }
  say "watching branch $BR for run $RUN every ${EVERY}s — running $(git rev-parse --short HEAD 2>/dev/null)"
  while true; do
    if git fetch -q origin "$BR" 2>/dev/null; then
      NEW="$(git rev-parse FETCH_HEAD 2>/dev/null)"; CUR="$(git rev-parse HEAD 2>/dev/null)"
      if [ -n "$NEW" ] && [ "$NEW" != "$LAST" ]; then LAST="$NEW"
        if [ "$NEW" = "$CUR" ]; then say "branch is at ${NEW:0:7}: already running"
        else say "new code ${NEW:0:7} (running ${CUR:0:7}): starting it"
          if start "$NEW" && up; then say "running ${NEW:0:7}"
          else say "${NEW:0:7} did NOT come up — going back to ${CUR:0:7}"
            if start "$CUR" && up; then say "back on ${CUR:0:7}, running. ${NEW:0:7} will not be tried again"; else say "PROBLEM: ${CUR:0:7} is not up either — paste the three lines by hand"; fi
          fi
        fi
      fi
    fi
    sleep "$EVERY"
  done
}
main "$@"; exit
