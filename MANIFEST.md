# replay_9nov — exact inputs, scripts and per-position results (immutable package)

Assembled 9 Nov 2026 14:10 UK. Requested by Codex 13:56 UK via the owner. This is a copy of existing records only: no new blockchain collection and no trading change. The original run is preserved unchanged: scripts are as committed in tracker branch commit fc013a5, and outputs are byte-identical to that run.

## Sources (immutable)
| Source | Branch @ commit | Used for |
|---|---|---|
| Trade export 1 | entry-all-20261107t2210 @ e67833121f1da0dc992c28fa26c5236a855c151a | trades of launches created 6 Nov 07:40 → 7 Nov 20:00 UTC; read cutoff 7 Nov 22:10 |
| Trade export 2 | entry-all-20261108t2002 @ 05f47f12293cc3653eb9f9bd8ec937e107a70b53 | trades of launches created 7 Nov 20:00 → 8 Nov 15:00 UTC; read cutoff 8 Nov 20:02:43 (covers every position's 120-min hold + sell delay; latest needs 8 Nov 17:05:17) |
| $100K export | k100-20261108t1722 @ 72d673ed0e5cec92ebf4e7ff612ba419991a3005 | census, checkpoints (token_life incl. obs_ts/ts availability), coverage per mint×venue, first crossings, SOL/USD |
| Specification | tracker branch: REPLAY_SPEC_v1 (fc24e6b) + Addenda 1 (a3cc048), 2 (8d14754), 3 (6f3bf2d), 4 (84c20b2) | copies in this folder |

## inputs/
- **cohort.json:** the 2,019 replay coins, with mint, create_ts, decision_ts (5-min availability = obs_ts else ts), mc5_usd, label at 300 s, cross_ts and graduated. Also the excluded counts (ALREADY 209, UNKNOWN_NO_POOL 90, SUSPECT 87; late or missing 5-min reading 1,065).
- **trades_<branch>_cohort_NNN.csv.gz:**
  - the RAW rows of those 2,019 mints, copied line-for-line from the two trade exports, all columns, before any dedup
  - 835,304 rows from export 1 and 1,712,153 from export 2, 2,547,457 in total
  - the replay deduplicates by (mint, sig, ev_idx, venue, is_buy, sol, tokens), which leaves 2,080,832 rows (466,625 duplicates from overlapping capture paths)
  - made by scripts/rawcut.py
- **k100_*.csv.gz:** the $100K export files, unchanged.
- **feed_gaps_<branch>.csv.gz:** the full tracker feed_gaps table as of each export.
- **coverage_per_mint_<branch>.csv.gz:** per-mint capture records from each trade export.

### Columns and missing fields
- **ts:** block time in unix seconds, UTC.
- **recv_ms:** tracker receipt time.
- **sol, tokens:** amounts, in SOL and in tokens (6 decimals).
- **price_sol:** the trade's own price.
- **vsol / vtok:**
  - curve rows: virtual reserves AFTER the trade (lamports and raw base units)
  - pool rows: pool quote/base as decoded
- **Pool evidence** (pool, ev_idx, base_raw, quote_raw, pool_base_raw, pool_quote_raw, base_mint, quote_mint, base_dec, quote_dec, dec_ver, px_adj):
  - present on every pool row from tracker 0.19.9 (7 Nov 09:57:18 UTC)
  - empty on curve rows
  - base_dec is ASSUMED 6 by the decoder
- **px_adj:** NULL = the swap's own price; 'primary:<pool>' = replaced by the primary pool's price; 'held' = held by the jump guard.
- **Known issue (Addendum 4):** pool price_sol ÷ (pool_quote_raw/1e9 ÷ pool_base_raw/1e6) has a median of 1.21 for buys and for sells. Curve rows are exactly 1.000. The cause is not yet identified.
- **Not available:** trades of never-retained launches, per-token decimals, a per-coin subscription log, and anything outside the capture windows.

## scripts/ (as run; absolute paths refer to the analyst's sandbox)
Map `/home/claude/top-coins-bot/reports/analysis/100k/confirm_8nov/confirm.py` and `…/replay_9nov/replay.py` to scripts/, and the scratchpad paths to inputs/. **Order of running:**
1. confirm.py (labels; needs the k100 files as census.csv.gz etc. in one directory)
2. cohort.py
3. extract.py, which streams the two export branches, dedups, and writes cohort_trades.pkl.gz. To work from this package instead, read inputs/trades_* with the same dedup.
4. replay.py with pricing 'trade' (primary) or 'reserve' (sensitivity)
5. audit.py, fresh_check.py, positions_dump.py

## outputs/
- **replay_primary_out.txt / replay_reserve_sensitivity_out.txt:** the 49-cell tables at 0.2 SOL (tested) and 0.02 SOL (descriptive), capital saved, and top cells.
- **positions.csv.gz:**
  - one row per coin × exit × size × pricing: 56,532 rows
  - columns: status, why_unavailable, entry_venue, stale_entry, tags, exit_ts, ret_primary, ret_scenario_b, net_sol_primary, cross_ts
  - checks: 30-50K × T25 at 0.2 SOL with 'trade' pricing gives n 43, mean +16.8%, matching the table
- **audit_out.txt:** entry checks and the time-half and venue splits.
- **fresh_check_out.txt:** detection-only check on k100-20261109t1144 (8 Nov 15:00 → 9 Nov 09:00).

## Checksums
SHA256SUMS.txt covers every file in this package.
