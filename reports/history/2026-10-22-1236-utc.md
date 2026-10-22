# 4-hour study — 22 Oct 2026 13:50 UK

Data: the 13:05 UK push (`pushed_at` 2026-10-22T12:07:03Z; rows to 13:03 UK). **Since last study:** the 09:32 UK run had no new data, so this run covers eight hours, 05:04–13:03 UK. It was a busy stretch — a wave of bundle-launch coins (many of them "kimchi"-named) gave GR 35 new rows and BL 51. The owner acted on the 05:50 UK recommendations in part: the wallet was topped up (0.09 → 0.58 SOL by ~11:00 UK), **BL went back to shadow**, GR's live stake went from 0.05 to 0.1, and **GR2 was switched to live at 0.1** (status.json 13:03 UK; no live GR2 leg yet). Until the top-up, every shadow quote on AS, BL and GR2 failed simulation with "insufficient lamports" (AS lost 10 legs, BL 32, GR2 14) — the shadow counts below are short for that reason, not frozen.

## The kept books

| Book | Change | Trades since the change | Result a trade (real costs) | Without best 3 | Won | Stopped | Shadow / live legs, real vs paper | Checkpoint |
|---|---|---|---|---|---|---|---|---|
| **AS** | 20 Oct 17:45 UK | 66 (+11) | **+4.1%** (no-best +2.1%; 14-blocks +23.9 / +8.5 / −2.4 / −0.9 / −13.9) | −0.6% | 61% | 32% | `asoc` shadow 37 legs +0.586 SOL, +4.1 pts above the model; entry +1.9%, exit −2.2%; only 1 leg in 8 h (10 lost to the empty wallet) | 30-leg condition met on its wording (23:38 UK 21 Oct); 40 legs 3 away; the last 38 paper trades −5% |
| AS2 | 21 Oct 01:30 UK | 44 (+10) | −1.7% | −7.2% | 57% | 39% | — | past 30: no edge over AS; drop |
| AS3 | 21 Oct 01:30 UK | 31 (+7) | +4.4% (back-test 35 at +29.7%) | −3.0% | 65% | 32% | — | **30 reached:** runner not a book; x_t2s40 on the same 31 +16.1% (no-top3 +8.5%), paired +11.7 pts, p 0.10 — watch to 60 |
| AS4 | 21 Oct 14:45 UK | 4 (+0) | −25.5% | — | 25% | 50% | — | 4 of 30; no trade in 22 h |
| **GR** | 21 Oct 09:47 UK | 76 (+35) | **+8.6%** (no-best +6.2%; thirds +0.3 / +3.7 / +21.3; blocks +2.6 / −6.9 / +18.4 / +8.8 / +16.1 / +17.8) | +1.4% | 57% | 24% | live `grad` 17 legs −0.362 SOL; **the 11 new legs +0.073 SOL, real +9.2% vs model +9.7%**; entry gap +10.1% median, exit +0.8%; shadow 19 legs since 09:47 (frozen) | 40-row "no" at 05:50 UK; at 76 the letter reads "yes" by 1.4 points on one 8-h wave; **the bundle split passes** (below) |
| GR2 | 21 Oct 17:00 UK | 40 paper (+30) | +79.4% (no-best +56.3%; median −21.8%) | +12.3% | 40% | 30% | `gr2` shadow 9 legs +0.309 SOL, +2.8 pts above the model, entry +1.5%, exit −2.6%; LIVE at 0.1 since ~11:00 UK, 0 live legs | 9 of 40 legs; paper passes thirds (+47 / +162 / +33) and without-best-3 |
| **BL** | 21 Oct 14:45 UK | 77 (+51) | **+49.0%** (no-best +33.1%; no-top5 −9.1%; median −22.4%) | +1.4% | 35% | 38% | live 13 legs −0.516 SOL, **0 won** (new: feel like dying −95.2%, under its minimum-out again); back to shadow ~11:00 UK: shadow 13 legs +0.305 SOL, within 2 pts of the model | 13 of 40 shadow legs (32 lost to the empty wallet) |
| K (revised) | 21 Oct 14:50 UK | 26 (+10) | **−29.9%** (4 won) | −45.2% | 15% | 85% | — | 26 of 40; retire |
| S3 (revised) | 21 Oct 08:45 UK | 33 (+10) | **−25.0%** (4 won) | −28.3% | 12% | 42% | — | 33 of 40; retire |
| S4 (revised) | 21 Oct 10:28 UK | 5 (+0) | **−27.2%** (0 won) | −42.3% | 0% | 40% | — | 5 of 60; no trade in 32 h |

Counts as before: GR = grf rows under 156 buyers, 10–185 s, x_h3; BL = sn8 rows with a 70–80% bundle over 4–10 wallets and entry MC ≥ $25K, x_tsl40 at curve costs; K = under 912 buyers and MC ≥ $36K, x_t2s40; S3 = copies of $1M+ coins with the serial creator's fingerprint out; S4 = socials + first-time creator + original name. Scoring is numbers.py's (operator coins out, price-glitch rows out, lateFix on curve books).

## Successes and failures this period

**AS (11 new, −10.5%).** Won 5 (Shamonda virus +65.2%, Gooncoin +53.2%, Capycoin +30.2%, Nagi and Pokke +23.4%, Artex +12.0%; median peak 2.51x), stopped 6 at −50% (fartless, Cream of Shrimp Soup Can, Black October, PHP//NULL, Secure The Web, CARLIY0S; median peak 1.18x — fartless peaked 2.54x after the stop). Entry medians won vs stopped: MC $44K vs $44K, 28 vs 29 SOL sold in the trigger minute, 63 vs 67 wallets, creator buy 0 vs 0, bundle 23.5% vs 31.5%. Same as every reading since 21 Oct 11:10 UK: nothing at entry separates them. The forward record is now three negative 14-blocks in a row (38 trades at about −5%); the whole forward profit is the first 28 trades.

**AS3 (7 new, +0.6%)** — the same coins' bundle-5+ subset: 4 won, 3 stopped. At its checkpoint (31): the back-test's +29.7% has not shown up (+4.4%, −3.0% without best 3). The 2x-or-−40% exit leads the runner by 11.7 points paired (better on 13, worse on 6, level 12), p 0.10 — cannot be told from luck, and the exit was first chosen by looking at early forward rows.

**GR (35 new, +13.8%, no-top3 +2.7%).** Successes 23: fifteen sold at the 1.27–1.30x floor for +18 to +21% after peaks of 1.8–20.6x (Waddles 18.6x, Aura Kimchi 20.6x, BIKEchi 17.2x, The Kimchi Bul 11.1x — the 3-min floor gives back everything above 1.3x), six held to 3 min at 1.7–3.0x (BIKEchi +177.9%, kimchi chen in +120.1%, PIGGA +98.0%, Yarnball Cat +65.2%, The Kimchi Bul +59.4%, Pilliam +58.7%). Failures: 6 stops at −58% (one-transaction dumps; KimchiWifHat peaked 16.7x after its stop) and 6 small losers on the 10-s rule or low volume. Price at 10 s: winners 1.29x, stopped 1.01x — the 10-s rule is doing its job; nothing else at entry differs (same $42K MC, same 74.8% / 5-wallet bundle).

**GR2 (30 new paper rows, +80.8%, no-top3 +5.5%)** and **BL (51 new, +49.2%, no-top3 −8.4%).** The same coins seen twice. BL: 17 won (+238% avg; Waddles +1222% and Aura Kimchi +1263% at the 15x cap are the period), 20 stopped (−64% avg; 14 of them dumped to 0.17–0.31x inside the first minute, peaks 1.04–1.19x), 14 small losers. The split that explains both books: of BL's 77 forward coins, the 38 that went on to graduate under GR2's rule made +128% on the trail (no-top3 +34%, won 20 of 38) and the 39 that never graduated lost −28% (no-top3 −42%, won 7 of 39, 59% stopped). BL is GR2's coins bought 10–30 s earlier and about $9K cheaper, plus 39 pre-graduation dumps that GR2 never buys. On the shared coins BL beats GR2 on every one (cheaper entry); on the whole book BL is −9.1% without its top 5.

**K (10 new, −10.1%).** 3 won at the 2x sale (+87% each: Nagi and Pokke, Artex, Dodo The Blackswan — all later 2.4–5.5x), 7 stopped at −51% to −53% (peaks 1.00–1.59x; the three $69–98K entries all stopped). 4 won of 26 against a 59% back-test rate: under 1 in 10,000.

**S3 (10 new, −21.4%).** Two small wins (+6.6%, +4.8%), three stops, five faders; Vaccinu bought four times in four minutes, Japan Coin and Princess Robot Bubblegum twice each — repeat buys of one name are 8 of the 10, as in every period since 21 Oct 17:35 UK. **S4:** no trade in 32 hours. **AS4:** none in 22.

## Costs — does the model still match the legs?

**Shadow: yes.** AS `asoc` 37 legs +4.1 points above the PumpSwap model (entry +1.9%, exit −2.2% median); the one new leg (CARLIY0S) entered 8.5% above paper and exited at paper. BL `bl` shadow 13 legs: real +46.1% vs model +45.8% (the 5 new: −1.9 pts, entry +1.3%). GR2 `gr2` 9 legs: +2.8 pts above the model (new 5: +4.7 pts, entry +1.5%, exit −2.6%; The Kimchi Bul shadow +251%, Pilliam +91%). Both models stand for shadow sells.

**Live GR: for the first time, yes.** The 11 new `grad` live legs (06:05–11:21 UK; 0.05, then 0.1 from 11:09 UK) made +0.073 SOL, real +9.2% a leg against the model's +9.7% on the same paper multiples, 7 won. Exits landed at paper (median +0.8%): the three v0.4.18 local stops sold at or above the paper stop (Crabissant real −31% vs model −51%; KimchiWifHat −25% vs −51%; Otti's paper print was stale, real −6%), the floors and 3-min sells within ±7%. The cost is the entry: +10.1% median (floors +7.5 to +16.3%, kimchi chen in +38%), which turns the 1.27x floor's +18% model result into +5 to +10% real — the same entry gap recorded on 21 Oct 17:35 UK at 0.25 shadow, now on real money at 0.05–0.1. Five live GR buys failed with pump AMM error 6005 in 8 hours (Trumpchi, Pilliam +58.7% paper, BUGGED, 抱擁, Bugs Mode). All 17 live legs: −0.362 SOL, −0.6 pts vs the model — the early −0.43 was the pre-v0.4.18 stops.

**Live BL: no, and the mechanism repeated.** The one new live leg (feel like dying, 08:58 UK): paper stop 0.197x, sold 74% under it, real −95.2%, proceeds 0.0025 SOL against its own minimum-out of 0.0365 — the first sell sim-failed on the min-out check (error 6003, "Right: 36530382"), the retry filled after the dump. Five confirmed sells have now returned less than their minimum-out. 13 BL live legs, 0 won, −0.516 SOL. The book is in shadow since ~11:00 UK; the 05:50 UK LESSONS line stands: a trail or stop sale on a bundle-launch coin in its first minutes fills at about half the paper price. GR2's live trail sells (none yet) will show whether a sale after graduation, on the pool, does better — GR's live 3-min and floor sells on the same coins today did.

**Shadow legs and the wallet:** the executor's shadow simulation uses the real wallet; with 0.04–0.07 SOL in it every shadow buy on AS, BL and GR2 sim-failed ("Transfer: insufficient lamports") until the top-up, in addition to the balance skips found at 09:32 UK. A shadow leg signs nothing; this is a code question for the owner, recorded in LESSONS.md.

## Anything new (luck-checked)

**One pre-registered test now passes out of sample: GR2's coin split.** On GR's 76 forward rows since the 09:47 UK rule, bundle-launch graduations (70–80% over 4–10 wallets) are 52 at +18.4% on the 3-min (no-best +15.0%, no-top3 +8.3%, won 67%, stopped 21%, thirds +15 / +20 / +20) and the other graduations 24 at −12.6% (no-top3 −20.0%, every third negative). Gap +30.9 points, label-shuffle 23/2000. The bundle wins are spread over about 35 launch signatures (largest 4 rows) and the 38 non-"kimchi" bundle rows alone are +15.7% (no-top3 +1.4%) — not one operator, not one name. This is the split pre-registered 21 Oct 16:40/16:50 UK (in sample p 0.059), which failed at 41 rows (05:50 UK: luck 54/2000, negative without best 3) and passes at 76: three periods positive, positive without best 3, one registered test so the family is one. BL's side says the same: graduating coins +128%, non-graduating −28%. I call the coin split real; it says which coins, not which exit.

**What does not pass.** (1) The trail over the 3-min on GR's rows: +52.4% vs +8.6% mean (p 0.02), but the trail is worse on 39 of 74 paired rows (median −1.6 points), and every live trail sell so far (BL, 13 legs) filled at half paper — unproven on real money, by the settled LESSONS line. (2) AS3's 2x exit: +11.7 points paired, p 0.10, exit chosen on early forward rows — cannot be told from luck. (3) GR's whole-book "yes" at 76: +1.4% without best 3 on one 8-hour wave after 50 rows at about zero — not called.

**Strategy register** (out of sample, this run's data): S1 438 at −5.4%; S2 217 at +0.9% (no-best −0.4%); S3(A) 211 at −0.8%; F1 139 at −3.0%; S4(E) 543 at −9.0%; F4 146 at −10.5%; F5 167 at −5.8%; F6 118 at −5.2%; F7 163 at −6.5%; F8 85 at −6.4%; F9 88 at +4.4% (no-best +1.3%, no-top3 −3.0%); F10 70 at +2.4% (no-best −1.1%); F11 108 at −8.7%; F12 39 at −13.3%; F13 71 at −10.9%; F14 33 at −3.9%; F15 40 at −7.4%; F16 39 at +6.1% (no-best −1.1%; needs 40). F2/F3 hand-scored, unchanged. No rule edited; none added — the GR2 split is a registered page book (GR2), not a new register line.

## What I would do now

1. **Graduation books: buy bundle-launch coins only.** The data now supports GR2's coin split and does not support GR on the other graduations (24 at −12.6%, every third negative). GR live at 0.1 on all thin graduations is paying for 24 losers per 52 winners. If one graduation book stays live, make it the bundle-launch one; which exit is the next question, not this one.
2. **GR2 live at 0.1 (the owner's switch this morning): let its first live trail sells decide the exit.** Shadow `gr2` fills match paper (9 legs, +2.8 pts), but shadow is a quote; BL's 13 live trail/stop sells filled at half paper. If GR2's live sells on the pool land near paper, the trail's paper lead (+16.3% vs +1.0% without each exit's best 3) is real money; if they land like BL's, GR2 goes back to the 3-min. Judge at 20 live legs, with the 20-leg self-stop. Keep the stake at 0.1 until then — the live entry gap on fresh pools is +10% at 0.05–0.1 and will not be smaller at 0.25.
3. **BL stays in shadow** (done ~11:00 UK). It is GR2's coins plus 39 pre-graduation dumps; even on paper it is −9.1% without its top 5, and live it is 0 for 13.
4. **AS: no live switch now.** Forward +4.1% on 66 and −0.6% without best 3, three negative 14-blocks in a row; the 30-leg shadow condition was met on 21 Oct but the paper book since has not held. Read again at 40 shadow legs, which needs the wallet to stay funded (10 legs were lost this morning to the empty wallet).
5. **Retire K (26 at −29.9%, 4 won), S3 (33 at −25.0%), AS2 (44 at −1.7%); S4 has had no trade in 32 h and AS4 none in 22 — paper, no cost, but no information coming either.** AS3: keep on paper, record x_t2s40 beside the runner, read at 60.
6. **Code questions (not reports/ matters):** shadow simulation needs a funded wallet; five confirmed sells under their own minimum-out; 125 failed sells in 24 h; five live buy-fails (6005) in 8 h, one of them the period's best coin.

Nothing here changes the bot; the owner decides.

## Next

- GR2's first live legs: entry gap and trail sell vs paper, leg by leg.
- AS at 40 shadow legs (3 away if the wallet stays funded).
- GR bundle split at 100 forward rows; the trail vs 3-min question on live sells only.
- K at 40 / S3 at 40 for the owner's rule, unless retired first.
- F16 at 40 (39 now).
