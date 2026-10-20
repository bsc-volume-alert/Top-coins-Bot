# 4-hour study — 20 Oct 2026 09:35 UK

**Data push:** 09:08 UK (fresh). 5,642 rows since the price fix (18 Oct 20:25 UK) to 20 Oct 09:03 UK. A: 548 fired, 241 passed, 240 closed. C 83 · D 188 · 80-SOL 106 · E 69 passed. Executor legs: 88 live (none since 19 Oct 11:59 UK), 646 shadow closed, 1 open (A5 on RIPPED, 09:02 UK). launches.csv: 50,523 launches to 08:05 UK. Executor 0.4.2; the modes in status.json are the owner's 05:19 UK set (shadow: A5, S4, S10, S7b, GR; everything else paper). Every figure below is at REAL costs: PumpSwap x/1.02 × 0.967 − 0.016, stops (x ≤ 0.62) −0.05 more; curve snipers at the v0.18.150 model the page now uses (x × 0.97 − 0.02, stops −0.01 more, floor sells −0.12 more; prints above 15x capped; a sniper entry 1.5x+ below the 1-s price scored from that price) — the older curve model (x × 0.97 − 0.01, stops −0.06) is given in brackets where it differs, and the cost section shows the newer one is the right one.

**Since the 05:35 UK study:** 802 new rows, 735 of them snipers. A had 18 more passed trades (**+0.5%, win 56%, stopped 17%** — the lowest stop rate of any four-hour window; B on the same 18 −3.4%). The executor closed 33 shadow legs in the window for **−0.214 SOL**: S7b 9 (−0.153, win 11%), A5 5 (−0.033), F 1 (−0.079), S6b 1 (−0.026), S4 8 (**+0.062**, its first positive window), GR 9 (+0.015). **S10 still has 0 rows, 0 legs and 0 skips — and this time it had its chance: two fingerprint launches came after the owner's 04:43 UK cap fix (GTAVI AudaCity at 04:50 and 05:04 UK), both went 17.6x / 17.9x at 60 s, and neither was taken nor logged as a skip.** The window's new books: GR (fast thin graduations, shadow) has 10 rows and 9 legs; S7b's "+55% a trade" from the last study is gone — the owner's v0.18.149 late-price rule now scores KFC and Super Saiyan (instant graduations) from the price 1 s after entry, and the book is −12.0% at 5 min on 39.

## Is anything profitable on real prices?

**No book with 40 or more trades is positive at real costs.** The only positive numbers are GR (+51.6% on 10 paper rows, two of which are the instant graduations the owner has since excluded; its 9 shadow legs made +0.015 SOL, win 44%), F6 (+5.4% on 21, one 4x), and S3b (+3.1% on 80, which is cat cow: −2.7% on the other 79). The 80-SOL book is −0.1% on 106, D −0.9% on 188. Every executor shadow book is below zero overall except GR (+0.015 on 9) and C/D's old legs (+0.027 / +0.025 on 7 / 26).

| book (exit) | trades | real net/trade | win | stop | since 05:35 UK | shadow / live legs (entry gap · exit gap, medians) |
|---|---|---|---|---|---|---|
| A (runner) | 240 | −2.6% | 51% | 39% | n18 +0.5% | live 38 −0.376 SOL, shadow 31 −0.625 (+1.9% · −0.7%); none since 19 Oct 11:59 UK |
| B (A sold at 5 min) | 240 | −4.9% | 53% | 34% | n18 −3.4% | live 50 −0.301, shadow 65 −0.711 (+2.3% · −2.3%) |
| C (runner) | 83 | −12.1% | 42% | 37% | n8 −8.4% | shadow 7 +0.027 |
| D (runner) | 188 | −0.9% | 48% | 38% | n13 −5.4% | shadow 26 +0.025 (+1.6% · −0.6%) |
| 80-SOL (runner) | 106 | −0.1% | 46% | 44% | n6 −22.8% | — |
| E (runner / 5-min) | 69 | −3.6% / −2.7% | 39% / 49% | 51% / 45% | n0 | — |
| E2 (E, MC < 1.2× first A/C/D entry, 5-min) | 11 taken since 19 Oct 16:45 UK (6 passed the filters) | −8.8% (the 6 passed: −26.0%) | 55% | 45% | n4, all filter-skipped coins | — |
| F (A, bundle ≤ 3 wallets, runner) | 78 | −0.5% | 59% | 29% | n6 +1.5% | **shadow 22 −1.097 SOL** (+3.5% entry); 1 since last −0.079; paper since 05:19 UK |
| G (A trigger, 150+ wallets, 5-min) | 91 | −3.1% | 45% | 49% | n2 −30.3% | **shadow 47 −2.198 SOL**; the 27 h5 legs −1.865 (−27.6% of stake); no legs since 04:56 UK; paper now |
| **A5 (own row, runner)** | **37** | **−6.5%** | 46% | 41% | **n5 −14.2%** | **shadow 37 −0.111 SOL (−6.0% of 1.85 staked)** (+0.9% · −1.0%); 5 since last −0.033 |
| A5 rule on A's rows at the 5-s price (F5) | 103 | −0.4% | 54% | 30% | n9 −13.6% | out of sample n43 −4.3%, stop 35% |
| F6 (own row, 10 s ≥ 1.05x, runner) | 21 | +5.4% | 48% | 43% | n1 +33.2% | — (rule on A's rows at the 10-s price: n23 +0.9% out of sample) |
| A2 (A sold at 60 s if < 0.95, else runner) | 93 from 19 Oct 19:00 UTC | −10.1% | 35% | 26% | n18 −10.9% | — (A on the same 93: −4.4%; B −3.7%) |
| **GR (fast thin graduation, 3-min)** | **10** | **+51.6%** (8 without the two instant graduations: +13.4%) | 90% | 10% | n10 (all new) | **shadow 9 +0.015 SOL** (entry gap +2.9% median; +272% and +194% on the two instant graduations) |
| S1 (5-min) | 175 | −23.1% (−20.7%) | 28% | 49% | n32 −20.8% | shadow 9 −0.183 |
| S2 (1.5x/−40%) | 657 | −10.4% | 28% | 30% | n104 −6.3% | — |
| S3 (5-min) | 186 | −5.1% (−1.8%) | 32% | 26% | n16 +8.8% | shadow 107 −0.218 SOL (+1.4% · −1.1%); paper since 05:19 UK |
| S3b (S3 ≥ 1 s after launch, 5-min) | 80 | +3.1% (+7.1%) | 36% | 24% | n16 +10.4% | — (−2.7% on 79 without cat cow; −8.8% on 78 without Alt-coin too) |
| S4 (5-min) | 110 | −2.8% (0.0%) | 33% | 11% | **n8 +14.5%** | **shadow 85 −0.123 SOL** (+1.4% · −1.1%); **8 since last +0.062** |
| S4b (S4, bundle < 3%, 5-min) | 25 | −8.3% | 16% | 12% | n2 +3.6% | — (by hand on S4's rows: < 3% n42 +8.7% in all, the 25 out of sample −6.9%, win 16%) |
| S5 (1.5x/−40%) | 731 | −11.8% | 34% | 50% | n114 −17.0% | — |
| S6 (runner) | 630 | −7.6% | 30% | 40% | n111 −13.2% | shadow 9 −0.136 (entry gap +10.7%: the paper price is the smart wallet's own fill) |
| S6b (5-min) | 213 | −16.3% (−13.4%) | 33% | 42% | n61 −9.9% | shadow 152 −1.264 SOL; 1 since last −0.026; paper now |
| S7 (1.5x/−40%) | 277 | −13.5% | 24% | 38% | n34 −14.5% | — |
| **S7b (1.5x/−40% / 5-min)** | 39 | **−7.8% / −12.0%** | 36% | 33% | n9 −29.5% / −33.3% | **shadow 9 −0.153 SOL (−34% of stake), win 11%** |
| S8 (1.5x/−40%) | 349 | −15.5% | 34% | 54% | n69 −19.6% | — |
| S9 (5-min) | 358 | −13.6% (−12.2%) | 25% | 26% | n69 −13.5% | shadow 31 −0.296 |
| S10 (5-min) | **0** | — | — | — | 0 rows, 0 legs, 0 skips | **2 fingerprint launches after the cap fix, both missed; 29 since the book went live** |
| S11 (5-min) | 36 | −11.9% | 42% | 42% | n1 −45.5% | — |

## A5 and A2

**A5 out of sample: 37 closed rows (every one out of sample — the book started 19 Oct 20:10 UK), 37 closed legs, −6.5% a trade on paper at real costs and −0.111 SOL (−6.0% of 1.85 SOL staked) in shadow; 15 of 37 stopped (41%); win 46%; 1 open (RIPPED, 09:02 UK).** The 5 since the last study were −14.2% on paper and −0.033 SOL in shadow (1 winner, 2 stops, 2 low-volume closes). The three tranches read: first 16 −0.164 SOL, second 16 +0.086, last 5 −0.033 — the 02h–03h UK run the last study flagged (+14.8% on 7, +13.5% on 5) did not continue. Execution is still clean and the entry gap is the smallest of any PumpSwap book: the shadow fill is a median +0.9% above the A5 paper price (mean −0.4%), the exit gap −1.0% median (−3.4% mean, pulled by the stops); leg x mean 0.941 against paper 1.025, which is the cost model's 8 points, no more.

The premise has not changed on 37: **A's own row on the same 37 coins made +5.1% at real costs (stop 32%; sold at 5 min +4.2%), the A5 row −6.5% (stop 41%).** A5 bought at a median 1.074x A's trigger price (range 1.02–1.38x), so its −40% stop sits 7% higher and it gives back 7% on every winner. The confirmation picks coins A already does well on; the price paid for the confirmation is the whole difference. The rule on A's own rows at the 5-s price, in-sample and out-of-sample side by side:

| window | A5 rule (fs5 ≥ 1.02, priced at fs5, runner) | same coins at A's trigger price | all A | rest of A (fs5 < 1.02) |
|---|---|---|---|---|
| rows to 19 Oct 17:05 UK (the owner's 19:48 analysis) | **n51 +4.4%, win 63%, stop 25%** | +20.9% | n129 −1.7%, stop 40% | n78 −16.5% |
| 17:05 → 20:10 UK | n9 −8.7%, win 56%, stop 33% | +9.4% | n19 −2.3% | n10 −12.9% |
| **20:10 UK → now (out of sample)** | **n43 −4.3%, win 44%, stop 35%** | +3.6% | n91 −3.3%, stop 38% | n48 −9.6% |
| of which since 05:35 UK | n9 −13.6%, win 33%, stop 33% | −9.9% | n18 +0.5%, stop 17% | n9 +10.9% |
| all 103 | −0.4%, win 54%, stop 30% | +12.7% | n239 −2.4% | n136 −13.8% |

Out of sample the gate still separates the coins (the fs5 < 1.02 half of A is −9.6% vs the ≥ 1.02 half +3.6% at the trigger price), but at the price an A5 buyer gets it is −4.3% on 43, and in the last four hours the gate picked the wrong half: the 9 coins it took were −13.6% and the 9 it left +10.9%. F5 is 43 of 40 out of sample and negative: by the register's own bar it does not hold up. F6 (10 s, ≥ 1.05x) is +16.5% on 23 at the trigger price and +0.9% at the 10-s price — the same shape; the F6 book's 21 rows are +5.4% with 43% stopped.

**A2 (sell at 60 s if below 0.95x, else the runner), on the 93 passed A coins since 19 Oct 19:00 UTC:** A2 **−10.1%** vs A −4.4% vs B −3.7% on the same coins; stops 26% vs 40%; win 35% vs 47%. The two rules differ on 31 of the 93: A2 came out ahead on 17 (sold at 60 s for a mean 0.83 where A later stopped at 0.59) and behind on 14, five of them runners A rode to 1.5–4.0x (Spidey Show 4.0, Tetsuo 1.77, Justice for Lacy 1.76, Evolve 1.53, Cup Otter 1.46). Since the last study A2 is −10.9% on 18 vs A +0.5%. On 93 the arithmetic is the same as at 74: the 60-s sale saves about 24 points on 1 coin in 5 and gives away a runner on 1 in 7, which nets to 6 points behind A. **A2 is not a profitable A and is behind A in both halves (−11.0% / −9.2% vs −6.2% / −2.6%).**

## Snipers (S3, S4, S4b, S10, and the rest briefly)

**S10 — 0 rows, 0 legs, 0 skips, and the cap was not the whole cause.** Two fingerprint launches came after the 04:43 UK fix and inside this file's launch window (launches must be an hour old; the file runs to 08:05 UK): GTAVI AudaCity at 04:50 UK (39.96%, 25.1 SOL, 10 wallets, dev 0) and again at 05:04 UK (40.35%, 25.1 SOL). Both graduated inside their first minute (MC $11.8K at +4 s → $208K at 60 s, 17.6x and 17.9x; 10.0x and 13.6x at 5 min; the second peaked at $1.67M). Neither has an S10 row, a leg, or a skip. C bought both at $208K about a minute in (0.59 and 1.25 at 5 min); A and D bought the first at $99.6K and stopped. **The broader fact, which the fill question turns on: no sniper book of any kind has a row on any of the 27 fingerprint launches in the file** — not S8 either, whose tier-1 rule (40–79% of supply, ≥ 20 SOL in the create block, bought on the first trade after +4 s) covers the 12 fingerprint launches at 40–41%, and S8 has 13 rows on other 10-wallet launches. So the first outside curve trade on an operator coin is not reaching the sniper path at all. The likeliest readings: the coin is off the curve (graduated) before the tracker's +4 s bundle read finishes, so v0.18.149's no-graduated-coins rule stops every sniper; or the 10 wallets' own follow-up buys are the only curve trades and are not "outside". Either way **the +4 s paper price has still never been offered to an outsider, and after 29 launches since the book went live the working assumption should be that it cannot be bought on the curve.** The fingerprint itself is unchanged: 27 launches in 24 h, 25 graduated, 26 peaked above $200K; from the +4 s price the 19 since 20:10 UK were a median 20x at 60 s (14–42x) and 13.6x at 5 min (4.8–32x). What can be bought is the pool: A/C/D's 57 rows on fingerprint coins (bought at $100–250K, 1–2 min in) are −13.2% on the runner and +0.3% at 5 min, stop 46–58%. The edge lives in the first 60 s and nothing we have reaches it.

**S3 copycat:** 186 rows −5.1% (old model −1.8%), 16 since the last study +8.8% (two coins — tout va binu 5.2x and a 1.9x — against 9 losers); 107 shadow legs −0.218 SOL, no new legs since the owner put it on paper. **S3b** (bought ≥ 1 s after launch): 80 rows +3.1%, but −2.7% on 79 without cat cow and −8.8% on 78 without Alt-coin as well; the F7 split is +5.2% on 63 out of sample and −7.6% on the 62 without cat cow, win 31%, median −8.1%. The verdict stands: one 9x in 63 trades is not a rule.

**S4 clean launch (shadow):** 110 rows −2.8% (old model 0.0%), 85 legs −0.123 SOL (−2.9% of stake). **The 8 rows / 8 legs since the last study were S4's first positive window: +14.5% on paper, +0.062 SOL in shadow** — Nya Mint 1.45x at 5 min and one 2.4x against five small losers; 8 trades, one hour of the day, nothing to act on. S4's entry gap is a steady +1.4% and the exit gap −1.1%, so paper S4 is obtainable. **S4b** (bundle < 3%): the book is −8.3% on 25, win 16%; by hand on S4's rows the under-3% split is +8.7% on 42 overall and −6.9% on the 25 out of sample (win 16%). Still reversed.

**S7b** (feed wallet with under 100 followers, moved to shadow at 05:19 UK on "+55% a trade on 33"): the two coins that made that number, KFC and Super Saiyan, were instant graduations and v0.18.149 now scores them from the 1-s price, so the book reads **−7.8% at 1.5x/−40% and −12.0% at 5 min on 39**; the 9 rows since the last study −29.5% / −33.3%, 5 stopped; **its first 9 shadow legs −0.153 SOL (−34% of stake), 1 winner.** Without the normie (4.1x) it is −16.6% on 38.

**The rest since 05:35 UK (closed, main exit):** S1 n32 −20.8% · S2 n104 −6.3% · S5 n114 −17.0% · S6 n111 −13.2% · S6b n61 −9.9% (1 shadow leg −0.026 before it went to paper) · S7 n34 −14.5% · S8 n69 −19.6% · S9 n69 −13.5% · S11 n1 −45.5%. Nothing dead came back; S2 (−6.3% on 104) and S6b (−9.9% on 61) had their best windows and are still well under water.

## G, F, E2

**G (A's trigger on 150–500-wallet coins; 5-min leg since 19 Oct 20:10 UK; paper since 05:19 UK).** No new legs (the last closed 04:56 UK). The 27 h5 legs stay at −1.865 SOL (−27.6% of stake), win 19%, 19 stops. Paper since 20:10 UK: **−21.7% on 39, 64% stopped**; F4 is 55 out of sample at −18.9%, win 33%. Two G coins in the window: −30.3%. **Does not hold up; nothing new.**

**F (A's coins with a launch bundle of ≤ 3 wallets).** 22 shadow legs −1.097 SOL (−20% of stake): 7 fade-volume winners +0.489, 11 stops −1.455, 4 low-volume closes −0.131; the 1 leg since the last study −0.079. Entry gap median +3.5%, still the worst of the PumpSwap books. Paper: F1 is 45 out of sample at **−15.0%, win 40%, stop 42%, against +0.8% for the rest of A in the same window**; the 6 F coins in the window +1.5% (none stopped). **Does not hold up** (45 of 40, 16 points behind the rest of A).

**E2 (E skipping coins already ≥ 1.2× the MC at which A/C/D first bought them, sold at 5 min).** E fired 6 times in the window; E2 would have taken 4, all coins the website's filters skip (pass = 0: Trumpius Maximus 1.28, MEOWAIR 1.59, no money 1.27, catos 1.29 at 5 min — all four up). The passed E2 trades are still the 6 from before at −26.0%; all 11 E2-taken rows −8.8%, the 28 skipped −6.1%. Too few to judge; the four winners in the window are coins E2 could not have bought under the page's own filters.

## Real costs — does the model still match the legs?

Measured on 707 closed executor legs with a paper mark (327 PumpSwap: 88 live, 239 shadow; 380 curve shadow), the stale-clock A5 leg excluded:

| | model | measured (median · mean) | realised vs model | verdict |
|---|---|---|---|---|
| PumpSwap entry | +2.0% | +1.9% · +6.2% (timed; the mean is GR's two instant graduations at +272% / +194%), +1.6% · +1.2% (stops); A5 +0.9%, F +3.5%, GR +2.9% | — | right on the median; GR's instant graduations are the owner's v0.18.153 fix |
| PumpSwap timed / fade / 5-min sale | −3.3% | −1.9% · −1.5% (170) | +23.5% vs +24.4% | right |
| PumpSwap floor | −3.3% | −2.3% · −6.7% (18) | +9.1% vs +18.2% | 9 points too kind on floors (18 legs; unchanged finding) |
| PumpSwap stop | −8.3% | −3.4% · −11.9% (139) | −49.3% vs −51.5% | right, 2 points on the safe side |
| curve entry | +0% | +1.4% · +2.4% (timed); +1.4% · +8.9% (floors) | — | right on the median |
| curve timed sale | −3% (new model) | −3.5% · −3.5% (150) | +6.9% vs +9.2% | 2 points too kind |
| curve floor | −15% (new model) | −2.8% · −7.9% (108) | +5.7% vs +6.9% | right (the old model said +19%) |
| curve stop | −4% (new model) | −4.6% · −4.9% (122) | −46.9% vs −47.7% | right |

In all: **PumpSwap −8.2% realised vs −8.2% model on 327 legs — exact**; by stake 0.1 SOL −0.2% vs −3.3%, 0.25 SOL −17.0% vs −19.5%, and 0.05 SOL −7.9% vs −0.4%, where the 7.5-point gap is almost all GR's two instant-graduation legs (paper 3.58x / 2.51x, real 0.91 / 0.81) — without them the 0.05-SOL legs are about 2–3 points light, the same fee term the last study noted. The 11 PumpSwap legs of the window: −12.0% realised vs +28.3% model, entirely those two legs; the owner's fix (grf needs the coin 10–185 s old at graduation) removes the case. **Curve: −10.7% realised vs −9.7% on the v0.18.150 model vs −6.9% on the older model (380 legs)** — the newer model is right within a point, the older one 3.8 points too kind, so the sniper figures in this report use the newer one. The 20 curve legs of the window: −7.6% realised vs −9.1% model. **The model as the owner has it now is right; no correction this run.** The one standing softness is PumpSwap floor exits (9 points too kind on 18 legs), which matters only for B/G-style 5-min books with a 1.3x floor.

## Project F

**Searched:** about 1,900 rule tests — 46 entry-time features filled on at least 60% of a book's rows (the trigger-minute, bundle, creator, copycat, age, depth, market-cap, heat and, now that they fill, the GMGN holder and smart-money columns; the after-trigger trace, holder snapshots, first-seconds prices and every exit column excluded as look-ahead) × 3 quartile thresholds × both directions × 4 exits × A, C, D and 80 on passed rows — with the bar ≥ 40 trades, positive at real costs in both halves of the period, positive in at least 60% of the hours with 2+ trades. 27 passed, all on A and D, and 22 of them are the families already in the register: F8 (D, small trigger minute), F9 (A, fewer bigger buys), F10 (A, entry MC > $53K — the runner version is +9.2% on 60 and **+19.8% on the 22 since 20:10 UK, win 68%**, while the registered 3-min version is −14.7% on its first 4), F11 (D, no whale in the minute). What is new:

- **F12 — D, average buy in the trigger minute ≤ 0.40 SOL, runner.** A 50-SOL minute made of many small buys. **n47 +14.0% at real costs, median positive, win 62%, stop 30%**; halves +16.5% / +11.7%; 11 of 14 hours; +11.7% without the best coin; +9.4% priced at the 5-s price; +2.0% on the 19 since 20:10 UK. The other 141 D trades are −5.8%. **Against it:** 44 of its 48 rows are F11 rows (max_share ≤ 0.11) and 26 are F8's — it is the core of the same D-only "spread-out buying" family, not an independent finding; the threshold is a hump (≤ 0.35 +11.9% on 24, ≤ 0.40 +17.0% on 45, ≤ 0.45 +3.5% on 70, ≤ 0.50 −3.0% on 103), so part of the +14% is the quartile the search chose; and the same rule on A's trigger is −6.3% on 93. Registered as a hypothesis, to be judged against F11 (which is +3.8% on its first 10 out of sample, +4.6% at the 5-s price).
- **Not registered:** the A entry-MC > $53K runner (a variant of F10, which is registered; watch F10 and read the runner column from A's rows); S3b / F7 (cat cow); S4 bundle < 3% (reversed); S7b (the two instant graduations are now priced correctly and it is negative); every S6 rule (the paper price is the smart wallet's own fill); GR (10 trades, the owner's own book, in the register's spirit but not a rule of mine).
- **Plainly:** nothing qualifies as a formula. One rule clears the arithmetic and is registered with its contradictions. The base rate stands at five for five: F6, F7, F8, F9 and now F5 all cleared the same bar in sample and went to +0.9%, −7.6% (ex cat cow), −11.2%, −7.7% and −4.3% out of sample. F12 should be read against that, and it is F11's little brother besides.

## Strategy register

Scored only on trades after each rule's `after_ts`. No existing rule was edited. `study.mjs` prices F5/F6/F8/F9 at the trigger price and cannot score F3/F4/F7; its cost model is the older 0.1-SOL one (fees 3.3% + 2% + 1.6–4.5% by exit) and shows A at −1.9% where the real-cost model says −2.6%, and it prices snipers at a flat 10%, which the leg check above shows is 1–2 points too kind on timed sales and far too kind on floors.

| id | rule | out of sample (real costs) | verdict |
|---|---|---|---|
| S1 | A, sell at 3 min | −8.2% (149) vs baseline −8.2% | **does not hold up** |
| S2 | A, wal60 ≤ 65, runner | −2.6% (73) vs −4.6% (149) | **does not hold up** (2 points better than A, negative) |
| S3 | A, max_share > 0.1, runner | −6.9% (69) vs −4.6% | **does not hold up** |
| F1 | A, bundle_wallets ≤ 3, runner | **−15.0% (45)** vs −4.3% baseline, +0.8% rest of A; 22 shadow legs −1.097 SOL | **does not hold up** |
| F2 | tier-1 bundled launch | — | does not hold up (closed 19 Oct 17:41) |
| S4 | E, sell at 5 min | −11.9% (38) | waiting 38/40, losing |
| F3 | 10-wallet operator, +4 s, 60 s / 5 min (by hand) | 29 launches since the book went live: 60-s median 20x, 5-min 13.6x from +4 s; **S10 took 0 of 29, including 2 after the cap fix; no sniper book has ever had a row on a fingerprint coin** | holds up on paper; the trade is unproven and, on the evidence, probably not available on the curve |
| F4 | G's coins, sell at 5 min (by hand) | **−18.9% (55)**, win 33%; 27 h5 legs −1.865 SOL | **does not hold up** |
| F5 | A5: A, fs5 ≥ 1.02 at the 5-s price, runner (the owner's) | rule on A's rows: **−4.3% (43)**, stop 35% (+3.6% at the trigger price); A5 book 37 rows −6.5%, 37 legs −0.111 SOL | **does not hold up** (43/40, negative; the third tranche lost) |
| F6 | A, fs10 ≥ 1.05 at the 10-s price, runner | +0.9% (23) at the 10-s price (+16.5% at the trigger price); F6 book 21 rows +5.4%, 43% stopped | waiting 23/40, about zero |
| F7 | S3, bought ≥ 1 s after launch, 5-min | +5.2% (63) vs +0.7% baseline; **−7.6% on the 62 without cat cow**, win 31% | **does not hold up on substance** (clears the arithmetic on one 9x coin) |
| F8 | D, sol60 ≤ 51, runner | **−11.2% (17)** vs −3.2% (35); at the 5-s price −7.0% | waiting 17/40, well behind |
| F9 | A, n60 ≤ 57, runner | −7.7% (15) vs −2.6% (46); at the 5-s price −0.5% | waiting 15/40, behind |
| F10 | A, entry_mc > $53K, sell at 3 min | −14.7% (4) vs −12.7% (18); the runner on the same coins +19.8% (22) since 20:10 UK | waiting 4/40 |
| F11 | D, max_share ≤ 0.11, runner | +3.8% (10) vs −5.4% (13); at the 5-s price +4.6% | waiting 10/80 (small edge) |
| F12 (new) | D, avg_buy_sol ≤ 0.40, runner | — | waiting 0/40; F11's core, judge against it |

Of the ten rules old enough to have 20+ out-of-sample trades, none is positive on substance; F5 joined the failed list this run. Note for the next study: score F12 from D's passed rows (`x_flow4`, and at `fs5_x`) and GR from its rows and legs with the instant graduations excluded (the owner's v0.18.153 rule: 10–185 s old at graduation).

## What I would do now
Nothing here changes the bot; the owner decides.
- **No book to real money.** Nothing with 40+ trades is positive at real costs; the window's 33 shadow legs lost 0.214 SOL.
- **A5: the owner's main hope has run its course at 37.** −6.5% on paper, −0.111 SOL in shadow, the third tranche lost after the second won, and the rule on A's own rows is −4.3% on 43 out of sample (it picked the wrong half of A in the last four hours). Execution is not the problem (entry gap +0.9%). The confirmation costs 7% of entry on every trade and buys a stop rate (41%) no better than A's. I would stop it at 40 unless the next 3 are remarkable, and I would not move it to live under any reading of these numbers.
- **S10: the question has moved from "where does it fill" to "why does nothing see these launches".** Two post-fix fingerprint launches, both missed, no skip logged; no sniper book has a row on any of 27 fingerprint coins, S8 included. Worth one look at the tracker's log for the two GTAVI AudaCity mints (04:50 and 05:04 UK): if the coin was already graduated when the +4 s bundle read landed, the curve price is not buyable and F3 should close as a paper-only fact; the pool-side buys A/C/D make on these coins are −13% on 57.
- **GR is the only positive thing in the file and it is 10 trades.** With the two instant graduations out it is +13.4% on 8 and +0.029 SOL on 7 legs. Leave it in shadow and judge at 40; the v0.18.153 fix was the right one (the two bad legs paid +272% and +194% over paper).
- **S7b should come off shadow.** The +55% that put it there was two instant graduations the owner's own late-price rule now scores correctly; the book is −12% at 5 min on 39 and its 9 legs are −34% of stake.
- **S4 had its first good window (+0.062 SOL on 8)** — 8 trades in one hour, keep it in shadow, read nothing into it yet.
- **Costs:** the model as the page now has it is right — PumpSwap exact on 327 legs, curve within 1 point on 380 with the v0.18.150 model. The older curve model in the brief is 3.8 points too kind and should not be used again.
- **F12** is registered, not recommended; it is F11 by another cut. If the owner wants one D-side idea it is still the skip: D's losses sit in its whale-led minutes (max_share > 0.11: −17.9% on 47), not in a buy.

## Next
Why S10 and every sniper book miss fingerprint launches (tracker log for the two GTAVI AudaCity mints); GR to 40 with instant graduations excluded; A5 at 40 (stop or not); F12 and F11 from D's rows; F10's runner column; whether S4's +0.062 window was anything; S7b's legs after the late-price fix; PumpSwap floor exits (9 points too kind on 18 legs).
