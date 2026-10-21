# AS3 — AS + a big sniper crowd (launch bundle 5+ wallets)
_Notes last rebuilt: 21 Oct 2026 01:35 UK._

## What it is now
- Code key `as3` (page box AS3), paper only, box stake 0.1 SOL. v0.18.172.
- Entry rule: AS's rule (A's trigger + socials not known-missing + creator not bought-and-sold-out + biggest buyer in the trigger minute 3–5 SOL) **plus** the launch bundle had **5+ wallets** (`tokens.bundle_wallets`; the creator plus 4+ snipers when the creator bought).
- Exit: runner (`x_flow4`), same as A and AS.
- Started 21 Oct 01:30 UK (`CHG_AS2`). Everything before is a back-test of a rule chosen by looking at those trades.

## Verdict now
**21 Oct 02:30 UK:** Fewest trades, biggest win per trade of the running books; unproven.

Not yet tested. Fits the owner's "fewer trades, bigger profit each" side: keeps under half of AS's trades.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 08:43 UK; AS + launch bundle 5+ wallets. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 22:46 UK) | 39 | +27.6% | +21.0% | 72% | 21% | +1.04 |
| before the change (21 Oct 01:30 UK) — back-test | 35 | +29.7% | +22.5% | 71% | 20% | +1.01 |
| since the change — the real test | 4 | +8.5% | -6.6% | 75% | 25% | +0.03 |
| last 24 h | 13 | +15.4% | +5.7% | 69% | 23% | +0.19 |
| last 12 h | 9 | +28.3% | +15.3% | 78% | 11% | +0.25 |
| last 6 h | 3 | +5.7% | -18.3% | 67% | 33% | +0.01 |
<!-- /NUMBERS -->

## Change history
- 21 Oct 01:30 UK (v0.18.172): created on the owner's go (01:19 UK), as a separate book rather than revising AS, so AS's own real test (from 20 Oct 17:45 UK) keeps running untouched.

## Ideas tested
- The finding behind it (21 Oct 01:20 UK, AS's 79 trades, operator coins removed; see AS.md "Ideas tested"): bundle wallets ≥ 5 kept 34 at +31.5% (without best +24.1%) vs 45 at −3.7%; first half +27.9% vs +5.2%, second half +26.5% vs −17.5%; since 20 Oct 17:45 UK 5 at +56.6% vs 10 at +6.0%. At 0.1 SOL a trade about +1.04 SOL on 34 trades. Watch: very large bundles sit next to the operator fingerprint (10 wallets, 37–41%), which is already excluded.
- Why bundle wallets and not `snipers_n`: the sniper count lived only in memory and was blank on 46 of 79 AS rows after 32 restarts; it equals bundle wallets minus a buying creator on 1,295 of 1,308 rows, and bundle wallets is saved for every coin.
- Independent support: book F (A with a launch bundle of 3 or fewer wallets) failed out of sample on A (−10% to −17% vs 0% for the rest of A) — the same effect seen from the other side.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/AS3.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 35 trades +29.7% (no-best +22.5%), 71% won, thirds +14.7 / +56.6 / +16.9, ~16 a day, +0.47 SOL a day. On AS's 80 trades its rule (bundle ≥ 5 wallets) had luck 17/20 — not proven by itself; the support is the mirror-image failure of book F.

## Notable coins
- None yet in the real test.

## What the owner said / decided
- 21 Oct 01:09–01:19 UK: chose separate boxes over revising AS ("second option"); wanted a bigger reading for the sniper signal; asked for each new box to show the back-test on all data so far and a fresh record "starting now". Go given 01:19 UK.

## Open items
- Judge at 30 trades since 01:30 UK (unchanged).
- Judge at 30 trades since 01:30 UK: compare with AS on the same coins, using the average without the best trade, and the AS3 vs AS gap. Beats AS → candidate for its own executor shadow book; doesn't → drop and record why.
- Few trades a day (roughly 1 in 2–3 AS trades), so 30 trades may take several days.
