# AS2 — AS + at least 1 sniper (launch bundle 2+ wallets)
_Notes last rebuilt: 21 Oct 2026 01:35 UK._

## What it is now
- Code key `as2` (page box AS2), paper only, box stake 0.1 SOL. v0.18.172.
- Entry rule: AS's rule (A's trigger + socials not known-missing + creator not bought-and-sold-out + biggest buyer in the trigger minute 3–5 SOL) **plus** the launch bundle had **2+ wallets** (`tokens.bundle_wallets`; the creator plus 1+ snipers when the creator bought).
- Exit: runner (`x_flow4`), same as A and AS.
- Started 21 Oct 01:30 UK (`CHG_AS2`). Everything before is a back-test of a rule chosen by looking at those trades.

## Verdict now
**21 Oct 02:30 UK:** Back-test strong and steady; forward test running since 01:30 UK.

Not yet tested. Fits the owner's "many trades, small profit each" side: keeps about 4 in 5 of AS's trades and throws away the group that lost −17% a trade.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 01:42 UK; AS + launch bundle 2+ wallets. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 22:46 UK) | 63 | +18.6% | +14.4% | 65% | 25% | +1.11 |
| before the change (21 Oct 01:30 UK) — back-test | 63 | +18.6% | +14.4% | 65% | 25% | +1.11 |
| since the change — the real test | 0 | — | — | — | — | — |
| last 24 h | 25 | +9.5% | +4.4% | 60% | 20% | +0.21 |
| last 12 h | 15 | +23.0% | +15.2% | 73% | 7% | +0.33 |
| last 6 h | 11 | +22.2% | +11.2% | 73% | 9% | +0.23 |
<!-- /NUMBERS -->

## Change history
- 21 Oct 01:30 UK (v0.18.172): created on the owner's go (01:19 UK), as a separate book rather than revising AS, so AS's own real test (from 20 Oct 17:45 UK) keeps running untouched.

## Ideas tested
- The finding behind it (21 Oct 01:20 UK, AS's 79 trades, operator coins removed; see AS.md "Ideas tested"): bundle wallets ≥ 2 kept 62 at +19.4% (without best +15.2%) vs 17 at −17.4%; first half of the earlier trades +23.2% vs −23.6%, second half +9.2% vs −17.4%; since 20 Oct 17:45 UK 12 at +30.4% vs 3 at −7.2%. At 0.1 SOL a trade about +1.14 SOL on 62 trades vs AS +0.83 on 79.
- Why bundle wallets and not `snipers_n`: the sniper count lived only in memory and was blank on 46 of 79 AS rows after 32 restarts; it equals bundle wallets minus a buying creator on 1,295 of 1,308 rows, and bundle wallets is saved for every coin.
- Independent support: book F (A with a launch bundle of 3 or fewer wallets) failed out of sample on A (−10% to −17% vs 0% for the rest of A) — the same effect seen from the other side.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/AS2.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 63 trades +18.6% (no-best +14.4%), 65% won, thirds +17.6 / +26.7 / +11.4, ~30 a day, +0.52 SOL a day at 0.1 — the highest SOL a day of any book with all thirds positive. Luck check inside AS2: nothing extra is beyond luck.

## Notable coins
- None yet in the real test.

## What the owner said / decided
- 21 Oct 01:09–01:19 UK: chose separate boxes over revising AS ("second option"); wanted a bigger reading for the sniper signal; asked for each new box to show the back-test on all data so far and a fresh record "starting now". Go given 01:19 UK.

## Open items
- Judge at 30 trades since 01:30 UK (unchanged).
- Judge at 30 trades since 01:30 UK: compare with AS on the same coins, using the average without the best trade, and the AS2 vs AS gap. Beats AS → candidate for its own executor shadow book; doesn't → drop and record why.
- Coins whose launch the bot never saw have no bundle count and are skipped by AS2 (counted as 0).
