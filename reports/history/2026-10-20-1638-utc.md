# 4-hour study — 20 Oct 2026 17:40 UK

**Data push:** 17:07 UK (fresh). 7,260 rows since the price fix (18 Oct 20:25 UK) to 20 Oct 17:04 UK. A: 640 fired, 284 passed, 283 closed. C 97 · D 217 · 80-SOL 120 · E 77 passed. Executor 0.4.3: 88 live legs (none since 19 Oct 11:59 UK), 768 shadow closed, 0 open. Modes in status.json: shadow = S4, A5, S10, GR; S7b was put back to paper at 15:45 UK (m043); everything else paper. The new books of v0.18.155–157 (DC, R, AS, DS, K, the GR variants) have no rows in abcd.csv yet. launches.csv: 47,191 launches, 19 Oct 17:05 → 20 Oct 16:05 UK. Every figure below is at REAL costs: PumpSwap x/1.02 × 0.967 − 0.016, stops (x ≤ 0.62) −0.05 more; curve snipers at the v0.18.150 model the page uses (x × 0.97 − 0.02, stops −0.01 more, floor sells −0.12 more; prints above 15x capped; an entry 1.5x+ below the 1-s price scored from that price), with the older curve model from the brief (x × 0.97 − 0.01, stops −0.06) in brackets where it differs — the leg check below says the older one is 3.6 points too kind.

**Since the 13:35 UK study:** 832 new rows, 715 of them snipers. A fired 44 times and passed 19 (**+4.2%, win 68%, stop 16%** — its best 4-hour block since the price fix, though positive in only 1 of its 3 hours; B on the same 19 −2.3%). D +3.1% on 10, C +19.4% on 5 (4 won), 80-SOL +18.9% on 4. The executor closed 66 shadow legs in the window for **−0.277 SOL**: S7b 21 (−0.150, win 24%, now paper), S4 28 (−0.036, win 21%), GR 6 (−0.052: 3 stops), A5 5 (−0.028), **S10 6 (−0.011, 4 of 6 up) — S10's first legs ever**, because v0.18.155 (16:20 UK) moved it to fire on the first PumpSwap swap. S8's +4.6% block from last time did not repeat (−25.5% on 30).

## Is anything profitable on real prices?

**No. Nothing with 40 or more trades is positive at real costs, and nothing with a shadow leg is positive on its legs.** The 80-SOL book is +1.3% on 120 (its two halves by time are −14.9% and +17.5%); GR with the owner's age rule is +3.4% on 28 rows and +0.037 SOL on 25 legs, down from +9.8% last study after a 4-stop window; S4b is +1.8% on 33 with 18% winners (two coins). Everything else is below zero.

| book (exit) | trades | real net/trade | win | stop | since 13:35 UK | shadow / live legs (entry gap · exit gap, medians) |
|---|---|---|---|---|---|---|
| A (runner) | 284 | −2.4% | 52% | 38% | n19 **+4.2%**, win 68% | live 38 −0.376 SOL, shadow 31 −0.625 (+2.4% · −1.6%); none since 19 Oct |
| B (A sold at 5 min) | 284 | −4.8% | 54% | 33% | n19 −2.3% | live 50 −0.301, shadow 65 −0.711 |
| C (runner) | 97 | −9.0% | 46% | 34% | n5 +19.4% (4 won) | shadow 7 +0.027 |
| D (runner) | 217 | −0.6% | 50% | 38% | n10 +3.1%, win 70% | shadow 26 +0.025 (+1.6% · −1.1%) |
| 80-SOL (runner) | 120 | +1.3% (halves −14.9% / +17.5%) | 49% | 42% | n4 +18.9% | — (never had a leg) |
| E (runner / 5-min) | 77 / 75 | −6.4% / −5.1% | 38% / 47% | 53% / 47% | n2: JARVIS 1.42, Pepina 0.60 | — |
| E2 (E, MC < 1.2× first A/C/D entry, 5-min) | 20 taken since 19 Oct 16:45 UK (7 passed) | −8.8% on 19 closed (the 7 passed −29.5%) | 58% | 42% | both E trades of the window were E2 takes: +34.7% / −49.9% on the runner | — |
| F (A, bundle ≤ 3 wallets, runner) | 97 (47 since 19 Oct 19:45 UK) | −0.2% (**−8.6% since 19:45 UK**, rest of A −0.2%) | 60% (47%) | 29% (36%) | n14 +1.3% (rest of A n5 +12.2%) | shadow 22 −1.097 SOL; none since 19 Oct; paper |
| G (A trigger, 150–500 wallets, 5-min) | 107 (55 since 20:10 UK) | −4.7% (**−19.3% since 20:10 UK**) | 46% (33%) | 49% (58%) | n12 −11.6% | shadow 47 −2.198 SOL; none since 04:57 UK; paper |
| **A5 (own row, runner)** | **57** | **−3.3%** | 53% | 37% | n5 −10.5% | **shadow 57 −0.059 SOL (−2.1% of 2.85 staked)**, win 51% (+0.9% · −2.8%); 5 since last −0.028 |
| A5 rule on A's rows at the 5-s price (F5) | 123 | −0.9% | 55% | 30% | n5 −10.3% | out of sample n63 −4.0%, stop 33% (+3.7% at the trigger price) |
| F6 (own row, 10 s ≥ 1.05x, runner) | 33 | +4.5% | 52% | 39% | n2 −36.2% | — (rule on A's rows at the 10-s price: n34 +1.9% out of sample) |
| A2 (A sold at 60 s if < 0.95, else runner) | 137 from 19 Oct 19:00 UTC | −8.0% | 39% | 25% | n19 −6.5% (A +4.2% on the same 19) | — |
| GR (fast thin graduation, 3-min) | 31 (28 with the 10–185 s age rule) | +15.6% (**+3.4% on the 28**, median +18.5%) | 74% (71%) | 26% (29%) | **n7 −29.9%, 4 stopped** | shadow 28 +0.022 SOL (25 ex instant +0.037, win 60%; entry gap +2.4% median, +6.0% mean); 6 since last −0.052 |
| S1 (5-min) | 240 | −24.1% (−22.1%) | 28% | 50% | n42 −31.2% | shadow 9 −0.183 |
| S2 (1.5x/−40%) | 842 | −10.6% | 28% | 28% | n100 −14.3% | — |
| S3 (5-min) | 210 | −6.8% (−3.4%) | 32% | 24% | n16 −17.5% | shadow 107 −0.218 SOL (+1.4% · −3.7%); paper |
| S3b (S3 ≥ 1 s after launch, 5-min) | 104 | −1.7% (+1.9%) | 36% | 20% | n16 −14.3% | — (F7 out of sample n80 −2.6%; −11.9% on 71 without cat cow) |
| S4 (5-min) | 145 | −3.7% (−1.1%) | 30% | 10% | n24 −0.7%, win 25% | **shadow 124 −0.271 SOL** (+1.4% · −3.6%); 28 since last −0.036, win 21% |
| S4b (S4, bundle < 3%, 5-min) | 33 | +1.8% (median −25.9%) | 18% | 15% | n6 +55.4% (one 4.7x; −4.1% without it) | — |
| S5 (1.5x/−40%) | 929 | −11.5% | 35% | 51% | n100 −15.3% | — |
| S6 (runner) | 824 | −8.5% | 30% | 40% | n102 −10.1% | shadow 9 −0.136 |
| S6b (5-min) | 351 | −16.0% (−13.7%) | 31% | 43% | n59 −26.8% | shadow 152 −1.264 SOL; paper |
| S7 (1.5x/−40%) | 341 | −13.5% | 26% | 39% | n44 −10.2% | — |
| S7b (1.5x/−40% / 5-min) | 85 | −11.7% / −16.4% | 32% | 34% | n29 −11.0% / −14.0% | **shadow 47 −0.627 SOL**, win 19%; 21 since last −0.150; paper since 15:45 UK |
| S8 (1.5x/−40%) | 437 | −13.8% | 37% | 51% | n30 −25.5% | — |
| S9 (5-min) | 502 | −11.7% (−10.2%) | 26% | 27% | n68 −17.7% | shadow 31 −0.296 |
| **S10 (5-min, on the pool since 16:20 UK)** | **6** | **−5.6%** (at 60 s +9.5%) | 67% | 33% | all 6 in the window | **shadow 6 −0.011 SOL (−3.6% of stake)**, 4 up, 2 stops; **entry gap +0.1% median — but the paper price is the pool price at $210–256K MC, 16–20x the launch price F3 was scored from** |
| S11 (5-min) | 69 | −16.9% (−14.4%) | 36% | 46% | n30 −21.7% | — |

## A5 and A2

**A5 out of sample: 57 closed rows (every one out of sample — the book started 19 Oct 20:10 UK), 57 closed legs, −3.3% a trade on paper at real costs and −0.059 SOL (−2.1% of 2.85 SOL staked) in shadow; 21 of 57 stopped (37%); win 53%; nothing open.** The 9 trades since the last study moved the paper figure from −6.2% to −3.3% because the earlier count had 48; the 5 rows of this window were −10.5% (Protopia stopped at 0.59; omnichain 0.88; one fade-volume winner at 1.24). By hours: A5 has traded in 19 hours and been positive in 7. Tranches of 16 in trade order: −18.0% / +7.5% / −8.1% / +12.0% (the last tranche is 9 trades). Execution is still clean — the shadow fill is a median +0.9% above the A5 paper price (mean +0.1%), the exit gap −2.8% median; the legs' x averages 0.980 against paper 1.064, which is the cost model and nothing else.

The premise is unchanged: **A's own row on the same 57 coins made +4.7% at real costs (stop 32%; sold at 5 min +2.0%), the A5 row −3.3% (stop 37%).** A5 bought at a median 1.064x A's trigger price, so its stop sits 6% higher and every winner gives 6% back. The rule on A's own rows at the 5-s price, in sample and out of sample side by side:

| window | A5 rule (fs5 ≥ 1.02, priced at fs5, runner) | same coins at A's trigger price | all A | rest of A (fs5 < 1.02) |
|---|---|---|---|---|
| rows to 19 Oct 17:05 UK (the owner's 19:48 analysis) | **n51 +4.4%, win 63%, stop 25%** | +20.9% | n129 −1.7%, stop 40% | n78 −16.5% |
| 17:05 → 20:10 UK | n9 −8.7%, win 56%, stop 33% | +9.4% | n19 −2.3% | n10 −12.9% |
| **20:10 UK → now (out of sample)** | **n63 −4.0%, win 49%, stop 33%; halves +1.1% / −8.9%** | +3.7% | n136 −3.0%, stop 38% | n71 −7.3% |
| of which since 13:35 UK | n5 −10.3% | −3.7% | n19 +4.2% | n13 +12.4% |
| all 123 | −0.9%, win 55%, stop 30% | +11.3% | n284 −2.4% | n159 −12.2% |

Out of sample the gate still picks the better coins at the trigger price (+3.7% vs −7.3% for the rest of A), but at the price an A5 buyer gets, it is −4.0% on 63 and getting worse (second half of the out-of-sample run −8.9%). In this window the gate inverted: the 13 A coins that were *below* 1.02x at 5 s made +12.4%. **F5 does not hold up, now on 63; A5 at 57 is past the owner's bar of 40 with a loss on paper and on its legs.**

**A2 (sell at 60 s if below 0.95x, else the runner), on the 137 passed A coins since 19 Oct 19:00 UTC:** A2 **−8.0%** vs A −3.3% vs B −3.8% on the same coins; stops 25% vs 38%; win 39% vs 50%. The rules differ on 44 of 137: A2 ahead on 23 and behind on 21. Halves −8.5% / −7.4% against A's −3.2% / −3.4%; in this window A2 was −6.5% on the 19 where A was +4.2%. **A2 is behind A in both halves and in the window; not a profitable A.**

## Snipers (S3, S4, S4b, S10, and the rest briefly)

**S10 — the first trades, and the fill answer.** Since v0.18.155 (16:20 UK) the book fires on the first PumpSwap swap after the bundle is known, and it fired 6 times between 16:12 and 17:04 UK: jeanne misanthrope, PokElon, boobs coin (twice, 12 min apart), Pipi, Gatgpt — four of them with the operator's numbers to the decimal (40.93% / 26.87 SOL / dev 0.069). Entry 1–9 s after launch, **on the pool at $210K–$256K market cap**. The one fingerprint launch inside launches.csv's window (Brainrot Language Model, 15:44 UK) shows what that means: its +4 s curve price was $13K MC and it was 20.7x ($269K) at 60 s — so the pool price S10 records as its paper entry is 16–20x the launch price that F3's "19x at 60 s" was scored from. **The shadow buy fills at the paper price (entry gap +0.1% median, −0.1% to +1.4%, 140–300 ms); the paper price is the pool price, and the launch price is not on offer.** F3's trade, as written, cannot be bought; what can be bought is a different trade: the operator's coin at ~$240K a few seconds after it lands on the pool.

That trade's first 6: **legs −0.011 SOL (−3.6% of 0.30 staked), 4 up (three floor sales at 1.29x after a 1.5x peak, one 5-min sale at 1.18), 2 stops (boobs coin 0.57, Pipi 0.53); paper −5.6% at 5 min, +9.5% at 60 s (4 of 6 up at both marks).** The base rate from launches.csv for holding the operator's coins on the pool is poor: on the 25 fingerprint launches with 1-min and 5-min marks, the 5-min MC was a median 0.76x the 1-min MC, 5 of 25 up, **−34% a trade at real costs from 60 s to 5 min (halves −38% / −30%), and 0.49x by 15 min.** These coins peak in their first minute and fade; S10 enters 5 s in rather than 60 s, which is why its 6 did better than that base rate, but 6 trades is 6 trades. The 60-s mark is worth recording beside the 5-min sale from here.

**S3 copycat:** 210 rows −6.8% (older model −3.4%); 16 in the window −17.5%; 107 shadow legs −0.218 SOL, none since it went to paper (03:56 UK). **S3b** (bought ≥ 1 s after launch): 104 rows −1.7%, 16 in the window −14.3%; F7 is 80 out of sample at −2.6% and **−11.9% on the 71 without cat cow.** Does not hold up.

**S4 clean launch (shadow):** 145 rows −3.7% (older model −1.1%), win 30%; **124 legs −0.271 SOL** (−4.4% of stake). The window: 24 rows −0.7% (first half of the window +24%, second −25%), 28 legs −0.036 SOL, win 21%. Since 19 Oct 20:10 UK the book is −9.3% on 104 rows. Entry gap +1.4%, exit gap −3.6%: paper S4 is obtainable and loses. **S4b** (bundle < 3%): 33 rows +1.8%, median −25.9%, win 18%; the 6 in the window +55.4% are Unemployed, But Investing (4.69x) and Formation (2.08x) against four losers — −4.1% without the best one. Two coins in 33 is not a rule.

**S7b** (feed wallet with under 100 followers): back to paper at 15:45 UK, which the data supports — 47 legs −0.627 SOL (−27% of stake), win 19%; the 21 of this window −0.150; 85 rows −11.7% at 1.5x/−40%, −16.4% at 5 min.

**The rest since 13:35 UK (closed, main exit):** S1 n42 −31.2% · S2 n100 −14.3% · S5 n100 −15.3% · S6 n102 −10.1% · S6b n59 −26.8% · S7 n44 −10.2% · S8 n30 −25.5% · S9 n68 −17.7% · S11 n30 −21.7%. Does anything dead come back? No. S8's +4.6% block last time was one block (−25.5% on 30 this time, 63% stopped); S9's +7.7% was two coins (−17.7% on 68 now). Every sniper book is negative in the window, and all of S1, S2, S5, S6b, S7, S8, S9 and S11 are negative in every 4-hour block of the window.

## G, F, E2

**G (A's trigger on 150–500-wallet coins; 5-min leg since 19 Oct 20:10 UK; paper since 05:19 UK).** No new legs (the last closed 04:57 UK); the 27 h5 legs stay at −1.865 SOL. Paper since 20:10 UK: **−19.3% on 55, 58% stopped, win 33%**; F4 is 71 out of sample at −17.7%. The 12 G coins of the window: −11.6%. Does not hold up.

**F (A's coins with a launch bundle of ≤ 3 wallets).** 22 shadow legs −1.097 SOL, none since 19 Oct (paper since 05:19 UK). Paper since the bug fix (19 Oct 19:45 UK): **−8.6% on 47, win 47%, stop 36%, against −0.2% for the rest of A** in the same window; F1 is 64 out of sample at −10.2% vs 0.0% for the rest. The 14 F coins of the window +1.3% against +12.2% for the other 5 A coins. Does not hold up, on 64.

**E2 (E skipping coins already ≥ 1.2× the MC at which A/C/D first bought them, sold at 5 min).** E fired twice in the window (JARVIS at $83K against a first A entry at $76K; Pepina at $63K against $49K), both E2 takes, both passed: JARVIS 1.42x on the runner (+34.7%), Pepina stopped (−49.9%); neither has a 5-min mark in the file yet. Totals since 19 Oct 16:45 UK: 20 taken, 19 closed at −8.8% at 5 min (the 7 passed −29.5%, 5 of 7 stopped); the 37 E2 would have skipped −10.2%. 20 trades, and nothing in it to want.

## Real costs — does the model still match the legs?

Measured on 828 closed executor legs with a paper mark (376 PumpSwap: 88 live, 288 shadow, B/F/G legs included; 452 curve shadow):

| | model | measured (median · mean) | realised vs model | verdict |
|---|---|---|---|---|
| PumpSwap entry | +2.0% | +1.6% · +3.9% (the mean is GR); A5 +0.9% · +0.1%, S10 +0.1%, GR +2.4% · +6.0% | — | right on the median; GR fills a mean 6% above paper |
| PumpSwap timed / fade / 5-min sale | −3.3% | −1.9% · −2.3% (154) | +24.0% vs +25.1% | right, 1 point on the safe side |
| PumpSwap floor | −3.3% | −2.3% · −4.5% (32) | +14.1% vs +18.9% | **5 points too kind on floors** (the standing finding, now 32 legs) |
| PumpSwap stop | −8.3% | −3.8% · −11.8% (130) | −49.7% vs −51.8% | right, 2 points on the safe side |
| curve entry | +0% | +1.4% · +2.9% | — | right on the median |
| curve timed sale | −3% | −3.6% · −3.6% (202) | +1.5% vs +3.2% (older model +4.1%) | 1.7 points too kind |
| curve floor | −15% | −2.8% · −8.1% (118) | +5.4% vs +6.6% (older model +19.4%) | right within a point; the older model is 14 points too kind on floors |
| curve stop | −4% | −4.7% · −6.5% (132) | −47.3% vs −47.3% (older −51.3%) | exact |

In all: **PumpSwap −6.7% realised vs −6.8% model on 376 legs** — exact; the 17 PumpSwap legs of the window −10.5% vs −12.8%. By stake, the 0.05-SOL legs read −3.9% realised against +0.7% from the price-only formula above (138 legs): that is the fixed 0.001 SOL a trade, which the page's model carries (v0.18.146) and the formula in this report does not — at 0.05 SOL add about 2.5 points of cost to every PumpSwap figure in this report; at 0.25 SOL half a point. **Curve: −11.7% realised vs −10.7% on the v0.18.150 model vs −8.1% on the older model in the brief (452 legs)** — the newer model is 1 point kind, the older one 3.6 points too kind, almost all of it on floor sales (+19.4% modelled vs +5.4% realised). The 48 curve legs of the window: −6.7% realised vs −7.5% model. **The model as the page has it is right; no correction this run.** The two standing notes: PumpSwap floor exits are ~5 points too kind (32 legs), and GR's entry gap is +6% on the mean, not +2%.

## Project F

**Searched:** 3,080 rule tests — 88 entry-time features filled on at least 60% of a book's rows (trigger-minute, bundle, creator, copycat, age, depth, market-cap, heat, GMGN holder and smart-money columns, hour of day; the after-trigger trace, holder snapshots, first-seconds prices and exit columns excluded as look-ahead) × 3 quartile thresholds × both directions × 4 exits × A, C, D and 80 on passed rows — with the bar ≥ 40 trades, positive at real costs in both halves of the period, positive in at least 60% of the hours with 2+ trades. 104 passed (35 last time), and the jump is one thing: **the 80-SOL book's second half (+17.5% on 60 after −14.9% on the first 60) now lifts most cuts of it over the bar.** On A and D the survivors are the registered families again (F10's runner variant +10.6% on 71, F12 +12.1% on 55, F11, F13, F8) plus D's bundle_wallets ≤ 2 (+8.2% on 57 — F1's family, which failed on A at −10.2% out of sample). Two cuts of the 80-SOL book stand clear of the rest and are new:

- **F14 — 80-SOL book, pre_30sol_t ≤ 19, runner: the 80-SOL trigger when 30 SOL of the minute's buying was crossed no more than 19 s before the trigger, i.e. about 50 SOL arrived in the last 19 s — a burst, not a drift.** **n40 +31.5% at real costs, median +40.1%, win 70%, stop 22%; halves +45.4% / +17.7%; 9 of 14 hours; positive in 5 of 6 six-hour blocks; +25.2% without the best coin, +16.3% without the best three; +33.3% at the 5-s price; sold at 5 min +8.8%, at 1.5x/−40% +17.5%.** The rest of the 80-SOL book (crossed earlier) is −15.2% on 39. The threshold is a slope, not a hump (≤ 10 s +45.9% on 16, ≤ 15 +31.7% on 30, ≤ 25 +20.0% on 48, ≤ 30 +17.1% on 53, ≤ 40 +9.8% on 72).
- **F15 — 80-SOL book, pool_sol > 74, runner: the 80-SOL trigger when the pool's SOL side after the triggering trade is above 74 SOL (a deep pool).** **n58 +20.9%, median +35.3%, win 62%, stop 28%; halves +30.6% / +14.0%; 13 of 17 hours; 4 of 5 six-hour blocks; +11.2% without the best three; +24.3% at the 5-s price.** The rest −27.1% on 18. The same cut on A is +5.7% on 56 (rest −4.3%) and on D +7.1% on 62 (rest −3.7%) — the only feature in the scan that points the same way on all three trigger books.

**Against them, plainly.** (1) They are one rule twice: 32 rows are in both, at **+42.9%**; the 8 only in F14 are −13.9% and the 25 only in F15 −4.4%. The edge is "a 50-SOL burst into a pool already holding 74+ SOL", and the combination is 32 trades, under the bar. (2) pre_30sol_t and pool_sol are blank on a third of the 80-SOL book's rows (79 and 76 of 120 filled), so each rule is judged on about 80 rows, not 120. (3) The 80-SOL book has never had an executor leg, so a burst buy's entry gap is unmeasured — a coin taking 50 SOL in 19 s may fill well above the +2% the model assumes; the 5-s price check (+33%) is the only evidence it survives slippage. (4) Two 4x-cap trades (Spidey Show, Cure Cancer) are in both rules; the medians (+40%, +35%) say they are not the whole story. (5) It is a cut of a book whose first 60 trades lost 15% and whose second 60 made 17%; a rule found on the good half of a book is the kind that has failed here before. (6) Seven rules have cleared this bar in sample and read out of sample: F5 −4.0% (63), F6 +1.9% (34), F7 −2.6% (80; −11.9% ex cat cow), F8 +0.1% (31), F9 −5.1% (29), F11 +3.5% (30), F12 +0.4% (6), F13 −2.5% (6). None has held its in-sample figure. F14 and F15 are registered with that record stated; the 80-SOL trigger passes about 5 coins per 4 hours, so 40 out-of-sample trades is 1½–2 days away.

**Not registered:** A, entry_mc > $53K on the runner (+10.6% on 71, halves +0.7% / +20.1% — F10's family, which is +0.3% on 14 out of sample on the 3-min sale); D, bundle_wallets ≤ 2 (F1's family); every S6/S7 rule (the paper price is the smart wallet's own fill); S4b (two coins); GR's variants (gr70, gr85, gr-lock) — the buyers-at-graduation count is not in abcd.csv, and x_h3l has 2 rows.

**Plainly:** nothing qualifies as a formula. Two cuts of the 80-SOL book clear the arithmetic by a wide margin — the widest any candidate has — and are registered with their contradictions; they are judged from here on new trades only.

## Strategy register

Scored only on trades after each rule's `after_ts`. No existing rule was edited. `study.mjs` prices F5/F6/F8/F9 at the trigger price and cannot score F3/F4/F7; its cost model is the older 0.1-SOL one (fees 3.3% + 2% + 1.6–4.5% by exit) and it prices snipers at a flat 10%, which the leg check shows is 1.7 points too kind on the curve overall and far too kind on floor sales.

| id | rule | out of sample (real costs) | verdict |
|---|---|---|---|
| S1 | A, sell at 3 min | −6.4% (193) vs baseline −6.4% | **does not hold up** |
| S2 | A, wal60 ≤ 65, runner | −1.2% (95) vs −6.2% rest | **does not hold up** (5 points better than the rest of A, negative) |
| S3 | A, max_share > 0.1, runner | −4.0% (97) vs −3.5% rest | **does not hold up** |
| F1 | A, bundle_wallets ≤ 3, runner | **−10.2% (64)** vs 0.0% rest of A; 22 shadow legs −1.097 SOL | **does not hold up** |
| F2 | tier-1 bundled launch | — | does not hold up (closed 19 Oct 17:41) |
| S4 | E, sell at 5 min | **−14.7% (44)**, stop 50% | **does not hold up** |
| F3 | 10-wallet operator, +4 s, 60 s / 5 min (by hand) | 27 launches since the book went live: 60-s median 19.1x from +4 s, 25 of 27 graduated; **S10 now fires on the pool at $210–256K MC, 16–20x the +4 s price: the launch price cannot be bought.** The pool-side hold (60 s → 5 min) is −34% on 25 launches; S10's own 6 legs −0.011 SOL | **closed as a paper fact**: holds on the curve price, which is not for sale; S10 is a different trade, 6 trades in |
| F4 | G's coins, sell at 5 min (by hand) | **−17.7% (71)**, win 37%, stop 55%; 27 h5 legs −1.865 SOL | **does not hold up** |
| F5 | A5: A, fs5 ≥ 1.02 at the 5-s price, runner (the owner's) | **−4.0% (63)**, stop 33%, halves +1.1% / −8.9% (+3.7% at the trigger price); A5 book 57 rows −3.3%, 57 legs −0.059 SOL | **does not hold up** (in sample +4.4% on 51) |
| F6 | A, fs10 ≥ 1.05 at the 10-s price, runner | +1.9% (34) at the 10-s price (+18.1% at the trigger price); F6 book 33 rows +4.5%, 39% stopped | waiting 34/40, about zero |
| F7 | S3, bought ≥ 1 s after launch, 5-min | −2.6% (80); **−11.9% on the 71 without cat cow** | **does not hold up** |
| F8 | D, sol60 ≤ 51, runner | +0.1% (31) vs −2.4% rest of D | waiting 31/40, about zero |
| F9 | A, n60 ≤ 57, runner | −5.1% (29) vs −0.2% rest | waiting 29/40, behind |
| F10 | A, entry_mc > $53K, sell at 3 min | +0.3% (14) vs −5.1% rest; the runner on all 71 qualifying rows +10.6% | waiting 14/40 |
| F11 | D, max_share ≤ 0.11, runner | +3.5% (30) vs −11.5% rest (12); halves +9.5% / −2.5% | waiting 30/80 (small edge, fading) |
| F12 | D, avg_buy_sol ≤ 0.40, runner | +0.4% (6) | waiting 6/40 |
| F13 | D, cc_best_mc24h > $19K, runner | −2.5% (6) vs +18.2% rest (8) | waiting 6/40 |
| **F14 (new)** | 80-SOL, pre_30sol_t ≤ 19, runner | — | waiting 0/40; in sample +31.5% on 40 |
| **F15 (new)** | 80-SOL, pool_sol > 74, runner | — | waiting 0/40; in sample +20.9% on 58; 32 rows shared with F14 |

Of the twelve rules old enough to have 20+ out-of-sample trades, none is positive on substance. Note for the next study: F14 and F15 from the 80-SOL book's passed rows (`x_flow4`, and at `fs5_x`), and their overlap; GR with the age rule at 40; F6 and F8 reach 40; the 60-s mark on S10.

## What I would do now
Nothing here changes the bot; the owner decides.
- **No book to real money.** Nothing with 40+ trades is positive at real costs; the window's 66 shadow legs lost 0.277 SOL.
- **A5: the question is answered.** 57 trades, −3.3% on paper, −0.059 SOL in shadow, positive in 7 of 19 hours, and the rule on A's own rows is −4.0% on 63 out of sample against +4.4% on the 51 it was built from. Execution is not the fault (fill +0.9%); the 6% paid for the confirmation is. A's plain row on the same 57 coins is +4.7%. Stop it, or keep the shadow leg only as a gap meter.
- **S10: keep the shadow leg, change what it is judged on.** The fill is fine; the trade is not F3's. The executor buys the operator's coin at ~$240K on the pool, and the file says these coins are at their best in the first minute (5 min at 0.76x of 1 min, −34% a trade on 25 launches). S10's 6 legs are −0.011 SOL at 5 min and would have been +9.5% at 60 s. Record the 60-s mark beside the 5-min sale and judge both at 40; expect the base rate, not the first six. The operator launched four coins in 52 minutes this window (two called boobs coin) — he is also the supply.
- **GR: judge at 40, now +3.4% on 28.** The 4-stop window took it from +9.8% to +3.4% on paper and from +0.053 to +0.037 SOL on its 25 clean legs; still the only positive shadow book, and still inside what 28 trades can swing.
- **S4: nothing to wait for** — 124 legs −0.271 SOL, 104 rows −9.3% since 19 Oct 20:10 UK, 1 win in 5 in the window. S4b is two coins in 33. S7b to paper was right (47 legs −0.627).
- **F14 / F15 (the 80-SOL burst into a deep pool):** the strongest in-sample numbers any study here has produced (+31.5% on 40, median +40%, 70% winners, positive in 5 of 6 six-hour blocks), from a book with no executor leg and no entry-gap measurement. If the owner wants one thing to test, it is a shadow leg on the 80-SOL trigger gated on pre_30sol_t ≤ 19 and pool_sol > 74 — the 32-row overlap at +42.9% — so that the fill on a 50-SOL burst is measured before anyone believes the paper. Seven rules have cleared this bar before and none held; this one is wider, and still a hypothesis.
- **Costs:** the page's model is right — PumpSwap within a tenth of a point on 376 legs, curve within a point on 452 with the v0.18.150 model. The brief's older curve model (−0.01, stops −0.06) is 3.6 points too kind and should not be used. PumpSwap floor exits stay ~5 points too kind (32 legs).

## Next
F14/F15 out of sample from the 80-SOL book (and at the 5-s price); the 60-s mark on S10 and whether the operator's launches keep coming; GR to 40 with the age rule; F6 and F8 at 40; PumpSwap floor exits (5 points too kind on 32 legs); A5 — whether the owner stops it at 57; the new books (DC, R, AS, DS, K) once they have rows.
