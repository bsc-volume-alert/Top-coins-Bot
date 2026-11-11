# F006 part 1 — preregistered protocol (written and committed BEFORE any outcome was computed)

Run id f006-20261111T185410Z. Task F006, Autopsy A (buyer and ownership behaviour), detection half only.
The trading half (precisely specified entry/exit through frozen eval-1.1) is deferred to a later run and will be
registered there before scoring. Nothing in this run searches thresholds or rules.

## Question
At the SAME observation age (5, 15, 30 min after creation), do launches that later run differ from matched
launches that do not, in (1) new demand (buyer counts, tape-first-time buyers, repeat participants, purchase sizes,
persistence of inflow), (2) inventory safety (early-buyer selling, creator selling, concentration) and (3) coordination
proxies (repeat wallets shared with the creator's earlier launches, tape-recurring wallet share)?

## Data (development allowlist only)
- entry-all-20261107t2210 @ e67833121f1da0dc992c28fa26c5236a855c151a: tokens_window (census, 62,789 launches),
  trades_part_001..012, feed_gaps_all, coverage_per_mint. SHA256SUMS verified before use.
- entry-package-7nov @ 0e3be03c71949e069a7a31b5951f332bb563f68f: current/sol_usd.csv.gz only (USD conversion).
- Outages: the six intervals used by Codex C001 (snapshot3 MANIFEST five feed outages + 6 Nov 21:40–21:45 box resize).
- Frozen evaluator be9b5459 imported unchanged for: fl, state_ok, gap_overlap, CURVE_MAX_PX, POOL_* constants, dedup
  fingerprint logic (re-implemented identically, documented), retention definition (15 SOL gross curve buys / tier-1).
- No 8–10 Nov data, no protected outcomes, no paid APIs, no live trading.

## Population and halves
Launches created 2026-11-06 07:40:00 → 2026-11-07 20:00:00 UTC with retained trades, retention (eval-1.1 definition)
reached at receipt time ≤ decision time, and not inside an outage over [created, created+2h] (eval-1.1 denominator rule).
Early half: created < 2026-11-07 01:50:00 UTC (Codex SPLIT); late half otherwise. Everything is reported per half and pooled.

## Decision times and knowability
t = created + A for A ∈ {300, 900, 1800} s. Features use only trades with recv_ms ≤ t·1000 (rows without recv_ms are
counted and excluded from features). Cross-mint wallet history uses only trades of other mints in the same tape with
recv_ms ≤ t·1000. Because the tape holds only retained launches, "tape-first-time" is a lower bound on a wallet's real
history; this is stated as a limitation, not corrected.

## Features at t (fixed list, no additions after results)
new demand: n_buyers, n_buys, n_sells, buy_sol_total, median_buy_sol, p90_buy_sol, share_buy_sol_ge_1sol,
  first_time_buyer_share (no earlier tape buy on any other mint), repeat_buyer_share (≥5 other mints bought in the prior
  24 h of tape), net_inflow_last_60s, net_inflow_last_300s, inflow_persistence (share of 60-s buckets from creation to t
  with net SOL inflow > 0), buyers_last_60s.
inventory safety: early_buyer_sold_share (tokens sold ÷ tokens bought by wallets whose first buy was ≤ 60 s after creation,
  capped at 1), creator_bought_sol, creator_sold_share (creator wallet from census), top10_holder_share and hhi over
  trade-derived net holdings (bought − sold per wallet, floored at 0; transfers unseen), n_net_holders.
coordination proxies: same_creator_repeat_share (share of buyers who bought an earlier launch by the same creator in the
  tape before t), tape_recurring_share (share of buyers seen buying ≥2 other mints created in the previous 60 min).
context (for matching only): mcap_usd_at_t, age A, half.

## Outcomes (future data used ONLY as labels)
P_t = price_sol of the last valid state (eval-1.1 state_ok) with ts ≤ t.
(a) sustained2x: within (t, t+3600] a valid-state trade with price ≥ 2·P_t, followed ≥ 30 s later by another trade
  with price ≥ 2·P_t and no trade in between below 2·P_t.
(b) cross100k: P_t·1e9·sol_usd(ts) < 100,000 and some trade in (t, t+3600] has price·1e9·sol_usd(ts) ≥ 100,000.
  Supply is assumed 1e9 (pump.fun standard); sol_usd is the nearest earlier row of sol_usd.csv.
Label = runner if the event is observed. Label = non-runner only if ALL of: no event observed; no feed gap (main, plus pool
if any pool row) or outage overlaps [t, t+3600]; t+3600 ≤ retained_at + 125 min (curve capture); and if the curve
completed inside [t, t+3600] (any trade with price ≥ 0.98·CURVE_MAX_PX or a pool row), pool coverage must be guaranteed
(created ≥ POOL_ALL_FROM, or created ≥ POOL_RET_FROM with t+3600 ≤ retained_at+125 min). Otherwise label = unknown.
Rationale (declared here): a price rise requires a trade; with capture shown unbroken, an absent rise is an absent event.
This is a DIFFERENT, less strict coverage rule than Codex C009's path-density rule; both are reported for comparison and
neither is relabelled after seeing results. Unknowns are their own group, never non-runners.
Cross-check only: tokens_window.peak_mc_usd ≥ 100,000 and graduated flags versus label (a)/(b).

## Comparison
1. Full-group: for each age, feature medians (runner / non-runner / unknown), counts, and AUC of the feature for
   runner vs non-runner with a 2,000-resample bootstrap 95% CI. Bonferroni: 22 features × 3 ages × 2 outcomes = 132 tests;
   a feature is "flagged" only if its CI excludes 0.5 at level 0.05/132. Flagged ≠ supported; it is a hypothesis for later
   untouched data.
2. Matched: each runner matched to up to 5 non-runners of the same half, same age, created within ±120 min, nearest
   |log mcap_usd_at_t| (without replacement, greedy in creation order). Same statistics on the matched set.
3. Report everything tried, counts of unknowns, and the agreement with Codex C009 positive counts (56/21/9 sustained-2x
   observations at 5/15/30 min under its definition) as a factual comparison.

## Not done here
No rule, threshold or classifier search; no trading simulation; no claim of profitability or predictive performance.
