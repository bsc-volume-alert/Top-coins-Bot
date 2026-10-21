# S7b — unknown feed wallet
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `sn7b` (src/snipe.js, `followUp`). **Paper, on the page** (box and strip). Executor book `sn7b` (book S7b, 5-min sale) has been **off** since m043, 20 Oct 15:29 UK owner decision, deployed 15:32–15:45 UK. In snipe.js the book still carries `exec: true`, but the executor's book is off, so nothing is traded.
- Entry: S7's trigger (GMGN smart-money / KOL feed buy on a coin under 10 min old), but only when that wallet has **fewer than 100** GMGN followers. The count is looked up first (~0.3–1 s), then the book buys at our own feed's last price. Median delay is 11 s, entry MC ~$5.6K.
- Exit: sold at 5 min (`x_h5`, B's rule), curve model, lateFix.
- Started 19 Oct 20:38 UK (v0.18.143, owner 20:36; first row 20:42). The rule has not changed.

## Verdict now
**21 Oct 11:00 UK (revision search, data to 10:36 UK):** No profitable version found — retire. 148 trades −15.6%; best exit (x_h5f14) −11.1%, needs a 10% cheaper entry to break even on paper and ~20% at the real quotes its shadow legs got. revise.py's best pair (holders ≥ 49 and buyers ≥ 62, n20 +42.5%) has luck 4/20, is three coins, and is −7% to −22% on 329 independent coins in S7/S6/S6b/S9. The wallet's GMGN record † and own earlier trades lose in every slice. See Ideas tested.

**21 Oct 02:30 UK:** Dead — buying new coins in their first seconds/minute loses at real costs whatever the filter or exit.

Not working. About −14% a trade at 5 min on 147 closed rows (27% won). Its real shadow legs were the worst per trade of any sniper book: 47 legs −0.627 SOL (−26% of stake), 19% won. The "+55% a trade" that put it into shadow was two price-error coins.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 13:20 UK; curve costs, 5-min exit. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 20:42 UK) | 148 | -15.6% | -18.8% | 27% | 47% | -2.46 |
| last 24 h | 92 | -13.2% | -18.3% | 26% | 43% | -1.31 |
| last 12 h | 1 | +6.9% | +6.9% | 100% | 0% | +0.01 |
| last 6 h | 1 | +6.9% | +6.9% | 100% | 0% | +0.01 |

Executor book `sn7b` (shadow, real quotes): 47 legs, -0.627 SOL, average -26.1% a leg, without best -27.9%, won 19%, 20 Oct 05:22 UK to 20 Oct 15:30 UK.
<!-- /NUMBERS -->

## Change history
- 19 Oct 20:20 UK (split): inside S7, a feed wallet with under 100 followers was +7% on 86, against −23% for famous wallets.
- 19 Oct 20:38 UK (v0.18.143, owner 20:36): S7b created, paper. v0.18.144 (20:55 UK) gave it its own box.
- 20 Oct 05:19 UK (v0.18.148, m042, owner): **S7b into shadow** at 0.05, on "+55% a trade on 33, median −4%, carried by two 10x coins". The 05:35 study warned: "S7b to shadow was decided on two coins … do not read +55% as the book's rate."
- 20 Oct 05:31 UK (v0.18.149, owner 05:30: "why are we still getting price problems?"): the two 10x coins, **KFC and Super Saiyan** (04:54–04:57 UK), were instant graduations. An 85 SOL dev buy took the whole curve inside the launch transaction, so paper bought at the curve's final price while the coin traded 9x higher on the pool. Fixes: snipers skip already-graduated coins, and lateFix scores from the 1-s price, which makes them 1.16x and 1.08x. The book's description in code still says "corrected it is about −2% on 31".
- 20 Oct 07:11 UK: fix to GR and S7b start times (05:30 UK, not 04:30).
- 20 Oct 09:35 UK (study): after lateFix, −7.8% at 1.5x/−40% and −12.0% at 5 min on 39. First 9 shadow legs −0.153 SOL (−34% of stake), 1 winner. Recommendation: "S7b should come off shadow."
- 20 Oct 13:35 UK (study): 26 legs −0.477 SOL (−37% of stake), win 15%; 17 in the window −0.324. Its stops sold a mean 14.8% below the paper stop price (median −5.6%): the curve on a fading coin is thinner than the model's −1% stop term. "The book has no case left."
- 20 Oct 15:29 UK (owner) / 15:32 UK commit (v0.18.154, executor v0.4.3, m043): **S7b back to paper.** The figure used was 41 shadow legs −0.553 SOL, win 20%.
- 20 Oct 17:41 UK (study): the final shadow record was 47 legs −0.627 SOL, win 19%. Paper 85 rows −11.7% (1.5x/−40%) / −16.4% (5 min). "S7b to paper was right."
- 20 Oct 19:15 UK (v0.18.164): fingerprint coins left out (see LESSONS.md).

## Ideas tested
- **Unknown (< 100 follower) feed wallets beat famous ones.** In sample +7% on 86. After the price fix about −12% on 39–56, and −14% on 147 by 21 Oct. **Does not hold up.**
- **Shadow at 0.05 SOL** (20 Oct 05:22–15:30 UK): 47 legs −0.627 SOL. Stops cost ~15% more than paper. Dropped (m043).

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/S7b.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 147 −15.8% a trade at curve costs; best exit −11.4%. Factor search with the luck check: nothing real — with hundreds of trades the test has power, so this is a firm no. No exit or slice makes it break even.

- 21 Oct 11:00 UK — revision search (data to 10:36 UK; diag/rev_S7b.md, diag/S7b.md re-run on the same data; wallet-record test in scratchpad/rev_sb/wallets.py, cross-checks in cross.py):
  - **The book now:** 148 trades, −15.6% a trade at the 5-min sale (without best −18.8%), 27% won, 47% stopped; 94 trades a day, −1.56 SOL a day at 0.1. Thirds −17.5 / −22.5 / −6.8%; last 24 h 92 at −13.2%. The last third is better only because PvePad and Toly Wif Hat (both 20 Oct 19:00–20:01 UK) are in it.
  - **Winners as a group** (40 = 27%; 4 big winners, average +310%: PvePad 5.5x, Toly Wif Hat 5.5x, the normie 3.9x, QuantoPay 1.55x): $8–10K MC, 28–54 holders, bundle 21–45% over 4 wallets. **Losers:** stopped (69 = 47%, −47.1%) — $6.5K, 21 holders, bundle 26%, the same creator buy (1 SOL); small losers (39 = 26%, −18.1%) — $3.7K, 9 holders, dead coins. The big winners had more holders at entry (54) than the stopped (21) — which is what revise.py's pair picks up, and what fails the cross-checks below.
  - **Exit verdict:** every exit loses: x_h5f14 −11.1% (without best −14.2%, won 29%, thirds −11.1 / −20.3 / −1.8%, last 24 h 92 at −9.6%, −1.13 SOL a day), x_flow4ff −13.3%, 5-min −15.6%, x_tsl40 −17.4%. **Break-even distance:** the book would have to buy 10% cheaper for its best exit to break even — and its 47 real-quote legs (−26.1% a leg; stops filled a mean 15% below the paper stop) say the honest figure is about 10 points worse than paper, so the real gap is ~20%.
  - **Factor / pair verdict:** revise.py 794 filters × 12 exits + 67 pairs: 74 pass the three-period test, **0 beat luck.** Its best: `holders_entry ≥ 49.1 AND sn_buyers ≥ 61.9`, exit x_h5f14 — n20 +42.5% (without best +21.1%), won 45%, thirds +56.8 / −14.3 / +63.1%, last 24 h 15 at +44.6%, 12.7 trades a day, +0.525 SOL a day — **luck 4/20**: shuffled outcomes produced +24%, +27%, +38% and +43% "rules" on this book, as the brief's fact 3 says they do at n ≈ 150. Cross-checked on independent coins (same pair, same exit): S7's other coins (the feed wallet with 100+ followers) n75 −22.1%; S6 n57 −16.9%; S6b n19 −9.5%; S9 n178 −7.1%. Inside S7b it is three coins — the normie, Toly Wif Hat, PvePad: without them −19.8% on 17, median −42.7%. Not real; not proposed, not even as a variant.
  - **Does the unknown wallet's record help?** Family of 82 cuts × 12 exits (GMGN 7-day record †, tags, sm_* feed counts, feed lag, followers at entry, walk-forward own record): one passes — realised ÷ cost ≥ 0.1 † with x_h3, n17 +22.1% (without best +2.1%), luck 5/20. Also sm_buys_5m ≥ 3 † (three feed buys on the coin within 5 min) n13 +43.3% (without best +9.5%), thirds −42 / −17 / +126% — one coin. Everything else loses: realised > 0 † (n115) −13.9%, top-10% realised † (n15) +4.7% (without best −15.8%), followers under 15 † (n36) −10.1%, first time the wallet is seen (n96) −10.3%, wallets with 3+ earlier net-positive S7b trades 5 trades −16.9%. Only one wallet has 10+ trades (BsAU…WuF3, 13 at −36.7%).
  - **Shares coins:** 114 of its 148 coins are S7's, 81 S6's; PvePad and Toly Wif Hat are the same winners S6/S6b/S7 count.
  - **Proposed revised rule: none — no profitable version found.** Too few trades to tell anything from luck (shuffles reach +43%), and the one in-sample winner fails on 329 independent coins.

## Notable coins
- **KFC and Super Saiyan (20 Oct 04:54–04:57 UK):** the two "10x" coins. They were instant graduations, priced at the curve's completion price while the pool traded ~9x higher. Really 1.16x and 1.08x. They are the reason v0.18.149's late-price rule exists.
- the normie (19 Oct 22:04 UK): 3.9–4.1x. Without it the book was −16.6% on 38 (09:35 study).
- PvePad (20 Oct 20:01 UK) 5.5x, Toly Wif Hat (20 Oct 19:00 UK) 5.5x: paper runners after the shadow leg was switched off.

## What the owner said / decided
- 19 Oct 20:36 UK: build S7b.
- 20 Oct 05:19 UK: S7b into shadow. 05:30 UK: "why are we still getting price problems?", which led to the late-price fix.
- 20 Oct 15:29 UK: S7b back to paper (m043).

## Open items
- PROPOSAL (21 Oct rev): RETIRE — little-followed feed wallets; the only positive slice (holders ≥ 49 and 62+ buyers at entry, 20 trades) is three coins and fails on 329 independent coins — exit x_h5f14 (the best) — n148 −11.1% (no-best −14.2%) thirds −11.1/−20.3/−1.8 luck 4/20 (for that slice; shuffles reach +43%) — UNPROVEN slice, REAL loss (47 real-quote legs −26% a leg) — needs a 10% cheaper entry on paper, ~20% at real quotes; too few trades to ever tell a filter from luck at 94 a day.
- awaiting go: retire from the page (data kept).
- None. Note the count difference: 41 legs / −0.553 SOL at the decision, 47 legs / −0.627 SOL final. The settled view is that new-coin sniping is negative (3,500+ trades in the 20 Oct summary; 6,000+ by 23:32 UK).
