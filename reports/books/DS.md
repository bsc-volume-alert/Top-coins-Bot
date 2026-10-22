# DS — D with the standard filters
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `dsoc` (page name DS). A filter on book D's passed rows (`p5e50`, operator-fingerprint coins removed on the page). Page box only, paper, box stake 0.1 SOL. No executor book. Code: `src/web.js` `stdSet` applied to `keep50`.
- Entry rule = D's trigger plus the same three filters as AS:
  - D's trigger: 50 SOL bought within 60 s (A uses 30); MC under $100K; coin ≥ 60 s old; buys ≥ sells; ≥ 10 buyers; one trade per coin; skips bundled 70%+, launch not seen, 150+ wallets in the minute.
  - Socials not known to be absent (`tok_soc` ≠ 0; unknown kept).
  - Creator has not bought-and-sold-out (skip `dev_hold_entry` = 0 with `dev_buy_sol` > 0).
  - Biggest buyer in the trigger minute (`max_share × sol60`) ≥ 3 and < 5 SOL.
- Exit: `x_flow4`, the runner (−40% stop until 1.5x; then hold while 5-min volume ≥ $100K and buys ≥ sells; 50% trail; cap 4x). PumpSwap real-cost model.
- Started 20 Oct 16:35 UK (v0.18.156). Last rule change 20 Oct 17:45 UK (v0.18.158). Page splits the record before / since 17:45 UK.

## Verdict now
**21 Oct 11:10 UK:** RETIRE from the page (data kept). 56 of its 79 coins are AS's, bought at the same price (median entry-MC ratio 1.00x, 5 s later) and still a worse result (+13.2% vs AS's +18.6% on the same coins); the 23 coins AS does not take are −2.0%; the forward test since 17:45 is +0.7% on 23 (no-best −5.3%). The one luck-2 pair the search found (bundle ≥ 42.6% and average buy ≥ 0.58 SOL, 2x-or-−40% exit, n13 +55.0%) is 10/13 AS coins — the heavy-bundle finding seen from D's side, and it fails on D's coins outside DS.

**21 Oct 02:30 UK:** Mostly AS's coins at a worse price; adds nothing AS doesn't.

Not working since the change: the back-test was +12.7% on 60, but the 12 trades since 17:45 UK are −3.5% (−15.8% without the best; 5 stops) to 21 Oct 00:09 UK. The same filters work better on A (AS) because D buys the same coins later and higher; too few trades to drop it, but it is behind AS on every comparison so far.

## Latest numbers
<!-- NUMBERS -->
_Data to 22 Oct 13:03 UK; D + standard filters. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 20:27 UK) | 87 | +6.3% | +3.1% | 54% | 29% | +0.46 |
| before the change (20 Oct 17:45 UK) — back-test | 56 | +12.1% | +7.2% | 55% | 27% | +0.62 |
| since the change — the real test | 31 | -4.2% | -8.8% | 52% | 32% | -0.16 |
| last 24 h | 6 | -7.2% | -13.3% | 50% | 17% | -0.05 |
| last 12 h | 0 | — | — | — | — | — |
| last 6 h | 0 | — | — | — | — | — |
<!-- /NUMBERS -->

## Change history
- 20 Oct 16:35 UK (v0.18.156; commit 16:19 UK): DS created = D skipping coins KNOWN to have no socials AND whale-led minutes (`maxShare > 0.11`, i.e. one buy above 11% of the trigger minute's buying — study rule F11's direction). Evidence in the code comment: D −21.5% on 36 coins without socials vs +0.7% on 152 with, both halves. F11 (registered 20 Oct 05:35 UK study): D with max_share ≤ 0.11 +5.3% on 130 in sample (rest −18.2% on 44); out of sample +3.5% on 30 by 17:40 UK (halves +9.5% / −2.5%, "small edge, fading"). Owner's ask: "socials, let's do that … A and D are in desperate need of improvement".
- 20 Oct 17:45 UK (v0.18.158; commit 17:29 UK): DS became the standard filter set (socials present or unknown; creator not bought-and-sold-out; biggest buyer 3–5 SOL). The 11% whale-share rule was dropped — owner: a conviction buyer splits his buy over several wallets, which defeats a share rule. In sample at the change: D +14.7% on 62, both halves positive; biggest buyer 10+ SOL −18% on both books.
- 20 Oct 17:55 UK (v0.18.160): box shows before (back-test) and since (real test), split at 17:45 UK.
- 20 Oct 19:15 UK (v0.18.164): operator-fingerprint coins removed from the page record (retroactive).

## Ideas tested
- Socials skip on D — 20 Oct ~16:20 UK — −21.5% on 36 without vs +0.7% on 152 with — kept.
- Whale share ≤ 11% (F11) — from 20 Oct 05:35 UK — in sample +5.3% on 130; out of sample +3.5% on 30 (17:40 UK) — dropped from DS at 17:45 UK on the owner's split-wallet argument (not on the numbers).
- Standard set — 17:45 UK — before +12.7% on 60 (won 55%, no-top1 +8.3%); since 17:45: 8 trades +1.9% (no-top1 −16.8%) at 23:27 UK; 12 trades −3.5% (won 58%, stops 42%, no-top1 −15.8%) at 00:09 UK — on test, failing so far.
- AS vs DS on the same coins (23:31 UK) — D's 50-SOL trigger fires after A's 30-SOL trigger on the same coin, at a higher price, so DS pays for the move AS catches: Poke Packz AS $64K +30% vs DS $91K −53%; The Unfazed Crane $50K +39% vs $84K 0%; MOCHI $68K +83% vs $85K +10%. Exception: Hollow — AS bought at $50.8K and stopped (−53.5%); DS bought at $41.1K and made +21.0%.
- The chat's DS figures (68 / 72 trades) came from abcd.csv without bundle_sol, so like AS they may include operator-fingerprint coins the page leaves out (not checked for DS at this rebuild).

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/DS.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 70 trades +8.8% (no-best +4.9%), thirds +1.9 / +26.7 / −1.9, last block −4.3%; 64 of AS's 79 coins are also D's, bought later and higher (Poke Packz $64K vs $91K etc.). Best cuts (n60 ≥ 129, luck 5; creator still holding, luck 6) not beyond luck. Best exit 1.5x/−40% +9.2% but fails the middle third.

- 21 Oct 11:10 UK — revision search (data to 10:36 UK; diag/rev_DS.md; scratch in scratchpad/rev_as/):
  - The book now: 79 trades +8.8% (no-best +5.3%, no-top3 +2.2%), 56% won, 28% stopped, thirds +5.5 / +18.4 / +2.5, 30.5 a day, +0.24 SOL a day at 0.1. Since 17:45 UK (the real test): 23 at +0.7% (no-best −5.3%, no-top3 −11.0%), 7 stops; last 24 h 25 at 0.0%.
  - Overlap, corrected: 56 of DS's 79 coins are AS coins (78 of 79 are A's). On those 56 DS's entry MC is the SAME as AS's — median ratio 1.00x, mean 1.05x, D's 50-SOL trigger fires a median 5 s after A's and never before it. "D buys later and higher" holds only on about a quarter of them (Poke Packz $91K vs $64K, The Unfazed Crane $84K vs $50K, MOCHI $85K vs $68K, Banana Cat $74K vs $44K). Yet DS makes +13.2% on the 56 against AS's +18.6% (DS worse on 25, better on 22, same on 9; −5.5 points a trade — the few dear entries cost that much). The 23 DS-only coins: −2.0% (no-best −5.9%, no-top3 −12.8%). So DS = AS's coins, a little worse, plus 23 losing extras. Since 17:45: shared 17 at +4.2% vs AS +12.7% on the same coins; DS-only 6 at −9.1%.
  - Winners as a group (44): bundle 30–33% over 4–5 wallets, 43–48 SOL of first-minute selling (D's minute is 50 SOL), 86–102 wallets, price at 60 s 1.21–1.26x; 33 of 44 are AS coins. Losers: 22 stopped at −52.0% — 46 SOL of selling, 94 wallets, creator 1 SOL, 60-s price 0.77x; 16 of 22 are AS coins (AS stopped on most of them too). 13 small losers at −15.5%: 60-s price 0.96x, fewer holders (170), faded on volume.
  - Exit verdict: x_t15s40 (sell at 1.5x or at −40%) is the only exit positive in every third (+8.8 / +10.9 / +9.7; no-best +9.4%; since 17:45 +8.6% vs the runner's +0.7%), but paired against the runner it is +1.0 point (95% range −8 to +9) — not distinguishable. x_t2s40 −6.6, x_h2t40 −11.4, x_tsl40 −12.4, x_h5 −9.5 (the last three clearly worse). No exit change.
  - Factor / pair verdict, judged harshly: 1,229 filters × 12 exits + 258 pairs; 586 pass the three-period test, ONE at luck 2/20 — launch bundle ≥ 42.6% AND average buy in the trigger minute ≥ 0.576 SOL, exit x_t2s40: 13 trades +55.0% (no-best +52.4%), 10 of 13 won, thirds +52.5 / +31.4 / +87.0, 5 a day, +0.27 SOL a day. Not adopted, because: (1) 10 of the 13 are AS coins (SpaceX Universal Basic Income, UNDINE, KAHO, no thanks i use fomo, ARE YOU READY?, Spidey Show, Fallen Hero, King Of Larp, Banana Cat, MEME) and 6–7 are AS3 coins — it is the heavy-bundle / sniper finding seen from D's side, not independent support; (2) on D's coins outside DS the same pair is 20 at −8.1% (x_t2s40) / −17.7% (runner), on A overall 35 at +15.3% / +7.1% — it only works inside the standard filters; (3) both cuts are quantile thresholds — King Of Larp (bundle 42.617%) sits exactly on the bundle cut, and the average-buy cut is a cliff (at bundle ≥ 35%: avg buy ≥ 0.50 SOL n22 +25.3%, ≥ 0.576 n15 +51.8%); (4) 13 trades over 2.5 days with the exit switched to a fixed 2x sale (9 of 13 reached 2x). The group IS good under every exit (runner +42.6% / no-best +21.3%; x_t15s40 +31.9% / +31.2%; trail +23.3%) — but they are AS3's coins.
  - Also seen (luck 20, cross-family): "quiet market" — fewer than 12 of the last two hours' A/C/D triggers reached 1.5x (`heat_win2h_hit` < 12) — DS 38 at +27.5% vs 41 at −8.6%; same direction on DC, D, AS and A, which all share coins. One observation, not five; for whoever owns A/D to look at, not a DS rule.
  - Proposed: RETIRE DS from the page (data kept). It adds no coin that AS does not already take and that makes money; the standard filters live on in AS.

## Notable coins
- Trades since 17:45 UK to 00:09 UK (entry MC, result): Xitter 18:09 ($43.6K, stop −51.2%); Poke Packz 18:26 ($90.9K, stop −53.1%; AS made +30% on it at $64K); Cumrocket 18:38 ($95.9K, peak 2.6x, +3.4%); catdog 20:12 ($44.8K, +31.8%); SpaceXSuperIntelligence 21:50 ($46.1K, +132.7% — same entry as AS); The Unfazed Crane 22:00 ($83.8K, 0.0%); Shirley Coin 22:44 ($53.4K, stop −57.8%); MOCHI 22:52 ($84.8K, +9.6%); Hollow 23:30 ($41.1K, +21.0%); Fomochi 23:31 ($44.9K, +25.6%); Pokemon Sol-Silver 23:33 ($45.6K, stop −51.5%); Mugshot Cat 23:55 ($62.9K, stop −52.1%).
- Before the change: The Last Hope (20 Oct 12:25, −24.9%), Pokémon Arena (13:46, +9.0%).

## What the owner said / decided
- 20 Oct ~16:00 UK: "socials, let's do that … use GMGN … A and D are in desperate need of improvement … 279 trades … still at a loss".
- 20 Oct ~17:10–17:20 UK: "Cool, let's go ahead with K. What do you mean by the two DS variants?" and later "What are you trying to say with the other two variants?" — the two DS variants I proposed then are not preserved in the log (content unknown).
- 20 Oct ~17:25 UK: the standard-set instruction ("include it with all the coins … 3 to 5 SOL … socials … dev sold … ignore hand-offs … 11% … consistency of volume"); the 11% rule dropped because a conviction buyer splits over wallets. "If the dev is out, we shouldn't be involved … side wallets".
- 20 Oct 20:22 UK: agreed in principle to a plan of two or three separate profitable books, one of them "the best D-family book" (DS, DC or plain D were the candidates then).

## Open items
- PROPOSAL (21 Oct rev): RETIRE — D + standard filters off the page, data kept; no revised rule — exit x_flow4 — n79 +8.8% (no-best +5.3%) thirds +5.5/+18.4/+2.5 luck 2/20 (best pair, not adopted) — UNPROVEN — forward test +0.7% on 23 (no-best −5.3%); 56 of 79 are AS coins at the same price where AS does better (+18.6% vs +13.2%), the other 23 are −2.0%; the luck-2 pair (bundle ≥ 42.6% & avg buy ≥ 0.58 SOL, x_t2s40, n13 +55.0%) is 10/13 AS coins and fails on D's coins outside DS (−8.1% on 20).
- awaiting go: retire DS from the page (data kept).
- Proposed 20 Oct 23:32 UK, awaiting go: keep DS (and DC) on the page with demoted ranking until it has 20 or more trades since the change.
- Next decision: at 20 trades since 17:45 UK (12 now), compare with AS on the same coins; if still behind, drop DS from the page and keep the standard set on A only.
- Possible question for the owner: whether a D-level confirmation is wanted at all, given D enters the same coins higher than A (the AS/DS comparison).
- Check DS's figures for operator-fingerprint coins the way AS's were checked.
