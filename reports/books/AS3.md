# AS3 — AS + a big sniper crowd (launch bundle 5+ wallets)
_Notes last rebuilt: 21 Oct 2026 01:35 UK._

## What it is now
- Code key `as3` (page box AS3), paper only, box stake 0.1 SOL. v0.18.172.
- Entry rule: AS's rule (A's trigger + socials not known-missing + creator not bought-and-sold-out + biggest buyer in the trigger minute 3–5 SOL) **plus** the launch bundle had **5+ wallets** (`tokens.bundle_wallets`; the creator plus 4+ snipers when the creator bought).
- Exit: runner (`x_flow4`), same as A and AS.
- Started 21 Oct 01:30 UK (`CHG_AS2`). Everything before is a back-test of a rule chosen by looking at those trades.

## Verdict now
**23 Oct 09:35 UK (4-hour study; data to 07:09 UK — the first push after the 18-hour gap):** PAPER TO 60 (unchanged). Forward since 01:30 UK 21 Oct: 45 at +4.8% (no-best +2.4%, no-top3 −1.4%, median +16.5%, won 60%, stopped 36%; thirds +14 / −1 / +2) vs back-test 35 at +29.7%. The 14 gap trades +5.8% (no-best −2.2%). The 2x-or-−40% exit (x_t2s40) on the same 45: +11.3% (no-best +9.6%, no-top3 +5.9%, won 47%, stopped 49%; thirds +34 / +3 / −3; the 14 new +0.6%) — its lead over the runner is the first third only, so the 22 Oct 'watch to 60' stands with less behind it. 45 of 60.

**22 Oct 13:50 UK (4-hour study; data to 13:03 UK):** 30-FORWARD CHECKPOINT REACHED (31): +4.4% on the runner (no-best +1.4%, no-top3 −3.0%, median +16.5%, won 65%, stopped 32%; thirds +9 / −4 / +8) vs the 35-trade back-test at +29.7% — the back-test edge has NOT shown up forward; it is 5 points better than the AS trades it leaves out (19 at −9.4% since 01:30 UK), which is inside noise on 31 vs 19. The pre-registered exit question: 17 of 31 reached 2x (break-even for the fixed 2x sale 37%); x_t2s40 on the same 31 +16.1% (no-top3 +8.5%, won 52%, stopped 45%) vs the runner +4.4%, paired +11.7 points, 2x better on 13 / worse on 6 / level 12, sign-flip p 0.10 — a lead that cannot be told from luck at 31, and the exit was first picked by looking at the early forward rows. Verdict: AS3 on the runner is not a book (no-top3 negative); AS3 with the 2x-or-−40% exit is the one AS-family line still positive without its best 3 forward (+8.5%), and that is a watch, not a result. Recommendation: keep AS3 on paper, record x_t2s40 beside it, re-read at 60; nothing goes live on it.

**22 Oct 05:50 UK (4-hour study; data to 05:04 UK):** 24 forward (+1: block chain +23.5%) at +5.5% (no-best +1.7%, no-top3 −3.6%, won 67%, stopped 29%; thirds +21 / −1 / −3) vs back-test 35 at +29.7%. 6 trades to the 30 checkpoint. Pre-registered exit check on the same 24: x_t2s40 (sell at 2x or −40%) +18.6% (no-top3 +8.8%, won 54%, stopped 42%) vs the runner's +5.5%; 12 of 24 reached 2x. Still in sample for the exit choice; decide at 30.

**22 Oct 01:50 UK (4-hour study; data to 01:04 UK):** KEEP to 30 (23 now). Forward 23 at +4.7% (no-best +0.7%, no-top3 −5.0%, won 65%, stopped 30%, thirds +22 / +1 / −4) vs back-test 35 at +29.7%; the 8 new trades −12.8% (5 stops). 2x share 12 of 23 (52%; break-even for the fixed 2x sale 37%); x_t2s40 on the same 23 +22.2% (no-top3 +12.5%, won 57%) vs the runner's +4.7% — still in sample for the exit choice; decide at 30.

**21 Oct 17:35 UK (4-hour study; data to 17:06 UK):** KEEP, judge at 30 forward (13 now). Forward 13 at +10.4% (no-best +6.2%, no-top3 −1.2%, won 77%, stopped 15%) vs back-test 35 at +29.7%; the 22 AS trades since 01:30 with under 5 bundle wallets are at about +2% (no-best negative), so the split still points the right way but the forward gap is 8 points on 13 vs 22 trades — inside noise. The pre-registered exit check: 7 of 13 forward coins reached 2x (54%; break-even for the fixed 2x sale 37%); x_t2s40 on the same 13 is +36.4% (no-top3 +21.2%, won 69%) against the runner's +10.4% — the runner sold Chi, Nodrel, MEME, Larry The Cat and Valley of Juárez at 1.2–1.4x after peaks of 2.1–6.9x. Still 13 trades and the same in-sample warning as at 11:10 UK; decide at 30.

**21 Oct 11:10 UK:** KEEP, runner exit, judge at 30 forward trades. 7 forward trades since 01:30 UK at +22.3% (6 won); the 2 AS trades with smaller bundles in the same window lost −36% between them. The 2x-or-−40% exit (x_t2s40) that revise.py keeps picking ties the runner on the 42 (+0.6 points, range −19 to +18) and only wins on the 7 forward trades; it is recorded on every row, so it needs no box — judge it at 30 by the share of coins reaching 2x (57% so far; it breaks even at 37%). No age filter.

**21 Oct 02:30 UK:** Fewest trades, biggest win per trade of the running books; unproven.

Not yet tested. Fits the owner's "fewer trades, bigger profit each" side: keeps under half of AS's trades.

## Latest numbers
<!-- NUMBERS -->
_Data to 23 Oct 07:09 UK; AS + launch bundle 5+ wallets. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 18 Oct 22:46 UK) | 80 | +15.7% | +12.4% | 65% | 29% | +1.18 |
| before the change (21 Oct 01:30 UK) — back-test | 35 | +29.7% | +22.5% | 71% | 20% | +1.01 |
| since the change — the real test | 45 | +4.8% | +2.4% | 60% | 36% | +0.17 |
| last 24 h | 18 | +7.5% | +1.4% | 56% | 39% | +0.12 |
| last 12 h | 7 | +19.2% | +4.0% | 57% | 43% | +0.13 |
| last 6 h | 4 | +6.5% | -15.1% | 50% | 50% | +0.02 |
<!-- /NUMBERS -->

## Change history
- 21 Oct 01:30 UK (v0.18.172): created on the owner's go (01:19 UK), as a separate book rather than revising AS, so AS's own real test (from 20 Oct 17:45 UK) keeps running untouched.
- 22 Oct 05:50 UK (4-hour study; data to 05:04 UK): no change; 24 forward.
- 23 Oct 09:35 UK (4-hour study; data to 07:09 UK — the first push after the 18-hour gap): no change; 14 trades in the data gap; 45 forward.

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
- 21 Oct 17:35 UK (4-hour study; data to 17:06 UK): Forward 13 grouped: 10 winners (Banana Cat +60.9%, Clout +53.7%, Larry The Cat +33.1%, MEME +28.2%, Datacenter 16:42 +24.7%…), 2 stopped (buyoutSH 78 min old / 54 SOL sold; Datacenter 13:37, 11 wallets, 47 SOL sold — both had 2.6 SOL creator buys and 85 wallets in the minute), 1 small loser (Alpenglow −20.8%). The stopped pair repeat the 11:10 UK loser profile (older coin, heavy first-minute selling, big creator buy).
- 22 Oct 05:50 UK (4-hour study; data to 05:04 UK): x_t2s40 vs runner on 24 forward: +18.6% vs +5.5% (paired on the same coins); the gap is the 2x sale catching peaks the runner's 50% trail gives back. Decide at 30 as agreed, not before.
- 22 Oct 13:50 UK (4-hour study; data to 13:03 UK): 7 new forward trades: won 4 (Shamonda virus +65.2%, Gooncoin +53.2%, Capycoin +30.2%, Artex +12.0%), stopped 3 (fartless, Cream of Shrimp Soup Can, CARLIY0S). Winners' median peak 2.49x vs 1.19x — nothing at entry separates them (bundle 26.5% over 6.5 wallets vs 36.8% over 9). Paired exit test at 31 above (Verdict).

## Notable coins
- None yet in the real test.

## What the owner said / decided
- 21 Oct 01:09–01:19 UK: chose separate boxes over revising AS ("second option"); wanted a bigger reading for the sniper signal; asked for each new box to show the back-test on all data so far and a fresh record "starting now". Go given 01:19 UK.

## Open items
- PROPOSAL (21 Oct rev): KEEP — AS + launch bundle 5+ wallets, unchanged, runner exit; no x_t2s40 box, no age filter — exit x_flow4 — n42 +28.5% (no-best +22.4%) thirds +24.0/+31.0/+30.5 luck 20/20 (its rule on AS; best revision 20/20) — UNPROVEN — 7 forward trades +22.3% (6 won) is the only real test; x_t2s40 ties the runner on 42 (+0.6 pts, range −19 to +18) and is recorded on every row, so judge it at 30 forward trades by the share reaching 2x (57% so far, break-even 37%).
- Judge at 30 trades since 01:30 UK (unchanged).
- Judge at 30 trades since 01:30 UK: compare with AS on the same coins, using the average without the best trade, and the AS3 vs AS gap. Beats AS → candidate for its own executor shadow book; doesn't → drop and record why.
- Few trades a day (roughly 1 in 2–3 AS trades), so 30 trades may take several days.
- 21 Oct 21:30 UK (4-hour study; data to 19:49 UK): forward 15 at +14.0% (no-best +10.7%, no-top3 +4.2%, won 80%); 9 of 15 reached 2x (break-even 37%); 15 of 30. Nothing to decide yet.
- 22 Oct 01:50 UK (4-hour study; data to 01:04 UK): 23 of 30; x_t2s40 vs runner paired at 30 is the decision.
- 22 Oct 05:50 UK (4-hour study; data to 05:04 UK): 6 to 30; the x_t2s40-vs-runner question is the one decision there.
- 22 Oct 13:50 UK (4-hour study; data to 13:03 UK): checkpoint answered: runner +4.4% / no-top3 −3.0% on 31 — not a book on the runner; x_t2s40 +16.1% / no-top3 +8.5%, p 0.10 vs the runner — watch to 60. Owner decides whether the box's headline switches to x_t2s40 (paper only).

