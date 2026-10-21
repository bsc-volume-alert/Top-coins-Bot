# K — "keeps going" (a coin that doubles again between 5 and 15 minutes)
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- **Code key:** strategy `k` (src/keep.js, `K = { MIN_MC5: 10_000, MAX_MC5: 50_000, MIN_BUYERS5: 50, MULT: 2.0, FROM_S: 300, BY_S: 900 }`). Page box K.
- **Where it runs:**
  - **Paper only**, on the page. Not in the executor (`noExec`). No Telegram.
  - Page record counted from 20 Oct 16:00 UK (`V2_FROM`). The book only exists from 17:30 UK and its first row is 18:00 UK.
  - Scored at PumpSwap costs. Fingerprint coins are left out.
- **Entry rule:**
  - At the coin's 5-minute lifecycle checkpoint it was **$10–50K MC with 50+ buyers**.
  - Bought the moment its MC reaches **2x that 5-minute level**, if that happens **between 5 and 15 minutes** after launch.
  - Works on the curve or on PumpSwap. One entry per coin. A coin that fails the 5-min test is never looked at again.
- **Exit:** headline `x_h2t40`:
  - −40% stop until 2x.
  - At 2x sell half.
  - The rest rides a 40% trailing stop from the peak.
  - `x_tsl40` and `x_h5` are recorded alongside; `x_flow4` is in the data too.
- **Started:** 20 Oct 17:12 UK commit, live from 17:30 UK (v0.18.157).
- **Last rule change:** none.

## Verdict now
**21 Oct 02:30 UK:** Can't be judged yet.

**Undecided; promising but tiny and one evening old.**
- 26 trades (18:00–23:27 UK): the 5-min sale was **+15.4% a trade (+7.1% without the best)** and the runner exit +11.3% (+7.7% without the best).
- The headline exit (`x_h2t40`) cannot be scored from the data file, because the column is missing from others.csv. The 40% trail alone was only +3.9% (−4.2% without the best).

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 08:29 UK; page headline is x_h2t40, not in the data export; 5-min shown. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 20 Oct 18:00 UK) | 50 | +2.7% | -1.8% | 52% | 34% | +0.08 |
| last 24 h | 50 | +2.7% | -1.8% | 52% | 34% | +0.08 |
| last 12 h | 39 | +7.4% | +1.7% | 54% | 33% | +0.25 |
| last 6 h | 16 | -15.1% | -21.3% | 44% | 44% | -0.26 |
<!-- /NUMBERS -->

## Change history
- **20 Oct 17:05 UK, idea:**
  - The owner: "if the narrative is strong the volume will continue".
  - The 24-h launch file behind it: of 2,018 coins at $5–50K five minutes in, 21 reached $200K (1%). Of the 40 that had **doubled by 15 minutes**, 7 did (17.5%).
- **20 Oct 17:12 UK commit / 17:30 UK live (v0.18.157), book K created:**
  - $10–50K with 50+ buyers at the 5-min checkpoint, bought at 2x that level before 15 min.
  - Paper. Headline `x_h2t40`; `x_tsl40` and `x_h5` alongside.
  - The owner gave the go: "Cool, let's go ahead with K".
- **20 Oct 16:25–19:05 UK, save bug:** final exit values were not saved when a copy position closed before the rule fired. K's first rows (18:00–19:05 UK: Gary, Xitter, Poke Packz, Packcoin, New York Shitcoin Exchange) may have incomplete `x_h5`. Fixed in v0.18.163.
- No rule change since.

## Ideas tested
- **K itself** (20 Oct 23:27 UK data, 26 closed trades, real PumpSwap costs; reported to the owner at 23:32 UK as "K 26, +15.4%, without best +7.1%, promising, only one day old"):
  - `x_h5` (5-min sale): +15.4%, median +9.7%, won 62%, stops 23%, +7.1% without the best. **The +15.4% quoted to the owner is this column, not the headline.**
  - `x_flow4` (A's runner): +11.3%, median +18.1%, won 62%, stops 31%, +7.7% without the best.
  - `x_tsl40`: +3.9%, median −12.6%, won 38%, −4.2% without the best.
  - `x_h2t40` (headline): **not in others.csv**, so it cannot be checked outside the page.
  - Still on test. No decision yet.
- No filters tested on K yet.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/K.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 32 trades +6.3% but without best −0.7%; one-coin result. Only 5 entry columns in its data.

## Notable coins
- **WIPD (20 Oct 22:58 UK):**
  - K entry $54.9K, 570 s old. Peak 6.43x; 5-min sale 3.44x, trail 3.27x.
  - The same coin was a GR stop at 22:11 UK (−41.8% real, dumping at the graduation entry).
  - The coin ran later; K's later, confirmed entry caught it.
- **xingxing (21:04 UK):** peak 3.33x, 5-min 2.24x. Also an AS winner (+72.6%).
- **Bitcoin Bull Run (22:36 UK):** $61.8K entry, peak 4.06x, 5-min 2.24x, trail 2.30x.
- **Rosy (19:50 UK):** peak 5.08x but the 5-min sale was only 1.16x.
  - Rosy was also a PG and GR coin. PG bought it at 19:43 on the curve, GR at 19:44 at graduation, K at 19:50.
- **Losers that never moved (stopped near 0.58–0.60):** Gary (18:00), Xitter (18:06, also an AS stop), Back Alley Gambling (20:05), Routr Network (21:17), pengi.xyz (22:52), bndlcat (23:40).
- **Gem Mint Gemma (23:47 UK):** peaked 2.56x yet the 5-min and runner exits both read 0.59. It was stopped before the run.
- **Overlap with AS:** Xitter, Poke Packz, Conviction, shithouse, xingxing and SpaceX SuperIntelligence were also A/AS coins. K is not independent of the A family.

## What the owner said / decided
- **20 Oct 17:02–17:05 UK:**
  - A long message about snipers, devs and "chess", then dev-dumping / copy-the-dev / dev-out ideas.
  - On K's premise: "if the narrative is strong the volume will continue".
- **20 Oct ~17:10 UK:** "Cool, let's go ahead with K. What do you mean by the two DS variants?"
- **20 Oct 20:22 UK:** trading framework: either many trades with small profit each, or few trades with big profit (about 0.3 SOL a trade minimum).

## Open items
- Keep on paper; judge at 60 trades.
- **Add `x_h2t40` to others.csv** (the data dump) so K's headline exit can be scored outside the page. Until then, studies should say which column they used.
- **Decide K's real exit.** On 26 trades the 5-min sale and the runner beat the trail. Don't switch on this sample; record all and compare at 40+.
- **Overlap:** check how many K coins are also A/AS/GR/PG coins before treating it as a separate book in the "two or three non-overlapping books" plan.
- **Next review trigger:** 40+ closed trades, judged by halves and without the best trade.
