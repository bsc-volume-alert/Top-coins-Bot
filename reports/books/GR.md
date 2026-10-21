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
**Not working on real quotes. The 40-trade go-live test was failed (20 Oct 23:32 UK).**
- The 40 shadow legs averaged +5.1% a trade at equal stake, but −3.2% without ARTEMI (+329%). They lost −0.231 SOL at the stakes actually used.
- Paper is still +12.3% on 45 (+5.8% without the best trade), but the last 6 h were −15.1% on 13.
- Structural reason: wins are capped at about 1.28x (+19% after costs) while stops cost −44% to −57% real. That needs a win rate of about 72% to break even; GR's real win rate is 52%.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 01:27 UK; graduation book, 3-min exit. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 20 Oct 05:30 UK) | 50 | +9.9% | +4.0% | 66% | 32% | +0.45 |
| before the change (20 Oct 07:30 UK) — back-test | 10 | +47.1% | +26.1% | 90% | 10% | +0.46 |
| since the change — the real test | 40 | +0.6% | -7.0% | 60% | 38% | -0.01 |
| last 24 h | 50 | +9.9% | +4.0% | 66% | 32% | +0.45 |
| last 12 h | 26 | -6.6% | -18.9% | 50% | 46% | -0.20 |
| last 6 h | 13 | -10.3% | -12.9% | 62% | 38% | -0.15 |

Executor book `grad` (shadow, real quotes): 45 legs, -0.262 SOL, average +4.3% a leg, without best -3.1%, won 53%, 20 Oct 05:30 UK to 21 Oct 00:44 UK.

**GR every graduation**

_Data to 21 Oct 01:27 UK; off-page grad, instant ones left out. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 20:35 UK) | 375 | +3.3% | -0.2% | 51% | 33% | +0.87 |
| last 24 h | 180 | +6.6% | -0.8% | 54% | 31% | +1.00 |
| last 12 h | 82 | -1.1% | -5.5% | 51% | 35% | -0.17 |
| last 6 h | 47 | +3.7% | -4.0% | 60% | 34% | +0.13 |
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

## Notable coins
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

## What the owner said / decided
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
- **Awaiting his go (proposed 20 Oct 23:32 UK):**
  - GR stays shadow, **not live**.
  - Add two variant lines: **entry MC ≥ $41.5K**, and a **40% trailing-stop exit** (`x_tsl40`) so winners are not capped at about 1.28x.
- **Live condition NOT met.** The go-live trigger was "40 positive real trades". It is now under 0 SOL and −3.2% without ARTEMI, so it does not go live at 0.05 unless the rule is changed and re-tested.
- **Stake question:** the shadow leg has been at 0.25 SOL since 17:45 UK. The sources do not say who set it or why. Confirm with the owner whether shadow should stay at 0.25 (it helps measure fills at the larger size) or go back to 0.05.
- **"Pool not initialised" sim-fails** (4 of 7 failures): the buy can arrive before the new pool exists. Not yet addressed (e.g. retry after a short wait).
- **Data gaps:**
  - `buyers_entry` is not in abcd.csv for grf rows (join from others.csv grad rows by mint).
  - `x_h3l` is incomplete for 16:25–19:05 UK rows.
  - No GMGN holder snapshot on GR rows.
- **Next decision and its trigger:** whether to stop GR's shadow leg or test the $41.5K / trailing variants forward. Re-judge them on 20+ forward trades each from when they are added; never on the rows they were found on.
