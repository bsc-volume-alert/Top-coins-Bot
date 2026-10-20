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
Not working since the change: the back-test was +12.7% on 60, but the 12 trades since 17:45 UK are −3.5% (−15.8% without the best; 5 stops) to 21 Oct 00:09 UK. The same filters work better on A (AS) because D buys the same coins later and higher; too few trades to drop it, but it is behind AS on every comparison so far.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 00:09 UK; D + standard filters. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 20:27 UK) | 68 | +9.3% | +5.3% | 56% | 29% | +0.57 |
| before the change (20 Oct 17:45 UK) — back-test | 56 | +12.1% | +7.2% | 55% | 27% | +0.62 |
| since the change — the real test | 12 | -3.5% | -15.8% | 58% | 42% | -0.05 |
| last 24 h | 27 | +5.5% | +0.6% | 63% | 30% | +0.12 |
| last 12 h | 14 | -4.1% | -14.6% | 57% | 36% | -0.07 |
| last 6 h | 11 | +0.9% | -12.3% | 64% | 36% | -0.00 |
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

## Notable coins
- Trades since 17:45 UK to 00:09 UK (entry MC, result): Xitter 18:09 ($43.6K, stop −51.2%); Poke Packz 18:26 ($90.9K, stop −53.1%; AS made +30% on it at $64K); Cumrocket 18:38 ($95.9K, peak 2.6x, +3.4%); catdog 20:12 ($44.8K, +31.8%); SpaceXSuperIntelligence 21:50 ($46.1K, +132.7% — same entry as AS); The Unfazed Crane 22:00 ($83.8K, 0.0%); Shirley Coin 22:44 ($53.4K, stop −57.8%); MOCHI 22:52 ($84.8K, +9.6%); Hollow 23:30 ($41.1K, +21.0%); Fomochi 23:31 ($44.9K, +25.6%); Pokemon Sol-Silver 23:33 ($45.6K, stop −51.5%); Mugshot Cat 23:55 ($62.9K, stop −52.1%).
- Before the change: The Last Hope (20 Oct 12:25, −24.9%), Pokémon Arena (13:46, +9.0%).

## What the owner said / decided
- 20 Oct ~16:00 UK: "socials, let's do that … use GMGN … A and D are in desperate need of improvement … 279 trades … still at a loss".
- 20 Oct ~17:10–17:20 UK: "Cool, let's go ahead with K. What do you mean by the two DS variants?" and later "What are you trying to say with the other two variants?" — the two DS variants I proposed then are not preserved in the log (content unknown).
- 20 Oct ~17:25 UK: the standard-set instruction ("include it with all the coins … 3 to 5 SOL … socials … dev sold … ignore hand-offs … 11% … consistency of volume"); the 11% rule dropped because a conviction buyer splits over wallets. "If the dev is out, we shouldn't be involved … side wallets".
- 20 Oct 20:22 UK: agreed in principle to a plan of two or three separate profitable books, one of them "the best D-family book" (DS, DC or plain D were the candidates then).

## Open items
- Proposed 20 Oct 23:32 UK, awaiting go: keep DS (and DC) on the page with demoted ranking until it has 20 or more trades since the change.
- Next decision: at 20 trades since 17:45 UK (12 now), compare with AS on the same coins; if still behind, drop DS from the page and keep the standard set on A only.
- Possible question for the owner: whether a D-level confirmation is wanted at all, given D enters the same coins higher than A (the AS/DS comparison).
- Check DS's figures for operator-fingerprint coins the way AS's were checked.
