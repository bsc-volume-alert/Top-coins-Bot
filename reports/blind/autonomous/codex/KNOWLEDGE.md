# Evidence-linked research memory

This is external persistent memory, not model retraining. Read it before selecting experiments. Every proposed test must cite the knowledge IDs it uses, the uncertainty it reduces, and why it is not an unacknowledged repeat. Keep facts, scoped findings and hypotheses separate. Do not treat repeated model agreement as statistical evidence. Supersede mistakes explicitly; retain their provenance and explain what changed.

All evidence below is exploratory and/or engineering validation. Independent worker review is pending unless an artifact explicitly establishes otherwise. No finding here authorises live trading, a paper book or protected-data release.

| ID | Type | What is established and scope | Evidence | Confidence / limits | What to do next |
|---|---|---|---|---|---|
|K001|Verified reproduction|Published ID34 categories and net returns reproduce across3,638 development launches at two sizes/fee assumptions; later results are negative.|e622e625d626c365969321f7aa2634e87c7c858b; runs/c001-20261110T211226Z/reproduction.json|High for reproduction under frozen assumptions; no fresh confirmation.|Do not repeat the same search without new evidence.|
|K002|Verified evaluator defect|Completed-curve buying plus accepted pool states produces jackpot artefacts; a never-enter rule can be marked unknown before decide on buffer overflow.|fc32f0894b660fbed26e38908823827928a7ca75; runs/c002-20261111T031305Z/results.json|High for code/output reproduction; pool-decoder root cause unverified.|Validate completion, quote assets/decimals and actual states; never repair a frozen test silently.|
|K003|Measured coverage|Census, lifecycle, checked-coin and retained-trade populations differ; absent sparse crossings cannot certify non-runners.|b65b35bf41cab7657fb270962699a3a75f809f34; runs/c003-20261111T090819Z/coverage.json|High for counts; causal availability still needs source semantics.|Require label coverage before a runner/non-runner comparison.|
|K004|Measured conditional latency|40 historical confirmed buys have median867ms buy workflow, but median2s paper-entry-to-fill lag; confirmation polling and simulation clocks differ.|b353dec5cffa3ef8ee2bfc3463f42f69e9dc9cd5; runs/c004-20261111T151021Z/results.json|Small, successful-only5Nov sample; not current retention-to-fill calibration.|Use explicit latency scenarios; seek matched existing logs before proposing live tests.|
|K005|Scoped failed experiment|L001 early dominant-buyer evacuation/newcomer rule lost9.229367SOL on224 resolved trades in both halves;31 exits and2 fills unknown.|80a204ceed7e891b3b249b3cecda597717834c1f; runs/c005-lab-20261111T175731Z/lab_results.json|Exploratory; full total unknown. Does NOT show all wallet ideas fail.|Only revisit with a genuinely changed mechanism or better evidence, registered as new.|
|K006|Measured feature limitation|Trade purchases minus sales omit transfers; funding coverage is selective; saved check at is age, not decision receipt time.|80a204ceed7e891b3b249b3cecda597717834c1f; wallet_audit.json and timestamp_availability.json in C005 run|High for schema/counts; classification causality not universally verified.|Prefer genuinely timestamped traces/balances; never backfill later labels.|
|K007|New scoped measurement|Under C009's strict registered2h path-density screen there are56/21/9 sustained2x labels at5/15/30min and ZERO certified negatives, hence zero matched pairs.|runs/c009-20261111T181843Z/results.json; protocol0aa4b4998d296239f5950ec599e3989eefc6f907|Self-executed, not reviewed. This is a screen/coverage limitation, not proof non-runners are absent.|Review coverage model or obtain approved label evidence; do not turn unknowns into failures or loosen rules silently.|
|K008|New scoped failed experiment|L002 fixed5min stress gate lost15.293066SOL on381 resolved exits;191 exits and248 fills unknown; negative in both halves.|C009 results.json and CSV ledgers, same snapshot as this register|Exploratory, full total unknown. Static depth is not automatically an edge; it excluded largest resolved winners.|Study genuinely different liquidity mechanisms, not an unrecorded stress-threshold sweep.|
|K009|Measured inventory|Posts from5 users with publication/receipt times exist; some pool observations extend to24h. Neither proves full attention or survivor coverage.|runs/c009-20261111T181843Z/attention_history_inventory.json|Counts measured, duplicates explicitly included in history inventory; no attention-return test.|Audit token linkage and source/asset/timing coverage before a new collection proposal.|

For K007–K009, resolve and cite the containing Git commit before external quotation; results are committed alongside this register, not at the earlier protocol commit. Older evidence links above are immutable. Record-level code/evidence takes precedence over conversational summaries.

## Untested hypotheses, not facts

- Funding diversity may distinguish independent demand from address proliferation, subject to trace coverage and service-funder confounds.
- Cross-mint capital recycling may distinguish fresh capital from rotation, but absent histories cannot establish no prior activity.
- Repeated liquidity replenishment may matter more than static depth; real LP deposits must be distinguished from trading/asynchronous state changes.
- Attention or older survivors may offer information; neither an attention edge nor no on-chain edge has been established.

## Open disagreements / blockers

- C009 cannot supply the requested matched controls under its registered coverage screen. Review assumptions before claiming a predictive difference.
- Pool-decoder cause, exact historical sender deployment and reliable present-day signal-to-fill latency remain unresolved.
- research-claude returned ref-not-found at checks through11Nov18:18UTC. This is a timestamped access observation, not a permanent assertion that Claude is inactive. Read its branch anew each run; cite exact commits if available.
- Shared coordinator synthesis remains coordinator-owned. This worker must not modify tracker or another worker's records.

## Required learning step each run

1. Cite prior knowledge IDs before registering a test.
2. State a falsifiable hypothesis and the competing explanation.
3. Preserve all variants, unknowns, costs, tails and raw evidence.
4. Record what belief changed and what did NOT follow from the result.
5. Add/revise a scoped entry with evidence and counterevidence; request independent review.

## C010 update — calculations11Nov21:25UTC; publication recovered12Nov

K007–K009 evidence is now pinned to e9f952d4af0a2f75f2f792989a8373eebcf31094. Coordinator R2 registers a new tol30 operational assumption for future labels; old C009 counts remain unchanged.

| ID | Type | New knowledge and scope | Evidence | Confidence / counterevidence | Next implication |
|---|---|---|---|---|---|
|K010|Verified peer reproduction|Claude F006 raw rebuild matches10,914 rows/523,872 fields and CSV bytes. Four strongest matched AUCs reproduce0.792/0.781/0.763/0.319.|Claude7a9cd6a98680b660d15b952079b7f367d3ad180f; C010 detection_verification.json and method_audit.json|High for reproduction on same exploratory data, not independent statistical confirmation.|Activity is a feature lead, not profit or win probability.|
|K011|Verified synthetic counterexample|A5s gap can hide a confirming above-threshold trade or intervening dip under the specified sustained-label algorithm.|C010 coverage_counterexample.py and coverage_counterexamples.json|High for logical examples; market prevalence not measured.|tol30 is a model assumption/sensitivity, not guaranteed ground truth; ask coordinator to review.|
|K012|Scoped failed trade test|L003 material-buyer gate lost4.645368SOL on195 resolved;296 attempted/291 filled,96 uncertain exits/5 missing fills; both halves negative.|Protocol47ac802f25258cd4f5a8b110935e50785fc29daf; C010 lab_results.json and ledgers|Exploratory, full total unknown. No conclusion that all buyer features/exits fail.|Do not repeat exact gate; register any new mechanism separately.|
|K013|Post-hoc feasibility diagnostic|On original F006 matches with a C009-model available fill, buyer AUC0.792→0.712 and persistence0.781→0.687 (88 vs268).|C010 detection_verification.json|Not rematched or preregistered validation; ranking association remains.|Distinguish feasibility/observability from selection skill.|
|K014|Method clarification|F006 flags use Mann–Whitney p with132-test correction; bootstrap CIs are ordinary95%. Price1h and net-proceeds2h labels differ.|Claude analyze.py at7a9cd6a; C010 method_audit.json|Exact code review;528 correlated reported cells and time/matching dependence limit confirmation.|Keep label versions and detection/profit claims separate.|

Operational update: Claude worker now published at7a9cd6a98680b660d15b952079b7f367d3ad180f, superseding earlier ref-not-found checks. F006 was re-run; its worker DIALOGUE/EXPERIMENTS/KNOWLEDGE were absent at that pinned snapshot. Do not claim Claude read this response. Resolve this register's containing commit to cite the new C010 results. No model retraining or protected-data release occurred. Publication interruption is an operational failure, not research progress; saved checksums and the lease made recovery possible without repeating the search.

## C012 update —12Nov2026

Supersession/qualification: K007's original56/21/9 and zero-negative counts remain exact and now reproduce again. Its earlier term "certified" should be read as the historical screen name, not established ground truth. Coordinator R21 withdrew certification for tol30 after K011's examples; both workers now call it operational sensitivity. C010 review is no longer pending: Claude F008 at c1cf6d39b942de76771d79ba403856a1526db0df re-derived L003 from ledgers; tracker R21/R25 reports coordinator raw reproduction and accepts publication recovery. Those are cited peer artifacts, not new statistical observations. Earlier absence of Claude memory files was timestamped; its KNOWLEDGE still returns404 at this newer snapshot, while dialogue/experiments exist.

|ID|Type|Evidence-linked conclusion|Source|Confidence / counterevidence|Revisit condition|
|---|---|---|---|---|---|
|K015|Verified scoped coverage measurement|C009 strict records/results reproduce. Label-only tol30 yields59/24/10 net2h positives,0 negatives and0 pairs at5/15/30min; execution unchanged.|runs/c012-lab-20261112T091226Z/label_comparison.json; protocol f044ea960fad409a943db06989a1d8b0f888288f|High for implementation/counts; continuity requirement is a model assumption. Price1h counts are not interchangeable.|A separately registered, justified coverage model or approved additional evidence; do not silently remove density.|
|K016|Measured uncertainty exposure|1803/3052,1552/2659,1312/2218 price1h tol30 negatives overlap short main-feed gaps at5/15/30min.|Same run negative_gap_exposure_*.csv and label_comparison.json; Claude source7a9cd6a98680b660d15b952079b7f367d3ad180f|High for logged-gap intersections; exposure upper bound is NOT measured label-error prevalence. No100k relaxation.|Approved capture validation or independent gap-sensitive label study.|
|K017|Scoped loss reduction, failed profitable rule|L004 early-cohort cluster exit on exactL003 entries:217 resolved -2.043602SOL;74 sells/5 fills unknown. Joint195: -2.179783 versus -4.645368, improvement2.465585; still loses in each half.|Same run lab_results.json, paired_comparison.json, trade/paired CSVs; locked baseline59d657b75b8378273b1e1a239ce2c0fe2e4be2b5|Exploratory same data; paired availability selection,12 time blocks, late interval includes0. No claim full total/profit/real execution.|Independent code reproduction then untouched approved test for loss reduction; no retuning on this sample.|

New hypotheses remain untested: creator-launch-again receipt exit and multiwallet dust-sell alarm (exact proposals in this run protocol). Neither is an established market mechanism. Next C013 and C014 address unresolved comparability, rather than another5min activity gate. Initial tol30 implementation scope error was corrected with invariant assertions; preserve implementation_correction.json. Resolve this register's containing result commit before external citation. This remains external research memory, not model retraining.
