# C005 + Idea Lab: early-buyer evacuation and new demand

Owner brief incorporated 11 Nov 2026. This run completed the wallet-evidence audit AND tested one new candidate with one registered control. Rules were committed before this run's outcomes at 554b16ebb1af3055df2051b7dcd91636fc19459b. Existing development data is exploratory, not a fresh test. No protected outcomes, purchases, live trades or Helius/GMGN calls.

## New ideas

1. **Dominant early buyer evacuation plus newcomer takeover (tested, unconventional).** Initial selling may remove concentrated dump inventory when new demand replaces it. At creation+120s, identify the largest SOL buyer among curve trades received by creation+10s, tie-breaking by wallet. Require its recorded token sales through the decision >=80% of its purchases, >=5 wallets whose first received buy is in the last30s, last30s net curve buying >=3SOL, cumulative received gross buys >=15SOL, and latest known state curve/valid. No true-balance or common-control claim. This exact specification was tested without retuning.
2. **Funding-diversity veto (proposed, not tested).** Distinct addresses may exaggerate independent demand. Group purchases using funding traces completed and available before decision; compare the same candidate cohort with/without a fixed linked-funder concentration veto. Unknown or service-funder attribution remains unknown, not independence. Audit coverage first, then preregister one threshold.
3. **Cross-mint capital recycling (proposed, not tested).** Recurrent early wallets may fund the next coin by selling the prior one, making launch activity look like fresh capital. Use only prior received sales/buys and cross-mint links available before decision; compare new-vs-recycled participation at matched flow, with missing histories censored. This is not an inference of misconduct or common ownership. No search performed yet.

## Tested scenario

Separate owner-requested exploratory replay; eval-1.1 source was not modified. 0.2SOL; buy decision+1s; sell trigger+0.7s; curve125bps and pool55bps; fixed0.0015SOL; reserve-based impact; 30% trail on sellable proceeds after sale fee/fixed cost. High starts at immediate same-state liquidation value. Two-hour cap from decision. Same trail across migration; no partials, adds, retries or re-entry.

At landing, use only the last event-ordered state at/before landing; age>30s, capture gaps, invalid pool evidence, outside capture or a completed-curve buy make the state unavailable. Never move execution later. In-hold invalid observations or recorded capture gaps make exits uncertain. These evidence rules are explicit, not changes to the frozen evaluator. Pool decimals remain the decoder's assumptions, not independently read mint evidence. Signal decisions use receipt time and received gross buying rather than a census bundle flag shortcut.

Control: same 120s decision, receipt-known15SOL gross, latest curve/valid state and identical exit/execution; omit the wallet/newcomer/net filters. ONE candidate + ONE control = TWO evaluated specifications, no grid. Same fixed earlier/later split as C001: 7 Nov 01:50 UTC. Denominator1,593/2,045; five event-time-contradiction mints are flagged signal-unknown, not ordinary abstentions. No other threshold was tried.

## Results (all winners counted)

| Variant / half | Attempted | Filled | Fill unavailable | Resolved exits | Uncertain exits | Observed net SOL | Mean / median return on resolved | Win | Loss >50% | No best1 SOL | No best3 SOL |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| L001 early | 121 | 119 | 2 | 107 | 12 | -5.933477 | -27.73% / -29.97% | 14.95% | 18.69% | -6.310299 | -6.529608 |
| L001 late | 136 | 136 | 0 | 117 | 19 | -3.295890 | -14.08% / -23.13% | 20.51% | 11.97% | -3.577931 | -4.097224 |
| L001 combined | 257 | 255 | 2 | 224 | 31 | -9.229367 | -20.60% / -26.44% | 17.86% | 15.18% | -9.606189 | -10.162454 |
| Control combined | 3,247 | 2,374 | 873 | 1,188 | 1,186 | -53.736008 | -22.62% / -29.46% | 16.92% | 17.59% | -54.360737 | -55.317758 |

L001 mean/median net per resolved position: -0.041203/-0.052878SOL. Observed net per common eligible launch: -0.002537SOL. The control has a different observed/unknown mix, so fewer total losses in the filtered subset do NOT establish causal improvement or superior full-population profitability.

Unknowns are neither wins nor losses. L001 has33 unavailable outcomes (2 fills+31 exits); the observed -9.229367SOL excludes them. A separately labelled full-stake-plus-fixed-cost imputation gives -15.878867SOL, NOT measured P&L or a confidence bound. Unknown outcomes could include winners; zero imputation is not an upper bound. L001 uncertainty reasons:18 stale states,13 in-hold capture gaps,2 completed-curve buys. Control unavailable outcomes2,059/3,247 make its full performance inconclusive. Do not treat those as losses or abstentions.

Verdict: failed exploratory lead on resolved trades in both halves; full unconditional result remains uncertain. No supporting evidence to promote it. Best3 removal is a stress test, not the reason for rejection. No positive tail was clipped or removed for being large. Future changes are new hypotheses and must be registered separately.

The trace-based balance proxy has limits:205/257 candidate mints have at least one wallet whose recorded sales exceed recorded purchases; transfers/initial allocation/capture can explain this. None of the selected dominant early wallets has sold/bought >1.000001. This does not prove true ownership or complete balances.

## C005 evidence audit

24 tables (12 per snapshot) rehashed against approved package manifests;16 trade-export checksums rechecked. current files contain154,434 creator-trace rows;10,576 buyer-funding rows for1,065 mints;278 fd_sniper_stats rows;697 sniper rows;28,089 farm-wallet event rows;300 farm-dump rows;22 operators and716 operator-coin links. These are different populations, not complete all-launch labels.

fd_watch has55,225 rows: lookup status40,548 ran,5,793 failed,1,894 pending,6,990 blank. Only8,574 rows have nonempty saved checks, yielding18,844 check objects (8,206 at60s;7,949 at90s;2,689 at120s). The `at` key is observation AGE, not a knowledge timestamp. Match to decision/lookup receipt evidence before filtering entries.

Saved checks include farm_known/farm shares on17,295 objects; holders on2,677; top1/5/10_pct on18,782. Nonempty values include zero and do not certify a verified balance snapshot or GMGN origin. Source lineage, transfer completeness and arrival time still matter. The sparsity of holders in token_life (C003) does not imply checked-coin holder evidence is absent; populations differ.

Timestamp-screened presence against the62,789-launch all-coins census (not certified causal feature coverage):
- creator_trace matches52,790 mints;21,944 checked by creation+10s;43,033 by+120s.
- buyer funding matches1,019 mints;zero have a trace by+10s;915 have at least one by+120s. This is at-least-one traced wallet, not complete buyer-group coverage.
- fd_watch matches48,221 mints;18,494 have ran-status trace time by+10s;36,914 by+120s.

Funding attribution remains heuristic without verifiable transfer provenance. checked_ts/trace_ts/ts are availability candidates, not blanket guarantees that every exported value existed then. Sniper/operator updated is not first-label time; prior static lists might be usable if their frozen build provenance is verified. farm_wallets lacks a first-flag/build timestamp; farm_dumps has built_ts, so joining dump/build evidence may be necessary. fd_early.exited and exported historical aggregates cannot be backfilled into decisions. Do not blacklist wallets using later returns.

## Claude dialogue status

Both requested research-claude files returned404, specifically no commit found for ref research-claude. DIALOGUE was retried later with the same result. No worker commit could be cited and no cross-review is claimed. The queue's statement that a Claude schedule exists does not prove this branch/report has been published. Our DIALOGUE requests a numerical reproduction once available.

## Reproduction and files

Python standard library; approved package at ../entry-package-7nov and C001 prepared cache at ../c001-20261110T211226Z. Run audit_wallets.py, lab.py, then export_validate.py. Outputs include wallet_audit.json, timestamp_availability.json, lab_results.json, checksum records and partitioned per-trade CSV ledgers for BOTH specifications. export_validate.py checks record counts/net totals/no-best3 serialization and time invariants. All records include mint/half/status/reason and causal feature evidence; raw paths remain immutable originals. PROTOCOL.md was committed before outcomes; no retuning.

Peak stake in lab_results.json is planned timing exposure, not verified release of capital on uncertain sells. Bootstrap significance, constrained capital, failed-tx charges and current live fills are not established. No fresh-data confirmation. No paper-book activation. No protected dataset release. Monetary costs unmeasured; no Helius/GMGN credits used.

Next: C006 needs defensible runner labels; if it is blocked by sparse crossing evidence, continue C007 with a newly registered wallet experiment or causal-data reconstruction, not an unrecorded threshold sweep.
