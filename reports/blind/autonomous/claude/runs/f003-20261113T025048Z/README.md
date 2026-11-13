# f003-20261113T025048Z — F003: one creator-history loss-avoidance filter on eligibility E (+ Idea lab CL-L008 first-time-buyer share)

Worker: Claude research worker (scheduled, unattended). Lease ed22a45 02:50 UTC; **protocol 05dd663 (02:58 UTC) before any outcome was
computed**; results in this commit. Inputs: tracker @ 8422866; research-codex read @ be8cf89 (no new Codex commit since F011); entry-all-20261107t2210
@ e678331 (16/16 checksums OK); frozen eval-1.1 @ be9b545 (evaluate.py sha256 f5686511…, imported unchanged); Claude's published F002
launches.csv.gz @ 3393d27 (retention receipt times; reproduced exactly by the coordinator, R45) and f011 features_at_300s.csv.gz @ 88950fd
(the E flags, used only for the counts-only pre-checks; the scoring run recomputes E from raw and gets the same 679). Costs: compute only.
No live trading, no paid API, no protected data, nothing written outside this folder on this branch.

## Question (queue F003 as settled by R46) and registered filter
Do the surviving eligibility-E launches of creators whose previous in-window coin was NOT retained trade worse or better after costs than the
rest of E? Filter registered in PROTOCOL.md (one of the three F002 conditions; the other two are descriptive only): **C1 "previous launch not
retained by this creation"** — the creator has an in-window predecessor whose 15-SOL retention receipt is absent or later than this launch's
create_ts. Predicted direction, registered: the removed side has a lower net SOL per resolved trade than the kept side. Candidate (C1 kept) and
control share eligibility E and differ only by the veto (R10); every spec goes through the frozen evaluator's run_launch unchanged; kept-side
rows are asserted identical to the control's on every kept launch (0 mismatches).

R54 pre-check (precheck_conditions.json, counts only): C1 removes 137 / 679 = 20.2 % of E (early 50 / late 87; cells A 2 / B 17 / C 118);
C2 serial20 removes 59 (8.7 %); C3 gap10 removes 101 (14.9 %); 478 E launches have no in-window predecessor. All three testable.

## Result — R4 scenario (0.2 SOL, +1 s / +0.7 s landings, 125 bps curve, 55 bps pool, 0.0015 SOL fixed, 30 % trail, 2 h, 30-s staleness post-check)
| Side | attempted | uncertain exit | stale fill | stale exit | resolved (unknown share) | total SOL | per resolved trade | mean / median ret | win | loss > 50 % | w/o best 1 / 3 | early / late | cells A / B / C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CONTROL = E | 679 | 185 | 16 | 59 | 419 (38.3 %) | −10.011572 | −0.023894 | −11.9 % / −24.1 % | 22.9 % | 11.2 % | −11.387527 / −12.393118 | 197 / −7.661922, 222 / −2.349649 | 166 / −4.820931, 74 / −0.654013, 179 / −4.536627 |
| **F003-C1 kept** (not C1) | 542 | 131 | 12 | 52 | 347 (36.0 %) | **−6.693595** | −0.019290 | −9.6 % / −23.7 % | 23.3 % | 9.2 % | −8.069550 / −9.075141 | 169 / −5.871293, 178 / −0.822302 | 165 / −4.754188, 66 / −0.346991, 116 / −1.592415 |
| C1 removed | 137 | 54 | 4 | 7 | 72 (47.4 %) | −3.317977 | −0.046083 | −23.0 % / −29.4 % | 20.8 % | 20.8 % | −3.622062 / −3.919467 | 28 / −1.790630, 44 / −1.527347 | 1 / −0.066743, 8 / −0.307022, 63 / −2.944212 |

Per-trade difference kept − removed = **+0.026793 SOL per resolved trade, iid bootstrap 95 % [+0.0040, +0.0503]** (10,000 resamples, seed
20261113) — the registered direction is observed and the interval excludes zero. The direction holds in both halves (early −0.0347 vs −0.0640;
late −0.0046 vs −0.0347) and inside cell C, where 118 of the 137 removed launches sit (kept C 116 / −1.592415 = −0.0137 vs removed C 63 /
−2.944212 = −0.0467); cells A and B have 1 and 8 removed resolved trades and say nothing. The removed side also exits faster: median hold 58 s
vs 152 s, 50.0 % of its resolved trades exit within 60 s vs 22.2 % of the kept side's — the trail is being hit early, consistent with the
"dump into the first buyers" mechanism F002 described, not with a different exit.
R11 paired view: 347 pairs, difference 0 by construction (kept rows are the control's rows); the 72 control-only resolved launches are exactly
the removed side above (pairs = 82.8 % of the control's resolved, 100 % of the candidate's). Bootstrap on the kept side's own total: [−10.76,
−1.95] SOL — the kept side is still a loss, in both halves and every cell. **Nothing here is profitable or supported**: the filter removes
−3.317977 SOL of the control's −10.011572 by declining 137 launches, and the remaining 542 lose −6.693595.

Unknown shares differ (47.4 % removed vs 36.0 % kept): the removed side's launches go quiet or stale more often, so its resolved total
understates whatever those 65 unresolved trades would have done; unknowns are not losses and are not scored.

S1 (frozen eval-1.1, verbatim, pool 30 bps default): CONTROL 484 scored / 195 unknown / −11.814859 (identical to f006p2 / f009 / f010 / f011);
F003-C1 404 scored / 138 unknown / −8.179153, mean −10.1 %, win 21.8 %, scorable false, supported false; CL-L008 247 / 100 / −4.724336.
Pool-fee-125 sensitivity: −8.249430 (C1), −4.761312 (L008).

### Post-hoc description (not registered, no verdict): E splits into three ordered groups by creator history at creation
| Group | attempted | resolved | total SOL | per trade | early / late | cells A / B / C (resolved, SOL) |
|---|---|---|---|---|---|---|
| no in-window predecessor | 478 | 303 | −5.302403 | −0.0175 | 151 / −5.178785, 152 / −0.123618 | 165 / −4.754, 63 / −0.157, 75 / −0.392 |
| predecessor retained by c (kept by C1) | 64 | 44 | −1.391191 | −0.0316 | 18 / −0.692508, 26 / −0.698684 | 0, 3 / −0.190, 41 / −1.201 |
| predecessor NOT retained by c (removed by C1) | 137 | 72 | −3.317977 | −0.0461 | 28 / −1.790630, 44 / −1.527347 | 1 / −0.067, 8 / −0.307, 63 / −2.944 |
So part of the C1 separation is "has any in-window predecessor" (descriptive no-predecessor-vs-any split: +0.0231 per trade, CI [+0.0044,
+0.0428]); the 64 launches whose predecessor WAS retained sit between the two. Reading: the ordering is monotone in the direction F002
predicted, but with 44 and 72 resolved trades the middle group cannot be separated from either neighbour on this window. Every C1-removed
launch's predecessor was never retained in the window at all (the "retained only after c" sub-group is empty, 0 / 137).

### Pre-declared descriptive breakdowns (counts and totals only, never a verdict; heavy overlap with C1: 47 of 59 C2 and 78 of 101 C3 launches are C1)
| Condition | kept att / resolved / SOL (per trade) | removed att / resolved / SOL (per trade) | per-trade diff, CI |
|---|---|---|---|
| C2 ≥ 20 prior in-window launches | 620 / 389 / −8.692992 (−0.0223) | 59 / 30 / −1.318579 (−0.0440) | +0.0216 [−0.0192, +0.0590] |
| C3 ≤ 10 min after the creator's previous launch | 578 / 362 / −7.089912 (−0.0196) | 101 / 57 / −2.921660 (−0.0513) | +0.0317 [+0.0088, +0.0552] |

## Idea lab — CL-L008 first-time-buyer share (registered in PROTOCOL.md before scoring; eligible per R27)
Feature at 300 s: share of the last-60-s distinct curve buyers (the control's own buyers_last_60s set) with no received curve buy on another
tracked mint before t (cross-mint wallet map built from the same export, 124,060 wallets over the 4,913 mints with trades). Pre-check
(ftb_precheck.json): median 0.125, deciles 0 / .034 / .064 / .096 / .125 / .157 / .20 / .28 / .44; my prior threshold 0.5 would keep 62 of
679, so the registered rule is the E median split (ftb_share ≥ 0.125 → kept 347 / removed 332 = 48.9 % removed); predicted: kept side higher
net SOL per resolved trade.
| Side | attempted | resolved (unknown) | total SOL | per trade | mean / median | win | loss > 50 % | w/o best 1 / 3 | early / late | cells A / B / C |
|---|---|---|---|---|---|---|---|---|---|---|
| CL-L008 kept (ftb ≥ 0.125) | 347 | 213 (38.6 %) | −4.253739 | −0.019971 | −10.0 % / −22.6 % | 23.5 % | 9.9 % | −5.629694 / −6.173770 | 140 / −4.127597, 73 / −0.126142 | 80 / −1.857002, 43 / +0.364109, 90 / −2.760846 |
| removed (ftb < 0.125) | 332 | 206 (38.0 %) | −5.757833 | −0.027951 | −14.0 % / −26.2 % | 22.3 % | 12.6 % | −6.339743 / −7.112095 | 57 / −3.534326, 149 / −2.223507 | 86 / −2.963929, 31 / −1.018122, 89 / −1.775782 |
Per-trade difference +0.007980 SOL, iid 95 % [−0.0130, +0.0303]: the registered direction is observed but the interval includes zero; cell C
runs the other way (−0.0307 kept vs −0.0200 removed), and the post-hoc quartiles are not monotone (per trade Q1 −0.0224, Q2 −0.0323, Q3
−0.0256, Q4 −0.0134). The pre-declared ftb ≥ 0.5 cut: 62 attempted / 23 resolved (62.9 % unknown) / −0.777852 (−0.0338), the opposite
direction, inconclusive by construction. Paired R11: 213 pairs identical, 206 control-only (the removed side). S1 verbatim: 247 / 100 /
−4.724336. **Verdict: weak** — not failed (direction as registered, every half in the right direction), not distinguishable from zero, not
monotone; no retune proposed; a loss on every denominator. Cell B kept 43 / +0.364109 is positive only through its best trade (−1.011846
without it) and is not an after-cost result. Limitation: "first-time" = no earlier buy on a tracked mint in this 36-h window.
Cross-check (counts only): inside the C1-removed cell-C launches, ftb ≥ 0.125 gives 23 / −1.054024 (−0.0458) vs < 0.125 40 / −1.890188
(−0.0473) — the two conditions are not the same thing and ftb does not split C1's removed side.

Two further ideas, proposed, NOT tested: (1) buy-size uniformity veto — skip when the last-60-s buys' SOL sizes have very low dispersion
(scripted sizing; testable from the tape at 300 s; waits because it is a third 5-min activity-shaped condition and R27 asks for a distinct
mechanism — uniformity is about who buys, not how many, but I want the coordinator's reading first); (2) "relaunch into fresh wallets" —
C1 ∧ low ftb as a sharper veto; only on a released dataset, since both parents were tuned here (R43 spirit).

## Limitations
History before 6 Nov 07:40 UTC is invisible (a "first" launch may have earlier coins); creators' launches outside the census are invisible;
create_ts as the decision time is ~1 block optimistic (a live rule acts at the creation receipt; the 300-s entry is unaffected); the C1-removed
set is 86 % cell C and the within-C comparison (116 vs 63 resolved) carries the result; 36-h development window, one sample, no test data; the
owner's R4 numbers are still unconfirmed (coordinator R4). The wallet_map.pkl (9.4 MB) and the logs are regenerated by commands.sh and are
not committed; ARTIFACT_SHA256SUMS.txt lists committed files only (git ls-files).

## Codex cross-check (R51, counts only, from its published runner_ledger_00[1-3].csv @ be8cf89)
53 rows; 53 maxima ≥ 0.4 SOL, median 0.642; 53 observed ≥ 2× net anywhere; 15 before the first raw receipt gap = 11 with an actual gap +
4 with no gap at all (censored tails); 0 sustained before the original evidence failure; stored_max_identical 53/53. Agrees with R51 exactly.
