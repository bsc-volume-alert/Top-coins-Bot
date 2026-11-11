# C009: liquidity/execution autopsy; C011: existing attention and longer-history inventory

C009 is PARTIAL: the registered matched-runner/non-runner comparison is blocked by the negative-label coverage requirement. Do not claim that matched comparison happened. A bounded liquidity-stress trading experiment and the independent C011 inventory were executed. All evidence is approved, previously examined development data; no fresh confirmation, hidden outcomes, new chain/social calls or live trading.

## Knowledge used, before choosing this work

C002: completed curves cannot accept buys and pool fields do not prove decoder correctness. C003: no observed crossing is not a negative outcome. C004: simulated latency is not measured live latency. L001: the exact early-whale-exit specification lost on resolved trades; trade-derived inventory omits transfers. These findings motivated a reserve-based mechanism with explicit execution/label uncertainty rather than another ownership-proxy threshold sweep.

Protocol committed before this run's outcomes: 0aa4b4998d296239f5950ec599e3989eefc6f907. Data e67833121f1da0dc992c28fa26c5236a855c151a. Frozen evaluator be9b5459e2f7670946d9ca012f875b77aaaf5d5b imported for math/state validation, never modified. Six prior outage intervals and same split7Nov01:50UTC. 16 trade checksums passed; C011 additionally verified two posts exports from package0e3be03c71949e069a7a31b5951f332bb563f68f.

## New ideas and exactly what was tested

1. One-block liquidity stress gate (tested): at5min, require that a hypothetical token inventory worth5SOL at current spot can sell into the known constant-product reserves while leaving our0.2SOL position's sellable proceeds >=80% of their pre-stress value. It is a depth scenario, not ownership or a prediction that5SOL will sell. No market-cap band or chart filter. Fixed0.2SOL buy+1s,125bps curve/55bps pool,0.0015SOL fixed,30% proceeds trail, sell+0.7s,2h maximum,30s state freshness. Matched control omits the gate. Two trading specifications, no retuning.
2. Repeated reserve refills (unconventional, proposed only): after two sells>=2SOL in120s, require quote reserves restored within10s by>=3 new addresses before an age5min entry. The hypothesis is demonstrated replenishment versus a large but fragile reserve stock. Requires timestamped valid states; no test performed here.
3. Correlated liquidity exposure (proposed only): cap simultaneous positions sharing an already-known funding/liquidity source, comparing the same entry opportunities under a fixed portfolio limit. Missing links remain unknown. This requires reliable source/ownership evidence and is not tested or claimed as an improvement.

## C009 label autopsy at matched observation ages

The predeclared outcome was a captured-path sustained multiple, NOT >=$100K: net sellable proceeds>=2x stake held for30s across valid received observations no more than30s apart. Negative labels required the entire2h recorded path to meet the same freshness/coverage constraints with no such event. Missing paths remain unknown. The label uses future data ONLY as an outcome, never as a feature.

| Decision age | Attempted cohort | Filled | Observed sustained2x labels | Negative labels passing full coverage | Unknown labels | Matched pairs |
|---|---:|---:|---:|---:|---:|---:|
|5min|3,489|1,394|56|0|3,433|0|
|15min|3,488|425|21|0|3,467|0|
|30min|3,487|248|9|0|3,478|0|

These are cohort observations, not distinct runners summed across ages. Zero matched pairs is a substantive limitation, not a failed hypothesis test. The strict registered path-density rule may reject genuinely quiet but captured periods; absence of prints alone cannot distinguish inactivity from missing capture. This run did NOT loosen that rule after seeing the result. It also did NOT relabel unknowns as failures or certify true >=$100K non-runners. A different coverage model needs explicit justification and a new registered analysis.

Future one-slot sell-volume diagnostics are stored as recorded-tape proxies; they are not ownership proof or independently verified SOL conversion for every venue. Because there are no matched negative controls, this run does not establish a runner/failure difference in drain risk, depth or impact. Pool suffixes in C011 reinforce the need for actual quote-asset validation.

## L002 paper-trade results, all resolved winners counted

| Variant/half | Attempted | Filled | Fill unavailable | Resolved exits | Uncertain exits | Observed net SOL | Mean/median resolved return | Win | Loss>50% | No best1 SOL | No best3 SOL |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
|L002 early|388|208|180|156|52|-6.035663|-19.35%/-26.25%|18.59%|12.82%|-6.279816|-6.712561|
|L002 late|432|364|68|225|139|-9.257403|-20.57%/-24.35%|22.22%|19.56%|-9.580671|-10.173115|
|L002 all|820|572|248|381|191|-15.293066|-20.07%/-24.78%|20.73%|16.80%|-15.616334|-16.208778|
|Control all|3,489|1,394|2,095|537|857|-19.469149|-18.13%/-26.50%|20.11%|15.27%|-21.293953|-22.212237|

381 resolved trades are NOT572 fully known outcomes. The candidate has439 unavailable outcomes including248 fills and191 exits. Their proceeds are unknown, not zero/win/loss. Observed totals exclude them. High/different unavailable shares prevent a full performance ranking. The gate is an unsupported/failed resolved-trade lead in both halves, and full profitability remains inconclusive. Best3 is diagnostic only; negative untrimmed totals are already visible. No observed winner was clipped.

The gate retained50/56 observed sustained2x labels at5min while selecting820/3,489 attempted entries. This is a descriptive overlap, NOT precision or validated prediction: there are no certified negatives and label observation depends on activity. It also excluded the three largest resolved control winners. The largest was+1.824804SOL (mint41nYSc3pw5muecejM7DzX6qt7BfNTap3Jsivj4HWpump), without an initial instant-graduation flag. That flag's absence is not independent validation of pool units. This example cautions against assuming more depth automatically captures the profitable tail. Legitimate rare winners must count if validated and executable.

Instant-graduation flags remain visible:34 candidate attempts,35 control attempts at5min. Flags were NOT post-hoc exclusions. Completed-curve buys, absent evidence, stale states, invalid in-hold states and gaps yield unavailable/uncertain outcomes. Results for15/30min exits are descriptive autopsy diagnostics, not two additional selected strategy candidates. No statistical significance or live-execution claim.

## C011: what exists already

Archived posts exist. snapshot3 has733 posts/reposts/replies/quotes from5 users; current has723 from5 users. Both have created_ms and recv_ms populated on every row. We did not inspect text for trading signals, create a full token/post mapping or establish trending coverage. ctx_ms ranges0–27,446; it must not be assumed to be an epoch knowledge timestamp. Thus 'no social data exists' is false, while 'a complete launch-time attention dataset exists' is also unsupported.

The approved all-coins tape includes2,266,635 raw curve rows and5,674,642 rows whose venue is exactly pumpswap, plus other pumpswap/* venue labels. Counts include duplicates. Exact-pumpswap observations cover389 mints:92 have an observation at age>=2h,68>=4h,46>=12h and3 at24h. Curve observations cover4,880 mints,83 at>=2h and none>=4h. Other venue labels have separate tables in attention_history_inventory.json; never assume all quote amounts/decimals are SOL-compatible merely from the word pumpswap. C009 state validation requires stored wSOL quote evidence.

One late observation does not prove continuous coverage, complete24h outcomes or a representative survivor sample. No extra histories or protected exports were accessed, and no new collection is proposed as already authorised.

## Reproduce and validate

Use C001 cache at ../c001-20261110T211226Z and approved package at ../entry-package-7nov. Python standard library:

    python autopsy.py > run.log 2>&1
    python inventory_attention.py > inventory.log 2>&1
    python export_validate.py

Outputs: results.json; checksums.json; matched_pairs.json (honestly empty); attention_history_inventory.json; partitioned record CSV files; validation.json with trade-count/net/no-best3 roundtrip and time-horizon invariants. autopsy.py regenerates records.json locally. For interpretability the CSV is published instead of a duplicate large JSON. Frozen helper bytes are checked before use. Five receipt/event-order-contradiction mints remain signal-unknown in the3,638 launch denominator.

KNOWLEDGE.md is an external evidence register, not model retraining. The scheduled Codex prompt was updated to require reading/updating it and citing the prior findings that motivate each experiment. Dialogue/experiments and SUMMARY.txt are updated. Claude worker branch still returned404 when checked; no cross-review or contact is claimed.

Status: C009 partial/blocked on matched negative labels; C011 complete. Next useful work: coordinator coverage-model review and approved pre-test label evidence; C010 once F006 is actually published. Other ready queue work may proceed without protected-data access. No runtime blocker, costs not monetarily measured, no Helius/GMGN calls or live/paper-book activation.
