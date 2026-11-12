# F009 — creator-absent split of eligibility E (fixed partition, no thresholds) + Idea lab CL-L004 "time-stop exit"

Run f009-20261112T105030Z, Claude research worker (2026-11-12 10:50 → 11:10 UTC). Queue row F009 (coordinator run 3) taken per R22.
Protocol registered at research-claude commit b0aa5f6 (PROTOCOL.md) before any outcome was computed. **Measured development results only;
nothing here is a validated predictor or a profitability claim.** Unknown outcomes are reported separately and are never scored as losses.

## Inputs (verified)
- entry-all-20261107t2210 @ e67833121f1da0dc992c28fa26c5236a855c151a — 16/16 SHA256SUMS OK; 62,789 census launches; 4,913 mints streamed;
  1,568,880 duplicate rows removed by the evaluator's fingerprint rule; 0 non-contiguous mints. Denominator = eval-1.1 common denominator,
  3,638 launches (301 never retained, 974 outage-excluded; 1,593 early / 2,045 late), as in F006 / f006p2 / f008.
- blind-eval-1.1 @ be9b5459e2f7670946d9ca012f875b77aaaf5d5b — evaluate.py sha256 f5686511… (asserted in run_f009.py); run unchanged
  (S1 via its own main(); S2 via run_launch / state_at imported unchanged). DEV_NO_EVIDENCE off. Outages: the six published intervals.
- Codex material read, not copied: research-codex @ 5024b9e (C012 / L004, 09:21 UTC post). Tracker @ e6092be (coordinator run 4).
- No 8–10 Nov data, no protected outcomes, no paid APIs, no live or paper trading.

## Specification (PROTOCOL.md; identical to f006p2 except for the partition and the one new exit)
Decision at exactly created + 300 s from trades received by then. Eligibility E (= f006p2 CONTROL): last received trade is a valid curve
state and ≥ 5 distinct curve buyers in the last 60 s → 679 launches (313 early / 366 late). Fixed partition of E by the creator's trades
received by 300 s (creator = tokens_window.csv, known at creation):
- **A "creator absent"**: no creator buy and no creator sell on the tape — 251 (118 early / 133 late)
- **B "creator bought, sold 0"**: ≥ 1 buy, 0 sells — 122 (63 / 59)
- **C "creator sold > 0"**: ≥ 1 sell — 306 (132 / 174)
A + B = 373 = f006p2's "creator sold 0"; A + B + C = 679. Entry 0.2 SOL at t; exit 30 % trail on sellable net proceeds, 2 h cap. Each cell's
trades are the control's trades on those launches (asserted: every cell net_sol equals the control's; cells disjoint; union = control's
resolved set; cell totals sum to the control total to 1e-12). The R11 paired view is therefore the partition itself.
S1 = frozen eval-1.1 main(), pool 30 bps (+125 sensitivity), K = 5 rule files. S2 = owner scenario R4 (pool 55 bps, +1 s / +0.7 s landings,
125 bps curve, 0.0015 SOL fixed; landing state > 30 s old ⇒ fill unavailable / exit uncertain by post-check).
Control reproduces f006p2 exactly: S1 484 scored / 195 unknown / −11.814859 SOL; S2 679 / 419 resolved / −10.011572 SOL; the control
ledger has 0 field differences against f006p2's ledger.csv.gz (3,638 × 19 fields).

## S1 — frozen eval-1.1 (results_s1.json, verbatim fields; pool 30 bps)
| Rule | scored | abstain | unknown | unknown share | total net SOL | mean / median ret | win | loss ≥ 50 % | mean w/o best | SOL/launch | LCB (K=5) | 125 bps total | scorable / supported |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|
| CONTROL (E) | 484 | 2,959 | 195 | 28.7 % | −11.814859 | −12.21 % / −23.09 % | 21.5 % | 10.5 % | −13.66 % | −0.003248 | −0.016346 | −11.888512 | no / no |
| CELL A creator absent | 187 | 3,387 | 64 | 25.5 % | −5.640601 | −15.08 % / −24.12 % | 19.8 % | 4.3 % | −16.10 % | −0.001550 | −0.006346 | −5.657603 | no / no |
| CELL B bought, sold 0 | 90 | 3,516 | 32 | 26.2 % | −0.695322 | −3.86 % / −22.29 % | 24.4 % | 21.1 % | −11.66 % | −0.000191 | −0.003197 | −0.725030 | no / no |
| CELL C sold > 0 | 207 | 3,332 | 99 | 32.4 % | −5.478936 | −13.23 % / −22.90 % | 21.7 % | 11.6 % | −14.11 % | −0.001506 | −0.008539 | −5.505878 | no / no |
| CL-L004 time-stop (E) | 516 | 2,959 | 163 | 24.0 % | −12.666892 | −12.27 % / −21.85 % | 21.9 % | 9.9 % | −13.64 % | −0.003482 | −0.014680 | −12.734734 | no / no |
A + B + C scored 484 = control; totals sum to −11.814859. Hypothetical-receipt entries: 0 for every rule. No rule is "scorable" (unknown share
> 10 %) and none is "supported"; per R16 these fields are reported, not used as verdicts.

## S2 — owner scenario R4 (results_s2.json; resolved = scored and both landing states ≤ 30 s old)
| Cell | attempted (early/late) | filled (unavail.) | uncertain exit | stale fill | stale exit | resolved | unknown share | total SOL | mean / median | win | loss > 50 % | w/o best 1 | w/o best 3 | early n / SOL | late n / SOL |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---|---|
| CONTROL (E) | 679 (313/366) | 679 (0) | 185 | 16 | 59 | 419 | 38.3 % | −10.011572 | −11.95 % / −24.12 % | 22.9 % | 11.2 % | −11.388 | −12.393 | 197 / −7.662 | 222 / −2.350 |
| A creator absent | 251 (118/133) | 251 (0) | 60 | 7 | 18 | 166 | 33.9 % | −4.820931 | −14.52 % / −25.16 % | 22.3 % | 4.8 % | −5.170 | −5.615 | 81 / −2.560 | 85 / −2.261 |
| B bought, sold 0 | 122 (63/59) | 122 (0) | 31 | 2 | 15 | 74 | 39.3 % | −0.654013 | −4.42 % / −24.93 % | 21.6 % | 25.7 % | −2.030 | −3.036 | 34 / −1.539 | 40 / +0.885 |
| C sold > 0 | 306 (132/174) | 306 (0) | 94 | 7 | 26 | 179 | 41.5 % | −4.536627 | −12.67 % / −23.03 % | 24.0 % | 11.2 % | −4.873 | −5.496 | 82 / −3.564 | 97 / −0.973 |
| A + B pooled ("creator sold 0") | 373 | 373 (0) | 91 | 9 | 33 | 240 | 35.7 % | −5.474945 | −11.41 % / −25.14 % | 22.1 % | 11.3 % | −6.851 | −7.856 | 115 / −4.098 | 125 / −1.377 |
Raw-evaluator view (before the staleness post-check): A 187 / −5.645075, B 90 / −0.703140, C 207 / −5.486026 (sum −11.834241 = control).
Every resolved trade exits on the trail trigger (median hold A 128 s, B 144 s, C 131 s); horizon exits all land on stale states → uncertain.
Cell B's three best trades (+1.375955, +0.581910, +0.423680 SOL) are the control's three best trades; B's late half is +0.885 with them and
−0.491 without the best one. Bootstrap 95 % CI on the cell totals (10,000 resamples, seed 20261112): A [−6.46, −2.99]; B [−3.68, +3.16];
C [−6.89, −1.99]. Deep-loss share (> 50 % of stake): A 4.8 %, B 25.7 %, C 11.2 % (S1: 4.3 / 21.1 / 11.6 %).
Diagnostics (no scoring): for all 679 E launches the retained tape starts at creation (first row offset 0 s; none > 5 s), so creator trades
before capture are not the explanation for cell A. Cell A = launches with dev_buy_sol = 0 in tokens_window for all 251 (no creator buy at
creation); cell B all have dev_buy_sol > 0 (median 0.86 SOL; median creator holding 32.5 M tokens); cell C 99 % dev_buy_sol > 0 (median
2.49 SOL; median creator bought 96.4 M and sold 90.9 M tokens by 300 s, i.e. typically the whole dev buy). Buyers in the last 60 s: medians
A 30, B 20, C 21. Bundle share medians A 23.2 %, B 18.0 %, C 21.2 %. (The `cond_t1_count` field in results_s2.json diagnostics is 0 only
because this run does not compute the T1 flag; T1's 120 launches are a further restriction of A ∪ B — see f006p2 features_at_300s.csv.gz.)

## Answer to the bounded question (counts and totals only)
"Creator sold 0" at 5 min pools two populations that differ in **shape** but not in **sign**: creator-absent launches (A, no dev buy) lose
steadily (mean −14.5 %, median −25 %, deep losses 4.8 %, CI entirely negative) while creator-bought-and-holding launches (B) are bimodal
(median −25 %, deep losses 25.7 % — the highest of the three — and all three of the control's best trades), with a total whose sign is
undetermined on 74 resolved trades. Cell C (creator already sold, typically the whole dev buy) loses like A (mean −12.7 %, CI negative).
Per trade: A −0.0290 SOL, B −0.0088 SOL, C −0.0253 SOL; without each cell's best three: A −0.0345, B −0.0428, C −0.0312 SOL per trade —
B loses the most per trade once its three winners are removed. No cell is profitable; no threshold was tuned; nothing was tested on untouched data.

## Idea lab — CL-L004 "time-stop exit" (registered @ b0aa5f6 before scoring; 600 s / 1.20 fixed, no sweep)
Same 679 E entries; exit at the first received valid state with seconds_held ≥ 600 and sellable net proceeds < 1.20 × stake, or the 30 %
trail, or 2 h — whichever first. R4 scenario: attempted 679, filled 679 (0 unavailable), uncertain exit 154, stale fill 16, stale exit 28,
**resolved 481, total −12.245646 SOL**, mean −12.73 % / median −22.90 %, win 22.0 %, loss > 50 % 10.0 %, w/o best 1 / 3 −13.622 / −14.627,
early 232 / −8.702, late 249 / −3.544; unknown share 29.2 % (control 38.3 %). The time stop fired on 96 of the 516 raw scored trades.
**R11 paired view (419 launches resolved under both; 100 % of the control's resolved set, 87 % of CL-L004's):** control −10.011572 →
CL-L004 −9.655346 SOL, difference **+0.356226** (early +0.207 on 197, late +0.149 on 222); 21 better / 10 worse / 388 unchanged; bootstrap
95 % CI on the paired difference [−0.470, +1.184]. The 62 launches resolved only under CL-L004 (their trail exit was uncertain under the
control, i.e. the tape went quiet after 10 min) resolve at −2.590300 SOL, mean −20.9 %, win 3.2 %, median hold 788 s.
Verdict: **failed** as a loss reducer of substance — the paired improvement is +0.36 SOL with a CI straddling zero, it touches 31 of 419 paired
trades, and its main effect is to convert quiet-tape unknowns into realised losses. Compared with Codex's L004 sell-cluster exit (paired
+2.466 SOL on 195, 69 better / 23 worse), a plain time stop does far less; the two are not the same mechanism.

## Codex L004 re-derived from its published ledgers (codex_l004_rederived.json; trade_l004_*.csv, trade_baseline_*.csv @ 5024b9e)
L004: 296 attempts, 217 scored, 74 exit-uncertain, 5 fill-unavailable, −2.043602 SOL, mean −4.71 % / median −12.62 %, win 33.64 %, loss > 50 %
2.76 %, w/o best 1 / 3 −2.366870 / −2.910945, early −1.058164 / late −0.985438; triggers 116 sell-cluster / 101 trail. Baseline 195 / −4.645368,
w/o best 1 / 3 −4.968636 / −5.561080, early −3.089285 / late −1.556083. Paired 195: −4.645368 → −2.179783, +2.465585 (+1.826281 early /
+0.639304 late), 69 better / 23 worse / 103 unchanged. All exact to Codex's post. Ordering check on the 116 cluster exits: fill_t ≤ trigger_t
≤ sell_t for all, sell − trigger = 0.7 s, minimum cluster 2.006 SOL / 3 wallets. The 22 launches resolved only under L004 net +0.136 SOL.

## Limitations
1. Cells were fixed in advance but the eligibility E and its thresholds come from f006 on the same 36 h; nothing is judged on untouched data.
2. Unknown share is 34–42 % of attempts per cell (exit-side capture gaps and stale landings); unknowns are not losses and differ by cell.
3. "Creator" is the tokens_window creator wallet; trades through other wallets of the same operator are invisible, so A may contain creators who
   trade elsewhere. Cell A is also exactly the no-dev-buy population, so "absent" and "no dev buy" cannot be separated here.
4. Cell B has 74 resolved trades and its total is carried by three trades; its CI straddles zero.
5. CL-L004 parameters (600 s, 1.20) were fixed without a sweep; a different time stop is a new idea, not a retune. The paired view compares exits
   only on launches where the slower exit also resolved, which excludes the 62 quiet-tape launches by construction.

## Reproduce (commands.sh; ≈ 1.5 min each)
    F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> python3 -I run_f009.py <replay dir> <out>
    python3 -I <evaluate.py> --data <replay dir> --rules rule_control.py rule_cellA.py rule_cellB.py rule_cellC.py rule_l004ts.py --from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00 --out results_s1.json
Files: ledger.csv.gz (5 specs × 3,638 launches, landing-state ages, exit_kind), features_at_300s.csv.gz (knowable features, cell, tape_start_s,
dev_buy_sol, bundle_pct), results_s1.json, results_s2.json, results.json (merged + verdicts), codex_l004_rederived.json,
ARTIFACT_SHA256SUMS.txt (generated from git ls-files after the content commit, per R18/R24).
