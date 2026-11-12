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
| C001 | Codex | DONE (coordinator 11 Nov 21:00 UK: c001 run folder complete; ID34 reproduction accepted on Codex's own 3,638/3,638 match. Independently re-run twice since: Claude F001 (byte-identical) and the coordinator 12 Nov 00:45 UK (reproduce.py from raw, 126/126 fields identical)) | Verify execution access; reproduce a published development result using frozen inputs; save commands, code, results and verification. If environment access blocks computation, finish the source/integrity audit and record the exact blocker. |
| C002 | Codex | DONE (run c002-20261111T031305Z; coordinator spot-check: evaluator sha f5686511… matches, run folder complete) | Reproduce named instant-graduation artefact and audit the no-entry/buffer counterexample on development/synthetic data. Frozen evaluator unchanged. |
| C003 | Codex | DONE (run c003-20261111T090819Z; metadata-only inventory, protected branches unopened) | Inventory existing runner/$100K branches and histories; resolve immutable refs, denominators, observation windows, gaps, label/receipt times and actual coverage. No protected outcomes. |
| C004 | Codex | DONE (run c004-20261111T151021Z) | Audit existing decision/send/landing logs and quote shadows for latency calibration. No real trades. |
| C005 | Codex | DONE (run c005-lab-20261111T175731Z; L001 reproduced exactly by the coordinator 11 Nov 21:00 UK: 257/255/224/31/2, −9.229367 SOL, 171/171 result fields identical) | Audit creator/funder/sniper/farm/holder/GMGN evidence for causal availability and population coverage; propose operator and loss-avoidance experiments using existing records. |
| C006 | Codex | READY after C003 (C003 done) — blocked in practice until a coverage rule yields certified negatives: see C012 | Register and execute one controlled runner-detection experiment, with non-runners in the denominator, causal features and development-only temporal validation. |
| C007 | Codex | READY (C005 done) | Register and execute one entry/exit or loss-avoidance experiment with exact sizing, costs, unavailable outcomes and latency scenarios. |
| C008 | Codex | BLOCKED on completed Round 1 scoring and explicit dataset release | Broader regime analysis with features observable before entry, always-on baseline, multiple time blocks and fresh test reserved. |

Finish one bounded task per run. Do not stop after writing a plan. If a task is blocked, record it and attempt another independent ready task. After this list, propose and execute the next documented development experiment; do not repeatedly retest failed rules without new evidence.
Preserve preregistration, all search counts, failures and unknown outcomes. Require independent review before a candidate is described as supported. Never promise profit.


## Claude worker (activated 11 Nov 2026 16:50 UTC by the coordinator — scheduled task, every 6 h)
Claude writes ONLY reports/blind/autonomous/claude/ on branch research-claude. Same rules as Codex above: never force-push, never touch tracker history, bots, workflows, frozen evaluators, raw data or historical submissions; no live trading, no paid API calls, no protected outcome data; one bounded task per run; a blocked run still records evidence. Same lease/STATUS.json/runs/<id>/SCOREBOARD.md/REVIEW_REQUESTS.md contract as Codex, under the claude/ folder.

| ID | Owner | Initial state | Deliverable |
|---|---|---|---|
| F001 | Claude | DONE (run f001-20261111T225212Z, research-claude @ 5064bec: C001–C004 re-run unmodified, all byte-identical; verdict agree ×4; coordinator 12 Nov 00:45 UK: C001 and the run's Idea-lab CL-L001 reproduced exactly) | Independent review of Codex runs C001–C004 on research-codex: re-run their reproduce scripts from the allowlisted inputs, confirm or dispute every number in their SCOREBOARD rows, answer anything in codex/REVIEW_REQUESTS.md. Record agreement/disagreement per row. |
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
| F006 | Claude | PART 1 DONE (run f006-20261111T185410Z, research-claude @ 7a9cd6a; reproduced exactly by the coordinator 11 Nov 21:00 UK — 11,424/11,424 result fields identical, feature table byte-identical). PART 2 (trading half) READY: one preregistered entry/exit through eval-1.1 unchanged, using the common cost scenario in the coordinator rulings below, both halves, costs, unknowns, no-best-mint | Autopsy A — buyer and ownership behaviour: did genuinely new demand arrive (first-time buyers, repeat participants, purchase sizes, persistent inflow)? did concentrated inventory become safer (early-buyer selling, creator selling, concentration, verified balances where available)? was apparent demand coordinated (funding links, recurring wallet groups, using only classifications available at the time)? |
| C009 | Codex | PARTIAL — trading half done (L002, run c009-20261111T181843Z, reproduced exactly by the coordinator: 820/572/381, −15.293066 SOL, 217/217 fields identical); matched comparison BLOCKED (0 certified negatives under its 2-h path-density rule) → C012 | Autopsy B — liquidity, execution and failure: did liquidity improve (curve progress, migration, pool depth, price impact)? was the opportunity executable (delayed entry, sellable proceeds, fees, one-block drains, uncertain exits)? how do failures differ from runners at the same age? |
| F007 | Claude | READY (C009 published at research-codex @ e9f952d). The coordinator already reproduced L002 exactly; F007 should concentrate on the label-coverage assumptions (why 0 negatives) and the 56/21/9 positives, not on re-running the P&L | Reproduce Codex's strongest C009 finding from its run folder; agree or dispute with numbers. |
| C010 | Codex | CLAIMED (run c010-lab-20261111T211258Z, protocol @ 47ac802, lease 21:13 → 23:13 UTC 11 Nov; no results pushed by 00:35 UTC 12 Nov — lease expired; next Codex run must reconcile per the lease rule before retrying) | Reproduce Claude's strongest F006 finding from its run folder; agree or dispute with numbers. |
| C011 | Codex | DONE (run c009-20261111T181843Z, attention_history_inventory.json) | Inventory only — no new collection: archived posts/attention records and existing longer pool histories (what exists, coverage, receipt times). Attention data and older survivors are later directions, proposed only from this inventory. |

## Coordinator rulings and additions — run 1, 11 Nov 2026 21:00 UK (coordinator = Claude scheduled task)
Everything below answers a worker's REVIEW_REQUESTS or follows from evidence in a run folder. History above is unchanged.

R1 — Ordering (claude/REVIEW_REQUESTS item 4): taking F006 before F001 on the first Claude run was the intended reading of the priority note. F001 next, as declared.

R2 — Coverage rule for sustained-multiple labels (claude item 1; codex C009 "zero negatives"): the two workers used different rules and got 1,249 vs 0 certified negatives at 5 min on the same 3,638 launches. Ruling: for a **sustained-2× label only**, a main-feed gap shorter than 30 s may be ignored (a ≥ 30 s episode cannot sit entirely inside it); outages from OUTAGE_LEDGER.md and gaps ≥ 30 s still make the launch unknown. This is now the **registered standing rule** ("tol30") for both workers from this entry onward; every report still shows the strict-rule result beside it, and it does NOT apply to a $100K-crossing label (one trade can fall inside a short gap). Claude's F006 added tol30 after seeing the unknown count and said so; accepted as a labelled sensitivity for that run, registered going forward.

R3 — $100K label (claude item 3): fixed supply 1e9 is the standard pump.fun assumption and is accepted; decimals must still be verified from the mint wherever eval-1.2 work touches pool prices (C002 caveat). The flat SOL/USD extrapolation after 7 Nov 11:25 UTC (≈ 9.5 h to the last 1-h horizon, SOL ≈ $90) is accepted for diagnostics only; any confirmatory $100K score needs a SOL/USD series covering the whole window from an allowlisted file. The cross100k outcome is **redefined for all further use** as `cross100k-v2 = market cap crosses $100K within the horizon AND price ≥ 2× the state price at t`; the original definition stays reported once beside it.

R4 — Common cost scenario for trading halves (both workers): tracker commit 371bb5a's message says this file gained an "Idea lab", but no such section exists on tracker and the runner-autopsy text above refers to "Idea lab cost/latency rules" that are not written here. Codex's runs (c005 PROTOCOL.md) use: 0.2 SOL per position, one position per mint; buy lands decision + 1 s; sell lands trigger + 0.7 s; 125 bps curve / 55 bps pool fee; 0.0015 SOL fixed per position; recorded-reserve price impact; a state older than 30 s at landing is unavailable; completed curve cannot accept a buy; 30 % trail on sellable proceeds; max hold 2 h; unknowns never scored as zero. Until the owner writes the Idea lab text here, **both workers use exactly this scenario** for any exploratory trading half (F006 part 2 included), separately from the frozen eval-1.1 score, so results are comparable. Owner: please confirm or correct these numbers.

R5 — Codex review requests addressed to Claude: C001–C004 → F001 (unchanged); C009 → F007 (narrowed above); the L001 reproduction request is answered by the coordinator (exact). The request to add `study100k-v1-inputs @ 3bd9c3b` to the development allowlist is an allowlist change = owner release. Fact for the owner: its MANIFEST says its inputs are exports dated 6 Nov 19:14 → 7 Nov 09:26 (before the test window); contents not read by the coordinator.

R6 — Round 1 MIG300 export: no branch on origin (55 checked 11 Nov 20:50 UK) carries a MANIFEST stating launches created 8 Nov 00:00 → 10 Nov 00:00. Partial-window exports exist (entry-all-20261108t2002: 7 Nov 20:00 → 8 Nov 15:00; k100-20261109t1144: 8 Nov 15:00 → 9 Nov 09:00) but neither covers the window and neither is the requested export. ROUND1_RESULT.md cannot be written yet. **Owner decision needed: ask the control room for the Round 1 export** (launches created 8 Nov 00:00 → 10 Nov 00:00 UTC, read after 10 Nov 04:00, with the pm2/deploy-log outage list for OUTAGE_LEDGER.md).

| ID | Owner | State | Deliverable |
|---|---|---|---|
| C012 | Codex | READY (priority after C010) | Re-run the C009 matched autopsy labels under rule R2 (tol30, sustained-2× only), registered here before the run: report positives/negatives/unknowns at 5/15/30 min under both rules, the number of matched pairs obtained, and — if pairs exist — the liquidity/execution comparison C009 was asked for. One bounded question: does a registered 30-s gap tolerance yield certified negatives, and if so do runners differ in depth/impact at the same age? Costs: compute only. Unknown: whether Codex's net-proceeds label and Claude's price label agree on the same launches — report the overlap. |
| F008 | Claude | READY after F001 | Label concordance: on the 3,638-launch denominator, cross-tabulate Claude's sustained2x (price, 1 h) against Codex's C009 sustained2x (net proceeds after costs, 2 h) at 5 min, using each worker's published record-level files (claude f006 features_labels.csv.gz; codex c009 ledgers). One bounded question: how many of Claude's 117 runners are among Codex's 56, and what explains the rest (horizon, fees, fill availability)? No new labels; counts only. |

## Coordinator rulings and additions — run 2, 12 Nov 2026 00:45 UK
Answers to claude/REVIEW_REQUESTS.md items 5–7 (run f001) and to Claude's 23:25 UTC dialogue post; follows from evidence in the run folders. History above unchanged.

R7 — C001 pool-fee scenarios (claude item 5): confirmed by the coordinator from its own re-run of Codex's reproduce.py (actual_ledger.json): all 80 scored ID34 launches × 2 sizes = 160 positions have fill_venue = exit_venue = curve, and the fee-30 and fee-125 records are identical for every one of the 81 non-abstain entries. The pool-fee comparison is therefore not a sensitivity for ID34. Codex: one line in C001's README on the next touch; no new run needed.

R8 — Pool-state units on the C002 jackpot mints (claude item 6): no allowlisted file is known to the coordinator that carries pool account snapshots or decoder test vectors, and no chain access is permitted to workers. Ruling: this is now an **open eval-1.2 question** (recorded here, alongside the bundle-finalisation and t+300.7 points from 8 Nov and the pre-decision buffer unknown): "verify base/quote decimals from the mint and reject a pool state whose implied price exceeds 3× the curve-completion price within 2 h of completion". Workers must not try to settle it with external calls. The owner may release a chain snapshot if he wants it settled sooner.

R9 — F001 closed (claude item 7). Claude's next run is F006 part 2 as declared, then F008.

R10 — L003 control (Claude's dialogue request): Codex's C010 protocol already states the control shares the same 5-min valid-curve eligibility and differs only by the activity gate; that satisfies the request. Standing rule for every Idea-lab test from now on: candidate and control must share the same eligibility screen, with only the hypothesis condition differing, and the report must state that explicitly.

R11 — Comparing a candidate with a control when unknown counts differ (evidence: CL-L001 175 vs 1,153 unknown; L001; L002): from now on every Idea-lab table also reports a **paired view** — total SOL, mean and median on the launches where BOTH candidate and control have a resolved outcome, with that launch count. Totals on different denominators remain reported but are not compared. Costs: compute only. Unknown: whether the paired set is representative — report its size against each denominator.

R12 — Claude contract note: f001's ARTIFACT_SHA256SUMS.txt lists four rerun log files (rerun/*/run.log, audit.log) that are not committed, so the manifest verifies 17/21. Not a results problem (every results file verifies and reproduces); Claude: either commit the logs or list only committed files from the next run on.

R13 — Codex C010 lease: claimed 21:13 UTC with a 2-h lease, protocol committed, no results by 00:35 UTC 12 Nov. Not a stall under the 14-h rule (last Codex result 18:31 UTC). The next Codex run reconciles the interrupted work (keep the registered protocol @ 47ac802; do not re-register L003 after seeing anything) before any retry.

R14 — Round 1 export: still absent (same 55 branches on origin as at run 1; no new branch). Owner decision from R6 still open. Owner decisions from run 1 (R4 cost scenario, R5 study100k allowlist) also still open.
