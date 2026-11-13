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

## 11 Nov 2026 17:30 UK — "buy the chart going up" (owner 16:45), branch next-strategy-v22 momentum*.py
18 rules fixed in advance: up 1.5/2/3× over the last 5 or 15 min, within 10% of the high, by market cap band; buy 1 s later, 25% or 40% trail on sellable proceeds, sell at slot+2.
- The first run let entries happen before 5 min on populations chosen at 5 min (look-ahead: B +58% a trade). Withdrawn. Re-run with entries only after the 5-minute decision:
- **Going up does predict more upside:** of coins climbing at $10–50K, about 1 in 3 double again (34% in both periods), against 8% for an average coin in A. But 54% halve first, in both periods.
- **Trading it, $10–50K, T25:** A +27% to +54% a trade (+1% to +10% without the top 3); B +13% to +18% (−3% to −5% without the top 3). $50–200K: A +4% to +19%, B −11% to +16%, mostly negative without the top 3.
- Same shape as C1, C2 and R3C: positive averages carried by a few runners, not positive on the typical trade in the second period. Not a new edge; no book proposed.

## 11 Nov 2026 17:45 UK — exploratory: quiet-base breakout and scale-in (owner/Codex go 17:11; spec frozen in BASE_SCALE_SPEC.md, branch next-strategy-v22)
**Quiet-base breakout** (3-min base within ±15% of its median, break > 1.15× with > 3 SOL net buying in 60 s, $10–100K, 0.2 SOL, T25):
| | Signals | Return on invested | Without top 3 (per trade) | False breakouts | Sudden dumps |
|---|---|---|---|---|---|
| A | 79 | +11.6% | −6.7% | 26 (they lost 25%) | 9 |
| B | 59 | −13.2% | −20.1% | 27 (they lost 38%) | 20 |
- The "quiet" bases were not quiet: median 22–34 SOL traded and 91–326 swaps in the 3 minutes (flat price, heavy churn). The quieter half: A −0.1%, B −6.2%. Fails.

**Scale-in vs upfront vs small, same signals** (up 2× in 15 min, near high, $10–50K):
| Arm | A profit per opportunity / without top 3 | B profit per opportunity / without top 3 | Return on invested A / B | Max simultaneous |
|---|---|---|---|---|
| 0.2 upfront | +0.056 / +0.003 SOL | +0.026 / −0.007 SOL | +28.0% / +13.0% | 1.00 / 0.60 SOL |
| 0.05, no add | +0.013 / 0.000 | +0.006 / −0.003 | +26.7% / +11.3% | 0.25 / 0.15 |
| 0.05 + add 0.15 | +0.015 / −0.002 | +0.014 / −0.005 | +15.5% / +13.6% | 0.55 / 0.45 |
- Adds made in 53 of 179 (A) and 32 of 88 (B). Scale-in cut exposure, but its return on the money invested was no better than buying upfront: it risks less, it does not time better. Without the top 3, all three arms are about zero or negative in both periods.

## 11 Nov 2026 17:35 UK — Codex review of the breakout / scale-in tests: corrections
- **Missing receipt times:** the code falls back to the trade time when a swap has no receipt time (assumed immediate arrival). Checked: 0 of 2,080,832 swaps in A and 0 of 2,119,806 in B lack a receipt time, so these results are unaffected. Future code will treat a missing receipt time as not received.
- **Base range:** the code kept base prices between median ÷ 1.15 (−13.0%) and median × 1.15 (+15%), not a symmetric ±15%. Recorded, not re-run (no rescue of a failed test).
- **False breakouts:** A 26 of 79 (33%), B 27 of 59 (46%), not "about one in three" for both.
- Both versions shelved and archived. Next: on identical momentum signals, does holder information available BEFORE buying cut crash losses by more than the winners it excludes? Fresh observations only. Holder snapshots count only if their read time is before the entry.

## 11 Nov 2026 18:20 UK — corrections (Codex review 18:17) to my 18:07 explanation to the owner
- 14,455 was the number of coins with lifecycle checkpoints in snapshot3, not full trade histories; the broader approved trade export has 4,913 mints with histories out of 62,789 launches (Codex's figure). Newer pool capture can extend to 24 h, so "first two hours only" was too strong.
- Not established: that on-chain information contains no edge, that winners and losers are indistinguishable, or that attention is the most likely source of profit. These are hypotheses.
- Next: runner autopsy split between the workers (RESEARCH_QUEUE F006 / C009, then cross-reproduction F007 / C010; C011 inventory of attention and longer-history data before any new collection).

## 13 Nov 2026 17:55 UK — cross-book pattern: run-based entries already in the pool vs still on the curve (EXPLORATORY, found after the fact)
Closed paper trades to 13 Nov 12:45 UTC, 0.2 SOL after costs, venue = where the position was bought:
| Book | Pool at entry | Curve at entry |
|---|---|---|
| M2 | 28: +42.8% mean, +11.7% median, without best 3 +6.2%, +2.40 SOL | 32: −16.9%, −21.3%, −1.08 SOL |
| R3C | 36: +32.1%, +20.1%, without best 3 +6.7%, +2.31 SOL | 369: −12.3%, −27.0%, −9.05 SOL |
| C2 | 83: +8.0%, −2.0%, without best 3 −1.3%, +1.32 SOL | 81: −12.8%, −2.8%, −2.08 SOL |
| All three | **147: +20.5%, median +3.7%, without best 3 +11.0%, +6.03 SOL** | 482: −12.7%, −21.6%, −12.21 SOL |
- The opposite holds for the fixed-time 100K books (100K1 pool −16.8%, curve −6.4%): the pattern is specific to buying a coin that is already running.
- Venue is known at the buy (the reserve read), but this split was found by looking at results → hypothesis only; needs a frozen fresh test before any book.
- Other books: G1 272 trades, win 56% but −4.2% a trade, no trade reached 2×; RB 60, −6.5%; SW5 2 trades; R3C 42 not filled (429 and a "Cannot access 'q' before initialization" error on 16).
