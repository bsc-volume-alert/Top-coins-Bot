# S6b — famous smart wallet
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `sn6b` (src/snipe.js, `followUp`). Paper, **off the page** (combined 12-h strip, "S6b famous wallet"). Executor book `famous` (book S6b, 5-min sale) has been **off** since m042 (20 Oct 05:19 UK). It ran in shadow from 19 Oct 20:38 UK (m041).
- Entry: when S6 fires (a smart wallet buys ≥ 0.2 SOL within 60 s), the wallet's GMGN follower count is looked up (about 0.3–1 s). If it has 1,000+ followers, the book buys at our own feed's last price at that moment. This is the price a real follower bot would pay. Median delay 9 s, entry MC ~$5.9K.
- Exit: sold at 5 min (`x_h5`, B's rule), curve model, lateFix.
- Started 19 Oct 20:38 UK (v0.18.143 + executor v0.4.1, owner 20:36; first row 20:42). The rule has not changed.

## Verdict now
**21 Oct 11:00 UK (revision search, data to 10:36 UK):** No profitable version found — retire. 651 trades −18.5%; best exit (x_flow4ff) −14.2%, needs a 13% cheaper entry to break even at a price that is already the honest one. The famous wallet's GMGN record †, follower count and own earlier S6b trades all lose in every slice; the most-followed wallets lose most. See Ideas tested.

**21 Oct 02:30 UK:** Dead — buying new coins in their first seconds/minute loses at real costs whatever the filter or exit.

Not working. About −15% a trade at 5 min on 498 closed rows (31% won). It has the worst real record of any sniper book: 152 shadow legs, −1.264 SOL (−16% of stake). Its real job was to measure S6's price, and it did: a famous wallet's coin costs 9–22% more than S6's paper entry.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 17:06 UK; curve costs, 5-min exit. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 20:42 UK) | 745 | -19.3% | -20.3% | 30% | 53% | -15.14 |
| last 24 h | 391 | -20.4% | -22.3% | 31% | 52% | -8.39 |
| last 12 h | 167 | -25.6% | -26.4% | 29% | 54% | -4.44 |
| last 6 h | 84 | -24.0% | -25.6% | 32% | 51% | -2.10 |

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

- 21 Oct 11:00 UK — revision search (data to 10:36 UK; diag/rev_S6b.md, diag/S6b.md re-run on the same data; wallet-record test in scratchpad/rev_sb/wallets.py):
  - **The book now:** 651 trades, −18.5% a trade at the 5-min sale (without best −19.6%), 30% won, 53% stopped; 412 trades a day, −8.04 SOL a day at 0.1. Thirds −18.3 / −19.0 / −18.1%; last 24 h 412 at −21.2%. This is the honest price of S6's coins (152 real shadow legs −16.3% a leg agree with it).
  - **Winners as a group** (194 = 30%; 24 big winners, average +230%: Energy Coin 8.1x, Toly Wif Hat 6.8x, Pump 5.2x, Larp Final Boss 5.0x, Zoo 5.0x, Bully 4.9x): $6–7K MC, 8–9 s old, bundle 22–25% over 4 wallets, 16–17 holders, top-10 27–31%, creator bought 1.7–3 SOL.
  - **Losers as a group:** stopped (348 = 53%, −47.6%) — $6.2K MC, 9 s, bundle 23% over 4 wallets, 17 holders, top-10 29%, creator bought 2.96 SOL: **the same coin as the winners.** Small losers (109 = 17%, −21.8%): $4.0K, 9 holders — nobody followed the famous wallet. The worst (Retinue −96%, paperlaunch −77%, thank you elon −78%) are 43–63%-bundle launches at $12–36K.
  - **Exit verdict:** every exit loses: x_flow4ff −14.2% (without best −14.7%, won 26%, thirds −11.8 / −18.4 / −12.5%, last 24 h 412 at −16.0%, −6.27 SOL a day), x_flow4 −14.8%, x_t2s40 −15.3%, x_tsl40 −15.7% (holds up to 6 h), 5-min −18.5%. **Break-even distance:** it would have to buy 13% cheaper for its best exit to break even — and this book already buys at the honest price.
  - **Factor / pair verdict:** revise.py 732 filters × 12 exits, 0 pass; shuffled outcomes give at most +0.3%. Fresh diagnose.py 713 cuts, 0 pass.
  - **Does the famous wallet's record help?** Family of 77 cuts × 12 exits (GMGN 7-day record †, follower count at entry, tags, walk-forward own record): **0 pass; every slice loses at 5 min.** Realised profit > 0 † (n339) −20.5% — worse than wallets in loss (−17.5%); top-10% realised † (n52) −17.8%; 34,000+ followers † (n131) −24.7% vs under 15,000 −15.4% — the more famous, the worse (the crowd arrives after us); wallet age ≥ 530 d † (n266) −15.8%; tag kol † (n380) −20.6%, not kol −15.6%. Walk-forward: a wallet whose 10+ earlier S6b trades were net positive → −8.6% on 37; 10+ earlier with a 1.5x rate ≥ 60% → 11 trades, −1.6% at 5 min / +22.9% at flow4ff (without best +5.0%) — 11 trades, nothing. **Per wallet:** 19 wallets with 10+ trades, 1 positive (EQax…87zD +1.7% on 48, −6.4% without its best) against 1.7 expected by chance; the best wallet by chance would be +19.1%. No wallet beats chance.
  - **Shares coins:** 218 of its 651 coins are in S6, 134 in S9, 112 in S7. Toly Wif Hat / PvePad / Pump / Zoo are the same coins across S6/S6b/S7/S7b/S9.
  - **Proposed revised rule: none — no profitable version found.** Honest price, no exit positive, no wallet record carries forward.

## Notable coins
- Energy Coin (20 Oct 20:29 UK) 8.1x, Toly Wif Hat (20 Oct 19:00 UK) 6.8x, Pump (20 Oct 10:20 UK) 5.2x, Zoo (20 Oct 10:06 UK) 5.0x, Bully (20 Oct 01:30 UK) 4.9x. These are paper runners, and most of them came after the shadow leg was switched off.

## What the owner said / decided
- 19 Oct 20:36 UK: build S6b, with an executor shadow leg.
- 20 Oct 05:19 UK: S6b back to paper with F, G and S3 (m042).

## Open items
- PROPOSAL (21 Oct rev): RETIRE — famous-wallet copy at our own feed price; no filter, wallet record or exit found that is positive — exit x_flow4ff (the best) — n651 −14.2% (no-best −14.7%) thirds −11.8/−18.4/−12.5 luck —/20 (nothing passes) — REAL (the loss is firm: 651 paper trades and 152 real-quote legs agree) — needs a 13% cheaper entry to break even; the more followers the wallet has, the worse the trade.
- awaiting go: retire from the page (data kept).
- None. The lesson to carry forward: any "follow a known wallet" book must be priced at an outsider's fill after the wallet's buy, never at the wallet's own trade. The settled view is that new-coin sniping is negative (3,500+ trades in the 20 Oct summary; 6,000+ by 23:32 UK).
