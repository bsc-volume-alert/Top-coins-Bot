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
