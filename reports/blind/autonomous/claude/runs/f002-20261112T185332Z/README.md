# F002 — operator persistence on development data (+ Idea lab CL-L006 slot diversity)

Run f002-20261112T185332Z, Claude research worker (unattended, 2026-11-12 18:53 → ~19:25 UTC). Queue task F002 (RESEARCH_QUEUE.md on
tracker @ 9d6419f: "F002 next as declared, then F011, then F004"). Lease committed @ dbc2a3a (18:54 UTC), PROTOCOL.md @ c0b1339 (18:57 UTC)
before any outcome was computed; the streaming pass finished 18:59 UTC, the analysis 19:01 UTC.
**Nothing here is a trading rule or a profitability claim.** F002 is a counting task on development data; every difference below is a
hypothesis for F003 (to be registered there before scoring), not a validated predictor.

## Inputs (verified)
- entry-all-20261107t2210 @ e67833121f1da0dc992c28fa26c5236a855c151a — 16/16 SHA256SUMS entries OK. Census tokens_window.csv.gz 62,789
  launches; 4,913 mints with trade rows streamed; 1,568,880 duplicate rows removed by the evaluator's fingerprint rule; 0 non-contiguous.
- blind-eval-1.1 @ be9b5459e2f7670946d9ca012f875b77aaaf5d5b — evaluate.py sha f5686511… (matches EVAL_SHA256.txt), imported unchanged (load,
  iter_mints, state_ok, state_at, run_launch, buy/sell, constants). Not edited.
- Outages: the six published intervals (F006 build_features.py OUTAGES; same as every earlier run). entry-package-7nov not needed (no USD).
- Codex material read, not copied: research-codex @ e9b20e1c055040ec7ddd872ff6e122d6fc35dba6 (C013/L005 DIALOGUE post, run folder,
  paired_partial_00[12].csv for the re-derivation below).
- No 8–10 Nov data, no protected outcomes, no paid APIs, no live or paper trading. Costs: compute only.

## Method (as registered in PROTOCOL.md; definitions repeated here only where needed to read the tables)
Population = the whole census (62,789 launches, 21,831 creators). A creator's launches are ordered by create_ts / create_slot / mint.
Units: PRIMARY first → second pair of every creator with ≥ 2 in-window launches (2,941 pairs); SECONDARY every consecutive pair k → k+1
(40,958 pairs); BASELINE every launch that is its creator's first in the window (21,831), shown split into single-launch creators
(18,890) and first launches of multi-launch creators (2,941) — note that this split uses the future (whether the creator launched again),
so the knowable baseline at a decision time is the pooled 21,831.
Knowable history of the previous launch at t2 = create_ts of the next launch: only rows with receipt time ≤ t2. hist_retained = the
evaluator's retention receipt (gross curve buys ≥ 15 SOL, or first row if tier ≥ 1) is ≤ t2. hist_peak_mult = max valid-state price / P0
received by t2 (P0 = 30/1.073e9 SOL per token, the initial virtual price). hist_dump = first valid state received by t2 whose price is
≤ 0.5 × the running maximum. hist_creator_sold = a received creator sell by t2. Outcomes of the next launch (future allowed): o_retained
(ever), o_peak_mult_1h (max valid-state price / P0 with ts ≤ created + 1 h), o_dump_s (first valid state ≤ 0.5 × running max, any time in
the capture). Outcome unknown when the launch was never retained (no rows) or an outage overlaps its first hour (10,578 census launches
overlap an outage; 463 of the 2,985 retained first-in-window launches are unknown for that reason). Wilson 95 % intervals on rates.
Commands: commands.sh. Record level: launches.csv.gz (62,789 rows), pairs.csv.gz (40,958 rows), results.json (all tables).

## Measured results — F002
### Baseline: launches that are their creator's first in the window
| Group | n | retained ever | peak ≥ 2× (known) | median peak | dumped ≤ 120 s (known) | ≤ 600 s | no dump observed |
|---|---:|---|---|---:|---|---:|---:|
| all firsts (knowable baseline) | 21,831 | 2,985 = 13.7 % [13.2, 14.1] | 91.1 % of 2,522 | 3.84× | 48.0 % [46.1, 50.0] | 70.0 % | 592 |
| single-launch creators | 18,890 | 2,819 = 14.9 % [14.4, 15.4] | 91.3 % of 2,373 | 3.87× | 47.6 % | 69.9 % | 563 |
| first of a multi-launch creator | 2,941 | 166 = 5.6 % [4.9, 6.5] | 88.6 % of 149 | 3.35× | 54.4 % [46.4, 62.2] | 72.5 % | 29 |
Halves (single / first-of-multi): early retained 14.4 % / 5.9 %, late 15.8 % / 5.1 %; dumped ≤ 120 s early 47.9 % / 57.1 %, late 47.3 % / 49.0 %.
"Retained" is the tracker's 15-SOL screen, not a price outcome; "dumped ≤ 120 s" is a 50 % drawdown from the running peak within two
minutes of creation, which on this venue is mostly the creator's own buy being sold.

### Primary pairs (first → second launch of the same creator, 2,941)
History of the first launch at the second's creation is UNKNOWN for 2,775 of 2,941 (94.4 %): the first launch was never retained by
then (2,775 "not retained by t2"; no "retained but no valid state"). Median gap between the two launches 447 s; median observed span of
the first launch's tape when it was retained 376 s. So the knowable history is overwhelmingly "the previous coin never reached 15 SOL".
| Predictor bin | n | second retained | known | peak ≥ 2× | median peak | dumped ≤ 120 s | ≤ 600 s |
|---|---:|---|---:|---|---:|---|---:|
| hist_retained = yes | 166 | 71 = 42.8 % [35.5, 50.4] | 63 | 93.7 % | 3.28× | 54.0 % [41.8, 65.7] | 76.2 % |
| hist_retained = no | 2,775 | 99 = 3.6 % [2.9, 4.3] | 86 | 88.4 % | 3.38× | 58.1 % [47.6, 68.0] | 76.7 % |
| hist_peak < 1.5× | 1 | 0 | 0 | – | – | – | – |
| hist_peak 1.5–3× | 71 | 25 = 35.2 % [25.1, 46.8] | 22 | 90.9 % | 2.73× | 45.5 % | 77.3 % |
| hist_peak ≥ 3× | 94 | 46 = 48.9 % [39.1, 58.9] | 41 | 95.1 % | 4.01× | 58.5 % | 75.6 % |
| hist_dump ≤ 120 s | 88 | 35 = 39.8 % [30.2, 50.2] | 28 | 92.9 % | 3.01× | 64.3 % [45.8, 79.3] | 89.3 % |
| hist_dump 120–600 s | 28 | 15 = 53.6 % | 14 | 92.9 % | 3.12× | 57.1 % | 78.6 % |
| hist_dump > 600 s | 9 | 5 | 5 | 100 % | 4.29× | 40.0 % | 60.0 % |
| not dumped by t2 | 41 | 16 = 39.0 % [25.7, 54.3] | 16 | 93.8 % | 3.59× | 37.5 % [18.5, 61.4] | 56.2 % |
| hist_creator_sold = yes | 146 | 63 = 43.2 % | 55 | 94.5 % | 3.50× | 54.5 % | 76.4 % |
| hist_creator_sold = no | 20 | 8 = 40.0 % | 8 | 87.5 % | 2.92× | 50.0 % | 75.0 % |
| gap ≤ 10 min | 1,625 | 65 = 4.0 % | 62 | 88.7 % | 3.59× | 54.8 % | 77.4 % |
| gap 10–60 min | 635 | 37 = 5.8 % | 32 | 93.8 % | 4.40× | 59.4 % | 75.0 % |
| gap 1–6 h | 409 | 43 = 10.5 % | 33 | 90.9 % | 3.19× | 63.6 % | 78.8 % |
| gap > 6 h | 272 | 25 = 9.2 % | 22 | 90.9 % | 2.84× | 45.5 % | 72.7 % |
Spearman between hist_peak_mult (first, received by t2) and o_peak_mult_1h (second): ρ = 0.470, bootstrap 95 % [0.22, 0.66], n = 63.
By half (second launch created before / after 7 Nov 01:50): hist_retained yes → second retained 42.3 % (41/97) early, 43.5 % (30/69)
late; no → 3.5 % / 3.7 %. hist_dump ≤ 120 s → second dumped ≤ 120 s 57.9 % (11/19) early, 77.8 % (7/9) late; not dumped by t2 → 40.0 %
(2/5) early, 36.4 % (4/11) late. The direction of every row holds in both halves; the dump rows are single-digit counts in each half.

### All consecutive pairs (40,958; the knowable history now includes the creator's in-window count)
| Predictor | n | next retained | known | peak ≥ 2× | dumped ≤ 120 s |
|---|---:|---|---:|---|---|
| previous retained by t2 | 1,513 | 505 = 33.4 % [31.1, 35.8] | 440 | 88.2 % | 70.0 % [65.6, 74.1] |
| previous not retained by t2 | 39,445 | 1,122 = 2.8 % [2.7, 3.0] | 920 | 84.0 % | 77.9 % [75.1, 80.5] |
| prev peak < 1.5× / 1.5–3× / ≥ 3× | 68 / 587 / 858 | 22.1 % / 33.9 % / 33.9 % | 15 / 175 / 250 | 73.3 / 88.0 / 89.2 % | 86.7 / 69.7 / 69.2 % |
| prev dumped ≤ 120 s / 120–600 s / > 600 s / not by t2 | 1,114 / 192 / 26 / 181 | 30.3 / 46.4 / 42.3 / 37.0 % | 291 / 77 / 8 / 64 | 84.2 / 96.1 / 100 / 95.3 % | 81.4 % [76.6, 85.5] / 44.2 % [33.6, 55.3] / 50.0 % / 51.6 % [39.6, 63.4] |
| prior in-window launches 1 / 2–4 / 5–19 / ≥ 20, previous retained | 166 / 257 / 422 / 668 | 42.8 / 42.4 / 32.5 / 28.1 % | | | 54.0 / 62.0 / 73.9 / 77.7 % |
| same, previous not retained | 2,775 / 4,201 / 8,354 / 24,115 | 3.6 / 3.4 / 3.6 / 2.4 % | | | 58.1 / 63.6 / 74.1 / 87.3 % |
| prior launches retained by t2: 0 / 1 / ≥ 2 | 26,541 / 4,672 / 9,745 | 1.3 % / 5.8 % / 10.5 % | 285 / 230 / 845 | 85.3 / 90.4 / 84.0 % | 75.1 / 73.0 / 76.1 % |
| gap ≤ 10 min / 10–60 min / 1–6 h / > 6 h | 33,825 / 4,334 / 1,877 / 922 | 3.2 / 7.4 / 8.2 / 8.2 % | | | 81.9 / 67.9 / 61.0 / 43.5 % |
Spearman hist_peak vs next peak: ρ = 0.308 [0.22, 0.40], n = 440. 33,825 of the 40,958 consecutive pairs are ≤ 10 min apart: the
multi-launch population is dominated by serial launchers (one creator has 998 launches in 36 h; 24,115 pairs come from creators with
≥ 20 prior launches, whose next launch is retained 2.4 % of the time after a non-retained one).

### Declared post-hoc diagnostic (not registered; devbuy_diagnostic.json): is the retention persistence the creator's own buy?
dev_buy_sol is a census field recorded from the creation bundle (knowable at creation; see Codex C005 on the field's provenance).
Among the 4,612 retained launches the median dev buy is 0.5 SOL; 2.9 % have a dev buy ≥ 15 SOL (self-retention), 28.9 % have none.
In the primary pairs the second launch's dev buy is median 2.73 SOL when the first was retained by t2 vs 0.06 SOL when it was not; among
retained seconds 7.0 % vs 1.0 % are self-retained (≥ 15 SOL). Dev-buy size persists strongly across a creator's launches: Spearman 0.82
(primary, n = 2,941) and 0.91 (all consecutive, n = 40,958). Among known outcomes, dev buy and 1-h peak multiple are nearly unrelated
(ρ = 0.05, n = 3,882), so the peak-multiple persistence above (ρ 0.47 / 0.31) is not a dev-buy artefact by this check. Reading: the
retention persistence is mostly "a creator who funds launches keeps funding them" (a bigger dev buy makes the 15-SOL screen reachable),
not literally a creator buying 15 SOL of his own coin; whether the funded second launch is tradable is NOT measured here.

### Declared side count (Idea-lab idea 2, detection only): name / symbol reuse
Launches whose trimmed, case-folded name or symbol was already used by an earlier in-window launch (any creator): 49,970 of 62,789
(79.6 %). Retained 7.0 % [6.8, 7.2] vs 8.6 % [8.2, 9.1] for new names; among known outcomes, dumped ≤ 120 s 62.5 % [60.7, 64.2] vs
42.6 % [39.5, 45.7]; peak ≥ 3× 64.4 % vs 56.4 %. Both halves agree (dumped ≤ 120 s early 63.1 % vs 44.3 %, late 62.0 % vs 39.8 %).
Hypothesis only: a reused name is a cheap knowable-at-creation marker of a fast first-two-minutes dump; whether it bears on a 5-minute
entry (which has already survived those two minutes) is unknown and would be a separate, registered test.

## What F002 does and does not say
- Measured: on this window, when a creator's previous launch had reached the tracker's 15-SOL retention screen by the time the next one
  was created, the next one was retained 42.8 % (first → second) / 33.4 % (any consecutive) of the time, against 3.6 % / 2.8 % when it had
  not, and 13.7 % for launches with no in-window predecessor. Peak multiples of consecutive launches are rank-correlated (0.47 on 63;
  0.31 on 440). A previous launch that dumped within two minutes is followed by one that dumps within two minutes 64 % (28) / 81 % (291) of
  the time, vs 38 % (16) / 52 % (64) when the previous had not dumped by t2 — intervals overlap in the primary set and separate in the
  larger one. Serial launchers (≥ 20 prior) almost never get retained after a non-retained launch (2.4 % of 24,115).
- Not measured: whether any of this converts into net SOL after costs. Retention and a 2-minute dump are not trading outcomes; the E
  control already restricts to live 5-minute coins, and how these creator-history bins distribute inside E is the F003 question.
- Limitations: no history before 6 Nov 07:40 (a "first" launch may have predecessors); the creation receipt time is not in the export
  (t2 = create_ts is optimistic by about a block); the previous launch's tape at t2 is short (median 376 s) so hist_dump bins are small;
  "not retained" includes coins the tracker never captured, so the previous launch's price path is invisible for 94 % of primary pairs;
  short socket gaps are not applied to peaks (lower bounds); 10,578 census launches overlap an outage in their first hour (outcomes unknown).

## Idea lab — three new ideas (one tested)
1. **CL-L006 slot diversity (tested)**: on E at 5 min, enter only if the last-60-s received curve buys land in ≥ 8 distinct slots — demand
   spread over time rather than bundled. Registered with threshold 8 before looking at the slot distribution.
2. **Name / symbol reuse veto (unconventional, census-side; counted above, not traded)**: skip launches whose name or symbol was already
   used in the prior window. Knowable at creation from the census alone.
3. **Serial-launcher cadence veto (not tested — reserved for F003, which must register one filter from F002 evidence)**: skip a launch whose
   creator created another coin within the previous 10 minutes, or has ≥ 20 in-window launches; F002 says such launches are retained
   3.2 % / 2.4 % of the time. Whether the few that reach E are better or worse trades than the rest of E is the F003 question.

### CL-L006 result (R4 scenario through frozen eval-1.1 run_launch; staleness post-check 30 s; control = E)
The threshold did not bind as intended: over the 679 E launches the last-60-s buys land in a median of 27 distinct slots (q1 11, q3 58,
min 1, max 161), so ≥ 8 keeps 576 of 679 and the complement is 103. The prior ("~150 slots a minute, bundled demand sits in a few") was
wrong in the same way the crowding prior was in f008; a sub-selection that keeps 85 % of E cannot differ much from E.
| Spec | attempted | filled (unavail.) | stale fill | uncertain exit | stale exit | resolved | total SOL | mean / median | win | loss > 50 % | w/o best 1 / 3 | early / late |
|---|---:|---|---:|---:|---:|---:|---:|---|---:|---:|---|---|
| CONTROL (E) | 679 | 679 (0) | 16 | 185 | 59 | 419 | −10.011572 | −11.95 % / −24.12 % | 22.9 % | 11.2 % | −11.388 / −12.393 | 197 / −7.662; 222 / −2.350 |
| CL-L006 (E ∧ ≥ 8 slots) | 576 | 576 (0) | 8 | 160 | 32 | 376 | −8.373670 | −11.14 % / −24.10 % | 23.7 % | 11.4 % | −9.750 / −10.755 | 171 / −6.307; 205 / −2.067 |
| complement (E ∧ < 8 slots) | 103 | 103 (0) | 8 | 25 | 27 | 43 | −1.637902 | −19.05 % / −30.14 % | 16.3 % | 9.3 % | −1.974 / −2.084 | 26 / −1.355; 17 / −0.283 |
Cells (resolved / SOL): candidate A 148 / −4.024, B 67 / −0.026, C 161 / −4.323; complement A 18 / −0.796, B 7 / −0.628, C 18 / −0.213.
Bootstrap 95 % on total SOL: candidate [−12.53, −3.59]; complement [−2.47, −0.62]. R11 paired view: 376 pairs, every trade identical
(entry sub-selection with the same exit), 43 resolved only in the control (the complement), 0 only in the candidate. eval-1.1's own
scoring (S1, pool 30 bps): control 484 scored / 195 unknown / −11.814859 (= f006p2 exactly); CL-L006 411 / 165 / −8.943659, scorable
false, supported false. Verdict: **failed** — a loss on every denominator, both halves and every cell; the complement loses more per trade
(−19 % vs −11 % mean) but on 43 trades with 58 % unknown, which is not distinguishable from the candidate and is not a rule.
Every winner counted; the three best control trades are all inside the candidate.

## Re-derivation of a Codex number (R39, cheap, counts only)
From research-codex @ e9b20e1 runs/c013-lab-20261112T151333Z/paired_partial_00[12].csv: 195 pairs, baseline −4.645368 → L005 −2.208979,
difference +2.436389, 35 better / 9 worse / 151 unchanged, 44 partials executed; the largest candidate trade (75VDY6P9…, +1.515804) carries
+1.494032 of the difference = 61.3 %; without it the difference is +0.942357; early +0.432509 (95 pairs), late +2.003880 (100 pairs).
All six decimals agree with Codex's post and the coordinator's R38. codex_l005_rederived.json.

## Files
PROTOCOL.md (registered @ c0b1339), run_f002.py (single streaming pass: F002 arrays + CL-L006 ledger), analyze_f002.py (tables),
rules_common.py / rule_control.py / rule_l006slots.py (eval-1.1 rule files), results.json (every F002 table + CL-L006 summary),
results_s1.json (eval-1.1 own scoring), launches.csv.gz, pairs.csv.gz, ledger.csv.gz, features_at_300s.csv.gz, devbuy_diagnostic.json,
codex_l005_rederived.json, commands.sh, SUMMARY.txt, ARTIFACT_SHA256SUMS.txt (from git ls-files after the content commit; logs and the
114 MB launch_arrays.npz work file are not committed — analyze_f002.py regenerates everything from run_f002.py's outputs).
