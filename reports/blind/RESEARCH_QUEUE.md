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


## Claude worker (activated 11 Nov 2026 16:50 UTC by the coordinator — scheduled task, every 6 h)
Claude writes ONLY reports/blind/autonomous/claude/ on branch research-claude. Same rules as Codex above: never force-push, never touch tracker history, bots, workflows, frozen evaluators, raw data or historical submissions; no live trading, no paid API calls, no protected outcome data; one bounded task per run; a blocked run still records evidence. Same lease/STATUS.json/runs/<id>/SCOREBOARD.md/REVIEW_REQUESTS.md contract as Codex, under the claude/ folder.

| ID | Owner | Initial state | Deliverable |
|---|---|---|---|
| F001 | Claude | READY | Independent review of Codex runs C001–C004 on research-codex: re-run their reproduce scripts from the allowlisted inputs, confirm or dispute every number in their SCOREBOARD rows, answer anything in codex/REVIEW_REQUESTS.md. Record agreement/disagreement per row. |
| F002 | Claude | READY | Operator persistence on development data only: for every creator in the entry-all census with ≥ 2 launches inside 6 Nov 07:40 → 7 Nov 20:00, measure whether the first launch's outcome (retention, peak multiple, time-to-dump) predicts the second's. Knowable-at-time only (creator history as of the second launch's creation). Report with the never-launched-before baseline, counts, and unknowns. No rule search. |
| F003 | Claude | READY after F002 | Loss-avoidance experiment: register ONE filter built from F002/C005 evidence (e.g. "skip creators whose previous launch dumped > X % within Y s") and measure, with eval-1.1 unchanged, how much of the always-on loss at retention+0 s / hold 30 s it removes on each half, with costs, unknowns and no-best-mint. Pre-register the threshold before scoring. |
| F004 | Claude | READY | Reproduce the Claude analyst's 11 Nov early-winners study (branch analysis-fable-11nov) from raw allowlisted data; state what is knowable-at-time and what is not. |
| F005 | Claude | BLOCKED on Round 1 scoring and explicit dataset release | Regime question (same wording as C008), independently of Codex. |

Cross-review rule: a worker may read the other worker's branch at any time; it must cite the exact commit and must not copy conclusions without re-running the numbers.

## Coordinator (scheduled task, every 6 h, offset 3 h from the workers)
Reads research-codex and research-claude; reproduces any row claiming a positive result; checks the output contract was honoured; updates this queue (states, new tasks, releases) and reports/blind/AUTONOMOUS_STATUS.md on tracker with a short plain-English status for the owner; logs to ROUND2_LOG.md. Never runs a discovery task itself.

## Output contract
reports/blind/autonomous/codex/STATUS.json — current task/run/lease, input refs, completion/blocker.
reports/blind/autonomous/codex/runs/<unique-run-id>/ — hypothesis, code, commands, results, record-level evidence and limitations.
reports/blind/autonomous/codex/SCOREBOARD.md — all attempts; separate measured results from hypotheses. Include costs, unknowns, mean/median, net SOL per eligible launch, losses/exposure and no-best-mint when relevant.
reports/blind/autonomous/codex/runs/<unique-run-id>/SUMMARY.txt — five plain-English lines: what was done, what was found, what did not reproduce or is unknown, what is next (added 11 Nov 17:45 UTC for the /research page; Claude's contract already has it).
reports/blind/autonomous/codex/REVIEW_REQUESTS.md — factual requests for Claude/Gemini to pick up when genuinely active; never claim contact or review occurred.
A blocked run still records useful evidence. It must not claim a successful push, execution, enforced isolation or profitability without confirmation.

## Runner autopsy (owner, via Codex review, 11 Nov 2026 18:17 UK) — PRIORITY: the next queue task for each worker after its current run
Question: what changed BEFORE a sustained run, and could we have acted on it? Development data only (allowlist above); coverage checked per period and venue first (curve capture is limited; newer pool capture can extend to 24 h). Compare runners with MATCHED non-runners at the SAME observation age (5, 15 and 30 min where coverage permits). Keep coins whose outcome cannot be established as their own group — never as non-runners. A retrospective winner list generates hypotheses only; it cannot establish predictive performance. Hypotheses found here are judged later on untouched data, not on the data that produced them.
For every apparent distinction, test BOTH: (1) Detection — does it predict a later ≥ $100K crossing or a sustained multiple? (2) Trading — does a precisely specified entry and exit capture net profit after costs (Idea lab cost/latency rules)?
Already in memory: the early-whale-exit specification lost on resolved trades; that does not eliminate other ownership or buyer-cohort mechanisms.

| ID | Owner | State | Deliverable |
|---|---|---|---|
| F006 | Claude | READY (priority) | Autopsy A — buyer and ownership behaviour: did genuinely new demand arrive (first-time buyers, repeat participants, purchase sizes, persistent inflow)? did concentrated inventory become safer (early-buyer selling, creator selling, concentration, verified balances where available)? was apparent demand coordinated (funding links, recurring wallet groups, using only classifications available at the time)? |
| C009 | Codex | READY (priority) | Autopsy B — liquidity, execution and failure: did liquidity improve (curve progress, migration, pool depth, price impact)? was the opportunity executable (delayed entry, sellable proceeds, fees, one-block drains, uncertain exits)? how do failures differ from runners at the same age? |
| F007 | Claude | READY after C009 | Reproduce Codex's strongest C009 finding from its run folder; agree or dispute with numbers. |
| C010 | Codex | READY after F006 | Reproduce Claude's strongest F006 finding from its run folder; agree or dispute with numbers. |
| C011 | Codex | READY | Inventory only — no new collection: archived posts/attention records and existing longer pool histories (what exists, coverage, receipt times). Attention data and older survivors are later directions, proposed only from this inventory. |
