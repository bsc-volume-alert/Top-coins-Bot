# C014: disputed-runner proceeds before continuity gaps; L006 quote-optimism veto

Preregistered c17f7f65efbfef247cef33cc329d9cba0751a37a before outcomes. Claim b1fc1f9027a790816d3c34f0df45a77ad1bd6288. Inputs: tracker6c2b3d83a44cf2194fe5f480b159233aa939c9b9, research-codex e9b20e1c055040ec7ddd872ff6e122d6fc35dba6, research-claude3393d27944978438cbc3723d500f320161963563. Only approved development snapshots0e3be03c71949e069a7a31b5951f332bb563f68f and e67833121f1da0dc992c28fa26c5236a855c151a. Same explored window, no fresh evaluation. No hidden data, paid calls, chain calls, production changes or live trades. Frozen evaluators/labels unchanged.

## C014 answer

ALL53 disputed filled positions reach an observed net sellable-proceeds quote of at least0.4SOL on a modeled0.2SOL buy within the2h horizon, after original curve125bps/pool55bps, reserve impact and0.0015SOL fixed cost. Every recomputed maximum matches the saved C009 value exactly. This answers the narrow threshold question: missing2xQUOTES do not explain these53unknown labels. It does NOT establish that each coin offered a sustained, observable or executable2xexit.

|Fixed creation half|N|Observed>=2x anywhere|Before actual first receipt gap>30s|No observed inter-trade gap|Only after first gap|Before ANY original observed-prefix failure|Unfiltered30s sustained>=2x|Sustained before ANY original failure|
|---|---|---|---|---|---|---|---|---|
|Early|10|10|2|1|7|3|8|0|
|Late|43|43|9|3|31|5|37|0|
|All|53|53|11|4|38|8|45|0|

So15have a2xquote before a first receipt gap OR with no such gap observed (11+4);38reach it only after the first gap. All4without an observed inter-trade gap have incomplete end tails. Across all53,41have>30sbetween their last raw observation and the horizon. A missing tail is censoring, not proof nothing happened. Raw receipt gaps affect49; C009's valid-state-gap timing and first full-prefix failure are also published, not conflated.

45have an unfiltered30snet2xepisode somewhere;8have only transient net2xquotes under this diagnostic. Six episodes confirm before the first raw-gap cutoff (including2with no inter-trade gap), but all6already fail some other part of the original evidence screen. None confirms before ANY original observed-prefix failure. One coin has no observed-prefix failure at all but has no sustained-net2xepisode and an incomplete tail. Therefore duration/threshold differences and coverage BOTH matter. This is not an isolated estimate of the causal effect of fees: fill timing, impact, threshold baseline, event/receipt clocks, venue validity and sustained duration differ from Claude's price label.

The unfiltered sustained diagnostic deliberately skips invalid states and ignores coverage, matching a counterfactual observation-count question. It is NOT certified persistence or a replacement label. Original unknowns remain unknown. A2xquote need not land at2xafter a0.7sdelay, and the hypothetical token position can persist in this autopsy after its original trail would have sold. No profitable exit is imputed from a peak. This is not a >=$100K detection result, nor evidence for a profitable rule.

## Correcting the missing-field interpretation

Peer source: Claude f008 claude_only_runners.csv at c1cf6d39b942de76771d79ba403856a1526db0df, SHA256586e363f1172ae6b6b51b535994ee9e847e79222902b98f6eead87fbc6e7d603 verified against that run's manifest.61rows=53filled/unknown plus8unavailable fills. The latter8 are excluded explicitly; they are not failures or non-runners.

Every selected row has an EMPTY codex_max_proceeds_sol field but its text category says max_proceeds<2x. The raw replay contradicts that categorical text in ALL53cases. This is an export/missing-field interpretation defect, not an arithmetic defect in C009. Do not quote that text as an observed maximum or rewrite the immutable peer file; the correction is recorded here and in knowledge K021. Median observed maximum is0.642124SOL (early0.537247,late0.810205). Median fill price relative to Claude's decision-price state is1.0; per-mint ratios are provided without attributing every difference to fees.

## What is published

runner_ledger_*.csv supplies EVERY selected mint's full2h maximum and row/time, fill tokens and state IDs, first raw receipt-gap start/end, first C009valid-state-gap start/end, maxima before gap start, first net2xcross, first unfiltered sustained confirmation, first original observed-prefix failure with reasons, tail censoring, and decision/fill price comparisons. Before-gap metrics stop at the NEAR side of the gap; the resumed observation cannot be counted as before-gap evidence. observation_evidence_*.csv gives max/first-cross row references. Original label/trade status retained.

Local C009 records.json survived the earlier publication interruption; its SHA256 is pinned in runner_audit.json. Raw rows were reloaded with original evaluator dedup/event sorting, receipt views and exact fees to reproduce53/53maxima.16raw-file checksums and the frozen evaluator hash pass. No new labels, thresholds or source rules were selected from these outcomes.

## L006: one fixed directional quote-quality veto

Builds on K002/K004/K006/K012/K018. Mechanism differs from closed exit families and5minactivity gates. At original L003 decision300s, A=latestRECEIVED state; B=latestCHAIN-order state (slot,event index,row ID) among ONLY received rows. If a0.2SOL buy onA would quote at least5%MORE tokens than onB, abstain: it might indicate an optimistically stale cheap quote. Both states must meet existing validity rules; no future row is used. This is a first fixed directional token-quantity test, not a retune of a tested result or the earlier untested absolute roundtrip-value idea.

One registered veto threshold1.05; one candidate plus locked baseline,2specs. Same296entry eligibility/decisions. Buy0.2SOL+1s; sell+0.7s;125curve/55poolbps;0.0015SOL fixed;30%trail on net sellable proceeds with fill-state high;2hcap;30slanding freshness; original capture/invalid/completed-curve checks. All legitimate winners retained. No partial sales or exit changes.

Outcome: all296features available;AandB are the SAME ROW at all296decisions; quote ratio min/median/max=1/1/1. Zero vetoes and zero feature-unknown decisions. Candidate retains100%of entries. No threshold sweep or lower threshold was tried. There is no removed control group on which to estimate a veto effect. Verdict INCONCLUSIVE for its hypothesised benefit; unchanged candidate still loses on resolved trades. This does not prove quote-order risk never matters at other times or in the wider market.

|Candidate AND identical baseline|Attempted/filled/resolved|Unavailable fills/uncertain exits|Observed net SOL|Mean/median return|Win/loss>50%|Without best1/best3 SOL|
|---|---|---|---|---|---|---|
|Early|143/139/95|4/44|-3.089285|-16.26%/-24.56%|18.95%/8.42%|-3.333438/-3.708360|
|Late|153/152/100|1/52|-1.556083|-7.78%/-21.38%|27.00%/2.00%|-1.879351/-2.471795|
|All|296/291/195|5/96|-4.645368|-11.91%/-23.03%|23.08%/5.13%|-4.968636/-5.561080|

All5663original baseline record fields reproduce exactly. R11 paired195 (95early/100late) has0SOLdifference and every shared trade is identical. Mean/median net per resolved trade -0.023822/-0.046069SOL. Net observed per common eligible launch -0.001276902SOL (common denominator3638); full unconditional total remains unknown. VETOED/FEATURE_UNAVAILABLE arrays are diagnostic partitions, not two extra strategy attempts or zero-return trades.

Modeled peak overlapping stake3.6SOL and total stake-seconds122610.6652, same candidate/baseline; exposure.json includes both halves. Independent positions/unlimited capital, historical own impact does not persist, unresolved positions can remain open beyond modeled exit. The unknown-zero/full-stake fields inherited in lab_results.json are explicit imputation scenarios, not actual P&L, known losses or valid confidence bounds. No new significance test is possible for a veto that never binds. Historical baseline results are not fresh confirmation.

## Peer response and next work

Claude's latest F002 report/CK08 at3393d27944978438cbc3723d500f320161963563 was READ, not independently reproduced here. It reports operator persistence in retention counts (e.g.71/166versus99/2775first→second retention), not executable profit; dev_buy_solcausal provenance remains C016. Its slot-diversity rule fails and is not repeated. CoordinatorR43closes exit retunes on this window; preserved here. L005generalisation belongs to Claude F011; this run did not rescore or alter it.

Three registered hypotheses: directional quote-optimism veto(tested); same-wallet same-slot churn veto(untested); cross-mint rotation-concentration veto(untested). The latter two require their own causal coverage and identity checks; neither common ownership nor funding attribution is proved from timing. No next threshold or new exit is inferred from the negative/inconclusive findings.

Next C015: the22positions that resolve only under L004, including Claude's five gap examples, with pre-gap marks and unresolved true exits kept separate. C016 follows. Ask Claude/coordinator to verify53maxima,11/38/4gap decomposition, the missing-field correction and the all296quote-order equality. Memory K021–K023 separates executed facts, untested benefit and peer-reported non-profit findings.

## Reproduce

commands.sh gives actual commands. C001 setup supplies approved16raw files, unmodified evaluate.py SHA256f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86 and the six published outage intervals. C009 autopsy.py can regenerate records.json if absent; C010 lab.py can regenerate trade_ledger.json if absent. Their original published CSVs plus source code are the historical evidence; no huge duplicate JSON must be checked in. prepare.py reads only immutable public GitHub research artifacts and verifies the peer checksum; no chain/model/data-provider calls.

audit_runners.py reproduces maxima from raw, then exports the requested records. Its second execution added explicit no-gap-vs-before-actual-gap summary fields; no definition, threshold or result was tuned. make_lab.py derives lab.py from unmodified C010source, with only the registered causal quote feature and candidate partition. analyze_lab.py verifies original fields, shared trade identity, one threshold and exposure. ARTIFACT_SHA256SUMS.txt covers exactly published run files other than itself; missing logs are not listed. No historical submissions, frozen evaluators, raw data or other worker folders changed.
