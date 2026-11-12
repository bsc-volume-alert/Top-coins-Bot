# F006 part 2 — Autopsy A trading half: "held inventory" entry at 5 min (F006-T1) + Idea lab CL-L002

Run f006p2-20261112T025028Z, Claude research worker (2026-11-12 02:50 → 03:05 UTC). Task per coordinator ruling R9. Protocol registered
at research-claude commit 061aa13 before any outcome was computed (PROTOCOL.md). **Measured development results only; nothing here is
a validated predictor or a profitability claim.** Unknown outcomes are reported separately and are never scored as losses or zeros.

## Inputs (verified)
- entry-all-20261107t2210 @ e67833121f1da0dc992c28fa26c5236a855c151a — 16/16 SHA256SUMS OK; 62,789 census launches; 4,913 mints streamed;
  1,568,880 duplicate rows removed by the evaluator's full-fingerprint rule; 0 non-contiguous mints.
- blind-eval-1.1 @ be9b5459e2f7670946d9ca012f875b77aaaf5d5b — evaluate.py sha256 f5686511… (= EVAL_SHA256.txt); run unchanged
  (S1 via its own main(); S2 via run_launch/state_at imported unchanged). DEV_NO_EVIDENCE off.
- Outages: the six published development intervals (as C001 / F006 part 1). entry-package-7nov @ 0e3be03 not needed (no $ labels here).
- Codex material read, not copied: research-codex @ 47ac802 (C010/L003 protocol; no new Codex post since 11 Nov 18:30 UTC).
- No 8–10 Nov data, no protected outcomes, no paid APIs, no live or paper trading. Denominator = eval-1.1 common denominator, 3,638 launches
  (301 never retained, 974 outage-excluded; 1,593 early / 2,045 late).

## Specifications (one candidate per question, one shared control; no sweep, no retuning)
Decision at exactly created + 300 s (decision_offsets=[300]); all features from trades received by then (the evaluator's view).
- Shared eligibility E (R10): last received trade is a valid curve state and ≥ 5 distinct wallets bought on the curve in the last 60 s.
  CONTROL = E. E holds for 679 of 3,638 launches (313 early / 366 late); not E: 2,685 fewer than 5 recent buyers, 272 last state not a
  valid curve state (migrated or invalid), 2 not retained by 300 s.
- F006-T1 "held inventory" = E and creator sold 0 tokens on the tape and first-minute buyers sold ≤ 80 % of what they bought and the top-10
  trade-derived holders hold ≤ 80 %. Within E: creator-sold-0 373, early-sold ≤ 0.8 247, top10 ≤ 0.8 476, all three 120 (medians within E:
  early-sold 0.86, top10 0.57; creator on tape 428 of 679; every E launch had ≥ 1 first-minute buyer).
- CL-L002 "buy-size diversity" = E and the most common 4-dp buy size in the last 60 s is ≤ 50 % of those buys. Within E: 668 of 679 pass
  (median mode-share 0.10) — the veto removes 11 launches.
- Exit: 30 % trail on sellable net proceeds, 2 h cap. S1 = frozen eval-1.1 main(), pool 30 bps (+125 sensitivity), K = 3. S2 = owner
  common scenario R4 (pool 55 bps, +1 s / +0.7 s landings, 125 bps curve, 0.0015 SOL fixed, 0.2 SOL, landing state > 30 s old ⇒
  unavailable/uncertain by post-check). Both candidates are subsets of CONTROL at the same time, so candidate and control trades are
  identical on candidate launches (verified: 120/120); the informative comparison is candidate vs complement (E but not the condition).

## S1 — frozen eval-1.1 (results_s1.json, verbatim fields)
| Rule | scored | abstain | unknown | unknown share of attempts | total net SOL (30 bps) | mean / median ret | win | loss ≥ 50 % | mean w/o best | point SOL/launch | LCB (Bonferroni K=3) | scorable | supported |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---|---|
| CONTROL (E) | 484 | 2,959 | 195 | 28.7 % | −11.814859 | −12.21 % / −23.09 % | 21.5 % | 10.5 % | −13.66 % | −0.003248 | −0.016131 | no | no |
| F006-T1 | 97 | 3,518 | 23 | 19.2 % | −0.349066 | −1.80 % / −16.62 % | 28.9 % | 13.4 % | −9.01 % | −0.000096 | −0.002410 | no | no |
| CL-L002 | 478 | 2,970 | 190 | 28.4 % | −11.632039 | −12.17 % / −23.32 % | 21.3 % | 10.5 % | −13.64 % | −0.003197 | −0.015792 | no | no |
125-bps pool sensitivity: −11.888512 / −0.379491 / −11.705692 SOL (nearly all fills and exits are on the curve). Hypothetical-receipt entries: 0.
Unknowns under eval-1.1 are exit-side capture gaps (178 / 20 / 173) and invalid exit states (7 / 2 / 7); no fill was unavailable.
No rule is "scorable" (unknown share > 10 %) and none is "supported".

## S2 — owner common scenario R4 (results_s2.json; resolved = scored and both landing states ≤ 30 s old)
| Spec | attempted | filled (unavail.) | uncertain exit | stale fill → unavail. | stale exit → uncertain | resolved | total SOL | mean / median | win | loss > 50 % | w/o best 1 | w/o best 3 | early: n / SOL | late: n / SOL |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---|---|
| CONTROL (E) | 679 | 679 (0) | 185 | 16 | 59 | 419 | −10.011572 | −11.95 % / −24.12 % | 22.9 % | 11.2 % | −11.388 | −12.393 | 197 / −7.662 | 222 / −2.350 |
| F006-T1 | 120 | 120 (0) | 22 | 1 | 12 | 85 | −0.492675 | −2.90 % / −20.28 % | 27.1 % | 15.3 % | −1.869 | −2.799 | 44 / −1.407 | 41 / +0.914 |
| T1 complement (E, not T1) | 559 | — | — | — | — | 334 | −9.518897 | −14.25 % / −24.58 % | 21.9 % | 10.2 % | −9.943 | −10.602 | 153 / −6.255 | 181 / −3.264 |
| CL-L002 | 668 | 668 (0) | 180 | 16 | 58 | 414 | −9.836446 | −11.88 % / −24.18 % | 22.7 % | 11.1 % | −11.212 | −12.218 | 195 / −7.550 | 219 / −2.286 |
| L002 complement (11 vetoed) | 11 | — | — | — | — | 5 | −0.175126 | −17.5 % / −18.9 % | 40 % | 20 % | — | — | 2 / −0.112 | 3 / −0.063 |
Raw-evaluator view (before the staleness post-check) for CONTROL / T1 / L002: 484 / 97 / 478 resolved, −11.834 / −0.357 / −11.651 SOL.
Every resolved S2 trade exits on the trail trigger (median hold 131 s control, 156 s T1; T1 quartiles 95 / 156 / 447 s); the 59 / 12 / 58
horizon exits all land on a state older than 30 s and are reported as uncertain. Bootstrap 95 % CI on total SOL (10,000 resamples,
seed 20261112): CONTROL [−14.37, −5.24] on 419; T1 [−3.24, +3.20] on 85. T1's five best trades: +1.376 (688 %, 1,941 s hold, pumpswap exit),
+0.582, +0.349, +0.229, +0.150 SOL; the best trade is 2.8× the absolute value of T1's total.
R11 paired view: not applicable as a candidate-vs-control pairing (identical trades on shared launches); the partition above is the
paired comparison. Early/late: T1 is negative in the early half (−1.407 on 44) and positive in the late half (+0.914 on 41) but only
because of one trade (+1.376); without its best trade the late half is −0.462.

## Verdicts (development data; thresholds generated on the same data)
- F006-T1 "held inventory": **failed** as a profitable specification — negative total in both scorings (−0.349 / −0.493 SOL on 97 / 85
  trades), negative in the early half, late half positive only through one trade, median return −20 %, CI on the total straddles zero.
  What is measured: T1 trades lose less per trade than their complement (mean −2.9 % vs −14.3 %, win 27 % vs 22 %) on the same
  eligibility, in both halves (early −16.0 % vs −20.4 %; late +11.2 % vs −9.0 %). That is consistent with the part-1 detection finding
  but is not evidence of an edge: the 85 resolved trades are too few, the thresholds were fixed from this data, and the unknown share
  (19–29 % of attempts) differs between candidate and complement.
- CL-L002 "buy-size diversity": **inconclusive** — the condition almost never binds at 5 min on live coins (11 of 679 vetoed), so the
  candidate is the control minus 11 trades. Size clustering at 4 dp is not a usable veto at this age on this data; a different definition
  (e.g. near-identical sizes across wallets within seconds) would be a new idea, not a retune of this one.
- Competing explanation status: "held inventory at 5 min is inventory not dumped yet" is not rejected — T1's median trade still loses
  20 % and 15 % of T1 trades lose more than half, more than in the complement (10 %).

## Limitations
1. Thresholds (0.8 / 0.8 / 5 buyers / 0.5) were fixed from part-1 medians on the same 36 h; nothing here was judged on untouched data.
2. Holdings are trade-derived from the retained tape (no transfers, no wallets outside the tape); "creator sold 0" means no creator sale
   observed among received rows, which includes creators who never bought on the tape (251 of 679 E launches had no creator trade).
3. Unknown share is 19–29 % of attempts, mostly exit-side capture gaps (short socket blips during the hold); unknowns are not losses.
4. Eligibility requires activity (≥ 5 buyers in 60 s), so these results say nothing about quiet coins; Codex L003 tests activity itself.
5. S2 landing-state staleness is a post-check on top of the frozen evaluator, as in CL-L001; the evaluator itself was not modified.
6. 85 resolved trades: the bootstrap CI on T1's total is [−3.2, +3.2] SOL — the sign of T1's total is not determined by this sample.

## Reproduce (paths as used; commands.sh)
    (cd <entry-all dir> && sha256sum -c SHA256SUMS.txt)
    F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> python3 -I run_s2.py <replay dir> <out>            # S2, ≈ 1.5 min
    python3 -I <evaluate.py> --data <replay dir> --rules rule_control.py rule_t1.py rule_l002.py --from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00 --out results_s1.json
Replay dir: tokens.csv.gz → tokens_window.csv.gz, feed_gaps.csv.gz → feed_gaps_all.csv.gz, trades_part_*.csv.gz, outages.txt (six intervals, see run_s2.py / F006 part 1).
Files: ledger.csv.gz (3 specs × 3,638 launches, every trade with landing-state ages), features_at_300s.csv.gz (knowable features and
sub-condition flags per launch), results_s1.json, results_s2.json, results.json (merged + verdicts), s1.log, s2.log, ARTIFACT_SHA256SUMS.txt
(committed files only, per R12).
