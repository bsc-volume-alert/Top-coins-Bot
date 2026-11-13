# C018: first-slot creator purchase size does not support a profitable filter

One threshold and direction were registered before counts: skip E entries when the creator's tape-derived first-slot purchase is **at least 5 SOL**. Inputs: tracker a882aacf2427fc75fbef2de4d413386bf363aac1, previous Codex9aa269669121c22b9bb280af508d19ec02dc41bf, Claudea27c504dfe240fecf132123bcfc5c18cb2dd4091. Definitions6415850; counts58430ca; protocol supplement02dc18b, all before financial scoring. Raw records only from the two owner-allowlisted development commits. Same explored window, not a fresh test.

## What was tested

The rule removes74 of679 E opportunities (10.9%), retaining605; no first-slot feature is unknown at the300-second decision. Early32/313 removed; late42/366. CellsA/B/C remove0/10/64 of251/122/306. R54 passes. The creator purchase is summed from deduplicated curve buys by the census creator in the lowest recorded curve slot, only if all first-slot rows were received by decision. Late/missing evidence would be unknown, never zero or a later slot. All679 tape amounts match the census within1e-6SOL descriptively; the census dev-buy field itself is never the entry input. Earliest recorded slot is not proof of complete blockchain creation evidence.

Hypothesis: a large initial creator position makes later adverse exits more likely. Alternative: large purchases sometimes represent committed inventory or an early sell that the market absorbs. One fixed5SOL threshold, one new candidate, one unchanged E baseline, no combinations or sweep. No automatic opposite rule is inferred.

## R4 scenario and actual accounting

0.2SOL per position; buy lands1s after decision, sell lands0.7s after trigger; curve125bps/pool55bps;0.0015SOL fixed;30% trail on sellable proceeds;2-hour cap; landing state older30s unavailable. Original E/evaluator receipt-time, retention, gap, pool/quote/decimal and high-initialization conventions are preserved. The frozen high starts at the first valid received post-fill observation; this is the E control, not C010's fill-state-high convention. No historical assumptions repaired. Unlimited independent positions, no persistent market impact; fees and delays remain scenarios, not live proof.

| Group | Attempted | Filled after freshness screen | Fill unavailable | Exit uncertain | Resolved | Observed net SOL |
|---|---:|---:|---:|---:|---:|---:|
| Kept candidate |605|590|15|223|367|−8.313168|
| Removed complement |74|73|1|21|52|−1.698404|
| Unchanged E control |679|663|16|244|419|−10.011572|

The peer's raw filled count includes stale fills. Here the30-second screen applies before deciding whether an uncertain position actually has an available fill:10 candidate positions are both stale at fill and exit-unknown, plus5 scored positions stale at fill, giving15 unavailable fills. Thus223 uncertain exits +15 unavailable fills =238 unknown outcomes. These are NOT losses, abstentions or zeros. The full strategy total is unknown.

Candidate mean/median resolved P&L −0.022652/−0.048052SOL (−11.33%/−24.03%); win23.98%; losses greater than50%11.44% (42trades); worst−0.193125SOL. Without best1/3:−9.689123/−10.694714SOL. Observed net per common eligible launch−0.00228509SOL (3638denominator), excluding the separately counted unknowns. All legitimate winners count. Peak modeled stake8.2SOL;346858.93stake-seconds; median resolved hold131.18s. Unknown positions may remain exposed beyond modeled endpoints, so this is not an enforced capital limit.

Fixed early/later results:170resolved/−6.229661 and197/−2.083507SOL; fills274/316, unavailable7/8, uncertain exits104/119. Removed side has27/25 resolutions, so half-specific benefit intervals are not estimated under the30-per-side floor. All candidate cells remain negative: A166/−4.820931, B69/−0.160782, C132/−3.331455. Full mean/median, severe-loss, best1/3 and unknown counts for each half/cell are in results.json.

Kept-minus-removed mean net P&L +0.010010SOL, iid95% interval[−0.016033,+0.034153]. Deep-loss-share difference +1.83percentage points (kept worse), interval[−7.23,+9.78]. Neither excludes zero. Among already-sold creators (cellC), kept deep-loss share14.39% versus removed2.13%, an exploratory difference opposite the hypothesis; cellB's removed side has only5resolutions. These are registered descriptive cells, not new strategies or independent confirmations. Multiple historical searches and time/operator dependence make the iid intervals exploratory.

R11: all367 jointly resolved candidate/control outcomes are identical; paired difference0. Candidate-only resolved0; control-only52. True baseline exit on candidate-only launches would be unknown; last usable marks do not identify its sign. Different unresolved mixes prohibit ranking raw totals as loss-reduction evidence.

Verdict: **inconclusive as a general loss-avoidance mechanism; failed as a profitable specification on resolved records.** No profitable rule supported and no new threshold authorized. No-best3 is a stress test, not the rejection criterion.

## Frozen S1, peer reproduction and failures

Frozen eval-1.1 main was run unchanged on the exact registered window: common3638, full-fingerprint duplicates1568880, pool30bps and automatic125bps sensitivity, K=2modules in this invocation. S1 candidate429scored/176unknown/−10.391273SOL, control484/195/−11.814859; neither scorable nor supported. Its artificial unknown penalties are not realized losses; K=2 does not correct all earlier searches. S1 is kept separate from the R4 freshness/pool55bps scenario.

I executed Claude's F014 precheck unchanged and reproduced178/178leaf values. The new E execution control matches3638original peer ledger rows across58208compared fields plus3638eligibility flags, not merely reported totals. Source and peer-ledger hashes match its immutable manifest. This independently verifies the control used here; it is not a full reproduction of every F014 strategy result. C017's review was accepted by coordinator R78/R79 and confirmed by Claude F014, so no additional C017 rerun was needed.

FAILURES.md records one incorrect S1 CLI date invocation, stopped and excluded; no numbers from it were used. The corrected invocation's bounds are machine-checked. Only allowlisted raw files existed in both invocations; no protected exports were read. It also records the sandbox public-GitHub network failure and approved same-destination retry. No new strategy variant came from either operational correction.

## Reproduce

commands.sh uses existing C001approved cache. precheck.py precedes scoring; peer_f014 source files are immutable/hash-verified. make_run.py copies retained()/run_eval() verbatim from run_f014.py and adds only score_body.py, which recomputes the creator feature causally and asserts exact equality with the published precheck. analyze.py compares record-level controls and normalizes unavailable fills before exits. validate.py checks178peer leaves, input hashes, accounting partitions, exact S1bounds and causal feature receipts. partition_records.py publishes all679control,605candidate,74removed records and679feature records in lossless CSVparts. Full intermediate7276-row ledger is locally reconstructible, not duplicated as a huge artifact.

Three new N4–N6 proposals are recorded for review and explicitly released data only. No additional experiment was run. Next: F015cross-review and coordinator ruling underR81/R86 on closure of the development-window Idea Lab. No protected-data release, purchases, provider/model/blockchain calls or production changes occurred.
