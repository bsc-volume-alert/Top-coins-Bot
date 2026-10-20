# OFFPAGE — the old tracker books (recorded, not on the page)
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

These are the tracker's background paper books from 13–17 Oct. They still record trades into the DB and into others.csv. None trades in the executor, none alerts on Telegram (quiet mode since v0.18.91, 18 Oct 17:35 UK), and none has its own box on the page. They appear only in the combined 12-hour strip (below).

Names that clash:
- `confirm` here is the OLD curve confirmation book, **not** the executor book `confirm` (= A5, p5c5).
- `copy` here is the old watched-wallet copy book, **not** the executor book `copy` (= S3 copycat).
- `momentum` is page book **E** (see E.md).
- The "every graduation" book `grad` is in GR.md. The new revival book `rev` is in R.md.

**How the numbers below were scored** (20 Oct 23:27 UK data, as used in the 23:32 UK all-book ranking):
- The strip's own method: exit `x_flow4` (A's runner) where the row has it, else `x_h5`.
- PumpSwap real-cost model. Operator-fingerprint coins left out.
- "All" = every closed row in others.csv. Its start date is not stated in the sources; probably the price fix, 18 Oct 20:25 UK.
- Caveat: the strip treats only `sn*` books as curve trades. Curve-stage books here (early, confirm, secondwave, wave2, climber, revival, slow) are priced with the PumpSwap model, not the curve model.

## Latest numbers, all off-page books
<!-- NUMBERS -->
_Data to 21 Oct 00:09 UK._

- **early** (x_flow4): all 5235 at -33.3%; last 12 h 722 at -29.0%
- **wave2** (x_flow4): all 787 at -10.3%; last 12 h 226 at -10.8%
- **copy** (x_flow4): all 664 at -12.6%; last 12 h 0 at +0.0%
- **mom60** (x_flow4): all 576 at -11.3%; last 12 h 137 at -10.4%
- **momfast** (x_flow4): all 447 at -11.5%; last 12 h 104 at -12.7%
- **mom80** (x_flow4): all 419 at -9.8%; last 12 h 97 at -5.3%
- **momentum** (x_flow4): all 311 at -9.1%; last 12 h 71 at +0.6%
- **momconf** (x_flow4): all 70 at -0.3%; last 12 h 17 at +5.7%
- **momdip** (x_flow4): all 89 at -5.5%; last 12 h 20 at +0.0%
- **momre** (x_flow4): all 175 at -18.6%; last 12 h 50 at -20.4%
- **gradrec** (x_flow4): all 403 at -21.0%; last 12 h 95 at -22.9%
- **gradrun** (x_flow4): all 246 at -7.8%; last 12 h 62 at -1.9%
- **revival** (x_flow4): all 152 at -13.1%; last 12 h 40 at -8.4%
- **slow** (x_flow4): all 95 at -10.5%; last 12 h 22 at -3.1%
- **climber** (x_flow4): all 22 at -13.0%; last 12 h 5 at -20.6%
- **secondwave** (x_flow4): all 5 at -45.0%; last 12 h 1 at -70.9%
- **confirm** (x_tsl40): all 862 at -16.7%; last 12 h 234 at -15.8%
- **p6** (x_h5): all 0 at +0.0%; last 12 h 0 at +0.0%
<!-- /NUMBERS -->

## The combined 12-hour strip and the "✓ worth a look" rule
- **What it is now:**
  - The top strip ranks **every** book together, on the page and off it, on the **last 12 h**, by return per trade.
  - Page books show their 6-h result beside the 12-h one. Off-page books are marked "off the page".
  - The separate off-page box (#bgbox) is hidden.
  - Off-page lines come from `bgBooks()` in src/web.js, using closed trades only, real costs and fingerprint coins left out:
    - B (`p5e30`) and the sniper books are scored at 5 min. Snipers use the curve model and the 1-s late-price rule.
    - `grad` is scored at 3 min, leaving out age < 10 s.
    - Everything else is scored on the runner (`x_flow4`), falling back to `x_h5`.
  - Books with **fewer than 3 trades in 12 h are left out**.
  - The SOL shown is the page's stake × the sum of returns, minus 0.001 SOL a trade.
- **"✓ worth a look"** (v0.18.168) is set when all three hold:
  - **15+ trades in the last 12 h**;
  - still positive **without its best single trade** (the summaries carry `mx`, the best trade after costs; the test is total − best > 0);
  - **positive over 24 h**.
- **Change history:**
  - **20 Oct 18:35 UK (v0.18.161):** a new box under the 24-h strip lists every book recorded but not on the page, last 12 h, closed trades, real costs, best first.
    - Owner, 18:23 UK: "How many coins … behind the scenes … box underneath … last 12 hours P&L … two different colours".
    - Profit is coloured cyan, loss pink.
  - **20 Oct 18:31 UK (v0.18.162):** the "every graduation" line leaves out instant graduations (a price error).
  - **20 Oct 19:16 UK (v0.18.167):** the top strip shows the last 12 h with 6 h beside it. Owner (screenshot): "for the strip, let's just do 12 hours for both".
  - **20 Oct 19:25–19:30 UK (v0.18.168):** one combined 12-h strip for all books, with the "✓ worth a look" tag; off-page box hidden.
    - Owner, in order: "Should we just do it in chronological order? … automatically goes into the box", "Just give me an image of the layout", "I can't see the image. Can you send me a link", then on seeing the mock-up "Yeah, I think that's cool. Let's do that."
  - **20 Oct 19:32 UK (v0.18.169/170):** the book boxes, not the strip, are ordered by the 6-hour SOL each box shows. Owner: "Should be priced in order of last 6 hours … refreshed every 30 seconds", then "No, 10 seconds is good."
- **Open items (from reading the code; not checked on the live page):**
  - `qBG` leaves out `grf`, `rev` and `k` but **not `pg`**, so PG may be listed twice: as its page box, and as an off-page "pg" line at the wrong cost model.
  - **`p6` can never appear**, because P6 rows carry their own exit columns (`x_p6*`), not `x_flow4` / `x_h5`.

## early — early inflow on the curve
- **Now:** `early` (src/signals.js). A coin within its **first 3 minutes**, still on the curve, gets **≥ 10 SOL of buys from ≥ 8 distinct wallets in 60 s** (the create slot excluded). Paper-bought at that trade's price. Max hold 6 h. Positions continue on PumpSwap after graduation.
- **Verdict:** the worst book in the system: **−33.3% a trade on 5,110 closed trades**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:**
  - **13 Oct 16:47 UK (v0.3.0):** early-inflow paper entries with parallel exits.
  - **13 Oct 20:01 UK (v0.5.0):** the momentum exit variants were added.
  - **13 Oct 20:35 UK (v0.8.0):** graduation hand-over and a 6-h maximum hold.
  - **15 Oct onwards:** later exits added to all books.
- **Tested:**
  - 23:27 UK 20 Oct: all −33.3% (5,110); 24 h −33.5% (1,676); 12 h −28.3% (635).
  - 0 closed in the last 6 h, because its trades hold up to 6 h.
  - The 19 Oct 13:28 study came to the same view on launches generally: buying in the first minute loses on average (−22.6% a launch at 5 min).
- **Owner:** nothing specific recorded.
- **Open:** a candidate to stop recording; it is the bulk of others.csv (10,653 rows).

## wave2 — second wave early (2–4 min)
- **Now:** `wave2` (src/lifecycle.js). Checked at **120, 180 and 240 s** of age. Needs:
  - MC $10–40K;
  - **≥ 80 buyers** so far and **≥ 30 new buyers in the last 60 s**;
  - buy$/sell$ ≥ 1.0 over 60 s;
  - launch bundle ≤ 60%.
  - A "tight" tag marks entries at ≤ 180 s, $12–25K MC, b/s ≥ 1.3.
- **Verdict:** steadily negative: **−10.2% on 773**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:**
  - **14 Oct 19:28 UK (v0.17.0):** created ("second-wave-early").
  - **14 Oct 21:39 UK (v0.17.1):** alert only at ≥ 150 buyers and ≥ 50 new in 60 s; all are paper-traded.
  - **15 Oct 04:39 UK (v0.17.4):** "tight" tag with its own summary line.
- **Tested:** 24 h −10.0% (366); 12 h −10.2% (220); 6 h −12.0% (131).
- **Owner:** nothing recorded.
- **Open:** none.

## secondwave — second wave (after the first wave fades)
- **Now:** `secondwave` (src/signals.js). Between 3 and 30 min after launch, on the curve. All of these must hold:
  - the first wave (60-s inflow that peaked ≥ 10 SOL) faded below 25% of its peak for **≥ 5 min**;
  - the launch cluster's net outflow was flat for ≥ 5 min;
  - then 60-s inflow came back to **≥ 8 SOL from ≥ 6 new wallets**.
- **Verdict:** rare and bad: 5 scored trades, −45.0%.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **13 Oct 20:12 UK (v0.6.0):** created. Unchanged.
- **Tested:** 13 rows in others.csv; 5 scored at −45.0%; 1 in 24 h (−70.9%).
- **Owner:** nothing recorded.
- **Open:** none.

## copy — watched-wallet copy
- **Now:** `copy` (src/copytrade.js / wallets.js). Paper-buys when a wallet on the watch list buys **≥ 0.2 SOL** of a coin.
- **Verdict:** negative: **−12.6% on 664**. **No trades at all in the last 24 h**; the sources don't say why (possibly an empty or stale watch list).
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:**
  - **13 Oct 21:45 UK (v0.9.0):** wallet database, watch list and copy paper strategy.
  - **14 Oct 08:14 UK (v0.15.1):** watch list seeded from the first-night analysis.
  - **14 Oct 23:54 UK (v0.17.3):** the proven-wallet bar raised (8+ buys of 0.3+ SOL, high-frequency snipers excluded).
- **Tested:** all −12.6% (664); 0 in 24 h.
- **Owner:** nothing recorded about this book. His later wallet ideas went into S2 / S6 / S6b / S7.
- **Open:** confirm whether it still fires. If not, retire it.

## confirm — old curve confirmation (NOT executor A5)
- **Now:** `confirm` (src/signals.js). **4–10 min after an `early` trigger** on the same coin, a separate trade if:
  - MC is ≥ **1.5x** the early entry MC;
  - the 5-min buy/sell count ratio is ≥ **1.3**;
  - **≥ 10 new buyers** since the early trigger.
- **Verdict:** very negative: **−32.8% on 262** scored. Its brief +1.04 SOL line on the strip was luck.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:**
  - **13 Oct 22:30 UK (v0.10.0):** created.
  - **14 Oct 07:53 UK (v0.15.0):** alerts only at ≥ 250 buyers; all paper-traded.
- **Tested:**
  - Earlier on 20 Oct (around 20:00–22:00 UK, time not recorded): "+1.04 SOL on 16 in 12 h; watch".
  - **23:32 UK: collapsed to −38.9% on 39 in 12 h**, 82% stopped.
  - All −32.8% (262; only 262 of 873 rows carry `x_flow4`).
  - Other exits on the same rows: 40% trail −16.8% (842), 1.5x/−40% −25.9% (262), time exit −47.4% (811).
- **Owner:** told 23:32 UK that "the earlier result was luck".
- **Open:** none.

## climber — slow climber
- **Now:** `climber` (src/lifecycle.js). At the checkpoints **5 → 15 → 30 min** (or 15 → 30 → 60 min):
  - each checkpoint's MC is ≥ 1.3x the previous one, with more buyers;
  - MC ≥ $15K at entry;
  - **never a 1-minute burst ≥ $30K** (that is momentum's job);
  - buys > sells at the last checkpoint.
  - Bought at the last checkpoint.
- **Verdict:** negative and small: **−13.0% on 22**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:**
  - **13 Oct 22:52 UK (v0.13.0):** created.
  - **14 Oct 07:53 UK (v0.15.0):** alerts only at ≥ 250 buyers.
- **Tested:** 24 h −17.0% (12); 12 h −20.6% (5).
- **Owner:** nothing recorded.
- **Open:** none.

## revival — old curve revival (8–60 min coins; NOT book R)
- **Now:** `revival` (src/lifecycle.js). A curve coin, not graduated, **8–60 min old**, with all of these:
  - **≥ 40% below its peak**, the peak being ≥ 180 s old;
  - MC ≥ $5K;
  - **≥ 20 new buyers in 5 min**;
  - 5-min volume ≥ the previous 5 min.
- **Verdict:** negative: **−13.3% on 148**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:**
  - **14 Oct 19:28 UK (v0.17.0):** created, with a combined exit.
  - **14 Oct 21:39 UK (v0.17.1):** "stricter curve revival"; the peak must be ≥ 180 s old.
- **Tested:** 24 h −12.1% (78); 12 h −8.9% (39); 6 h −17.7% (18).
- **Owner:** nothing recorded about this book. His 20 Oct revival idea (Pokémon) became book R; see R.md.
- **Open:** none.

## gradrun — graduation runner
- **Now:** `gradrun` (src/lifecycle.js). **Within 15 min of graduation**, all of these:
  - 5-min volume ≥ **$80K**;
  - **≥ 30 new buyers in 2 min**;
  - buy$/sell$ ≥ 1.0 over 5 min;
  - MC ≥ $20K.
- **Verdict:** negative: **−8.5% on 244**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **14 Oct 21:39 UK (v0.17.1):** created. Unchanged.
- **Tested:** 24 h −2.3% (106); 12 h −4.3% (65); 6 h −8.1% (42).
- **Owner:** nothing recorded.
- **Open:** none.

## gradrec — graduation recovery (dip-buy after graduation)
- **Now:** `gradrec` (src/lifecycle.js). A graduated coin **≥ 60% below its post-graduation peak**, with:
  - MC ≥ $5K;
  - **≥ 20 new buyers in 5 min**;
  - 5-min volume ≥ the previous 5 min.
- **Verdict:** one of the worst: **−20.2% on 403**, the same in every window. It is live evidence, alongside the candle study in R.md, that **buying the dip after graduation loses**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **14 Oct 21:39 UK (v0.17.1):** created. Unchanged.
- **Tested:** 24 h −20.8% (189); 12 h −20.6% (102); 6 h −20.0% (61).
- **Owner:** his 20 Oct 18:45 UK "buy them on the first dump?" is answered by this book and by the candle study: no.
- **Open:** none.

## slow — slow build (base breakout)
- **Now:** `slow` (src/lifecycle.js). A coin **≥ 10 min old** with all of these:
  - fell **≥ 50% from its peak**;
  - the low was **≥ 10 min ago** (it went sideways);
  - the price is now **≥ 30% above the low**;
  - **3 back-to-back 5-min windows** of rising buyers and volume;
  - **≥ 30 new buyers in 10 min**;
  - MC ≥ $8K.
- **Verdict:** negative overall (**−9.7% on 94**), but the last 6 h were +8.6% on 10. Not meaningful.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **14 Oct 22:14 UK (v0.17.2):** created. Unchanged.
- **Tested:** 24 h −9.5% (52); 12 h +1.6% (24); 6 h +8.6% (10).
- **Owner:** nothing recorded.
- **Open:** none.

## momentum — the $100K-in-5-min core trigger (= page book E)
- **Now:** `momentum` (src/momentum.js). **$100K of PumpSwap volume in 5 min**, with sanity gates:
  - ≥ 10 swaps from ≥ 5 wallets;
  - coin ≥ 60 s old;
  - buy$/sell$ ≥ 1.0;
  - paper only under a $2M MC cap;
  - 30-min cooldown.
  - The "core" subset is an entry under $100K MC, first entry.
- **This is book E; its full notes are in E.md.**
- **Verdict:** negative: −8.7% on 443 on the strip's scoring.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:**
  - **13 Oct 20:01 UK (v0.5.0):** created.
  - **15 Oct 13:50 UK (v0.18.11):** any coin age allowed.
  - The rest: see E.md.
- **Tested:** 24 h −6.0% (183); 12 h −1.7% (107); 6 h +2.2% (65).
- **Owner:** see E.md.
- **Open:** see E.md.

## mom60 / mom80 — lower-volume momentum tiers
- **Now:** `mom60` and `mom80` (src/momtiers.js). The momentum rule at **$60K** and **$80K** of 5-min volume (below the $100K rule), with the same gates and a 30-min cooldown. Silent.
- **Verdict:** both negative: **mom60 −11.7% on 570**, **mom80 −10.6% on 416**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **15 Oct 07:49 UK (v0.18.6):** created "for like-for-like comparison with the $100K rule". Unchanged.
- **Tested:**
  - mom60: 24 h −10.7% (234); 12 h −12.1% (138); 6 h −14.7% (95).
  - mom80: 24 h −7.3% (165); 12 h −9.1% (100); 6 h −9.5% (67).
  - Lower volume thresholds are worse than $100K.
- **Owner:** nothing recorded.
- **Open:** none.

## momfast — fast momentum tier
- **Now:** `momfast` (src/momtiers.js). **$50K of volume in 2 min**, same gates, own cooldown.
- **Verdict:** negative: **−10.8% on 442**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **15 Oct 14:44 UK (v0.18.12):** created (same pace as $125K / 5 min). Unchanged.
- **Tested:** 24 h −10.6% (175); 12 h −9.8% (104); 6 h −12.9% (76).
- **Owner:** nothing recorded.
- **Open:** none.

## momdip — buy the 20% dip after a momentum trigger
- **Now:** `momdip` (src/momentum.js). After a core momentum trigger, buy if the price falls **20% below the trigger price within 10 min**, unless it first rose 1.5x.
- **Verdict:** negative overall (**−3.2% on 87**, −6.5% without the best), but the best off-page book in the last 12 h (+12.1% on 20). **"Watch it, don't trust it yet"** (20 Oct 23:32 UK).
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **15 Oct 13:30 UK (v0.18.9):** created (dip-entry variant). Unchanged.
- **Tested:** 24 h +4.8% (35); 12 h +12.1% (20); 6 h +14.1% (12).
- **Owner:** told 23:32 UK to watch it, not trust it.
- **Open:** it would earn the "✓ worth a look" tag only at 15+ trades in 12 h, positive without its best, and positive over 24 h. Re-check it at the next study.

## momre — momentum re-entry
- **Now:** `momre` (src/momre.js). After a core momentum entry, the coin is watched as if traded by "sell at 1.5x, cut at −25%". When that rule would be flat and all of these hold:
  - the coin is still a core coin (5-min volume ≥ $100K, buyers outweigh sellers, under the cap);
  - the price has reclaimed the exit price;
  - then re-enter: at most 5 times per coin, ≥ 60 s apart.
- **Verdict:** clearly negative: **−18.9% on 174**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **15 Oct 13:30 UK (v0.18.9):** created. Unchanged.
- **Tested:** 24 h −19.4% (80); 12 h −19.0% (52); 6 h −8.9% (27). Re-entering on retraces is worse than entering once.
- **Owner:** nothing recorded.
- **Open:** none.

## momconf — Project 4, 60-second confirmation of the momentum trigger
- **Now:** `momconf` (src/momentum.js). **60 s after a core momentum trigger**, buy only if the price is above 1.0x the trigger price (first tick up to 120 s).
- **Verdict:** break-even: **−0.3% on 68** (−4.4% without the best).
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:**
  - **16 Oct 21:52 UK (v0.18.32):** created as Project 4 (pre-registered).
  - **17 Oct 12:00 UK (v0.18.57):** retired from the website, still recorded.
- **Tested:** 24 h +3.0% (25); 12 h +4.6% (17); 6 h −3.9% (10). The same "confirm" idea as A5 / F6 on the A trigger, which also failed (see A5.md / F6.md).
- **Owner:** nothing recorded since its retirement.
- **Open:** none.

## p6 — Project 6, "sleepers" (older coins waking up)
- **Now (v3, since 18 Oct 14:23 UK):** `p6` (src/p6.js). Each trade logs its tier, venue, GMGN snapshot and P7 flags.
  - Entry, all of these:
    - coin **6–72 h old**;
    - **$300K–$600K MC**;
    - 5-min volume **≥ $60K and ≥ 10% of MC**;
    - buys ≥ sells;
    - one entry per coin per 24 h;
    - any Solana DEX (our feed or GMGN).
  - Exit:
    - −40% stop until 2x;
    - at 2x sell half;
    - the rest on a 50% trail from the peak;
    - 6-h limit; no golden rule.
- **Verdict:** **undecided / unmeasured.** Only 8 rows in others.csv, and it never shows on the strip (its own `x_p6*` columns aren't read).
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:**
  - **17 Oct 12:53 UK (v0.18.60):** P6 sleepers created.
    - The owner's idea, 17 Oct: "simulator", 6 months old, went $200K → $3M in an hour; our feed only noticed it at $1.88M.
    - Rule: ≥ 6 h old, $300K–$1.5M, $100K in 5 min; half at 4x, the rest rides 24 h.
  - **17 Oct 19:08 UK (v0.18.65, owner 19:04), v2:**
    - ≥ 12 h old, $60K in 5 min.
    - Exits A (all at 2x), B (half at 2x + 40% trail) and C (all at 3x), each with a −40% stop and the $15K "golden rule" (sell when 5-min volume < $15K).
  - **17 Oct 19:13 UK (v0.18.66, owner 19:11):** $60K / $80K / $100K as separate trades; minimum age back to 6 h.
  - **18 Oct 01:47 UK (v0.18.82):** headline = exit A (all at 2x).
    - Around then: 14 P6 trades at 0.25 SOL. Exit A won 11 and netted +1.12 SOL; B +0.97; C +0.55 (in-sample, 14 coins).
  - **18 Oct 14:23 UK (v0.18.88, owner 14:07, after the 18-h wake-up review), v3** (the rule above).
    - The golden rule was dropped: at $15K it was only 3.6% of these coins' MC and closed 8 of 11 inside two hours.
    - P7 "slow sleepers" folded in as flags (sustained volume; holders clean: top 10 < 20%, dev < 5%, bundle < 15%).
  - **19 Oct 13:58 UK (v0.18.125):** P6 card removed from the page (compact page).
- **Tested:** no v3 result recorded in the sources.
- **Owner:** P6 was his idea. He set v2 (17 Oct 19:04), the levels (19:11) and v3 (18 Oct 14:07).
- **Open:** if P6 is still wanted, score it on its own exit columns. It is invisible in the 12-h strip.
