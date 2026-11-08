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
