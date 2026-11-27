#!/usr/bin/env bash
# Choose which POOL books make new buys in a run, and restart it. PAPER ONLY; no key is printed.
#   bash older/scripts/setbooks.sh <name> <BOOK,BOOK,...>      e.g.  setbooks.sh valid11 VOL100K,VOL300K,VOL500K,RUG450,RUG950
#   bash older/scripts/setbooks.sh <name> default               back to the rule set's own list
#   bash older/scripts/setbooks.sh <name> +FOLLOW               ADD to the run's present list  (-FOLLOW takes off again)
# A group word stands for its books: HIT = the six HIT books, FOLLOW = CONFIRM-15, CONFIRM-20, CONFIRM-30, WAIT5-UP.
# The names are checked against the code BEFORE anything is stopped (an unknown book, or a clock book without the book whose
# buys it shares, changes nothing). The list is written to <name>.books; each change is added to <name>.books.log with its time.
# A book taken off the list makes no NEW buy. Its open positions are still managed to their exits, and its history stays in
# the database (the site shows only the books on the list). The new-coin books are not part of this list (see newcoins.sh).
set -euo pipefail
NAME="${1:-}"; LIST="$(echo "${2:-}" | tr -d ' ')"; HERE="$(cd "$(dirname "$0")/.." && pwd)"; OUT="${OLDER_OUT:-/mnt/volume_1794164707392/older}"
[ -n "$NAME" ] && [ -n "$LIST" ] || { echo "usage: setbooks.sh <name> <BOOK,BOOK,...|default>. Nothing was changed."; exit 1; }
[ -f "$OUT/older-$NAME.db" ] || { echo "run '$NAME' has no database at $OUT/older-$NAME.db. Nothing was changed."; exit 1; }
if [ "$LIST" = default ]; then rm -f "$OUT/$NAME.books"; echo "$(date -u +%FT%TZ) default" >> "$OUT/$NAME.books.log"
else
  CUR="$(cat "$OUT/$NAME.books" 2>/dev/null || true)"
  check() { ( cd "$HERE" && node -e 'import("./src/spec.mjs").then((S) => { const l = S.editBooks(process.argv[2], process.argv[1]); if (l.some((f) => S.NEW_BOOKS.includes(f))) throw new Error("the new-coin books are switched on with newcoins.sh, not listed here"); console.log(l.join(",")); }).catch((e) => { console.log(e.message + ". Nothing was changed."); process.exit(1); })' -- "$LIST" "$CUR" ) || exit 1; }
  FULL="$(check)" || { echo "$FULL"; exit 1; }
  echo "books: $FULL"; echo "$FULL" > "$OUT/$NAME.books"; echo "$(date -u +%FT%TZ) $FULL" >> "$OUT/$NAME.books.log"
fi
bash "$HERE/scripts/start.sh" "$NAME"
