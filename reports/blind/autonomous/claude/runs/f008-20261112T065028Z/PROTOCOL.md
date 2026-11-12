# Protocol — run f008-20261112T065028Z (committed before any Idea-lab result is computed)

## Queue task F008 — label concordance (counts only, no new labels)
Inputs: Claude f006 `features_labels.csv.gz` (research-claude @ 7a9cd6a, age_s = 300, 3,638 rows; `label2x` registered, `label2x_tol30` R2 rule)
and Codex c009 `ledger_001..053.csv` (research-codex @ e9f952d, age = 300, 3,489 rows; `label` ∈ {observed_sustained2x, captured_path_nonrunner, unknown}).
Join on mint. Report the cross-tabulation, how many of Claude's 117 are among Codex's 56, and for every runner found by one worker only the
published record-level reason (Codex trade_status / reason; Claude status / max_multiple_1h). No label is recomputed. Script: concordance.py.

## Idea lab CL-L003 — launch crowding (registered here before computation)
Hypothesis: attention is a shared resource; a live coin that reaches 5 min while few other launches are competing for buyers is more likely
to keep its inflow than one launched into a crowd. Competing explanation: quiet periods are quiet because nobody is trading, so fills and exits
are rarer and the resolved subset is biased.
Knowable-at-time feature: crowd10 = number of OTHER launches whose retention time (first curve buy taking cumulative curve buys ≥ 15 SOL, or
tier ≥ 1, receipt time) falls in (t − 600 s, t], t = created + 300 s. Retention times are computed from the same tape in a first pass; a
launch's own retention is excluded. Outage-excluded launches still count as crowd (their retention is knowable).
Candidate: eligibility E (valid curve state at 300 s, ≥ 5 distinct curve buyers in the last 60 s — identical to f006p2) AND crowd10 ≤ 10.
Threshold fixed a priori from the window rate (≈ 3,638 retained launches / 36.3 h ≈ 17 per 10 min; 10 ≈ 60 % of that). Not tuned.
Control: E alone (same 679 launches as f006p2; R10 satisfied — only the crowding condition differs). Complement: E and crowd10 > 10.
Execution: owner common scenario R4 through frozen eval-1.1 run_launch unchanged (0.2 SOL; buy +1 s; sell +0.7 s; 125 bps curve / 55 bps pool;
0.0015 SOL fixed; 30 % trail on sellable proceeds; 2-h cap; landing state older than 30 s ⇒ unavailable fill / uncertain exit). Both halves
(split 7 Nov 01:50 UTC), totals, mean/median, win rate, share losing > 50 %, without best 1 and 3, uncertain exits separate, R11 paired view.
Descriptive variant (labelled post hoc, not a second candidate): the control's resolved trades split by crowd10 quartile.
Verdict vocabulary per R16: failed / inconclusive / not profitable / unknown, with the unknown share.
Ideas 2 and 3 (first-time-buyer share ≥ 80 %; slot-diversity of last-60-s buys ≥ 8 distinct slots) are proposed only, not tested this run.
