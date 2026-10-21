# S4b — clean launch, bundle under 3%
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `sn4b` (src/snipe.js). **Paper, on the page** (box and strip). It has never been an executor book. S4's `clean` shadow legs cover the same coins at the same moment.
- Entry: S4's rule, plus a launch bundle under 3% of supply. S4's rule is: bundle < 5%, the creator bought 0.2–3 SOL, and 10+ outside buyers with 5+ SOL within 15 s. S4b fires on the same trade as S4. Median delay 6 s, entry MC ~$4.1K.
- Exit: sold at 5 min (`x_h5`, B's rule), curve cost model (x × 0.97 − 0.02, stops −0.01, floors −0.12), lateFix.
- Started 19 Oct 20:01 UK (v0.18.142, owner 19:56; first row 20:19 UK). The rule has not changed since.

## Verdict now
**21 Oct 02:30 UK:** Dead — buying new coins in their first seconds/minute loses at real costs whatever the filter or exit.

Not working: a lottery book. About −6% to −8% a trade at 5 min on 48 closed rows, median about −25%, and only 12% won. Two coins (Unemployed, But Investing 4.5–4.7x; Eisley 3.8x) carry it. It is −14% without the best and −20% without the best two. The under-3% split that created it reversed out of sample within hours.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 08:29 UK; curve costs, 5-min exit. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 20:19 UK) | 56 | -12.2% | -18.8% | 11% | 29% | -0.74 |
| last 24 h | 31 | -14.2% | -26.4% | 6% | 35% | -0.47 |
| last 12 h | 17 | -31.6% | -33.3% | 0% | 41% | -0.55 |
| last 6 h | 5 | -36.7% | -42.2% | 0% | 60% | -0.19 |
<!-- /NUMBERS -->

## Change history
- 19 Oct 19:41 UK (split shown to the owner): inside S4, a bundle under ~3% was +25% on 12 against −34% on 7 above it. A hypothesis on 19 trades, with the threshold picked from those same rows.
- 19 Oct 20:01 UK (v0.18.142, owner 19:56): S4b created, paper. v0.18.144 (20:55 UK, owner "I can't find S11") gave S4b its own paper box.
- 19 Oct 21:40 UK (study): book 4 rows. By hand on S4's rows: bundle < 3% n19 +27.2%, 0 stops, vs ≥ 3% n29 −7.4%. "In sample, and the owner picked the threshold from these rows."
- 20 Oct 01:45 UK (study): book 13 rows +6.1%, win 23%. On S4's rows: < 3% n30 +21.1%, vs ≥ 3% n52 −10.6%. "The one sniper number still positive out of sample, on 9 trades." Suggested as the next sniper shadow candidate if any.
- 20 Oct 05:35 UK (study): **reversed.** 9 out-of-sample rows −17.2%, win 11% (drifted to ~0.80 and sold at 5 min). Book −3.4% on 22. "S4b is no longer a candidate."
- 20 Oct ~07:07 UK: the assistant proposed taking S4b off the page. The owner asked "Why do you want to take S4B off the page?" and insisted the costs be "as accurate as possible". **S4b stayed on the page.**
- 20 Oct 09:35 UK (study): book −8.3% on 25, win 16%; out of sample on S4's rows −6.9% on 25.
- 20 Oct 13:35 UK (study): book −10.1% on 27, win 15%. "Reversed, and now 27 trades deep."
- 20 Oct ~14:00 UK: Unemployed, But Investing (4.69x) and Formation (2.08x) landed.
- 20 Oct 17:41 UK (study): book +1.8% on 33, median −25.9%, win 18%. The 6 in the window were +55.4%: two coins against four losers, −4.1% without the best one. "Two coins in 33 is not a rule." Not registered.
- 20 Oct 19:15 UK (v0.18.164): fingerprint coins left out (see LESSONS.md).
- 20 Oct 23:30 UK ranking (real costs): 48 rows −8.2%, −15.9% without the best; last 6 h −25.3% on 14.

## Ideas tested
- **Bundle under 3% as the edge inside S4.** In sample +21% to +27% on 19–30. Out of sample −17.2% (9), −6.9% (25); the book −10.1% (27). It went to +1.8% (33) only through two coins, and was −6% to −8% (48) by 21 Oct. **Does not hold up.**
- **Making it a shadow book.** Suggested at 01:45 UK as "if anything sniper gets a shadow leg next, S4b is it", then withdrawn at 05:35 UK after the reversal. Never done.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/S4b.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 48 −8.2% (no-best −15.9%) a trade at curve costs; best exit 40% trail −5.5%. Factor search with the luck check: nothing real — with hundreds of trades the test has power, so this is a firm no. No exit or slice makes it break even.

## Notable coins
- **Unemployed, But Investing (20 Oct 14:02 UK):** 4.5–4.7x at 5 min. This is the "4.7x coin" that put S4b in profit on the owner's screen. S4 and AS also took it.
- **Eisley (19 Oct 22:10 UK):** 3.8x, the early coin behind the in-sample +27%.
- Formation (20 Oct 14:00 UK) 2.0x; Nya Mint (20 Oct 05:51 UK) 1.39x.

## What the owner said / decided
- 19 Oct 19:56 UK: build S4b (his reading of the 19:41 split).
- 20 Oct ~07:07 UK: "Why do you want to take S4B off the page? … We need it to be as accurate as possible." It was kept on the page.
- 20 Oct (afternoon, after ~14:00): "But S4B's in profit, no?" with a screenshot of the S4b box in profit. He was told the profit was one or two coins (Unemployed, But Investing 4.7x, Formation 2.1x) in a book with an 18% win rate and a −26% median. He had seen S3b and S4b as the best books; the answer was that they are lottery books.

## Open items
- awaiting go: retire from the page (data kept).
- None pending. It stays on the page as paper at the owner's wish. The settled view is that new-coin sniping is negative across 3,500+ trades (20 Oct summary; 6,000+ by 23:32 UK). Any return of S4b to "profit" should be checked first for a single 4x+ coin.
