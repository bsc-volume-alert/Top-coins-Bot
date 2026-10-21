# S7b — unknown feed wallet
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `sn7b` (src/snipe.js, `followUp`). **Paper, on the page** (box and strip). Executor book `sn7b` (book S7b, 5-min sale) has been **off** since m043, 20 Oct 15:29 UK owner decision, deployed 15:32–15:45 UK. In snipe.js the book still carries `exec: true`, but the executor's book is off, so nothing is traded.
- Entry: S7's trigger (GMGN smart-money / KOL feed buy on a coin under 10 min old), but only when that wallet has **fewer than 100** GMGN followers. The count is looked up first (~0.3–1 s), then the book buys at our own feed's last price. Median delay is 11 s, entry MC ~$5.6K.
- Exit: sold at 5 min (`x_h5`, B's rule), curve model, lateFix.
- Started 19 Oct 20:38 UK (v0.18.143, owner 20:36; first row 20:42). The rule has not changed.

## Verdict now
**21 Oct 02:30 UK:** Dead — buying new coins in their first seconds/minute loses at real costs whatever the filter or exit.

Not working. About −14% a trade at 5 min on 147 closed rows (27% won). Its real shadow legs were the worst per trade of any sniper book: 47 legs −0.627 SOL (−26% of stake), 19% won. The "+55% a trade" that put it into shadow was two price-error coins.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 08:43 UK; curve costs, 5-min exit. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 20:42 UK) | 147 | -15.8% | -18.9% | 27% | 47% | -2.46 |
| last 24 h | 108 | -16.3% | -20.6% | 25% | 48% | -1.87 |
| last 12 h | 6 | -22.1% | -28.6% | 33% | 50% | -0.14 |
| last 6 h | 0 | — | — | — | — | — |

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

## Notable coins
- **KFC and Super Saiyan (20 Oct 04:54–04:57 UK):** the two "10x" coins. They were instant graduations, priced at the curve's completion price while the pool traded ~9x higher. Really 1.16x and 1.08x. They are the reason v0.18.149's late-price rule exists.
- the normie (19 Oct 22:04 UK): 3.9–4.1x. Without it the book was −16.6% on 38 (09:35 study).
- PvePad (20 Oct 20:01 UK) 5.5x, Toly Wif Hat (20 Oct 19:00 UK) 5.5x: paper runners after the shadow leg was switched off.

## What the owner said / decided
- 19 Oct 20:36 UK: build S7b.
- 20 Oct 05:19 UK: S7b into shadow. 05:30 UK: "why are we still getting price problems?", which led to the late-price fix.
- 20 Oct 15:29 UK: S7b back to paper (m043).

## Open items
- awaiting go: retire from the page (data kept).
- None. Note the count difference: 41 legs / −0.553 SOL at the decision, 47 legs / −0.627 SOL final. The settled view is that new-coin sniping is negative (3,500+ trades in the 20 Oct summary; 6,000+ by 23:32 UK).
