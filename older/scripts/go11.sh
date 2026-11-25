#!/usr/bin/env bash
# older-11 — start the VALIDATION run (paper only, NOT scored) on a new database, with history repair paused so that the
# provider's allowance can be measured with buy-checks alone. Nothing is deleted: the previous run's database stays as it is.
#   bash older/scripts/go11.sh [name=valid11] [previous run=shakedown]
# Afterwards:  rm <out>/repair.off   switches history repair on (no restart);   touch <out>/repair.off   pauses it again.
# The scored run is started later, from the validation run:  bash older/scripts/start.sh score11 7 older-11 valid11
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"; OUT="${OLDER_OUT:-/mnt/volume_1794164707392/older}"; NAME="${1:-valid11}"; PREV="${2:-shakedown}"
mkdir -p "$OUT"; touch "$OUT/repair.off"
bash "$HERE/scripts/start.sh" "$NAME" "" older-11 "$PREV"
echo "history repair is PAUSED (file $OUT/repair.off). Buy-checks are the only GMGN calls now."
