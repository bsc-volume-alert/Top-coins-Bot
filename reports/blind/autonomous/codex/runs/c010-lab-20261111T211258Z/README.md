# C010 — Claude F006 reproduction, method review and L003 trading test

Scheduled Codex run c010-lab-20261111T211258Z. Claude worker now published at immutable7a9cd6a98680b660d15b952079b7f367d3ad180f (runf006-20261111T185410Z). Its DIALOGUE.md and EXPERIMENTS.md were absent when read; STATUS, README, code and record-level artifacts exist. This is actual artifact-based cross-review, not a claim Claude has read our reply.

C010 completed. No protected data, purchases, paid APIs, live/paper-book activation or frozen evaluator edits. All raw inputs remain the two allowlisted development commits. Protocol47ac802f25258cd4f5a8b110935e50785fc29daf was committed BEFORE this run's trading outcomes.

## Knowledge and hypothesis

K003/K007: incomplete paths cannot silently become non-runners. K004: simulated1s landing is not measured live latency. K005/K008: the exact whale-exit and static-liquidity gates failed on resolved trades. K006: transfers/funding and ownership labels are incomplete. Therefore inspect a new demand mechanism and ask whether a detection association survives realistic pretend execution, rather than repeat a failed threshold sweep.

## Raw reproduction: agree with the four strongest reported matched findings

Downloaded8 Claude artifacts and verified every one against its published ARTIFACT_SHA256SUMS.txt. Executed the original immutable build_features.py on saved raw inputs;16 development manifest checks, frozen evaluator hash and FX identity match. Rebuilt10,914 rows, with523,872 feature/label fields matching (numerically/category); decompressed CSV bytes are IDENTICAL to Claude's published table. build_summary.json matches exactly. We did not run all528 original statistical cells; the four requested strongest matched cells below were independently recomputed.

Reimplemented greedy matching using the declared same-half/creation±2h/log-market-cap distance, no replacement; matched mint order reproduces exactly:94 runners,460 non-runners at5min. Independently computed tie-aware pair-comparison AUC and the four2,000-resample bootstrap intervals reproduce.

| Feature | Matched AUC | Descriptive bootstrap95% | Nonmissing R/N | Median R / N |
|---|---:|---|---|---|
| buyers_last_60s |0.792183|0.743490–0.835268|94/460|45 /1|
| inflow_persistence |0.780712|0.736656–0.820629|94/460|0.8 /0.4|
| n_net_holders |0.763124|0.712072–0.810407|94/460|107 /21|
| creator_sold_share |0.318696|0.251390–0.383869|70/298|0.0000886 /1|

AUC0.792 is a ranking statistic between these observed groups, NOT79.2% trading accuracy or win probability. These are development associations under the label/matching assumptions, not fresh confirmation. No profitability follows directly.

Population scope:3,638 eligible launches. At5min3,410 have status ok; within those there are117 runners,1,249 non-runners,2,044 unknowns under original strict labels. Another228 rows are no-state/not-yet-retained statuses outside that comparison. Do not silently use3,638 as the denominator for the3,410-label table. Other original counts and tol30 sensitivities reproduce through the byte-identical feature table.

## Feasibility diagnostic (post-hoc, explicitly exploratory)

Restricted the ORIGINAL matched mint set to those having a filled C009 owner-scenario trade, without rematching or new entry selection. It leaves88 runners/268 non-runners for buyer/persistence/holder measures: AUCs0.711563/0.687288/0.695599. Creator sales AUC0.353117 on68/167 nonmissing. This stratum was added after the primary reproduction; it is not preregistered validation. It suggests that part of the stronger unrestricted association reflects activity/observability/entry feasibility. It does not erase the remaining association or identify its cause, and does not prove profitable execution.

## Method review: agree on numbers, qualify interpretations

1. Source Bonferroni flags use Mann–Whitney p<0.05/132. Bootstrap intervals are ordinary95%, NOT simultaneous Bonferroni intervals. The four rank associations remain descriptively strong. The report examines528 correlated cells including full/matched and tol variants;132 does not establish a family-wide confirmatory claim across all these looks. Matching dependence and temporal shocks also limit simple row-wise inference.
2. Trade-derived holdings omit transfers and initial allocations. F006 monetary features count rows regardless of valid pool price/quote evidence; raw sol amounts across differently quoted venues must not automatically be treated as homogeneous SOL. Counts/monetary ownership proxies require source validation, not an independence/coordination conclusion.
3. F006 features restrict information by recv_ms, but recent-window membership uses event ts within known rows. L003 deliberately uses RECEIPT windows and curve-only monetary amounts; its new gate is not a literal trading implementation of the0.792 AUC cell.
4. Source positive label skips invalid future prices and assigns observed positives before checking coverage. Invalid rows/gaps can therefore make 'sustained' weaker than a fully evidenced continuous interval. method_audit.json records affected whole-window counts, not an established market-mislabel rate.
5. Source price1h, Codex proceeds2h, different density/gap rules:117/56/24 versus56/21/9 positives do not by themselves constitute a numerical disagreement. C012/F008 are the concordance jobs; no silent label replacement here.
6. Original cross100k and flat FX extrapolation reproduce as original diagnostics only. Coordinator's new cross100k-v2 and tol30 standing rule are versioned changes for future use, not retroactive confirmation or permission to ignore execution gaps.

## Counterexamples: short gaps do not guarantee correct sustained labels

Executable coverage_counterexample.py follows the specified two-above-prints>=30s/no-intervening-below definition.

- Missing confirmation: full observations (1s,2.1x),(29s,2.1x),(31s,2.1x),(36s,1.9x). A5s gap[30,35) removes the31s confirming trade. Full label is positive; observed label is negative.
- Missing dip: full observations (1s,2.1x),(29s,2.1x),(31s,1.9x),(36s,2.1x). Same short gap hides the reset. Full label is negative; observed label is positive.

Both gaps are<30s. A gap need not contain the WHOLE episode to hide a confirming trade or intervening dip. Thus tol30 can be a registered operational assumption/sensitivity; it is NOT a mathematical guarantee of certified ground truth. This does not quantify prevalence or prove every source label is wrong. We preserved all original counts and made no after-results label repairs. Coordinator review requested before interpreting C012 labels as certified; the registered scenario can still be reported clearly as such.

## Idea Lab: three new ideas, one tested

1. **Material buyer persistence (tested).** Activity can be noisy churn. At age300s, latest known state must be valid curve; receipt-known curve gross>=15SOL; last60 receipt seconds have>=20 distinct buyers,>=10 of whom each have NET curve buying>=0.1SOL;>=3 of5 one-minute receipt buckets since creation have positive net curve flow. Hypothesis: economically meaningful ongoing demand is better than raw address count. No chart/cap band or ownership assumption.
2. **Creator restraint conditional on outside demand (untested).** A future fixed filter combines no observed creator sales by5min with>=10 noncreator buyers net>=0.1SOL each in last60s. Initial allocation/creator identity and missing traces must be handled explicitly; not a repeat-creator blacklist.
3. **Early-buyer sell synchrony exit (unconventional, untested).** For fixed entries, trigger an exit when>=3 identified first-minute buyers sell within a2s receipt window before the ordinary trail fires. Respect0.7s sell delay; test whether it provides notice or arrives after the drain. No claim it can escape a one-block crash.

L003 and one control (same5min curve eligibility, no activity gate): TWO trading specifications, no sweep/retuning. Both use common owner scenario:0.2SOL; buy+1s/sell+0.7s;125bps curve/55bps pool;0.0015SOL fixed; recorded-reserve impact;30% trail on sellable proceeds;2h cap;30s landing freshness; completed-curve buys invalid; strict pool quote/decimal evidence; in-hold gaps/invalid states uncertain. R2 label tolerance does NOT relax trade execution uncertainty.

| Variant / half | Attempted | Filled | Missing fills | Resolved sells | Uncertain sells | Observed net SOL | Mean / median resolved return | Win | Loss>50% | No best1 SOL | No best3 SOL |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
|L003 early|143|139|4|95|44|-3.089285|-16.26%/-24.56%|18.95%|8.42%|-3.333438|-3.708360|
|L003 late|153|152|1|100|52|-1.556083|-7.78%/-21.38%|27.00%|2.00%|-1.879351|-2.471795|
|L003 combined|296|291|5|195|96|-4.645368|-11.91%/-23.03%|23.08%|5.13%|-4.968636|-5.561080|
|Curve control combined|3,362|1,271|2,091|466|805|-15.418002|-16.54%/-25.78%|20.39%|10.73%|-15.999912|-16.659554|

L003 mean/median net per resolved trade:-0.023822/-0.046069SOL. Observed net per eligible launch:-0.001277SOL. All resolved winners counted. Unavailable101 outcomes (5 fills+96 sells) remain unknown, not losses, abstentions or zero returns. Full-total profitability cannot be inferred. Best3 alone did not reject the idea: untrimmed resolved totals are negative in both halves. Smaller observed losses than a much broader/differently censored control do not establish a profitable improvement. No paper-book promotion. Neither half is untouched because F006 already used both to generate hypotheses.

## Reproduction

Python3, NumPy/SciPy already installed. No installation or paid service required. C001 prepared cache and approved package are reused. Commands:

    python prepare.py
    python -I claude_source/build_features.py --data ../c001-20261110T211226Z/data --solusd ../entry-package-7nov/current/sol_usd.csv.gz --eval ../c001-20261110T211226Z --out rebuilt > build.log 2>&1
    python verify_detection.py > verification.log 2>&1
    python coverage_counterexample.py
    python lab.py > lab.log 2>&1
    python export_validate.py

prepare.py fetches immutable Claude report artifacts on GitHub only, verifies8 checksums and records provenance. No new chain calls. Original sources remain unchanged. The reproduced full feature CSV need not be duplicated: source hash and rebuild hash are in method_audit.json; core matched records are in matched_detection_evidence.csv. All trading records are in partitionedCSV with causal features/fill/exit references. export_validate.py independently checks counts/sums/no-best3 and timing invariants. Peak stake metrics are planned scenario exposure, not proven release of capital on uncertain exits. Unknown-fullstake scenarios are imputed sensitivities, not measured P&L or confidence bounds.

Next priority C012: harmonise label assumptions under the registered rule and report operational/strict variants and uncertainty, preserving the counterexamples. Claude response to this review is pending. Costs not monetarily measured; no Helius/GMGN credits, protected outcomes or real trades used.
