# AS3 — AS + a big sniper crowd (launch bundle 5+ wallets)
_Notes last rebuilt: 21 Oct 2026 01:35 UK._

## What it is now
- Code key `as3` (page box AS3), paper only, box stake 0.1 SOL. v0.18.172.
- Entry rule: AS's rule (A's trigger + socials not known-missing + creator not bought-and-sold-out + biggest buyer in the trigger minute 3–5 SOL) **plus** the launch bundle had **5+ wallets** (`tokens.bundle_wallets`; the creator plus 4+ snipers when the creator bought).
- Exit: runner (`x_flow4`), same as A and AS.
- Started 21 Oct 01:30 UK (`CHG_AS2`). Everything before is a back-test of a rule chosen by looking at those trades.

## Verdict now
**21 Oct 11:10 UK:** KEEP, runner exit, judge at 30 forward trades. 7 forward trades since 01:30 UK at +22.3% (6 won); the 2 AS trades with smaller bundles in the same window lost −36% between them. The 2x-or-−40% exit (x_t2s40) that revise.py keeps picking ties the runner on the 42 (+0.6 points, range −19 to +18) and only wins on the 7 forward trades; it is recorded on every row, so it needs no box — judge it at 30 by the share of coins reaching 2x (57% so far; it breaks even at 37%). No age filter.

**21 Oct 02:30 UK:** Fewest trades, biggest win per trade of the running books; unproven.

Not yet tested. Fits the owner's "fewer trades, bigger profit each" side: keeps under half of AS's trades.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 13:20 UK; AS + launch bundle 5+ wallets. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 22:46 UK) | 43 | +28.0% | +22.1% | 74% | 19% | +1.16 |
| before the change (21 Oct 01:30 UK) — back-test | 35 | +29.7% | +22.5% | 71% | 20% | +1.01 |
| since the change — the real test | 8 | +20.5% | +14.7% | 88% | 12% | +0.16 |
| last 24 h | 15 | +29.0% | +21.6% | 87% | 7% | +0.42 |
| last 12 h | 8 | +20.5% | +14.7% | 88% | 12% | +0.16 |
| last 6 h | 4 | +32.6% | +23.1% | 100% | 0% | +0.13 |
<!-- /NUMBERS -->

## Change history
- 21 Oct 01:30 UK (v0.18.172): created on the owner's go (01:19 UK), as a separate book rather than revising AS, so AS's own real test (from 20 Oct 17:45 UK) keeps running untouched.

## Ideas tested
- The finding behind it (21 Oct 01:20 UK, AS's 79 trades, operator coins removed; see AS.md "Ideas tested"): bundle wallets ≥ 5 kept 34 at +31.5% (without best +24.1%) vs 45 at −3.7%; first half +27.9% vs +5.2%, second half +26.5% vs −17.5%; since 20 Oct 17:45 UK 5 at +56.6% vs 10 at +6.0%. At 0.1 SOL a trade about +1.04 SOL on 34 trades. Watch: very large bundles sit next to the operator fingerprint (10 wallets, 37–41%), which is already excluded.
- Why bundle wallets and not `snipers_n`: the sniper count lived only in memory and was blank on 46 of 79 AS rows after 32 restarts; it equals bundle wallets minus a buying creator on 1,295 of 1,308 rows, and bundle wallets is saved for every coin.
- Independent support: book F (A with a launch bundle of 3 or fewer wallets) failed out of sample on A (−10% to −17% vs 0% for the rest of A) — the same effect seen from the other side.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/AS3.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 35 trades +29.7% (no-best +22.5%), 71% won, thirds +14.7 / +56.6 / +16.9, ~16 a day, +0.47 SOL a day. On AS's 80 trades its rule (bundle ≥ 5 wallets) had luck 17/20 — not proven by itself; the support is the mirror-image failure of book F.

- 21 Oct 11:10 UK — revision search (data to 10:36 UK; diag/rev_AS3.md; scratch in scratchpad/rev_as/):
  - The book now: 42 trades +28.5% (no-best +22.4%, no-top3 +17.2%), 74% won, 19% stopped, thirds +24.0 / +31.0 / +30.5, 16.8 a day, +0.46 SOL a day at 0.1. Forward since 01:30 UK: 7 trades +22.3% (no-best +15.9%, no-top3 +2.1%, 6 of 7 won) — Chi +16.7%, buyoutSH −51.4% (stop), Nodrel +14.8%, Clout +53.7%, Banana Cat +60.9%, MEME +28.2%, Larry The Cat +33.1%; the 2 AS trades since 01:30 with bundles under 5 wallets (Cashfish −16.9%, OTTR −55.7%) lost −36% between them. Since 17:45 UK (partly in sample — the rule was chosen at 01:20 on trades to 00:59): bundle 5+ 13 at +31.3% (no-best +22.9%, 85% won) vs under 5 12 at −1.1%.
  - Winners as a group (31): bundle 32–38% over 6–7 wallets, 27–28 SOL of first-minute selling across 60–62 wallets, price at 60 s 1.30x; the big winners' creators bought MORE (1.6 SOL median) than AS's typical winner — the creator-buy signal reverses here, one more reason it was dropped.
  - Losers as a group: 8 stopped at −51.7% — older coins (median 24 min), 80 wallets in the minute, 32 SOL of selling, creator 1.8 SOL, 60-s price 0.89x, 4 of 8 never saw 1.2x: Anthropic Universal Basic Income (1.9 h old), Kim The Fatty (60 s old, 43 SOL of selling), Teddy The Squirrel, The Black Swan (5.3 h old), nOrigami, Haiku (31 min), The Last Hope, buyoutSH (78 min old, 54 SOL of selling). Five of the eight were over 15 min old or had 38+ SOL of selling in the trigger minute. 3 small losers at −15.5% (REAGENT, แบคโฮ, Where's the Airdrop?) peaked 1.5–2.2x and faded.
  - Exit verdict — the x_t2s40 question: on the 42, x_t2s40 (sell everything at 2x, or at −40% from entry) is +29.1% (no-best +27.7%) vs the runner's +28.5% (no-best +22.4%) — paired difference +0.6 points (95% range −19 to +18), better on 17, same on 11, worse on 14: a tie. Its better "no-best" is an artefact: it caps Spidey Show (+276.6% on the runner) at 2x, so removing the best trade costs it less. Thirds +7.4 / +30.9 / +49.0 against the runner's +24.0 / +31.0 / +30.5. Where it wins: the 7 forward trades (+60.4% vs +22.3%) — the runner sold Chi, Nodrel and MEME at 1.2–1.3x on a volume fade after peaks of 2.1x, 2.1x and 6.9x, where x_t2s40 took 2x on each (and King Of Larp: peak 2.84x, runner +9.0%). Where it loses: every other coin set — AS −2.4 points, AS2 −3.2, AS minus AS3 −5.0, A −0.7 — so choosing it for AS3 alone would be exactly the in-sample exit choice the brief warns against. 57% of AS3 coins reached 2x (AS 40%, A 30%; the fixed 2x sale breaks even at 37%). Verdict: no variant line now. x_t2s40 is recorded on every row, so it needs no box: judge at 30 forward trades, and the stat to watch is the forward share reaching 2x — if it stays above about 45%, the fixed 2x sale beats the runner on these coins and can be proposed then.
  - Factor / pair verdict: 1,162 filters × 12 exits + 140 pairs; 209 pass the three-period test, **0 are unlikely to be luck** (shuffles reach +53% to +87%). revise.py's own pick, coin under 68 min old / x_t2s40 n31 +40.8% luck 20: on the runner, AS3 coins over 68 min old are 11 at +5.1% (no-best +0.1%) and under 68 min 31 at +36.8% (no-best +28.8%). Old coins that suddenly print 30 SOL in a minute are the fade-and-stop group — plausible, luck 20, and the age threshold has moved at every analysis (5 min, 6 min, now 68 min): watch, not a rule.
  - Proposed: KEEP, runner exit, no exit change, no age filter; judge at 30 forward trades (about 2 days at 17 a day), comparing with AS on the same coins and tracking the forward 2x rate.

## Notable coins
- None yet in the real test.

## What the owner said / decided
- 21 Oct 01:09–01:19 UK: chose separate boxes over revising AS ("second option"); wanted a bigger reading for the sniper signal; asked for each new box to show the back-test on all data so far and a fresh record "starting now". Go given 01:19 UK.

## Open items
- PROPOSAL (21 Oct rev): KEEP — AS + launch bundle 5+ wallets, unchanged, runner exit; no x_t2s40 box, no age filter — exit x_flow4 — n42 +28.5% (no-best +22.4%) thirds +24.0/+31.0/+30.5 luck 20/20 (its rule on AS; best revision 20/20) — UNPROVEN — 7 forward trades +22.3% (6 won) is the only real test; x_t2s40 ties the runner on 42 (+0.6 pts, range −19 to +18) and is recorded on every row, so judge it at 30 forward trades by the share reaching 2x (57% so far, break-even 37%).
- Judge at 30 trades since 01:30 UK (unchanged).
- Judge at 30 trades since 01:30 UK: compare with AS on the same coins, using the average without the best trade, and the AS3 vs AS gap. Beats AS → candidate for its own executor shadow book; doesn't → drop and record why.
- Few trades a day (roughly 1 in 2–3 AS trades), so 30 trades may take several days.
