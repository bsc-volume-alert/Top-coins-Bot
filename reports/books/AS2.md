# AS2 — AS + at least 1 sniper (launch bundle 2+ wallets)
_Notes last rebuilt: 21 Oct 2026 01:35 UK._

## What it is now
- Code key `as2` (page box AS2), paper only, box stake 0.1 SOL. v0.18.172.
- Entry rule: AS's rule (A's trigger + socials not known-missing + creator not bought-and-sold-out + biggest buyer in the trigger minute 3–5 SOL) **plus** the launch bundle had **2+ wallets** (`tokens.bundle_wallets`; the creator plus 1+ snipers when the creator bought).
- Exit: runner (`x_flow4`), same as A and AS.
- Started 21 Oct 01:30 UK (`CHG_AS2`). Everything before is a back-test of a rule chosen by looking at those trades.

## Verdict now
**28 Oct 12:50 UK (4-hour study; data to 19:45 UK 23 Oct — the books have been OFF since 19:46 UK 23 Oct):** DROP stands. Final forward since 01:30 UK 21 Oct: 76 at −3.1% (no-best −4.7%, no-top3 −7.5%, won 51%, stopped 42%; thirds −1 / −6 / −3) — the 16 new (23 Oct) −8.9%. No third positive. Books off since 19:46 UK 23 Oct.

**23 Oct 09:35 UK (4-hour study; data to 07:09 UK — the first push after the 18-hour gap):** DROP (repeated). Forward since 01:30 UK 21 Oct: 60 at −1.6% (no-best −3.5%, no-top3 −6.5%, won 53%, stopped 42%; thirds +7 / −10 / −2) vs back-test 63 at +18.6%. The 16 gap trades −1.3% (no-top3 −20.0%). No edge over AS (90 at +3.9%) on 60 trades; the 30-trade checkpoint said the same at 22 Oct 01:50 UK.

**22 Oct 13:50 UK (4-hour study; data to 13:03 UK):** DROP (recommendation repeated). Forward 44 at −1.7% (no-best −3.9%, no-top3 −7.2%, won 57%, stopped 39%; thirds +4 / +2 / −11) vs back-test 63 at +18.6%; 10 new trades −13.9%. It is AS minus a handful of single-wallet coins and tracks AS down.

**22 Oct 05:50 UK (4-hour study; data to 05:04 UK):** Checkpoint (30 forward) passed at 01:50 UK; now 34 at +1.8% (no-best −0.9%, no-top3 −4.7%, won 62%, stopped 32%; thirds +11 / +1 / −6) vs back-test 63 at +18.6%. No edge over AS (it is AS minus 4 trades). Candidate to drop from the page.

**22 Oct 01:50 UK (4-hour study; data to 01:04 UK):** CHECKPOINT REACHED (30 forward): 32 trades +2.8% (no-best −0.1%, no-top3 −4.0%, won 62%, stopped 31%, thirds +11 / +2 / −1) against the 63-trade back-test at +18.6%. AS2 kept 32 of AS's 37 trades since 01:30 UK; the 5 it skipped were about break-even. No edge over AS forward; recommendation: drop the box (AS3 carries the bundle idea).

**21 Oct 17:35 UK (4-hour study; data to 17:06 UK):** KEEP, judge at 30 forward (16 now). Forward 16 at +5.9% (no-best +2.2%, no-top3 −4.2%, won 69%) vs back-test 63 at +18.6%. Still almost the same coins as AS (every AS trade since 01:30 but DreamCoin, Finley and Nigga Its Over had a 2+-wallet bundle: AS2 skipped those three at +19.2%, +21.6%, −16.7%). The forward edge over AS is nil so far; the back-test gap (+18.6% vs AS's +8.8%) has not shown up forward.

**21 Oct 11:10 UK:** KEEP running, nothing to change. The forward test is 9 trades at +9.3% (no-best +2.8%) and so far identical to AS (every AS trade since 01:30 had a 2+-wallet bundle). Its back-test edge is AS3's coins diluted: the 2–4-wallet bundles are 30 trades at +1.9% (no-best −1.0%). Nothing inside it beats luck; the runner stays.

**21 Oct 02:30 UK:** Back-test strong and steady; forward test running since 01:30 UK.

Not yet tested. Fits the owner's "many trades, small profit each" side: keeps about 4 in 5 of AS's trades and throws away the group that lost −17% a trade.

## Latest numbers
<!-- NUMBERS -->
_Data to 23 Oct 19:45 UK; AS + launch bundle 2+ wallets. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 22:46 UK) | 139 | +6.7% | +4.7% | 58% | 35% | +0.79 |
| before the change (21 Oct 01:30 UK) — back-test | 63 | +18.6% | +14.4% | 65% | 25% | +1.11 |
| since the change — the real test | 76 | -3.1% | -4.7% | 51% | 42% | -0.32 |
| last 24 h | 25 | -4.4% | -9.2% | 44% | 48% | -0.13 |
| last 12 h | 15 | -6.1% | -14.1% | 47% | 40% | -0.11 |
| last 6 h | 10 | -9.0% | -21.8% | 50% | 50% | -0.10 |
<!-- /NUMBERS -->

## Change history
- 21 Oct 01:30 UK (v0.18.172): created on the owner's go (01:19 UK), as a separate book rather than revising AS, so AS's own real test (from 20 Oct 17:45 UK) keeps running untouched.
- 22 Oct 05:50 UK (4-hour study; data to 05:04 UK): no change; 34 forward.
- 23 Oct 09:35 UK (4-hour study; data to 07:09 UK — the first push after the 18-hour gap): no change; 16 trades in the data gap; 60 forward.
- 28 Oct 12:50 UK (4-hour study; data to 19:45 UK 23 Oct — the books have been OFF since 19:46 UK 23 Oct): no change; books OFF since 19:46 UK 23 Oct (v0.18.185). Record closed at 76 forward.

## Ideas tested
- The finding behind it (21 Oct 01:20 UK, AS's 79 trades, operator coins removed; see AS.md "Ideas tested"): bundle wallets ≥ 2 kept 62 at +19.4% (without best +15.2%) vs 17 at −17.4%; first half of the earlier trades +23.2% vs −23.6%, second half +9.2% vs −17.4%; since 20 Oct 17:45 UK 12 at +30.4% vs 3 at −7.2%. At 0.1 SOL a trade about +1.14 SOL on 62 trades vs AS +0.83 on 79.
- Why bundle wallets and not `snipers_n`: the sniper count lived only in memory and was blank on 46 of 79 AS rows after 32 restarts; it equals bundle wallets minus a buying creator on 1,295 of 1,308 rows, and bundle wallets is saved for every coin.
- Independent support: book F (A with a launch bundle of 3 or fewer wallets) failed out of sample on A (−10% to −17% vs 0% for the rest of A) — the same effect seen from the other side.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/AS2.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 63 trades +18.6% (no-best +14.4%), 65% won, thirds +17.6 / +26.7 / +11.4, ~30 a day, +0.52 SOL a day at 0.1 — the highest SOL a day of any book with all thirds positive. Luck check inside AS2: nothing extra is beyond luck.

- 21 Oct 11:10 UK — revision search (data to 10:36 UK; diag/rev_AS2.md; scratch in scratchpad/rev_as/):
  - The book now: 72 trades +17.4% (no-best +13.8%, no-top3 +10.5%), 65% won, 25% stopped, thirds +22.7 / +11.7 / +17.9, 28.9 a day, +0.47 SOL a day at 0.1. Forward since 01:30 UK: 9 trades +9.3% (no-best +2.8%, no-top3 −10.7%, 6 of 9 won) — Chi +16.7%, buyoutSH −51.4%, Nodrel +14.8%, Cashfish −16.9%, Clout +53.7%, OTTR −55.7%, Banana Cat +60.9%, MEME +28.2%, Larry The Cat +33.1%. Every AS trade since 01:30 had a 2+-wallet bundle, so AS2 = AS so far and the forward test has not discriminated anything yet.
  - Winners as a group (47): bundle 28–31% over 5 wallets, creator bought ~0.2 SOL, 27 SOL of first-minute selling across 58–68 wallets, price at 60 s 1.10–1.27x. Losers: 18 stopped at −52.0% — 36 SOL of selling, 75 wallets, creator 0.9 SOL, bundle 26% over 4 wallets, 60-s price 0.87x, 10 of 18 never saw 1.2x; 7 small losers at −14.9% are old coins (median 31 min) on 4 wallets.
  - Where the edge is: AS2 minus AS3 (bundles of 2–4 wallets) = 30 trades +1.9% (no-best −1.0%, thirds +20.9 / −15.4 / +0.2); since 17:45 9 at +1.0%. AS2's +17.4% is AS3's 42 trades at +28.5% diluted. By wallet count inside AS: 1 wallet 17 at −17.4%, 2 wallets 8 at +17.2%, 3–4 wallets 22 at −3.7%, 5–6 wallets 23 at +28.5%, 7–9 15 at +26.3%, 10+ 4 at +36.8%. The "≥ 2" line therefore separates the single-wallet losers from the rest; it does not add winners of its own.
  - Exit verdict: runner stays. Paired on the same 72: x_t2s40 −3.2 points (95% range −16 to +9, better on 25 of 72), x_t15s40 −4.3, x_flow4ff −4.6, x_h2t40 −8.4, x_tsl40 −13.6. 46% of AS2 coins reach 2x (the fixed 2x sale breaks even at 37%) — not enough margin to prefer x_t2s40.
  - Factor / pair verdict: 1,207 filters × 12 exits + 193 pairs; 451 pass the three-period test, **0 are unlikely to be luck** (shuffles reach +35% to +70%). Top in-sample: quiet first minute AND under 60 trades in the minute / x_h2t40 n12 +78.9% luck 3; sol60 < 35.5 / x_t2s40 n54 +25.7% luck 20. Nothing to adopt.
  - Proposed: KEEP as is, judge at 30 forward trades as planned (about a day at 29 a day). If AS3 keeps beating it on the same coins, AS2 is AS3 plus noise and can go; if the 2–4-wallet coins turn positive forward, AS2 earns its place.
- 21 Oct 17:35 UK (4-hour study; data to 17:06 UK): Forward 16 grouped: 11 winners (big: Banana Cat +60.9%, Clout +53.7%), 3 stopped (buyoutSH, OTTR, Datacenter 13:37 — creator bought 0.9 SOL, 39 SOL sold in the minute, 72 wallets, peak 1.26x), 2 small losers (Cashfish, Alpenglow — old coins, 1.6 h median). Last 6 h 7 at +1.5%.
- 22 Oct 05:50 UK (4-hour study; data to 05:04 UK): 30-forward checkpoint: no edge over AS (34 at +1.8% vs AS's +7.0% on 55 in the same period; AS2 kept 34 of AS's 38 trades since 01:30 UK).


## Notable coins
- None yet in the real test.

## What the owner said / decided
- 21 Oct 01:09–01:19 UK: chose separate boxes over revising AS ("second option"); wanted a bigger reading for the sniper signal; asked for each new box to show the back-test on all data so far and a fresh record "starting now". Go given 01:19 UK.

## Open items
- PROPOSAL (21 Oct rev): KEEP — AS + launch bundle 2+ wallets, unchanged, forward test to 30 trades — exit x_flow4 — n72 +17.4% (no-best +13.8%) thirds +22.7/+11.7/+17.9 luck 20/20 (best revision) — UNPROVEN — 9 forward trades +9.3% (no-best +2.8%) and identical to AS so far; its back-test edge is entirely the 5+-wallet coins (AS3), the 2–4-wallet coins are +1.9% on 30 (no-best −1.0%).
- Judge at 30 trades since 01:30 UK (unchanged).
- Judge at 30 trades since 01:30 UK: compare with AS on the same coins, using the average without the best trade, and the AS2 vs AS gap. Beats AS → candidate for its own executor shadow book; doesn't → drop and record why.
- Coins whose launch the bot never saw have no bundle count and are skipped by AS2 (counted as 0).
- 21 Oct 21:30 UK (4-hour study; data to 19:49 UK): forward 19 at +9.9% (no-best +7.1%, no-top3 +1.8%, won 74%); 19 of 30. Nothing to decide yet.
- 22 Oct 01:50 UK (4-hour study; data to 01:04 UK): 30-forward checkpoint reached: +2.8% on 32, no edge over AS. Proposed: retire AS2 from the page; owner decides.
- 22 Oct 05:50 UK (4-hour study; data to 05:04 UK): drop or keep is the owner's call; the data says it adds nothing to AS.
- 22 Oct 13:50 UK (4-hour study; data to 13:03 UK): 44 forward at −1.7%; the owner's call to drop stands as proposed 22 Oct 01:50 UK.

