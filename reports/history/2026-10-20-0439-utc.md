# 4-hour study — 20 Oct 2026 05:35 UK

**Data push:** 05:08 UK (fresh). 4,848 rows since the price fix (18 Oct 20:25 UK) to 20 Oct 05:05 UK. A: 505 fired, 221 passed and closed. C 75 · D 174 · 80-SOL 99 · E 69 passed. Executor legs: 88 live (none since 19 Oct 11:59 UK), 613 shadow, none open. launches.csv: 50,358 launches to 04:05 UK. Every figure below is at the REAL costs (PumpSwap x/1.02 × 0.967 − 0.016, stops −0.05 more; curve x × 0.97 − 0.01, stops −0.06 more; prints above 15x capped) unless it says "paper"; the cost section says where the model needs correcting. **Note:** the owner's v0.18.147 (S10 without the $60K cap, 04:43 UK) and v0.18.148 (GR and S7b to shadow; F, G, S3, S6b to paper; executor 0.4.2, 05:19 UK) both landed after this push, so every leg here ran under the old modes and the executor still reports 0.4.1.

**Since the 01:45 UK study:** 801 new rows, 684 of them snipers. A had 27 more passed trades (**−5.4%, win 48%, stopped 30%**), by hour −0.9% / +6.3% / +2.4% / −36.3% (01h–04h UK, 5 / 10 / 6 / 6 trades — the 04h UK hour stopped 4 of 6). The executor closed 139 shadow legs in the window for **−0.806 SOL**: S6b 68 (−0.322), S3 22 (+0.134 — all of it one coin, cat cow 7.7x in shadow; the other 21 legs −0.209), S4 20 (−0.123), A5 16 (**+0.086**), F 9 (−0.342), G 4 (−0.239). A5 is the only shadow book that made money in the window and it is still below zero overall. Feed lag on A's rows was a 1.0 s median with a 6 s worst case — the cleanest four hours yet. **S10 still has 0 rows and 0 legs; the operator launched 4 more fingerprint coins in the window (17 since the book went live), all under the old $60K cap; no fingerprint launch after the 04:43 UK fix is in this data yet.** The stuck A5 leg (Rest in Piss) is closed.

## Is anything profitable on real prices?

**No. Nothing with 40 or more trades is positive at real costs, and the one book that looks positive (S3b, +6.8% on 64) is one coin:** without cat cow (9.3x at 5 min) it is −4.7% on 58, win 36%. The 80-SOL book is +0.8% on 99 (zero), D −0.7% on 174 (zero), everything else is negative. The owner's new S7b (moved to shadow at 05:19 UK on "+55% a trade on 33") is +55.6% at 5 min on 32 rows here too — and two coins launched three minutes apart at 04:54–04:57 UK (KFC 10.9x, Super Saiyan 10.3x) are the whole of it: the other 30 are about −4%, median −4.2%. Every executor shadow book is still below zero overall (A5 −0.078 SOL, S3 −0.218, S4 −0.186, S6b −1.238, F −1.018, G −2.198).

| book (exit) | trades | real net/trade | win | stop | since 01:45 UK | shadow / live legs (entry gap · exit gap, medians) |
|---|---|---|---|---|---|---|
| A (runner) | 221 | −2.9% | 50% | 41% | n27 −5.4% | live 38 −0.376 SOL, shadow 31 −0.625 (+1.9% · −0.7%); no legs since 19 Oct 11:59 UK |
| B (A sold at 5 min) | 221 | −5.2% | 52% | 36% | n27 +0.8% | live 50 −0.301, shadow 63 −0.731 (+2.1% · −0.9%) |
| C (runner) | 75 | −12.5% | 41% | 37% | n13 −11.4% | shadow 7 +0.027 |
| D (runner) | 174 | −0.7% | 49% | 39% | n21 −2.7% | shadow 26 +0.025 (+1.6% · −0.6%) |
| 80-SOL (runner) | 99 | +0.8% | 47% | 43% | n11 +14.9% | — |
| E (runner / 5-min) | 69 | −3.6% / −2.7% | 39% / 49% | 51% / 45% | n5 −46.3% / −23.4% | — |
| E2 (E, MC < 1.2× first A/C/D entry, 5-min) | 6 taken since 19 Oct 16:45 UK | −26.0% | 33% | 67% | n0 | — |
| F (A, bundle ≤ 3 wallets, runner) | 72 | −0.7% | 60% | 32% | n9 −19.8% | **shadow 21 −1.018 SOL** (+3.7% · −1.1%); 9 since last −0.342 |
| G (A trigger, 150–500 wallets, 5-min) | 89 | −2.5% | 46% | 49% | n5 −26.6% | **shadow 47 −2.198 SOL**; the 27 h5 legs since 19 Oct 20:10 UK −1.865 (+1.3% · −2.2%) |
| **A5 (own row, runner)** | **32** | **−5.2%** | 50% | 41% | **n16 +7.5%** | **shadow 32 −0.078 SOL** (+0.5% · −0.9%); 16 since last **+0.086** |
| A5 rule on A's rows at the 5-s price (F5) | 94 | +0.9% | 56% | 30% | n15 −4.4% | out of sample n34 −1.8%, stop 35% |
| F6 (own row, 10 s ≥ 1.05x, runner) | 20 | +4.0% | 45% | 45% | n7 +2.3% | — (rule on A's rows at the 10-s price: n23 +0.9% out of sample) |
| A2 (A sold at 60 s if < 0.95, else runner) | 74 from 19 Oct 19:00 UTC | −9.7% | 38% | 31% | n27 −7.4% | — (A on the same 74: −5.9%; B −4.0%) |
| S1 (5-min) | 141 | −18.5% | 33% | 49% | n14 −25.9% | shadow 9 −0.183 |
| S2 (1.5x/−40%) | 546 | −9.5% | 31% | 30% | n67 −7.9% | — |
| S3 (5-min) | 170 | −0.2% | 34% | 27% | n22 +21.1% (cat cow; −16.0% without) | **shadow 107 −0.218 SOL** (+1.4% · −1.1%); 22 since last +0.134 (+0.343 of it cat cow) |
| S3b (S3 ≥ 1 s after launch, 5-min) | 64 | +6.8% | 36% | 23% | n22 +21.8% | — (−4.7% on 58 without cat cow) |
| S4 (5-min) | 101 | −0.4% | 34% | 11% | n19 −6.4% | **shadow 77 −0.186 SOL** (+1.4% · −1.1%); 20 since last −0.123 |
| S4b (S4, bundle < 3%, 5-min) | 22 | −3.4% | 18% | 9% | n9 −17.2% | — (by hand on S4's rows: < 3% n39 +12.3% in all, **the 9 out of sample −17.2%, win 11%**) |
| S5 (1.5x/−40%) | 608 | −11.0% | 37% | 49% | n77 −13.3% | — |
| S6 (runner) | 509 | −3.8% | 33% | 38% | n80 −0.9% | shadow 9 −0.136 (entry gap +10.7%: the paper price is the smart wallet's own fill) |
| S6b (5-min) | 145 | −12.0% | 38% | 39% | n61 −3.2% | **shadow 151 −1.238 SOL** (+1.4% · −1.1%); 68 since last −0.322 |
| S7 (1.5x/−40%) | 241 | −13.1% | 26% | 37% | n20 −10.9% | — |
| S7b (1.5x/−40% / 5-min) | 32 | −0.1% / +55.6% | 47% | 25% | n12 +1.0% | — (5-min median −4.2%; two 10x coins at 04:54–04:57 UK carry the mean) |
| S8 (1.5x/−40%) | 267 | −13.2% | 38% | 51% | n60 −10.8% | — |
| S9 (5-min) | 288 | −12.1% | 24% | 25% | n66 −16.7% | shadow 31 −0.296 |
| S10 (5-min) | **0** | — | — | — | 0 rows, 0 legs, 0 skips | **17 fingerprint launches since the book went live, 4 in the window** |
| S11 (5-min) | 35 | −7.8% | 43% | 40% | n4 −30.9% | — |

## A5 and A2

**A5 out of sample: 32 rows (every one is out of sample — the book started 19 Oct 20:10 UK), 32 closed legs, −5.2% a trade on paper and −0.078 SOL (−4.9% of 1.6 SOL staked) in shadow; 13 of 32 stopped (41%); win 50%.** The last 16 (since the 01:45 UK study) were the book's best stretch: +7.5% on paper, +0.086 SOL in shadow, 10 winners, 4 stops — the 02h and 03h UK hours were +14.8% on 7 and +13.5% on 5, with nothing stopped in the 03h hour. Execution is clean: the shadow fill is a median +0.5% above the A5 paper price (mean −0.6%), the exit gap −0.9%; the Rest in Piss leg is closed and nothing is open. The gate agreed with the data set's `fs5_x` on 29 of the 34 qualifying A coins since 20:10 UK; the 5 it did not take were three coins with feed lag of 5–13 s (LEGOCAT 8.9 s, Corgi 12.6 s — the guard stands A5 down above 8 s — and Justice for Kohen Wiley at 5.0 s, where the tracker's own feed was presumably further behind; all three stopped, so standing down saved three stops) and two it missed at the margin (kum jung on at 1.0228, 1.64x; NTS-1 at 1.085, 1.43x). The 3 A5 rows whose A row shows fs5 < 1.02 are the tracker's own 5-s price differing from the column's.

What the 32 say about the premise: **A's own row on the same 32 coins made +8.1% at real costs (stop 31%), the A5 row −5.2% (stop 41%).** A5 bought the same coins at a median 1.08x A's trigger price (range 1.02–1.38x) and its −40% stop sits 8% higher, so it stopped on 3 coins A held, and it gave back the 8% on every winner. On these 32 the confirmation told us nothing A's trigger did not: the stop rate of A on the A5-confirmed coins (31%) was already the stop rate the owner was hoping A5 would buy. The rule the owner saw (+4.4% on 51, stop 25%) is still there in sample and is −1.8% on 34 out of sample, stop 35%:

| window | A5 rule (fs5 ≥ 1.02, priced at fs5, runner) | all A | rest of A (fs5 < 1.02) |
|---|---|---|---|
| rows to 19 Oct 17:05 UK (the owner's 19:48 analysis) | **n51 +4.4%, win 63%, stop 25%** | n129 −1.7%, stop 40% | n78 −16.5%, stop 49% |
| 17:05 → 20:10 UK (after the analysis, before the book) | n9 −8.7%, win 56%, stop 33% | n19 −2.3% | n10 −12.9% |
| **20:10 UK → now (out of sample)** | **n34 −1.8%, win 47%, stop 35%** | n73 −5.3%, stop 45% | n39 −16.2%, stop 54% |
| all 94 | +0.9%, win 56%, stop 30% | n221 −2.9% | n127 −16.1% |

So the gate does separate the coins: the fs5 < 1.02 half of A is −16% in every window, and the ≥ 1.02 half is 10–15 points better than it everywhere. What it does not do is turn A positive — the ≥ 1.02 half is about zero out of sample (−1.8% on 34 at the 5-s price; +7.2% on the same 34 priced at A's trigger price, which an A5 buyer does not get). **F6** (10 s, ≥ 1.05x) reads the same: in sample +8.4% on 45, out of sample +0.9% on 23 at the 10-s price (stop 30%); the F6 book's 20 rows are +4.0% with 45% stopped (Spidey Show's 4x cap carries it; since the last study +2.3% on 7).

**A2 (sell at 60 s if below 0.95x, else the runner), on the 74 passed A coins since 19 Oct 19:00 UTC with the new `x_flow4ff`:** A2 **−9.7%** vs A −5.9% vs B −4.0% on the same coins; stops 31% vs 46%; win 38% vs 45%. The two rules differ on 19 of the 74: A2 sold 14 coins at 60 s for a mean 0.82 that A later stopped at 0.60 (+22 points each) and sold 5 runners early at 0.78–0.89 that A rode to 1.38, 1.40, 1.57, 1.76 and Spidey Show's 4.0. By hour A2 beats A in 5 of 9; since the last study A2 is −7.4% on 27 vs A −5.4%. The arithmetic has not moved since 01:45: the 60-s sale saves about 22 points on 1 coin in 5 and gives away a runner on 1 in 15, and on 74 trades those cancel to a 4-point loss against A. **A2 is not a profitable A and is not better than A.**

## Snipers (S3, S4, S4b, S10, and the rest briefly)

**S10 — still 0 rows, 0 legs, 0 skips, and 17 fingerprint launches have now passed since the book went live** (4 in the window: Nenem The Cat 01:10 UK, Borly 02:03 and 02:57, Collectooor Inu 02:12). The owner found the cause (the $60K cap — the operator's coins are past $60K by the time the bundle is known at +4 s) and removed it at 04:43 UK; the launches file ends at 04:05 UK (launches must be an hour old) and no fingerprint launch after the fix is in this push, **so the fill question — does the first outside trade price near the +4 s price or 10x above it — is still unanswered, and will be answered by the first S10 row in the 09:45 UK study.** The fingerprint itself keeps paying on paper: 27 launches in 24 h, 25 of 27 graduated, 26 of 27 peaked above $200K (Official Trump Coin $141K); from the +4 s price the 60-s mark on the 17 since 20:10 UK was 14–42x and the 5-min mark 4.8–31x (the window's four: 60 s 20x / 37x / 27x / 40x, 5 min 22x / 32x / 30x / 31x — the four latest held their 60-s level to 5 min, unlike boobs coin and tit coin earlier). C bought all 17 at $150–250K about a minute after launch and sold at 5 min: 10 up, 7 down, and the runner on them 9 up, 8 down. **The operator's coins are the single biggest known edge in the file and the bot has still not bought one; everything hangs on where the first outside trade fills.** What the launch file cannot tell us: the 10 wallets front-run their own curve, so the +4 s price may exist only for them.

**S3 copycat (shadow since 19 Oct 17:15 UK): 107 legs, −0.218 SOL; the 22 legs since the last study +0.134 SOL, all of it cat cow (bought 01:46 UK at 1 s, 9.3x at 5 min on paper, 7.7x in shadow, +0.343 SOL); the other 21 legs −0.209.** Paper S3 at 5 min: −0.2% on 170 (+21.1% on the 22 since the last study, −16.0% without cat cow). The F7 split (bought ≥ 1 s after the launch) is +2.8% on 50 out of sample, which clears the register's bar on arithmetic, and −12.0% on the 49 without cat cow, win 32%, median −5.7% — one 9x in 50 trades is not a rule. S3b (the book that trades F7) is +6.8% on 64, −4.7% without it. S3's paper-vs-shadow gap is unchanged: paper x mean 1.096, shadow 0.960 (−13.6 points), which is the curve's costs plus the floor exit in the cost section.

**S4 clean launch (shadow since 19 Oct 17:35 UK): 77 legs, −0.186 SOL; 20 since the last study −0.123, negative in all four hours.** Paper S4 at 5 min −0.4% on 101, −6.4% on the 19 since. **The under-3% bundle split reversed:** it was +21.1% on 30 at the last study; the 9 out-of-sample rows since are **−17.2%, win 11%** (none stopped — they drifted down to 0.80 and were sold at 5 min). The S4b book is now −3.4% on 22, win 18%. On all 39 under-3% rows it is still +12.3% (two early coins), on the 62 at or above 3% −8.4%. That was the one sniper number still positive at 01:45; it lasted 9 trades.

**S6b (shadow since 19 Oct 20:40 UK): 151 legs, −1.238 SOL; 68 since the last study −0.322** (+0.07 / +0.04 / −0.23 / −0.20 by hour). Paper −12.0% on 145. The S6/S6b reading from the last study stands: S6's paper price is the smart wallet's own fill (9 shadow legs filled +10.7% above it) and S6b, which buys at our feed's price, loses 12–16% whichever way it is priced. The owner moved S6b to paper at 05:19 UK.

**The rest since 01:45 UK (closed, main exit):** S1 n14 −25.9% · S2 n67 −7.9% · S5 n77 −13.3% · S6 n80 −0.9% · S7 n20 −10.9% · S7b n12 +1.0% at 1.5x/−40% (its 5-min mean is the two 10x coins) · S8 n60 −10.8% · S9 n66 −16.7% · S11 n4 −30.9%. Nothing dead came back.

## G, F, E2

**G (A's trigger on 150–500-wallet coins, sold at 5 min since 19 Oct 20:10 UK).** 27 h5 shadow legs: **−1.865 SOL at 0.25 SOL stake (−27.6% of stake), win 19%**, 19 stops, 7 timed, 1 floor; five legs sold rugs below 0.20. The 4 legs since the last study −0.239 SOL. Paper on the same coins since 20:10 UK: −21.2% on 37, 65% stopped. **F4 is 53 out of sample at −18.5%, win 34%: does not hold up**, and the owner has put G back on paper. All 47 G legs: −2.198 SOL.

**F (A's coins with a launch bundle of ≤ 3 wallets).** 21 shadow legs since 19 Oct 21:25 UK: **−1.018 SOL (−19.4% of stake)**, 7 winners, 11 stops (2 rugs), 3 low-volume closes; 9 since the last study −0.342. The F leg's entry gap is a median +3.7% and 9 of 21 paid 5–26% over paper — the F leg fills later than A's leg on the same trigger. Paper: **F1 is 39 out of sample at −17.5%, win 38%, stop 49%, against −5.2% for A as a whole and +0.7% for the rest of A in the same window: does not hold up** (one short of its 40, but 23 points behind with 39 is a verdict). The owner has put F back on paper.

**E2 (E skipping coins already ≥ 1.2× the MC at which A/C/D first bought them, sold at 5 min).** No new E2 trade since the last study (E fired 8 times, 5 closed, all would have been skipped or stopped: E itself is −46.3% on the 5). Still 6 taken since 16:45 UK at −26.0%, 4 stopped; the 23 skipped would have made −6.1%. Too few to judge and nothing new to say.

## Real costs — does the model still match the legs?

Measured on 698 closed executor legs with a paper mark (314 PumpSwap: 88 live, 226 shadow; 384 curve shadow), the stale-clock A5 leg excluded:

| | model | measured (median · mean) | realised vs model | verdict |
|---|---|---|---|---|
| PumpSwap entry | +2.0% | +1.6% · +2.3% (timed), +1.2% · +0.7% (stops); A5 +0.5%, F +3.7% | — | right (F's leg fills late) |
| PumpSwap timed / fade / 5-min sale | −3.3% | −0.9% · −0.6% (125) | realised +25.0% vs model +22.7% | right, 2 points on the safe side |
| PumpSwap floor | −3.3% | −0.5% · −5.1% (16) | realised +10.9% vs model +18.0% | 7 points too kind on floors (16 legs; unchanged) |
| PumpSwap stop | −8.3% | −1.2% · −10.0% (113) | realised −49.5% vs model −51.4% | right; 13 of 113 sold rugs below 0.25 where paper said 0.58 |
| curve entry | +0% | +1.4% · +1.9% (timed); +1.4% · +9.1% (floors) | — | right on the median; floor legs are the ones that paid up |
| curve timed sale | −3% | −1.1% · −1.1% (163) | realised +2.2% vs model +6.4% | 4 points too kind |
| **curve floor** | −3% | −1.1% · −6.2% (105) | **realised +4.5% vs model +19.0%** | **14 points too kind** |
| curve stop | −9% | −1.1% · −1.2% (111) | realised −46.5% vs model −51.5% | 5 points too harsh |

Realised against the model on the same legs: **PumpSwap −8.2% realised vs −9.2% model (314)** — right to within 1 point and on the safe side, as at the last two studies; by stake, 0.05 SOL −7.6% vs −4.8% (the fee term is still 2.8 points light at 0.05 SOL; the website's stake-aware fee from v0.18.146 should cover it), 0.1 SOL −0.4% vs −2.4%, 0.25 SOL −16.8% vs −19.3%. The 29 PumpSwap legs since the last study: −2.2% realised vs −4.8% model. **Curve −11.5% realised vs −6.9% model (384 legs)** — 4.6 points too kind, the same floor problem as last time: the 105 floor legs realised +4.5% where paper said +19.0%. The correction proposed at 01:45 (x × 0.97 − 0.02, stops −0.01 more instead of −0.06, floors −0.16 more) scores **−10.8% on the same 384 legs against −11.5% realised** — right within a point — and by exit type floors +2.1% vs +4.5%, stops −47.5% vs −46.5%, timed +5.6% vs +2.2%. On the 110 curve legs since the last study the floors did better (+11.6% realised vs +19.6% old model), so −0.16 overshoots there (−6.8% corrected vs −5.5% realised); **a floor penalty of −0.12 sits between the two samples. Recommended curve model: x × 0.97 − 0.02, stops −0.01 more, floor exits −0.12 more.** The sniper figures in this report still use the old model, so every curve book with floor exits (S3, S3b, S4, S6b, S9) is 2–4 points better in the table than it would be live. The owner's 0.05-SOL legs on PumpSwap (A5, S-books) carry the 2.6% fee the v0.18.146 note describes, which this model's −0.016 understates by 1 point.

## Project F

**Searched:** about 1,400 rule tests — the entry-time features filled on at least 60% of a book's rows (12–15 a book: the trigger-minute, bundle, creator, copycat, age, depth and market-cap columns; the GMGN columns are blank before 19 Oct 14:50 UK and fall under the fill bar, and the 01:45 study's 50,000-test sweep already covered them; the after-trigger trace, holder snapshots, first-seconds prices and every exit column excluded as look-ahead) × 3 quartile thresholds × both directions × 4 exits × A, C, D, 80 and E on passed rows — with the bar ≥ 40 trades, positive at real costs in both halves of the period, positive in at least 60% of the hours with 2+ trades. 30 passed. Most are the same two families as the last study: F9's (A with fewer, bigger buys in the trigger minute: `n60` ≤ 57, `avg_buy_sol` > 0.58 — 49 of its 55 are F9 rows), and F8's (D with `sol60` ≤ 50.3, +13.2% on 44 at the trigger price but −16.0% on the 3 of the last 4 hours, and F8 itself is −18.7% on its first 9 out of sample). D with a launch bundle of ≤ 2 wallets (+11.6% at 3 min on 44) is F1 on the same coins (43 of the 44 are A's bundle-≤2 coins, where the rule is +0.5% on 57 and −10.4% on the last 9); not registered. What is new:

- **F10 — A, entry market cap > $53K, sell at 3 min.** A takes anything under $100K; the 58 trades that fired above $53K are **+9.3% at real costs, win 66%, stop 17%**, both halves positive (+11.1% / +7.9%), 13 of 17 hours, +9.0% priced at the 5-s price (where only 5% stop); the other 165 A trades are −9.0%, win 47%, stop 32%. The threshold degrades smoothly (> $45K −2.5% on 129, > $50K +3.1% on 77, > $56K +12.2% on 46, > $60K +15.9% on 36) and the mechanism is plausible — a deeper pool (median 84 SOL vs 68) and a coin already proven past the first dump. **Against it:** one coin (French Piccolo, 5.1x at 3 min — a 10-wallet-operator coin A caught at $81K) is most of the mean: without it +2.8% on 57. The claim is therefore the win rate (66% vs 47%, a 19-point gap on 58 vs 165, which is just at the owner's bar) and the stop rate, not the +9.3%. 25 of the 58 overlap F9; the non-F9 part is +11.1% on 31 at the trigger price but +3.9% at the 5-s price. Registered as a hypothesis with those caveats in the note.
- **F11 — D, no single buy more than 11% of the trigger minute (`max_share` ≤ 0.11), runner.** Spread-out buying rather than one whale. **n130 +5.3%, median +6.2%, win 55%, stop 34%**; halves +2.0% / +8.2%; 20 of 30 hours; +3.2% without Spidey Show; +3.3% at the 5-s price; +3.5% on the 48 since 19 Oct 20:10 UK and +5.4% on the 18 of the last four hours. The other 44 D trades are −18.2%, win 30%, stop 52% — a 25-point win-rate gap on 130 vs 44, which clears the owner's bar. The largest sample of anything the search has found. **Against it:** the threshold is a hump (≤ 0.08 +0.6%, ≤ 0.10 +4.5%, ≤ 0.11 +5.3%, ≤ 0.13 +3.4%, ≤ 0.15 +1.5%, ≤ 0.20 +0.3%) and 0.11 is the quartile the search tried, so part of the +5.3% is selection; on A's own trigger the same rule is negative at every threshold (A ≤ 0.11: −5.5% on 124) and the owner's S3 (A, max_share > 0.1 — the opposite direction) did not hold up either, so this is a D-only effect like F8 and may be F8 by another name (a 50-SOL minute made of many small buys). The edge is +3–5%, so it needs 80+ out-of-sample trades, not 40. Registered.
- **Not registered:** S7b at 5 min (+55.6% on 32 — two 10x coins launched three minutes apart in the last ten minutes of the data; −4% on the other 30); S3b / F7 (cat cow); S4 bundle < 3% (reversed out of sample, above); every S6 rule (the price is the smart wallet's own fill).
- **Plainly:** nothing qualifies as a formula. Two rules clear the arithmetic bar and are registered with their contradictions. The base rate from this search is now four for four: F6, F7, F8 and F9 all cleared the same bar and went to +0.9%, −12.0% (ex cat cow), −18.7% and −9.7% out of sample within 4–8 hours. F10 should be read against that.

## Strategy register

Scored only on trades after each rule's `after_ts`. No existing rule was edited; F5 (A5) was already registered at the last study. `study.mjs` prices F5/F6/F8/F9 at the trigger price and cannot score F3/F4/F7; its cost model is the older 0.1-SOL one (fees 3.3% + 2% + 1.6–4.5% by exit) and shows A at −2.2% where the real-cost model says −2.9% — within a point on PumpSwap, and it prices snipers at a flat 10%, which is 1–2 points too kind on timed sales and far too kind on floors (above).

| id | rule | out of sample (real costs) | verdict |
|---|---|---|---|
| S1 | A, sell at 3 min | −7.7% (130) vs baseline −7.7% | **does not hold up** |
| S2 | A, wal60 ≤ 65, runner | −3.1% (60) vs −5.4% (130) | **does not hold up** (beats the baseline by 2 points, negative) |
| S3 | A, max_share > 0.1, runner | −5.6% (60) vs −5.4% | **does not hold up** |
| F1 | A, bundle_wallets ≤ 3, runner | **−17.5% (39)** vs −5.2% baseline, +0.7% rest of A; 21 shadow legs −1.018 SOL | **does not hold up** (39/40, 23 points behind) |
| F2 | tier-1 bundled launch | — | does not hold up (closed 19 Oct 17:41) |
| S4 | E, sell at 5 min | −11.9% (38) | waiting 38/40, losing |
| F3 | 10-wallet operator, +4 s, 60 s / 5 min (by hand) | 20 launches since 19 Oct 17:44 UK: 20 of 20 to $200K+, 18 graduated; 60-s 14–42x; 5-min 4.8–32x; **fill unknown — S10 caught 0 of 17 since it went live; the cap fix landed 04:43 UK** | 20/20 on paper, holds up at the base rate (0.12% of launches reach $200K); the trade is unproven until the book fills one |
| F4 | G's coins, sell at 5 min (by hand) | **−18.5% (53)**, win 34%; 27 h5 legs −1.865 SOL | **does not hold up** |
| F5 | A5: A, fs5 ≥ 1.02 at the 5-s price, runner (the owner's) | rule on A's rows: **−1.8% (34)**, stop 35%; A5 book: 32 rows −5.2%, 32 legs −0.078 SOL (last 16: +7.5%, +0.086 SOL) | waiting 34/40, about zero |
| F6 | A, fs10 ≥ 1.05 at the 10-s price, runner | **+0.9% (23)**, stop 30%; F6 book 20 rows +4.0% (7 stops, one 4x) | waiting 23/40, about zero |
| F7 | S3, bought ≥ 1 s after launch, 5-min | +2.8% (50) vs −1.7% baseline; **−12.0% on the 49 without cat cow**, win 32% | **does not hold up on substance** (clears the arithmetic on one 9x coin) |
| F8 | D, sol60 ≤ 51, runner | **−18.7% (9)** vs −2.7% (21); at the 5-s price −12.4% | waiting 9/40, well behind |
| F9 | A, n60 ≤ 57, runner | −9.7% (6) vs −5.4% (27); at the 5-s price +3.7% | waiting 6/40 |
| F10 (new) | A, entry_mc > $53K, sell at 3 min | — | waiting 0/40 |
| F11 (new) | D, max_share ≤ 0.11, runner | — | waiting 0/80 (small edge) |

Of the nine rules old enough to have 20+ out-of-sample trades, none is positive on substance. Note for the next study: score F10 from A's passed rows (`x_h3`, and `x_h3 / fs5_x`), F11 from D's (`x_flow4`, and at `fs5_x`), and GR (`grf`, the owner's fast-thin-graduation book, shadow from 05:19 UK) from its first rows and legs — its back-test (+33% mean, +16% median on 94) is the owner's in-sample figure and has no out-of-sample trade yet.

## What I would do now
Nothing here changes the bot; the owner decides.
- **No book to real money.** Every book with 40+ trades is negative or zero at real costs; every executor shadow book is below zero overall; the window's 139 shadow legs lost 0.81 SOL.
- **A5: keep it in shadow to 40 and expect zero.** The last 16 made +0.086 SOL and the first 16 lost 0.164; the rule on A's rows is −1.8% on 34 out of sample. The gate works as a filter (the fs5 < 1.02 half of A is −16% in every window) and fails as a trade (A's own row on the same coins is +8.1%, A5's −5.2% — the 8% paid for the confirmation is the whole difference). If the owner wants the gate, the cheaper use is as a skip for A, not as a second buy: A with fs5 ≥ 1.02 priced at the trigger is +7.2% on 34 out of sample — which no bot gets, since the price has moved by the time it knows. That is the circle A5 cannot square.
- **S10 is the one thing with information still to come.** The cap fix is in; the first row will say whether the +4 s price exists for an outsider. If the fill is near +4 s, sell at 60 s (14–42x on paper); if it is 10x above, the book is dead and the study's F3 closes. Nothing to do until then except make sure a skip is logged if the next fingerprint launch is still not taken.
- **S7b to shadow was decided on two coins.** 30 of its 32 rows are about −4% at 5 min; KFC and Super Saiyan (10x each, three minutes apart at 04:54–04:57 UK) are the mean. Shadow costs nothing, but do not read +55% as the book's rate.
- **S4b is no longer a candidate:** −17.2% on its 9 out-of-sample trades, win 11%. S3 and S4 stay as they are; the owner's move of S3 to paper loses nothing (107 legs −0.218 SOL; the shadow confirmed the paper price is obtainable, +1.4%).
- **Costs:** PumpSwap model right within 1 point; curve model 4.6 points too kind — adopt x × 0.97 − 0.02, stops −0.01, floors −0.12. At 0.05 SOL the PumpSwap fee term is 2.8 points light.
- **F10 and F11** are registered, not recommended: watch F10 to 40 and F11 to 80 at the trigger and 5-s prices. If the owner wants one D-side thing to think about, it is that D's losses sit in its 44 whale-led triggers (−18.2%) — a skip, not a buy.

## Next
S10's first rows and legs after the cap fix (fill vs +4 s; 60-s vs 5-min); GR's first rows and legs; A5 at 40 (the second 16 made money — does the third?); F10 and F11 from zero; F5/F6 at 40; S7b without its two 10x coins; whether A's 04h UK hour (−36% on 6, 4 stops) was the start of another bad band; the curve floor exit under the −0.12 correction.
