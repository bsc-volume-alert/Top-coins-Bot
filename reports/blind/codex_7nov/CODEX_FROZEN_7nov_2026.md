# Codex — single final frozen submission, 7 November 2026

**Frozen at 2026-11-07T15:22:48.149794+00:00. Final decision: NONE SUPPORTED.**

This is the one submission for Codex as a whole. Three internal Codex analysts supplied development research; they are not three externally submitted rules. Claude and Gemini are separate analysts. No Claude or Gemini findings or hidden-test outcomes were read. The internal reports below were frozen independently before the coordinator read them. Their labels “submission” and references to a session-level K are historical internal wording; this opening specification governs the single Codex submission. The evaluator determines K across all externally submitted rules.

## Sole primary policy

For every launch created in [2026-11-08 00:00:00 UTC, 2026-11-10 00:00:00 UTC), at every decision time, return NO_ENTRY. Apply independently to both the 0.2 SOL and 0.02 SOL scoring arms. Allocate zero capital. There are no positions, exit triggers, horizons, partial exits, retries or re-entries. Curve-to-pool migration leaves NO_ENTRY unchanged. No active candidate in the appendices is submitted as an alternate.

For any nonempty certified common universe N: scored entries (a)=0, deliberate abstentions (b)=N, unknown outcomes (c)=0; total net SOL, mean score, lower-bound score, confidence bounds and peak concurrency are zero. Per-entry mean/median, win rate and worst-loss rate are undefined because there are no entries. Removing a best coin changes nothing. If N=0, normalized scores are undefined. This policy cannot have a lower confidence bound above zero and is not claimed profitable. “None supported” means this research found no defensible profitable rule, not that all possible trading rules have been disproved.

## Selection from development data only

The three independently prespecified active candidates all failed: each had negative mean diagnostic returns in both chronological halves at both sizes. No positive candidate was available to choose. Consequently Codex selects none supported. There was no coordinator threshold search or new candidate after reading the internal reports. Both halves are development data; the future launch interval has not occurred. This policy must not be revised using its results.

| Internal candidate | Split UTC | Receipt-aware 0.2 SOL diagnostic mean, earlier / later | Receipt-aware 0.02 SOL diagnostic mean, earlier / later |
|---|---|---:|---:|
| 1: gross buys >=15 SOL at age 60s; exit age 120s | 6 Nov 17:26:15 (median selected mint) | -5.20% / -1.47% | -11.37% / -7.52% |
| 2: gross >=15, net >0, curve at age 60s; exit age 120s | 6 Nov 13:25:27.5 (time midpoint) | Not computed as an operational return replay; event-time diagnostic -5.57% / -2.69% | Event-time diagnostic -11.72% / -8.79% |
| 3: gross >=15, net >=10, buyers >=20, curve at age 60s; exit age 120s or migration trigger | 6 Nov 13:25:27.5 (time midpoint) | -12.46% / -6.35% | -18.63% / -12.48% |

These are selected-population, assumed-fee, conditional reserve diagnostics, not official scores. They are not pooled across analysts. Different filters, timing modes, split choices and implementation assumptions mean their values are not directly comparable strategy rankings. The complete reports preserve counts, missing outcomes, costs, intervals, without-best results and loss rates. Exact on-chain fee/config and affirmative capture evidence are not certified. The official common N cannot be reconstructed from prior-book-entry-only histories. Therefore no active candidate has a valid official lower-bound profitability test here, independently of its negative diagnostics.

## Total search accounting

Codex examined **three active candidate specifications**, each with **one fixed parameter tuple**, **no threshold grids**, **no exit tuning**, and the two mandated sizes. The only final policy is abstention. Four distinct market inputs were used across these candidates: cumulative gross buy SOL, cumulative net buy SOL, distinct buying wallets and current venue. Launch age and receipt time provide clocks; reserves and curve ceilings are validity/execution inputs. Market thresholds across the candidates were gross >=15 SOL (collection requirement), net >0 or >=10 SOL, and buyers >=20. All decided at age 60s, landed at +1s and used age 120s horizons; candidate 3 also had a migration-triggered full exit at +0.7s. No funding, creator, bundle, holder, farm or other wallet-classification signal was searched. Candidate 3 additionally computed an event-time mode; candidate 2 used event-time outcome diagnostics and separately audited receipt-known eligibility. These calculations are disclosed, not extra submissions. No historical-book return was used to choose a candidate. Each report discloses its own search and validity corrections.

## Evidence, risks and what is needed

Data: bsc-volume-alert/Top-coins-Bot, entry-package-7nov at **0e3be03c71949e069a7a31b5951f332bb563f68f**. Exact brief: reports/blind/BRIEF_7nov.md at **cf86e7604870422d7b634f0e8f4ecf88bc9824d0**. All root, snapshot3 and current SHA256SUMS lists passed. The six trade parts contain 4,241,610 rows for a selected 1,247-mint population; 64 mints have no histories and 22 have export reconciliation mismatches. The analysts each removed 1,104,147 full-fingerprint duplicates, never deduplicating by signature alone. Required manifests and INDEX corrections were read. No bot changes, live trades or new collection were requested.

The negative diagnostics reject these candidates under their illustrative assumptions. Selection into earlier books, missing receipt times, ambiguous capture, restarts, pre-retention buffers, pool decimals and historical fee evidence prevent stronger inference. Hypothetical landing latency and the assumption that our trades do not change later prices also limit replay claims. Multiple internal attempts and correlated launch regimes increase overfitting risk; three negative results do not establish a universal impossibility.

A stronger assessment needs existing raw histories for every retained launch; contemporaneous retention/finalisation and receipt times; affirmative complete-capture/restart/buffer evidence; validated token decimals, wrapped-SOL quote identity and historical on-chain venue/creator fees; reconciled execution states; and the immutable evaluator and edge-case tests. Supplying existing evidence is sufficient; this submission does not request code changes or new collection. Ultimately only a precise precommitted active rule tested on an untouched period under the stated lower-bound and multiplicity test could establish support. This frozen Codex conclusion stays fixed for the designated test.

## Internal development reports and reproducibility

The following reports are evidence appendices, not additional submitted rules. Their frozen SHA256 digests identify the original internal documents. Source scripts follow as code blocks so this one new file preserves the calculations. To rerun, extract each script into its corresponding /workspace/session_N directory and retain the data checkout at /workspace/entry-package-7nov; use Python 3 and NumPy. Analysis artifacts already exist locally in those directories. No rerun is required to interpret the frozen no-entry policy.


---

## Evidence appendix 1

Original internal report SHA256: `c067c36d7de3848d4b2363035e8c16041bc088090a8e29970182f1b6fb128965`.

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


---

## Evidence appendix 2

Original internal report SHA256: `6df85eeb369e4c785c2bcb99a019949be30808fb06b1fd30b11718c6fa8d5182`.

# Session 2 — independent frozen submission

Frozen at **2026-11-07T15:13:35.751011+00:00**. Paper research only. **No profitable trading rule is supported by this analysis. The submitted primary policy is abstain on every launch.** This is a research conclusion, not a proof that profitable rules cannot exist.

## Exact frozen primary policy

For every mint in the common eligible test universe of launches created in [2026-11-08 00:00:00 UTC, 2026-11-10 00:00:00 UTC), emit no entry at any time. Allocate 0 SOL and open no position, for both the 0.2 SOL and 0.02 SOL evaluation arms. There are no exit triggers, migrations to handle, partial exits, retries or re-entries because there are no holdings. Migration does not change abstention. Classify every mint in the evaluator's N as deliberate abstention (b); (a)=0, (b)=N, (c)=0. Total net SOL, point score and worst-case lower-bound score are exactly 0, for any N>0. If N=0 the normalized score is undefined. All launch-resampling confidence bounds are 0 when N>0, so this policy is **not** a statistically supported profitable rule. Peak concurrency is 0; per-entry mean, median, win rate, worst-loss rate and without-best-entry statistics are undefined because no entries exist. Unconstrained portfolio convention.

This is the only submitted primary policy. The rejected candidate described below is not an alternate submission.

## Provenance and independence

User brief: immutable commit cf86e7604870422d7b634f0e8f4ecf88bc9824d0, reports/blind/BRIEF_7nov.md (revised 15:05 UTC). Data branch entry-package-7nov, commit **0e3be03c71949e069a7a31b5951f332bb563f68f**. Read INDEX.md first, then both full MANIFEST.md files, snapshot3/RECONCILIATION.txt and current/deploy_log.txt. Coordinator reported all top-level, snapshot3 and current checksums valid and no AGENTS.md in checkout. Independently inspected raw trade, coverage, feed-event and census records. No other analyst's findings were received or read before this freeze. Existing book summaries in the mandated manifest/reconciliation were encountered as historical documentation; no book return was used to select this candidate.

The preanalysis plan was written before returns were computed. Reproduce with Python 3 + NumPy, running analyze.py, coverage_audit.py, summarize.py and gaps.py from this directory. Scripts read only the shared immutable checkout and write only this session directory. No bot code was changed and no trades were placed.

## Development design and search accounting

Exactly **one trading-rule family, one parameter set, one entry time, one exit horizon, and two mandated sizes** were examined. No threshold grid, alternative exits, adaptive filters or optimization. The family uses gross cumulative buy volume, net buy volume, current venue and reserve/price validity. Creation time defines the fixed clock; receipt timestamp distinguishes known information. The numerical signal thresholds are gross buys >=15 SOL and net buys >0 SOL; venue must be curve. Decision at creation+60s, buy state at creation+61s, full exit at creation+120s. The 4.11e-7 SOL/token curve ceiling and positive-reserve checks are validity conditions taken from the brief, not fitted thresholds. No creator, funding, bundle, wallet or historical book features were screened. One assumed cost configuration, not a fee grid. The final abstention policy is the second policy considered, with no return-dependent parameters.

A potential operational candidate would require eligibility established by received gross buy volume >=15 SOL by the decision, positive receipt-known net buys, and a valid receipt-known curve state. Its exit horizon would remain fixed through migration, liquidating on the destination venue at the horizon. Its pool economics could not be validated here; pool exits are unavailable rather than assigned invented decimals or fees. This candidate was rejected, not frozen for test entry.

The actual numerical diagnostic is an **event-time, assumed-fee, selected-population shadow**, not an operational replay. It applies the same signal to trades with block time <=creation+60s and takes the last state in (slot, ev_idx, row_id) order at or before the two execution times. No state is moved to a later trade. It prices both legs against the historical reserves, with no persistent effect of our trade on the subsequent path. Curve reserves are lamports and raw token units. Buy tokens = Y * a/(X+a), a = stake*1e9/1.0125. Exit SOL = X_exit*tokens/(Y_exit+tokens)*0.9875/1e9. Net SOL subtracts stake and fixed 0.0015 SOL. Thus 1.25% is explicitly an illustrative curve fee assumption, not verified on-chain config; it is not sufficient for the official evaluator. For non-curve/invalid pairs the conservative shadow assigns the full stake plus fixed fee as loss.

Rows were deduplicated by the brief's full economic fingerprint: mint, signature, wallet, side, SOL amount, token amount, venue and reserves; never by signature alone. Raw rows: 4,241,610; exact fingerprint duplicates removed: 1,104,147. Each surviving candidate has one entry per unique mint, so opportunity and position counts match. This shadow does not establish completeness of capture.

The time split was fixed before returns at Unix **1793971527.5**, 2026-11-06 13:25:27.500 UTC, the midpoint of the supplement's creation-time extent. Earlier half is development; later half is the unchanged check. Extent: 2026-11-05 12:19:32 through 2026-11-07 14:31:23 UTC. This is an equal-duration chronological split, not an equal-row split. No changes followed the later-half results.

## Raw population and coverage diagnostics

| Diagnostic | Earlier | Later |
|---|---:|---:|
| Census launches in this time range | 42,937 | 44,828 |
| Selected supplement mints | 411 | 836 |
| Selected mints with zero raw trades | 44 | 20 |
| Post-dedup raw trades | 273,707 | 2,863,756 |
| Rows missing receipt time | 82,145 | 0 |
| Rows missing reserves | 84,440 | 0 |
| Selected mints with export reconciliation mismatch | 0 | 22 |
| Event-time candidate signals | 255 | 640 |
| Receipt-known predicate signals | 253 | 640 |
| Candidate signals with any predecision missing receipt time | 0 | 0 |
| Candidate maximum predecision row count | 1,067 | 1,494 |
| Candidate spans overlapping logged gaps/documented outage | 2 | 11 |
| Candidate mints with reconciliation mismatch | 0 | 5 |

The census is the union of snapshot3 and current records restricted to the supplement time extent, not the evaluator N. The supplement contains only mints entered by an earlier book. A census launch without a supplement stream is not necessarily ineligible and cannot be given a fabricated zero-return or unavailable-fill classification. The common retained-and-covered denominator **cannot be reconstructed for every launch from these selected histories**. Net-screened flags were not substituted for gross-retention times. Two early predicate decisions differ between receipt and event time even though candidate predecision receipts are present.

There were no within-mint ordering contradictions found in this export after the stated deduplication. The selected candidate predecision row counts are below 12,000, but this alone does not certify an untruncated pre-promotion buffer. Feed close/idle intervals were closed only at a subsequent open; the outage list and documented 21:40–21:45 resize window were added. Absence of such overlap is not proof of complete capture. The delivered max_gap_s is ambiguous between inactivity and capture loss. I cannot certify continuous capture for all candidate spans from the exported metadata, and I have not silently declared gap-free rows valid.

Per-token decimals are explicitly absent. Pool base_dec=6 in ps-0.19.9 is a decoder assumption, not mint evidence. The historical fee configuration needed for an official reserve replay is also not validated by these files. The raw shadow is therefore kept separate from official outcomes throughout.

## Development results: rejected diagnostic candidate

These are conditional-on-selected-mints **hypothetical shadow** statistics. “Valid curve pair” below means only both reserve snapshots pass the local numerical checks; it does **not** mean certified capture or official scorable entry. Both sizes independently receive the same fixed time exit, so a 0.02 SOL position does not inherit a price trigger from a 0.2 SOL position.

| Size | Half | Curve pairs / attempted signals | Net SOL on pairs | Mean net SOL / pair | Median net SOL / pair | Mean return | Median return | Win rate | Mean-return 95% interval | Net SOL without best mint | Loss >=50% | Peak concurrent signals |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| 0.2 | early | 255/255 | -2.838983 | -0.011133 | -0.007106 | -5.57% | -3.55% | 36.08% | [-12.10%, 1.83%] | -3.997762 | 20.39% | 6 |
| 0.2 | late | 636/640 | -3.421776 | -0.005380 | -0.007106 | -2.69% | -3.55% | 42.14% | [-6.38%, 1.03%] | -3.890158 | 17.45% | 5 |
| 0.02 | early | 255/255 | -0.597778 | -0.002344 | -0.002001 | -11.72% | -10.00% | 30.98% | [-18.31%, -4.22%] | -0.714482 | 21.57% | 6 |
| 0.02 | late | 636/640 | -1.117772 | -0.001758 | -0.002001 | -8.79% | -10.00% | 37.74% | [-12.51%, -5.03%] | -1.164324 | 19.50% | 5 |

No signals were dropped from the conservative diagnostic. The 4 later signals with non-curve/invalid pair states receive worst-case losses: -0.2015 SOL at 0.2 and -0.0215 SOL at 0.02. Earlier conservative totals equal the pair totals; later conservative totals are -4.227776 SOL and -1.203772 SOL respectively. Conservative mean returns across all later attempts are -3.30% and -9.40%; 95% intervals are [-6.95%, +0.41%] and [-13.09%, -5.65%]. Win rates across all later attempts are 41.875% and 37.5%, and >=50% loss rates are 17.969% and 20.0%. Without the best mint, later conservative totals are -4.696158 SOL and -1.250324 SOL. No known losing entry was removed to improve the outcome.

Intervals use 10,000 independent launch resamples, NumPy default_rng seed 20261108. They describe conditional shadow mean return per attempted or numerically valid entry, as labeled. They are **not** the official Bonferroni-adjusted interval on lower-bound SOL/common N: common N and certified outcomes are unavailable. The same limitation prevents valid reporting of official (a)/(b)/(c) counts or an official >10% unknown-outcome eligibility test for this candidate. Reporting 255/255 and 636/640 as official scoreable fills would be wrong. No operational profitability interval is claimed.

For the submitted abstention rule both development halves have zero entries, zero SOL P&L and zero concurrent positions by construction. For any certified nonempty development denominator its mean launch score, lower bound and confidence interval are all exactly zero. Per-entry return statistics are undefined. Missing common-N data cannot alter the cash result of taking no trades.

## Belief, limits and what would change it

The single simple gross-volume/positive-net curve-entry rule examined here loses after the stated illustrative costs in both time halves, at both sizes. Its late-half check gives no basis to claim profitability; even the conditional 0.2 SOL shadow mean interval includes zero, and the 0.02 SOL shadow mean is negative throughout its interval. No threshold rescue was attempted. This does not establish that all pump.fun strategies lose, or that this family cannot work at different parameters; it establishes that this analysis did not identify a defensible profitable rule.

The strongest additional limitations are selection into prior-book histories, unknown capture completeness, changing tracker/launcher collection epochs, incomplete token-decimal and fee evidence, and event-time/receipt-time differences. Launch-level bootstrap also ignores possible correlation among launches in the same market regime. Development inference is not the future test. The counterfactual replay ignores our persistent market impact and live landing uncertainty.

What would change my conclusion: a precisely specified candidate with positive lower-bound evidence in an untouched chronological sample and, ultimately, the brief's future 8–10 Nov test with the evaluator frozen in advance. Existing data that would permit a stronger development assessment are: all retained launch streams rather than prior-entry-only streams; contemporaneous receipt times and retention/finalization timestamps; evidence of uninterrupted capture and buffer limits for every execution span; verified mint decimals, quote assets and historical venue fee config; and the immutable evaluator with its required edge-case tests. If these already exist, supplying them is sufficient; I request no new collection, live trading or bot changes. Later evidence cannot change this frozen submission for the designated test period.


---

## Evidence appendix 3

Original internal report SHA256: `d4b499ede1afc28ad31b82dd866a5143202b141e376813c53b6667564e7aec40`.

# Independent session 3 — frozen submission

**Frozen at 2026-11-07T15:12:55+00:00. Decision: no profitable rule is supported by this analysis.** This is a paper-research conclusion, not a claim that profitable rules cannot exist. I submit no active trading rule. The only frozen policy is deliberate abstention: for every mint, at every age, place no entry at either 0.2 or 0.02 SOL; therefore there are no exits, migration actions, re-entries, retries, positions or fees. Its score is zero, never evidence of profitability. This conclusion and policy must not be revised using 8–10 November outcomes.

## Independence and provenance

I used raw records only and did not read either other session's work or conclusions. I read INDEX.md and both complete MANIFEST.md files, applied the corrections in INDEX.md, and inspected the deployment log. Data branch `entry-package-7nov`, commit `0e3be03c71949e069a7a31b5951f332bb563f68f`. The coordinator independently verified all three SHA256SUMS lists successfully; I confirmed the checkout commit. Required brief: immutable GitHub revision `cf86e7604870422d7b634f0e8f4ecf88bc9824d0`, `reports/blind/BRIEF_7nov.md`, revised 15:05 UTC. No bot or source data was modified, and no trading was requested or performed.

## Development design and all search performed

One candidate rule family was fixed in `protocol.md` before calculating returns. There was no threshold sweep, optimization, feature selection, or selection among historical book results. The creation-time midpoint of the supplement population fixed the split before return calculation: **2026-11-06 13:25:27.500000+00:00**. Earlier launches screened the prespecified candidate; later launches checked the identical candidate. Neither half caused a parameter revision. Both halves remain development data, not the hidden test.

Exactly **one candidate**, **one parameter tuple**, **four entry features** (received gross buying, received net buying, distinct received buying wallets, current venue), **one exit policy**, **two required position sizes** were tried. The same candidate was also calculated once using event time as a separate hypothetical timing diagnostic; this is two replay modes, not two models selected by performance. Creation age is the decision clock. Fixed thresholds: age 60 seconds, gross buys 15 SOL, net buys 10 SOL, 20 distinct buying wallets, forced horizon at age 120 seconds; fixed required delays 1 second buy and 0.7 seconds migration sell. The fee assumption used only for diagnostics was 1.25% each leg plus 0.0015 SOL fixed. No funding, creator, bundle, wallet classification, historical-book return or future peak feature was used. Final no-entry policy is the second, trivial policy considered; it was selected because no positive active policy was supported, not because it produces positive returns.

### Candidate specification (rejected, not a submitted alternate)

At `creation + 60s`, use only deduplicated trades received by that instant (`recv_ms <= decision_ms`); missing receipt times contribute no known observation. Sum SOL of all buys as gross buying, subtract all sells for net buying, and count distinct buying wallets. Attempt one entry only if gross >=15 SOL, net >=10 SOL, buyers >=20, and the latest known state is a curve. Gross >=15 is a conservative, receipt-time retention witness; no bundle shortcut is used. There is no retry if a condition fails. Empty historical venue labels are treated as curve only because the manifest states those rows were curve by construction.

Entry is valued on the last chain state in `(slot, ev_idx, row_id)` order with block time <= decision+1s. Each size exits completely at age 120s; if a migration is first observed before then, trigger a complete sale on the pool and value it as of receipt trigger+0.7s, subject to pool/config validation. No partial exit or re-entry. Each size has its own reserve-impact calculation and complete exit. A missing or uncertain state is unknown, not a later fill. The horizon is already the forced landing time; no extra delay is added to it.

For conditional curve diagnostics, convert raw reserves to SOL and whole tokens. Buy tokens = `y * (stake * .9875) / (x + stake * .9875)`. Sell proceeds = `x_exit * tokens / (y_exit + tokens) * .9875`. Net SOL = proceeds - stake - .0015. This assumes fees and standard constant-product state semantics; it does **not** validate fee configuration. The recorded future price path is not changed by the hypothetical trade.

## Raw-data audit and limits

The supplement contains 1,247 selected mints; I audited all 4,241,610 raw rows belonging to 1,183 mints with histories. There are 64 mints with no histories and 22 per-mint export reconciliation mismatches. The earlier half has 411 selected mints, including 44 without rows; the later half has 836, including 20 without rows. Diagnostic tables below cover only 367/816 mints with rows, respectively, and cannot silently count the missing 44/20 as abstentions.

Full fingerprints `(mint, signature, wallet, side, amounts, venue, reserves)` remove 1,104,147 duplicate rows. After that deduplication, 82,145 rows have no receipt time and 84,440 have missing reserves. Three mints have decreasing block timestamps in canonical chain order; any affected attempted candidate outcome is excluded from diagnostics. Known tracker outages and close/idle-to-next-open intervals are excluded. Nonpositive/missing reserves, impossible standard-curve prices, unvalidated pool states, and streams ending before the horizon are excluded. A quiet terminal stretch is conservatively labelled unavailable; it is not moved to a later trade. Diagnostic exclusions and per-mint audit records are retained in CSVs.

The current launch census has 83,856 rows, 83,161 in the supplement's creation-time range. The 1,247 histories are selected because some previous book entered them. They are not all retained launches, and the census does not by itself identify all launches eligible under receipt-time retention and complete coverage. Missing capture is not inactivity. There is no independent evidence here establishing complete capture over each quiet landing interval, no historical per-token decimal verification, and no per-state creator/venue fee-config evidence in the trade columns. The 12,000-row pre-retention buffer and all actual restart spans cannot be certified from these exports alone. Pool decimals were assumed by the original decoder. A receipt-aware candidate calculation therefore still does not constitute an operationally valid scored result.

## Development results — conditional diagnostics only

The following results condition on a recorded, apparently usable curve path, assume the stated fee, and exclude known missing outcomes. **They are not official scored entries, not a common-N score, and not evidence of support.** Each mint has at most one entry in each replay mode, so position counts equal unique-coin counts. Values are stake returns after the assumed costs; 95% intervals bootstrap the diagnostic coins 10,000 times with seed 20261108. These conditional intervals do not include missing-outcome or selection uncertainty and are not the brief's Bonferroni test.

| Timing | Half | Size SOL | Diagnostic coins | Mean | Median | Win | 95% mean interval | Mean without best | Loss ≥50% | Total net SOL |
|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|
| event | early | 0.2 | 183 | -9.05% | -5.05% | 44.26% | -17.77% to 0.88% | -12.28% | 27.87% | -3.3106 |
| event | early | 0.02 | 183 | -15.15% | -10.89% | 38.25% | -23.73% to -5.08% | -18.44% | 29.51% | -0.5545 |
| event | late | 0.2 | 537 | -5.89% | -3.92% | 44.51% | -9.74% to -2.26% | -6.17% | 19.93% | -6.3266 |
| event | late | 0.02 | 537 | -12.01% | -10.06% | 39.85% | -15.80% to -8.19% | -12.30% | 22.16% | -1.2899 |
| receipt | early | 0.2 | 181 | -12.46% | -5.25% | 43.65% | -19.37% to -5.39% | -13.26% | 28.18% | -4.5116 |
| receipt | early | 0.02 | 181 | -18.63% | -11.14% | 37.57% | -25.54% to -11.66% | -19.43% | 29.83% | -0.6743 |
| receipt | late | 0.2 | 534 | -6.35% | -4.04% | 44.19% | -10.14% to -2.53% | -6.64% | 20.04% | -6.7843 |
| receipt | late | 0.02 | 534 | -12.48% | -10.07% | 39.51% | -16.20% to -8.85% | -12.77% | 22.28% | -1.3327 |

Attempt and diagnostic availability counts:

| Timing | Half | Histories | Attempts | Conditional paths | Other attempted outcomes | Abstentions within histories |
|---|---|---:|---:|---:|---:|---:|
| event | early | 367 | 289 | 183 | 106 | 78 |
| event | late | 816 | 567 | 537 | 30 | 249 |
| receipt | early | 367 | 190 | 181 | 9 | 177 |
| receipt | late | 816 | 564 | 534 | 30 | 252 |

The apparently usable outcomes are negative in both halves at both sizes. Removing the best coin worsens every mean. Earlier screening did not justify an active submission; the unchanged later check did not rescue it. Receipt-time treatment matters materially for which early launches are eligible. The event-time diagnostic remains separate and is never pooled with receipt-time results.

Exact exclusion counts are in `results.json`. Known unavailable paths are not winners and are not silently removed from any claimed common-N score: **no such score is claimed.** Even the conditional paths are uncertain under the stricter capture/config rules, so treating them as category (a) would be unjustified. For the active candidate, official counts (a)/(b)/(c), point/lower-bound score, portfolio concurrency and statistical support are **not identifiable** without a certified common universe and coverage evidence. Under the brief's conservative rule, all attempted outcomes lack full certification; the active candidate cannot establish the <=10% unknown-outcome requirement. A bootstrap of only available paths cannot repair that.

For the actual frozen no-entry policy, earlier and later development each have total net SOL 0, point score 0 and lower-bound score 0 for any positive common N, (a)=0, (b)=N, (c)=0, and peak concurrent positions 0. Mean/median/win rate/worst-loss rate per entered coin are undefined because there are no entries; 95% intervals for score are [0,0]. Result without best coin is still 0 because no coin was traded. It cannot have a confidence bound above zero for any K. No positive rule is claimed or submitted.

## Belief, risks and what would change it

The one simple receipt-aware flow rule tested here lost money in both development halves even under conditional fee/config assumptions. The smaller stake is especially harmed by fixed costs. This is enough to reject this candidate; it is not an exhaustive search of all possible strategies. Further threshold searching on the same selected sample would increase the chance of fitting noise, so I did not do it.

Existing records that would allow a stronger study are: raw trades for **every** retained launch, explicit retention/finalisation timestamps and pre-promotion buffer-overflow flags, receipt times throughout, a complete restart/subscription coverage ledger, validated mint decimals and venue/creator fee configuration at each execution state, and reconciled as-of exports. The universal lifecycle checkpoints cannot replace trade-level landing states or prove quiet-span capture. These are requests for existing evidence, not new bot code, collection or trading.

A new active rule would need positive results on representative development data with all unavailable outcomes counted conservatively, then a timestamped specification tested without revision on an untouched period under the frozen common evaluator. For this experiment only the future 8 Nov 00:00–10 Nov 00:00 UTC launches can supply that test; development results cannot be called future-test support. Existing pool/config and completeness uncertainty, selection bias, historical receipt-time differences, fixed latency assumptions, unconstrained capital and the counterfactual price path remain material risks.

## Reproduction and freeze

Run `python3 /workspace/session_3/analyze.py` against the stated unchanged data commit. `audit.csv` retains each mint's quality counts; `candidate.csv` retains every candidate decision and diagnostic status, including losses and exclusions; `results.json` holds all counts and metrics. `protocol.md` records the prespecified candidate before return calculation. A single implementation correction excluded event-order contradictions on three mints; this was a data-validity correction, not a new rule or threshold. No rule parameter was changed. The protocol's manually typed timestamp was corrected using its file creation timestamp before results were read.

This document is the complete frozen submission. Its UTC freeze timestamp is at the top. A SHA256 digest is saved alongside it; no external publication or git push is represented by the local freeze.


## Reproducibility source: session_1/analyze.py

```python
import csv,gzip,json,itertools,collections,datetime,pathlib,math
import numpy as np
P=pathlib.Path('/workspace/entry-package-7nov'); O=pathlib.Path('/workspace/session_1')
def read(f):
    with gzip.open(P/f,'rt') as h: yield from csv.DictReader(h)
cov={r['mint']:r for r in read('coverage_per_mint.csv.gz')}
creation=sorted(int(r['create_ts']) for r in cov.values())
split=creation[len(creation)//2] # Set before reading outcomes: chronological median of complete candidate census.
counts=collections.Counter(); mintstats=[]; results=[]
gaprows=list(read('feed_gaps_all.csv.gz')); gaps=[]; opened={}
for r in gaprows:
    ev=r['event']; family='pool' if ev.startswith('pool-') else 'curve'; ev=ev.removeprefix('pool-'); t=int(r['ts'])
    if ev in ('idle','closed') and family not in opened: opened[family]=t
    if ev=='open' and family in opened: gaps.append((opened.pop(family),t,family))
for family,t in opened.items():gaps.append((t,10**12,family))
# Known outages are exclusion intervals, not evidence of complete capture elsewhere.
def stamp(s):return int(datetime.datetime.fromisoformat(s).replace(tzinfo=datetime.timezone.utc).timestamp())
for a,b in [('2026-11-06T20:40','2026-11-06T20:42'),('2026-11-06T20:57','2026-11-06T21:06'),('2026-11-06T23:33','2026-11-06T23:35'),('2026-11-07T00:06','2026-11-07T00:08'),('2026-11-07T00:26:30','2026-11-07T00:27:30'),('2026-11-06T21:40','2026-11-06T21:45')]:gaps.append((stamp(a),stamp(b),'all'))
for f in sorted(P.glob('trades_part_*.csv.gz')):
  with gzip.open(f,'rt') as h:
   for mint,group in itertools.groupby(csv.DictReader(h),lambda r:r['mint']):
    rows=list(group); counts['raw_rows']+=len(rows); seen=set(); unique=[]
    for r in rows:
     fingerprint=tuple(r[k] for k in ('mint','sig','wallet','is_buy','sol','tokens','venue','vsol','vtok','pool_base_raw','pool_quote_raw'))
     if fingerprint in seen:counts['duplicate_rows']+=1;continue
     seen.add(fingerprint);unique.append(r)
     counts['unique_rows']+=1
     if not r['recv_ms']: counts['missing_receipt_rows']+=1
     if not r['vsol'] or not r['vtok']:counts['missing_reserves_rows']+=1
     if r['venue']=='pumpswap':counts['pool_rows']+=1
    rows=sorted(unique,key=lambda r:(int(r['slot']),int(r['ev_idx']) if r['ev_idx'] else -1,int(r['row_id'])))
    c=int(cov[mint]['create_ts']); half='earlier' if c<split else 'later'; decision=c+60; horizon=c+120
    gross=0; retain=None; missing=False; prebuffer=0
    # Receipt ordering is needed for real operational gross-volume eligibility.
    for r in sorted(rows,key=lambda r:float(r['recv_ms']) if r['recv_ms'] else float('inf')):
     if not r['recv_ms']:missing=True;continue
     if int(r['recv_ms'])>decision*1000:continue
     prebuffer+=1
     if r['is_buy']=='1':gross+=float(r['sol'])
     if gross>=15 and retain is None:retain=int(r['recv_ms'])/1000
    eligible=retain is not None
    stats={'mint':mint,'half':half,'create_ts':c,'rows':len(rows),'gross_known_60':gross,'eligible':eligible,'missing_any_receipt':missing,'prebuffer_60':prebuffer}
    mintstats.append(stats)
    if not eligible:continue
    res={'mint':mint,'half':half,'create_ts':c,'decision':decision,'horizon':horizon,'status':'unknown'}
    def state(t):
     rs=[r for r in rows if int(r['ts'])<=t]
     return rs[-1] if rs else None
    b=state(decision+1); s=state(horizon)
    reasons=[]
    if any(a<=horizon and z>=c for a,z,_ in gaps):reasons.append('logged_gap_or_outage')
    if any(int(rows[i]['ts'])<int(rows[i-1]['ts']) for i in range(1,len(rows))):reasons.append('time_order_contradiction')
    if prebuffer>12000:reasons.append('buffer_limit')
    for label,r in [('buy',b),('sell',s)]:
     if r is None:reasons.append(label+'_no_state');continue
     if r['venue']=='pumpswap':reasons.append(label+'_pool_unvalidated');continue
     if not r['vsol'] or not r['vtok']:reasons.append(label+'_no_reserves');continue
     q=float(r['vsol'])/1e9; v=float(r['vtok'])/1e6
     if q<=0 or v<=0 or q/v>4.11e-7:reasons.append(label+'_invalid_reserves')
    if not reasons:
     qb=float(b['vsol'])/1e9;vb=float(b['vtok'])/1e6;qs=float(s['vsol'])/1e9;vs=float(s['vtok'])/1e6
     for stake in (.2,.02):
      tokens=vb*(stake*.9875)/(qb+stake*.9875)
      proceeds=qs*tokens/(vs+tokens)*.9875
      res['net_'+str(stake)]=proceeds-stake-.0015
     res['status']='diagnostic_only'
    res['reasons']=reasons;results.append(res)
summary={'split_ts':split,'split_utc':datetime.datetime.fromtimestamp(split,datetime.timezone.utc).isoformat(),'coverage_mints':len(cov),'coverage_no_rows':sum(int(r['rows_exported'])==0 for r in cov.values()),'reconciliation_mismatch':sum(r['reconciled']!='1' for r in cov.values()),'counts':dict(counts),'gaps':gaps,'halves':{}}
rng=np.random.default_rng(20261108)
for half in ('earlier','later'):
 rs=[r for r in results if r['half']==half]; good=[r for r in rs if r['status']=='diagnostic_only']; n=sum(1 for r in cov.values() if ('earlier' if int(r['create_ts'])<split else 'later')==half)
 out={'selected_mints':n,'attempted':len(rs),'diagnostic_scored':len(good),'diagnostic_unknown':len(rs)-len(good),'unknown_reasons':dict(collections.Counter(x for r in rs for x in r['reasons']))}
 events=[]
 for r in rs:events.extend([(r['decision']+1,1),(r['horizon'],-1)])
 active=peak=0
 for t,d in sorted(events):active+=d;peak=max(peak,active)
 out['attempted_peak_concurrent']=peak
 out['mints_missing_any_receipt']=sum(r['half']==half and r['missing_any_receipt'] for r in mintstats)
 for size in (.2,.02):
  x=np.array([r['net_'+str(size)] for r in good]);returns=x/size
  if len(x):
   boot=np.array([rng.choice(returns,len(returns),replace=True).mean() for _ in range(10000)])
   # Unknowns cost full stake + fixed fee; selected-population denominator only.
   worst=np.r_[x,np.repeat(-size-.0015,len(rs)-len(good)),np.zeros(n-len(rs))]
   lb=np.array([rng.choice(worst,n,replace=True).mean() for _ in range(10000)])
   out[str(size)]={'net_sol':float(x.sum()),'mean_return':float(returns.mean()),'median_return':float(np.median(returns)),'win_rate':float((x>0).mean()),'mean_return_ci95':np.quantile(boot,[.025,.975]).tolist(),'net_without_best':float(x.sum()-x.max()),'loss_ge50_rate':float((returns<=-.5).mean()),'selected_lower_bound_per_launch':float(worst.mean()),'selected_lower_bound_one_sided95':float(np.quantile(lb,.05))}
 out['strict_validated_scored']=0;out['strict_unknown']=len(rs);summary['halves'][half]=out
(O/'summary.json').write_text(json.dumps(summary,indent=2))
(O/'diagnostic_entries.json').write_text(json.dumps(results,indent=2))
(O/'mint_audit.json').write_text(json.dumps(mintstats,indent=2))
print(json.dumps(summary,indent=2))

```


## Reproducibility source: session_2/analyze.py

```python
import csv,gzip,json,math
from pathlib import Path
from collections import Counter,defaultdict
import numpy as np
P=Path('/workspace/entry-package-7nov'); O=Path('/workspace/session_2')
coverage={x['mint']:x for x in csv.DictReader(gzip.open(P/'coverage_per_mint.csv.gz','rt'))}
ct=[int(x['create_ts']) for x in coverage.values() if x['create_ts']]; split=(min(ct)+max(ct))/2
counts=Counter(); halves={'early':Counter(),'late':Counter()}; records=[]
def valid(r):
 try:return r['venue']=='curve' and float(r['vsol'])>0 and float(r['vtok'])>0 and 0<float(r['price_sol'])<=4.11e-7
 except:return False
def process(mint,rows):
 c=coverage[mint]; create=int(c['create_ts']) if c['create_ts'] else None
 if create is None:counts['missing_create']+=1;return
 half='early' if create<split else 'late'; h=halves[half];h['selected_mints']+=1
 seen=set(); ded=[]; keys=[]
 for r in rows:
  key=tuple(r[k] for k in ['mint','sig','wallet','is_buy','sol','tokens','venue','vsol','vtok'])
  if key in seen: counts['full_fingerprint_duplicates']+=1;continue
  seen.add(key);ded.append(r)
  keys.append((int(r['slot']),int(r['ev_idx']) if r['ev_idx'] else -1,int(r['row_id'])))
 if keys!=sorted(keys):h['order_contradiction_mints']+=1
 rows=ded
 h['trade_rows']+=len(rows);h['missing_recv_rows']+=sum(not r['recv_ms'] for r in rows)
 h['missing_reserve_rows']+=sum(not r['vsol'] or not r['vtok'] for r in rows)
 h['pool_rows']+=sum(r['venue']=='pumpswap' for r in rows)
 h['assumed_decimal_pool_rows']+=sum(r['venue']=='pumpswap' and r['dec_ver']=='ps-0.19.9' for r in rows)
 h['reconciliation_mismatch_mints']+=int(c['reconciled']!='1')
 if not rows:h['zero_row_mints']+=1
 before=[r for r in rows if float(r['ts'])<=create+60]
 known=[r for r in rows if r['recv_ms'] and float(r['recv_ms'])<=1000*(create+60)]
 def signal(rr):
  gross=sum(float(r['sol']) for r in rr if r['is_buy']=='1');net=sum(float(r['sol'])*(1 if r['is_buy']=='1' else -1) for r in rr)
  return bool(rr) and gross>=15 and net>0 and valid(rr[-1])
 es=signal(before);ks=signal(known)
 h['event_time_signals']+=es;h['receipt_known_signals']+=ks
 h['event_signal_missing_recv_predecision']+=es and any(not r['recv_ms'] for r in before)
 if not es:return
 d={'mint':mint,'half':half,'create_ts':create,'rows_predecision':len(before),'receipt_signal':ks,'missing_predecision_receipts':any(not r['recv_ms'] for r in before)}
 landing=[r for r in rows if float(r['ts'])<=create+61]
 exitrows=[r for r in rows if float(r['ts'])<=create+120]
 en=landing[-1] if landing else {};ex=exitrows[-1] if exitrows else {}
 ok=valid(en) and valid(ex)
 d['shadow_state_valid']=ok; d['exit_venue']=ex.get('venue');d['entry_state_ts']=en.get('ts');d['exit_state_ts']=ex.get('ts')
 h['shadow_valid_curve_pairs']+=ok;h['shadow_unknown_pairs']+=not ok
 for size in [.2,.02]:
  k=str(size)
  if ok:
   v=float(en['vsol']);t=float(en['vtok']); a=size*1e9/1.0125;tokens=t*a/(v+a)
   out=float(ex['vsol'])*tokens/(float(ex['vtok'])+tokens)*.9875/1e9
   d['pnl_'+k]=out-size-.0015
  else:d['pnl_'+k]=-size-.0015
 records.append(d)
for f in sorted(P.glob('trades_part_*.csv.gz')):
 current=None;group=[]
 for r in csv.DictReader(gzip.open(f,'rt')):
  counts['raw_trade_rows']+=1
  if current is not None and r['mint']!=current:process(current,group);group=[]
  current=r['mint'];group.append(r)
 if current is not None:process(current,group)
 print('processed',f.name,flush=True)
# coverage zero-row mints do not occur in stream
seen_mints=set()
for f in sorted(P.glob('trades_part_*.csv.gz')):
 # no reread necessary: coverage determines zero row
 pass
for mint,c in coverage.items():
 if int(c['rows_exported'])==0:process(mint,[])
result={'split_unix':split,'counts':dict(counts),'halves':{k:dict(v) for k,v in halves.items()},'shadow':{}}
for half in ['early','late']:
 rr=[r for r in records if r['half']==half];result['shadow'][half]={}
 for size in [.2,.02]:
  x=np.array([r['pnl_'+str(size)] for r in rr]);sc=np.array([r['pnl_'+str(size)] for r in rr if r['shadow_state_valid']]);rng=np.random.default_rng(20261108)
  means=np.array([rng.choice(x,len(x),replace=True).mean() for _ in range(10000)]) if len(x) else np.array([np.nan])
  result['shadow'][half][str(size)]={'attempts':len(x),'valid_curve_pairs':len(sc),'sum_conservative_pnl':float(x.sum()),'mean_conservative_return':float(x.mean()/size),'median_conservative_return':float(np.median(x)/size),'win_rate':float((x>0).mean()),'mean_return_95pct_interval':list(np.quantile(means/size,[.025,.975])),'without_best_pnl':float(x.sum()-x.max()) if len(x) else None,'loss_ge_50pct_rate':float((x/size<=-.5).mean()),'mean_scored_shadow_return':float(sc.mean()/size) if len(sc) else None}
(O/'results.json').write_text(json.dumps(result,indent=2));(O/'signals.json').write_text(json.dumps(records,indent=2));print(json.dumps(result,indent=2))

```


## Reproducibility source: session_2/coverage_audit.py

```python
import csv,gzip,json,datetime
from pathlib import Path
from collections import Counter
P=Path('/workspace/entry-package-7nov');O=Path('/workspace/session_2')
co=list(csv.DictReader(gzip.open(P/'coverage_per_mint.csv.gz','rt')));ts=[int(r['create_ts']) for r in co if r['create_ts']];mid=(min(ts)+max(ts))/2
census={}
for name in ['snapshot3/tracker_tokens.csv.gz','current/tracker_tokens.csv.gz']:
 for r in csv.DictReader(gzip.open(P/name,'rt')):census[r['mint']]=r
summ={}
for half in ['early','late']:
 pred=lambda t: (t<mid)==(half=='early') and min(ts)<=t<=max(ts)
 cc=[r for r in census.values() if r['create_ts'] and pred(int(r['create_ts']))]
 ss=[r for r in co if r['create_ts'] and pred(int(r['create_ts']))]
 summ[half]={'census_launches_in_supplement_time_range':len(cc),'selected_supplement_mints':len(ss),'no_trade_mints':sum(int(r['rows_exported'])==0 for r in ss),'reconciliation_mismatch_mints':sum(r['reconciled']!='1' for r in ss)}
summ['time_range']=[datetime.datetime.fromtimestamp(t,datetime.timezone.utc).isoformat() for t in [min(ts),int(mid),max(ts)]]
(O/'coverage_audit.json').write_text(json.dumps(summ,indent=2));print(json.dumps(summ,indent=2))

```


## Reproducibility source: session_2/summarize.py

```python
import json
from pathlib import Path
import numpy as np
O=Path('/workspace/session_2');r=json.loads((O/'signals.json').read_text());out={}
for half in ['early','late']:
 rr=[x for x in r if x['half']==half];ends=[]
 for x in rr:ends.extend([(x['create_ts']+61,1),(x['create_ts']+120,-1)])
 n=peak=0
 for _,d in sorted(ends,key=lambda x:(x[0],x[1])):n+=d;peak=max(peak,n)
 out[half]={'peak_concurrent_shadow_positions':peak,'max_predecision_rows':max(x['rows_predecision'] for x in rr),'sizes':{}}
 for s in [.2,.02]:
  a=np.array([x['pnl_'+str(s)] for x in rr if x['shadow_state_valid']]);rng=np.random.default_rng(20261108);boot=np.array([rng.choice(a,len(a),True).mean() for _ in range(10000)])
  out[half]['sizes'][str(s)]={'valid_pairs':len(a),'net_sol':float(a.sum()),'mean_pnl_sol':float(a.mean()),'median_pnl_sol':float(np.median(a)),'mean_return':float(a.mean()/s),'median_return':float(np.median(a)/s),'win_rate':float((a>0).mean()),'loss_ge_half_rate':float((a<=-.5*s).mean()),'net_without_best_sol':float(a.sum()-a.max()),'mean_return_interval':list(np.quantile(boot/s,[.025,.975]))}
(O/'extra_metrics.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))

```


## Reproducibility source: session_2/gaps.py

```python
import csv,gzip,json,datetime
from pathlib import Path
P=Path('/workspace/entry-package-7nov');O=Path('/workspace/session_2')
rr=json.loads((O/'signals.json').read_text());g=list(csv.DictReader(gzip.open(P/'feed_gaps_all.csv.gz','rt')));intervals=[];start=None
for x in g:
 if x['event'] in ['closed','idle'] and start is None:start=int(x['ts'])
 elif x['event']=='open' and start is not None:intervals.append((start,int(x['ts'])));start=None
if start is not None:intervals.append((start,float('inf')))
def unix(s):return int(datetime.datetime.fromisoformat(s+'+00:00').timestamp())
for day,a,b in [('06','20:40:00','20:42:00'),('06','20:57:00','21:06:00'),('06','23:33:00','23:35:00'),('07','00:06:00','00:08:00'),('07','00:26:30','00:27:30'),('06','21:40:00','21:45:00')]:intervals.append((unix('2026-11-'+day+'T'+a),unix('2026-11-'+day+'T'+b)))
co={r['mint']:r for r in csv.DictReader(gzip.open(P/'coverage_per_mint.csv.gz','rt'))};out={}
for half in ['early','late']:
 r=[x for x in rr if x['half']==half]
 overlap=lambda x:any(a<=x['create_ts']+120 and b>=x['create_ts'] for a,b in intervals)
 out[half]={'signals_overlapping_logged_close_idle_or_documented_outage':sum(overlap(x) for x in r),'signals_with_reconciliation_mismatch':sum(co[x['mint']]['reconciled']!='1' for x in r),'signals_before_first_feed_open_log':sum(x['create_ts']<int(g[0]['ts']) for x in r)}
(O/'gap_audit.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))

```


## Reproducibility source: session_3/analyze.py

```python
from pathlib import Path
import pandas as pd, numpy as np, json, hashlib
P=Path('/workspace/entry-package-7nov'); O=Path('/workspace/session_3')
cov=pd.read_csv(P/'coverage_per_mint.csv.gz'); cs=cov.set_index('mint').create_ts.to_dict(); split=(cov.create_ts.min()+cov.create_ts.max())/2
fg=pd.read_csv(P/'feed_gaps_all.csv.gz'); gaps=[]; start=None
for r in fg.itertuples():
 if r.event in ['closed','idle'] and start is None:start=r.ts
 if r.event=='open' and start is not None:gaps.append((start,r.ts));start=None
if start is not None:gaps.append((start,float('inf')))
for a,b in [('2026-11-06 20:40','2026-11-06 20:42'),('2026-11-06 20:57','2026-11-06 21:06'),('2026-11-06 23:33','2026-11-06 23:35'),('2026-11-07 00:06','2026-11-07 00:08'),('2026-11-07 00:26:30','2026-11-07 00:27:30')]:gaps.append((pd.Timestamp(a,tz='UTC').timestamp(),pd.Timestamp(b,tz='UTC').timestamp()))
results=[]; audits=[]
cols=['row_id','mint','sig','slot','ev_idx','ts','recv_ms','wallet','is_buy','sol','tokens','vsol','vtok','venue']
def process(d):
 m=d.mint.iloc[0]; creation=cs[m]; t=creation+60; end=creation+120
 n=len(d); d=d.drop_duplicates(['mint','sig','wallet','is_buy','sol','tokens','venue','vsol','vtok']).sort_values(['slot','ev_idx','row_id'],na_position='first')
 audits.append(dict(mint=m,rows=n,dupes=n-len(d),missing_recv=int(d.recv_ms.isna().sum()),missing_reserves=int((d.vsol.isna()|d.vtok.isna()).sum()),contradictory_time=int((d.ts.diff()<0).sum()),rows_pre60=int((d.ts<=t).sum()),received_pre60=int((d.recv_ms<=t*1000).sum())))
 for mode in ['receipt','event']:
  h=d[(d.recv_ms<=t*1000) if mode=='receipt' else (d.ts<=t)]
  gross=h.loc[h.is_buy==1,'sol'].sum(); net=gross-h.loc[h.is_buy==0,'sol'].sum(); buyers=h.loc[h.is_buy==1,'wallet'].nunique()
  z=dict(mint=m,create_ts=creation,half='early' if creation<split else 'late',mode=mode,gross=gross,net=net,buyers=buyers,attempt=False,status='abstain')
  if gross<15 or net<10 or buyers<20 or len(h)==0 or h.iloc[-1].venue not in ['curve',np.nan] and pd.notna(h.iloc[-1].venue):results.append(z);continue
  z['attempt']=True
  # No asserted completeness: following values are conditional event-state diagnostics only.
  state=d[d.ts<=t+1]
  migrations=d[(d.venue=='pumpswap') & ((d.recv_ms<=end*1000) if mode=='receipt' else (d.ts<=end))]
  exit_at=end if migrations.empty else min(end, (migrations.recv_ms.min()/1000 if mode=='receipt' else migrations.ts.min())+.7)
  exitstate=d[d.ts<=exit_at]
  reason=None
  if (d.ts.diff()<0).any():reason='contradictory_event_time'
  elif state.empty or exitstate.empty:reason='missing_state'
  else:
   a=state.iloc[-1];b=exitstate.iloc[-1]
   if a.venue=='pumpswap' or b.venue=='pumpswap':reason='pool_config_unvalidated'
   elif any(pd.isna(v) or v<=0 for v in [a.vsol,a.vtok,b.vsol,b.vtok]):reason='invalid_reserves'
   elif a.vsol/a.vtok/1000>4.11e-7 or b.vsol/b.vtok/1000>4.11e-7:reason='curve_max_failed'
   elif any(x<=exit_at and y>=t for x,y in gaps):reason='logged_gap'
   elif end>creation+125*60:reason='retention'
   elif d.ts.max()<end:reason='right_censored_or_quiet'
  if reason:z['status']=reason
  else:
   z['status']='conditional_diagnostic'
   for stake in [.2,.02]:
    x=a.vsol/1e9;y=a.vtok/1e6;xx=b.vsol/1e9;yy=b.vtok/1e6
    tokens=y*stake*.9875/(x+stake*.9875);out=xx*tokens/(yy+tokens)*.9875
    z['r_'+str(stake)]=(out-stake-.0015)/stake
  results.append(z)
carry=pd.DataFrame()
for f in sorted(P.glob('trades_part_*.csv.gz')):
 for c in pd.read_csv(f,usecols=cols,chunksize=100000,low_memory=False):
  c=pd.concat([carry,c],ignore_index=True); last=c.mint.iloc[-1];carry=c[c.mint==last].copy()
  for _,d in c[c.mint!=last].groupby('mint',sort=False):process(d)
if len(carry):process(carry)
a=pd.DataFrame(audits);r=pd.DataFrame(results);a.to_csv(O/'audit.csv',index=False);r.to_csv(O/'candidate.csv',index=False)
rng=np.random.default_rng(20261108); metrics=[]
for (mode,half),g in r.groupby(['mode','half']):
 v=dict(mode=mode,half=half,n=len(g),attempts=int(g.attempt.sum()),statuses=g.status.value_counts().to_dict())
 for stake in [.2,.02]:
  rr=g.get('r_'+str(stake),pd.Series(dtype=float)).dropna().to_numpy(); key=str(stake)
  if len(rr):
   boots=np.array([rng.choice(rr,len(rr),replace=True).mean() for _ in range(10000)])
   v[key]=dict(n=len(rr),mean=float(rr.mean()),median=float(np.median(rr)),win=float((rr>0).mean()),worst50=float((rr<=-.5).mean()),without_best=float((rr.sum()-rr.max())/(len(rr)-1)) if len(rr)>1 else None,ci95=np.quantile(boots,[.025,.975]).tolist(),total_net_sol=float(rr.sum()*stake))
 metrics.append(v)
out=dict(commit='0e3be03c71949e069a7a31b5951f332bb563f68f',split=split,split_utc=str(pd.Timestamp(split,unit='s',tz='UTC')),min_create=int(cov.create_ts.min()),max_create=int(cov.create_ts.max()),mints=len(cov),audited_mints=len(a),raw_rows=int(a.rows.sum()),duplicates=int(a.dupes.sum()),missing_recv=int(a.missing_recv.sum()),missing_reserves=int(a.missing_reserves.sum()),mints_contradiction=int((a.contradictory_time>0).sum()),metrics=metrics)
(O/'results.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))

```
