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
**21 Oct 11:10 UK:** Not profitable as a book. On 55 trades (16.6 h) the 5-min sale — the column quoted to the owner — is +3.0% (no-best −1.1%), the runner +1.2%, the 40% trail −10.3%, and the page's headline exit (x_h2t40, still not exported) approximated from the exported columns is about −8% to −11% a trade. K's coins are mostly GR's and A's bought later (37 of 55 are graduation coins, 28 are A's). One pair — under 912 buyers at entry and entry MC ≥ $36K, with the 2x-or-−40% exit — is 18 trades at +42.7% and passes the luck bar exactly (2 of 20): forward test as a paper variant (K2), UNPROVEN. K itself to the planned 60 trades, then retire unless its exported headline says otherwise.

**21 Oct 02:30 UK:** Can't be judged yet.

**Undecided; promising but tiny and one evening old.**
- 26 trades (18:00–23:27 UK): the 5-min sale was **+15.4% a trade (+7.1% without the best)** and the runner exit +11.3% (+7.7% without the best).
- The headline exit (`x_h2t40`) cannot be scored from the data file, because the column is missing from others.csv. The 40% trail alone was only +3.9% (−4.2% without the best).

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 13:20 UK; page headline is x_h2t40, not in the data export; 5-min shown. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 20 Oct 18:00 UK) | 60 | -0.4% | -4.2% | 50% | 37% | -0.08 |
| last 24 h | 60 | -0.4% | -4.2% | 50% | 37% | -0.08 |
| last 12 h | 28 | -8.0% | -14.6% | 46% | 43% | -0.25 |
| last 6 h | 13 | -6.1% | -13.2% | 46% | 38% | -0.09 |
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

- 21 Oct 11:10 UK — revision search (data to 10:36 UK; diag/rev_K.md; scratch in scratchpad/rev_as/):
  - The book now (x_h5, the 5-min sale — the column every chat figure has used): 55 trades in 16.6 h (18:00 UK 20 Oct to 10:16 UK 21 Oct, ~80 a day), +3.0% (no-best −1.1%, no-top3 −6.5%), 55% won, 35% stopped, thirds +2.2 / +15.9 / −8.5, +0.16 SOL a day at 0.1. The other recorded exits: runner +1.2% (no-best −0.6%), x_tp15 +2.2% (+1.5%), x_t15s40 +0.4%, x_t2s40 −1.2%, x_tp −0.2%, x_h3 −6.8%, x_h15 −5.5%, x_tsl40 −10.3% (no-best −14.3%), x_tsl60 −18.9%, x_time −26.2%. Nothing is profitable at the book level. Time blocks of 11 (x_h5): −13.9 / +22.1 / +10.3 / −0.7 / −2.7.
  - The headline exit, what can and can't be judged: x_h2t40 (−40% stop until 2x, half out at 2x, the rest on a 40% trail) is still not in others.csv, so it cannot be scored exactly. It can be approximated from columns that are: stopped before 2x → the x_t2s40 stop value; reached 2x → 1 + 0.5 × x_tsl40; neither → x_time. Checked on 656 A/D rows that carry the real x_h2t40: exact on 92% of rows, mean error −0.026x, about 2.5 points too pessimistic at real costs (−11.8% vs the true −9.3%). On K's 55 the approximation gives −11.0% (no-best −13.9%, 40% won, thirds −15.8 / −5.9 / −11.3) — so the page's K box is most likely showing a loss of about −8% to −11% a trade, not the +15.4% quoted at 23:32 UK (which was x_h5 on 26 trades). Only 35% of K coins reach 2x after entry, and the 2x leg needs 37% to break even.
  - Overlap: K is not a separate book — 37 of its 55 coins are GR / every-graduation coins (K buys them 5–15 min after launch, at 2x their 5-min level) and 28 are A's passed rows (8 AS). The 40% trail on K's later entry loses −10.3%, where the same trail on fresh graduations with under 89 buyers made +57% (cross-book fact 2): by the time K fires, the move the trail catches has already happened.
  - Winners vs losers (x_h5): 30 winners — entry $34–47K, 460–470 buyers at entry, peak 2.0–3.2x; 19 stopped at −53.0% — 685 buyers, peak 1.15x; 6 small losers — 819 buyers. The one thing the usable columns show: crowded entries fail — 912+ buyers at entry: 14 trades, 1 reached 2x, −14.3% on the 5-min sale, −43.4% on the 2x-or-−40% exit. Data problem: `bundle_pct` is blank and `vol5m_usd` is 0 on every K row, so the search had four columns (entry MC, age, buyers, hour).
  - Factor / pair verdict: 61 filters × 11 exits + 30 pairs; 43 pass the three-period test, 2 at luck ≤ 2 — both the same pair: under 912 buyers at entry AND entry MC ≥ $35.8K, exit x_t2s40 — 18 trades +42.7% (no-best +40.1%), 12 of 18 won, thirds +46.7 / +52.3 / +35.0, ~26 a day, +1.09 SOL a day at 0.1; 12 of the 18 reached 2x against 8 of the 37 dropped (−22.5%). The group is positive under every exit (5-min sale +24.5% but no-best +12.0% and no-top3 +1.1% — WIPD +223.6% carries it; runner +22.8% / no-best +18.6%; x_t15s40 +20.2%; x_tp15 +19.6%; approximate h2t40 +18.9%; trail +3.3%). Judged UNPROVEN, not real yet: (1) luck 2/20 is the bar exactly — 2 of 20 shuffles beat it in a small search; (2) 18 trades from one 16.6-hour window, one evening and one night; (3) the MC half is not monotone — by quartile on x_t2s40: $20–27K +8.0%, $29–36K −38.3%, $36–57K +18.4%, $60–102K +7.9% — so the $35.8K cut sits just under a lucky band; the buyers half is monotone only at the top (939–1,518 buyers: 7% reach 2x); (4) neighbouring thresholds (buyers < 700–1,000 and MC ≥ $30–45K) all print +19% to +62% without best, so it is not a single-point fluke, but buyers < 1,200 kills it (+12%); (5) the switch to a fixed 2x sale is what makes it look clean — under K's own exit the no-top3 figure is +1.1%. (Conviction, entry $35,788, sits exactly on the MC quantile; without it the pair is 17 at +40.1%.)
  - Proposed: K itself — no profitable version at the book level; keep it on paper to the planned 60 trades (5 more), then retire unless the headline, once exported, says otherwise. Variant for a forward test: K2 = K's trigger + under 912 buyers at entry + entry MC ≥ $36K, exit 2x-or-−40% (x_t2s40), paper box with back-test plus from-now, judge at 40 forward trades (about 2 days). Still wanted: x_h2t40 in others.csv; bundle_pct and vol5m_usd on K rows.
- 21 Oct 14:00 UK (data to 13:20 UK; method: scratchpad deep.py / cross.py / decile.py; full output in diag/deep_seven_1400.txt): Deep multivariate search (LESSONS 14:00 UK): only 4 entry columns exist (buyers, MC, age, hour); 60 trades, 50% won, −0.4% at 5 min. AUC 0.53 / 0.48 out of sample (chance); top 30% −5.1% / −8.3% vs −3.8%. Winner box (fewer buyers 466 vs 602, smaller MC, evening hours) holds 57% of winners and 33% of losers: inside n27 +14.3% with thirds +15.8 / +16.7 / +11.1 — the same thing as the K2 pair (under 912 buyers, MC ≥ $36K) seen from another angle, and in sample. Depth-2 rule (282–668 buyers) +23.7% in sample → n13 +2.2% vs −44.4% for the rest on the last 20. **Consistent with K2 as the only candidate; nothing else to learn from 4 columns. The crowd size at entry is K's one real-looking number.**

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
- PROPOSAL (21 Oct rev): NEW VARIANT — K2 = K's trigger (2x the 5-min level between 5 and 15 min) + under 912 buyers at entry + entry MC ≥ $36K, paper box back-test plus from-now; K itself to 60 trades then retire unless its exported headline says otherwise — exit x_t2s40 — n18 +42.7% (no-best +40.1%) thirds +46.7/+52.3/+35.0 luck 2/20 — UNPROVEN — passes the luck bar exactly, on 18 trades from one 16.6-hour window with a non-monotone MC cut and a switched exit; K's own exits are +3.0% (5-min, no-best −1.1%) and about −10% (headline, approximated), and 37 of 55 K coins are GR coins bought later.
- Keep on paper; judge at 60 trades.
- **Add `x_h2t40` to others.csv** (the data dump) so K's headline exit can be scored outside the page. Until then, studies should say which column they used.
- **Decide K's real exit.** On 26 trades the 5-min sale and the runner beat the trail. Don't switch on this sample; record all and compare at 40+.
- **Overlap:** check how many K coins are also A/AS/GR/PG coins before treating it as a separate book in the "two or three non-overlapping books" plan.
- **Next review trigger:** 40+ closed trades, judged by halves and without the best trade.
