# Autonomous research queue
Created 10 November 2026 by Codex at the owner's direction.

Two registered questions share evidence: (A) profitable entry/exit and loss reduction after costs; (B) subsequent >=$100K runner detection. Migration is a separate outcome. Existing work is the starting point.

## Execution and ownership
Codex is scheduled through Codex Tasks; actual scheduling/run status is shown there, not inferred from this document. Claude and Gemini are NOT activated by this file. A genuine Claude worker requires its own verified execution mechanism.
Codex writes ONLY reports/blind/autonomous/ on research-codex. Never force-push, rewrite tracker, alter bots, workflows, frozen evaluators, raw data or historical submissions.
This queue's ordering is read-only for workers. Claim and completion records belong on each worker's branch. A lease uses a unique run ID, input commit, start and expiry; skip an unexpired lease and reconcile interrupted work before retrying. Use optimistic branch updates and never overwrite concurrent work.
No live trading, purchases, model-provider API loops or new paid data collection. Approved existing files may be analysed without blockchain credits. Do not expose keys. Production and protected outcome storage must not be accessed. These instructions do not establish infrastructure-enforced isolation.

## Dataset boundary
Development initially allowlisted:
- entry-package-7nov @ 0e3be03c71949e069a7a31b5951f332bb563f68f
- entry-all-20261107t2210 @ e67833121f1da0dc992c28fa26c5236a855c151a
Reports/code from blind-fable-r2-8nov and blind-codex-r2-8nov may be reviewed, with full refs recorded.
Do not inspect or develop on 8-10 Nov test outcomes, overlapping 7-8 Nov exports, or later evaluation periods without an explicit recorded release. Inventory their manifests/coverage metadata only if that does not reveal outcomes. The Round 1 MIG300 export and scoring are coordinator jobs, not a discovery worker's fallback.
Do not assume historical coverage from the earliest row or declare snapshots complete without evidence.

## Ordered Codex tasks
| ID | Owner | Initial state | Deliverable |
|---|---|---|---|
| C001 | Codex | READY | Verify execution access; reproduce a published development result using frozen inputs; save commands, code, results and verification. If environment access blocks computation, finish the source/integrity audit and record the exact blocker. |
| C002 | Codex | READY after C001 | Reproduce named instant-graduation artefact and audit the no-entry/buffer counterexample on development/synthetic data. Frozen evaluator unchanged. |
| C003 | Codex | READY | Inventory existing runner/$100K branches and histories; resolve immutable refs, denominators, observation windows, gaps, label/receipt times and actual coverage. No protected outcomes. |
| C004 | Codex | READY | Audit existing decision/send/landing logs and quote shadows for latency calibration. No real trades. |
| C005 | Codex | READY | Audit creator/funder/sniper/farm/holder/GMGN evidence for causal availability and population coverage; propose operator and loss-avoidance experiments using existing records. |
| C006 | Codex | READY after C003 | Register and execute one controlled runner-detection experiment, with non-runners in the denominator, causal features and development-only temporal validation. |
| C007 | Codex | READY after C005 | Register and execute one entry/exit or loss-avoidance experiment with exact sizing, costs, unavailable outcomes and latency scenarios. |
| C008 | Codex | BLOCKED on completed Round 1 scoring and explicit dataset release | Broader regime analysis with features observable before entry, always-on baseline, multiple time blocks and fresh test reserved. |

Finish one bounded task per run. Do not stop after writing a plan. If a task is blocked, record it and attempt another independent ready task. After this list, propose and execute the next documented development experiment; do not repeatedly retest failed rules without new evidence.
Preserve preregistration, all search counts, failures and unknown outcomes. Require independent review before a candidate is described as supported. Never promise profit.

## Output contract
reports/blind/autonomous/codex/STATUS.json — current task/run/lease, input refs, completion/blocker.
reports/blind/autonomous/codex/runs/<unique-run-id>/ — hypothesis, code, commands, results, record-level evidence and limitations.
reports/blind/autonomous/codex/SCOREBOARD.md — all attempts; separate measured results from hypotheses. Include costs, unknowns, mean/median, net SOL per eligible launch, losses/exposure and no-best-mint when relevant.
reports/blind/autonomous/codex/REVIEW_REQUESTS.md — factual requests for Claude/Gemini to pick up when genuinely active; never claim contact or review occurred.
A blocked run still records useful evidence. It must not claim a successful push, execution, enforced isolation or profitability without confirmation.
