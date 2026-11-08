# Codex Round 2 — Phase A independent exploration

Report prepared **2026-11-08 11:39:28 UTC**. This repository publication occurs later; the report preparation timestamp is not a claim of earlier public publication.

**None supported by this exploration.** The candidate selected using the earlier half lost money on the unchanged later-half check at both position sizes. This is Phase A, not the final Round 2 freeze. Round 1 remains unchanged.

I worked alone, without subagents or other analysts' reports. No 8–10 November test outcomes were used. No trades were placed and no bot or frozen evaluator code was changed. Final Round 2 freezing comes after critique, before 10 Nov 00:00 UTC, for the 10–12 Nov test.

## Provenance and verification

- Data: entry-all-20261107t2210 at **e67833121f1da0dc992c28fa26c5236a855c151a**. All SHA256SUMS checks passed.
- Evaluator: blind-eval-1.1 at **be9b5459e2f7670946d9ca012f875b77aaaf5d5b**. evaluate.py SHA256: **f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86**. Its unit tests passed with zero failures.
- Round 2 brief, rev 4 execution rules, manifest and evaluator interface were read before returns.
- Selected-candidate categories and net returns matched frozen run_launch for every one of **3,638** denominator launches under both fee scenarios. See codex_r2/results/verification.json.

The chronological split was fixed before calculating returns:

| Population | Earlier: 6 Nov 07:40 to 7 Nov 01:50 | Later: 7 Nov 01:50 to 20:00 |
|---|---:|---:|
| Census launches | 36,468 | 26,321 |
| Launches with exported trades | 2,626 | 2,287 |
| Frozen-evaluator replay denominator N | 1,593 | 2,045 |
| Export reconciliation mismatches | 1 | 15 |

8,037,251 raw rows minus 1,568,880 full-fingerprint duplicates left 6,468,371. No receipt times were missing. Five mints had block-time contradictions in canonical event order; none was an attempted selected-candidate entry. Across both halves, 301 streamed mints did not satisfy evaluator retention reconstruction, and 974 were excluded by documented outages overlapping creation-to-two-hour windows. Exclusions were common to all candidates. No zero-row census mint was tier >=1.

## Everything tried

Exactly **72 active specifications**, fixed before outcomes: decision ages **15,30,60,120 seconds** x holds **15,60,300 seconds from decision** x the six predicates below. Each also requires receipt-known gross curve buys >=15 SOL, a latest received curve state passing evaluator validity, and retention by decision time.

| Predicate | Additional conditions |
|---|---|
| P0 | None |
| P1 | Cumulative net buying >=10 SOL; >=20 distinct buying wallets |
| P2 | Last-15-second net buying >=3 SOL; >=5 buying wallets in that interval |
| P3 | Last-15-second net buying <=-3 SOL; cumulative net buying >=10 SOL |
| P4 | P1 plus largest wallet's share of cumulative gross buys <=15% |
| P5 | Last-15-second net buying >=3 SOL and >=1.5 times preceding-15-second net buying; >=20 cumulative buying wallets |

Windows use receipt time. No additional threshold sweep, trailing stop, stop-loss, funding, creator, bundle, holder, farm or historical-book-return search. Both sizes and both fee scenarios: 72 specifications x 2 sizes x 2 fee scenarios in the earlier half, not 288 independently selected rules. Exact earlier-half leaderboard: codex_r2/results/early_selection.json.

Selection required >=30 early attempts and <=10% unknown outcomes, then maximized the smaller size-normalized lower-bound total profit; deterministic ID tie-break. Recorded before outcomes; no fallback used. Only one specification had positive early lower totals at both sizes. Only that specification's outcomes were calculated on the later half. No parameter changed after that check.

## Selected candidate, rejected after later check

ID 34: decision age **30 seconds**, P5, hold **60 seconds**.

At creation+30s, use only trades with recv_ms <= decision_ms, deduplicated by the evaluator. Require gross curve buys >=15 SOL, >=20 distinct buying wallets, and latest received state curve and evaluator-valid. Let A be curve net buying received in (decision-15s,decision]; B in (decision-30s,decision-15s]. Require A>=3 SOL and A>=1.5*B. This is an inequality, not a ratio; B need not be positive. Buy lands at decision+1s. Sell the entire position at decision+60s, following migration to a validated pool if needed. No signal exit, added horizon delay, partial sale, retry or re-entry. Independent 0.2 and 0.02 SOL positions.

Costs: frozen curve 125 bps/leg, pool 30 bps/leg with 125-bps sensitivity, fixed 0.0015 SOL round trip. Curve buy uses stake/(1+fee). All scored fills and exits were curve states, so both pool-fee scenarios give identical results.

| Measure | Earlier | Later |
|---|---:|---:|
| Attempts / unique mints | 35 | 46 |
| Scored | 35 | 45 |
| Deliberate abstentions in N | 1,558 | 1,999 |
| Unknown | 0 | 1 |
| Unknown / attempts | 0% | 2.17% |
| Attempts / clock hour | 1.93 | 2.53 |
| Peak planned concurrent positions | 2 | 2 |

The later unknown is an exit capture gap. It contributes zero to point P&L and full stake plus fixed fee to lower-bound loss, never dropped.

| Size / half | Scored net SOL | Lower-bound total SOL | Mean return | Median return | Win rate | Mean-return 95% interval |
|---|---:|---:|---:|---:|---:|---|
| 0.2 / early | +0.480222 | +0.480222 | +6.86% | +2.00% | 51.43% | [-11.12%,+27.13%] |
| 0.02 / early | +0.006985 | +0.006985 | +1.00% | -3.99% | 45.71% | [-17.17%,+21.51%] |
| 0.2 / late | -1.119884 | -1.321384 | -12.44% | -9.00% | 31.11% | [-23.59%,-1.16%] |
| 0.02 / late | -0.166343 | -0.187843 | -18.48% | -15.09% | 26.67% | [-29.73%,-7.09%] |

Per-entry statistics condition on scored entries. Lower totals include the unknown loss.

| Size / half | Scored net without best | Lower total without best | Scored losses >=50% | Worst scored return | Worst scored loss SOL |
|---|---:|---:|---:|---:|---:|
| 0.2 / early | +0.108426 | +0.108426 | 11.43% | -72.38% | -0.144764 |
| 0.02 / early | -0.029622 | -0.029622 | 14.29% | -79.00% | -0.015801 |
| 0.2 / late | -1.309442 | -1.510942 | 15.56% | -91.50% | -0.183003 |
| 0.02 / late | -0.184227 | -0.205727 | 15.56% | -98.16% | -0.019632 |

Unknown worst-case loss: -0.2015 / -0.0215 SOL for the two sizes.

| Size / half | Point SOL/common launch | Lower SOL/common launch | Lower-score 95% interval | Frozen-scorer lower confidence bound, development K=72 |
|---|---:|---:|---|---:|
| 0.2 / early | +0.000301458 | +0.000301458 | [-0.000481255,+0.001182230] | -0.000901364 |
| 0.02 / early | +0.000004385 | +0.000004385 | [-0.000075208,+0.000092078] | -0.000123298 |
| 0.2 / late | -0.000547621 | -0.000646154 | [-0.001212081,-0.000123240] | -0.001649427 |
| 0.02 / late | -0.000081341 | -0.000091855 | [-0.000152287,-0.000037197] | -0.000198411 |

95% intervals use 10,000 NumPy launch resamples, seed20261108. Last column separately uses unchanged evaluator scorer/RNG. K=72 is a development-search sensitivity, not the eventual number of externally submitted rules. No bound supports profitability.

| Size / half | Peak planned stake tied up | Total stake deployed across attempts | Planned stake-hours |
|---|---:|---:|---:|
| 0.2 / early | 0.40 SOL | 7.00 SOL | 0.114722 |
| 0.02 / early | 0.04 SOL | 0.70 SOL | 0.011472 |
| 0.2 / late | 0.40 SOL | 9.20 SOL | 0.150778 |
| 0.02 / late | 0.04 SOL | 0.92 SOL | 0.015078 |

Unconstrained portfolio, every signal taken. Planned post-landing hold is 59s. Capital figures exclude separate transaction-fee reserve. Actual release of the unknown position's capital is unconfirmed; planned concurrency uses its scheduled horizon.

## Interpretation and limits

Only 35 early entries, weak confidence bounds, and small-size early profit disappearing without the best coin. The unchanged later check loses at both sizes. No replacement search followed the failure. This limited 72-rule exploration does not disprove all possible strategies.

The window is about 36 hours, collection changes within it, and launches may share market/wallet-group shocks. Frozen evaluator assumptions about capture, decimal evidence, second-resolution block times, fixed latency and no persistent price effect from our trade limit replay inference. Reproducibility under that model is not live execution proof. No final Round 2 policy is frozen here.

## Data requests

Existing evidence or owner-approved inputs for a later round only; no trading or bot changes requested.

| Exact question | Needed source, fields, timing | Why existing package cannot answer |
|---|---|---|
| Is acceleration independent demand or coordinated recycling? | Existing wallet funding/transfer traces, funder/operator links, transaction times, lookup receipt/trace times and statuses, for all candidate launches | Addresses do not establish independent buyers; earlier classifications may be reconstructed or entered-coin-only |
| Does inventory concentration/distribution explain later losses? | Existing token-account balances/transfers and creator/group ownership with observation/receipt times around decisions and exits | Gross buy share is not ownership; trade export lacks transfers and full inventory |
| Are quiet execution spans complete and buffers intact? | Existing restart/subscription ledger, per-mint retention/finalisation times, buffer-overflow records, capture start/end evidence | Absence of a gap is not complete-capture proof; evaluator uses an operational approximation |
| Does the signal survive other days/regimes? | Additional immutable pre-8-Nov all-launch censuses and retained trade histories, receipts, gaps and evidence fields | One short window cannot separate stable effects from regime/collection effects; 8–10 Nov outcomes are excluded |
| Do assumed latency/economics match executable fills? | Existing matched decision/receipt/submission/landing times, transaction outcomes, comparable quote shadows and mint/venue config | Earlier few real trades/quotes are not matched to these entries; fixed evaluator fees remain scoring assumptions |

## Files and reproduction

Complete code, protocol, logs, full-precision metrics, early leaderboard and selected launch ledger are in **codex_r2/**. See its README for commands. No raw-data clone or generated 1.9GB late-path cache is committed. The adapter creates filename symlinks and a documented outage file without modifying the original export. verify.py compares all selected results directly with immutable run_launch. score_selected.py calls the frozen scorer.

The full Round 1 submission, verbatim code and internal evidence are in **codex_7nov/**. Original full-document SHA256: **642e8c80bea386784b8d5a01157a1a05d0db3a8ad21d6c993fe04a676bd91a35**; original local commit **b06fa89f3baa637231b431edea5d171966112afa**; historical freeze **2026-11-07T15:22:48.149794+00:00**. Its historical assumptions and internal reports are preserved, not rewritten under rev 4. This publication does not claim the original commit was public at its freeze time.
