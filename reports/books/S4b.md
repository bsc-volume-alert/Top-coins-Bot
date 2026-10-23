# S4b — clean launch, bundle under 3%
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `sn4b` (src/snipe.js). **Paper, on the page** (box and strip). It has never been an executor book. S4's `clean` shadow legs cover the same coins at the same moment.
- Entry: S4's rule, plus a launch bundle under 3% of supply. S4's rule is: bundle < 5%, the creator bought 0.2–3 SOL, and 10+ outside buyers with 5+ SOL within 15 s. S4b fires on the same trade as S4. Median delay 6 s, entry MC ~$4.1K.
- Exit: sold at 5 min (`x_h5`, B's rule), curve cost model (x × 0.97 − 0.02, stops −0.01, floors −0.12), lateFix.
- Started 19 Oct 20:01 UK (v0.18.142, owner 19:56; first row 20:19 UK). The rule has not changed since.

## Verdict now
**21 Oct 11:05 UK:** Revision search done (data to 10:36 UK): no profitable version found. 58 trades −12.1% (−18.5% without best); the best exit (3-min or 40% trail) is −10.5%, 10.5 points from break-even; 0 of 666 filters × 12 exits pass. All 60 of its rows share a coin with S4 (it fires on S4's trade), so the revised S4 (10:28 UK) supersedes it; the 27 trades since socials were fetched at launch are −28.9% with 1 winner. RETIRE proposed (data kept).

**21 Oct 02:30 UK:** Dead — buying new coins in their first seconds/minute loses at real costs whatever the filter or exit.

Not working: a lottery book. About −6% to −8% a trade at 5 min on 48 closed rows, median about −25%, and only 12% won. Two coins (Unemployed, But Investing 4.5–4.7x; Eisley 3.8x) carry it. It is −14% without the best and −20% without the best two. The under-3% split that created it reversed out of sample within hours.

## Latest numbers
<!-- NUMBERS -->
_Data to 23 Oct 07:09 UK; curve costs, 5-min exit. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 20:19 UK) | 66 | -12.6% | -18.2% | 14% | 26% | -0.90 |
| last 24 h | 0 | — | — | — | — | — |
| last 12 h | 0 | — | — | — | — | — |
| last 6 h | 0 | — | — | — | — | — |
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

- 21 Oct 11:05 UK — revision search (data to 10:36 UK; diag/rev_S4b.md; scratchpad/rev_sa/sa.py): 58 closed, −12.1% a trade at 5 min (without best −18.5%, without top 3 −26.0%, median −27.9%, 12% won, 28% stopped), 36 trades a day, −0.48 SOL a day at 0.1; thirds −8.0 / +0.6 / −29.1. **Shares every coin with S4** (60 of 60 rows; it fires on S4's trade when the bundle is under 3%), so nothing here is independent of S4.md's findings.
  - **Winners as a group:** 3 big winners (5%: Unemployed, But Investing 4.5x, Eisley 3.8x, Formation 2.0x) and 4 small winners. What they share: bought 5 s in at $3.5–4K, socials (2 known, both yes), a first-time creator (2 of 3), an original name (2 of 3) — the same three traits S4 was revised to at 10:28 UK. Inside S4b those three traits are 6 trades +28.3%, −22.3% without the best coin: one coin.
  - **Losers as a group:** 35 small losers (60%, −21.6%) and 16 stopped (28%, −46%). Same entry profile as the winners (MC $4–5K, bundle 1.75–2.1%, creator buy 0.5 SOL, socials on 55–84% of those known, first-time creator 44–80%); the losers drift to 0.9x at 30 s and are sold at 5 min. The 27 trades since the socials fix (20 Oct 16:35 UK) are −28.9%, 1 of 27 won.
  - **Exit verdict:** 3-min −10.4% and the 40% trail −10.5% (without best −18.9%) are the best of 12; 5-min −12.1%; 1.5x/−40% −21.5% (worst — the 12% hit rate cannot pay for the stops). Distance to break-even under the best exit: 10.5 points a trade, and no exit is positive without the best coin.
  - **Factor / pair verdict:** 666 filters × 12 exits; **0 pass the three-period test, 0 beat luck** (diagnose.py's one strict pass on 02:30 data, sn_sells ≥ 9, had luck 5/20 and is gone). The under-3% bundle idea that created the book reversed on 20 Oct and has not come back.
  - **No profitable version found.** The book is a subset of S4; the revised S4 already carries its only promising traits.
- 21 Oct 14:00 UK (data to 13:20 UK; method: scratchpad deep.py / cross.py / decile.py; full output in diag/deep_seven_1400.txt): Deep multivariate search (LESSONS 14:00 UK): 61 trades, 13% won; AUC 0.42 / 0.51 out of sample (chance); the models' top 30% −27.6% / −14.5%. The winner box (quiet launch minute, creator buy ~0.3 SOL) holds 62% of winners, 30% of losers, and still loses (−5.2%, thirds −31 / +66 / −28). Depth-2 rule +20.7% in sample → −22.0% on the last 21. **Nothing; too few winners to learn from.**

## Notable coins
- **Unemployed, But Investing (20 Oct 14:02 UK):** 4.5–4.7x at 5 min. This is the "4.7x coin" that put S4b in profit on the owner's screen. S4 and AS also took it.
- **Eisley (19 Oct 22:10 UK):** 3.8x, the early coin behind the in-sample +27%.
- Formation (20 Oct 14:00 UK) 2.0x; Nya Mint (20 Oct 05:51 UK) 1.39x.

## What the owner said / decided
- 19 Oct 19:56 UK: build S4b (his reading of the 19:41 split).
- 20 Oct ~07:07 UK: "Why do you want to take S4B off the page? … We need it to be as accurate as possible." It was kept on the page.
- 20 Oct (afternoon, after ~14:00): "But S4B's in profit, no?" with a screenshot of the S4b box in profit. He was told the profit was one or two coins (Unemployed, But Investing 4.7x, Formation 2.1x) in a book with an 18% win rate and a −26% median. He had seen S3b and S4b as the best books; the answer was that they are lottery books.

## Open items
- PROPOSAL (21 Oct rev): RETIRE — S4's trade with a launch bundle under 3%; no revision passes and it is a subset of S4 — exit x_h5 (best alternative x_tsl40 −10.5%) — n58 −12.1% (no-best −18.5%) thirds −8.0/+0.6/−29.1 luck n/a (0 of 666 × 12 candidates pass the three-period test) — UNPROVEN — the revised S4 (10:28 UK) supersedes it; the last 27 trades are −28.9% with 1 winner.
- awaiting go: retire from the page (data kept).
- None pending. It stays on the page as paper at the owner's wish. The settled view is that new-coin sniping is negative across 3,500+ trades (20 Oct summary; 6,000+ by 23:32 UK). Any return of S4b to "profit" should be checked first for a single 4x+ coin.
