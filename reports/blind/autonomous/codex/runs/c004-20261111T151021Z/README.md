# C004 — existing execution and quote-shadow latency audit

Executed 11 Nov 2026 on approved pre-test data. No new transactions, paid API requests, strategy search or protected outcome access. Frozen evaluator unchanged. All 12 inspected files (six tables in two snapshots) rehashed against package manifests and passed. The historical source excerpts explain recorded fields; exact deployment/version equivalence to each 5 Nov fill has not been independently established.

## Main answer

There IS historical live timing evidence. It does NOT establish reliable execution one second after the receipt of the 15-SOL retention trade. Actual network send-to-confirmation, full workflow, paper-entry delay, quote latency and simulated reserve-read delay are different clocks.

## Live evidence: 57 unique records, not 114 independent observations

snapshot3 and current contain the same 57 live records, spanning 5 Nov 08:27:15–17:23:39 UTC. All 40 confirmed buys used 0.02 SOL. There are 11 failed records and six skipped records; all 40 bought positions later have confirmed sell status in the export. No failed record retains a buy signature or buy_land_ms; do not assume every failure was broadcast, mined or a total stake loss. Skips are not failed fills. Four confirmed positions report two sell tries rather than one, so a single-transaction timing cannot represent the full retry path.

Timing distributions below condition on the 40 confirmed records. They are descriptive, not a representative success-rate estimate for a new strategy.

| Recorded timing | Median | 95th percentile | Maximum | Interpretation |
|---|---:|---:|---:|---|
| buy_quote_ms | 99 ms | 216.55 ms | 878 ms | Quote plus swap transaction construction, not solely quote HTTP time |
| buy_sim_ms | 30 ms | 92.85 ms | 151 ms | Simulation stage |
| buy_land_ms | 690.5 ms | 982.05 ms | 1,381 ms | Starts before initial RPC send; ends when confirmation polling returns |
| buy_ms | 867 ms | 1,294.3 ms | 1,908 ms | Quote/build, sign, simulate, send/confirmation and fill read; excludes earlier invocation/balance checks |
| sell_land_ms | 722 ms | 1,202.25 ms | 1,365 ms | Send-to-confirmation-poll duration for recorded sell attempt |
| sell_ms | 761.5 ms | 1,250.15 ms | 1,413 ms | Swap construction/sign/send/confirmation; source timer starts after the sell quote, excludes its acquisition and later fill read/account closure |
| buy_lag_s | 2 s | 7 s | 9 s | Paper row entry to recorded transaction blockTime, or wall-time fallback; second resolution |

33/40 successful buy workflows have buy_ms <=1,000; 38/40 buy_land_ms <=1,000; only 5/40 recorded paper-entry-to-fill lags <=1 second. Only 14/40 sell_ms <=700. None is the probability of filling a new retention signal within its target latency.

## Matched origin audit

All 40 confirmed records join to vol_paper by vol_id. For all 40, buy_ts minus the matched PAPER entry timestamp equals buy_lag_s. live_trades.entry_ts is instead recorded at the live function invocation. Its difference from paper entry is median 2 s, P95 7 s, max 9 s. buy_ts minus live invocation is median zero, range 0–2 seconds; coarse timestamps and blockTime fallback limit interpretation. No high-resolution retention-receipt, live invocation or send timestamp is retained in this table.

39/40 confirmed records join to chain_fill by vol_id, but none of these 39 paired simulated rows has both decision and landing millisecond fields. Therefore the newer simulator timestamps cannot be used as a matched live-versus-simulation landing calibration for this sample. Do not join unrelated newer rows because their mint/age looks close.

source_evidence.json records immutable source commit 68ac601d63df5ff5c87082362624568f25112b06 and blob identities. land() polls waitConfirm; waitConfirm queries signature status and waits 200 ms between attempts. That records observation of confirmed/finalized status, not exact first inclusion. Source allows blockTime fallback. Exact historical deployment and RPC notification delay remain unverified.

## Simulation evidence, kept separate

current chain_fill contains 5,462 rows. Deduplicating timed rows by mint and s_ms_decision leaves 1,786 decision records; 1,728 have numeric landing pairs. Their simulated decision-to-reserve-reread delay is median 1,056 ms, P95 1,393.45 ms, maximum 130,680 ms. Their trigger-to-simulated-exit delay is median 850 ms, P95 1,812.7 ms, maximum 172,062 ms (1,707 pairs).

These are application scheduling/RPC-read observations around a deliberately imposed delay, not transaction landing measurements. Source waits BUY_LAND_MS (default 1,000) after initial reserve reads before rereading. Simulated exits require at least SELL_LAND_MS (default 700) and a later usable state. Keep long stalls visible; do not replace them with nominal constants. Position-level and unique-decision summaries are also in results.json to avoid treating overlapping books as independent.

## Jupiter quote shadows

current has 2,052 successful quote records over 1,337 mints: 1,724 curve-labelled and 328 graduated-labelled; 2,028 marked entry, 24 sample. snapshot3 has 1,829 identical rows; union remains 2,052, not their sum. q_ms median 34, P95 108.45, max 3,643 ms; seven exceed one second. q_gap median +1.45%, P95 +24.8515%, range -98.5% to +459.41%. These stored quote-versus-chain discrepancies require price/unit/venue freshness validation, not interpretation as executable slippage or profit.

No nonempty errors appear in this quote export. That does not establish zero quote failures because attempted-call/error coverage is not certified. Quotes are neither submissions nor fills, and the file does not establish quote request start, context slot, quote size or end-to-end signal delay for every observation.

## What remains unavailable, and useful next experiments

1. High-resolution retention-trigger receipt → computation → reserve/quote read → signing → first send → processed/confirmed → parsed-fill timing for the same decision.
2. Signed transaction identity and outcomes for all attempts, including pre-send exceptions, expiry, retries and unresolved sells.
3. Comparable entry and exit quote state/context and all fees/tips/rent/closure cash flows, matched to actual size and configuration.
4. Representative latency/fill evidence for the new first-retention signal under its actual sender, market conditions and concurrent load.

Existing evidence can inform labelled latency sensitivities, not prove one fixed live delay. A later registered development replay can compare explicit delays such as 1/1.5/2/3/5 seconds with unchanged costs and eligibility, preserving unknown fills; no such parameter search was performed here. Do not transplant the conditional historical distribution as an unconditional execution law. This audit does not authorise a live latency experiment. Existing logs beyond the approved package may be requested with provenance and timing semantics first.

## Reproduction and artifacts

Python standard library; approved package at ../entry-package-7nov. Run `python audit.py > run.log 2>&1`. Outputs: results.json (all metrics and joins), checksums.json (12 verified input identities), live_timing_ledger.json (selected public timing/signature fields; error text and keys excluded), source_evidence.json (immutable code excerpts), artifact checksum file. Percentiles use linear interpolation at (N-1)*p.

C004 completed with an evidence limitation: reliable current retention-to-fill latency remains uncalibrated. No research/runtime blocker. Monetary costs not measured; no Helius/GMGN requests. Next task C005: causal operator/funding/sniper/holder evidence audit before an entry/loss-avoidance experiment.
