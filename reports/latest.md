# 4-hour study — 23 Oct 2026 09:35 UK

**Data is back.** `pushed_at` 2026-10-23T06:10:12Z (07:10 UK; rows to 07:09 UK), the first push after the gap 13:07 UK 22 Oct → 07:10 UK 23 Oct (18 hours, six :05 pushes missed). The gap's rows and executor legs arrived complete: AS 24 trades, GR 46, BL 47, K 22, S3 42; legs `asoc` 23, `grad` 40, `gr2` 14, `bl` 46. No restart or wallet event is visible inside the gap (wallet 1.178 SOL at 07:10 UK, no balance skips on the kept books). The cause of the outage is not visible from the data. This push is the same one the owner's GR2 session read at 08:05 UK (GR.md), so GR2's 14 live legs are not re-analysed here; the rest of the gap is.

**Since last study (05:30 UK):** everything below. Three things changed: (1) a price error in GR's paper record was found and corrected in numbers.py; (2) four checkpoints were reached (AS 40 shadow legs, BL 40 shadow legs, K 40 trades, S3 40 trades) and all four are answered; (3) GR's whole-book 'yes' of 22 Oct 13:50 UK is overturned, while its bundle split re-passes.

## The kept books

Scoring is numbers.py's (real costs, operator coins out, price-glitch rows out, lateFix on curve books — and from this run on GR's `grf` rows too, see below). Forward = trades since the book's change.

| Book | Change | Trades since the change | Result a trade (real costs) | Without best 3 | Won | Stopped | Shadow / live legs, real vs paper | Checkpoint |
|---|---|---|---|---|---|---|---|---|
| **AS** | 20 Oct 17:45 UK | 90 (+24) | **+3.9%** (no-best +0.8%; thirds +13 / −2 / +1); the 24 new +3.3% but no-top3 −18.0% | −2.0% | 56% | 37% | `asoc` shadow 60 legs +0.432 SOL, −3.2% a leg; +3.3 pts above the model; entry +1.6%, exit −2.2% median; cumulative +0.713 at leg 30, +0.609 at leg 40, +0.432 at 60; legs 31–60 −0.281 SOL | **40 legs REACHED** (14:05 UK 22 Oct): fills match paper; the book has not paid since leg 30 |
| AS2 | 21 Oct 01:30 UK | 60 (+16) | −1.6% | −6.5% | 53% | 42% | — | past 30: no edge over AS; drop |
| AS3 | 21 Oct 01:30 UK | 45 (+14) | +4.8% (x_t2s40 on the same 45 +11.3%, led by the first third only) | −1.4% | 60% | 36% | — | 45 of 60 |
| AS4 | 21 Oct 14:45 UK | 6 (+2) | −17.5% | — | 33% | 50% | — | 6 of 30 |
| **GR** | 21 Oct 09:47 UK | 122 (+46) | **+4.2% corrected** (raw +17.2% was three price-error rows); no-best +2.7%; thirds +5 / +15 / −7; the 46 new −3.0% | −0.3% | 52% | 20% | `grad` shadow 40 new legs −0.183 SOL, real −4.5%; without the 3 price-error legs real −3.8% = model −3.8%. Live ended 13:53 UK 22 Oct at 20 legs −0.215 SOL | Whole book: NO (negative without best 3; other graduations 48 at −9.3%). **Bundle split holds:** 74 at +13.0% (no-top3 +5.8%) vs 48 at −9.3%, luck 15/2000 |
| GR2 | 21 Oct 17:00 UK | 63 paper (+21) | +96.7% on the trail (no-best +80.0%; median −14.3%); 3-min on the same coins +10.0% | +49.3% | 44% | 27% | **live 14 legs +0.735 SOL** (one 12x, kimchisol +1.110; the other 13 −0.375); real +64% vs model +78%; entry +6.3% median; eleven of fourteen exits at or above paper (GR.md 08:05 UK) | 14 of the 20-live-leg read; live at 0.25 since ~04:00 UK |
| **BL** | 21 Oct 14:45 UK | 126 (+47) | **+44.0%** (no-best +33.6%; median −25.9%); the 47 new +21.5% but no-top3 −23.9% (Capy Glow +1351%) | +13.9% | 33% | 39% | `bl` shadow 61 legs +0.737 SOL, real +23.7% vs model +38.1% (−14.5 pts; last 44 legs −20 pts); entry +3.3%; exit QUOTE −5% median under paper (−10% on the last 44). Live 13 legs −42 pts (21–22 Oct) | **40 shadow legs REACHED:** no — even the quotes sit 10–20 pts under paper, live about half |
| K (revised) | 21 Oct 14:50 UK | 48 (+22) | **−19.2%** (11 won; thirds −42 / −14 / −2) | −26.3% | 23% | 75% | — | **40 REACHED:** negative; retire |
| S3 (revised) | 21 Oct 08:45 UK | 75 by the study's match (+42) | **−20.4%** (thirds −27 / −19 / −15) | −21.6% | 20% | 35% | — | **40 REACHED** by any match: negative; retire |
| S4 (revised) | 21 Oct 10:28 UK | 10 (+5) | −15.8% | −27.3% | 30% | 30% | — | 10 of 60; retire or leave on paper |

Counts as before: GR = grf rows under 156 buyers, 10–185 s, x_h3; GR2 = the same rows with a 70–80% bundle over 4–10 wallets, x_tsl40; BL = sn8 rows with that bundle and entry MC ≥ $25K, x_tsl40 at curve costs; K = under 912 buyers and MC ≥ $36K, x_t2s40; S3 = sn3b copies of $1M+ coins, creator under 20 launches in 24 h (wider than the page's serial-creator fingerprint; the result is the same sign on either); S4 = socials + first-time creator + original name.

**The GR price error.** Three GR paper rows of 22 Oct — Grand Trump Auto 18:39 UK, The McRib Index 20:26 and 21:04 UK — carry a 1-second price (fs1_x) of 6.6–8.1x: the paper entry was 6–8x below the pool's first real price. The shadow quotes on the same coins were +563%, +570% and +717% above paper, and the legs made −25%, +6% and −19%. Scored raw they printed 5.2–7.3x on the 3-min and were GR's whole forward profit on non-bundle coins, and the 'yes by 1.4 points' of 22 Oct 13:50 UK. numbers.py now applies the lateFix to `grf` rows (six rows touched in all; GR's all-rows line moves from +16.1% to +5.9% on 194). The same launch structure re-launched 'just 1 share' five times with a ~40% paper-entry gap each (under the threshold) — read those rows as flattered too. A tracker flag for fs1_x above 1.3 on PumpSwap rows is a code question for the owner.

## Successes and failures this period

**AS (24):** 10 won, avg +72% — WATERGIRL +277% (peak 4.8x), Larpcoin +110%, Pootcoin +71%, Solana Smash Bros +59%, project kimchi +51%; 12 stopped, avg −52% — CHROMA.exe stopped −53% then peaked 11.9x, tinfoilcat and the second Larpcoin peaked 2.2–2.5x after the stop, the other nine never passed 1.4x; 2 old coins faded. Medians won vs stopped: 68 vs 91 wallets in the trigger minute, 10-s price 1.05x vs 0.96x, peak 2.09x vs 1.28x, creator bought 1.88 vs 0.20 SOL — the reverse of the 22 Oct 05:50 UK reading on that last column, which is the point: nothing at entry separates them (every reading since 21 Oct 11:10 UK).

**GR (46, corrected):** 21 floor/time sells won (Radical Trader 2.07x held to 3 min; the rest at the 1.27–1.30x floor: Capy Glow, Pepe Powell, Shyft, Elon Coin, orbit, Duck Duck Pepe); 7 one-tick stops (Daisy Frog, BurgerBoy, Pool Cheem, vector, X Universal Holdings; peaks 1.1–1.8x); 17 sold by the 10-second rule at 0.76–0.97x — three of them then ran (kimchisol 19.8x, Boss Goblin 9.1x, Pepe the Punk 2.5x), fourteen went nowhere. On bundle coins the 10-s rule costs the runners (also found at 08:05 UK); on the other graduations nothing works (−9.3% on 48, negative in every third).

**BL (47):** 12 won, avg +208% — Capy Glow +1351% (29x), Boss Goblin +581%, Duck Duck Pepe +129%, Wif Kimchi +87% (trail took it at 1.97x, peak 13x), udream +82%, Pepe the Punk +76%, retinue +54%, LastCall +43% (shaken out at 1.4x, peak 19.5x); 20 stopped, avg −59% — Barkito −96%, PEPE GETSBY −89%, Bagel −88%, Retard Stonks −88%, BallerInu −85%, Cyber Coin −82% (peaks 1.0–1.4x: the bundle sold into the first buyers); 15 small losers −20% (spiked 1.4–2.2x, trail sold 0.6–0.9x). Graduated 31 at +64.8% (no-top3 −1.9%) vs not graduated 16 at −62.4% (0 won). Winners and stopped have identical launch medians (bundle 74.27%, 5 wallets, 67.5 SOL): one factory, outcome decided after the buy. The 08:05 UK operator signature on BL's new rows: 4 trades, 1 won (Capy Glow), 3 stopped — including kimchisol at 0.67x from the 4-s entry, the coin GR2 rode to 12x from graduation. Entry point matters more than operator on that one.

**K (22):** 7 won at the 2x sale (+87% each), 14 stopped (−52% to −65%, median peak 1.28x), 1 fade. Nothing at entry separates them (MC $44K vs $50K, 344 vs 355 buyers). **S3 (42):** 10 won at +4% to +10%, 12 stopped at −44%, 20 faded at −13.5%; 26 of the 42 are repeat buys of one name (Schrödinger's Penguin ×8, The Goonicide ×7). **S4 (5):** three small wins, one stop, one fade.

## Costs — does the model still match the legs?

PumpSwap model: yes. `asoc` 60 legs +3.3 points above it (new 23: +2.0); `grad` 40 new shadow legs real −3.8% vs model −3.8% once the three price-error legs are out (entry +3.0% median, exit −1.8%); `gr2` live 14 legs real +64% vs model +78% — the 14-point gap is two legs (Boss Goblin's burst stop landed 0.40x against a 4.1x trigger; Duck Duck Pepe's watcher went blind after a curve buy), the other twelve sold at or above paper; live entry gap +6.3% median at 0.1–0.25.

Curve model on BL's trail: no, and now on enough legs to say so. `bl` 61 shadow legs real +23.7% vs model +38.1% (−14.5 points; the last 44 legs −20 points); entry +3.3% median; the exit quote at the moment the trail fires is a median 5% under paper over 61 and 10% under on the last 44 (mean −17%). The 8- and 13-leg readings in LESSONS ('within 2 points') were too few. Live BL (13 legs, 21–22 Oct) landed 42 points under the model. Dated line added to LESSONS: on a bundle-launch coin take the shadow quote as paper minus 10–20 points and a live trail/stop fill as about half of paper; the fitted curve model applies to sniper 5-min/floor sells only.

## Anything new (luck-checked)

Nothing new proposed. Two settled things moved, both on evidence already in the register:
- **GR's whole-book forward 'yes' (22 Oct 13:50 UK) is overturned** — three price-error rows. Corrected 122 rows: +4.2%, no-top3 −0.3%; non-bundle graduations −9.3% on 48, negative in every third; the gap's 46 rows −3.0% on paper and −4.5% on 40 shadow legs.
- **The bundle split re-passes on the corrected rows:** bundle 74 at +13.0% (no-top3 +5.8%, thirds +20 / +18 / +2) vs other 48 at −9.3% (every third ≤ 0); label-shuffle 15/2000 (23/2000 on 76 rows last time). Real, as settled on 22 Oct; the 3-min exit on it is thin (+0.3% on the gap's 22 bundle rows) and the trail's paper lead (bundle 73 at +96.9%, no-top3 +56.2%) is what GR2's live sells are testing.
- Cannot be told from luck / not real: AS3's 2x exit (+11.3% vs +4.8% on 45, led by the first third only); the operator signature of 08:05 UK on BL's rows (1 of 4 forward).
- Strategy register: no rule edited, none added. The 17 registered rules were not re-scored this run (time); none of them is a kept book.

## What I would do now

1. **AS:** no live money. The 40-leg checkpoint says the fills are fine (+3 points over the model on 60 legs) and the book has not paid since leg 30 (−0.281 SOL over 30 legs; forward 90 at +3.9%, no-top3 −2.0%). Keep paper/shadow running, read again at 120 forward trades. Drop AS2; AS3 on paper to 60; AS4 to 30.
2. **GR (3-min on every graduation):** retire, or keep as the paper yardstick — corrected it is negative without its best 3 on 122 and negative on non-bundle coins in every third. The graduation edge is the bundle coin type; GR2 is that book.
3. **GR2:** the 08:05 UK items stand — fix the 6005 buy-fail path (Capy Glow, 13x, had no leg), re-subscribe the watcher after a curve buy graduates, record the operator signature as a column; the stake went to 0.25 after one 12x and the next four legs at 0.25 lost 0.32 SOL — LESSONS says not to size off the last block. Judge the trail on live sells at 20 legs (14 now). No 10-second rule in GR2.
4. **BL:** shadow only; the 40-leg shadow question is answered (quotes 10–20 points under paper, live about half), so more shadow legs will not change it. What could: the watcher fix plus a live split-exit record that sells into strength.
5. **K and S3:** retire — 40 reached, −19.2% on 48 and −20.4% on 75. **S4:** retire or leave on paper (10 of 60 at −15.8%).
6. **Code questions (owner's call, not reports/ matters):** flag PumpSwap rows whose 1-s price is above 1.3x the paper entry (the GR price error); the push script's silent exits (the 18-hour outage); shadow legs depending on the wallet balance (not seen this period with 1.18 SOL, still a gap).

Nothing here changes the bot; the owner decides.

## Next

- GR2's live legs 15–20 (trail sells vs paper, leg by leg; entry gap at 0.25); whether the 6005/watcher fixes went in.
- AS at 120 forward; AS3 at 60; AS4 at 30.
- GR bundle split at 150 forward rows on the corrected scoring; watch for more fs1_x > 1.3 rows on the 'just 1 share' family.
- BL split exit on paper beside the trail (forward 126 at +18.0%, no-top3 +11.6%) for the live-haircut comparison.
