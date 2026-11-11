# Exploratory offline tests, frozen before any result was computed (11 Nov 2026 ~17:15 UK; owner/Codex go 17:11)
Periods A (6–8 Nov) and B (9–10 Nov) have been examined before, so all findings are EXPLORATORY. No book, no live change.
Common: only swaps RECEIVED by the decision (recv_ms ≤ T) are used; decisions from the 5-minute decision time to 60 min after creation;
execution v2.2 (sim22 conventions): a buy lands on the state 1 s after the decision; an add or a sale lands on the state after the last swap in
slot ≤ trigger slot + 2; curve fee 1.25%, pool fee 0.55% inside the AMM maths; fixed 0.0015 SOL per position plus 0.0015 per extra buy;
25% trail on SELLABLE value per token; 2-h maximum. Uncertain exits (unresolved, or priced from a state > 30 s old) are reported as modeled AND at zero.

## Test 1 — quiet-base breakout (primary)
Checkpoints every 15 s. At checkpoint T:
- BASE = swaps with trade time in [T − 210 s, T − 30 s) (3 minutes, all strictly before the breakout window). Needs ≥ 5 swaps.
- Base reference = the MEDIAN price of the base swaps. Quiet = every base swap price within ±15% of that median.
- BREAKOUT = the last swap received by T has trade time in [T − 30 s, T] and price > 1.15 × base median.
- Fresh buying = buys − sells over swaps with trade time in (T − 60 s, T] > 3 SOL.
- Market cap at T (last price × 1e9 × SOL/USD) in $10,000–$100,000.
- First qualifying T per coin. Buy 0.2 SOL.
Reported with it: base volume (SOL traded in the base) and base swap count; false breakouts = price back below the base median within 5 min
of the decision; sudden dumps = exits landing > 15% below the trail level.
Variants (descriptive only): the same entries split at the median base volume (quieter half / busier half).

## Test 2 — scale-in vs upfront vs small, identical signals
Signal = the momentum rule "up ≥ 2× over the last 15 min, price ≥ 0.9 × high so far, market cap $10–50K", first time per coin after the 5-minute decision.
- Arm U: 0.2 SOL upfront.   Arm S: 0.05 SOL, no add.
- Arm I (scale-in): 0.05 SOL; add 0.15 SOL at most once, only after a COMPLETED qualifying dip, using swaps up to the add decision only:
  (1) the value per token first reaches ≥ 1.30 × the entry value (high H1 tracked from there);
  (2) it then falls ≥ 10% below H1 (the dip; its low L is tracked);
  (3) L stays above the entry value (higher low) — if the value falls to or below the entry value, no add ever;
  (4) the value then exceeds H1 → add, landing at slot + 2. No completed dip → no add. Total ≤ 0.2 SOL.
  One trail (25%) on value per token over the whole holding.
Reported per arm: profit per opportunity (SOL), mean SOL invested, return on SOL invested, maximum simultaneous SOL exposure, adds made.
- Fix before any result (17:20 UK): the momentum signal is checked every 30 s counted from the 5-minute decision ((t − t_start) % 30), not t % 30, which skipped most coins.
