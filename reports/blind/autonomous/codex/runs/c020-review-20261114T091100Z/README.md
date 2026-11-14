# C020 — F016 counts reproduce; final development-window review complete

Review scope91cc5de93d6c7e1984824a44006227cb095e68c1; queue trackerb53915dca079e2939c9ed730f249971208ce3bdc R96/R99/R101/R102. Immutable source reviewed: Claude F016 at253604de64fc9b2b43effa44b245f1323c4f4201, original protocol323c1e6b231e2bb84d67039079ef4c3bda23d8e1. Latest Claude branch read1dbf1d12ef0db4f7c8199f858e6a424da9a8d1d6. Previous Codex1258475b7ed298ec33264abd530fd94a25477cdf. No outcome file, trade ledger, return or strategy verdict was computed/read by this review. Historical root memory was read as instructed; analysis inputs are feature/count records only.

## Executed reproduction

Ran testability_f016.py UNCHANGED on raw allowlisted entry-all e67833121f1da0dc992c28fa26c5236a855c151a, frozen evaluate.pybe9b5459e2f7670946d9ca012f875b77aaaf5d5b (SHAf5686511…), six-outage replay unchanged. All16raw-data checksums pass. Six peer source/input hashes match the immutable F016manifest. This is actual executed code, not acceptance of a report.

- results.json:481/481leaf values exact.
- f016_features.csv:166975bytes,byte-identical to the decompressed published gzip;679rows,27columns; SHA256bfee5fa64f9b58708b4a047c2b37e7773eb78cc5ed5fec9591e1d2890fd71408.
- Independent raw implementation imports no peer feature/statistical helper. All679mints and18333fields match within the declared1e-12tolerance; maximum absolute numeric difference8.88e-16;0veto/validity/unknown differences. Both halves and all F009cell counts agree.
- Independent creation-clock distributions match all60bins over62789census launches,3638common launches and679Elaunches. Census :00±2s bin5068,chi-square63.36745/59df; these are descriptive counts, not profitability evidence. Creation-slot timestamp check agrees3630/3630block-time matches,8without a creation-slot row.

## The six historical definitions

| Feature | Defined / unknown | Veto | Direction and minimum |
|---|---:|---:|---|
| Price drift |675 / 4|210|ratio<1|
| Re-buyer share, historical block clock |679 / 0|140|share<0.25;adding is the good side|
| Arrival regularity |596 / 83|0|CV<0.5;at least10buys|
| Sell/buy SOL share |679 / 0|600|sellSOL/buySOL>=0.5|
| Outside buy-size escalation |678 / 1|104|Spearmanrho<=−0.5;last10outsidebuys|
| Creation clock |679 / 0|68|secondsmod60in{58,59,0,1,2}|

These are held-proposal support counts, not six trading experiments. Unknowns remain separate from defined non-veto cases. All original thresholds/directions and minimum-n requirements match the protocol as clarified by R96; no alternate threshold or new feature was fitted.

## Clock interpretation, explicitly resolved

The F016prose initially says received last60s and identifies W with frozen buyers_last_60s. The historical code uses BLOCKtimestamp within the already-received prefix for W and its before-window set, exactly matching frozen rules_common. R96accepted that as clarification. Reproduction preserves it; it is not silently reinterpreted as receipt time.

I independently recalculated the already-ordered receipt-clock diagnostic, with the same0.25direction:147/679vetoes versus140/679block-time. Cross-tab:137both,3block-only,10receipt-only,529neither;666/679agree. All underlying rows are received by the300sdecision. This reproduces F017's count, but I did not rerun the whole F017review here.

For any RELEASED-window R86(2)protocol, R101names receipt time operative: W=curve-buy wallets received in(t−60,t],adders=also bought at or beforet−60,veto when share<0.25. The block-clock count is reported beside it. Eeligibility itself retains its original block-time definition. This is a prospective wording rule, not a historical data/evaluator repair or a new trading test.

## N5 wording decision under R102

Retain the CONSERVATIVE launch-unknown interpretation from C019register.py: if ANY relevant-window foreign pool sell lacks proven quote/decimal evidence, the launch's N5feature is unknown. Do not merely remove that row and call the launch defined. A released-window protocol must state this rule explicitly. The earlier C019prose saying rows were excluded did not fully state the launch-level consequence; this note supersedes that wording prospectively, with no edit to C019code,counts or closed artifacts. F017reports11E signals under either reading, so no signal was chosen by this decision. C019's12unproven-pool cases remain unknown.

## Limits and stopping state

Reproduction verifies saved-data arithmetic and definitions, not independent statistical confirmation or profit. No size,fees,exit,migration or evaluator assumptions were changed. No dummy-trade run was allowed: R91closes development strategy tests and C020is counts-only. Three new held required-data hypotheses N10authority-state eligibility,N11fee-budget-elastic sizing and N12verified service-payout-batch dependency are recorded only in REVIEW_SCOPE/DIALOGUE. No counts or new collection were performed for them. $100Kcrossing detection remains distinct from executable trading.

After this task, STATUS.next_task is exactly 'no task; waiting for a released window (R4 / R5 / R6)' underR99. No new development task or reciprocal review is invented. The coordinator reproduces C020 itself; Claude has no READY task unless the queue creates one. The frozen Round1export/release and owner cost/allowlist/FX decisions remain open in the queue read. A scheduled wake-up does not itself release data or permit new scoring.

## Reproduce / artifact layout

commands.sh gives the executed order. prepare_public.py reads public immutable GitHub metadata and the pinned COUNT-ONLYcompressed feature table; the default sandbox network request failed and the approved same-destination retry succeeded. No credentials or data-provider/chain/model APIcalls were used. No runtime/research discrepancy occurred. Source/helper/protocol files are preserved unchanged under peer_f016. compare.py verifies the six peer hashes and all comparisons. Lossless CSVparts publish the independent679-row feature table; unchanged peer/rebuilt table can be regenerated byte-for-byte with the source commands and compressed input SHA. Full local intermediates are not duplicated as huge GitHubartifacts. The top-level artifact manifest lists exactly committed run files except itself; the nested peer manifest is an immutable source list, not a claim every peer artifact is mirrored.
