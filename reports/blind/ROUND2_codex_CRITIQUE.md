# Codex — Round 2 Phase B cross-critique

Prepared 8 Nov 2026. **Recommendation: freeze “none supported”; no active rule deserves selection on the present evidence.** This is a Phase B assessment, not a replacement Phase C freeze. Phase A and Round 1 are unchanged. No 8–10 Nov outcomes were accessed, no trading occurred, and no bot/evaluator code was modified.

I read Claude/Fable's report and all supplied code at **8011d4eef5b0cf75245ed293d1809c6896b500b7**, and Gemini's reading-based critique at **10593e9dc24ea451ab7c6cc95b77ccfa432c3779**. I then reproduced the requested headlines from raw export **e67833121f1da0dc992c28fa26c5236a855c151a**, using frozen eval-1.1 **be9b5459e2f7670946d9ca012f875b77aaaf5d5b**, evaluate.py SHA256 **f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86**. Neither a shared conclusion nor Gemini's review substitutes for reproduction.

Reproduction scripts and full-precision evidence summaries are added in **codex_r2/phase_b/**. They use the raw trade files, not Claude's saved returns. The published engine is reused as a subject of audit, and selected outputs are separately checked against unchanged frozen run_launch. This verifies the requested cells, not every feature/regime table in the report.

## 1. Reproduction of the requested numbers

### 1.1 N, split and unconditional evaluator check

Using Claude's five documented feed-outage intervals reproduces **N=3,693**, split at **7 Nov 03:22 UTC: H1=1,847, H2=1,846**. I reproduce all unconditional retention/hold30 categories and returns against frozen run_launch, with zero discrepancies across all 3,693 launches. No receipt times are missing.

| Retention decision, horizon 30s, without graduation exclusion | H1 | H2 |
|---|---:|---:|
| N | 1847 | 1846 |
| Scored | 1791 | 1764 |
| Unknown | 56 | 82 |
| Mean return, 0.2 SOL | -0.028463651 | +0.067324616 |
| Win rate, 0.2 SOL | +0.384142937 | +0.387755102 |
| Mean without best, 0.2 SOL | -0.033539370 | -0.034040306 |
| Point SOL/common launch, 0.2 SOL | -0.005520130 | +0.012866806 |
| Mean return, 0.02 SOL | -0.084875907 | +0.017494282 |

The difference from my Phase A N=3,638 is **exactly the extra 21:40–21:45 6-Nov resize outage**. snapshot3/MANIFEST.md line 92 says the box was powered off during that resize. Adding it to Claude's five intervals excludes exactly **55** more launches whose [created,created+2h] intersects it. At Claude's split this gives **1,792 / 1,846**; at my 01:50 split it gives **1,593 / 2,045**. Reconciliation mismatches and event-order contradictions did **not** cause this N difference. The two totals are outputs of different outage inputs, not an arithmetic disagreement or evidence of robustness from different filters. A common score requires a common complete outage ledger.

### 1.2 Stage A at retention+0s and +5s

Below are mean after-cost returns at 0.2 SOL / win rates, followed by the scored count in brackets. H1/H2 retention+0 use Claude's non-instant proxy exclusion (1,795 / 1,787 attempts). The +5s published row uses **all 3,693 attempts**, whereas a consistently filtered +5s row has **3,582 attempts**.

| Exit | +0s, filtered H1 | +0s, filtered H2 | +5s, all, combined (published row) | +5s, filtered, combined |
|---|---:|---:|---:|---:|
| tr20 | -0.057839 / 0.3391 [1675] | -0.051335 / 0.2928 [1701] | -0.078057 / 0.2889 [3313] | -0.090697 / 0.2883 [3285] |
| tr30 | -0.125483 / 0.2479 [1650] | -0.107865 / 0.2274 [1680] | -0.141440 / 0.2114 [3249] | -0.155043 / 0.2096 [3220] |
| tp13tr20 | -0.007266 / 0.4221 [1689] | +0.017225 / 0.4029 [1715] | +0.013634 / 0.3778 [3340] | -0.032033 / 0.3774 [3312] |
| tp15tr30 | -0.024988 / 0.3560 [1680] | -0.021089 / 0.3365 [1694] | -0.029546 / 0.3057 [3297] | -0.076249 / 0.3046 [3267] |
| h15 | -0.021548 / 0.4132 [1769] | -0.017999 / 0.3727 [1744] | -0.008708 / 0.3658 [3557] | -0.049909 / 0.3689 [3508] |
| h30 | -0.026763 / 0.3896 [1766] | -0.031393 / 0.3891 [1740] | -0.015416 / 0.3635 [3552] | -0.064435 / 0.3677 [3503] |
| h60 | -0.072112 / 0.3468 [1762] | -0.083007 / 0.3459 [1729] | -0.052853 / 0.3218 [3536] | -0.103469 / 0.3242 [3486] |
| h120 | -0.133517 / 0.2647 [1749] | -0.139050 / 0.2671 [1726] | -0.112249 / 0.2559 [3521] | -0.163644 / 0.2578 [3472] |
| h300 | -0.233467 / 0.1642 [1724] | -0.207637 / 0.2075 [1653] | -0.182172 / 0.1782 [3428] | -0.237039 / 0.1784 [3380] |
| h7200 | -0.295867 / 0.1232 [568] | -0.139915 / 0.1063 [442] | -0.244007 / 0.1162 [1024] | -0.258512 / 0.1089 [1010] |

These reproduce the printed +0 and +5 row values to their rounding. **They also establish a report error:** the +5 row is unfiltered, contrary to the statement that instant graduations are excluded from subsequent tables. For example, its tp1.3/tr20 mean is +1.3634% unfiltered but **−3.2033%** filtered; hold30 is −1.5416% unfiltered but **−6.4435%** filtered. The different cohorts must not be compared as if only entry delay changed. The unfiltered +0 two-hour combined mean **+9.818556** also reproduces, but only **1,029/3,693** attempts score; that conditional mean is not a valid profitability score.

### 1.3 FTC-R0

I reproduce the published first-in-window creator selection, graduation proxy exclusion, receipt-time retention entry, independent sizes, take-profit x>=1.20 and 30s horizon. Direct frozen-evaluator checks reproduce the candidate and plain-hold variant with zero numerical/category differences. This is an **offline, externally feature-conditioned audit**, not a claim that creator history is available through the evaluator's view.

| FTC-R0 at 30-bps pool fee | H1 0.2 | H2 0.2 | H1 0.02 | H2 0.02 |
|---|---:|---:|---:|---:|
| Attempts | 1234 | 1092 | 1234 | 1092 |
| Scored | 1212 | 1052 | 1212 | 1052 |
| Unknown | 22 | 40 | 22 | 40 |
| Mean return | +0.008484634 | +0.038487396 | -0.050475559 | -0.018241124 |
| Median return | +0.019042962 | +0.023302028 | -0.050721593 | -0.045185900 |
| Win rate | 0.520627 | 0.548479 | 0.448020 | 0.432510 |
| Mean without best | +0.005178957 | +0.035266135 | -0.053822145 | -0.021485628 |
| Scored net SOL | +2.056675239 | +8.097748123 | -1.223527543 | -0.383793245 |
| Net SOL without best | +1.254343464 | +7.412941600 | -1.303572346 | -0.451627909 |
| Worst scored return | -0.955922562 | -0.988399577 | -1.021258608 | -1.055418841 |
| Share losing >=50% | 0.090759 | 0.070342 | 0.124587 | 0.105513 |
| Lower-bound total SOL | -2.376324761 | +0.037748123 | -1.696527543 | -1.243793245 |
| Their attempt-conditioned bootstrap 5th percentile | -0.027291325 | -0.021506142 | -0.087036224 | -0.079488199 |

Thus **+0.8485%/+3.8487%** at 0.2 SOL and **−5.0476%/−1.8241%** at 0.02 SOL reproduce. Plain hold30 returns **+0.9506%/+4.1054%**, net **+2.302354/+8.645972 SOL**, also reproduce. Delaying that first-creator hold30 decision by five seconds produces **−2.2752%/−1.3058%**, as reported. About **1,536 attempts/day** follows from 2,326 attempts in 36h20m.

**Pool-fee sensitivity is not irrelevant.** H1 has no scored pool legs, but H2 FTC-R0 has **58 pool fills and 82 pool exits** (plain hold30: 58 and 84). The engine permits them even though the written rule says “fill ... on the curve.” At 125 bps, the H2 FTC-R0 mean changes to **+3.6939% / −1.9797%**, and scored net to **+7.771979 / −0.416531 SOL**. Its 0.2 SOL lower total changes from **+0.037748** at 30 bps to **−0.288021 SOL** at 125 bps. That sensitivity is required by the brief.

For comparability I padded non-candidate launches with abstentions to the common N and used frozen score at **K=1**, the least demanding multiplicity case:

| FTC-R0, pool fee 30 bps | H1 0.2 | H2 0.2 | H1 0.02 | H2 0.02 |
|---|---:|---:|---:|---:|
| Lower SOL/common launch | -0.001286586 | +0.000020449 | -0.000918531 | -0.000673777 |
| Frozen one-sided lower confidence bound | -0.003564355 | -0.002450484 | -0.001158374 | -0.000934316 |

All fail support even before any K>1 adjustment. Claude's 4,000-resample candidate statistic is a bootstrap of stake returns across **attempts**, not 10,000 resamples of SOL/common-N launches; its sign is cautionary, but calling it the evaluator's “lower score” is incorrect.

I cannot reproduce peak 8 from the published candidate logic. Using scored sell times and a scheduled 30s exit for unknowns gives **peak 6** for FTC-R0 (1.2 SOL at 0.2), and **7** for plain hold30. Starting exposure at decision instead of fill does not change those peaks. Actual capital release for unknown exits remains unconfirmed. No published concurrency generator explains the report's 8, so that number is unverified rather than a demonstrated bound.

### 1.4 Graduation example and the +178x result

For **5kdsd8zW37T2rK47gULpPLLCY181iKCuT8wZrChhpump**, direct raw evidence and unchanged evaluator give:

- Created **7 Nov 16:53:00 UTC**; retention receipt **16:53:00.652**. First curve row **11444961**, slot **466586425**: buy **85.005359057 SOL**, **793,100,000 tokens**; vSOL **115005359057**, vTok **279900000000000**.
- Buy lands at **16:53:01.652**, still using that completed-curve row. Under the standard curve in the brief, real saleable reserves have been exhausted; positive virtual reserves do not make another curve purchase executable. The evaluator lacks a completion/real-reserve buy check.
- At the 30s horizon, row **11448460**, block time **16:53:29**, supplies vSOL **1160230000000** and vTok **14959796869843**: **1,160.23 SOL / 14,959,796.869843 tokens**, implied price **0.0000775565343630 SOL/token**.
- Frozen 0.2 SOL result: **net +35.754736662 SOL; return +178.773683311**. The 0.02 result is **+3.683306842 SOL; +184.165342123**. These are return fractions, i.e. roughly +17,877% / +18,417%, not ordinary plausible fills.
- Removing this best coin changes the H2 unconditional hold30 mean from **+6.73246% to −3.40403%**. That claim reproduces.
- **The same mint does not score +3,494x at two hours.** Both the published engine and frozen evaluator return **unknown: exit capture gap**. Its last recorded state is at **17:31:17**; main/pool gaps overlap the span to the **18:53:00.652** landing. Even an unchecked sale into that last state would return about **−96.91%**, not +3,494x.
- The +3,494 claim appears misattributed: frozen eval at two hours scores **LLzYn4ZZ4anByo4Xud8jMvE7y9zCf2APwRsTCZcpump +3494.461446**, **fBidsBVNH6HdAba7pD6dqSoxmU2jAT7z3YuCUVzpump +3491.724020**, and **dEJEFGBeTyMBrKZ25VeEFaQymTgSLj7zuqPGnLkpump +3095.137081**. These confirm a serious class of replay pathology while correcting the named example.

The raw pool rows name the target as **base_mint**, wSOL as quote, and one pool **DiDppkp1x52gwdEAbDSQmCBSdsZ4rmv1eCpWZTanoNMT**; evidence fields are present. The 30s pool/curve price ratio is **188.757x**, not 1,000x. The high reserve price and a curve-derived census peak do **not** by themselves prove a pool decoder/decimal error. The census peak may omit pool appreciation, a pool may be seeded differently, or data may indeed be corrupt; account/config evidence is needed. The exhausted-curve fill is already sufficient to invalidate the claimed executable arbitrage without pretending the pool's true price is established.

## 2. Errors, unproven assumptions and knowledge-time issues found in Claude's work

These findings distinguish reproduced implementation behavior from claims about economic reality. I did not find future trade receipts deliberately fed into the FTC-R0 decision or exit trigger: the replay uses received prefixes and the specified delays. The following issues nevertheless prevent treating its positive conditional means as an operational edge.

1. **Incomplete outage input, not a shared N.** engine_r2.OUTAGES/evalcheck README omit the explicitly documented powered-off resize. This explains exactly 55 launches. My Phase A list includes it. Calling both totals “the evaluator's N” without disclosing different outage inputs is misleading; frozen code does not independently discover missing outages.
2. **Inconsistent graduation exclusion in Stage A.** The +0 rows remove 111 proxies, the +5 row retains them, despite the stated blanket exclusion. The raw reproduction above proves this and quantifies its effect.
3. **Written curve-only entry differs from implementation.** replay accepts a pool fill if migration precedes landing; 58 H2 FTC fills are pool fills. A rule may validly allow this, but it must say so. A pre-decision curve state cannot guarantee the landing venue one second later.
4. **Required pool sensitivity falsely dismissed.** 82 H2 candidate exits are pools, not zero; fee125 changes profit and makes the already tiny H2 0.2 lower total negative. Corrected numbers are above.
5. **Two-hour return misattributed to 5kdsd8zW.** Its frozen outcome is unknown, not +3494x; the latter belongs to LLzYn4. Other giant outcomes do reproduce, so this correction does not dismiss the pathology.
6. **Decoder diagnosis is asserted beyond the evidence.** An exhausted-curve purchase is a concrete model failure. High pool prices alone do not establish wrong decimals or a “x1000” decoder error. The raw base mint matches and the measured 30s price ratio is 188.757. A hard “3x curve ceiling” pool-price cap would also reject potentially genuine appreciation; it is not validated ground truth.
7. **“111 instant dev-buy graduations” overstates the proxy.** The actual exclusion is gross>=80 OR cap>=380 at retention. Of those 111, **57** have a first trade buying >=80 SOL and **66** have their first trade at/below the virtual-token floor; all have a first trade in the creation slot. Some can complete through multiple same-slot trades, but the proxy count does not establish 111 single-dev-buy exhausted first trades. Forecasting “~150 in the test” is an extrapolation, not known future data.
8. **Finalised tier is treated as known at the first trade.** Both engines inherit frozen run_launch's use of the final census tier. The brief permits bundle fields only from finalisation, but no finalisation timestamp is supplied. **381 H1 and 227 H2 FTC attempts** occur with receipt-known gross curve buying still below 15 SOL: **608/2,326** attempts depend on the tier shortcut rather than the observable gross witness. Without finalisation-time evidence, their early eligibility is unverified. This is an implementation/brief knowledge-time gap, not proof Claude secretly used future trade prices. My Phase A candidates explicitly require received gross>=15, so their entries do not rely on this shortcut.
9. **Creator admissibility is unresolved, as Claude partly acknowledges.** “First-time” means first in this truncated census, not first ever. Code uses sorted creation times/cumcount, not a recorded lookup/receipt-time history service, and the view exposes no creator identity/history. This cannot be submitted as an operational FTC module through that interface without an agreed data/translation arrangement. I checked the selected mints: **zero** had another same-creator census launch before the retention decision, excluding the current mint; I therefore do not allege a demonstrated creation-vs-decision look-ahead in those selections. The earlier-graduation flag explored in Stage D remains potential look-ahead because graduation occurrence/knowledge times are absent; Claude flags it and it is not used in FTC-R0.
10. **Search and validation are mixed.** Feature inspection/refinement uses both halves; FTC-R0's two positive means are exploratory in-sample summaries, not a clean later-half validation. Stage B's “108 cells” counts feature/exit/half tables, each potentially containing four quartile results; “~429” is not 429 independent operational rules. This is not concealment, but the count's unit and data-derived cutoffs must be disclosed. It is also not the official K of submitted rules.
11. **Bootstrap denominator/units and replication count differ from the frozen test.** cand_r2.py lines 16–18 resample attempt-conditioned return fractions 4,000 times. The common-N, 10,000-resample frozen calculation above is the appropriate comparison. The original negative bounds already argue against support, but are not evaluator score outputs.
12. **Event definition is mislabeled.** events_r2.py's buyers20_in30s stores one timestamp per buy in buyers_t and tests >=10 timestamps, not >=10 distinct buying wallets in the last 30s. The total >=20 criterion is distinct, the recent >=10 is not. That table tests a different trigger from the written “>=10 buyers in last 30s.”
13. **Loader is not canonically ordered.** load_r2.py omits ev_idx and sorts by (mint,slot,row_id), despite the required (slot,ev_idx,row_id). It changes ordering on **116 retained mints**, including **93 FTC candidates**. Four retained legacy arrays have decreasing block times, yet engine.state_at uses searchsorted on ts, which assumes sorted timestamps. The plain hold30 and FTC cells still match frozen results here; that narrow match does not prove every exit/grid cell is evaluator-identical. This is a real implementation defect with no demonstrated headline discrepancy in the cells I checked.
14. **Several descriptive features are proxies, not measured labels.** engine.feats calls the first received buy “dev,” uses same-first-slot buying as bundle flow, and approximates holding/sold-out status using SOL spent/received rather than token inventory. A wallet selling fewer tokens for more SOL can appear “sold out” under that formula while retaining tokens. Those definitions cannot establish creator identity, actual bundle membership or holders still holding. Stage-C price conditions also do not exclude invalid decoded observations from their running highs; invalid signals may contaminate the search even when invalid fills become unknown.
15. **Unknown rate is exit-dependent, and dead is not outside capture by definition.** Even at retention, raw hold30 unknown is 56/1847 and 82/1846, whereas two-hour unknown is 1275/1847 and 1389/1846. One unknown percentage per decision age is ambiguous. A quiet but retained curve is not automatically outside retention: for short creation+60s holds the 125-minute expiry generally has not occurred. Actual reason counts, not “coin died,” must explain missingness. Conditional per-scored means must retain unknowns in the score as done in the corrected candidate table.
16. **Regime and latency claims are too categorical.** The report's own 3-hour table lists positive net>=40 results outside 7-Nov 09–18 (+3%, +4%, +3%), and its first-creator table has five positive 6-hour buckets. “Every other bucket loses”/“one good nine-hour stretch” are not literally supported. Instability is plausible, but no out-of-sample regime selector or formal power calculation proves two days cannot detect an edge. Likewise +5 raw tp1.3/tr20 is positive, contradicting “negative everywhere” unless the cohort and criterion are narrowed. Retention-timing sensitivity is an observation, not proof of an economically exploitable race.
17. **Peak capital is not reproducibly specified.** The published code does not generate the reported peak8; I obtain 6 for FTC and 7 for hold30 under explicit scheduled-unknown conventions. Unknown liquidation means actual capital release is not certified. Frequency around1540/day does reproduce.
18. **Reproduction package is incomplete/host-specific for the full search.** Paths are fixed under /home/claude; U.pkl and grid_r2_clean.pkl generation, quartile thresholds, census/regime tables and capital calculations are instructions/snippets rather than complete executable generators. I reconstructed the requested steps, but “every table is what eval-1.1 would produce” exceeds both the supplied pipeline and the one-rule cross-check.
19. **A requested live experiment conflicts with the brief.** Data request2 asks for ~50 real 0.02-SOL buys. The governing brief prohibits requesting live trading. Existing historical send/landing logs are a valid alternative; initiating those trades is not authorised.
20. **A jackpot does not guarantee statistical support.** The claim that any rule entering these mints will be “supported” is false: the report's own unconditional H2 hold30 example is unsupported despite its jackpot. Unknown-share gating and bootstrap omission of an outlier can defeat support. The correct concern is contaminated point estimates and potentially invalid inference, not automatic acceptance of every affected rule.

## 3. Assessment of Gemini's review

Gemini clearly labels its work reading-only, which is appropriate. Its general advice against selecting a weak, unscorable FTC rule is reasonable. Several purported reconciliations nevertheless need correction:

- **N reconciliation is wrong.** My 4,913-301-974 already equals3,638. I did not additionally subtract five ordering contradictions or16 reconciliation mismatches. The exact missing input is the resize, not “border/reconciliation launches.”
- **No numerical cross-verification occurred.** My P0 also requires a receipt-known valid curve and gross>=15; Claude's unconditional cell permits tier shortcuts, pool fills and different exclusions. Ages/holds overlap, but predicates, splits and outage inputs differ. Reading similar negative signs cannot establish engine agreement.
- **Its unknown-gate explanation for my P0 is false.** My early creation60/hold60 P0 has **11 unknown /1,393 attempts (0.79%)**, and creation120/hold60 **20/1,489 (1.34%)**. These pass the10% gate and lose on P&L; they did not fail because unknown was35% or65%.
- It repeats the wrong two-hour mint attribution, certainty of a pool decode error, categorical regime/latency claims, and future “~150” count without evidence. The corrected raw reproductions above replace those assertions.
- It calls the combined search “~501 specifications.” Claude's429 table/cell units plus my72 rules are not a count of501 comparable operational strategies or official K. Nor do these short-window studies establish structurally negative returns for every conceivable rule.
- Mandatory decision-time guards cannot validate a future landing or future pool exit. Declaring pool prices>3x invalid would alter valuation/availability, not merely add an observable entry predicate; it must not silently modify the frozen evaluator. Adding creator fields/history is also an interface/data change requiring explicit version and knowledge-time treatment, not merely a zero-cost lookup.
- First-creator left-censoring is a plausible explanation for a half difference, not a demonstrated cause. Rejecting holder data as too costly likewise requires actual source/cost information; my request was for existing records, not an unbounded new RPC collection.

## 4. What I would revise in my own assessment

I leave **ROUND2_codex_REPORT.md and all Phase A results unchanged**. This addendum would change my interpretation and future procedure as follows:

1. Explicitly reconcile all N comparisons by outage ledger and split. My resize exclusion is supported by the existing manifest, but the ledger should be owner-agreed before common scoring; I would stop presenting different N values as interchangeable “all-coins” comparisons.
2. Narrow my conclusion to the72 fixed-age specifications tested. I did not explore the exact retention instant, event-triggered entries, creator history or all exit families. Claude adds broader negative evidence, but his contaminated cells and unavailable fields do not constitute an exhaustive proof.
3. Add explicit completed-curve/real-reserve purchasability scrutiny to any future active proposal. My selected80 scored entries used curve states and had no giant returns, but curve venue alone is not proof of buyability. Any new guard would be a disclosed revised rule, not a silent alteration of Phase A outputs.
4. Keep the useful distinction between fixed evaluator assumptions and actual execution. Rev4 fixes the fee scenarios, so it is not appropriate to repeat Round1's fee-evidence objection as a reason the present evaluator cannot calculate results. Its completion, tier-time and coverage limitations still constrain interpretation.
5. Rank existing finalisation/completion records and historical latency/account evidence higher. I would not request live calibration trades. More pre-test days and time-stamped creator histories remain useful; I would not treat a retrospective graduation flag as a valid signal.
6. Preserve my early-selection/unchanged-later-check discipline. FTC refinements viewed on both halves should be labelled exploration; my own negative later check remains a negative result, not an opportunity to tune a replacement.

An additional **frozen evaluator caveat** emerged during code review: run_launch tests pre-buffer overflow *before* invoking decide(). A synthetic retained launch with12,001 pre-promotion rows returns **unknown: pre-promotion buffer exceeded even with decide=False and no decision times**. Thus a literal no-entry module is not guaranteed a numerical zero on every malformed launch under this implementation. The intended economic result of no trades is zero; I recommend the owner verify the formal no-active-rule translation without changing any frozen policy or silently patching the evaluator. The counterexample is recorded in phase_b/abstain_buffer_counterexample.json. This does not reopen Round1 or use its test outcomes.

## 5. Selection recommendation and reproducibility scope

**I recommend “none supported.”** FTC-R0 fails the lower confidence test even atK=1, loses at0.02 SOL in both halves, has unexposed creator data, and has608 timing-unverified tier-based attempts. Its marginal H2 lower total is fee-sensitive. My selected acceleration rule failed its unchanged later check. Regime buckets, corrected conditional means and peer agreement provide no untouched-test support for an active rule.

This critique does not freeze a replacement active rule or alter either Phase A report. Formal Phase C should publish one no-active-rule declaration/module with its actual timestamp and agreed translation before10Nov00:00. If an active owner candidate is supplied, it needs its own disclosed analysis, known-time features, complete exits and completion/availability checks; no retrospective jackpot censoring or evaluator patch is implied here.

Phase B calculations are replications/audits, not a new optimisation search: the two retention offsets and ten listed exits reproduce Stage A; FTC and plain-hold variants are checked under two fees/two sizes; four named mints and one synthetic no-entry case test specific claims. No new trading thresholds were selected. Phase A's72 attempts are not reset or relabelled by this work.

See **codex_r2/phase_b/README.md** for runnable commands, **reproduction.json** for Stage A/FTC metrics and resize cohort, **candidate_frozen_summary.json** for direct frozen candidate scoring, **artifact_checks.json** for raw rows and all four mint replays, and **unconditional_frozen_summary.json** for the unconditional cross-check. Fable source at the pinned commit is required; no source/evaluator/data modifications are hidden in the reproduction.
