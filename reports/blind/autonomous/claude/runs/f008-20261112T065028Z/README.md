# f008-20261112T065028Z — F008 label concordance (Claude 117 vs Codex 56 five-minute runners) + Idea lab CL-L003

Worker: Claude research worker (scheduled). Started 2026-11-12 06:50 UTC. Inputs: tracker @ b357ca7 (queue), research-codex @ 59d657b
(c009 run folder unchanged since e9f952d; c010 published in 59d657b), research-claude base @ 87e8372, entry-all-20261107t2210 @ e6783312
(16/16 checksums), blind-eval-1.1 @ be9b5459 (evaluate.py sha256 f5686511…, imported unchanged). Protocol committed @ 3a281db before any
Idea-lab number was computed. Development data only; no protected outcomes; compute only.

## F008 — hypothesis and method
Question (queue): on the 3,638-launch denominator, how many of Claude's 117 five-minute sustained-2× runners (f006, price ≥ 2× the state
price at t held ≥ 30 s, 1-h horizon) are among Codex's 56 (c009, net sellable proceeds of a 0.2 SOL position ≥ 2× stake after costs held
≥ 30 s, 2-h horizon, requires a fill at t+1 and a continuous valid path), and what explains the rest? Counts only; no label recomputed.
Join on mint at age 300 s between Claude's `features_labels.csv.gz` (3,638 rows) and Codex's 53 `ledger_*.csv` (3,489 rows at age 300).

## F008 — measured results
Cohorts: every one of Codex's 3,489 attempted launches is in Claude's 3,638; 149 of Claude's are not in Codex's cohort (Codex requires
≥ 15 SOL gross curve buying received by t and a valid decision state — 147 of the 149 are Claude "unknown", 2 have no Claude record).

Cross-tabulation at 5 min (Claude registered label | Codex label):

| Claude \ Codex | observed_sustained2x | unknown | not in Codex cohort | total |
|---|---:|---:|---:|---:|
| runner | **56** | 61 | 0 | 117 |
| nonrunner | 0 | 1,249 | 0 | 1,249 |
| unknown | 0 | 2,123 | 147 | 2,270 |
| no record | 0 | 0 | 2 | 2 |
| total | 56 | 3,433 | 149 | 3,638 |

Under the R2 tol30 rule the runner row is identical (56 / 61); Claude's 3,052 tol30 non-runners are all Codex "unknown" (1,915 of them
Codex fill-unavailable, 723 exit-uncertain, 412 scored-but-path-not-certified, 2 not in cohort).

Answer: **all 56 of Codex's runners are among Claude's 117** (Codex-only = 0). By half: both 21 early / 35 late; Claude 37 / 80.
The 61 Claude-only runners, by Codex's own record-level reason:
- 8: Codex fill unavailable at t+1 ("state older than 30 s" — the last received state was more than 30 s old when the buy would land).
- 53: Codex filled the position (31 scored, 22 exit-uncertain: 19 "capture gap during hold", 2 "state older than 30 s", 1 "capture gap before
  landing") but the label stayed unknown because Codex's sustained check requires every observation from t+1 to the episode to be ≤ 30 s apart
  and every state valid ("continuous"); a single inter-trade gap > 30 s before the 2× episode makes the launch unknown for Codex, while
  Claude's rule only requires the logged feed gaps not to overlap. Codex's published CSV does not carry `max_observed_sellable_proceeds_sol`
  (it is in the local records only), so "fees vs continuity" cannot be separated from the ledger alone; what the ledger does show is that
  these 53 reached a price multiple of 2.21–23.5× within 1 h on Claude's tape (median 3.30, 37 of 53 ≥ 2.5×), i.e. well above the ≈ 2.06×
  price needed for 2× net proceeds under 125 bps + 0.0015 SOL, so the proceeds threshold is unlikely to be the reason for more than a few.
  45 of the 53 are Claude strict-rule "runner with coverage not ok" (feed gaps elsewhere in the hour), 8 are coverage-ok.
- 0: horizon (Codex 2 h vs Claude 1 h) cannot remove a Claude runner, and no Codex runner is outside Claude's 1 h — the 2-h horizon added
  no runner that the 1-h price label missed.
Codex scored trades on Claude's runners: 77 of 117 scored, total +6.882550 SOL, 52 positive (on the 56 shared: 46 scored, +6.153153 SOL,
33 positive) — these are retrospective, label-conditioned sums, not a strategy result.

Why Codex has 0 negatives and Claude 1,249 (strict) / 3,052 (tol30): Codex certifies a negative only if the position was fillable at t+1 AND
the whole 2-h path has observations ≤ 30 s apart with valid states AND no logged gap; 2,095 of 3,489 are already unknown at the fill step
(stale state at landing), and of the 1,394 filled none had a 2-h path with no inter-trade gap > 30 s (dead coins stop trading). Claude's
negative only needs no logged main-feed gap (strict) or none ≥ 30 s (tol30) overlapping the hour, with no fill requirement. The two "unknown"
sets therefore measure different things: Codex's is mostly fill/execution availability, Claude's is capture coverage.

## Idea lab CL-L003 — launch crowding (registered @ 3a281db)
Hypothesis: a live coin reaching 5 min while few other launches compete for attention keeps its inflow. Feature crowd10 = number of other
launches retained in (t − 600 s, t] (first pass over the tape computes every launch's retention receipt time; 4,612 retained launches in the
window including outage-excluded ones). Candidate = eligibility E (valid curve state, ≥ 5 curve buyers in the last 60 s at 300 s; the same
679 launches as f006p2) AND crowd10 ≤ 10 (fixed a priori). Control = E (R10: only the crowding condition differs). Scenario R4 through
frozen eval-1.1 run_launch unchanged at pool 55 bps with the 30-s staleness post-check (as f006p2 S2 / CL-L001). The control reproduces
f006p2 exactly: 679 attempted / 419 resolved / −10.011572 SOL.

crowd10 within E: min 3, quartiles 14 / 20 / 28, max 47 — the window is busier than the a-priori guess (≈ 17 per 10 min), so ≤ 10 binds on
only 68 of 679.

| Spec / half | Attempted | Filled (fill unavailable) | Resolved | Uncertain exits | Unknown share | Total SOL | Mean / median | Win | Loss > 50 % | w/o best 1 | w/o best 3 |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| Control E all | 679 | 673 (6) | 419 | 254 | 38.3 % | −10.011572 | −11.9 % / −24.1 % | 22.9 % | 11.2 % | −11.387527 | −12.393118 |
| Control early | 313 | 311 (2) | 197 | 114 | 37.1 % | −7.661922 | −19.4 % / −26.2 % | 17.8 % | 12.2 % | −7.906075 | −8.338821 |
| Control late | 366 | 362 (4) | 222 | 140 | 39.3 % | −2.349649 | −5.3 % / −23.2 % | 27.5 % | 10.4 % | −3.725605 | −4.731195 |
| **CL-L003 crowd ≤ 10 all** | 68 | 67 (1) | 50 | 17 | 26.5 % | **−1.774848** | −17.7 % / −23.3 % | 18.0 % | 14.0 % | −2.067370 | −2.355097 |
| CL-L003 early | 22 | 22 (0) | 14 | 8 | 36.4 % | −0.724538 | −25.9 % / −24.3 % | 7.1 % | 21.4 % | −0.765566 | −0.737300 |
| CL-L003 late | 46 | 45 (1) | 36 | 9 | 21.7 % | −1.050310 | −14.6 % / −23.3 % | 22.2 % | 11.1 % | −1.342832 | −1.630558 |
| Complement crowd > 10 all | 611 | 606 (5) | 369 | 237 | 39.6 % | −8.236724 | −11.2 % / −24.2 % | 23.6 % | 10.8 % | −9.612679 | −10.618269 |
| Complement early | 291 | 289 (2) | 183 | 106 | 37.1 % | −6.937384 | −19.0 % / −26.2 % | 18.6 % | 11.5 % | −7.181537 | −7.614283 |
| Complement late | 320 | 317 (3) | 186 | 131 | 41.9 % | −1.299339 | −3.5 % / −23.2 % | 28.5 % | 10.2 % | −2.675294 | −3.680885 |

Every resolved winner is counted; best-1/3 removal is a stress test. R11 paired view: the candidate's trades are a fixed subset of the
control's with identical execution, so on the candidate's 50 resolved launches control = candidate (−1.774848 SOL); the informative
comparison is candidate vs complement, each on its own resolved set (50 vs 369). Post-hoc descriptive quartiles of crowd10 within E
(bounds 14 / 20 / 28; resolved n / total SOL / mean): Q1 121 / −3.306849 / −13.7 %, Q2 99 / −1.907260 / −9.6 %, Q3 106 / −2.797397 /
−13.2 %, Q4 93 / −2.000066 / −10.8 % — no monotone pattern.

Verdict: **failed** (R16 vocabulary). The quiet-period candidate loses more per trade (−17.7 %) than the crowded complement (−11.2 %), is
negative in both halves, and has the lowest win rate; unknown share 26.5 %. Variants tried: one registered threshold + the post-hoc quartile
split (descriptive only). The competing explanation (quiet periods have fewer buyers to sell to) is consistent with the result.

## Codex numbers re-derived from the published ledgers (this run)
c009 5-min control 3,489 / 1,394 / 2,095 / 537 / 857, −19.469149 SOL, w/o best 3 −22.212237; L002 820 / 572 / 248 / 381 / 191, −15.293066,
w/o best 3 −16.208778; runners 56 / 21 / 9 — all exact. c010 L003 296 / 291 / 5 / 195 / 96, −4.645368 SOL, w/o best 1 / 3 −4.968636 /
−5.561080, early 95 / −3.089285, late 100 / −1.556083; its control 3,362 / 2,091 / 805 / 466, −15.418002 — all exact. 295 of the 296 L003
attempts are inside Claude's eligibility E (679), so L003 is effectively a sub-selection of the f006p2 control.

## Limitations
1. F008 is a join of two published files; it cannot separate "proceeds < 2× after fees" from "path not continuous" for the 53 because the
   proceeds maximum is not in Codex's CSV — Codex can report it from its local records (review request).
2. Codex's cohort and fill model are the dominant source of its unknowns (2,095 of 3,489 unavailable fills); the concordance says nothing
   about which label is "right" — they answer different questions (price path vs executable proceeds).
3. CL-L003's threshold binds on 68 launches; the result is a small-sample failure, not a measurement of crowding across the range (the
   quartile split, post hoc, shows no pattern either). Crowd counts use retention receipt times from the same tape, which is knowable but
   depends on capture; outage periods were excluded from the denominator, not from the crowd count.
4. Unknown outcomes (26–42 %) are reported, never scored.

## Reproduce
See commands.sh. concordance.py takes < 5 s; run_l003.py ≈ 3 min (two passes). ARTIFACT_SHA256SUMS.txt is generated from `git ls-files`
of this folder after the commit (R18) and lists committed files only.
