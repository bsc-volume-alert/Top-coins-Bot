# S3b — copycat, not the launch second
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `sn3b` (src/snipe.js). **Paper, on the page** (box and strip). It has never been an executor book. Its coins overlap S3's, and S3's shadow legs (until 20 Oct 05:19 UK) are the only real fills on them.
- Entry: S3's rule (same name as a coin that peaked ≥ $300K in the last 24 h), but only on a trade at least 1 s after the launch and within 60 s. Median delay is 1 s, entry MC ~$4K.
- Exit: sold at 5 min (`x_h5`, B's rule), curve cost model (x × 0.97 − 0.02, stops −0.01, floors −0.12), lateFix.
- Started 19 Oct 21:50 UK (v0.18.146, owner 21:45). The rule has not changed since.

## Verdict now
**21 Oct 08:45 UK:** Replaced on the page by the revised S3 (see S3.md); this file keeps S3b's history.

**21 Oct 08:40 UK:** Still a lottery (5 big winners in 189, −6.3% a trade). Two firm loser groups found: copies of coins that peaked under $1M (118 trades, −23%, no big winners) and one serial creator (26 trades, −29%). What remains (72 trades, +22.5%) rests on 5 coins and failed on S3's independent coins — worth a paper forward test only.

**21 Oct 02:30 UK:** Dead — buying new coins in their first seconds/minute loses at real costs whatever the filter or exit.

Not working: a lottery book. About −10% to −12% a trade at 5 min on 179 closed rows (23% won). It is positive only in snapshots that contain cat cow (9.0x) and Alt-coin (5.7x). Without its best coin it is about −15%, and without its best two about −17% to −20%.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 10:20 UK; curve costs, 5-min exit. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 21:54 UK) | 200 | -7.4% | -11.4% | 21% | 33% | -1.68 |
| last 24 h | 116 | -12.8% | -19.4% | 16% | 34% | -1.60 |
| last 12 h | 30 | +13.8% | -11.3% | 13% | 40% | +0.38 |
| last 6 h | 14 | +10.6% | -26.0% | 21% | 50% | +0.14 |
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

- 21 Oct 08:45 UK (v0.18.173): S3b's box removed from the page; its trades now feed the revised S3 box (filtered: $1M+ originals, serial creator skipped). The tracker still records `sn3b`.

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

- 21 Oct 08:40 UK — owner asked again (screenshot: 1 Larp 6.09x; "analyze all the big wins … all the failures … common factors … make this profitable"). Fresh data to 08:29 UK, 189 trades (scripts: scratchpad/s3b_deep.py; diag/S3b.md):
  - Whole book −6.3% a trade (without best −10.6%, without best 3 −17.3%), median −19.0%, 22% won; 5-min exit still best of 12 (3-min −5.2%, everything else worse).
  - Groups: 5 big winners (3%) averaging +578% — cat cow 8.0x, Where's the Airdrop? 7.4x, 1 Larp can change your life 4.9x, Alt-coin 4.7x, tout va binu 4.0x (real-cost returns); 36 small winners +8.1%; 88 small losers −16.5%; 60 stopped −48.7%. Big winners were all up 1.10x–2.65x at 10 s; stopped losers' median 10-s price 0.71x.
  - NEW common factor 1 — the original coin's size: all 5 big winners copied a name whose original reached $1.3M+ in the last 24 h. The 118 copies of originals under $1M had 0 big winners and lost −22% to −24% a trade in every band and every third. Copies of $1M+ originals (no serial creator): 72 trades +22.5% (without best +11.6%, without best 3 −5.9%), 25% won, thirds −2.8 / +34.7 / +35.6. Chance all 5 big winners land in a random 72 of 189: ~0.6% — but the cut was found after looking, and on S3's 38 independent coins (not in S3b) the same rule was −15.7%. Luck check on the $1.33M cut: 9/20.
  - NEW common factor 2 — a serial creator: one creator launching ~250 coins a day (creator buy 0.059 SOL, bundle 0.21%; Flying Car ×19, Charizard ×5, Bramble, Millercoin) — 26 trades −29.4%, median −39.3%, 0 big winners, negative in all thirds. A simple "creator 50+ launches in 24 h" rule catches 20 of the 26 but also drops Alt-coin (a big winner), so the exact fingerprint is better than the simple rule.
  - Early exits (sell at 5/10/20/30/60 s if below a level): selling at 10 s if not above 1.0x adds ~2 points (−6.3% → −3.8%) without losing a big winner; every later cut is worse (losers recover a little before 5 min). Not worth a change.
  - Verdict: still a lottery. The new evidence narrows it to a better lottery: drop copies of sub-$1M coins (a consistent −23% group) and the serial creator.

## Notable coins
- **Where's the Airdrop? (21 Oct 00:56 UK):** 7.4x real-cost (peak 14.1x), copy of a $10.6M original, launch bundle 5 wallets 42.6%.
- **1 Larp can change your life (21 Oct 06:19 UK):** 4.9x real-cost (page 6.09x), copy of a $2.9M original; a second launch of the same name a minute earlier made only 1.29x.
- **Flying Car (19 copies) / Charizard (5):** the serial creator (~250 launches a day) — the core of the stopped losers.
- **cat cow (20 Oct 01:46 UK):** bought 1 s after launch, 9.0x at 5 min (S3's shadow leg made 7.7x, +0.343 SOL). This is the coin that makes S3b's mean.
- **Alt-coin (19 Oct 22:32 UK):** 5.7x, the second prop.
- tout va binu (20 Oct 06:41 UK): 5.0x.
- cat cow (19 Oct 22:42 UK, another launch of the name): 1.34x.

## What the owner said / decided
- 21 Oct 08:35–08:37 UK: replace S3 with the revised version, keep the name S3 ("we've got too many coins now, we've got to start culling"); leave the wider cull for now.
- 21 Oct 08:27 UK: "analyze S3B … all the big wins … all the failures … find the common factors … see if we can make this profitable" (screenshot: last 6 h +2.206 SOL on 3 trades at 0.5; 24 h −5.513 on 109; total −4.244 on 189).
- 19 Oct 21:45 UK: build S3b (F7) as a paper book.
- 20 Oct ~07:10 UK: "So S3B looks our best bet … improve it even more" (page screenshot). He was told it is one coin (cat cow) and that without it the book loses; no filter rescues it.
- 20 Oct (late morning / afternoon): grouped S3b with S4b, GR, F6 and D as the successes to analyse ("analyze the successes … GR and F6 … D … S3B and S4B"). The answer was the same: S3b and S4b are lottery books carried by one or two coins.

## Open items
- awaiting go (21 Oct 08:40 UK): S3c paper box = S3b only on copies of coins that reached $1M+ in 24 h, skipping the serial creator's fingerprint (creator buy 0.055–0.062 SOL with bundle 0.15–0.26%); back-test + from-now records; judge at 100 trades (a lottery needs many). Not for the executor.
- awaiting go: retire from the page (data kept).
- None pending. It stays on the page as paper. A candidate for removal from the page if the owner wants it tidied; no proposal has been made for S3b specifically. The settled view is that new-coin sniping is negative (3,500+ trades in the 20 Oct summary; 6,000+ by 23:32 UK).
