#!/usr/bin/env bash
# Switch the new-coin books (NEW-5M, NEW-10M) ON for a run and restart it. PAPER ONLY; no key is printed.
#   bash older/scripts/newcoins.sh [name=valid11]
# It writes <name>.newcoins (with the date) and restarts the run with its own settings — nothing else about the run changes,
# and history repair stays as it was (a repair.off file is neither created nor removed).
set -euo pipefail
NAME="${1:-valid11}"; HERE="$(cd "$(dirname "$0")/.." && pwd)"; OUT="${OLDER_OUT:-/mnt/volume_1794164707392/older}"
[ -f "$OUT/older-$NAME.db" ] || { echo "run '$NAME' has no database at $OUT/older-$NAME.db. Nothing was changed."; exit 1; }
[ -f "$OUT/$NAME.newcoins" ] || date -u +"switched on %FT%TZ" > "$OUT/$NAME.newcoins"
bash "$HERE/scripts/start.sh" "$NAME"
