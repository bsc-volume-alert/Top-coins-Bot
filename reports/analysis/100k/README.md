# $100K study — separate research workstream (opened 7 Nov 2026 09:27 UK)
Question: which EARLY features distinguish pump.fun launches that SUBSEQUENTLY first reach a market cap of at least $100,000 from those that do not?
This is not the trading study (books, entries/exits, after-cost P&L — scope/files/forward_plan_6nov.txt, reports/books/LAUNCHER.md). Same underlying records, linked by mint and timestamps; separate reports and frozen plans. A candidate signal is carried into the trading study only when ready, and judged there on after-cost returns, runner coverage and severe losses.

Outcome labels (never merged):
- VERIFIED crossing — first observed trade at ≥ $100K (price_sol × 1e9 × SOL/USD sample at or before it, sample age exported) in coverage_crossings.csv; the preceding trade bounds the time only where the history between is complete.
- DETECTED only — GMGN / registry peak without a verified trade (pointer, not evidence).
- NEVER CROSSED — only where coverage of the whole window is adequate (no feed gap / restart / missing venue inside it).
- UNKNOWN — everything else (incl. quiet starters with no kept trades). Never counted as failure.
Excluded from "prediction": coins already ≥ $100K at the decision time. Migration is reported separately (migration ≈ $40K at current SOL/USD, an observation).
Windows: 30 min, 1 h, 2 h (primary), 24 h. Only mature cohorts (window fully elapsed).
Early data epochs: 60-s checkpoint for every launch since 4 Nov; 15/30/90/120-s since 6 Nov 13:42:56 UTC; exact cuts since 14:09:05 UTC. Late / missing / mispriced checkpoints are not complete histories.
Verified outcomes exist only from tracker 0.19.6 (pool trades, 6 Nov ~20:00 UK) and only for retained launches (15-SOL screen or bundle tier-1).
Process: develop on the earlier cohort → freeze the hypothesis here (dated) → test on later untouched launches.
Contents: backward_7nov/ (first passes; 08:55/09:00 findings RETRACTED 09:10 — see reports/books/LAUNCHER.md). Frozen inputs: branch analysis-inputs-7nov.

ACTIVATION STAMPS (collection, prospective only — earlier gaps are not repaired):
- tracker 0.19.8 — pool trades for every launch in the census for 24 h after creation; pool-feed gaps in feed_gaps as 'pool-…': running since 2026-11-07 09:48 UTC (= UK).
- tracker 0.19.9 — pool-trade evidence fields (pool, ev_idx, lossless raw amounts/reserves, mints, decimals with base 6 ASSUMED, dec_ver, px_adj): running since 2026-11-07 09:57:18 UTC.
- Confirmation cohort for $100K hypotheses: launches created after 09:57:18 UTC 7 Nov.
