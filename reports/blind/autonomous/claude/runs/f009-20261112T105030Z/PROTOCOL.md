# F009 protocol — registered BEFORE any outcome is computed (run f009-20261112T105030Z)

Queue row F009 (coordinator run 3, 12 Nov 2026): on the same 679 eligibility-E launches of f006p2 (live coin at created + 300 s: last received
trade is a valid curve state and >= 5 distinct curve buyers in the last 60 s), score the FIXED partition of the "creator sold 0" condition:

- CELL A "creator absent": the token's creator (tokens_window.csv, known at creation) has no buy and no sell among trades received by t = created + 300 s.
- CELL B "creator bought, sold 0": creator has >= 1 buy received by t and 0 sells received by t.
- CELL C "creator sold > 0": creator has >= 1 sell received by t (regardless of buys).
A, B, C partition E exactly; A ∪ B = f006p2's "creator sold 0" (373 expected: 251 A + 122 B; C 306 expected). Nothing else differs.

Scoring, unchanged from f006p2: entry at exactly t for every launch in the cell; 0.2 SOL; 30 % trail on sellable net proceeds; 2 h cap.
S1 = frozen eval-1.1 main() with one rule file per cell plus the control (pool 30 bps, +125 sensitivity), nothing in evaluate.py touched.
S2 = owner common scenario R4 (pool 55 bps, +1 s / +0.7 s landings, 125 bps curve, 0.0015 SOL fixed, landing state > 30 s old => fill
unavailable / exit uncertain by post-check). Because every cell is a subset of the control with identical entry time and exit, the cell's trades
ARE the control's trades on those launches; the R11 paired view is therefore the cell-vs-complement partition of the control's resolved
set (reported with the counts), and the control total must equal the sum of the three cells exactly (checked).
Report per cell and per half: attempted, filled, unavailable, uncertain exit, stale fill, stale exit, resolved, total SOL, mean / median,
win rate, share losing > 50 %, without best 1 / 3, early / late. Unknown share per cell reported separately; unknowns are never losses.
Diagnostics (no thresholds, no scoring): per cell, share of launches whose first retained tape row is > 5 s after creation (creator trades
before capture are invisible), dev_buy_sol > 0 share from tokens_window, and creator bought tokens median (cell B/C).
Bounded question: does "creator sold 0" pool two populations (A vs B) with different net SOL after costs? Answer = the paired partition
numbers; no threshold is tuned and no new specification is produced. Verdict vocabulary per R16: failed / inconclusive / not profitable / unknown.

## Idea lab (this run) — CL-L004 "time-stop exit", registered here before scoring
Hypothesis: on the same E entries, a position that is not up >= 20 % net by 10 min of holding is more likely to bleed than to run; selling it
then (instead of waiting for the 30 % trail) reduces resolved losses. Exit = first received valid state with seconds_held >= 600 and sellable net
proceeds x < 1.20 x stake, OR the original 30 % trail, OR 2 h — whichever first. Entries identical to CONTROL (679), fixed parameters 600 s / 1.20,
no sweep. Scored S1 and S2 exactly as above; R11 paired view against CONTROL on launches where both resolve; better / worse / unchanged counts.
Confound noted in advance: an earlier exit lands on fresher states, so the unknown share will differ; the paired view is the comparison.
Mechanism differs from every prior gate (it is an exit, not an entry condition), per R27.
