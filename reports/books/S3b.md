# S3b — copycat, not the launch second
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `sn3b` (src/snipe.js). **Paper, on the page** (box and strip). It has never been an executor book. Its coins overlap S3's, and S3's shadow legs (until 20 Oct 05:19 UK) are the only real fills on them.
- Entry: S3's rule (same name as a coin that peaked ≥ $300K in the last 24 h), but only on a trade at least 1 s after the launch and within 60 s. Median delay is 1 s, entry MC ~$4K.
- Exit: sold at 5 min (`x_h5`, B's rule), curve cost model (x × 0.97 − 0.02, stops −0.01, floors −0.12), lateFix.
- Started 19 Oct 21:50 UK (v0.18.146, owner 21:45). The rule has not changed since.

## Verdict now
**21 Oct 02:30 UK:** Dead — buying new coins in their first seconds/minute loses at real costs whatever the filter or exit.

Not working: a lottery book. About −10% to −12% a trade at 5 min on 179 closed rows (23% won). It is positive only in snapshots that contain cat cow (9.0x) and Alt-coin (5.7x). Without its best coin it is about −15%, and without its best two about −17% to −20%.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 01:42 UK; curve costs, 5-min exit. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 21:54 UK) | 184 | -8.7% | -13.1% | 21% | 32% | -1.78 |
| last 24 h | 130 | -7.6% | -13.8% | 18% | 31% | -1.11 |
| last 12 h | 96 | -15.4% | -23.4% | 16% | 32% | -1.57 |
| last 6 h | 52 | -10.0% | -24.7% | 17% | 33% | -0.57 |
<!-- /NUMBERS -->

## Change history
- 19 Oct 21:40 UK (study): **F7** found inside S3, as one of 4,821 rule tests. S3 bought ≥ 1 s after launch was +13.9% on 62 (win 37%, +22.5% on the 31 after 17:05 UK). Same-second buys were −25.0% on 29, win 14%. Suspicion noted at the time: the same-second price may be the creator's own launch trade, which no outsider gets.
- 19 Oct 21:50 UK (v0.18.146, owner 21:45 UK): S3b created as a paper book.
- 20 Oct 01:45 UK (study): S3b 41 rows −0.7%. F7 out of sample −13.1% on 34; the excluded same-second rows −6.5% on 20. "The split reversed within four hours."
- 20 Oct 05:35 UK (study): S3b 64 rows +6.8% (n22 in the window +21.8%), but −4.7% on 58 without cat cow.
- 20 Oct 05:19–07:31 UK: on the page (v0.18.148 page list); lateFix (v0.18.149); curve model refit (v0.18.150).
- 20 Oct 09:35 UK (study): 80 rows +3.1% (old model +7.1%); −2.7% on 79 without cat cow; −8.8% on 78 without Alt-coin as well.
- 20 Oct 13:35 UK (study): 88 rows +0.6%; **−8.0% on 82 without cat cow**; the 8 in the window −26.9%, none won.
- 20 Oct 17:41 UK (study): 104 rows −1.7%; F7 −2.6% on 80 out of sample, −11.9% on 71 without cat cow. **"Does not hold up."**
- 20 Oct 19:15 UK (v0.18.164): fingerprint coins left out (see LESSONS.md).

## Ideas tested
- **F7 (≥ 1 s after launch)**: in sample +13.9% on 62. Out of sample it has drifted from −13.1% (34) to −2.6% (80), and it is −8% to −12% without cat cow at every check. **Does not hold up.**
- **S3b as the "best bet"** (owner, 20 Oct ~07:10 UK, from a page screenshot): the analysis given (s3b.py on the 07:07 UK data, 64 rows):
  - 5-min −0.4%, median −15.4%, won 28%.
  - Without cat cow −13.0%; without cat cow and Alt-coin −20.8%.
  - Every other exit was no better: 3-min +0.1%, runner −7.5%, 1.5x/−40% −6.0%, trail −12.6%.
  - The halves were −2.4% / +1.6%, but the second half's median was −23.5% and only 12% won.
  - Real fills on the same coins at the same entry (39 S3 shadow legs) were −0.6% real vs +3.4% model, median −21.8%.
  - Conclusion given: one coin carries it, there is nothing to "improve", and it should be judged on its median, not its mean.
- **Improving it with a filter** (s3f.py on S3's rows, ranked without cat cow): no split positive without cat cow. The best was age ≥ 3 s at −1.5% (n46); copycat-count splits only look good in the half holding cat cow. Dropped.
- **Re-run on the 21 Oct 00:10 UK data** (179 rows): 5-min −12.2%, median −19.0%, won 21%. First half −1.4%, second half −22.9%. The real legs are unchanged (no shadow since 20 Oct 05:19 UK).

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/S3b.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 184 −8.7% (no-best −13.1%) a trade at curve costs; best exit 3-min −7.4%. Factor search with the luck check: nothing real — with hundreds of trades the test has power, so this is a firm no. No exit or slice makes it break even.

## Notable coins
- **cat cow (20 Oct 01:46 UK):** bought 1 s after launch, 9.0x at 5 min (S3's shadow leg made 7.7x, +0.343 SOL). This is the coin that makes S3b's mean.
- **Alt-coin (19 Oct 22:32 UK):** 5.7x, the second prop.
- tout va binu (20 Oct 06:41 UK): 5.0x.
- cat cow (19 Oct 22:42 UK, another launch of the name): 1.34x.

## What the owner said / decided
- 19 Oct 21:45 UK: build S3b (F7) as a paper book.
- 20 Oct ~07:10 UK: "So S3B looks our best bet … improve it even more" (page screenshot). He was told it is one coin (cat cow) and that without it the book loses; no filter rescues it.
- 20 Oct (late morning / afternoon): grouped S3b with S4b, GR, F6 and D as the successes to analyse ("analyze the successes … GR and F6 … D … S3B and S4B"). The answer was the same: S3b and S4b are lottery books carried by one or two coins.

## Open items
- awaiting go: retire from the page (data kept).
- None pending. It stays on the page as paper. A candidate for removal from the page if the owner wants it tidied; no proposal has been made for S3b specifically. The settled view is that new-coin sniping is negative (3,500+ trades in the 20 Oct summary; 6,000+ by 23:32 UK).
