# 100K investigations 1–3 (11 Nov 2026) — read-only, on the frozen package

Inputs (unchanged):
- package `k100-audit-20261110t2102` @ `c093afef0b9cc71aa166ac459f543f5f772cbb26` (export @ da33a7e2), read cutoff 10 Nov 21:02:33 UTC; all checksums verified 11 Nov.
- `input_stalls_log.txt` — the tracker's own event-loop stall lines per pm2 log file (job `stall-log`, read 11 Nov 10:32 UTC). Log files rotate at 00:00 UTC, so `tracker-error__2026-11-10` holds 9 Nov and `__2026-11-11` holds 10 Nov.

Reproduce (Python 3, standard library only), with the package files in `pkg/`:
```
python3 inv1_pool_losses.py pkg out
python3 inv2_missing_decisions.py pkg input_stalls_log.txt out
python3 inv3_clock_freshness.py pkg out      # reads out/inv1_positions.csv
```
Outputs: INV1.md + inv1_positions.csv (every 100K1 position with entry-time features, outcome columns prefixed OUT_, execution columns EXE_);
INV2.md + inv2_missing.csv (every launch without a decision, its reason and evidence); INV3.md + inv3_clock_entries.csv.
Books stay frozen, live trading off; nothing in any database was changed.
