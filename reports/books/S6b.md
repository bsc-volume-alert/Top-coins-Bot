# S6b — famous smart wallet
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `sn6b` (src/snipe.js, `followUp`). Paper, **off the page** (combined 12-h strip, "S6b famous wallet"). Executor book `famous` (book S6b, 5-min sale) has been **off** since m042 (20 Oct 05:19 UK). It ran in shadow from 19 Oct 20:38 UK (m041).
- Entry: when S6 fires (a smart wallet buys ≥ 0.2 SOL within 60 s), the wallet's GMGN follower count is looked up (about 0.3–1 s). If it has 1,000+ followers, the book buys at our own feed's last price at that moment. This is the price a real follower bot would pay. Median delay 9 s, entry MC ~$5.9K.
- Exit: sold at 5 min (`x_h5`, B's rule), curve model, lateFix.
- Started 19 Oct 20:38 UK (v0.18.143 + executor v0.4.1, owner 20:36; first row 20:42). The rule has not changed.

## Verdict now
**21 Oct 02:30 UK:** Dead — buying new coins in their first seconds/minute loses at real costs whatever the filter or exit.

Not working. About −15% a trade at 5 min on 498 closed rows (31% won). It has the worst real record of any sniper book: 152 shadow legs, −1.264 SOL (−16% of stake). Its real job was to measure S6's price, and it did: a famous wallet's coin costs 9–22% more than S6's paper entry.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 01:42 UK; curve costs, 5-min exit. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 20:42 UK) | 524 | -16.7% | -18.1% | 30% | 54% | -9.30 |
| last 24 h | 424 | -15.7% | -17.5% | 30% | 53% | -7.10 |
| last 12 h | 231 | -18.1% | -21.2% | 30% | 55% | -4.40 |
| last 6 h | 98 | -8.9% | -16.4% | 36% | 45% | -0.97 |

Executor book `famous` (shadow, real quotes): 152 legs, -1.264 SOL, average -16.3% a leg, without best -19.3%, won 25%, 19 Oct 20:42 UK to 20 Oct 05:08 UK.
<!-- /NUMBERS -->

## Change history
- 19 Oct 20:20 UK (split shown to the owner): S6 rows whose smart wallet had 1,000+ GMGN followers were +34% on 59 at real costs, but only +2% without the top 3. The rest were −17.5%.
- 19 Oct 20:38 UK (v0.18.143 + executor v0.4.1, owner 20:36): S6b created, with executor shadow book `famous`, 0.05 SOL, 5-min sale (m041). Its purpose: "to measure whether famous wallets' coins can be bought near the paper price".
- 19 Oct 21:40 UK (study): 5 legs −0.027 SOL, entry gap −9%. The famous wallet's buy moves the curve before the quote.
- 20 Oct 01:45 UK (study): 81 legs −0.892 SOL; paper −17.6% on 81. Compared with S6 on the same 30 coins: paid a median 9% (mean 22%) more, and made 0.935 at 5 min vs S6 paper 1.162. Recommendation: "S6b off; S6 paper is not real."
- 20 Oct 05:19 UK (m042, executor v0.4.2, owner): back to paper ("losing at real prices"). Final shadow record: 152 legs, −1.264 SOL, win 25% (the 05:35 study counted 151 legs −1.238; one more leg closed after).
- 20 Oct 05:31 / 07:08 UK (v0.18.149 / 150): lateFix (15 rows) and the curve model refit.
- 20 Oct 18:35 / 19:30 UK (v0.18.161 / 168): off-page box, then the combined strip.
- 20 Oct 19:15 UK (v0.18.164): fingerprint coins left out (see LESSONS.md).

## Ideas tested
- **Famous (1,000+ followers) wallets as a filter on S6.** In sample +34% on 59 (+2% without the top 3). At our own fill −17.6% on 81, then −12.0% on 145, then −16.0% on 351 at the studies. **Does not hold up.**
- **Shadow at 0.05 SOL** (19 Oct 20:42 → 20 Oct 05:08 UK): 152 legs −1.264 SOL. It answered the price question (a famous wallet's coins cannot be had at S6's paper price). Dropped (m042).
- The 750+ followers version of the same idea inside S6 (+25.7% on 97, 01:45 F search) was discarded for the same reason.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/S6b.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 524 −16.7% a trade at curve costs; best exit −14.1%. Factor search with the luck check: nothing real — with hundreds of trades the test has power, so this is a firm no. No exit or slice makes it break even.

## Notable coins
- Energy Coin (20 Oct 20:29 UK) 8.1x, Toly Wif Hat (20 Oct 19:00 UK) 6.8x, Pump (20 Oct 10:20 UK) 5.2x, Zoo (20 Oct 10:06 UK) 5.0x, Bully (20 Oct 01:30 UK) 4.9x. These are paper runners, and most of them came after the shadow leg was switched off.

## What the owner said / decided
- 19 Oct 20:36 UK: build S6b, with an executor shadow leg.
- 20 Oct 05:19 UK: S6b back to paper with F, G and S3 (m042).

## Open items
- awaiting go: retire from the page (data kept).
- None. The lesson to carry forward: any "follow a known wallet" book must be priced at an outsider's fill after the wallet's buy, never at the wallet's own trade. The settled view is that new-coin sniping is negative (3,500+ trades in the 20 Oct summary; 6,000+ by 23:32 UK).
