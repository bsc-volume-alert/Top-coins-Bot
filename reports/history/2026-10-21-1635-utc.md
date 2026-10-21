# 4-hour study — 21 Oct 2026 18:00 UK

**Data:** pushed 17:07 UK (fresh), rows to 17:06 UK. Scored by reports/books/numbers.py's method: real costs (PumpSwap x/1.02 × 0.967 − 0.016, stops −0.05 more; curve x × 0.97 − 0.04, stops −0.01, floor sells −0.12, lateFix, 15x cap), operator-fingerprint coins and price-glitch rows out. Every figure carries its trade count. Only the kept books (owner's cull, 13:50 UK) are analysed.

**Since the last study (13:55 UK):** the cull went in at 14:45 UK (BL and AS4 on the page, BL in executor shadow at 0.05, AS shadow stake back to 0.1), K was revised in place at 14:50 UK, and GR2 (GR's rule on bundle-launch coins, 40% trail, shadow 0.25) started at 17:00 UK — 6 minutes before this data, so it has no legs yet. About 3 hours of forward data for the new boxes. Nothing reached a checkpoint. The one thing that moved: every forward reading of the bundle-launch coin type (BL's 6 legs, GR's 10 bundle legs since 09:47 UK) is positive and every reading of the rest (GR's 9 other coins, the revised S3 and S4) is negative — but all at counts of 3 to 19.

## The kept books

| Book | Change | Trades since the change | Result a trade (real costs) | Without best 3 | Won | Stopped | Back-test (before the change) | Shadow legs, real vs paper | Checkpoint |
|---|---|---|---|---|---|---|---|---|---|
| **AS** | 20 Oct 17:45 UK | 35 | **+12.3%** (no-best +8.7%) | +4.4% | 69% | 17% | 64 at +8.8% | `asoc` 18 legs +0.870 SOL, +13.5% a leg, 13 won; real +5.8 pts above the model; entry +1.6%, exit −1.4% | live at 0.1 after 30 positive legs: **18 of 30**, on course |
| AS2 | 21 Oct 01:30 UK | 16 | +5.9% (no-best +2.2%) | −4.2% | 69% | 19% | 63 at +18.6% | — | 30 forward: 16 of 30 |
| AS3 | 21 Oct 01:30 UK | 13 | +10.4% (no-best +6.2%) | −1.2% | 77% | 15% | 35 at +29.7% | — | 30 forward: 13 of 30; 7 of 13 reached 2x (x_t2s40 on the same 13: +36.4%) |
| AS4 | 21 Oct 14:45 UK | 1 | −16.7% | — | 0% | 0% | 18 at +47.8% | — | 30 forward: 1 of 30 |
| **GR** | 21 Oct 09:47 UK | 19 | +9.4% (no-best −0.6%) | −16.9% | 47% | 32% | 57 at +13.6% | `grad` since 09:47: 18 legs +0.582 SOL, +12.9% a leg (no-best +3.6%), 10 won; real +1.1 pts above the model; **entry gap +9.4% median** at 0.25, exit −3.1% | 30–40 forward: 19 of 30. Trail on the same 19: +39.6% but without top 3 −16.6% = level with the 3-min → no switch |
| GR2 | 21 Oct 17:00 UK | 0 | — | — | — | — | on GR's rows 45 at +62.2% (no-top3 +34.3%, won 47%) | `gr2` 0 legs | 40 legs: 0 of 40 |
| **BL** | 21 Oct 14:45 UK | 5 | +60.8% (no-best +6.8%) | −16.5% | 60% | 0% | 104 at +33.6% (no-top3 +15.9%) | `bl` 6 legs from 14:15 UK, +0.334 SOL at 0.05, +109% a leg, 4 won; real +3.6 pts above the curve model; entry +1.6%, exit −2.9% | 40 legs: **6 of 40**; fills match paper so far |
| K (revised) | 21 Oct 14:50 UK | 3 | −5.0% (one 2x +87%, two stops) | — | 33% | 67% | 22 at +31.8% (no-top3 +23.1%) | — | 40 forward: 3 of 40 |
| S3 (revised) | 21 Oct 08:45 UK | 7 | **−32.3%**, 0 won | −40.5% | 0% | 57% | 72 at +22.5% (no-top3 −5.9%) | — | retire if negative at 40: 7 of 40 |
| S4 (revised) | 21 Oct 10:28 UK | 3 | **−22.8%**, 0 won | — | 0% | 33% | 32 at +25.7% (no-top3 −6.5%) | — | 60 forward: 3 of 60 |

Notes on the counts. S3 and S4 are counted by the page's own definitions (S3: sn3b rows copying a $1M+ coin with the serial creator out; S4: socials present, first-time creator, original name). The 13:30 UK study counted 17 S3 and 9 S4 forward trades with wider matches (socials unknown counted in); by either count neither book has a winner since its change. K's back-test grew from 18 at +42.7% (10:36 UK data) to 22 at +31.8% with the four qualifying trades between 10:36 and 14:50 UK. GR2's back-test on GR's own 91 rows is 45 at +62.2%; the 16:50 UK figure (57 at +47.8%) was on every-graduation rows.

## Successes and failures this period

**AS (35 forward):** 24 winners, 6 of them +50% or more (SpaceXSuperIntelligence, MOCHI, xingxing, Banana Cat, Conviction, Clout); 6 stopped (Xitter, Hollow, Pokemon Sol-Silver, buyoutSH, OTTR, Datacenter at 13:37 UK); 5 small losers. The stopped group against the winners, medians: coin 20 min old vs 12, creator bought 1.2 SOL vs 0, 38 vs 28 SOL sold in the trigger minute across 80 vs 58 wallets, 0.90x vs 1.21x at 60 s, peak 1.13x — they never ran. Same picture as the 11:10 UK analysis, and the 11:10 UK search found no cut on it that beats luck. 15 of 35 reached 2x; the fixed 2x sale on the same 35 is +14.5% vs the runner's +12.3% (won 49% vs 69%) — a tie, as before. Last 6 h soft: 9 at +1.7%.

**AS2 / AS3:** AS2's 16 are AS's trades minus three single-wallet coins (DreamCoin +19%, Finley +22%, Nigga Its Over −17%), so it has not separated from AS. AS3's 13: 10 won; the two stops (buyoutSH, Datacenter 13:37) were old or crowded coins with 2.6 SOL creator buys and 85 wallets in the minute — the 11:10 UK loser profile. The pre-registered exit check is now live: 7 of 13 AS3 forward coins reached 2x (54%, break-even 37%) and the runner sold Chi, Nodrel, MEME, Larry The Cat and Valley of Juárez at 1.2–1.4x after 2.1–6.9x peaks. Decide at 30, not 13.

**GR (19 forward rows, 18 legs):** 9 winners, 4 big (Ricechi +190%, KIMCHINU +159%, Kimchi Phil +101%, Speed of Light +79%) — bundle-launch graduations, 70% over 6 wallets, 1.12x at 10 s. 6 stopped (EMBER, Kimchi Final Boss, GONE −95%, The Genesis Block, Super Finu, Sol Cat): at 60 s they were at 0.27x — one-transaction dumps; no exit catches them, the real stops filled at −55% against the model's −60%. 4 small losers, 3 cut by the 10-s rule at −11% to −28% (zonki, The Last Agency, The Kimchi Collection). The Last Agency went on to 17.5x after the 10-s sale — the rule's cost in one coin; it saved more than that on the three it cut. By coin type on the forward rows: bundle-launch 10 at +32.3% (legs +21.4%, +0.538 SOL) vs the rest 9 at −15.9% (legs +2.2%, +0.044 SOL). That is the 16:40 UK split holding one more time, at p ≈ 0.16 then and 19 rows now: still "cannot be told from luck", and it is exactly what GR2 is there to test.

**BL (5 paper, 6 legs):** Ricechi +277% (real +292%), STILL FLOATING +50%, The Kimchi Collection +10%, KIMCHINU +340% on the 14:15 leg; Giga Kim −32%. The failure to record: Dusty The Mothman peaked 3.42x and the trail sold at 1.07x (real 1.06x) — the run was one spike that collapsed inside a tick, so a 40% trail never gets its 40%. This is the one-transaction-dump risk the 11:30 UK S8 analysis named; first time on a real-quote leg. Nothing can be done about it inside the trail; the split exit (half at 2x) would have banked half of it, and on the 5 paper rows the split is +29.8% vs the trail's +60.8% — Ricechi decides that, 5 trades decide nothing.

**K (3):** one 2x, two stops. **S3 (7):** 0 won; five of the seven are repeat buys of the same copy name within minutes (Alpencat three times in 4 minutes at −40%, −30%, −39%; Valerie app twice). Inside the back-test, first copies are 42 at +31.2% and repeats within 10 min 30 at +10.3% (no-best −6.1%) — repeats are the worse half, but the four first copies forward are also 0 for 4, so a first-copy-only line would not have saved it. **S4 (3):** 0 won after costs (Pump Kart 1.11x, NormiePad 0.69x, Grokfeller LLC 1.26x with a floor sell). 33 clean launches fired in 6.6 h and 4 qualified: about 13 a day, so 60 is 4–5 days away.

## Costs — does the model still match the legs?

**Yes, on net, for both models.** AS `asoc`: 18 legs real +13.5% vs the PumpSwap model's +7.7% on the same paper multiples — real 5.8 points better (fade-volume sells +33.2% vs +28.3%; stops −44.5% vs −53.2%); entry gap +1.6% median (model 2%), exit −1.4% (model −1.6%). The last 5 legs are at 0.1 SOL (stake reset 14:15 UK), the 13 before at 0.5. GR `grad`: 84 legs real +12.0% vs model +14.8% (−2.8 points); since the 09:47 UK rule 18 legs +12.9% vs +11.8% (+1.1). BL `bl`: 6 curve legs real +109% vs the curve model's +105.5% (+3.6 points); entry +1.6% median, worst +3.8%; exit −2.9%.

**The one drift: GR's entry gap.** Since 09:47 UK the median shadow buy filled 9.4% above the paper print (whole record +3.9%; the 12:00–18:00 UK block +7.1%): 6 legs at +0.7–1.5%, 11 at +6–20% (EMBER +19.5%, KIMCHINU +18.8%, Kimchi Phil +18.6%, The Kimchi Collection +17.7%), one at −30% on a stale print (zonki). The wide ones have 1.1–1.9 s of feed lag and are bundle-launch pools that move in their first second. It is offset on net because the floor sells fill above paper (5 legs +33.6% real vs +19.5% model) and stops fill above the model. Keep both models; record the gap, because GR2 buys the same coins at the same 0.25 stake and its trail exit does not get the floor's bonus. Recorded in LESSONS.md.

## Anything new (luck-checked)

Nothing new passed. No new formula was searched this run (the owner's cull and the 14:00 UK settled conclusion say the retired books are not re-analysed, and every kept book is on a pre-registered forward test). Two pre-registered checks moved and are reported above as what they are: the GR bundle-vs-other split on the forward rows (same direction as 16:40 UK, 19 rows, cannot be told from luck; GR2 is its test) and the AS3 forward 2x share (54% on 13; decide at 30). The strategy register: judged out of sample only, no rule edited, none added. F16 (E, x_split, cc_n24h ≤ 3) has 4 out-of-sample trades at −13.9% (needs 40). The 12 rules with 40+ out-of-sample trades are unchanged from 13:55 UK — all failed or nothing (S1 318 at −5.2%, S2 163 at −0.4%, S3 158 at −0.7%, F1 108 at −4.2%, S4 397 at −10.4%, F4 98 at −11.4%, F7 163 at −6.5%, F8 85 at −6.4%, F9 64 at +5.4% no-best +1.1%, F10 46 at +2.8% no-best −2.4%, F11 108 at −8.7%, F12 39 at −13.3%, F13 71 at −10.9%, F14 33 at −3.9%, F15 40 at −7.4%; F5/F6 read +5.8% and +16.7% at the trigger price, which the 13:55 UK study showed cannot be bought — failed at the 5-s and 10-s prices).

## What I would do now

1. **AS: keep the shadow running to 30 legs; nothing to decide yet.** 18 legs, +0.870 SOL, real above paper, 13 of 18 won. At the last day's rate the 30th leg lands around 04:00–06:00 UK tomorrow; the live-at-0.1 decision is then, on the 30-leg figures, not on these 18. The last 6 h (9 paper trades at +1.7%) are a reminder that 14-trade blocks swing.
2. **GR: hold the 3-min rule, shadow at 0.25, no trail switch** — the decision rule set at 11:30 UK says switch only if the trail leads without its best 3 on the forward rows, and it does not (−16.6% vs −16.9% on 19). GR2 now runs the trail on the bundle coins with real quotes, so the question answers itself at 40 legs. Note the +9.4% entry gap when reading GR2's first legs.
3. **BL: nothing to change; 6 of 40 legs.** Fills match paper on the first 6. The Dusty case says the trail will give back whole runs now and then; the split exit is recorded beside it and the choice is for 40 legs, as agreed.
4. **S3: the owner can retire it now or wait for 40.** 7 forward at −32.3% with no winner, after a back-test that was 5 coins. There is no evidence-backed line to add. If he keeps it, expect the 40-trade point in about 1.5 days.
5. **S4: wait for 60 but expect the same ending.** 3 forward, 0 won, consistent with the +1.0% clean half of its back-test rather than the +25.7% headline. 4–5 days to 60 at 13 a day; if the owner wants to shorten it, 30 is the earliest count that could say anything.
6. **K and AS4: nothing yet** (3 and 1 forward trades).

Nothing here changes the bot; the owner decides.

## Next

- AS at 30 shadow legs: real vs paper on all 30, without best, and the win count — the live decision.
- GR2's first legs: real entry gap vs GR's +9.4%, and real trail exits (first real sells of a trail on these pools).
- BL and GR2 side by side on the same coins once both have 10+ legs; the trail-vs-split choice stays open to 40.
- AS3 at 30 forward: the 2x share and x_t2s40 vs the runner, paired.
- S3 at 40 (retire if negative); S4 at 30 as an early read; K at 20.
- F16 out-of-sample count (4 now).
