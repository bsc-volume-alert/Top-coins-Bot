# F010 — Codex's L004 sell-cluster exit generalised to eligibility E (679 entries) + Idea lab CL-L005 "demand-decay exit"

Run f010-20261112T145045Z, Claude research worker (2026-11-12 14:50 → 15:20 UTC). Queue row F010 (coordinator run 5, R35) taken before F002.
Protocol registered at research-claude commit 462894a (PROTOCOL.md, 14:54 UTC) before any outcome was computed. **Measured development results
only; nothing here is a validated predictor, a supported rule or a profitability claim.** Unknown outcomes are reported separately and never
scored as losses.

## Inputs (verified)
- entry-all-20261107t2210 @ e67833121f1da0dc992c28fa26c5236a855c151a — 16/16 SHA256SUMS OK; 62,789 census launches; 4,913 mints streamed;
  1,568,880 duplicate rows removed; 0 non-contiguous mints. Denominator = eval-1.1 common denominator, 3,638 launches (301 never retained,
  974 outage-excluded; 1,593 early / 2,045 late), as in F006 / f006p2 / f008 / f009.
- blind-eval-1.1 @ be9b5459e2f7670946d9ca012f875b77aaaf5d5b — evaluate.py sha256 f5686511… (asserted); run unchanged (S1 via its main();
  S2 via run_launch / state_at imported unchanged). DEV_NO_EVIDENCE off. Outages: the six published intervals.
- Codex material read, not copied: research-codex @ 5024b9e — runs/c012-lab-20261112T091226Z/lab.py (the L004 parameters), PROTOCOL.md
  (f044ea9) and the published trade_l004_*.csv / trade_baseline_*.csv ledgers (used only for the transcription check below). Tracker @ 9f65186.
- No 8–10 Nov data, no protected outcomes, no paid APIs, no live or paper trading.

## Specification (PROTOCOL.md; entries, costs and control identical to f006p2 / f009)
Decision at exactly created + 300 s from trades received by then. Eligibility E (= CONTROL): last received trade is a valid curve state and
≥ 5 distinct curve buyers in the last 60 s → 679 launches (313 early / 366 late; F009 cells A 251 / B 122 / C 306). Entry 0.2 SOL at t.
- CONTROL: 30 % trail on sellable net proceeds, 2 h cap.
- **L004-SC** (Codex's exit, parameters unchanged): early cohort = wallets with a received curve buy by created + 60 s (median 78 wallets per
  E launch, min 0, max 519; 6 launches have < 3 and can never trigger); after the fill, at every received valid state, exit if ≥ 3 distinct
  cohort wallets sold ≥ 2 SOL combined within the preceding 2 s of receipt (rows after the fill, valid states only); trail tested first on the
  same row; earliest of cluster / trail / 2 h; sale lands trigger + 0.7 s.
- **CL-L005** (Idea lab, registered): at a received valid state held ≥ 60 s, exit if ≤ 1 distinct curve buyer was received in the last 60 s;
  else trail / 2 h. Fixed 60 s / ≤ 1 / 60 s, no sweep.
Implementation: rule modules whose exit_signal(p) is `trail(p) or cluster(p)` (resp. `or demand_decay(p)`); the cluster reads the receipt-
ordered list the evaluator built (Prefix.L) through a row pointer that follows the evaluator's own scan, using only rows with receipt ≤ p.t
(asserted). Two mechanical differences from Codex's driver are known and measured: (a) eval-1.1 scans to t + 7200 and lands at trigger + 0.7
(Codex stops at t + 7199.3) — 0 cluster triggers fall in that 0.7 s; (b) eval-1.1's trailing high starts at the first received state after the
fill, Codex's at the fill state — 1 of 99 trail-vs-trail launches differs in net SOL (0.138) because of it. Codex's extra "capture gap /
invalid state during hold" uncertainty checks are not in eval-1.1 and were not added (the E control never had them).
S1 = frozen eval-1.1 main(), pool 30 bps (+125 sensitivity), K = 3 rule files (control, L004-SC, CL-L005). S2 = owner scenario R4 (pool 55 bps,
+1 s / +0.7 s landings, 125 bps curve, 0.0015 SOL fixed; landing state > 30 s old ⇒ fill unavailable / exit uncertain by post-check).
Control reproduces f006p2 / f009 exactly: S1 484 scored / 195 unknown / −11.814859 SOL; S2 679 / 419 resolved / −10.011572 SOL.

## Transcription check against Codex's published L004 ledgers (codex_overlap.json; results.json → analysis.codex_overlap)
295 of Codex's 296 L003 attempts are inside E (F008). Early-cohort size equal on 290/290 compared. Among launches scored by both, **116 of 116
cluster-exit launches have identical trigger time and identical net SOL**; 98/99 trail-exit launches identical (the one 0.138 SOL difference is
(b) above); 2 launches where Codex's trail and my cluster fire on the same receipt time carry identical net SOL. Status cross-tab: 47 Codex
exit-uncertain = my "exit: capture gap", 25 Codex exit-uncertain are scored here (Codex's during-hold checks), 5 Codex fill-unavailable are 3
capture-gap + 2 scored here. **On Codex's own 195 paired launches, my framework resolves 193 and gives −4.510111 → −2.044526, difference
+2.465585 SOL, 69 better / 23 worse / 101 unchanged — the same difference to six decimals as Codex's published +2.465585 (69 / 23 / 103).**
So the exit is transcribed exactly, and the F010 result below is the exit's behaviour on the larger population, not an implementation drift.

## S1 — frozen eval-1.1 (results_s1.json, verbatim; pool 30 bps; per R16 reported, never a verdict)
| Rule | scored | abstain | unknown | unknown share | total net SOL | mean / median ret | win | loss ≥ 50 % | mean w/o best | SOL/launch | LCB (K=3) | 125 bps total | scorable / supported |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|
| CONTROL (E) | 484 | 2,959 | 195 | 28.7 % | −11.814859 | −12.21 % / −23.09 % | 21.5 % | 10.5 % | −13.66 % | −0.003248 | −0.016131 | −11.888512 | no / no |
| L004-SC | 506 | 2,959 | 173 | 25.5 % | −9.727740 | −9.61 % / −16.21 % | 27.3 % | 8.1 % | −10.21 % | −0.002674 | −0.014115 | −9.773776 | no / no |
| CL-L005 | 539 | 2,959 | 140 | 20.6 % | −12.261435 | −11.37 % / −16.62 % | 23.2 % | 8.3 % | −11.94 % | −0.003370 | −0.012845 | −12.314284 | no / no |

## S2 — owner scenario R4 (results_s2.json; resolved = scored and both landing states ≤ 30 s old)
| Spec | attempted (early/late) | filled (unavail.) | uncertain exit | stale fill | stale exit | resolved | unknown share | total SOL | mean / median | win | loss > 50 % | w/o best 1 / 3 | early n / SOL | late n / SOL | exits |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---|---|---|---|
| CONTROL (E) | 679 (313/366) | 679 (0) | 185 | 16 | 59 | 419 | 38.3 % | −10.011572 | −11.95 % / −24.12 % | 22.9 % | 11.2 % | −11.388 / −12.393 | 197 / −7.662 | 222 / −2.350 | 419 trail; median hold 131 s |
| **L004-SC** | 679 (313/366) | 679 (0) | 163 | 16 | 54 | **446** | 34.3 % | **−7.997302** | −8.97 % / −15.95 % | 29.8 % | 8.5 % | −8.579 / −9.343 | 214 / −4.953 | 232 / −3.045 | 185 cluster (+1.559 SOL, win 45.9 %, median hold 35 s) / 261 trail (−9.556, win 18.4 %); median hold 77 s |
| CL-L005 | 679 (313/366) | 679 (0) | 133 | 16 | 28 | 502 | 26.1 % | −12.426409 | −12.38 % / −17.31 % | 22.7 % | 8.4 % | −13.008 / −13.694 | 242 / −8.106 | 260 / −4.320 | 184 demand (−2.047, win 27.2 %) / 318 trail (−10.379); median hold 112 s |
Raw-evaluator view (before the staleness post-check): control 484 / −11.834241; L004-SC 506 / −9.739855; CL-L005 539 / −12.275342.
By F009 cell, all-in resolved: L004-SC A 172 / −3.279463 (control 166 / −4.820931), B 84 / −1.692337 (74 / −0.654013), C 190 / −3.025502
(179 / −4.536627); CL-L005 A 198 / −4.987075, B 86 / −1.191488, C 218 / −6.247846.

## R11 paired view — L004-SC vs CONTROL on the 419 launches resolved under both (100 % of the control's, 93.9 % of L004-SC's resolved set)
**−10.011572 → −7.902881 SOL, difference +2.108691; 112 better / 38 worse / 269 unchanged** (median difference on the 150 changed pairs
+0.028 SOL). Candidate block on the pairs: mean −9.43 % / median −17.2 %, win 29.1 %, loss > 50 % 8.8 %, w/o best 1 / 3 −8.485 / −9.249.
- By half: early 197 pairs **+2.501846** (57 / 12 / 128; bootstrap 95 % CI [+1.58, +3.46]); late 222 pairs **−0.393155** (55 / 26 / 141;
  CI [−4.09, +2.31]).
- By cell: A 166 **+1.605934** (47 / 16 / 103; CI [+0.88, +2.35]); B 74 **−1.100084** (15 / 7 / 52; CI [−4.47, +1.16]); C 179 **+1.602841**
  (50 / 15 / 114; CI [+0.30, +2.95]).
- Interval on the full paired difference: iid bootstrap 95 % **[−1.67, +4.99]** (results_s2.json; [−1.63, +4.95] with the sorted-pair
  ordering in analyze_f010.py, same seed); 3-h creation-block bootstrap (12 blocks, as Codex used) **[−2.89, +6.44]**. Both straddle zero.
- Stress: without the worst 1 pair +3.496791; without the worst 3 +4.188391; without the best 3 pairs +1.385191. The three worst pairs are
  the control's largest winners cut by a cluster exit: +1.375955 → −0.012062 (cell B, late, cluster at 46 s), +0.423680 → −0.013804 (B, late,
  10 s), +0.292 → +0.038 (C, late). Of the control's five best trades, two are cut to ≈ 0 by the cluster, two exit on the trail unchanged
  (+0.582, +0.349) and one improves (+0.336 → +0.416).
- Launches resolved under one exit only: 27 under L004-SC only (control exit uncertain: 17 capture gap, 5 state invalid, 5 stale) at
  −0.094421 SOL, win 40.7 %, all cluster exits, median hold 15 s; 0 under the control only.
- Pairs inside Codex's 296 L003 attempts: 211, +0.843657 (74 / 27 / 110; CI [−2.72, +3.47]) — this set contains the two cut winners;
  pairs outside L003: 208, **+1.265033** (38 / 11 / 159; CI [+0.25, +2.34]).

## Bounded question — answer (counts and totals only)
Does the sell-cluster exit's paired loss reduction hold on the E population? **In direction, yes; in magnitude and certainty, only partly.**
On 419 E pairs the exit improves the total by +2.11 SOL (+0.0050 per pair; 75 % of changed pairs better, as in Codex's 75 %), versus +2.47 on
Codex's 195 L003 pairs (+0.0126 per pair). The reduction is concentrated where the control loses steadily — cell A +1.61, cell C +1.60, early
half +2.50, each with a bootstrap interval excluding zero — and it is **negative in cell B (creator bought and holds, −1.10)**, where F009 found
the control's three best trades: the cluster exit sells two of them within a minute of the fill for ≈ 0. Because of those two pairs the
interval on the full E paired difference straddles zero under both bootstraps. On the 208 E pairs Codex never entered (outside L003) the
reduction is +1.27 with an interval above zero. All-in, L004-SC on E is −7.997 SOL on 446 resolved (control −10.012 on 419): still a loss in
both halves and in every cell; the cluster exits themselves are net +1.56 SOL on 185 trades (win 46 %) while the remaining trail exits are
−9.56 on 261. Nothing here is supported or profitable; the exit was tested on the same 36 h that produced it and the E entry.

## Codex's 22 "resolved only under L004" launches — bound from this framework (codex_l004_only_in_claude.json; bears on C015)
Five of the 22 (Codex baseline "capture gap during hold") resolve under BOTH exits here, because eval-1.1 has no during-hold gap check:
control +1.714591 SOL (they include the +1.375955 and +0.423680 winners) vs L004-SC +0.038873 — difference **−1.675718** on 5 launches.
Codex's +0.136 for the 22 is therefore an upper-side selection on this evidence: on the 5 that can be resolved, the baseline's realised mark is
far above the L004 exit. The other 17 remain unknown here too. Caveat: the control's trail exit on those 5 is scored by eval-1.1 although a
logged capture gap sits inside the hold, so an earlier trail trigger inside the gap cannot be excluded; Codex's stricter rule and eval-1.1
disagree on exactly this point.

## Idea lab — CL-L005 "demand-decay exit" (registered @ 462894a before scoring; 60 s / ≤ 1 buyer / 60 s hold, no sweep)
R4: 679 attempted, 679 filled, 133 uncertain exit, 16 stale fill, 28 stale exit, **502 resolved, −12.426409 SOL**, mean −12.38 % / median
−17.31 %, win 22.7 %, loss > 50 % 8.4 %, w/o best 1 / 3 −13.008 / −13.694, early 242 / −8.106, late 260 / −4.320; unknown share 26.1 %.
184 demand exits (−2.047 SOL, win 27 %) / 318 trail. S1: 539 scored / 140 unknown / −12.261435.
R11 paired (418; 99.8 % of the control's resolved set, 83.3 % of CL-L005's): −10.070254 → −9.148861, **+0.921393**, 67 better / 31 worse /
320 unchanged; early 197 +0.953 (CI [+0.03, +1.85]), late 221 −0.032; cells A +0.871, B −0.155, C +0.206; iid CI [−2.03, +3.34]; block CI
[−1.00, +2.84]; without worst 1 / 3 pairs +1.948 / +2.539, without best 3 +0.318. 84 launches resolved only under CL-L005 (control: 50 capture
gap, 34 stale exit) at **−3.277548 SOL, win 7.1 %**, median hold 99 s; 1 resolved only under the control (+0.059).
Verdict: **failed**. Like the time stop (CL-L004, +0.36 on 419), the demand-decay exit moves the paired total by less than its interval and its
main effect is to realise losses on quiet tapes that the control leaves unknown (all-in −12.43 vs −10.01). 486 of 679 E launches hit the
condition within 2 h (median first at 265 s after the decision), so it is not a rare signal; it is just not a useful one.

## Limitations
1. Same 36 h of development data that produced the E entry and (for Codex) the L004 exit; no untouched data was used; nothing is judged on it.
2. Unknown share 26–38 % of attempts per spec (exit-side capture gaps and stale landings); unknowns differ by exit and are never losses.
3. The paired set is 100 % of the control's resolved launches but excludes launches that resolve under one exit only (27 / 84); those are reported
   on their own. Evaluator-dependence is real: Codex's during-hold checks would move 25 of my scored L003-overlap launches to uncertain.
4. The two cut winners dominate the interval; with 419 pairs the sign of the full-E difference is not established either way.
5. Whether a 2-s receipt-window cluster is executable in production (the 0.7-s landing assumption, receipt latency) is not answered here.
6. CL-L005 parameters were fixed without a sweep; a different window or threshold is a new idea, not a retune.

## Reproduce (commands.sh; S2 ≈ 2 min, S1 ≈ 2 min)
    F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> python3 -I run_f010.py <replay dir> <out>
    python3 -I <evaluate.py> --data <replay dir> --rules rule_control.py rule_l004sc.py rule_l005dd.py --from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00 --out results_s1.json
    python3 -I analyze_f010.py <out> <dir with Codex's trade_l004_*.csv / trade_baseline_*.csv @ 5024b9e>
Files: ledger.csv.gz (3 specs × 3,638 launches, landing-state ages, trigger time, exit kind, cluster size), features_at_300s.csv.gz (E flag,
cell, early-cohort size, first cluster / demand-decay event), results_s1.json, results_s2.json, results.json (merged + analysis + verdicts),
codex_overlap.json, codex_l004_only_in_claude.json, ARTIFACT_SHA256SUMS.txt (from git ls-files after the content commit, per R18/R24).
