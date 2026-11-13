# C016: saved dev-buy provenance; L008: fixed lag-veto test

Definitions were registered before counts at8ca5b1eeff8f9ed1bf378cf7cfbbee8740166568. Outcome-blind binding counts were then published at22de6f5508aef850fab20d1ca53d6875af91aaaa and appended to the unchanged protocol atfc5119749dac79a800853abd4eab034f64e5138b BEFORE trade scoring. Claim19e79ed7ac02bdf03b0121643c3d452433c8f6d8. Input heads: tracker aea952b9d1e8a8da02a64dde6cb10f246d9061d8; Codex9a9fa3da1ae2c036760ab3fe3d15dbff4df211fa; Claude49477d63fef953aa3398077a7f8100cf465b9f9b. Only the two approved historical datasets were used. No protected data, source outside the C016 file allowance, paid/chain/model calls, production changes or evaluator repairs.

## C016 answer: stability observed, creation-time availability unverified

The two saved fd-watch reads agree numerically on EVERY shared dev_buy_sol value:51,221of51,221. There are no empty-to-populated transitions, no numeric revisions, no formatting-only changes and no missing/nonfinite dev-buy cells in those files. This is evidence of stability between those later reads, NOT proof the field was available at creation. The exact first-write/knowledge-time distribution is UNAVAILABLE, not zero.

|File|Rows|Numeric zeros|Positive values|Missing/nonfinite|
|---|---|---|---|---|
|snapshot3 fd_watch|56,374|29,778|26,596|0|
|current fd_watch|55,225|28,596|26,629|0|
|allowlisted window census|62,789|23,557|39,232|0|

Paired fd-watch population:51,221common mints;5,153snapshot3-only;4,004current-only. These are different populations, not evidence of purchases/losses or deletions of trade histories. Decimal comparison preserves exact recorded values and treats zero as syntactically populated; it does not treat zero as a verified no-purchase observation.

INDEX.md at approved commit0e3be03 identifies the saved read cutoffs as7Nov11:54:21and14:53:26UTC. No record's creation/trace time is later than its reported read cutoff in this audit. Those are read cutoffs, not field-write timestamps or an atomic receipt history. Fields scanned_ts,trace_ts,screened_ts,meta_ts,funded_tsandkoth_ts exist, but none is documented here as dev_buy_sol's own write clock. A lookup's time cannot be substituted for an unrelated field's availability. The task's checked_ts is not a top-level or nested fd-watch key.

The nested checks column was inspected, not assumed empty or numeric. It contains JSON arrays:8,592/8,574nonempty mint rows and18,771/18,844check objects in snapshot3/current. They carry dev_buy on18,715/18,782objects and relative nominal at values60–120, but NO actual checked_ts/observed_ts/recv_ms or dev-buy-specific write time. A checkpoint's dev_buy is not automatically the same semantic field as top-level dev_buy_sol. Nominal age plus creation time must not be used as an actual observation or first-write timestamp. Nested positive dev_buy coexists with top-level zero on1,844/1,841mints; that reinforces the need to distinguish fields and semantics.

## Important cross-table discrepancy

|Join|Overlapping mints|Equal numeric dev-buy values|Different numeric values|
|---|---|---|---|
|snapshot3 watch vs window census|44,217|38,394|5,823|
|current watch vs window census|48,221|41,649|6,572|

Every one of the6,572current-watch disagreements is WATCH ZERO / CENSUS POSITIVE. Absolute differences range2e-9to85.005359057SOL; median0.128167520SOL,p95=4SOL;6,536exceed1e-6SOL. Thus this is not solely formatting or tiny rounding. Of these6,572mints,5,823also appear in snapshot3, where their watch value is likewise zero. All6,572record-level comparisons are published in cross_table_differences_*.csv; unchanged watch comparisons have complete-set canonical fingerprints in provenance_results.json.

These files alone cannot distinguish a later tracker-field update from different table definitions/population pathways. They DO show that the fields cannot be treated interchangeably and that a zero fd-watch value is not verified evidence of no creator purchase. We do not assert that the census was written late, nor certify it as known at creation. Both conclusions would require provenance not present in the permitted files. F002's dev-buy persistence diagnostic therefore stays POST-HOC; its retention-history findings are separate and were not rescored here.

Input checksums match all three source manifests. Duplicate mint keys were checked rather than overwritten. dev_buy_changes_001.csv is an intentionally empty, header-only watch-revision file:zero changes is a result, not missing output. provenance_results.json contains population counts, exact join categories, timestamp coverage, schema, read-cutoff consistency, unavailable timing distribution and fingerprints. cross_table_audit.json and nested_checks_audit.json supply the additional descriptive checks without trade outcomes.

## Idea Lab: definitions, precheck, then one score

Three hypotheses were fixed before any binding count:

1. H1: skip when the last10received trades' median(receipt time minus recorded event time)>1.0s. It is an infrastructure-data-age hypothesis; block/event timestamps have second granularity, so this is NOT pure wire latency.
2. H2: quarantine entries for180safter a logged main-feed gap reopens. Only reopenings already known by decision qualify; no future end time is used. Not run this round.
3. H3: skip when at least50%of recent non-creator buyers have bought at least3other tracked mints within the prior300receipt-seconds. This is an unconventional serial-buyer cohort hypothesis, not later rebuilt farm labels, proof of funding or common ownership. Not run this round.

Predeclared priority H1→H2→H3 stops at the first condition removing5%–95%with all features available. The precheck did NOT read a P&L/exit ledger; the296control identities came from the prior outcome-free quote_features.csv. It read only receipt-known raw features at the locked decisions. H1removes51/296(17.2297%),retains245,and has0unknown features. H2/H3were left NOT RUN, not rejected. The count, fixed rule and per-mint features were published BEFORE any new trade scoring. No threshold, statistic, window or priority changed after counts or outcomes. This is a first formal test of the R69-eligible lag mechanism, not a retune of L006's received-vs-chain-order equality.

One new candidate plus one locked L003baseline=2scored specifications. Same eligibility and decision times,0.2SOL,+1sbuy,+0.7ssale,125bpscurve/55bpspool,.0015SOLfixed,recorded reserve impact,30%trail on net sellable proceeds with fill-state high,decision+2hcap,landing state<=30sold,and original validity/retention/completed-curve/capture checks. No exit change. Every recomputed lag and veto matches the precheck; original baseline5,663record fields reproduce exactly.

## L008 results: inconclusive support, negative retained performance

|H1retained arm|Attempted /filled /resolved|Unavailable fills /uncertain exits|Observed net SOL|Mean /median return|Win /loss>50%|Without best1 /best3 SOL|
|---|---|---|---|---|---|---|
|Early|121 /120 /84|1 /36|-2.989971|-17.80% /-25.29%|17.86% /9.52%|-3.234123 /-3.579616|
|Late|124 /124 /84|0 /40|-1.514176|-9.01% /-23.05%|23.81% /2.38%|-1.837444 /-2.429888|
|All|245 /244 /168|1 /76|-4.504147|-13.41% /-24.07%|20.83% /5.95%|-4.827414 /-5.419858|

The51removed baseline opportunities have47modeled fills,27resolved,-0.141222SOL,4missing fills and20uncertain exits. Their mean/median resolved net is-0.005230/-0.015115SOL (mean return-2.62%),win37.04%,none losing>50%. The retained mean is-0.026810SOL:kept-minus-removed difference-0.021580SOLper resolved trade, opposite the proposed direction in both halves. But27removed resolutions are below the registered30per-side floor, so verdict INCONCLUSIVE for the mechanism. There is no bootstrap/significance rescue, no threshold lowering and no fallback choice after seeing this. Retained performance is a negative point total in both halves; full total remains unknown.

The old baseline has296attempts,291fills,195resolved,-4.645368SOL,96uncertain exits and5missing fills. Comparing its total to the smaller retained total is NOT a comparable loss-reduction estimate. Removed unknown baseline outcomes remain unknown, not known losses/zero returns. Under the candidate they are intentional pre-entry vetoes, not lost trades.

R11paired view:168jointly resolved retained mints, candidate and baseline EXACTLY identical(-4.504147SOL;difference0). Candidate-only resolved count0,baseline-only resolved27. R63statement:the true baseline exit on candidate-only resolved launches would be unknown and last usable marks do not identify its sign; here there are zero such launches. Full metrics preserve the different unknown denominators. Mean/median retained net -0.026810/-0.048147SOL; observed net per3638eligible launches-0.001238083SOL. All winners count and best-mint removal is a stress test, not a verdict criterion.

exposure.json supplies both halves and all arms. Modeled peak stake is3.0SOLretained versus3.6SOLbaseline; independent unlimited capital, historical own impact not persistent, and unresolved positions may remain open longer. The inherited unknown-zero/full-stake fields in lab_results.json are explicit hypothetical imputation scenarios, not known P&L or confidence bounds. No live fill is proved by this replay.

## Peer response and persistent memory

Read Claude F004/CK14–CK16 at49477d63fef953aa3398077a7f8100cf465b9f9b, not independently rerun in this task. Its causal-screen warning is important: a whole-tape length/trade-count screen cannot be applied before that information exists. R66also clarifies that the9–29sfigures are entry-definition differences, not actual trigger receipt lag; the latter is about0.8smedian/1.2–1.4sp90in that report. L008uses its own precisely defined per-row lag proxy, not those conflated summary figures. No mixed/protected study table was read here.

K027records saved stability plus unresolved write/knowledge time; K028the zero-versus-positive cross-table incompatibility; K029the fixed lag-veto result and inadequate removed-side support. R63context must accompany reuse of old paired gains:original L004has22candidate-only resolutions,F010has27,L005has0,F011has0; true missing baseline exits stay unknown and last usable marks do not identify their sign. Nothing from C016updates a frozen evaluator, hidden score or held candidate.

Next requested step is F012's queued independent C016 reproduction. Codex should read that review when available and, if the queue adds no ready work, register the still-untested H2reconnect precheck as a separate bounded run. No held-candidate evaluation occurs without the recorded release. No owner approval is inferred from elapsed time or report agreement.

## Reproduce

commands.sh gives the actual sequence. The approved package/index/manifests and three CSVs are sufficient for C016; no tracker source is read. The nested-check audit distinguishes nominal at from actual knowledge time. The financial replay uses existing C001cache/evaluator/six-interval ledger and the unchanged C010L003script; large prior trade_ledger.json can be regenerated if absent. precheck.py uses only C014's outcome-free quote-feature identity file and raw prefix data; its fixed priority and first passing result are explicit. Run precheck.py before make_lab.py/lab.py, and never replace the committed counts with a new threshold.

All16trading-data checksums also pass. Published CSVpartitions preserve every trade and all6,572cross-table disagreements; full unchanged-watch comparisons are reproducible from raw inputs with canonical hashes. ARTIFACT_SHA256SUMS.txt covers exactly published run files other than itself. No missing logs, raw data, protected identifiers or files outside this worker's folder are published.
