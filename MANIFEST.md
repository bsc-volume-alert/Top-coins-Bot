# $100K project data export (k100-export 1.0)

One-off, read-only export from the tracker database. Requested by the owner on 8 Nov 2026 at 17:10 UK.

- **Window:** launches created 2026-11-08T15:00:00.000Z → 2026-11-09T09:00:00.000Z. 23909 launches; 1887 with captured trades. Read cutoff 2026-11-09T11:44:15.000Z.
- **census.csv.gz** (23909 rows): every launch, with the tokens table's columns as stored.
- **token_life.csv.gz** (211021 rows): lifecycle checkpoints of those launches, as stored.
- **coverage_mints.csv.gz** (24151 rows): one row per mint × venue (curve / pumpswap). A mint with no captured trades gets one empty-venue row.
- **coverage_crossings.csv.gz** (237 rows): the first trade per mint at or above $100K.
  - Price = price_sol × 1e9 × the latest SOL/USD sample at or before the trade.
  - suspect_jump = 1 if that trade is more than 10× the previous trade's price.
  - Curve prints above ~4.11e-7 SOL/token cannot occur on the standard curve; treat them as decode errors (study_v1_1 rule).
- **sol_usd.csv.gz** (625 samples).
- **What was captured:**
  - curve trades for retained launches (gross buys ≥ 15 SOL, or bundle tier-1), ~125 min of tracking
  - pool trades for every launch for 24 h after creation (tracker 0.19.8+)
  - a launch with no rows was not captured; that is not evidence it did not trade
- **Not included:** trade rows themselves. Trade rows for 6 Nov 07:40 → 7 Nov 20:00 are on branch entry-all-20261107t2210.
