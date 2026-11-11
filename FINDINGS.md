# Tracker freeze diagnosis — 11 Nov 2026 (read-only evidence + the reliability fixes deployed)

## What was seen
- `stalls_log_1032utc.txt`: the tracker's own `[stall]` lines per daily pm2 log (rotated 00:00 UTC; `tracker-error__2026-11-10` = 9 Nov, `__11-11` = 10 Nov, `tracker-error.log` = 11 Nov to 10:32).
  9–10 Nov: 83 event-loop blocks ≥ 10 s, 46 of them ≥ 2 min, 3.4 h in total. Blocks ≥ 60 s have been logged every day since late October.
- The stall line's "slow jobs" list (instrumented jobs only) never explained a long block.

## Instrumentation (tracker 0.19.13, 10:44 UTC; logging only)
Every SQLite statement, exec, pragma and transaction (incl. COMMIT) taking ≥ 2 s is logged as `[slowsql]` with its SQL and caller (`patch_3280c7f.diff`).
0.19.14 (12:14 UTC) adds to each `[stall]` line: CPU user/system s, GC pause s, disk read/write MB (/proc/self/io), context switches during the block (`patch_17b9ad6.diff`).

## Cause found (one confirmed so far)
`slowsql_log_1205utc.txt` / `tracker_tail_1232utc.txt`:
`[slowsql] 12:12:45Z 175810 ms stmt.get SELECT mint, create_ts, (SELECT COUNT(*) FROM tokens t2 WHERE t2.creator=t.creator AND t2.create_ts>=?) n FROM tokens t WHERE creator=? AND create_ts<=? ORDER BY create_ts DESC LIMIT 1 @ fees.js:26`
— `latestMintOf`, run on every creator fee-claim event: for a prolific creator it reads all their launches through a creator-only index (random reads in a ~25 GB database) and counts them in a correlated subquery. One call blocked the event loop for 175.8 s.
Fix in 0.19.15 (12:24 UTC, `patch_feddbd5.diff`): index `tokens(creator, create_ts)` (built in 4.5 s) and the count capped at 2 (only "more than one launch in 24 h" is used). In a 300,000-launch test the old and new queries return the same mint and the same ambiguity flag.

## Other slow SQL still present (2–10 s each; disk-bound: stall lines show ~1–2 s CPU, 60–100 MB read, >13,000 voluntary context switches per block)
web snapshot paper_trades queries (web.js:232/333, 2–6 s, every ~2 min), refreshProven (wallets.js:44, 3–9.6 s), smartwallets rebuild (smartwallets.js:41, 2–6.8 s), creator count at startup, wallet_buys peak update (wallets.js:118, ~2 s), p6 reopen UPDATE (6.2 s, startup), p5dataCsv (13.6 s every 4 h). These are next, one at a time, each with before/after timings.

## Not yet measured (to be published)
- Whether trades received during a block were delayed and recovered or lost (needs per-trade receive-vs-block-time counts).
- Before/after: blocks per day, clock-checkpoint coverage (launches with a clock row ÷ launches with a trade before 420 s), ingestion delay, and restart-recovered launches (epoch C5-2R) vs still missing. Baseline = 9–10 Nov figures in investigation 2.

## Collection version for the 12 Nov confirmation window
Tracker 0.19.15 (commit feddbd5), launcher 0.9.61 (scoring code unchanged since 9 Nov activation, last launcher commit 2af1f7bc), K rules K-1, clock epochs C5-2 and C5-2R (restart-recovered, from 0.19.14). Every later change will be listed with its time in the confirmation report.
