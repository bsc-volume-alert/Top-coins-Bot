# Next strategy — research notes (started 11 Nov 2026)

## 11 Nov 2026 — round 1 (owner forwarded Codex 13:19 UK; design/analysis only, no book built, live off)
- Branch next-strategy-20261111 @ b526ac15 (PROPOSAL.md, scripts, every configuration). Periods: A = 6–8 Nov (dev), B = 9–10 Nov ($15–100K at 5 min only). Execution = replay v2.1 (reproduced exactly).
- Q1: only "still on the bonding curve with a 5-min reading $15–100K, 25% trail" is positive in both periods (A +13.8% n=69, B +22.8% n=68, pooled +18.3% CI [+1.3, +40.1]) — but top 3 coins = 71% of the profit (pooled −top3 +5.5%), sub-bands flip between periods, 43% of eligible coins unpriceable, best of 182 cells.
- Q2: instant graduation median −57% / −43%; normal graduation before 5 min negative; still-on-curve best. Q3: $50K/$100K/$200K crossings and 1.5× bounces — none supported (B −3% to −51%). Q4: time stops worst; T40 < T25; T15 cuts runners; T25 ≈ TP2×T25 best; no exit rescues the 100K-book entries.
- Candidate C1 (rules in PROPOSAL.md) does NOT clearly qualify and overlaps R3C (other page, same curve-stage thesis) → not built. Pre-registered replay evaluation from 13 Nov 00:00 UTC (150 fills or 7 days): accept only if pooled mean ≥ +5%, mean without top 3 ≥ 0, 95% block CI lower bound > −5%, unavailable ≤ 50%; else reject the curve-stage thesis for this execution model.

## 11 Nov 2026 ~14:20 UK — C1 v2 (Codex review 13:52) — branch next-strategy-20261111 @ 364b2456 (C1_SPEC_FROZEN.md, c1_v2.py, out_c1v2.txt)
- Period B now uses only live-eligible decisions (entered / out of band; 10,662 late or unusable excluded); venue from checkpoint evidence + last received swap; full reconciliation (B: 332 eligible in band → 112 pool, 46 curve complete, 117 no stored history, 57 curve → 55 filled).
- T25 modeled: A +13.5% (67), B +26.0% (55), pooled +19.1% CI [+0.6, +41.1]; without top 3 +4.7%; flagged exits at 0: pooled +9.1%, without top 3 −5.5%. Positive hypothesis, runner- and exit-pricing-dependent; not an edge.
- C1 ≠ R3C: ~60% of C1 coins never trigger R3C (A 41/69, B 33/57).
- FROZEN rule C1-2 and evaluation: replay only (no book) on launches from 13 Nov 00:00 UTC until 150 filled or 7 days; outcomes fixed in advance: INSUFFICIENT EVIDENCE / PROFITABLE ON THIS TEST (strong) / ADVANCE AS RESEARCH ONLY (screen) / FAIL.

## 11 Nov 2026 ~15:05 UK — candidate C2 (proposed 14:48 after a 12,576-combination search over A and B) — next-strategy-20261111 @ 19f73453 (C2_SPEC_FROZEN.md, c2_check.py, out_c2.txt)
- Rule: 5-min reading $20–40K (any venue), net SOL in the last 2 min ≤ 20, sell half at 2× then 25% trail, 2 h max.
- Re-checked under live eligibility + second fee: A +16.0% (59), B +9.0% (48; was +12.3%), pooled +12.9% CI [+1.7, +23.6]; without top 3 pooled +8.6% (B +1.6%); flagged exits at 0 pooled +8.5%. Half at 2× drives it (B whole-position T25 only +4.1%).
- Simulator validated on 27 real 100K2 fills meeting the condition: real +1.0% vs simulated +0.7% (median gap 0.1 pt).
- Chosen with both periods in view → no out-of-sample result yet. Frozen; evaluated by replay on the same fresh window as C1 (13 Nov →), same four pre-fixed outcomes; C1 and C2 judged separately.

## 11 Nov 2026 15:30 UK — execution model v2.2
Sell at slot+2 and trail on sellable proceeds (branch next-strategy-v22 @ 0e501e1). C1 pooled +19.1% → +18.8%, without top 3 +4.7% → +4.6%, flagged at 0 without top 3 −5.7%. C2 pooled +12.9% → +11.9%. The C1 fresh-data test (from 13 Nov) will use c1_v22.py, frozen at 0e501e1.
