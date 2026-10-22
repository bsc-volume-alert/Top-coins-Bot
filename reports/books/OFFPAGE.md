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
_Data to 22 Oct 01:04 UK._

- **early** (x_flow4): all 7335 at -34.0%; last 12 h 129 at -20.6%
- **wave2** (x_flow4): all 939 at -11.8%; last 12 h 18 at +3.6%
- **copy** (x_flow4): all 664 at -12.6%; last 12 h 0 at +0.0%
- **mom60** (x_flow4): all 756 at -11.7%; last 12 h 31 at -6.5%
- **momfast** (x_flow4): all 564 at -12.1%; last 12 h 1 at +55.5%
- **mom80** (x_flow4): all 552 at -11.5%; last 12 h 23 at -3.7%
- **momentum** (x_flow4): all 426 at -10.0%; last 12 h 32 at -17.3%
- **momconf** (x_flow4): all 80 at -5.7%; last 12 h 0 at +0.0%
- **momdip** (x_flow4): all 102 at -8.4%; last 12 h 0 at +0.0%
- **momre** (x_flow4): all 209 at -16.1%; last 12 h 0 at +0.0%
- **gradrec** (x_flow4): all 512 at -20.6%; last 12 h 2 at -54.0%
- **gradrun** (x_flow4): all 323 at -8.1%; last 12 h 2 at -0.7%
- **revival** (x_flow4): all 197 at -13.7%; last 12 h 0 at +0.0%
- **slow** (x_flow4): all 127 at -15.3%; last 12 h 3 at -52.8%
- **climber** (x_flow4): all 26 at -14.0%; last 12 h 1 at -51.3%
- **secondwave** (x_flow4): all 8 at -44.7%; last 12 h 0 at +0.0%
- **confirm** (x_tsl40): all 1070 at -18.4%; last 12 h 17 at +4.4%
- **p6** (x_h5): all 0 at +0.0%; last 12 h 0 at +0.0%
<!-- /NUMBERS -->
- 21 Oct 14:15 UK — v0.18.176: all 15 old off-page books stopped opening positions (config OFF_KINDS; env OFFPAGE_BOOKS=1 re-enables). Core momentum trigger (E's rows) keeps recording; mom60/mom80 and copycreator keep recording. Open positions closed normally.

## Diagnosis 21 Oct 02:30 UK (all data to 01:42 UK; diag/OFF_*.md; luck-checked)
- early −33.5% on 5,520 · confirm −17.6% on 886 · copy −12.6% on 664 (stopped 19 Oct) · wave2 −10.8% on 800 · mom60 −11.6% on 586 · momfast −11.1% on 461 · momre −18.6% on 177 · gradrec −21.0% on 419 · revival −13.5% on 155 · slow −11.3% on 99 · climber −13.0% on 22 · secondwave 5 trades · p6 0 trades — nothing passes the luck check in any of them; dead.
- mom80 −9.9% on 429: one real cut (entry MC < $53.8K, 65 trades +9.9%, luck 0) but thirds +14.1 / +19.3 / −1.4 — faded.
- momentum −8.8% on 318: 5-min volume ≥ $100K 48 trades +17.2% (luck 1) — only in the last third (same coins as page book E).
- momconf −1.9% on 72: 15-min hold / 40% trail look +23% but without best +4–5% and last third negative.
- momdip −6.0% on 90; gradrun −7.8% on 256 (take-profit at 1.5x −2.1%, last two thirds slightly positive) — near break-even, no real slice.
- Verdict: none of the off-page books is worth a box. Proposal awaiting go: stop showing them in the 12-hour strip except gradrun and mom80 as watch lines.

## Revision search 21 Oct 11:05 UK (data to 10:36 UK; diag/rev_OFF_*.md) — the momentum books
- The $60K / $80K / $100K-in-5-min family (mom60, mom80, momentum = E, momfast, plus momconf / momdip / momre built on it) shares its coins: 86 of mom80's best slice are all in mom60, 84 in momfast, 77 in momentum/E, 71 in the every-graduation book. Whole books all −6% to −17% under their best exit.
- One slice is positive on every tier: coin under ~6 min old and entry MC under ~$76K — a coin that graduated minutes ago and immediately did $60–100K of volume. Only mom80's version clears the luck bar (86 trades +10.9% at 1.5x-out, luck 0/20); the same thresholds on the other tiers give −0.6% to +2.8% at 1.5x-out, and E's rows want a trailing exit instead (+15.9%, no-best +7.0%) — noise around a modest common edge, with the exit unsettled. The graduation books buy the same coins a median 144 s earlier at 1/1.45 of the price. Proposal: one forward test on mom80 (its section below); switch the other six off the strip. Nothing found on momconf, momdip or momre.

## Revision search 21 Oct 11:30 UK (data to 10:36 UK; diag/rev_OFF_*.md) — the curve, copy and graduation off-page books (early, wave2, secondwave, copy, confirm, climber, revival, gradrun, gradrec, slow)
- All ten confirmed dead. Whole books −8.6% (gradrun) to −34.0% (early) under their best exit; no exit is positive on any of them. The revision search (every entry-time column × every recorded exit × pairs, luck-checked against 20 shuffled runs): early, wave2, confirm, revival, climber — nothing passes the three-period test at all; secondwave 8 trades, too few. The three slices that do pass are not books: gradrec (entry MC ≥ $66K, 2x-out, luck 0) is +1.8% on 73 with +0.6% without its best, a −16.5% last third and −18.8% in the last 24 h — break-even and fading; copy (entry MC under $1,364, 2x/−40%, luck 2) is +3.6% on 100 but the book has not fired since 19 Oct and a $1.4K entry is the launch price itself, not a price anyone can buy; gradrun (under 307 buyers, 40% trail) is +12.0% on 45 with luck 15 of 20 — the same few-buyer idea GR already trades, found here by chance. Proposal: switch all ten off the strip (keep recording where it is free); nothing to forward-test.
- Note on costs: the curve-stage books here (early, confirm, secondwave, wave2, climber, revival, slow) are priced with the PumpSwap model, not the curve one; the curve model is 2–4 points worse at the same multiple, so these figures flatter them.

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
- **21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_OFF_early.md):** 6,571 trades −34.0% (no-best −34.0%), −33% to −35% in every third; best exit the 40% trail at −27.0%. 65 filters × 8 exits: nothing passes the three-period test; shuffled runs find nothing either. Dead at every cut.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop early (recording too: it is the bulk of others.csv) — exit x_flow4 — n6571 -34.0% (no-best -34.0%) thirds -33.3/-34.0/-34.6 luck n/a (nothing passes) — no profitable version found — buying in the first 3 minutes on inflow loses the same in every third under every exit.

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
- **21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_OFF_wave2.md):** 892 trades −11.9% (no-best −12.2%), thirds −10.3 / −8.7 / −16.6; best exit the trail at −11.4%. 47 filters × 11 exits: nothing passes. Dead.
- **Owner:** nothing recorded.
- **Open:** none.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop wave2 — exit x_flow4 — n892 -11.9% (no-best -12.2%) thirds -10.3/-8.7/-16.6 luck n/a (nothing passes) — no profitable version found — negative in every third under every exit, no cut passes.

## secondwave — second wave (after the first wave fades)
- **Now:** `secondwave` (src/signals.js). Between 3 and 30 min after launch, on the curve. All of these must hold:
  - the first wave (60-s inflow that peaked ≥ 10 SOL) faded below 25% of its peak for **≥ 5 min**;
  - the launch cluster's net outflow was flat for ≥ 5 min;
  - then 60-s inflow came back to **≥ 8 SOL from ≥ 6 new wallets**.
- **Verdict:** rare and bad: 5 scored trades, −45.0%.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **13 Oct 20:12 UK (v0.6.0):** created. Unchanged.
- **Tested:** 13 rows in others.csv; 5 scored at −45.0%; 1 in 24 h (−70.9%).
- **21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_OFF_secondwave.md):** 8 closed trades at −44.7% — too few to search, and every one a loser.
- **Owner:** nothing recorded.
- **Open:** none.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop secondwave — exit x_flow4 — n8 -44.7% (no-best n/a) thirds n/a luck n/a (too few) — no profitable version found — 8 trades, all losers; the trigger fires about once a day.

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
- **21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_OFF_copy.md):** 664 trades −12.6% (no-best −13.0%), thirds −0.8 / −16.5 / −20.5; best exit 1.5x/−40% at −8.7%. One cut passes with luck 2: entry MC under $1,364 with the 2x/−40% exit — 100 trades +3.6% (no-best +2.8%, thirds +3.0 / +3.4 / +4.5). It is not a book: a $1.4K market cap is the launch price itself (the watched wallet bought in the create block), so the paper entry is the one price nobody else gets; and the book has not fired since 19 Oct (0 in 24 h). Dead.
- **Open:** confirm whether it still fires. If not, retire it.
- PROPOSAL (21 Oct rev): SWITCH OFF — retire the old watched-wallet copy book — exit x_flow4 — n664 -12.6% (no-best -13.0%) thirds -0.8/-16.5/-20.5 luck 2/20 (the one cut) — no profitable version found — its only passing cut (entry MC under $1.4K, +3.6%) is the launch price, unbuyable, and the book stopped firing on 19 Oct.

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
- **21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_OFF_confirm.md):** 1,020 trades −18.3% (no-best −19.2%), thirds −16.3 / −17.7 / −20.8 on the trail (its only exit with coverage; 2x-out −23.5%, hold −49.1%). 65 filters × 4 exits: nothing passes. Dead.
- **Owner:** told 23:32 UK that "the earlier result was luck".
- **Open:** none.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop the old curve confirmation book — exit x_tsl40 — n1020 -18.3% (no-best -19.2%) thirds -16.3/-17.7/-20.8 luck n/a (nothing passes) — no profitable version found — a thousand trades, negative in every third, no cut passes.

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
- **21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_OFF_climber.md):** 25 trades −12.5% (no-best −15.2%), thirds −3.3 / −19.2 / −16.1; best exit 2x/−40% at −7.0%. 47 filters × 11 exits: nothing passes. Dead, and too rare to matter (10 a day).
- **Owner:** nothing recorded.
- **Open:** none.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop climber — exit x_flow4 — n25 -12.5% (no-best -15.2%) thirds -3.3/-19.2/-16.1 luck n/a (nothing passes) — no profitable version found — negative under every exit and too rare to test.

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
- **21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_OFF_revival.md):** 190 trades −13.8% (no-best −14.3%), thirds −15.4 / −12.2 / −13.9; best exit 3-min at −10.7%. 47 filters × 11 exits: nothing passes. Dead — the same answer as book R and the candle study: buying a bounce loses.
- **Owner:** nothing recorded about this book. His 20 Oct revival idea (Pokémon) became book R; see R.md.
- **Open:** none.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop the old curve revival book — exit x_flow4 — n190 -13.8% (no-best -14.3%) thirds -15.4/-12.2/-13.9 luck n/a (nothing passes) — no profitable version found — negative in every third under every exit; same verdict as R.

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
- **21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_OFF_gradrun.md):** 296 trades −8.6% (no-best −9.5%), thirds −18.6 / −3.3 / −3.7; best exit 1.5x-out at −4.0%. 61 filters × 11 exits + 3 pairs: 6 pass the three-period test, **0 beat luck** (shuffled runs find +1% to +37%). The pick — under 307 buyers at entry with the 40% trail, 45 trades +12.0% (no-best +5.5%, thirds +7.8 / −2.8 / +20.8, 29 in the last 24 h at +24.1%) — has luck 15 of 20. It is GR's few-buyer idea arriving later (within 15 min of graduation after $80K of volume) at a higher price; GR already trades it at graduation. Not a book.
- **Owner:** nothing recorded.
- **Open:** none.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop showing gradrun (keep recording if free) — exit x_flow4 — n296 -8.6% (no-best -9.5%) thirds -18.6/-3.3/-3.7 luck 15/20 (its best cut) — UNPROVEN — its one positive cut (under 307 buyers, trail, +12.0% on 45) is luck 15 of 20 and is GR's trade bought later and dearer.

## gradrec — graduation recovery (dip-buy after graduation)
- **Now:** `gradrec` (src/lifecycle.js). A graduated coin **≥ 60% below its post-graduation peak**, with:
  - MC ≥ $5K;
  - **≥ 20 new buyers in 5 min**;
  - 5-min volume ≥ the previous 5 min.
- **Verdict:** one of the worst: **−20.2% on 403**, the same in every window. It is live evidence, alongside the candle study in R.md, that **buying the dip after graduation loses**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **14 Oct 21:39 UK (v0.17.1):** created. Unchanged.
- **Tested:** 24 h −20.8% (189); 12 h −20.6% (102); 6 h −20.0% (61).
- **21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_OFF_gradrec.md):** 481 trades −20.1% (no-best −20.7%), −18% to −22% in every third; best exit the trail at −17.9%. 61 filters × 11 exits: one cut passes with luck 0 — entry MC ≥ $66K with the 2x-out exit, 73 trades +1.8% (no-best +0.6%), thirds +5.5 / +7.2 / −16.5, last 24 h 18 at −18.8%. Luck 0 only because shuffled outcomes on a −20% book never produce a positive cut; +0.6% without its best and fading is break-even, not a book. Dead.
- **Owner:** his 20 Oct 18:45 UK "buy them on the first dump?" is answered by this book and by the candle study: no.
- **Open:** none.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop gradrec — exit x_flow4 — n481 -20.1% (no-best -20.7%) thirds -21.5/-18.2/-20.7 luck 0/20 (its one cut, +1.8% on 73) — no profitable version found — dip-buying after graduation loses −20% in every third; the one luck-0 cut is +0.6% without its best and −18.8% in the last 24 h.
- 21 Oct 13:30 UK (data to 13:20 UK): On bundle-launch coins (70–80% / 4–10 wallets) gradrec is the worst trade in the data: 86 at −37.1% (won 12%); trail −25.8%, 1.5x take-profit −46.9%. On other known coins −16.4% on 378. The post-graduation dump of an operator coin is the exit, never a dip. Settled.

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
- **21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_OFF_slow.md):** 118 trades −13.5% (no-best −14.4%), thirds −8.6 / −17.9 / −14.2; best exit 1.5x/−40% at −11.2%. 61 filters × 11 exits + 1 pair: 4 pass, 0 beat luck; the pick is an hour-of-day cut (after 17:45 UK, 2x-out, 30 trades +5.6%, no-best +2.8%, luck 8). The 20 Oct "+8.6% on 10 in the last 6 h" did not hold (last 12 h now −24.7% on 25). Dead.
- **Owner:** nothing recorded.
- **Open:** none.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop slow — exit x_flow4 — n118 -13.5% (no-best -14.4%) thirds -8.6/-17.9/-14.2 luck 8/20 (its best cut) — no profitable version found — negative under every exit; its only cut is an hour-of-day split that shuffled outcomes match.

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
- **21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_OFF_momentum.md):** 365 trades −9.8% (no-best −10.6%), 141 a day, −1.52 SOL a day at 0.1 — but 206 of the 365 are NOT core (entry MC ≥ $100K, median $132K, −13.8%); the 159 core rows (= book E, deduplicated) are −4.5%. No exit positive on the whole book. 93 filters × 11 exits + 44 pairs; 46 pass, **0 beat luck** (shuffled runs up to +21%); pick: coin under 249 s old AND no socials known, 1.5x-out — 44 trades +12.1% (no-best +11.4%), luck 8/20, only 7 in the last 24 h. The young-and-cheap slice (mom80's thresholds, see mom60/mom80 below) on the 159 core rows: 1.5x-out +2.8% (63), 2x/−40% +12.9%, 40% trail +15.9% (no-best +7.0%), runner +13.4% — positive, but E fires last of the three tiers on the same coins. Full notes and the data problem (numbers.py's E double-counts 158 rows and adds the 206 non-core ones) in E.md. **No version of momentum/E itself; the family's forward test is on mom80.**
- **Owner:** see E.md.
- **Open:** see E.md.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop showing momentum/E; the family's one forward test is the mom80 slice (below) — exit x_flow4 — n159 -4.5% (no-best -6.3%) thirds -7.9/-5.2/-0.5 luck 8/20 — UNPROVEN — negative under every exit; its only profitable slice is bought earlier by mom80 and earlier still by the graduation books.

## mom60 / mom80 — lower-volume momentum tiers
- **Now:** `mom60` and `mom80` (src/momtiers.js). The momentum rule at **$60K** and **$80K** of 5-min volume (below the $100K rule), with the same gates and a 30-min cooldown. Silent.
- **Verdict:** both negative: **mom60 −11.7% on 570**, **mom80 −10.6% on 416**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **15 Oct 07:49 UK (v0.18.6):** created "for like-for-like comparison with the $100K rule". Unchanged.
- **Tested:**
  - mom60: 24 h −10.7% (234); 12 h −12.1% (138); 6 h −14.7% (95).
  - mom80: 24 h −7.3% (165); 12 h −9.1% (100); 6 h −9.5% (67).
  - Lower volume thresholds are worse than $100K.
- **21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_OFF_mom60.md, rev_OFF_mom80.md; scratch rev_a/mom1-4.py):**
  - mom60 now: 671 trades −12.1% (no-best −12.5%), 259 a day, −3.40 SOL a day at 0.1, thirds −12.4 / −14.3 / −9.6. mom80 now: 484 trades −11.7% (no-best −12.3%), 187 a day, −2.37 SOL a day, thirds −12.7 / −14.2 / −8.1. Winners on both: young, cheap coins (the slice below); losers: everything older or dearer — on mom80 the 398 trades outside the slice average −9.4% under its best exit.
  - Exit verdict: on the whole of either tier no exit is positive; 1.5x-out (`x_tp15`) is the least bad (mom60 −8.5%, mom80 −5.8%). **What x_tp15 is (src/exits.js line 131, copytrade.js close):** sell everything the moment a print reaches 1.5x the entry; if 1.5x never comes there is NO stop — the trade takes whatever multiple the paper position closes at, which for these books is an 80% fall from the running peak (`tsl80`), 5-min volume under $25K (`lowvol`, quiet coins re-priced from DexScreener) or the 6-h limit. A hit is worth +39.6% at real costs; a miss averaged −78% in the slice (closes at 0.17–0.29x).
  - Factor / pair verdict: mom60 — 61 filters × 11 exits; 1 passes, age < 152 s on x_tp15: 95 trades +2.1% (no-best +1.7%), luck 2/20, thirds +12.6 / −0.6 / −7.5 — faded, nothing. mom80 — 61 × 11 + 15 pairs; 17 pass, 3 with luck ≤ 2; the pick is **entry MC < $76.3K AND coin under 347.6 s old, sold at 1.5x: 86 trades +10.9% (no-best +10.5%), won 76%, thirds +1.9 / +21.0 / +9.4, last 24 h 35 at +14.5%, by day 18 Oct −1.8% (6) / 19 Oct +9.8% (38) / 20 Oct +13.1% (27) / 21 Oct +14.6% (15), 33 a day, +0.33 SOL a day at 0.1, luck 0/20** (fixed-slice shuffle 0/200). What it is: a coin that graduated 1–6 minutes ago, still at or near its graduation price, that has just done $80K of volume in 5 min. 65 of 86 touched 1.5x (40 went past 2x; 8 only reached 1.50–1.60x, where a touch-and-sell fill is unproven), 21 never did and closed at −78% on average. **Why it is UNPROVEN all the same:** (a) the same thresholds on the other tiers' own entries give −0.6% (mom60, 114), +2.1% (momfast, 120), +1.3% / +2.8% (momentum / E core, 64 / 63) at 1.5x-out — the slice is positive everywhere but only mom80's version clears the bar, and four tier searches were run; (b) the thresholds sit on a local maximum — MC < $85K instead of $76K gives +4.3% (95), age < 420 s instead of 348 s gives +7.4% (100), either factor alone +4–5% (161–163); (c) the gain is concentrated in the 77 slice coins that went on to $100K of volume (+19.0%) against −58.5% on the 9 that did not, which cannot be known when buying; (d) the exit has no stop and one in four trades loses ~78%; a hit rate under ~66% makes it break-even; (e) no momentum tier has ever had a real-quote leg. Also: 71 of the 86 coins are in the every-graduation book, which bought 57 of them (buyable rows, age ≥ 10 s) a median 144 s earlier at 1/1.45 of mom80's price — the same coins from the graduation entry made +33% at 1.5x-out (95% won) and +35.9% on the 40% trail; inside the slice, heavy-bundle launches (bundle ≥ 58%, 39 trades) pay on the trail too (+24.8%), ordinary launches (< 58%, 47) only at 1.5x-out (+8.4%, trail −12.4%) — cross-book facts 1 and 2 again. **The ONE version of the $60K/$80K/$100K trigger worth a forward test is this mom80 slice at 1.5x-out; E, mom60, momfast, momconf, momdip and momre add nothing on the same coins.**
- **Owner:** nothing recorded.
- **Open:** none.
- PROPOSAL (21 Oct rev): NEW VARIANT — forward test only: mom80 trigger ($80K of 5-min volume) when the coin is under 6 min old and its entry MC is under $76K, sell everything at 1.5x (no stop: otherwise the position's own close) — exit x_tp15 — n86 +10.9% (no-best +10.5%) thirds +1.9/+21.0/+9.4 luck 0/20 — UNPROVEN — real in its own book but the other three tiers do not replicate the 1.5x-out figure, the thresholds are a local maximum, the losers are −78% no-stop closes, no real-quote leg has ever been run on this family, and the graduation books buy the same coins 2.5 min earlier at 1/1.45 of the price; judge on 40 forward trades as a paper line, plus a 0.05 SOL shadow leg to measure the fill at the 1.5x touch before anything more.

## momfast — fast momentum tier
- **Now:** `momfast` (src/momtiers.js). **$50K of volume in 2 min**, same gates, own cooldown.
- **Verdict:** negative: **−10.8% on 442**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **15 Oct 14:44 UK (v0.18.12):** created (same pace as $125K / 5 min). Unchanged.
- **Tested:** 24 h −10.6% (175); 12 h −9.8% (104); 6 h −12.9% (76).
- **21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_OFF_momfast.md):** 517 trades −12.1% (no-best −12.6%), 200 a day, −2.61 SOL a day at 0.1, thirds −11.5 / −16.9 / −7.9. No exit positive (1.5x-out −6.2% is the least bad). 61 filters × 11 exits + 7 pairs; 14 pass, **0 beat luck**; pick: coin under 272.5 s old at 1.5x-out — 172 trades +4.0% (no-best +3.8%), thirds +10.0 / +3.1 / −0.1, last 24 h 61 at −0.1%, luck 7/20 — fading to zero. Its coins are mom80's (84 of mom80's 86 slice coins) bought on the 2-min burst; the mom80 slice's thresholds on momfast's own entries give +2.1% on 120. Winners: young and cheap; losers: the rest. **No profitable version found** beyond what mom80's slice already is.
- **Owner:** nothing recorded.
- **Open:** none.
- PROPOSAL (21 Oct rev): RETIRE — stop showing momfast (keep recording if free); the family's one forward test is on mom80 — exit x_tp15 — n517 -6.2% (no-best -6.3%) thirds -3.2/-7.1/-8.2 luck 7/20 — UNPROVEN — same coins as mom80, its best cut is fading to zero (+4.0% → last 24 h −0.1%) and cannot be told from luck.

## momdip — buy the 20% dip after a momentum trigger
- **Now:** `momdip` (src/momentum.js). After a core momentum trigger, buy if the price falls **20% below the trigger price within 10 min**, unless it first rose 1.5x.
- **Verdict:** negative overall (**−3.2% on 87**, −6.5% without the best), but the best off-page book in the last 12 h (+12.1% on 20). **"Watch it, don't trust it yet"** (20 Oct 23:32 UK).
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **15 Oct 13:30 UK (v0.18.9):** created (dip-entry variant). Unchanged.
- **Tested:** 24 h +4.8% (35); 12 h +12.1% (20); 6 h +14.1% (12).
- **Owner:** told 23:32 UK to watch it, not trust it.
- **21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_OFF_momdip.md):** 101 trades −8.0% (no-best −10.8%), 40 a day, −0.35 SOL a day at 0.1, thirds −8.3 / −8.6 / −7.0; last 12 h −26.2% on 18 — the "best off-page book" of 20 Oct 23:32 UK was a swing. No exit is positive (h3 −7.2% best; hold-15 −6.2% but −14.5% without its best trade). 47 filters × 11 exits; 6 pass, **0 beat luck** (shuffled runs up to +30%); pick: coin under 398 s old on hold-15 — 50 trades +17.1% but **+0.6% without its best trade**, thirds −11.1 / +69.7 / +13.7, luck 17/20: one coin. Winners: one hold-15 runner; losers: dips that kept falling (−30.9% on the 51 older coins). Buying the dip after a momentum trigger joins gradrec and R's candle study: **no profitable version found.**
- **Open:** it would earn the "✓ worth a look" tag only at 15+ trades in 12 h, positive without its best, and positive over 24 h. Re-check it at the next study. **21 Oct 11:05 UK: re-checked — last 12 h −26.2% on 18; dropped.**
- PROPOSAL (21 Oct rev): SWITCH OFF — stop momdip — exit x_flow4 — n101 -8.0% (no-best -10.8%) thirds -8.3/-8.6/-7.0 luck 17/20 — UNPROVEN — negative in all three thirds, the only passing cut is one coin (+0.6% without it), and the 23:32 UK "watch it" window reversed to −26.2%.

## momre — momentum re-entry
- **Now:** `momre` (src/momre.js). After a core momentum entry, the coin is watched as if traded by "sell at 1.5x, cut at −25%". When that rule would be flat and all of these hold:
  - the coin is still a core coin (5-min volume ≥ $100K, buyers outweigh sellers, under the cap);
  - the price has reclaimed the exit price;
  - then re-enter: at most 5 times per coin, ≥ 60 s apart.
- **Verdict:** clearly negative: **−18.9% on 174**.
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:** **15 Oct 13:30 UK (v0.18.9):** created. Unchanged.
- **Tested:** 24 h −19.4% (80); 12 h −19.0% (52); 6 h −8.9% (27). Re-entering on retraces is worse than entering once.
- **21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_OFF_momre.md):** 195 trades −17.3% (no-best −18.0%), 76 a day, −1.39 SOL a day at 0.1, thirds −30.3 / −19.6 / −1.9 (the last-12-h +18.3% on 25 is the tail of that third). No exit positive (h3 −13.7% best; 1.5x-out −26.1%). 47 filters × 11 exits; **0 pass the three-period test** — "No revision found". Winners: none as a group; losers: re-entries into coins that had already given their move. **No profitable version found.**
- **Owner:** nothing recorded.
- **Open:** none.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop momre — exit x_flow4 — n195 -17.3% (no-best -18.0%) thirds -30.3/-19.6/-1.9 luck 0/20 — UNPROVEN — not one filter × exit passes the three-period test; re-entering is worse than entering once on every exit.

## momconf — Project 4, 60-second confirmation of the momentum trigger
- **Now:** `momconf` (src/momentum.js). **60 s after a core momentum trigger**, buy only if the price is above 1.0x the trigger price (first tick up to 120 s).
- **Verdict:** break-even: **−0.3% on 68** (−4.4% without the best).
- **Latest numbers:** see "Latest numbers, all off-page books" near the top.
- **History:**
  - **16 Oct 21:52 UK (v0.18.32):** created as Project 4 (pre-registered).
  - **17 Oct 12:00 UK (v0.18.57):** retired from the website, still recorded.
- **Tested:** 24 h +3.0% (25); 12 h +4.6% (17); 6 h −3.9% (10). The same "confirm" idea as A5 / F6 on the A trigger, which also failed (see A5.md / F6.md).
- **21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_OFF_momconf.md):** 77 trades −8.2% (no-best −10.0%), 30 a day, −0.28 SOL a day at 0.1, thirds −24.2 / −1.5 / +1.4. No exit positive (t15s40 −3.6% best). 47 filters × 11 exits + 50 pairs; 57 pass, **0 beat luck** — on 77 trades the shuffled runs produced +7% to +40% every time; pick: before 17:24 UK AND entry MC ≥ $63.8K on the 2x/−40% exit — 38 trades +24.7% (no-best +23.0%), luck 4/20 — an hour-of-day pair, the same artefact as G's. Winners: none that can be characterised on 77 trades; losers: the first third (−24.2%). The 60-s confirmation of the momentum trigger joins A5 and F6: the coins it picks are no better at the confirmed price. **No profitable version found.**
- **Owner:** nothing recorded since its retirement.
- **Open:** none.
- PROPOSAL (21 Oct rev): SWITCH OFF — stop momconf — exit x_flow4 — n77 -8.2% (no-best -10.0%) thirds -24.2/-1.5/+1.4 luck 4/20 — UNPROVEN — negative, and its only candidates are hour-of-day pairs on a book whose search finds +7–40% by luck every run.

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
