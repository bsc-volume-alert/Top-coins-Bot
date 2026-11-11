# C1 "curve stage at 5 minutes": frozen candidate and evaluation procedure (v2, 11 Nov 2026 ~14:20 UK)

This was frozen before any data after 10 Nov 21:02 UTC was inspected. Nothing here builds a book; live trading stays off.

## Corrections applied (Codex review, 13:52 UK)
1. **Period B eligibility now follows the live rules.**
   - Only decisions with status `entered` or `out of band` count. That means available and read within 315 s of creation, with a usable clock reading.
   - 10,662 B decisions that were late, had an unusable clock reading or had no market cap are excluded and counted.
2. **Venue is decided from evidence.**
   - Period B: the clock row's venue (for clock decisions) or the 5-minute checkpoint's graduated flag (for trade-triggered decisions).
   - Period A: the 5-minute checkpoint's graduated flag.
   - In both periods, the last swap received by the decision must also be a curve swap on a curve that is not complete.
   - "No pool trade seen" is no longer accepted as proof the coin is on the curve.
3. **Full reconciliation, with missing history counted separately.**

| | A | B |
|---|---|---|
| Eligible 5-minute checkpoints at $15–100K | 176 | 332 |
| Pool (graduated) | 74 | 112 |
| Curve complete | 33 | 46 |
| No stored trade history | — | 117 (curve 115, pool 2) |
| Curve (evidence) | 69 | 57 |
| Fill unavailable | 2 | 2 |
| **Filled** | **67** | **55** |

   Period A's universe was already narrowed upstream to retained launches with an on-time reading. Removed there: 209 past $100K before 5 min, 90 with no pool, 87 suspect, 1,065 late or missing; their bands are unknown.
4. **Exit uncertainty.** Positions whose exit was priced from a state older than 30 s, or left unresolved, are re-scored at 50% and at 0% of their modeled proceeds. The half-sale variant pays a second fixed fee.

## Results (25% trail, whole position)

| Scenario | A (67) | B (55) | Pooled (122) |
|---|---|---|---|
| Modeled mean | +13.5% | +26.0% | +19.1% (95% CI +0.6 … +41.1) |
| Without the top 3 coins | +1.7% | +0.1% | +4.7% |
| Flagged exits at 50%: mean / without top 3 | +8.6% / −3.4% | +20.8% / −5.4% | +14.1% / −0.4% |
| Flagged exits at 0: mean / without top 3 | +3.8% / −8.4% | +15.6% / −10.9% | +9.1% / −5.5% |

- **Median:** −6.7%.
- **Win rate:** 39%.
- **Flagged exits:** 12 of 122.
- **Other exits:** sell half at 2× then 25% trail (with the second fee) gives A +14.0%, B +15.2%. A 15% trail gives A +3.2%, B +0.8%.
- **Reading:** a positive hypothesis that depends on runners and on exit pricing. It is not an established edge.

## C1 compared with R3C (not equivalent)

| | C1 | R3C (frozen, other page) |
|---|---|---|
| Decision time | Exactly at the 5-minute checkpoint (on time, ≤ 315 s) | First curve print ≥ 3× the 60-s price, between 60 s and 15 min (read within 5 s) |
| Market cap | 5-minute reading $15–100K; in practice ≲ $35K, because a coin still on the curve can't be higher at SOL ≈ $84 | None (standard-curve print ≤ 4.2e-7 SOL/token) |
| Population | Retained, proven by at least one swap received before the decision | Retained launches |
| Venue | Curve by checkpoint evidence and the last received swap | Curve; skipped if graduated by the reserve read |
| Size | 0.2 SOL | 0.2 SOL + independent 0.02 SOL |
| Exit | 25% trail, whole position, sell +0.7 s, 2-hour maximum | 30% trail, sell +0.7 s, 2-hour maximum |

**Overlap:** of C1's curve entries, R3C would trigger on 28 of 69 in A (13 before 5 minutes) and 24 of 57 in B (15 before 5 minutes). **Most C1 coins (60%) never trigger R3C.**

## Frozen rule C1-2
At the tracker's 5-minute checkpoint, take a coin if all of these hold:
- the decision is on time and usable (status `entered` or `out of band` under the K timeliness rules);
- the reading is $15,000 ≤ mc5 < $100,000;
- the checkpoint says the coin is not graduated;
- the last swap the tracker received by the decision is a curve swap with virtual SOL < 114.9.

Then:
- **Buy** 0.2 SOL, landing 1 s after the decision, using curve maths.
- **Exit** on a 25% trail on the position's own proceeds, on any venue after migration; the sell lands 0.7 s after the trigger; 2-hour maximum.
- **Costs:** curve fee 1.25%, pool fee 0.55%, plus 0.0015 SOL fixed.

## Frozen evaluation (replay only, no book)
- **Data:** launches created from **13 Nov 2026 00:00 UTC** until 150 C1 positions are filled or 7 days pass, whichever comes first. Exported read-only after the last position's 2-hour hold. 12 Nov stays reserved for the 100K confirmation window.
- **Code:** `c1_v2.py` at this commit, unchanged. Only the input paths change.
- **Report:**
  - the full reconciliation;
  - modeled results and both downside scenarios;
  - results without the top 1 and top 3 coins;
  - the block-bootstrap confidence interval;
  - unavailable fills and missing history.

## Outcomes, fixed in advance
| Outcome | Conditions |
|---|---|
| **INSUFFICIENT EVIDENCE** | Fewer than 80 filled; OR missing history plus unavailable is more than 50% of eligible curve-evidence checkpoints; OR more than 25% of positions have flagged exits |
| **PROFITABLE ON THIS TEST** (strong; the only outcome that could justify discussing a book) | All of: modeled mean ≥ +10%; mean without the top 3 ≥ +2%; 95% block CI lower bound > 0; mean with flagged exits at 0 > 0 |
| **ADVANCE AS RESEARCH ONLY** (a research screen, not proof of profit) | Modeled mean ≥ +5%; mean without the top 3 ≥ 0; CI lower bound > −5% |
| **FAIL** | Anything else |

Any later change to the rule or the code makes it a new candidate with its own fresh period.
