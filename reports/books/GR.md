# GR — fast, thin graduations (sold at 3 min)
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

This file also covers GR's paper variants (gr70, gr85, grlock, grsoc) and the off-page "every graduation" book (`grad`), which GR was cut from.

## What it is now
- **Code keys:** strategy `grf` (src/copytrade.js, `GR = { MAX_BUYERS: 272, MAX_AGE_S: 185, MIN_AGE_S: 10 }`). The executor book is `grad` (name GR, exit `h3`). Page box GR.
- **Where it runs:**
  - Page box (paper). The page record starts 20 Oct 05:30 UK (`GR_FROM`). It is split before/since 07:30 UK (`CHG_GR`). Rows with age < 10 s are left out, and the 1-second late-price check (`lateFix`) is applied.
  - Executor book `grad`: **SHADOW** (real quotes, simulated, nothing signed), **stake 0.25 SOL** at 23:27 UK 20 Oct (z_status.json). It started at 0.05 SOL. The first 0.25 leg was KAI at 17:45 UK. No source records who raised the stake or why (see Open items).
  - Fingerprint (10-wallet operator) coins are never sent to the executor (v0.18.164) and are left out of the page record.
- **Entry rule:**
  - A coin we tracked from launch graduates (the pump.fun curve completes and it moves to a PumpSwap pool).
  - The coin had **272 or fewer distinct buyers** at graduation.
  - It graduated **10–185 s after launch**.
  - Bought at the graduation price on the new pool. Also required: MC at graduation ≥ $20K, and at least 5 buyers seen since launch (the inherited `grad` gates).
- **Exit:** `x_h3`, the 3-minute sale:
  - −40% stop until 1.5x (the executor sells below 0.6x).
  - Once 1.5x has been seen, a floor at 1.3x.
  - Whatever is left is sold at 3 min. The executor's fallback sell is at 5 min.
  - In practice winners are sold at about 1.25–1.30x (the floor) and losers at about 0.55–0.60x.
- **Paper variants on the same trades (page box lines):**
  - `gr70`: under 70 buyers at graduation. From 05:30 UK, added v0.18.154 at 15:45 UK.
  - `gr85`: 85 s or older at graduation. Same timing as gr70.
  - `grlock` = exit `x_h3l` ("GR-lock"): 3-minute sale, but the floor is 1.1x once 1.25x has been seen. Judged from 16:00 UK, v0.18.155.
  - `grsoc`: socials present only. From 16:00 UK, v0.18.156.
- **"Every graduation" (`grad`), the parent book, off-page:**
  - Paper-enters every graduation of a coin tracked from launch: at least 5 buyers, MC ≥ $20K at the graduation price. Telegram alert only at 250+ buyers (now quiet).
  - Since v0.15.0 (14 Oct 07:53 UK); graduation detected from PumpSwap evidence since v0.17.0 (14 Oct 19:28 UK); the bad-price filter (MC ≥ $20K) since v0.17.1 (14 Oct 21:39 UK).
  - Shown in the off-page / combined 12-h strip as "every graduation (3 min, instant ones left out)", scored on `x_h3` at PumpSwap costs, leaving out age < 10 s (v0.18.162, 18:31 UK 20 Oct).
  - GR is this book filtered to ≤ 272 buyers and 10–185 s.
- **Started:** 20 Oct 05:19–05:30 UK (v0.18.148, executor v0.4.2, migration m042, shadow at 0.05).
- **Last rule change:** 20 Oct 07:30 UK (v0.18.153): coins must be 10–185 s old at graduation, so instant graduations are skipped.

## Verdict now
**21 Oct 11:30 UK:** Keep the 09:47 UK rule (under 156 buyers, 10–185 s, 3-min sale with the 10-second rule). The 40% trailing stop is NOT a proven improvement: its gain is five slow runners on 20–21 Oct (Guzzle Goat, GTA6, CLAUS OTC, Pixel Prowler, CAPDOG), it was worse than the 3-min sale on every graduation before 20 Oct (−22 points), and without the top 3 coins it is level with the 3-min on paper (−0.3 pts) and on real quotes (−1.6% vs −1.1% a leg). Paired sign test p = 0.09. Re-judge at 40 forward rows; x_tsl40 is already recorded on every GR row, so that costs nothing. Only 2 rows under the revised rule so far.

**21 Oct 08:55 UK:** Overturns the 23:32 UK "failed" verdict. 64 real-quote legs +11.7% a leg, +1.137 SOL; the 24 since the verdict +22.7% with real beating paper. The original go-live condition (40 real trades positive) is now met. The few-buyer rule (< 156) is confirmed forward on real quotes. Still dependent on regular 2–3x winners (without best 3 ≈ 0).

**21 Oct 02:30 UK:** The few-buyer graduation is the second real lead in the whole tracker, backed by real quotes, but it has gone flat in the last day.

**Not working on real quotes. The 40-trade go-live test was failed (20 Oct 23:32 UK).**
- The 40 shadow legs averaged +5.1% a trade at equal stake, but −3.2% without ARTEMI (+329%). They lost −0.231 SOL at the stakes actually used.
- Paper is still +12.3% on 45 (+5.8% without the best trade), but the last 6 h were −15.1% on 13.
- Structural reason: wins are capped at about 1.28x (+19% after costs) while stops cost −44% to −57% real. That needs a win rate of about 72% to break even; GR's real win rate is 52%.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 13:20 UK; graduation book, 3-min exit. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 20 Oct 05:30 UK) | 80 | +11.6% | +8.0% | 66% | 30% | +0.85 |
| before the change (20 Oct 07:30 UK) — back-test | 10 | +47.1% | +26.1% | 90% | 10% | +0.46 |
| since the change — the real test | 70 | +6.5% | +2.3% | 63% | 33% | +0.39 |
| last 24 h | 56 | +4.6% | -0.7% | 59% | 36% | +0.20 |
| last 12 h | 30 | +14.4% | +7.4% | 67% | 27% | +0.40 |
| last 6 h | 14 | -11.5% | -20.1% | 50% | 36% | -0.17 |

Executor book `grad` (shadow, real quotes): 74 legs, +0.905 SOL, average +8.9% a leg, without best +4.5%, won 59%, 20 Oct 05:30 UK to 21 Oct 11:43 UK.

**GR every graduation**

_Data to 21 Oct 13:20 UK; off-page grad, instant ones left out. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 20:35 UK) | 447 | +3.3% | +0.4% | 52% | 33% | +1.05 |
| last 24 h | 156 | +1.3% | -1.0% | 53% | 35% | +0.05 |
| last 12 h | 72 | +3.5% | +0.5% | 53% | 36% | +0.18 |
| last 6 h | 30 | -5.2% | -12.6% | 43% | 40% | -0.19 |
<!-- /NUMBERS -->

## Change history
- **13 Oct 16:47 UK (v0.3.0):** graduation detection on the pump.fun feed. At 19:34 UK, v0.4.2 fixed the graduation threshold units.
- **14 Oct 07:53 UK (v0.15.0):** "graduation strategy" (`grad`) created. It paper-enters every graduation we watched from launch, with the +5-min snapshot as features; alerts only at ≥ 250 buyers.
- **14 Oct 19:28 UK (v0.17.0):** graduation is recognised from PumpSwap evidence too.
- **14 Oct 21:39 UK (v0.17.1):** "grad control filters bad prices": entries below $20K MC are treated as bad prices and skipped.
- **18–20 Oct (back-test that created GR):**
  - The "every graduation" book (`grad`) was sliced and fast, thin graduations stood out.
  - At real prices, 18–20 Oct: **94 trades, +33% mean, +16% median, +8.5% without the top 3** (columns.md v0.18.148).
  - The 05:35 UK study called this "the owner's in-sample figure". It had no out-of-sample trade yet.
- **20 Oct 05:19 UK commit / 05:30 UK live (v0.18.148, executor v0.4.2, m042), GR created:**
  - `grf`: ≤ 272 buyers AND graduated ≤ 185 s after launch, sold at 3 min (`x_h3`).
  - Executor book `grad` in shadow at 0.05 SOL, with a new `h3` exit leg and a 5-min fallback sell.
  - Heading of the release: owner, "remove what isn't working, add what has potential".
  - The point of shadow was to see "whether the graduation price can really be bought on the new pool".
  - The plain `grad` row keeps recording every graduation.
- **20 Oct 07:11 UK commit:** GR and S7b page start time fixed to 05:30 UK (it had said 04:30).
- **20 Oct 07:30 UK (v0.18.153), instant graduations skipped (age at graduation now 10–185 s):**
  - Coins that graduate inside their own launch transaction were bought on paper at the curve price, but the real shadow buys paid **+272% (Leonida)** and **+194% (MONUMENTAL EGO)** over paper.
  - Paper showed those two at 3.58x and 2.51x. The real legs were 0.91 and 0.81.
  - The page's GR record also drops the earlier instant ones and applies the 1-second price check.
  - Owner's go at 07:27 UK ("Okay, let's go … yes, go ahead with the proposed changes").
  - Before: 09:35 study +51.6% on 10 rows (+13.4% on the 8 without the two instant ones).
- **20 Oct 15:45 UK (v0.18.154):** paper variants `gr70` and `gr85` added to the GR box. The 24-h strip now ranks by return per trade.
- **20 Oct 16:20 UK (v0.18.155):** new exit column `x_h3l` (GR-lock: floor 1.1x once 1.25x is seen), shown as a GR variant from 16:00 UK.
- **20 Oct 16:35 UK (v0.18.156):**
  - Socials are fetched for every launch at creation, so `has_socials` is known at GR's entry from now on.
  - `grsoc` variant (socials only, from 16:00 UK) added to the box.
- **20 Oct ~17:45 UK, shadow stake 0.05 → 0.25 SOL:** the first 0.25 leg was KAI at 17:45 UK. Not in columns.md or the code.
- **20 Oct 17:55 UK (v0.18.160):** GR shows a before/since line split at the 07:30 UK change, in its shadow box.
- **20 Oct 16:25–19:05 UK (save bug, fixed in v0.18.163):**
  - The hold-exit update threw silently.
  - For copy positions (GR included) that closed before the rule fired, the final `x_h3`/`x_h5` values were not saved.
  - `x_h3l` was not saved in that window either, because it was part of the failing update until 19:05.
  - GR-lock figures are therefore partial for rows opened 16:25–19:05 UK.
- **20 Oct 18:31 UK (v0.18.162):** off-page "every graduation" line leaves out instant graduations (age < 10 s). They are a price error: paper took the curve price, real buys paid 2–3x more.
- **20 Oct 19:15 UK (v0.18.164):** operator-fingerprint coins are skipped everywhere except S10, which covers GR's executor legs and its page record.
- **20 Oct 23:32 UK, analysis:** GR failed the 40-trade test. It was proposed to stay in shadow, with two new variant lines (below). Awaiting go.

- 21 Oct 09:47 UK (v0.18.174 / executor v0.4.6, owner go 09:40 UK): GR revised — under 156 buyers (was 272), age 10–185 s unchanged; 10-second rule in the exit (price 10 s after the buy below the buy price → sell; `h3why` "10s"); executor retries a buy once after 1.5 s when the new pool isn't initialised; guard: a LIVE GR whose last 20 live legs are net negative goes back to shadow by itself with one alarm. Page record split at 09:47 UK. GR stays SHADOW (0.25) until the owner switches it to LIVE from the page.
- 21 Oct 14:15 UK — v0.18.176: the GR box now shows the 40% trail on the same coins as a variant line (grtrail); the corrupt GR-lock line and the 85-s / socials lines are gone. Rule and shadow (0.25) unchanged; re-judge at 30–40 forward rows.

## Ideas tested
- **The whole "every graduation" book (`grad`), 3-min sale, real costs, instant graduations left out** (20 Oct 23:27 UK data):
  - 358 trades, +4.3% (+0.6% without the best).
  - 24 h +8.0% (181), 12 h +3.5% (87), 6 h +4.2% (44).
  - With instant graduations in, it looked much better. The owner's 18:25 UK request found that its profit was mostly that price error.
  - Off-page, recorded only.
- **Fast, thin slice of every graduation** (≤ 272 buyers, ≤ 185 s), 18–20 Oct back-test:
  - 94 trades, +33% mean, +16% median.
  - Later re-reads of the same slice (10–185 s): "+28% on 105, in-sample" around 18:30 UK; then 116 trades at 23:27 UK, +23.7% mean, +17.2% median, won 65%, stops 32%, +12.4% without the best, +3.5% without the best 3 (3-min). The 5-min sale gave +16.4%.
  - Kept, as GR.
- **Instant graduations (age < 10 s):** price error, removed 07:30 UK 20 Oct (above). Kept out.
- **Shadow fills, the entry gap:**
  - 09:35 study: entry gap +2.9% median.
  - 13:35 study: +2.4% median, +6.3% mean, one at +24%. "Fast graduations fill a mean 6% above paper, so the real edge is 2–4 points under the page's figure."
  - 17:40 study: +2.4% median, +6.0% mean.
- **Real vs paper by stake** (20 Oct 23:32 UK, legs matched to paper with real costs):
  - 0.05 SOL, 28 legs:
    - Real +13.4% against paper +27.8%, a gap of **−14.4 points a trade**.
    - Stops: real −57.4% vs paper −59.5% (7).
    - Wins: real +38.9% vs paper +59.8% (20). The gap is almost all on the winners.
  - 0.25 SOL, 11 legs:
    - Real −15.2% against paper −20.1%, a gap of **+4.9 points**.
    - Stops: −43.9% vs −52.8% (6).
    - Wins: +19.2% vs +19.2% (5).
  - Conclusion given to the owner: a bigger stake does not make fills worse.
- **The 40-trade go-live test** (agreed plan: GR live at 0.05 SOL once 40 real-quote trades are positive). Judged 20 Oct 23:32 UK on the 40 closed shadow legs, 05:30–22:43 UK:
  - Equal-stake average **+5.1% a trade**, won 52%. **Without ARTEMI (+329%): −3.2%.**
  - SOL at the stakes used: **−0.231**. z_status.json says 43 legs and −0.228 SOL, win 53.5%.
  - Path:
    - +0.237 SOL cumulative after Duke Nukem (18:20 UK).
    - Then **the last 11 legs, all at 0.25 SOL, averaged −15.2%**. Six of the 11 were stops: Grok Bot, RDSTR LEAGUE, BITFOLIO, Punchdog, SpaceX SuperIntelligence, WIPD.
    - Lowest point −0.294 after WIPD (22:11 UK). Finished −0.231 after Shirley Coin.
  - Why it fails:
    - The exit caps winners at about 1.28x (+19% after costs) while stops cost −44% to −57% for real. Break-even needs a win rate of about 72%; real was 52%.
    - Losers Grok Bot, BITFOLIO, SpaceX, WIPD and GLITCHO were already at 0.81–0.90x one second after the buy: they were dumping into the entry.
    - RDSTR (peak 9.4x) and Punchdog (peak 9.96x) hit the stop first and then ran. The exit threw away two 9x coins.
  - **Sim-fails: 7 GR buys failed simulation.** 4 were "pool not initialised" (AccountNotInitialized on the pool): Paper Panic Hands 05:30, Vending Duck 07:13, Pixel Prowler 10:38 and PokeSolBet 23:12 UK. The buy lands before the new pool exists. The other three:
    - AcityCoin 06:37: IncorrectProgramId.
    - SILESIA TERROR 16:31: pump-amm error 6013.
    - SpaceX SuperIntelligence 21:50: pump trade_v3 error 6005, routed to the curve.
  - **Result: NOT met. GR stays shadow, not live.**
- **Other exits on GR's own 45 paper trades** (20 Oct 23:27 UK data, real costs):
  - `x_h3` (headline) +12.3%, median +17.5%, won 67%, stops 31%, +5.8% without the best.
  - `x_h5` +8.0%.
  - `x_tsl40` (40% trailing stop): **+17.0% overall, +11.6% without the best**, but median −7.4% and won 38%. Last 12 h +2.2% (29), last 6 h −6.7% (13). Proposed as a variant so winners are not capped; still on proposal.
  - `x_h3l` (GR-lock), 16 rows from 16:00 UK: +42.2% mean, median −1.1%, won 38%, **+1.5% without the best**. One coin carries it, and the rows are partial (save bug). Undecided.
- **Candidate entry filters** (all found on the same data; candidates only):
  - **Entry MC ≥ $41.5K:**
    - On GR's 45: kept 33 at +15.8%, dropped 12 at +2.7%.
    - **Last 12 h: kept 22 at +11.2%, dropped 7 at −17.8%.**
    - On the 116-row slice: ≥ $41,536 kept 87 at +33.7% (+18.8% without the best, both halves positive), rest −6.4%.
    - Normal GR entries sit at $41–44K (the graduation price). The filter mainly removes odd prints: GLITCHO $30.1K, SILESIA TERROR $24.0K, dog $75.9K.
    - Proposed as a variant line on 23:32 UK. Still on proposal.
  - **Buyers at graduation < 207:**
    - On the slice: kept 87 at +33.4% (+18.5% without the best, both halves positive), rest −5.5%.
    - On GR's 45: kept 41 at +15.1%, dropped 4 at −15.6%.
    - Candidate, not on the page. Note: `buyers_entry` is in others.csv (grad rows), not in abcd.csv; it has to be joined by mint.
  - **Buyers < 68 / < 70 (gr70):** on the slice, < 68 kept 29 at +86.5% (+42.5% without the best, both halves positive). Running as the `gr70` line. No forward figure in the sources yet.
  - **Age ≥ 85 s (gr85):**
    - On the slice, age ≥ 71 s kept 59 at +36.6%; age ≥ 119 s kept 29 at +54.5%.
    - On GR's own 45 the age split **reverses**: age ≥ 39 s kept 34 at −1.1%, dropped 11 at +53.9%. ARTEMI was 11 s old.
    - Running as `gr85`. Unreliable.
  - **Socials (grsoc):** GR's 45: with socials 37 at +11.2%, without 8 at +17.6%. Last 12 h: −0.9% (21) vs +17.6% (8). No sign that socials help. Line stays on the page.
  - **Top-10 holders < 23%:** cannot be tested; GR rows have no GMGN holder snapshot (0 of 45).
  - **UK hour:** slice entries 00:00–04:00 UK +77.9% on 21; 08:00–12:00 +0.4% on 15. Time of day not acted on.
- **Not registered in the study** (17:40 UK): GR's variants (gr70, gr85, gr-lock), because the buyers-at-graduation count is not in abcd.csv and x_h3l had 2 rows then.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/GR.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): Paper (grf) 50 trades +9.9% (no-best +4.0%), thirds +26.5 / +19.8 / −18.2. Real-quote legs (book grad): equal-stake +5.1% a leg on 45, −3.2% without ARTEMI. Exits: the 15-min hold (x_h15) beats the 3-min exit in all three thirds on paper (+16.6%, no-best +11.7%) but not on every-graduation's 375 trades — not changed. REAL finding (luck 0): on every graduation (375 trades, instant ones out), fewer than 156 buyers at entry — 94 trades +37.9% (no-best +24.2%, no-top3 +10.9%), 66% won, thirds +48.9 / +65.4 / +0.7. Real-quote support: GR's own legs with < 156 buyers +9.0% a leg on 32 vs ≥ 156 −6.6% on 10. Caution: last third ≈ 0, and paper overstates real by ~14 points at 0.05 SOL.

- 21 Oct 08:55 UK — review on fresh data (to 08:43 UK; scratchpad/gr_rev.py), started from the 23:32 UK "failed" verdict and the 02:30 UK few-buyer finding:
  - Real-quote legs (executor `grad`, shadow): all 64 legs +11.7% a leg (without best +6.7%, without best 3 −0.5%), median +10.3%, 59% won, +1.137 SOL at the stakes used (0.05 then 0.25). Up to the 23:32 verdict: 40 legs +5.1%; SINCE it: 24 legs +22.7% (without best +13.0%), median +21.2%, 71% won, +1.368 SOL.
  - Real vs paper on the same 24 coins since the verdict: real +22.7% vs paper +17.8% — real BETTER by 4.9 points (at 0.25 SOL).
  - Few-buyer split on real legs: under 156 buyers 52 legs +16.5% (without best +10.4%), 63% won, +1.465 SOL; 156+ buyers 11 legs −9.8%, −0.327 SOL. Out-of-sample check (found 02:30 UK on paper + 32 legs): the legs since then with < 156 buyers ≈ +33% a leg on 18.
  - Winners are no longer capped near 1.28x: Skibbin 3.38x, The Last Dip 3.14x, Netflix & Chills 2.0x, SOLMATE 1.73x, SYLPH 1.58x (the 1.3x floor only starts after 1.5x, so runners keep running to 3 min).
  - Weakness: fast dumps slip past the stop — Mr.Zero and LolliPop −80.4% real (paper 0.52x / 0.40x), both sold within 15–24 s. 8 "pool not initialised" sim-fails (missed buys).
  - Paper, every graduation by age window (3-min exit): 10–185 s with < 156 buyers 92 trades +37.1% (without best 3 +11.9%), 70% won, thirds +86.8 / +2.3 / +23.7, ~38 a day; 10–185 s with 156–272 buyers 49 trades −4.4%; older than 185 s with < 156 buyers 27 trades +34.0% but without best 3 −3.9% and a −17.3% middle third. → tighten GR's buyer cap, keep its age window.

- 21 Oct 09:20 UK — owner: "last 6 hours made the same as the last 24 … what have we improved to minimise stop losses … why so effective?" (scratchpad/gr_win.py, data to 09:19 UK). Answer recorded: NOTHING was changed (rule unchanged since 20 Oct 07:30 UK). Last 6 h: 20 real legs, all at 0.25 SOL, +1.471 SOL; +29.3% a leg, 75% won, 5 legs ≥ 1.5x, 19 of 20 under 156 buyers. 6–24 h ago: 36 legs, +4.5% a leg but −0.276 SOL because the night's losers were at 0.25 while earlier winners were at 0.05 (at an equal 0.1 a leg it was +0.163). Stops were NOT smaller: 25% stopped in the last 6 h vs 33%, but the average stop was worse (−62% vs −50%; two −80%). The difference was the market: 61% of all graduations in the last 6 h had < 156 buyers (29% in the 18 h before) and those made +33.9% on paper (+0.1% before; +78% the day before) — the few-buyer slice swings a lot by period. By UK hour block (all 64 legs) no clean time-of-day pattern (04–08 +24%, 16–20 +28%, 08–12 −7.8%, 20–24 −8.1%).

- 21 Oct 09:45 UK — LOSERS grouped (owner: "… and minimise the losses"; scratchpad/gr_loss.py, data to 09:19 UK). 64 real-quote legs: 13 big winners (> +30%), 26 small winners, 8 small losers, 18 stopped (≤ −35%). Stopped vs big winners (medians): price 10 s after the buy 0.97x vs 1.21x (5 s: 1.00 vs 1.21; 30 s: 0.84 vs 1.31); held 38 s vs 179 s; creator buy 0.17 vs 0.05 SOL; largest holder 9% vs 17%; launch bundle 52% vs 73% (these last three on small numbers, not luck-checked — not proposed). Age, entry MC, buyers (within < 156), venue: no difference.
  - 10-SECOND RULE ("if the price 10 s after the buy is below the buy price, sell"): paper GR 71 rows +14.4% → +19.3% (< 156 buyers: +19.6% → +23.9%), no big winner lost. On the 64 REAL legs (estimate: exit at the 10-s paper price, pool costs, 4 points entry gap): +12.0% → +15.5% a leg, better in all three thirds (+3.9 / +5.6 / +26.0 → +6.7 / +7.9 / +31.4); cuts 11 legs — 9 stops (BRAIN'T −80, Mr.Zero −80, SYLPH −63, Top Cat −46, Punchdog −46, SpaceX −45, Punani −44, Lüh −42, BITFOLIO −40) turned into small losses, 2 small winners given up (−0.5 points). Cannot help the 3 that crashed within 1–2 s (GLITCHO, dog, WIPD) or the 6 that rose first and crashed later (LolliPop, Burnie, RDSTR, SNAILMAIL, Agentic Wif Inu, SYLPH). Differs from AS (early cuts hurt AS because AS winners often dip early; GR winners don't — 1.21x median at 10 s). Threshold 0.95 and 1.05 also help; 1.0 best and the natural line.

- 21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_GR.md, diag/rev_GR every graduation.md; scratchpad/rev_op/gr1.py–gr4.py). The question: should the exit move from the 3-min sale (x_h3) to the 40% trailing stop (x_tsl40, sell 40% below the running peak, max hold 6 h)?
  - **Winners as a group** (74 paper rows, 3-min): 10 big winners (≥ +50%, avg +153%) and 40 small winners (+18%). Medians: 70–87 buyers at graduation, launch bundle 72–74% of supply over 5–6 wallets, creator buy 0.05 SOL, 1.19–1.20x at 10 s, peak 2.4–3.7x. **Losers as a group:** 22 stopped (−58%) and 2 small losers. Medians: 73 buyers (the same), but bundle 48% over 4 wallets, creator buy 0.17 SOL, 0.97x at 10 s, peak 1.22x with the peak 22 s in. Buyers, age and entry MC do not separate winners from losers inside the rule; the price 10 s after the buy does (that is the 10-second rule, live since 09:47 UK). Under the trail the groups shift: 19 big winners (+171%, peak 3.9x reached 15 min in) against 21 small losers (−16%, the coins the trail sells on a dip the 3-min floor would have held through) and 20 stops.
  - **Exit verdict — paired, the same coins, trail minus 3-min, real costs:**
    - GR's 74 rows: +16.2 points on average but **median 0, better on 31, worse on 31**; sign-flip test p = 0.09; bootstrap 90% range −1.6 to +36.7; **without the top 3 coins −0.3 points**.
    - Every graduation under 156 buyers, 10–185 s (96 rows): +4.1 points, p = 0.34, without the top 3 **−8.9 points**. Under 89 buyers (59): +7.4, p = 0.30, without top 3 −10.9.
    - The rows before GR existed (18–19 Oct, 37): the trail was **worse by 22 points** (p = 0.99). The GR era (59): +20.5 points, p = 0.09, without top 3 −0.2.
    - Real-quote legs (67, book `grad`): real 3-min **+10.6%** a leg (median +10.3%, won 61%); estimated real trail (each coin's paper trail deflated by that leg's own entry gap, plus the observed real-vs-paper slippage by outcome) **+15.9%** (median −15.4%, won 31%); without the top 3: **−1.1% vs −1.6%**. With the 10-s rule on top of the trail +18.7%.
    - Where the trail wins: Guzzle Goat 1.29x → 5.75x, GTA6 Ate My Brain 1.32 → 5.67, CLAUS OTC 1.29 → 5.39, Pixel Prowler 1.29 → 3.77, CAPDOG 1.27 → 3.44, Froaster 2.07 → 3.04 — all slow runners that touched 1.5x, dipped to the 1.3x floor inside 3 min, then peaked 20–30 min later. Where it loses: ARTEMI 4.24x → 1.52x, Skibbin 3.38 → 2.07, The Last Dip 3.14 → 1.98, SOLMATE 1.73 → 1.18, CATZILLA 2.24 → 1.82 — the fast spikes it gives back — plus 21 small losers it sells at −10% to −30% that the 3-min would have sold at the floor. Trail median trade −4.6%, won 45%, against +17.3% and 68% for the 3-min.
    - By 12-h block (every graduation < 156, 10–185 s): trail behind in the first three blocks (+8 vs +15, −7 vs +12, +82 vs +103), ahead in the last two (+12 vs +8, +46 vs +20). Its edge needs a period with slow 5x+ runners; 20–21 Oct had them.
    - **So the "luck 0" in the every-graduation search ("< 89 buyers + tsl40 +57.3%") belongs to the BUYER FILTER, not to the exit.** The exit change cannot be told from luck. UNPROVEN.
  - **The 10-second rule combines with either exit:** GR's 74 rows, trail +29.0% → +31.4% (stops 27% → 12%); 3-min +12.8% → +17.5%; on the revised rule's 62 rows trail +36.2% → +38.1%, 3-min +17.5% → +21.6%. It adds 2–5 points whichever exit is used.
  - **What a "6-hour hold" means for a live book:** no GR position has ever lived 6 h. Paper positions close at −80% from the peak (53 of 74) or when 5-min volume falls under $25K (21 of 74); median life 5.8 min, 75% under 15 min, 90% under 38 min, longest 82 min (Guzzle Goat). The 40% drop came inside 30 min on 55 of 74 (median 2 min); the 19 that took longer are the runners. Capital: at ~57 legs a day and 12.6 min mean life at most 3 positions were open at once, so the executor's cap of 4 per book never bound (0 of 68 entries blocked even with trail-length holds); at 0.25 SOL that is up to 0.75 SOL out at once. Rug risk: a bundle dump is one transaction, so no exit gets −40% — the real stops ran −78% to −80% (Mr.Zero, LolliPop, EMBER) against paper −58% to −70%; that risk is the same for both exits in the first 3 min, but the trail adds a second one, the later dump of a runner (ARTEMI 7.1x → sold 1.52x; RDSTR 9.4x after its stop). A trail sell also lands when volume is dying (the 21 "lowvol" closes): paper assumes a fill at that price; no real sell of that kind has been tested yet.
  - **Factor / pair verdict** (rev_GR.md): 275 filters × 12 exits, 372 pass the three-period test, **0 are unlikely to be luck** (shuffled outcomes reach +46% to +116%; the search space is too big for 74 rows). The under-156 cut keeps its luck 0 from the 02:30 UK diagnosis (every graduation, 375 rows) and is confirmed forward on real quotes (< 156: +14.6% a leg on 56; 156+: −9.8% on 11). Tightening to under 89 does not pay: inside GR's rows 89–155 buyers made +28.3% on 20 with the 10-s rule (< 89: +18.4% on 42); every-graduation < 89 gives the same SOL a day as < 156 from fewer trades.
  - **x_h3l (GR-lock) is CORRUPT:** 6 of 45 GR rows show a 3-min exit above the highest price seen in the first 3 min (Guzzle Goat 6.86x against a 1.81x high by 180 s; RDSTR LEAGUE 7.97x after a 0.56x stop; CLAUS OTC 5.37 vs 1.67; Pepchi 3.53 vs 1.78). Its +46.5% is an artefact — ignore the column everywhere (PG's "best exit x_h3l" included) until the cause is found.
  - **Forward record under the 09:47 UK rule:** 2 rows — EMBER (107 buyers, stopped in 20 s: paper −59%, real −78%) and zonki (16 buyers, sold by the 10-s rule at 0.88x: paper −19%, real +6.6% because the real buy filled 30% under paper). Nothing to judge yet.
  - **Proposed rule: KEEP the 09:47 UK rule** (graduation 10–185 s after launch, under 156 buyers, 3-min sale with the 10-second rule, executor shadow at 0.25). Back-test on GR's own rows: **n62 +21.6% (without best +17.0%, without top 3 +9.9%), won 66%, stopped 15%, thirds +30.4 / +8.0 / +26.7, last 24 h 49 at +15.8%, ~51 trades a day, +1.05 SOL a day at 0.1.** The trail on the same rows: +38.1% (without best +31.5%, without top 3 +18.2%), won 44%, thirds +47.3 / −9.0 / +76.4, +1.90 SOL a day — higher, but a negative middle third and the paired test above. Decision rule for later: re-judge at 40 forward rows (about a day); switch the exit to the trail only if, on those rows, the trail is ahead of the 3-min without its best 3 coins.
- 21 Oct 13:30 UK (data to 13:20 UK): Forward rows under the 09:47 rule so far: 8 — 3-min with the 10-s rule −12.3% (won 38%); 40% trail +83.1% (one coin; no-top3 −57%). Far too few; judge at 30–40 as agreed.
- 21 Oct 13:30 UK (data to 13:20 UK): GR's coins split by launch type: bundle-launch coins (70–80% / 4–10 wallets) 42 at +14.1% (3-min, won 74%, last 24 h 25 at +14.5%) vs other coins 26 at +18.1% (won 62%); gap p 0.59. On the trail the bundle coins do better (+47.7% vs +19.2% on the 10:36 data, p 0.17). Not a rule; it says GR's edge is not only the bundle coins.
- 21 Oct 13:30 UK (data to 13:20 UK): Derived ratio "buyers per second of age < 0.567" on every-graduation <156 rows: 26 at +97% but that is one 13x (144 s, 9 buyers) and one 6.4x; no-top3 +13.9% vs +0.7%, thirds +306 / −23 / +32, and on the trail no-top3 −3% vs +15%. Two-coin story; dropped. "MC per buyer" luck 17/200; dropped.
- 21 Oct 16:40 UK (data to 16:25 UK; scratchpad gr_deep2.py / gr_deep3.py) — owner asked for a full re-analysis of the shadow record ("hone in on weaknesses, what makes a coin successful, is it any coin that didn't pass?"). **83 real-quote legs at 0.25: +1.710 SOL, +11.8% a leg, 59% won; real ≈ paper at real costs (paper 3-min on the same coins +14.7%, a 3-point gap; stops fill 8% below paper, floors 4%).** Thirds +1.7 / +8.7 / +18.8% (improving); forward since 09:47: 17 legs +11.6% but without the top 3 −11.7%.
  - **By exit:** floor 33 legs +21.6% (94% won, +1.35 SOL); 3-min "time" 21 legs +80% (the runners, +3.13 SOL); **stops 26 legs −53.5% (−2.69 SOL)** — a third of all legs and the whole of the loss; 10-s rule 3 legs.
  - **Successes (14 legs ≥ 1.5x real):** 9 of 14 are bundle-launch coins (70–75% bundle over 4–10 wallets: Skibbin, The Last Dip, Ricechi, KIMCHINU, Froaster, CATZILLA, Kimchi Phil, GRUMPINU, SOLMATE). Winners vs losers at entry: buyers 91 vs 70, graduation age 86 vs 65 s, bundle 72% vs 58%, dev buy 0.05 vs 0.10 SOL; same MC ($42K). **Bundle-launch coins inside GR: 43 legs +19.6% a leg, 70% won, +1.664 SOL; other coins 39 legs +3.6%, 49% won, +0.047 SOL** — nearly all of GR's money is bundle-launch graduations. Permutation p 0.16, thirds +14.9 / −5.2 / +27.4 vs −14.9 / +16.6 / +2.2 — a strong hint with a mechanism (the operators run their coins after graduation), not luck-proof yet. Paper on the same coins: 3-min +22.3% vs +6.4%; trail +63.1% vs +2.9%.
  - **Failures (26 stops):** at 30 s after the buy the stopped coins were already at 0.65x (72% below entry), at 60 s 0.46x; the ≥ 1.3x winners were at 1.26x at 30 s. The dump starts inside 30 s, but it cannot be cut by timing: "sell at 30 s if below 0.95" +10.0% vs 3-min +12.5% (−2.6 pts); at 60 s −11 pts; the 10-s rule +1.6 pts (kept). At entry the stopped coins look like the winners (same MC, same wallet counts).
  - **The rule's rejects since 09:47:** 156+ buyers 15 rows −10.2% (trail −10.4%) — right to skip; under 10 s 1 row; over 185 s 3 rows +20% (too few). Buyer bands under 156 are not monotonic (90–120 −4.2%, 120–156 +40.9%) — noise; 0–50 buyers +106% on 21 (no-best +45%).
  - **Age:** older graduations do better in every cut (≥ 85 s +18.3% vs +6.4% real; every-graduation rows ≥ 40 s +38.0% on 85 vs +13.3% on 27, no-top3 +12.4% vs −17.1%) but the best age cut is matched by shuffled outcomes 757/2000 — pattern, not a rule.
  - **Exit, paired on the same 82 coins at real costs:** trail +34.5% vs 3-min +14.7% (+19.8 pts, without top 3 +18.6% vs +5.7%, bootstrap P(no gain) 0.044 — was 0.10 on 62 coins at 11:30 UK); forward 17: +34.8 pts. But 44% won vs 63%, median −6.7%, better on 35 / worse on 35 — a different shape, the gain sits in the runners the 3-min sells early (Ricechi 3.09x at 3 min, peak 5.17x). Split +29.3% (P 0.053); half-at-2x-then-trail +18.2% (P 0.35); 1.5x/−40% +3.4%; 15-min +17.2%.
  - **Time of day (1.5 days, caution):** 04–07 UK +19.4% (22), 12–15 +20.5% (17); 20–03 UK negative on 12 legs.
  - **Proposal:** (a) keep the 3-min rule to the agreed 40 forward rows (17 now), **(b) add the 40% trail as a second shadow leg on the same coins at 0.25** so both exits get real fills side by side (the paper comparison is now at P 0.044; real stops fill 8% under paper and the trail stops more often), (c) record the bundle-launch flag on every GR row and re-check the bundle/other split at 60 forward legs — if it holds, GR's rule becomes "thin graduation of a bundle launch" (the same coin type as BL, bought later). No change to the live/shadow mode.

## Notable coins
- Skibbin (21 Oct 07:05 UK) +245% real, The Last Dip (06:29) +205% real, Netflix & Chills (04:22) +95% — 52–74 buyers each.
- Mr.Zero (07:50) and LolliPop (08:02): −80.4% real each — dumped through the stop within seconds.
- **Leonida (20 Oct 05:38 UK):** an instant graduation. Paper 3.58x; real shadow buy paid +272% over paper and the leg returned −8.9%. One of the two coins behind the 07:30 UK rule change.
- **MONUMENTAL EGO (20 Oct 06:17 UK):** an instant graduation. Paper 2.51x; real paid +194% over paper, leg −19.1%. The other coin behind the 07:30 change.
- **ARTEMI (20 Oct 17:12 UK):**
  - Age 11 s, 147 buyers, $42.0K, no socials. Peak 7.07x, 3-min sale 4.24x.
  - The leg made **+329% (+0.168 SOL at 0.05)**, the whole of GR's real-quote profit. Without it the 40 legs are −3.2%.
  - The same coin was bought by R at 23:39 UK and lost (−40%).
- **Froaster (05:56), CATZILLA (12:00), GRUMPINU (13:20):** real legs +101.9%, +97.9%, +63.9%. These are the few that held up past 1.5x by the 3-minute mark.
- **Moon Stone (13:05), CAPDOG (11:49), KAI (17:45):** peaked 10.29x, 5.83x and 5.82x, but the exit sold them at about 1.27–1.28x. They show the cap on winners.
- **RDSTR LEAGUE (20 Oct 18:42 UK):** 55 buyers, $43.8K, socials, 1-s price 1.17x. Peaked **9.42x**, but was stopped first (0.56). Real leg at 0.25: −57.6% (−0.145 SOL).
- **Punchdog (20 Oct 20:49 UK):** 45 buyers, $43.6K. Peaked **9.96x** after being stopped (0.57). Real −46.1% (−0.116 SOL).
- **Dumping into the entry** (1-s price 0.81–0.90x):
  - Grok Bot (18:42, 209 buyers): −33.5%.
  - BITFOLIO (19:02): −39.8%.
  - SpaceX SuperIntelligence (21:49, 230 buyers): −44.7%.
  - WIPD (22:11): −41.8%, held 1 s.
  - GLITCHO (13:59, $30.1K, 12 buyers, 1-s price 0.43): −60.7%.
- **SILESIA TERROR (16:31 UK):** $24.0K, 21 buyers, 1-s price 0.22, paper −78.8%. The executor buy failed in simulation. An odd price print that the $41.5K filter would remove.
- **BRAIN'T (06:14), Burnie (11:21):** real −79.5% and −72.1%, worse than any paper stop (slippage on the stop).
- **PvePad and Rosy (20 Oct):** bought by PG on the curve before graduation and then by GR at graduation. PvePad was +41.7% on GR's 0.25 leg.
- 21 Oct 16:40 UK (data to 16:25 UK; scratchpad gr_deep2.py / gr_deep3.py): Ricechi (15:40 UK) real 2.71x, paper 3.09x at 3 min, peak 5.17x — the trail's case in one coin; GONE (10:59 UK) real 0.12x: a bundle-launch coin that was dumped inside the first minute (paper 0.13x) — the stop's case; SYLPH bought twice (04:34 stop 0.37x, 04:46 +1.54x).

## What the owner said / decided
- 21 Oct 10:15 UK: keep GR in SHADOW for now with the new changes (no live switch yet).
- 21 Oct 09:40 UK: "Okay, let's go" (GR plan). Asked what the point of 0.05 SOL live is, given fees. Answer: fixed costs ≈ 0.003 SOL a round trip (0.001 tip each way + ~0.0005 priority each way; the token-account deposit is refunded on the sale) = ~6% of a 0.05 stake, ~3% of 0.1, ~1.2% of 0.25. A real-money start tests what shadow can't: transactions landing, real sells in a crash, front-running at size. Recommended 0.1; the switch to LIVE and the stake are his, from the GR box.
- 21 Oct 09:33 UK: "So you've analysed all the trades, and these are your conclusions how to make it more profitable … and minimise the losses." Answer: the loss side had not been grouped yet — done at 09:45 UK (10-second rule).
- 21 Oct 08:37 UK: "let's move to the next coin" (after S3); his 08:26 screenshot showed GR shadow +1.137 SOL on 64, today +1.365 on 21.
- **20 Oct ~05:15 UK:** "remove what isn't working, add what has potential". This led to GR in shadow, S7b into shadow, and F/G/S3/S6b back to paper.
- **20 Oct 07:27 UK:** go for the instant-graduation skip ("Okay, let's go … yes, go ahead with the proposed changes").
- **20 Oct morning (time not recorded):** "Yes, go ahead … but you want to get the prices accurate as possible" (on GR). Also: "We need it to be as accurate as possible" (on the cost models).
- **20 Oct (daytime):** asked to "analyze the successes … GR and F6 … D … S3B and S4B".
- **20 Oct ~18:25 UK:** "Every Graduation 3 Minutes … analyze that in a lot of detail".
  - Finding: the "every graduation" book's profit was mostly the instant-graduation price error, and GR is the real slice (+28% on 105, in-sample).
  - This led to v0.18.162 at 18:31 UK.
- **20 Oct 20:22 UK, trading framework:** either many trades with small profit each, or few trades with a big profit each (about 0.3 SOL a trade minimum).
  - He agreed in principle to two or three separate, non-overlapping profitable books (GR + the best D-family book + PG), with stakes raised step by step.
  - **Agreed plan: GR live at 0.05 SOL after 40 positive real trades**, then one D-family book, then PG if proven, then stakes 0.05 → 0.1 → 0.25 → 0.5 while fills match paper.
- **20 Oct 23:32 UK:** told that GR failed the 40-trade test and that AS is now the better first live candidate. No reply on GR in the log (his next message, 23:51 UK, asked for the AS deep-dive).

## Open items
- PROPOSAL (21 Oct rev): KEEP — graduation 10–185 s after launch with under 156 buyers, 3-min sale with the 10-second rule (the 09:47 UK rule); keep recording the 40% trail beside it and re-judge at 40 forward rows — exit x_h3 (+10-s rule) — n62 +21.6% (no-best +17.0%) thirds +30.4/+8.0/+26.7 luck 0/20 (the buyer cut, 02:30 UK diag; forward-confirmed on 67 real legs) — REAL — the trail's +38.1% is five slow runners on one day, its middle third is −9.0%, paired p 0.09 and level without the top 3; switch only if it leads without its best 3 on the forward rows.
- awaiting go (21 Oct 08:55 UK), replaces the GR2 idea (revise GR, no new book): DONE 09:47 UK: (1) buyer cap, (3) retry, (4) 10-second rule, guard. OPEN: (2) GR LIVE — owner chose to stay in shadow (21 Oct 10:15 UK). Revisit at 30 shadow legs under the revised rule (from 09:47 UK): live at 0.1 SOL if they are positive with real ≈ paper (the 40-real-trade condition is met: 64 legs +1.137 SOL), stepping to 0.1 after 30 positive live legs with real ≈ paper, pause if 20 live legs are negative; (3) retry the buy once after ~1.5 s on "pool not initialised"; (4) [added 09:45 UK] the 10-second rule in GR's exit — sell if the price 10 s after the buy is below the buy price (paper and executor).
- awaiting go (21 Oct diagnosis): GR2 = graduation with fewer than 156 buyers (any age ≥ 10 s), 3-min exit, executor SHADOW at 0.05 SOL beside GR; GR stays shadow. Neither goes live until 30 real legs are positive.
- **Awaiting his go (proposed 20 Oct 23:32 UK):**
  - GR stays shadow, **not live**.
  - Add two variant lines: **entry MC ≥ $41.5K**, and a **40% trailing-stop exit** (`x_tsl40`) so winners are not capped at about 1.28x.
- **Live condition NOT met.** The go-live trigger was "40 positive real trades". It is now under 0 SOL and −3.2% without ARTEMI, so it does not go live at 0.05 unless the rule is changed and re-tested.
- **Stake question:** the shadow leg has been at 0.25 SOL since 17:45 UK. The sources do not say who set it or why. Confirm with the owner whether shadow should stay at 0.25 (it helps measure fills at the larger size) or go back to 0.05.
- **"Pool not initialised" sim-fails** (4 of 7 failures): the buy can arrive before the new pool exists. Not yet addressed (e.g. retry after a short wait).
- **Data gaps:**
  - `buyers_entry` is not in abcd.csv for grf rows (join from others.csv grad rows by mint).
  - `x_h3l` is incomplete for 16:25–19:05 UK rows.
  - [21 Oct 11:30 UK] `x_h3l` is also CORRUPT on rows outside that window: 6 of 45 GR rows print a 3-min exit above the highest price seen in the first 3 min (Guzzle Goat 6.86x vs 1.81x; RDSTR 7.97x after a 0.56x stop; CLAUS OTC, Pepchi, SYLPH, RABBIT PUFF). Looks like the 180-s timer never fires for an armed h3l on some positions and the close price is written instead. Cause not found; the column must not be used for any book until it is.
  - No GMGN holder snapshot on GR rows.
- **Next decision and its trigger:** whether to stop GR's shadow leg or test the $41.5K / trailing variants forward. Re-judge them on 20+ forward trades each from when they are added; never on the rows they were found on.
- PROPOSAL (21 Oct 16:40 UK (data to 16:25 UK; scratchpad gr_deep2.py / gr_deep3.py)): add the 40% trail as a second executor shadow leg (`grad` tsl40) at 0.25 on the same coins; record the bundle-launch flag on GR rows; re-judge exit and bundle split at 40 / 60 forward rows. Awaiting the owner's go.
