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
