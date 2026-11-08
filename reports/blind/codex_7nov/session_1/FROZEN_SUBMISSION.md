# Session 1 — frozen independent submission

Frozen at **2026-11-07T15:12:02.845754+00:00**. Development source: `bsc-volume-alert/Top-coins-Bot`, branch `entry-package-7nov`, commit `0e3be03c71949e069a7a31b5951f332bb563f68f`. The coordinator verified all three SHA256SUMS sets. I read INDEX.md and both package manifests fully, including their corrections and limitations. The required snapshot manifest itself contains descriptive previous-book results; I did not use these as guidance, read book definitions, or inspect any other analyst's work. No live trading or bot changes.

## Frozen decision

**No profitable rule is supported by this analysis. Submit no trading strategy.** This is an evidence limitation and a negative result for one simple candidate, not proof that no profitable strategy exists.

If a machine-readable submission is required, the sole primary policy is **ABSTAIN_ALWAYS**: on every launch and at every time return `NO_ENTRY`, independently for 0.2 SOL and 0.02 SOL. Allocate no capital; open no position; never retry, re-enter, partially exit, or trade at migration. Exit and horizon are inapplicable because positions are never created. A migration leaves the decision `NO_ENTRY`. This policy has zero P&L and zero peak concurrency. It is not a claimed profitable rule and cannot pass the positive lower confidence bound test. No alternate primary policy is submitted.

## Development design and what was tried

One entry/exit candidate was examined, with **no threshold search, no feature sweep, no exit tuning and no post-validation revision**. Its only market feature was cumulative gross buys observed by receipt time; launch creation time sets the clock. Fixed constants: 15 SOL retention threshold (required by collection), decision age 60 s, buy landing +1 s, exit horizon age 120 s, and the two mandated stakes. One abstention policy was selected after this candidate failed. Two stakes are separate evaluations, not separate searched rules. No funding, bundle, creator, holder, wallet-classification, or previous-book signals were searched.

Before computing outcomes, I split the 1,247 supplement-covered mints at their median creation timestamp: **2026-11-06T17:26:15+00:00**. Earlier means create_ts below the split (623); later means at or after it (624). The same one candidate was checked in both halves. The later half was not used to tune anything. This split uses the selected supplement census, not the full launch census or the evaluator's common N.

Diagnostic candidate, for reproducibility only: at launch age 60 s, attempt one buy only if deduplicated buy trades received by that time sum to at least 15 SOL. Eligibility crossing uses receipt order; no tier-1 exception is inferred from overwritten fields. Use the last chain-ordered state with block timestamp at or before age 61 s. Exit the entire position on the state at age 120 s; this is a fixed horizon, so no trigger-plus-700-ms sell is added. Each stake buys its own token amount and exits that entire amount. If migration precedes either execution state, mark that candidate outcome unavailable: pool fee and decimal validation cannot be established here. In a complete validated dataset the intended timed exit would follow the token into its verified wrapped-SOL pool; this diagnostic is not submitted for future scoring.

Rows are ordered by (slot, ev_idx null-first, row_id). Deduplication uses mint, signature, wallet, side, SOL and token amounts, venue, virtual reserves and raw pool reserves, retaining the first copy. It never deduplicates merely by signature. Trades lacking recv_ms do not establish operational eligibility. Missing execution reserves, invalid curve states, order contradictions, logged gap/outage overlaps and unvalidated pool states stay unknown. Own trades do not change the recorded future state.

## Development results

**These are diagnostic reserve calculations, not valid evaluator scores or demonstrated live returns.** The calculations assume a 1.25% fee on both curve legs plus 0.0015 SOL fixed round trip. For stake S and virtual reserves (Q,V), tokens = V·(0.9875S)/(Q+0.9875S); sell proceeds = Q_exit·tokens/(V_exit+tokens)·0.9875. This explicitly includes constant-product price impact. Exact per-venue on-chain fee evidence and affirmative complete-capture evidence are unavailable in these files. Therefore all candidate attempts are strictly uncertain under the brief, even where the diagnostic can compute a number. The two point-estimate sizes have independent token quantities; neither uses the other's exit trigger.

| Measure | Earlier | Later |
|---|---:|---:|
| Selected mints | 623 | 624 |
| Candidate attempts, one per mint | 462 | 594 |
| Diagnostic calculable outcomes | 455 | 422 |
| Diagnostic unknowns | 7 (1.52%) | 172 (28.96%) |
| Strictly validated outcomes | 0 | 0 |
| Strictly uncertain attempts | 462 (100%) | 594 (100%) |
| Candidate non-attempts in selected census | 161 | 30 |
| Peak simultaneous candidate attempted positions | 6 | 5 |

Unknowns are retained in the denominator; the later-half diagnostic alone exceeds the 10% unknown limit. Strict scoring is unavailable in both halves. Counts do not imply the other selected mints are known deliberate abstentions in the full operational universe: missing receipt records can conceal retention, and the common fully captured N cannot be reconstructed from the selected supplement.

| Stake / half | Net SOL on diagnostic calculable entries | Mean return | Median return | Win rate | 95% CI of mean return | Net SOL without best mint | Loss ≥50% |
|---|---:|---:|---:|---:|---|---:|---:|
| 0.2 / earlier | -4.727523 | -5.20% | -3.57% | 37.58% | [-9.73%, -0.39%] | -5.886093 | 19.34% |
| 0.02 / earlier | -1.035058 | -11.37% | -10.02% | 32.31% | [-15.82%, -6.46%] | -1.151741 | 20.22% |
| 0.2 / later | -1.243930 | -1.47% | -3.72% | 43.84% | [-6.01%, 3.18%] | -1.712209 | 17.06% |
| 0.02 / later | -0.634281 | -7.52% | -10.02% | 40.28% | [-12.18%, -2.76%] | -0.680822 | 19.67% |

Intervals use 10,000 launch-level bootstrap resamples, NumPy default_rng seed 20261108. These are conditional on calculable outcomes and consequently cannot be used as valid profitability tests. They are per unique mint, one position per size; there is no position duplication across books.

For additional transparency, the selected-census diagnostic lower-bound calculation assigns every diagnostic unknown −(stake+0.0015) and each selected non-attempt zero. This denominator is NOT the evaluator's common N. Results in SOL per selected mint:

| Stake | Earlier lower-bound mean | Earlier one-sided 95% lower bound | Later lower-bound mean | Later one-sided 95% lower bound |
|---|---:|---:|---:|---:|
| 0.2 | -0.009852 | -0.015556 | -0.057535 | -0.065324 |
| 0.02 | -0.001903 | -0.002471 | -0.006943 | -0.007740 |

No Bonferroni support claim is made. K is the final number of strategies submitted across sessions, which this independent analyst does not know. All displayed lower bounds are already below zero at the unadjusted one-sided 95% level. Treating every attempt as strictly uncertain is still worse: −0.149427/−0.191812 SOL per selected mint at 0.2 SOL (earlier/later), and −0.015944/−0.020466 at 0.02 SOL. These are conservative audit bounds, not losses asserted to have occurred.

For ABSTAIN_ALWAYS, both development halves have zero entries, zero unknown attempted entries, zero net SOL and zero concurrency. Mean/median per entry, win rate, worst-loss rate and result without best entry are undefined because there are no entries. Its per-launch return and any bootstrap interval are exactly zero for any nonempty valid common N.

## Raw-record audit and risks

The six raw trade files contained 4,241,610 rows. The full fingerprint removed 1,104,147 repeated rows, leaving 3,137,463 unique records. Of those, 82,145 lack recv_ms, 84,440 lack one or both execution reserves, and 2,309,285 are pool rows. This is deduplication under the stated fingerprint, not a claim that a signature is one trade. The selected census has 64 mints without exported rows and 22 read-count reconciliation mismatches. Earlier-half 108 mints have at least one missing receipt field; later-half zero do.

The diagnostic unknown reasons overlap: earlier, two buy and two sell states lack reserves, one mint has a chain/block-time ordering contradiction, and four overlap a logged outage/gap. Later, 159 buy and 163 sell states use unvalidated pools, two buy and two sell states fail curve-reserve checks, two mints have ordering contradictions, and ten overlap logged outages/gaps. A clean gap log does not establish complete capture. I conservatively exclude intervals overlapping either feed's known gap, plus the manifest's known tracker outages and the 21:40–21:45 resize.

The export includes only mints some old strategy entered, so the sample is selected on past decisions and cannot establish profitability on every retained launch. Lifecycle checkpoints do not repair trade-level execution histories or exact receipt-time decisions. The pre-promotion buffer, exact finalisation knowledge and per-mint positive capture evidence also cannot be fully certified from the export. Pool base_dec=6 is an assumption in the decoder, not independent mint verification, and the trade schema contains no per-pool fee configuration. Unknowns cannot become profitable by omission.

Even under the less stringent diagnostic assumptions the simple candidate loses in both time halves and at both sizes. Small-stake fixed costs materially hurt returns. A broader search might find a pattern, but conducting one on this selected, incompletely validated population would increase selection and execution risks; this one-candidate analysis does not establish that every possible rule fails.

## What would change my mind

Existing records sufficient to reconstruct a complete retained-launch development population, contemporaneous retention/finalisation times, affirmative capture and restart coverage, all deduplicated receipt-stamped trades through each horizon, verified mint decimals, wrapped-SOL pool identity and on-chain fee configuration would permit a valid after-cost replay. The owner may provide additional existing exports; no new collection or bot modification is requested. A precise precommitted candidate would then need to survive a chronological check and the untouched 8–10 Nov launch test with the fixed evaluator, launch-level lower-bound bootstrap and multiplicity correction. This submission does not claim those future results.

## Reproduction and freeze

Run `python3 /workspace/session_1/analyze.py` with Python 3 and NumPy. Inputs are read-only. It writes summary.json, diagnostic_entries.json and mint_audit.json. No other analyst's files are read. The report and reproducibility artifacts are frozen via FREEZE_SHA256SUMS.txt. Do not amend this policy in response to other analysts or hidden-test outcomes.
