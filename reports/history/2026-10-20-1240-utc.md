# 4-hour study — 20 Oct 2026 13:35 UK

**Data push:** 13:07 UK (fresh). 6,350 rows since the price fix (18 Oct 20:25 UK) to 20 Oct 13:02 UK. A: 592 fired, 259 passed, 259 closed. C 92 · D 203 · 80-SOL 114 · E 74 passed. Executor legs: 88 live (none since 19 Oct 11:59 UK), 695 shadow closed, 1 open (GR on Grimpaw, 13:01 UK). launches.csv: 49,578 launches, 19 Oct 13:05 → 20 Oct 12:05 UK. Executor 0.4.2; modes in status.json: shadow = A5, S4, S10, S7b, GR; everything else paper. Every figure below is at REAL costs: PumpSwap x/1.02 × 0.967 − 0.016, stops (x ≤ 0.62) −0.05 more; curve snipers at the v0.18.150 model the page uses (x × 0.97 − 0.02, stops −0.01 more, floor sells −0.12 more; prints above 15x capped; an entry 1.5x+ below the 1-s price scored from that price), with the older curve model (x × 0.97 − 0.01, stops −0.06) in brackets where it differs. The cost section below re-checks both against 781 legs.

**Since the 09:35 UK study:** 711 new rows, 639 of them snipers. A had 18 more passed trades (**−4.7%, win 44%, stop 50%**; B on the same 18 −4.5%, the 3-min sale +4.7%). The executor closed 49 shadow legs in the window for **−0.396 SOL**: S7b 17 (**−0.324 SOL, win 18%**), S4 11 (−0.111, win 9% — last study's "first positive window" reversed in full), A5 10 (+0.017, win 60%), GR 11 (+0.023, win 64%). **S10 still has 0 rows, 0 legs and 0 skips, and three more fingerprint launches came and went inside the window** (earth 09:48, moon 10:09, vagina 10:38 UK): 13.8x, 17.2x and 15.3x at 60 s from the +4 s price, all three graduated. The pool side did see two of them: A and D bought earth and moon at $99K about a minute in (2.15x and 1.62x on the runner), C bought both at $173–216K and stopped, and A5's best leg of the window was moon (1.36 real). The five E trades of the window all stopped (−52%).

## Is anything profitable on real prices?

**No book with 40 or more trades is positive at real costs.** The only positive things in the file are GR (+9.8% on the 18 rows the owner's v0.18.153 rule keeps, 17 legs +0.053 SOL), F6 (+4.1% on 29, 41% stopped) and S3b (+0.6% on 88, which is cat cow: −8.0% on the other 82). The 80-SOL book is −0.1% on 114, D −1.3% on 203, F −0.5% on 83. Every executor shadow book is below zero overall except GR (+0.039 on 19) and C/D's old legs.

| book (exit) | trades | real net/trade | win | stop | since 09:35 UK | shadow / live legs (entry gap · exit gap, medians) |
|---|---|---|---|---|---|---|
| A (runner) | 259 | −2.9% | 46% | 40% | n18 −4.7% | live 38 −0.376 SOL, shadow 31 −0.625 (+2.3% · −0.5%); none since 19 Oct 11:59 UK |
| B (A sold at 5 min) | 259 | −5.1% | 49% | 35% | n18 −4.5% | live 50 −0.301, shadow 65 −0.711 |
| C (runner) | 92 | −10.6% | 37% | 36% | n8 0.0% | shadow 7 +0.027 |
| D (runner) | 203 | −1.3% | 46% | 38% | n14 −3.1% | shadow 26 +0.025 (+1.6% · −0.6%) |
| 80-SOL (runner) | 114 | −0.1% | 46% | 45% | n7 +7.0% | — |
| E (runner / 5-min) | 74 | −6.9% / −5.4% | 35% / 43% | 54% / 47% | n5 −52.2% / −43.2% (all 5 stopped) | — |
| E2 (E, MC < 1.2× first A/C/D entry, 5-min) | 19 taken since 19 Oct 16:45 UK (7 passed) | −7.8% (the 7 passed: −29.5%) | 58% | 42% | n8 −6.4% (1 passed, −50.9%) | — |
| F (A, bundle ≤ 3 wallets, runner) | 83 | −0.5% | 52% | 30% | n5 +0.8% | shadow 22 −1.097 SOL (+3.5% entry); no legs since 19 Oct; paper |
| G (A trigger, 150–500 wallets, 5-min) | 93 (43 since 20:10 UK) | −4.3% (**−21.5% since 20:10 UK**) | 42% (26%) | 51% (63%) | n4 −19.8% | shadow 47 −2.198 SOL; the 27 h5 legs −1.865; no legs since 04:56 UK; paper |
| **A5 (own row, runner)** | **48** | **−6.2%** | 48% | 42% | **n10 −0.6%** | **shadow 48 −0.119 SOL (−5.0% of 2.4 staked)** (+0.6% · −0.9%); 10 since last +0.017 |
| A5 rule on A's rows at the 5-s price (F5) | 114 | −1.3% | 54% | 32% | n10 −5.5% | out of sample n54 −5.4%, stop 37% (+2.6% at the trigger price) |
| F6 (own row, 10 s ≥ 1.05x, runner) | 29 | +4.1% | 52% | 41% | n8 +0.4% | — (rule on A's rows at the 10-s price: n30 +1.0% out of sample) |
| A2 (A sold at 60 s if < 0.95, else runner) | 112 from 19 Oct 19:00 UTC | −9.1% | 33% | 27% | n18 −3.2% | — (A on the same 112: −4.9%; B −4.2%) |
| **GR (fast thin graduation, 3-min)** | 21 closed (18 with the v0.18.153 age rule) | +26.9% (**+9.8% on the 18**) | 81% (78%) | 19% (22%) | n11 +7.5% | **shadow 19 +0.039 SOL (17 ex instant graduations +0.053, +6.2% of stake, win 65%)**; 11 since last +0.023 (entry gap +2.4% median, +6.3% mean) |
| S1 (5-min) | 192 | −22.6% (−20.4%) | 21% | 48% | n17 −20.6% | shadow 9 −0.183 |
| S2 (1.5x/−40%) | 731 | −10.5% | 28% | 29% | n74 −7.6% | — |
| S3 (5-min) | 193 | −5.9% (−2.7%) | 26% | 26% | n7 −28.1% | shadow 107 −0.218 SOL (+1.4% · −1.1%); paper |
| S3b (S3 ≥ 1 s after launch, 5-min) | 88 | +0.6% (+4.0%) | 27% | 22% | n8 −26.9% | — (−8.0% on 82 without cat cow) |
| S4 (5-min) | 121 | −4.3% (−1.7%) | 29% | 11% | **n11 −19.4%, win 9%** | **shadow 96 −0.235 SOL** (+1.4% · −1.1%); **11 since last −0.111** |
| S4b (S4, bundle < 3%, 5-min) | 27 | −10.1% | 15% | 11% | n2 −32.3% | — |
| S5 (1.5x/−40%) | 807 | −11.7% | 34% | 50% | n76 −8.8% | — |
| S6 (runner) | 705 | −9.3% | 27% | 39% | n75 −11.3% | shadow 9 −0.136 (entry gap +10.7%) |
| S6b (5-min) | 283 | −13.0% (−10.4%) | 32% | 41% | n70 −3.1% | shadow 152 −1.264 SOL; paper |
| S7 (1.5x/−40%) | 297 | −14.2% | 24% | 39% | n20 −21.0% | — |
| **S7b (1.5x/−40% / 5-min)** | 56 | **−12.0% / −17.4%** | 32% | 41% | n17 −21.7% / −29.7% | **shadow 26 −0.477 SOL (−37% of stake), win 15%; 17 since last −0.324** |
| S8 (1.5x/−40%) | 400 | −13.2% | 36% | 50% | **n49 +4.6%** (55% reached 1.5x) | — |
| S9 (5-min) | 424 | −10.4% | 23% | 26% | n65 +7.7% (−5.0% without Zoo 5.3x and Onion 5.2x) | shadow 31 −0.296 |
| S10 (5-min) | **0** | — | — | — | 0 rows, 0 legs, 0 skips | **3 more fingerprint launches in the window, all missed; 29 in the file, 22 since the book went live** |
| S11 (5-min) | 36 | −11.9% | 39% | 42% | n0 | — |

## A5 and A2

**A5 out of sample: 48 closed rows (every one out of sample — the book started 19 Oct 20:10 UK), 48 closed legs, −6.2% a trade on paper at real costs and −0.119 SOL (−5.0% of 2.4 SOL staked) in shadow; 20 of 48 stopped (42%); win 48%; nothing open.** The last study said stop at 40 unless the next trades were remarkable: the 11 since were not — the 10 closed legs made +0.017 SOL (6 fade-volume winners +0.111, 4 stops −0.095) and the 10 paper rows −0.6%. The tranches of 16 read −0.164 / +0.086 / −0.041 SOL. By hours, which is the honest unit: A5 has traded in 16 hours and been positive in 5. Execution is still the cleanest of any PumpSwap book — shadow fill a median +0.6% above the A5 paper price (mean −0.2%), exit gap −0.9% median (−3.1% mean, the stops); leg x mean 0.951 against paper 1.028, which is the cost model's 8 points and nothing else.

The premise is unchanged on 48: **A's own row on the same 48 coins made +3.6% at real costs (stop 35%; sold at 5 min +2.4%), the A5 row −6.2% (stop 42%).** A5 bought at a median 1.073x A's trigger price (range 1.02–1.38x), so its −40% stop sits 7% higher and every winner gives 7% back. The 5-s confirmation picks coins A does well on; what the confirmation costs is the whole difference and more. The rule on A's own rows at the 5-s price, in sample and out of sample side by side:

| window | A5 rule (fs5 ≥ 1.02, priced at fs5, runner) | same coins at A's trigger price | all A | rest of A (fs5 < 1.02) |
|---|---|---|---|---|
| rows to 19 Oct 17:05 UK (the owner's 19:48 analysis) | **n51 +4.4%, win 63%, stop 25%** | +20.9% | n129 −1.7%, stop 40% | n78 −16.5% |
| 17:05 → 20:10 UK | n9 −8.7%, win 56%, stop 33% | +9.4% | n19 −2.3% | n10 −12.9% |
| **20:10 UK → now (out of sample)** | **n54 −5.4%, win 46%, stop 37%** | +2.6% | n111 −4.4%, stop 41% | n56 −10.3% |
| of which since 09:35 UK | n10 −5.5%, win 60%, stop 40% | +3.5% | n18 −4.7%, stop 50% | n8 −14.8% |
| all 114 | −1.3%, win 54%, stop 32% | +11.3% | n259 −2.9% | n144 −13.8% |

Out of sample the gate still separates the coins (the fs5 < 1.02 half of A is −10.3%, the ≥ 1.02 half +2.6% at the trigger price), but at the price an A5 buyer gets it is −5.4% on 54. In-sample +4.4% on 51, out-of-sample −5.4% on 54: a 10-point fall on samples of 50, which is what a rule picked from the same data usually does. **F5 does not hold up; A5 at 48 has answered the question the owner asked of it.** The one thing the window added: A5's two best legs were earth and moon, both fingerprint (10-wallet operator) coins bought on the pool a minute in — see S10.

**A2 (sell at 60 s if below 0.95x, else the runner), on the 112 passed A coins since 19 Oct 19:00 UTC:** A2 **−9.1%** vs A −4.9% vs B −4.2% on the same coins; stops 27% vs 42%; win 33% vs 44%. The rules differ on 37 of the 112: A2 ahead on 22 (sold at 60 s where A later stopped) and behind on 15, six of them runners A rode to 1.5–4.0x (Spidey Show 4.0, Tetsuo 1.77, Justice for Lacy 1.76, Pump 1.59, Bread Cat 1.57, Evolve 1.53). In the window A2 was for once ahead of A (−3.2% vs −4.7% on 18), which is the 60-s sale catching a 50%-stop window; over both halves it is behind (−8.6% / −9.9% vs A −4.4% / −5.7%). **A2 is not a profitable A and is behind A in both halves on 112.**

## Snipers (S3, S4, S4b, S10, and the rest briefly)

**S10 — 0 rows, 0 legs, 0 skips, and the executor's skip log has no entry for book `op` at all (224 skips in the file, none from S10).** Three fingerprint launches in this window, all inside the file's launch window and all after the 04:43 UK cap fix: earth (09:48 UK, 40.93%, 26.9 SOL, 10 wallets, dev 0.07), moon (10:09 UK, the same operator numbers to the decimal), vagina (10:38 UK, 38.76%, 22.4 SOL, dev 0.03). From the +4 s price ($10–13K MC): 13.8x, 17.2x and 15.3x at 60 s, 10.8x, 8.5x and 11.9x at 5 min, peaks 22x, 25x and 16x, all three graduated. None has an S10 row, a leg or a skip; nor does any other sniper book (S8's tier-1 rule included), and that is now true for all 29 fingerprint launches in the file. **The fill question cannot be answered because nothing has ever reached the fill.** Since the book went live (22 launches): median 19.1x at 60 s, 12.6x at 5 min, 20 of 22 graduated. What the pool side got on this window's three: A/D bought earth and moon at $98–99K about a minute in and rode them to 2.15x and 1.62x (1.28x at 5 min); C bought both at $173–216K and stopped (0.58, 0.60). The last study asked for one look at the tracker's log for the two GTAVI AudaCity mints; earth (3kGBKNiG…pump) and moon (7PZyQYJm…pump) are two more to look at. With no skip and no row, the likeliest reading is still that the coin is off the curve before the +4 s bundle read lands and v0.18.149's no-graduated-coins rule stops the sniper path before S10's filter runs — in which case F3 should close as a paper-only fact and the curve price is not buyable.

**S3 copycat:** 193 rows −5.9% (old model −2.7%), 7 since the last study −28.1% (none won); 107 shadow legs −0.218 SOL, no legs since it went to paper. **S3b** (bought ≥ 1 s after launch): 88 rows +0.6%, **−8.0% on 82 without cat cow**; the 8 in the window −26.9%, none won; F7 is 88 out of sample at +0.6%, win 27%. One 9x in 88 trades is not a rule.

**S4 clean launch (shadow):** 121 rows −4.3% (old model −1.7%), 96 legs −0.235 SOL (−4.9% of stake). **The 11 since the last study: −19.4% on paper, −0.111 SOL in shadow, 1 winner in 11** (Ohge 1.47x; the other ten sold at 5 min between 0.56 and 0.94). Last study's +0.062 SOL on 8 was one hour of the day, as it said; S4's 5-min sale on a clean launch is a coin-flip the costs lose. Entry gap +1.4%, exit gap −1.1%: paper S4 is obtainable and is not worth obtaining. **S4b** (bundle < 3%): 27 rows −10.1%, win 15%; the 2 in the window −32.3%. Reversed, and now 27 trades deep.

**S7b** (feed wallet with under 100 followers, shadow since 05:19 UK): 56 rows −12.0% at 1.5x/−40%, −17.4% at 5 min; 17 rows in the window −21.7% / −29.7%, 10 stopped. **26 shadow legs −0.477 SOL (−37% of stake), win 15%; the 17 of the window −0.324 SOL** (9 stops −0.258). The stop exits on this book sell a mean 14.8% below the paper stop price (median −5.6%) — the curve on a fading coin is thinner than the model's −1% stop term. The book has no case left.

**The rest since 09:35 UK (closed, main exit):** S1 n17 −20.6% · S2 n74 −7.6% · S5 n76 −8.8% · S6 n75 −11.3% · S6b n70 −3.1% · S7 n20 −21.0% · S8 n49 **+4.6%** · S9 n65 +7.7% · S11 n0. Does anything dead come back? Two had a positive block and neither is a return. S8 (tier-1 bundled launch, 1.5x/−40%) was +4.6% on 49 with 55% reaching 1.5x, after five 4-hour blocks at −6%, −18%, −13%, −17%, −20%; positive in 3 of its 4 hours, +2.9% without its best two — a real but single block on a book that is −13.2% on 400. S9 (swarm dip) +7.7% on 65 is Zoo 5.3x and Onion 5.2x: −5.0% without them, median −16%, positive in 2 of 4 hours.

## G, F, E2

**G (A's trigger on 150–500-wallet coins; 5-min leg since 19 Oct 20:10 UK; paper since 05:19 UK).** No new legs (the last closed 04:56 UK). The 27 h5 legs stay at −1.865 SOL (−27.6% of stake), win 19%. Paper since 20:10 UK: **−21.5% on 43, 63% stopped, win 26%**; F4 is 59 out of sample at −18.9%, win 32%, stop 58%. Four G coins in the window: −19.8%. **Does not hold up; nothing new.**

**F (A's coins with a launch bundle of ≤ 3 wallets).** 22 shadow legs −1.097 SOL (−20% of stake), none since 19 Oct. Paper: F1 is 50 out of sample at **−13.4%, win 40%, stop 42%, against −0.6% for the rest of A in the same window**; the 5 F coins in the window +0.8%. **Does not hold up** (50 of 40, 13 points behind the rest of A).

**E2 (E skipping coins already ≥ 1.2× the MC at which A/C/D first bought them, sold at 5 min).** E fired 16 times in the window; E2 would have taken 8 (−6.4% at 5 min), 7 of them coins the website's filters skip; the one passed E2 trade, Onion, stopped (−50.9%). Totals since 16:45 UK: 19 taken −7.8% (the 7 passed −29.5%, 5 of 7 stopped), 36 skipped −10.6%. E itself has lost every one of its last 5 passed trades. Too few to judge E2 and nothing in it to want.

## Real costs — does the model still match the legs?

Measured on 781 closed executor legs with a paper mark (351 PumpSwap: 88 live, 263 shadow, B/F/G legs included; 430 curve shadow):

| | model | measured (median · mean) | realised vs model | verdict |
|---|---|---|---|---|
| PumpSwap entry | +2.0% | +1.6% · +5.7% (timed; the mean is GR's two instant graduations), +1.2% · +0.7% (stops); A5 +0.6%, F +3.5%, GR +2.4% median / +6.3% mean in the window | — | right on the median; GR's fast graduations pay more (below) |
| PumpSwap timed / fade / 5-min sale | −3.3% | −0.9% · −1.0% (178) | +24.1% vs +25.7% | right, 1.6 points on the safe side |
| PumpSwap floor | −3.3% | −0.5% · −3.0% (25) | +13.4% vs +18.5% | 5 points too kind on floors (25 legs; the standing finding, narrowing) |
| PumpSwap stop | −8.3% | −1.4% · −9.0% (148) | −49.5% vs −51.5% | right, 2 points on the safe side |
| curve entry | +0% | +1.4% · +2.4% | — | right on the median |
| curve timed sale | −3% | −1.1% · −1.2% (188) | +0.8% vs +3.6% | 3 points too kind (S7b's window: −20.3% vs −19.8%, fine) |
| curve floor | −15% | −1.1% · −6.6% (110) | +5.2% vs +3.0% | 2 points too harsh |
| curve stop | −4% | −1.1% · −2.6% (132) | −47.2% vs −47.3% | right; but S7b's 9 window stops −54.1% vs −45.4% (exit gap −14.8% mean) |

In all: **PumpSwap −7.7% realised vs −7.3% model on 351 legs** (−8.5% model with the two instant-graduation legs taken out, which the owner's v0.18.153 rule now does); by stake 0.1 SOL −0.4% vs −2.4%, 0.25 SOL −17.0% vs −19.5%, and 0.05 SOL −6.0% vs −3.6% — the 0.05-SOL legs are 2.4 points lighter than the model, the fixed 0.001 SOL fee term again. The 21 PumpSwap legs of the window: +3.7% realised vs +3.6% model — exact. **Curve: −12.8% realised vs −12.2% on the v0.18.150 model vs −9.7% on the older model (430 legs)** — the newer model is right within a point, the older one 3 points too kind, so the sniper figures in this report use the newer one. The 28 curve legs of the window: −30.5% realised vs −25.7% model, the gap entirely S7b's 9 stops. **The model as the owner has it is right; no correction this run.** Two things worth a line in the page's model: PumpSwap floor exits are still ~5 points too kind (25 legs), and GR's entry gap is not +2% — on the 11 window legs the median was +2.4% but the mean +6.3% (just 1 share +23.9% at 20 s old, SNAILMAIL +13.3%, goatye +10.9%, CATZILLA +9.3%): a coin that graduated seconds ago moves while the buy lands, and GR's paper is 2–4 points kinder than its legs (rows +9.8%, legs +6.2% of stake on the same 17).

## Project F

**Searched:** about 2,000 rule tests — 47 entry-time features filled on at least 60% of a book's rows (trigger-minute, bundle, creator, copycat, age, depth, market-cap, heat, GMGN holder and smart-money columns; the after-trigger trace, holder snapshots, first-seconds prices and exit columns excluded as look-ahead) × 3 quartile thresholds × both directions × 4 exits × A, C, D and 80 on passed rows — with the bar ≥ 40 trades, positive at real costs in both halves of the period, positive in at least 60% of the hours with 2+ trades. 35 passed, all on A and D, and most are the registered families: F12 (D, avg_buy_sol ≤ 0.40: now +11.9% on 51 but +23.3% / +0.9% by halves — the second half has gone to zero), F10 (A, entry MC > $53K — runner +9.3% on 65, +1.1% / +17.2%), F8, F9, F11. Two are new:

- **F13 — D, cc_best_mc24h > $19K, runner: a 50-SOL trigger on a coin whose name copies a coin that peaked above $19K in the last 24 h.** **n61 +10.8% at real costs, median +16.5%, win 59%, stop 34%; halves +11.1% / +10.6%; 11 of 17 hours; +6.3% without the best coin; +9.3% at the 5-s price; +8.4% on the 41 since 20:10 UK and +7.4% on the 8 since the last study.** The threshold is a plateau, not a hump (> $10K +8.9% on 67, > $19K +10.8%, > $30K +10.6% on 56, > $50K +10.3% on 54); the 61 D trades with a weaker copycat are −11.7% and the 81 with no same-name coin −2.1%. **Against it:** 50 of its 61 rows are F11 rows (max_share ≤ 0.11), and the 11 that are not are −22.9% — so the edge lives in the overlap "spread-out buying on a copycat of a coin that worked" (about +18% on 50), which is F11 by another cut, and F11 is +2.1% on its first 20 out of sample; the same rule on A's trigger is +1.4% on 79 (rest of A −4.8%) and on C −2.0% on 24. Registered as a hypothesis.
- **Not registered:** D, age ≤ 221 s (young coin) +9.5% on 51 — but +4.9% at the 5-s price with a negative median, and a hump (≤ 120 s +2.2% on 29); S8's one positive block; the A entry-MC > $53K runner (watch F10); S3b (cat cow); every S6 rule (the paper price is the smart wallet's own fill).
- **Plainly:** nothing qualifies as a formula. One D rule clears the arithmetic and is registered with its contradictions. The base rate is now six for six: F5, F6, F7, F8, F9 and F12 all cleared this bar in sample; out of sample they read −5.4%, +1.0%, −8.0% (ex cat cow), −13.4%, −12.0% and +0.7% (3 trades). F13 should be read against that.

## Strategy register

Scored only on trades after each rule's `after_ts`. No existing rule was edited. `study.mjs` prices F5/F6/F8/F9 at the trigger price and cannot score F3/F4/F7; its cost model is the older 0.1-SOL one (fees 3.3% + 2% + 1.6–4.5% by exit) and shows A at −2.2% where the real-cost model says −2.9%, and it prices snipers at a flat 10%, which the leg check shows is 3 points too kind.

| id | rule | out of sample (real costs) | verdict |
|---|---|---|---|
| S1 | A, sell at 3 min | −7.0% (168) vs baseline −7.0% | **does not hold up** |
| S2 | A, wal60 ≤ 65, runner | −3.7% (81) vs −5.9% rest | **does not hold up** (2 points better than the rest of A, negative) |
| S3 | A, max_share > 0.1, runner | −7.5% (81) vs −2.4% rest | **does not hold up** |
| F1 | A, bundle_wallets ≤ 3, runner | **−13.4% (50)** vs −0.6% rest of A; 22 shadow legs −1.097 SOL | **does not hold up** |
| F2 | tier-1 bundled launch | — | does not hold up (closed 19 Oct 17:41) |
| S4 | E, sell at 5 min | **−15.5% (43)**, stop 51% | **does not hold up** (43/40, losing) |
| F3 | 10-wallet operator, +4 s, 60 s / 5 min (by hand) | 22 launches since the book went live: 60-s median 19.1x, 5-min 12.6x from +4 s, 20 of 22 graduated; **S10 took 0 of 29 and logged no skip; 3 more missed this window** | holds up on paper; the trade has never been offered and, on the evidence, cannot be bought on the curve |
| F4 | G's coins, sell at 5 min (by hand) | **−18.9% (59)**, win 32%, stop 58%; 27 h5 legs −1.865 SOL | **does not hold up** |
| F5 | A5: A, fs5 ≥ 1.02 at the 5-s price, runner (the owner's) | **−5.4% (54)**, stop 37% (+2.6% at the trigger price); A5 book 48 rows −6.2%, 48 legs −0.119 SOL | **does not hold up** (54/40, negative; in sample +4.4% on 51) |
| F6 | A, fs10 ≥ 1.05 at the 10-s price, runner | +1.0% (30) at the 10-s price (+17.4% at the trigger price); F6 book 29 rows +4.1%, 41% stopped | waiting 30/40, about zero |
| F7 | S3, bought ≥ 1 s after launch, 5-min | +0.6% (88); **−8.0% on the 82 without cat cow**, win 27% | **does not hold up** |
| F8 | D, sol60 ≤ 51, runner | **−13.4% (23)** vs +3.9% rest of D | waiting 23/40, well behind |
| F9 | A, n60 ≤ 57, runner | **−12.0% (21)** vs 0.0% rest of A | waiting 21/40, behind |
| F10 | A, entry_mc > $53K, sell at 3 min | −5.0% (7) vs −5.3% rest; the runner on the same 7 +13.0% | waiting 7/40 |
| F11 | D, max_share ≤ 0.11, runner | +2.1% (20) vs −25.6% rest (8); at the 5-s price +2.1% | waiting 20/80 (small edge, holding) |
| F12 | D, avg_buy_sol ≤ 0.40, runner | +0.7% (3) | waiting 3/40 |
| F13 (new) | D, cc_best_mc24h > $19K, runner | — | waiting 0/40; F11's overlap, judge against it |

Of the twelve rules old enough to have 20+ out-of-sample trades, none is positive on substance; S4 (the E 5-min sale) joined the failed list this run at 43. Note for the next study: F13 and F12 from D's passed rows (`x_flow4`, and at `fs5_x`); F11 at 80; GR with the age rule (10–185 s) and its legs' entry gap.

## What I would do now
Nothing here changes the bot; the owner decides.
- **No book to real money.** Nothing with 40+ trades is positive at real costs; the window's 49 shadow legs lost 0.396 SOL, 0.435 of it S7b and S4.
- **A5: stop it.** 48 trades, −6.2% on paper, −0.119 SOL in shadow, positive in 5 of 16 hours; the owner's own bar was 40. The rule on A's own rows went from +4.4% in sample (51) to −5.4% out of sample (54). Execution is not the fault (entry gap +0.6%); the 7% paid for the confirmation is. A's plain row on the same 48 coins is +3.6%, so if anything in A5 is kept it is the coin selection, not the delayed buy — and that is F5 at the trigger price, +2.6% on 54, which is not a formula either.
- **S7b off shadow.** −0.477 SOL on 26 legs, win 15%, −0.324 in this window alone; its stops sell 15% below paper. There is no reading of 56 rows that keeps it.
- **S4 and S4b: nothing to wait for.** 121 rows −4.3%, 96 legs −0.235; the window that looked positive last time was followed by 1 win in 11. S4b is −10.1% on 27 with 15% winners.
- **S10: the executor has never seen a fingerprint launch, and three more passed in this window.** No skip is logged for book `op`, so the filter is not being reached. One look at the tracker's handling of earth (3kGBKNiG…) and moon (7PZyQYJm…) would settle whether the coin is already graduated at the +4 s read. Until then F3 stays a paper fact: 19x at 60 s on 22 launches that nothing we run can buy. The pool-side buy a minute in is what we actually get on these coins, and this window it was good (A/D 2.15x and 1.62x) where over 57 earlier rows it was −13%.
- **GR is the only positive thing in the file: +9.8% on 18 rows, +0.053 SOL on 17 legs, 65% winners, positive in 3 of 6 hours.** Keep it in shadow and judge at 40. Mind the entry gap: fast graduations fill a mean 6% above paper (one at +24%), so the real edge is 2–4 points under the page's figure.
- **Costs:** the page's model is right — PumpSwap within half a point on 351 legs, curve within a point on 430 with the v0.18.150 model. The one standing softness is PumpSwap floor exits (5 points too kind on 25 legs).
- **F13** is registered, not recommended: it is the D "spread-out buying" family again, on copycat names, and six rules of this kind have cleared the same bar and failed.

## Next
Why S10 and every sniper book miss fingerprint launches (earth and moon this time); GR to 40 with the age rule and its entry gap; F13 and F12 from D's rows, F11 at 80; whether S8's +4.6% block repeats; PumpSwap floor exits (5 points too kind on 25 legs); A5 — whether the owner stops it at 48.
