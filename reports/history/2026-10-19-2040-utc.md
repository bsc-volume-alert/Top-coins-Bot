# 4-hour study — 19 Oct 2026 21:40 UK

**Data push:** 21:09 UK (fresh). 2,990 rows since the price fix (18 Oct 20:25 UK) to 19 Oct 21:05 UK. A: 359 fired, 152 passed and closed. C 47 · D 120 · 80-SOL 67 · E 50 passed. Executor legs: 88 live (none since 11:59 UK), 265 shadow. launches.csv: 48,022 launches to 20:05 UK. Every figure below is at the REAL costs (PumpSwap x/1.02 × 0.967 − 0.016, stops −0.05 more; curve x × 0.97 − 0.01, stops −0.06 more; prints above 15x capped), unless it says "paper".

**Since the 17:41 UK study:** 1,042 new rows, 972 of them snipers; A had 23 more passed trades (−1.3%, win 48%). The executor opened 83 shadow legs in the window: S3 34 (+0.174 SOL), S4 25 (+0.095), G 15 (−0.116), S6b 5 (−0.027), S9 3, S1 1 — and **one A5 leg, still open**. Books in shadow at the push: A5, B, F, G, S3, S4, S10, S6b; everything else paper or off. The new books have almost nothing yet: **A5 1 row** (its trigger has been live 55 minutes of data), **S10 0 rows and 0 legs** (the 10-wallet operator launched at 19:59 and 20:02 UK, eight and eleven minutes before the book started, and not since), **S4b 4 rows**, S6b 5, S7b 5, S11 1. The tracker lagged the chain badly after the 20:10 UK restart — feed lag median 3.8 s in the 20:00 UK hour (0.8–1.4 s in the hours before), 21 s on the one A5 coin, 56 s at worst — which matters for every rule that buys "5 s after the trigger". The A2 column (`x_flow4ff`) is **not in this push** (the columns note says it should be), so A2 is scored by hand from the 60-s mark. F still has no legs: no A coin since the 19:45 UK fix had a bundle of 3 wallets or fewer (0 qualifying rows), so that is not a bug this time.

## Is anything profitable on real prices?

**No book is profitable on real prices with enough trades to mean anything.** Two sniper books are positive on their 5-min exit and their shadow legs agree — **S3 copycat** (+1.5% on 91 paper, +8.7% on the 44 since 17:05 UK; 34 shadow legs **+0.174 SOL**, +10% a trade) and **S4 clean launch** (+6.3% on 48; 25 shadow legs **+0.095 SOL**) — but S3 is 3 winning hours out of 8 and S4 faded through the evening (shadow +0.29 SOL at 17:00 UK, then +0.02, −0.07, −0.15 by hour). Everything that trades A's trigger loses; G's 5-min sell, which was +20% on 36 at the last two studies, is −13.0% on the 19 since.

| book (exit) | trades | real net/trade | win | stop | since 17:05 UK | shadow / live legs (entry gap · exit gap) |
|---|---|---|---|---|---|---|
| A (runner) | 152 | −1.6% | 53% | 39% | n23 −1.3% | live 38 −0.376 SOL, shadow 31 −0.625 (+0.9% / +2.3% · see cost section) |
| B (A sold at 5 min) | 152 | −6.0% | 56% | 33% | n23 −9.0% | live 50 −0.301, shadow 65 −0.711 (+1.9% / +2.2%) |
| C (runner) | 47 | −12.5% | 43% | 40% | n8 +4.1% | shadow 7 +0.027 |
| D (runner) | 120 | −0.9% | 50% | 38% | n18 +1.6% | shadow 26 +0.025 |
| 80-SOL (runner) | 67 | −7.7% | 39% | 49% | n12 +26.5% | — |
| E (runner / 5-min) | 50 | +0.3% / +1.0% | 42% / 48% | 50% / 46% | n10 +10.3% / −6.1% | — |
| E2 (E, MC < 1.2× first A/C/D entry, 5-min) | 2 closed since 16:45 UK | −50.9% | 0% | 100% | — | — |
| F (A, bundle ≤ 3 wallets, runner) | 51 | +6.6% | 71% | 24% | n9 −22.2% | **0 legs** (0 qualifying coins since the fix) |
| G (A trigger, 150–500 wallets, 5-min) | 53 | +8.9% | 58% | 40% | n19 −13.0% | shadow 22 −0.442 (20 runner legs −0.333; 2 h5 legs −0.109) |
| A5 (own row, runner) | 1 | −50.5% | 0% | 100% | n1 | 1 shadow leg, open 26 min, filled **31% below paper** |
| A5 rule on A's rows at the 5-s price (F5) | 61 | +1.4% | 61% | 28% | n10 −13.7% | — |
| A2 by hand (sell at 60 s if < 0.95, else runner) | 58 traced | −2.0% | 43% | 19% | n4 +13.0% (from 20:00 UK) | — |
| S1 (5-min) | 93 | −14.7% | 38% | 52% | n40 −20.4% | shadow 9 −0.183 |
| S2 (1.5x/−40%) | 375 | −8.5% | 31% | 30% | n142 −12.1% | — |
| **S3 (5-min)** | 91 | **+1.5%** | 30% | 27% | n44 **+8.7%** | shadow 34 **+0.174** (+1.4% / −2.4%) |
| **S4 (5-min)** | 48 | **+6.3%** | 40% | 15% | n24 +7.1% | shadow 25 **+0.095** (+0.9% / −2.0%) |
| S4b (S4, bundle < 3%, 5-min) | 2 | −19.0% | 0% | 0% | n2 | — (by hand on S4's rows: bundle < 3% n19 +27.2%, 0 stops; ≥ 3% n29 −7.4%) |
| S5 (1.5x/−40%) | 414 | −9.9% | 37% | 47% | n139 −6.5% | — |
| S6 (runner) | 310 | −4.3% | 32% | 40% | n132 −12.9% | shadow 5 −0.079 |
| S6b (5-min) | 3 | −3.2% | 67% | 33% | n3 | shadow 5 −0.027 (entry gap −9%) |
| S7 (1.5x/−40%) | 187 | −12.2% | 25% | 35% | n54 −24.1% | — |
| S7b (1.5x/−40%) | 5 | −0.1% | 40% | 20% | n5 | — |
| S8 (1.5x/−40%) | 141 | −13.2% | 34% | 49% | n90 −16.2% | — |
| S9 (5-min) | 115 | −14.3% | 22% | 32% | n83 −14.2% | shadow 31 −0.296 |
| S10 (5-min) | 0 | — | — | — | — | 0 legs |
| S11 (5-min) | 1 | −50.9% | — | — | n1 | — |

The 80-SOL book's +26.5% on 12 is four coins (Cure Cancer 4.0x, the collectooor 1.8x, Clerk 1.8x, Universal Hype 1.8x) in a book that is −7.7% on 67; E's runner +10.3% on 10 is the same story. Neither is a book coming back.

## A5 and A2

**A5 out of sample: 1 row, 1 leg, no result yet — and the one leg is a warning.** The trigger has been live since 20:10 UK; in the 55 minutes of data after it, A passed 7 coins and A5 opened on one (Rest in Piss Kim Jong-Un, 20:39:42 UK). On that coin the tracker was **21 seconds behind the chain** (feed_lag_ms 20,990 on A's row; A5 fired 27 s after A's trigger, not 5), so the "5-s price still 1.16x the trigger" was a stale read: the executor's pool quote 267 ms later filled at **0.70x the paper price** (3.88e-7 vs 5.54e-7 SOL), i.e. the real price was already 21% *below* A's trigger price, not 16% above it. The paper row then fell to 0.21x and closed at 0.59 (tsl80, −50.5% real); the shadow leg is still open 26 minutes after the paper close. One trade says nothing about the rule; it says a lot about the tracker's clock after a restart — A5's whole premise is a price read 5 s after the trigger, and on the 20:00 UK hour the median lag was 3.8 s (max 56 s). A second coin at 20:59:15 UK (kum jung on) had fs5_x 1.0228 and no A5 row; the bot's own 5-s read presumably differed by a fraction.

**A5 scored on A's rows (buy at the 5-s price, runner exit) — in-sample and out-of-sample side by side:**

| window | A5 rule (fs5 ≥ 1.02, priced at fs5) | A on the same coins at the trigger price (paper, the misleading one) | all A |
|---|---|---|---|
| rows to 17:05 UK (the owner's 19:48 analysis) | **n51 +4.4%, win 63%, stop 25%** | n51 +19.8% | n129 −1.8%, stop 39% |
| 17:05 → 20:10 UK (after the analysis, before the book) | **n10 −13.7%, win 50%, stop 40%** | — | n19 −1.3% |
| all 61 | +1.4%, win 61%, stop 28% | +18.0% | n152 −1.6% |
| first half / second half of the 61 | +4.5% (31) / −1.8% (30) | | |
| hours with 3+ qualifying trades | positive in 5 of 10 | | |

So the +4.4% the owner built A5 on is reproduced exactly (51 trades), and the 10 trades that came after it were −13.7%. Stricter thresholds do better in sample (fs5 ≥ 1.05: n43 +2.8%; ≥ 1.10: n29 +12.0%, stop 10%) and so does a later confirm: **fs10 ≥ 1.05 priced at the 10-s price is +8.3% on 56, +8.4% to 17:05 UK and +7.7% on the 11 after, stop 12%** — registered below as F6, with the same caveat about the clock. A5 with a 5-min exit instead of the runner is −5.4% (61); the runner is the right exit for a confirmed entry. The stop rate is the real thing in these numbers: a coin still up at 5–10 s stops out 12–28% of the time against A's 39%, and that is structural, not a sample of hours.

**A2 (sell at 60 s if below 0.95x, else the runner):** the `x_flow4ff` column is missing from this push, so this is by hand from the 60-s mark on A's traced passed rows. All 58 traced: **A2 −2.0% vs A −4.2%** on the same coins (36% sold at 60 s; stops 19% vs 43%; B −9.8%). From 20:00 UK as asked: 4 trades, +13.0% vs +3.6% — nothing. Halves: −4.4% vs −6.7%, then +0.5% vs −1.7%. A2 beats A by about 2 points in both halves by cutting the stop rate in half, and it is still negative; the old 120-s/0.90 version was worse (−6.3%). A2 is a better A, not a profitable one, on 58 trades.

## Snipers (S3, S4, S4b, S10, and the rest briefly)

**S10 — no fill answer yet.** The fingerprint (10 bundle wallets, 37–41%, 22–28 SOL, dev buy < 0.2 SOL) now has **17 launches in the file, 17 of 17 to $200K+, 17 graduated**; four since the last study (Solya The Cat 17:52, Cat Bot 18:56, MAGA Coin 19:59, Moritz The Grok Cat 20:02 UK; 60-s multiple 13–24x from the +4 s price). The operator keeps launching, roughly every 1–3 hours in the evening. The S10 book started at 20:10 UK, eight minutes after the last one, so it has **0 rows and 0 legs**, and the launches file ends at 20:05 UK. The question — does the first outside curve trade fill near the +4 s price or 10x above it — is answered by the next launch. One clue already in the file: C caught all 17 at $150–250K about a minute after launch and A at ~$95K later; from those entries the 5-min result was mixed (C's 5-min sell on them: 9 up, 8 down).

**S3 copycat (shadow since 17:15 UK): 34 legs, +0.174 SOL (+10.0% a trade), win 32%, entry gap +1.4%, exit gap −2.4%.** 18 timed exits +0.368 SOL, 8 stops −0.211, 8 floors +0.017. Paper on the same rows agrees (paper mult mean 1.20). By hour: +0.128, −0.007, −0.085, +0.134, +0.004 — 3 of 5 hours. Paper S3 all-time at 5 min is +1.5% on 91 (1.5x/−40% −5.4%); the 44 rows since the last study +8.7%. Inside S3 there is one split worth a register entry: **rows bought at least 1 s after the launch are +13.9% on 62 (+22.5% on the 31 since 17:05 UK); rows bought in the same second as the launch are −25.0% on 29, win 14%** — the same-second price may be the create trade, which no outsider gets. Registered as F7.

**S4 clean launch (shadow since 17:35 UK): 25 legs, +0.095 SOL (+7.5% a trade), win 28%, entry gap +0.9%.** 13 timed exits +0.163, 4 floors +0.047, 4 stops −0.097, 3 "no exit signal in 7 min" −0.023 (paper had no 5-min mark). By hour: **+0.291, +0.019, −0.069, −0.146** — all the profit was the first hour. Paper S4 at 5 min: +6.3% on 48 (+7.1% on the 24 since 17:05 UK), stop 15%. **S4b** (bundle < 3%) has 4 rows, 2 closed, both −19%; by hand on S4's own rows the split is striking — bundle < 3%: n19 +27.2%, 0 stops; bundle ≥ 3%: n29 −7.4% — but 19 trades, in sample, and the owner picked the threshold from these rows.

**The rest since 17:05 UK (closed, 5-min / 1.5x−40% / runner):** S1 n40 −20.4% / −8.4% / −26.3% (lottery book, 48% stopped) · S2 n142 −5.4% / −12.1% / −12.6% · S5 n139 −5.7% / −6.5% / −8.1% · **S6 n132 −3.0% / −11.9% / −12.9%** — S6 is now −4.3% on 310 on its runner and got worse (−12.9% in the window); the one thing in it that still works is cheap entries: entry MC ≤ $4.15K was +22.0% on 36 to 17:05 UK and +1.5% on the 12 since (0 stops in both; 5-min +6.2% on the 12) · S6b n3 and S7b n5: nothing yet (S6b's shadow entry gap is −9%: the famous wallet's buy moves the curve before the quote) · S7 n54 −24.1% on its rule (+1.7% at 5 min) · S8 n90 −16.2% / −23.6% · S9 n83 −14.2% on every exit (31 shadow legs −0.296) · S11 1 row. Nothing that was dead came back.

## G, F, E2

**G (A's trigger on 150–500-wallet coins).** The 5-min sell that F4 registered at +20.5% on 36 is **−13.0% on the 19 out-of-sample trades (win 53%, stop 42%)**; all 53: +8.9%. By hour it was positive in 9 of the first 13 hours and in 2 of the last 9. The executor's G leg sold at 5 min from 20:10 UK: **2 legs, −0.109 SOL** (one stop at 0.53, one timed +0.033); the 20 runner legs before that −0.333. F4 is 19/40 and losing; the edge the 13:28 and 17:41 studies saw has not survived the evening.

**F (A's coins with a launch bundle of ≤ 3 wallets).** Still 0 legs — but legitimately: **no passed A coin since the 19:45 UK fix had bundle_wallets ≤ 3** (the three such coins in the window were skipped: 224 wallets, DJT-paired, WBTC-paired). On paper F1 is **18 out of sample at −16.5%** (win 44%, stop 44%) against +2.1% for the rest of A in the same window; the 9 since the last study −22.2%. In sample it was +18.4% on 33. Heading for "does not hold up" at 40.

**E2 (E skipping coins already ≥ 1.2× the MC at which A/C/D first bought them, sold at 5 min).** From 16:45 UK: 12 E rows, **9 skipped, 3 taken, 2 closed — both stopped (−50.9%)**; the 8 skipped-and-closed would have made +5.1% at 5 min. Too few to say anything. Over the whole file the split the owner built E2 on is there — taken n21 +25.4% (win 62%) vs skipped n26 −15.4% (win 38%) — but that is the in-sample picture, 47 trades, a 24-point win-rate gap that needs about 80 a side to trust. E itself: +1.0% at 5 min on 50, −6.1% on the 10 since the last study.

## Real costs — does the model still match the legs?

Measured on all 348 closed executor legs (239 PumpSwap, 109 curve; 88 live, the rest shadow at real pool quotes):

| | model | measured (median · mean) | verdict |
|---|---|---|---|
| PumpSwap entry | +2.0% | +1.8% · +2.2% (A live +0.9%, shadow +2.3%; G +1.3%; B +1.9%) | right |
| PumpSwap timed / 5-min / fade sale | −3.3% | h5 −1.7% · −2.8% (53); time −2.9% · −4.1% (26); fade-volume −1.3% · +0.7% (43); close:lowvol −1.5% (18) | right to slightly harsh |
| PumpSwap floor | −3.3% | −2.1% · −6.8% (15) | mean worse than the model (one bad floor) |
| PumpSwap stop | −3.3% − 5% = −8.3% | −2.8% · **−8.8%** (72) | right on the mean; the median stop is mild, a few are −30% |
| curve entry | +0% (inside the 3%) | +1.4% · +1.5% (109) | right |
| curve timed sale | −3% | −3.2% · −3.2% (40) | right |
| curve floor | −3% | −2.7% · −4.2% (18) | right |
| curve stop | −3% − 6% = −9% | −4.8% · **−8.7%** (31) | right |

Realised net against the model applied to the same legs' paper multiples: **PumpSwap −5.9% realised vs −7.8% model (239 legs; stops −47.4% vs −51.4%, non-stops +22.0% vs +21.6%); curve −2.4% realised vs −1.2% model (93 legs with a paper mark; stops −48.7% vs −51.7%, non-stops +22.0% vs +25.3%).** The model is right to within 2 points and errs on the safe side for PumpSwap; on the curve it is 3 points too kind on winners (slippage out of a thin curve) and 3 points too harsh on stops, which cancel. One correction worth making: the fee term (−0.016 and −0.01) is for a 0.1 SOL stake; the shadow books run at 0.05 SOL, where the 0.001 SOL tip alone is 2% a trade — PumpSwap legs at 0.05 SOL realised −11.4% against a model −5.5%. **At 0.05 SOL use −0.026 / −0.02; at 0.25 SOL −0.011 / −0.006.** The S6b legs' −9% entry gap (5 legs) is the one place a book's entry differs from the model, and it is the signal wallet's own buy moving the curve, not the model.

The A5 leg's −31% entry gap is excluded from the medians above: it is a stale paper price (21-s feed lag), not an execution cost — but it is exactly the failure mode an A5 or F6 live leg would meet after a tracker restart.

## Project F

**Searched:** 4,821 rule tests (13 books × 60 entry-time features × quartile thresholds in both directions × 3 exits), plus 75 confirm-price rules (2-/5-/10-s price ≥ 1.02–1.25, re-priced at that price). Bar: ≥ 40 trades, positive at real costs in both halves of the period, judged by hours. 216 passed the raw filter, almost all of them the fs-price illusion (a rule that "knows" the price rose 10 s later and buys at the trigger price — S6 fs10 > 1.25 shows +49% that way and +1% when priced at the 10-s price). Re-priced, **one confirm rule survives and two entry-time rules are worth registering; nothing qualifies as a formula.**

- **F6 — A, 10-s confirm ≥ 1.05, bought at the 10-s price, runner.** n56, **+8.3%**, win 68%, stop 12%; +8.4% on the 45 to 17:05 UK and +7.7% on the 11 after; positive in 12 of 20 hours. The one of 75 confirm rules that passes, so partly selection. Same mechanism as A5 (it is A5 with a later, stricter gate) and the same dependence on a tracker that is within a second of the chain.
- **F7 — S3 copycat, bought ≥ 1 s after the launch, sold at 5 min.** n62, **+13.9%**, win 37%, stop 26%; +5.3% first half, +22.5% on the 31 since 17:05 UK; 6 of 8 hours. The excluded same-second rows are −25% on 29. S3's 34 shadow legs (+0.174 SOL, entry gap +1.4%) say the price is obtainable. Suspicion to settle: the same-second rows may be priced at the create trade.
- **Not registered (max 3, and F5 is the owner's A5):** S6 with entry MC ≤ $4.15K, runner — +22.0% on 36 to 17:05 UK and +1.5% on the 12 since, 0 stops in 48 (flagged last study at 17 trades; the continuation is positive but thin); S4 with bundle < 3% (S4b covers it); E2's split (47 trades, the owner's own rule).
- **Plainly:** no rule with 40+ trades is positive in both halves *and* in two-thirds of its hours *and* independent of the price-read problem. F6 is the closest and it is 56 trades over 20 hours.

## Strategy register

Scored only on trades after each rule's `after_ts`. No existing rule was edited.

| id | rule | out of sample | verdict |
|---|---|---|---|
| S1 | A, sell at 3 min | −8.1% (61) vs baseline −8.1% | **does not hold up** (61/40) |
| S2 | A, wal60 ≤ 65, runner | −11.3% (24) vs −4.1% (61) | waiting 24/40, behind baseline |
| S3 | A, max_share > 0.1, runner | −4.7% (31) vs −4.1% (61) | waiting 31/40, at baseline |
| F1 | A, bundle_wallets ≤ 3, runner | −16.5% (18) vs +2.1% rest of A | waiting 18/40, well behind |
| F2 | tier-1 bundled launch | — | does not hold up (closed 17:41) |
| S4 | E, sell at 5 min | −10.1% (19) | waiting 19/40 |
| F3 | 10-wallet operator, +4 s, 60 s / 5 min (by hand) | 4 launches since: 4 of 4 to $200K+, 60-s 13–24x; fill unknown (S10 0 legs) | waiting 4/20 |
| F4 | G's coins, sell at 5 min (by hand) | **−13.0% (19)**, win 53% | waiting 19/40, losing |
| F5 (new) | A5: A, fs5 ≥ 1.02 at the 5-s price, runner (the owner's) | A5 book: 1 row −50.5%, leg open; rule on A's rows since 20:10 UK: 1 | waiting 1/40 |
| F6 (new) | A, fs10 ≥ 1.05 at the 10-s price, runner | — | waiting 0/40 |
| F7 (new) | S3, bought ≥ 1 s after launch, 5-min | — | waiting 0/40 |

Note for the next study: study.mjs prices F5 and F6 at the trigger price; score them by hand as x_flow4 ÷ fs5_x and ÷ fs10_x.

## What I would do now
Nothing here changes the bot; the owner decides.
- **Keep every PumpSwap trigger book off real money.** A −1.6% on 152, B −6.0%, C −12.5%, 80 −7.7%, D −0.9%; G's 5-min edge is gone (−13.0% on 19 out of sample); F1 −16.5% out of sample. The only PumpSwap rule above zero on 40+ trades is F6 (+8.3% on 56) and it is unproven and clock-dependent.
- **A5: leave it in shadow and fix the clock before judging it.** The one leg filled 31% off paper because the tracker was 21 s behind the chain after the 20:10 UK restart. A5 needs the feed lag logged on its own row (it is on A's) and a guard: do not open if feed_lag_ms > 1,000. Judge it from 40 rows; the 10 A rows that came after the owner's analysis were −13.7%, so expect noise either way.
- **S10: nothing to do but wait** — the operator launched twice in the ten minutes before the book went live and keeps a 1–3-hour cadence in the evening; the first S10 leg answers the fill question better than anything in this report.
- **S3 and S4 are the only shadow books in profit (+0.174 and +0.095 SOL).** S4's profit was all in its first hour; S3's is 3 of 5 hours. If one shadow leg is to be trusted with 0.05 SOL live, S3 at 5 min with the ≥ 1-s filter (F7) is the candidate — after 40 more shadow legs, not now. S6 should drop the runner for its cheap entries only (≤ $4K: 0 stops in 48) or stay paper.
- **Fix the push:** `x_flow4ff` (A2) is missing from abcd.csv; the shadow A5 leg should close when the paper row closes (it has been open 26 min past a tsl80 close).
- **Costs:** keep the real-cost model; add the stake term (at 0.05 SOL the fee share is 2.6%, not 1.6%).

## Next
S10's first legs (fill vs the +4 s price); A5's first 20 rows with the feed lag beside them; F6 and F7 from zero; F4 and F1 reaching 40 (both losing); S4b at 20+; whether S3's same-second rows are the create trade; the tracker's feed lag by hour (3.8 s median in the 20:00 UK hour); E2 on 20+ taken rows; the 20:00–midnight UK band for A (third night: 23 trades −1.3% so far).
