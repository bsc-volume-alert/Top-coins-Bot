#!/usr/bin/env bash
# The wallet collector's loop: every 30 s take the newest code and requests from the "wallets" branch, then run at most one
# pending coin. Low priority (nice) and a 700 MB memory cap, so it cannot crowd the paper bot. Touches no other process.
main() {
  cd "$(dirname "$0")/.." || exit 1
  while true; do
    git fetch -q origin wallets 2>/dev/null && git reset -q --hard FETCH_HEAD 2>/dev/null
    nice -n 10 node --max-old-space-size=700 wallets/src/next.mjs || true
    sleep 30
  done
}
main "$@"; exit
