# 4-hour study — 20 Oct 2026 01:45 UK

**Data push:** 01:08 UK (fresh). 4,047 rows since the price fix (18 Oct 20:25 UK) to 20 Oct 01:05 UK. A: 445 fired, 194 passed and closed. C 61 · D 153 · 80-SOL 88 · E 64 passed. Executor legs: 88 live (none since 19 Oct 11:59 UK), 474 shadow. launches.csv: 50,065 launches to 00:05 UK. Every figure below is at the REAL costs (PumpSwap x/1.02 × 0.967 − 0.016, stops −0.05 more; curve x × 0.97 − 0.01, stops −0.06 more; prints above 15x capped) unless it says "paper"; the cost section says where the model now needs correcting.

**Since the 21:40 UK study:** 1,055 new rows, 757 of them snipers; A had 39 more passed trades (**−7.6%, win 41%, stopped 56%** — the worst four hours in the file) and the whole 20:00–midnight UK band of 19 Oct is −5.6% on 38. The executor opened 209 shadow legs in the window: S6b 76 (−0.865 SOL), S3 50 (−0.517), S4 32 (−0.158), G 23 (−1.626 at 0.25 SOL), A5 15 (−0.115), F 12 (−0.677). **Every shadow book lost in the window.** The owner's v0.18.146 landed at 21:50 UK: `x_flow4ff` (A2) is in the push, F6 and S3b exist as paper books (13 and 41 rows), the A5 lag guard stood A5 down on the two coins with 9–13 s feed lag. Feed lag on A's rows was back to a 1.0–1.3 s median from 22:00 UK (3.0 s in the 21:00 UK hour), with single spikes to 40 s in every hour. **S10 has still never fired, although the operator launched 10 fingerprint coins in the window** — see the sniper section. The first A5 shadow leg (Rest in Piss Kim Jong-Un, 20:39 UK) is still open 4.4 hours after its paper row closed.

## Is anything profitable on real prices?

**No. Nothing with 40 or more trades is positive at real costs, and every executor shadow book is now below zero** — S3 (+0.174 SOL at the last study) is −0.343 SOL, S4 (+0.095) is −0.063. The only positive numbers left are small or in-sample: S4b/S4-with-bundle-under-3% (+21.1% on 30 paper rows, picked from those rows), the 80-SOL book's +17.4% on 19 since the last study (Spidey Show 4x and Etchy Cat 2.1x), E's runner +3.5% on 12. F6's +5.0% on 13 is one 4x in a book that stopped 54% of the time.

| book (exit) | trades | real net/trade | win | stop | since 21:40 UK | shadow / live legs (entry gap · exit gap, medians) |
|---|---|---|---|---|---|---|
| A (runner) | 194 | −2.6% | 51% | 43% | n39 −7.6% | live 38 −0.376 SOL (+0.9% · −2.2%), shadow 31 −0.625 |
| B (A sold at 5 min) | 194 | −6.0% | 53% | 37% | n39 −9.4% | live 50 −0.301, shadow 65 −0.711 (+1.9% · −3.8%) |
| C (runner) | 61 | −12.7% | 43% | 41% | n13 −15.0% | shadow 7 +0.027 |
| D (runner) | 153 | −0.4% | 50% | 39% | n30 −0.3% | shadow 26 +0.025 |
| 80-SOL (runner) | 88 | −1.0% | 44% | 45% | n19 +17.4% | — |
| E (runner / 5-min) | 64 | −0.2% / −1.0% | 42% / 50% | 48% / 44% | n12 +3.5% / −2.5% | — |
| E2 (E, MC < 1.2× first A/C/D entry, 5-min) | 6 taken since 16:45 UK | −26.0% | 33% | 67% | n3 +14.4% | — |
| F (A, bundle ≤ 3 wallets, runner) | 63 | +2.0% | 63% | 30% | n13 −19.9% | **shadow 12 −0.677 SOL** (+3.4% · −0.9%), all since 21:25 UK |
| G (A trigger, 150–500 wallets, 5-min) | 82 | −1.6% | 46% | 49% | n32 −20.4% | **shadow 43 −1.959 SOL**; the 23 h5 legs since 20:10 UK −1.626 (+1.0% · −2.9%) |
| **A5 (own row, runner)** | **16** | **−18.0%** | 38% | **56%** | n15 −15.8% | **shadow 15 −0.115 SOL** (+0.6% · −3.8%), 1 leg stuck open |
| A5 rule on A's rows at the 5-s price (F5) | 79 | +1.9% | 58% | 32% | out of sample n19 +0.2%, stop 47% | — |
| F6 (own row, 10 s ≥ 1.05x, runner) | 13 | +5.0% | 38% | 54% | n13 | — (rule on A's rows at the 10-s price: n15 +1.1% out of sample) |
| A2 (A sold at 60 s if < 0.95, else runner) | 53 from 19:00 UTC | −11.0% | 36% | 40% | n39 −14.8% | — (A on the same 53: −5.8%) |
| S1 (5-min) | 126 | −17.5% | 35% | 50% | n24 −23.7% | shadow 9 −0.183 |
| S2 (1.5x/−40%) | 477 | −9.8% | 30% | 31% | n91 −17.9% | — |
| S3 (5-min) | 147 | −3.3% | 34% | 28% | n54 −10.7% | **shadow 84 −0.343 SOL** (+1.4% · −3.7%); 50 since last −0.517 |
| S3b (S3 ≥ 1 s after launch, 5-min) | 41 | −0.7% | 39% | 27% | n41 | — |
| S4 (5-min) | 82 | +1.0% | 34% | 13% | n32 −6.6% | **shadow 57 −0.063 SOL** (+1.4% · −3.7%); 32 since last −0.158 |
| S4b (S4, bundle < 3%, 5-min) | 13 | +6.1% | 23% | 15% | n9 +13.9% | — (by hand on S4's rows: < 3% n30 +21.1%, stop 7%; ≥ 3% n52 −10.6%) |
| S5 (1.5x/−40%) | 523 | −10.4% | 37% | 49% | n88 −8.2% | — |
| S6 (runner) | 423 | −4.8% | 32% | 39% | n90 −7.1% | shadow 9 −0.136 (**entry gap +10.6%**) |
| S6b (5-min) | 81 | −17.6% | 37% | 42% | n76 −17.4% | **shadow 81 −0.892 SOL** (+1.4% · −4.1%) |
| S7 (1.5x/−40%) | 220 | −13.6% | 25% | 37% | n31 −19.3% | — |
| S7b (1.5x/−40%) | 19 | −3.1% | 37% | 26% | n14 −4.2% | — |
| S8 (1.5x/−40%) | 207 | −13.9% | 36% | 51% | n56 −12.7% | — |
| S9 (5-min) | 218 | −10.6% | 23% | 25% | n93 −5.0% | shadow 31 −0.296 |
| S10 (5-min) | **0** | — | — | — | 0 rows, 0 legs, 0 skips | **10 fingerprint launches missed** |
| S11 (5-min) | 31 | −4.8% | 45% | 35% | n30 −3.3% | — |

## A5 and A2

**A5 out of sample: 16 rows, 15 closed legs, −18.0% a trade on paper and −0.115 SOL (−15% of stake) in shadow; 9 of 16 stopped.** The book has been live since 20:10 UK; A passed 46 coins in that time and A5 opened on 16 of them, at 1.02–1.39x A's trigger price (median 1.09x). The execution side is clean: the shadow fill was a median +0.6% above the A5 paper price (the 20:39 UK leg's −31% is the stale-clock case and is excluded; the new lag guard stood A5 down on LEGOCAT and Corgi, 9 and 13 s behind). The premise is what failed: a coin still up 2% at 5 s stopped out **56%** of the time, against 54% for all of A in the same hours — the 25%-vs-40% stop gap the owner built A5 on (51 trades) did not appear on the next 16. The gate also agrees with the data set's `fs5_x` on 15 of 19 qualifying A coins; the two it missed that the column would have taken (kum jung on at 1.0228, NTS-1 at 1.085) both ran, 1.64x and 1.43x. The Rest in Piss shadow leg is still open 4.4 hours after its paper close (opened before the v0.18.146 re-link fix).

**The rule scored on A's own rows (buy at the 5-s price, runner), in sample and out of sample side by side:**

| window | A5 rule (fs5 ≥ 1.02, priced at fs5) | all A |
|---|---|---|
| rows to 17:05 UK (the owner's 19:48 analysis) | **n51 +4.4%, win 63%, stop 25%** | n129 −1.8%, stop 39% |
| 17:05 → 20:10 UK (after the analysis, before the book) | n9 −8.7%, win 56%, stop 33% | — |
| **20:10 UK → now (out of sample)** | **n19 +0.2%, win 47%, stop 47%** | n46 −5.2%, stop 54% |
| all 79 | +1.9%, win 58%, stop 32% | n194 −2.6% |

So on 28 trades since the analysis the rule is −2.7%, and its stop rate has risen from 25% to 47%. The A5 book's own rows (−18.0%) are worse than the rule on A's rows (+0.2%) mainly because the book bought the coins at 1.09x where `fs5_x` says 1.02–1.17x and one row (Slop Coin) sold into a rug at 0.08 in shadow. **F6** (10 s, ≥ 1.05x) looks the same way: in sample +8.4% on 45 and +10.5% on 12, out of sample **+1.1% on 15 with 40% stopped**; the F6 book's 13 rows are +5.0% only because Spidey Show hit the 4x cap, 7 of the 13 stopped. Confirmation gates did not cut the stop rate tonight because the stops came from coins that were up at 5–10 s and collapsed from 1–3 minutes (the night's 55% stop rate on A).

**A2 (sell at 60 s if below 0.95x, else the runner), on the 53 passed A coins since 19:00 UTC with the new `x_flow4ff`:** A2 **−11.0%** vs A −5.8% vs B −7.9% on the same coins; stops 40% vs 55%. The two rules differ on 12 of the 53 coins: A2 avoided 8 stops (sold at a mean 0.82 instead of 0.60, +26 points each) and missed 4 runners (1.35, 1.57, 1.40 and Spidey Show's 4.0). Without Spidey Show A2 is −10.7% vs A −11.2%: the two are the same rule within a point, and one 4x decides the comparison either way. By hour A2 is better in 3 of 6. Two coins (Beans, Rest in Piss) show A2 selling at the stop rather than at 60 s because no trade printed between 60 s and the stop — the 60-s sale needs a tick to price it. A2 is not a profitable A; on 53 trades it is a slightly different way to lose 6–11%.

## Snipers (S3, S4, S4b, S10, and the rest briefly)

**S10 — the book never fired, and the operator launched 10 times.** The fingerprint (10 bundle wallets, 37–41%, 22–28 SOL, dev < 0.2 SOL) now has **21 launches in 24 h, 20 of 21 past $200K (Official Trump Coin, 16:14 UK, peaked $141K), 20 of 21 graduated** (GTA 6 Coin, 22:56 UK, peaked $324K and did not). Ten came after the book went live at 20:10 UK: Etchy Cat 20:58, Cateus Maximus 21:04, Lucia Caminos 21:16, boobs coin 21:54 / 22:08 / 22:24, LEGOCAT 22:13, Milo the Chonk 22:55, GTA 6 Coin 22:56, tit coin 23:55 UK. **S10 has 0 rows, 0 executor legs and 0 skips on any of them, and no other sniper book fired on them either** — S8 (bundle 40–79%, ≥ 20 SOL, from +4 s) should have taken the six at 40.0–41.0%. So the sniper's trade handler is not reaching `fire()` for these mints with the bundle set within 30 s; the two things to check in the code are whether `t.bundle` exists by the first outside trade (launch-monitor sets it at +4 s) and whether `fire()` is rejecting them at `SN_MAX_MC` ($60K — launches.csv says $11–12K at +4 s, but if the first outside trade the handler sees is later, the coin is past $60K by 20–30 s). The fill question (does the first outside trade price near the +4 s price or 10x above it) is therefore still unanswered. What the launches file adds: from the +4 s price the 60-s mark on the ten was 14–42x, **but the 5-min mark has decayed — 25x, 20x, 9.9x, 4.8x, 5.1x, 12x, 13x, 25x, 9.5x, 5.1x** (boobs coin twice and tit coin gave back three-quarters of the 60-s level by 5 min). If S10 ever trades, the exit is 60 s, not 5 min. C caught all 21 at $140–250K about a minute after launch (5-min sell: 11 up, 10 down, −1% net); since 20:10 UK A caught Etchy Cat (1.58x), Lucia Caminos and LEGOCAT (both stopped) and G caught boobs coin three times (one 3.8x, one stop, one rug) and tit coin twice (a rug and a stop).

**S3 copycat (shadow since 17:15 UK): 84 legs, −0.343 SOL; the 50 legs since the last study −0.517 SOL, negative in all four hours (−0.17, −0.07, −0.11, −0.17).** Paper on the same rows: mean multiple 1.054 against a shadow x of 0.918 — a 13-point gap, which is the curve's costs plus the floor problem in the cost section. Paper S3 at 5 min: −3.3% on 147, −10.7% on the 54 since the last study. The F7 split (bought ≥ 1 s after the launch) that was +13.9% on 62 in sample is **−13.1% on its 34 out-of-sample rows**, and the same-second rows it excluded are −6.5% on 20; the S3b book that trades it is −0.7% on 41. The split reversed within four hours.

**S4 clean launch (shadow since 17:35 UK): 57 legs, −0.063 SOL; 32 since the last study −0.158 (one positive hour of four).** Paper S4 at 5 min +1.0% on 82, −6.6% on the 32 since. The bundle split holds on paper: **bundle < 3% n30 +21.1% (stop 7%) vs ≥ 3% n52 −10.6%**, and the 9 new under-3% rows are +13.9%; the S4b book itself is 13 rows +6.1% with a 23% win rate (two winners carry it). That is the one sniper number still positive out of sample, on 9 trades.

**S6b (shadow since 20:40 UK): 81 legs, −0.892 SOL; paper −17.6% on 81.** This book settles something about S6: the S6 paper rows whose smart wallet has 750+ GMGN followers show **+25.7% on 97**, the best "rule" in the whole Project F search — and S6b, which buys the same coins about 1 s later at our feed's price, paid a median 9% (mean 22%) more on the 30 coins both hold and made 0.935 at 5 min where S6's paper made 1.162. S6's 9 shadow legs filled +10.6% above paper. **S6's paper price is the smart wallet's own fill, which no outsider gets; S6b is the honest version and loses 18%.** Every S6 paper result, including the cheap-entry split (first-trade MC ≤ $4.1K: +16.9% at 3 min on 106, stop 7%), is overstated by 10–20 points.

**The rest since 21:40 UK (closed, main exit):** S1 n24 −23.7% · S2 n91 −17.9% · S5 n88 −8.2% · S6 n90 −7.1% · S7 n31 −19.3% · S7b n14 −4.2% · S8 n56 −12.7% · S9 n93 −5.0% (its best four hours, still negative) · S11 n30 −3.3%. Nothing came back.

## G, F, E2

**G (A's trigger on 150–500-wallet coins, sold at 5 min since 20:10 UK).** 23 h5 shadow legs: **−1.626 SOL at 0.25 SOL stake (−28% of stake), win 17%**, 17 stops; four legs sold a rug at 0.03–0.10 (boobs coin, Dacity Cat, Lucia the Baddie, tit coin) — boobs coin and tit coin are the 10-wallet operator's coins, caught at $60–100K after their run. Paper on the same coins since 20:10 UK: −20.4% on 32, 62% stopped. **F4 is 48 trades out of sample at −17.6%, win 35%: does not hold up.** All 43 G legs: −1.959 SOL.

**F (A's coins with a launch bundle of ≤ 3 wallets) — first legs.** 12 shadow legs since 21:25 UK, **−0.677 SOL (−22.5% of stake)**, 4 winners, 7 stops of which two sold into rugs (American Dream 0.20, LOTTO 0.08). The F leg's entry gap is a median +3.4% and five legs paid 7–26% over paper (MrDuck +14%, PackPump +26%, Trump Accounts +14%, LOTTO +10%, Quinelings +7%): the F leg is filled later than A's leg on the same trigger (A live +0.9%), presumably waiting for the bundle lookup. Paper F since the fix: −19.9% on 13; **F1 is 30 out of sample at −16.9% against +0.4% for the rest of A** — well behind, 10 trades from its verdict.

**E2 (E skipping coins already ≥ 1.2× the MC at which A/C/D first bought them, sold at 5 min).** Since 16:45 UK: 24 E rows, 18 skipped, **6 taken: −26.0% at 5 min, 4 of 6 stopped**; the 18 skipped would have made −1.3%. The whole-file split the owner built it on is still there in sample (taken n29 +12.4% vs skipped n35 −12.2%) and the first 6 out-of-sample trades point the other way. Too few to judge; not encouraging.

## Real costs — does the model still match the legs?

Measured on all 558 closed executor legs (287 PumpSwap: 88 live, 199 shadow; 271 curve shadow), the stale-clock A5 leg excluded:

| | model | measured (median · mean) | verdict |
|---|---|---|---|
| PumpSwap entry | +2.0% | +1.6% · +2.2% (0.05 SOL +1.1%, 0.1 +1.7%, 0.25 +1.8%) | right |
| PumpSwap 5-min / timed / fade sale | −3.3% | h5 −1.7% · −2.8% (53); time −2.3% · −3.5% (31); fade-volume −1.3% · +0.3% (51); close:lowvol −1.7% (22) | right |
| PumpSwap floor | −3.3% | −2.1% · −6.5% (16); realised +10.9% vs model +18.0% | 7 points too kind on floors |
| PumpSwap stop | −8.3% | −3.6% · −12.9% (102); realised −49.3% vs model −51.4% (126) | right on the mean; 13 legs sold rugs at 0.03–0.20 where paper said 0.55 |
| curve entry | +0% | +1.4% · +2.9% (271) | right |
| curve timed sale | −3% | −3.6% · −3.4% (94); realised +3.5% vs model +4.9% | right |
| **curve floor** | −3% | **−3.0% median · −11.2% mean (71); realised +1.1% vs model +18.7%** | **18 points too kind** |
| curve stop | −9% | −4.6% · −4.3% (78); realised −46.2% vs model −52.0% | 6 points too harsh |

Realised against the model on the same legs: **PumpSwap −8.7% realised vs −10.0% model (287)** — right to within 1.3 points and on the safe side, as last time; by stake the 0.05 SOL legs are −12.2% vs −7.9% (the fee term should be −0.026 at 0.05 SOL, as said last study; the owner's v0.18.146 makes the website stake-aware). **Curve −13.1% realised vs −8.7% model (247 legs with a paper mark; since the last study −19.6% vs −13.3% on 154)** — the model is now 4.4 points too kind, and the whole gap is the floor exit: the 1.3x floor after 1.5x fires on a thin curve that is already collapsing, and the 71 floor legs realised +1.1% where paper said +18.7%. Correction for the curve, checked on the same legs: **x × 0.97 − 0.02 (0.05 SOL stake), stops −0.01 more (not −0.06), floor exits −0.16 more** → overall −12.4% against −13.1% realised, floors +1.7% vs +1.1%, stops −48% vs −46%. The report's sniper figures above still use the old model, so every curve book with floor exits is 2–5 points better in this table than it would be live; S3's 13-point paper-vs-shadow gap is the live reading of it. The 24 curve legs closed by "no exit signal in 7 min" (no paper 5-min mark) are outside both models.

## Project F

**Searched:** about 50,000 rule tests — 209 entry-time features × 3 quartile thresholds × both directions × 4 exits × every book with 80+ closed rows — with the bar ≥ 40 trades, positive at real costs in both halves of the period, positive in at least 60% of the hours with 2+ trades. 198 passed the raw filter; 114 of those used features a sniper cannot know at its entry (`outside_buyers`, the GMGN holder snapshot at +90 s, `gi_launchpad_progress`, holder counts — the usual look-ahead) and were discarded; of the 84 left, every S6 rule (the best: signal wallet with 750+ followers, +25.7% on 97; signal wallet realised profit > $4.9K, +28.3% on 98) is priced at the smart wallet's own fill and is contradicted by S6b's 81 real legs, so they are discarded too. What remains is PumpSwap:

- **F8 — D, `sol60` ≤ 51, runner.** D's trigger (50 SOL in 60 s) where the trade that crossed the line was small, so the minute's buying reads 50–51 SOL at the trigger rather than jumping past it on one big buy. n81 **+10.2%**, win 59%, stop 31%; halves +11.0% / +9.4%; positive in 14 of 21 hours; at the 5-s fill price +5.8% (≤ 50.89); the 21 since the last study +8.7%. The other half of D (sol60 > 51) is −10.0% on 72. The threshold degrades smoothly (≤ 52: +6.3% on 100; ≤ 55: +4.8% on 118; ≤ 60: +1.3%), and A's rows on the same coins split the same way (+14.3% on 80 vs −7.7% on 71). **Against it:** the same logic on A's own trigger (sol60 ≤ 30.9) is −8.3% on 71, so the mechanism is not consistent across the two levels, and it is one of ~50,000 tests.
- **F9 — A, `n60` ≤ 57, runner.** Fewer than 58 buys in the trigger minute (bigger buys, fewer of them). n50 **+12.5%**, win 64%, stop 26%; halves +14.5% / +10.4%; positive in 8 of 13 hours; at the 5-s fill price +15.6%; at 5 min +10.6%; the 10 since the last study +39.4%. The other 144 A trades are −7.8%. **Against it:** the threshold is a cliff (≤ 65: +2.8% on 66; ≤ 75: −0.3% on 87), its cousin S2 (`wal60` ≤ 65) is 47 out of sample at −0.5% and does not hold up, and 22 of the 50 are also the "entry MC > $54K" rows (+25.6% on those 22, +2.2% on the other 28) — so it may be two small clusters rather than a rule.
- **Not registered:** A entry_mc > $54K runner (n49 +8.8%, 10 of 16 hours; overlaps F9); D `pre_m1_b` ≤ $5,294 (n42 +12.6%, 9 of 11 hours — but the column is filled on only 81 of 153 D rows and reads $5.2–5.5K on a 50-SOL trigger, which looks like a measurement quirk, not a signal); S6 cheap entries (price illusion, above); S4 bundle < 3% (S4b covers it; 30 trades).
- **Plainly:** nothing qualifies as a formula. Two rules clear the arithmetic bar and are registered as hypotheses, with their contradictions written into the notes. The last study's F6 and F7 cleared the same bar and went to +1.1% and −13.1% out of sample within four hours; that is the base rate for finds from a search this wide, and F8/F9 should be read with it.

## Strategy register

Scored only on trades after each rule's `after_ts`. No existing rule was edited. `study.mjs` prices F5 and F6 at the trigger price (its table shows +10.2% / +17.9%; the re-priced figures are below) and cannot score F7 (book S3) or F3/F4 (launch rows / skipped rows) — those are by hand.

| id | rule | out of sample | verdict |
|---|---|---|---|
| S1 | A, sell at 3 min | −8.3% (103) vs baseline −8.3% | **does not hold up** |
| S2 | A, wal60 ≤ 65, runner | −0.5% (47) vs −4.4% (103) | **does not hold up** (47/40: beats the baseline by 4 points, still negative) |
| S3 | A, max_share > 0.1, runner | −1.1% (52) vs −4.4% | **does not hold up** (52/40) |
| F1 | A, bundle_wallets ≤ 3, runner | **−16.9% (30)** vs +0.4% rest of A; 12 shadow legs −0.677 SOL | waiting 30/40, well behind |
| F2 | tier-1 bundled launch | — | does not hold up (closed 17:41) |
| S4 | E, sell at 5 min | −9.2% (33) | waiting 33/40, losing |
| F3 | 10-wallet operator, +4 s, 60 s / 5 min (by hand) | 14 launches since 17:44 UK: 14 of 14 to $200K+, 13 graduated; 60-s 14–42x; 5-min 4.8–25x and falling; **fill unknown — S10 caught 0 of 10** | waiting 14/20; the book is broken |
| F4 | G's coins, sell at 5 min (by hand) | **−17.6% (48)**, win 35%; 23 h5 legs −1.626 SOL | **does not hold up** |
| F5 | A5: A, fs5 ≥ 1.02 at the 5-s price, runner (the owner's) | rule on A's rows: **+0.2% (19)**, stop 47%; A5 book: 16 rows −18.0%, 15 legs −0.115 SOL | waiting 19/40, behind the +4.4% in sample |
| F6 | A, fs10 ≥ 1.05 at the 10-s price, runner | **+1.1% (15)**, stop 40%; F6 book 13 rows +5.0% (one 4x, 7 stops) | waiting 15/40 |
| F7 | S3, bought ≥ 1 s after launch, 5-min | **−13.1% (34)**; S3b book 41 rows −0.7% | waiting 34/40, losing |
| F8 (new) | D, sol60 ≤ 51, runner | — | waiting 0/40 |
| F9 (new) | A, n60 ≤ 57, runner | — | waiting 0/40 |

Of the eight rules old enough to have 15+ out-of-sample trades, none is positive. Note for the next study: score F8/F9 from the table (D and A passed rows, x_flow4) and check them at the 5-s price as well.

## What I would do now
Nothing here changes the bot; the owner decides.
- **No book to real money.** Every PumpSwap book is negative on 60–194 trades; every executor shadow book is below zero, and all six lost in the last four hours (−4.0 SOL of shadow stake in the window, most of it G and F at 0.25 SOL).
- **A5: the first 16 say the premise did not hold, not that the execution failed.** The fill is at paper (+0.6%), the lag guard works, and the coins still stopped 56% of the time. Keep it in shadow to 40 rows, but expect the rule on A's rows (+0.2% on 19 out of sample) rather than the +4.4% in sample. Close the Rest in Piss leg by hand (open 4.4 hours past its paper close). F6 is the same story at +1.1% on 15.
- **S10 is the one thing in this report with information still to come, and it is broken:** 10 fingerprint launches since 20:10 UK, 0 rows, 0 legs, no skip logged — and S8 missed the same coins. Check `fire()`'s `SN_MAX_MC` rejection counter and whether `t.bundle` is set by the first outside trade; log a skip when a fingerprint launch is seen and not taken. When it does trade, judge the fill against the +4 s price and **sell at 60 s** — the operator's 5-min mark has fallen to ~5x on three of the last ten while the 60-s mark is still 18–25x.
- **Switch G and F off shadow.** G is −1.96 SOL on 43 legs (F4 does not hold up at 48 out of sample); F is −0.68 SOL on 12 and F1 is −16.9% on 30. They are costing nothing real but they are no longer telling us anything a paper row doesn't.
- **S6b off; S6 paper is not real.** 81 legs −0.892 SOL, and the S6/S6b comparison shows S6's paper price is the smart wallet's own fill (9–22% below what the next buyer pays). Stop reading S6 paper results.
- **S3 and S4 stay in shadow but are no longer candidates for live money:** S3 lost 0.52 SOL in the last four hours on 50 legs; S4's edge is now only the under-3% bundle split (S4b: +21% on 30 paper, 9 new rows +13.9%) — if anything sniper gets a shadow leg next, S4b is it.
- **Costs:** correct the curve model — floors −0.16, stops −0.01 (not −0.06), fee −0.02 at 0.05 SOL; the PumpSwap model is right to within 1.3 points.
- **Fixes:** the A5 leg stuck open; A2's 60-s sale when no trade prints at 60 s (it falls through to the stop on 2 of 22); a skip record for S10/S8 fingerprint launches not taken.

## Next
S10's first rows and legs once the trigger fires (fill vs +4 s; 60-s vs 5-min); A5 and F6 at 30–40 rows (both near zero now); F8 and F9 from zero at the trigger and 5-s prices; F1 and F7 reaching 40 (both losing); S4b at 20+ out-of-sample rows; whether the stop rate stays above 50% on A tonight (it was 39% over the file, 55% in the last four hours — a market change or a bad night); the curve floor exit after the model correction; the two rugs sold at 0.03–0.04 among the operator's coins (G caught them after the run — a reason for A/C/D/G to skip the fingerprint, not to buy it late).
