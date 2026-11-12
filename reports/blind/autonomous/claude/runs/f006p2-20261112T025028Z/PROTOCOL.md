# F006 part 2 (trading half) + Idea lab CL-L002 — registered before any outcome was computed
Run f006p2-20261112T025028Z, Claude research worker. Committed before the simulation was started; no outcome, P&L or
threshold-on-outcome was looked at before this file was written. Inputs: entry-all-20261107t2210 @ e678331 (16/16 SHA256 verified),
entry-package-7nov @ 0e3be03 (current/sol_usd.csv.gz, not needed for trading), blind-eval-1.1 @ be9b545 (evaluate.py sha f5686511…,
imported unchanged). Denominator: the eval-1.1 common denominator (3,638 launches: retained, six-interval outage exclusion), both halves
(split 2026-11-07 01:50 UTC, as in F006 part 1 and C001).

## Question (F006 trading half)
Part 1 found, at matched age and market cap on development data, that later sustained-2× runners had at the 5-min decision time
less concentrated trade-derived holdings (top10_holder_share AUC 0.31), first-minute buyers who had sold less (early_buyer_sold_share 0.30)
and a creator who had not sold (creator_sold_share 0.32, median 0 vs 1). Codex's C010/L003 tests the ACTIVITY side (buyers_last_60s etc.).
This run tests the OWNERSHIP side only: given a live coin at 5 min, does "inventory is still held" capture net SOL after costs?
Competing explanation: held inventory at 5 min is simply inventory that has not been dumped YET; the dump arrives during the hold and the
rule loses like every fixed-age entry so far (C001 ID34, L001, L002, CL-L001 controls).

## Shared eligibility screen E (coordinator rule R10: candidate and control share it; only the hypothesis condition differs)
Decision time t = created + 300 s exactly (evaluator decision_offsets=[300], on_trade=False), t ≥ retention receipt (evaluator-enforced).
Using only trades received by t (the evaluator's view, recv_ms ≤ t): the last received trade is a curve row with a valid state
(evaluate.state_ok), and ≥ 5 distinct wallets made a curve buy with block time > t − 60 s ("buyers_last_60s ≥ 5", part-1 definition).
The liveness floor is in E (not in the candidate) so that activity — Codex's L003 question — is held fixed on both sides.
CONTROL = E alone.

## Candidate F006-T1 "held inventory" (ONE fixed specification, no sweep)
E and all three of: (a) the creator (tokens_window.csv creator column, known at creation) has sold 0 tokens on the tape by t
(whether or not the creator bought on the tape); (b) early_buyer_sold_share ≤ 0.8 — first-minute buyers (wallets whose first received
buy has block time ≤ created + 60 s) have sold at most 80 % of the tokens they bought; a launch with no first-minute buyer on the tape
FAILS (b) (condition not evaluable); (c) top10_holder_share ≤ 0.8 — the ten largest trade-derived net holders hold ≤ 80 % of all
trade-derived net holdings (purchases − sales per wallet, floored at 0, received rows only).
The two 0.8 thresholds are fixed here from the part-1 published medians (non-runners ≈ 0.9–1.0, runners ≈ 0.63–0.75); they were
generated on this data and are judged here only as a development result, never as a validated predictor.

## Idea lab candidate CL-L002 "buy-size diversity" (ONE fixed specification)
Hypothesis (unconventional, from the 11 Nov dialogue "buy-size dispersion" proposal, made concrete here): scripted wallet groups buy in
near-identical sizes; organic buyers do not. E and: among curve buys received by t with block time > t − 60 s, the share of buys whose
SOL amount (rounded to 4 dp) equals the most common amount is ≤ 0.5. Competing explanation: size clustering is a bot artefact that is
equally present on coins that run, so the veto removes nothing useful and only shrinks the sample.
Both candidates are subsets of CONTROL at the same decision time, so on any candidate launch the candidate and control trades are
IDENTICAL. The R11 paired view therefore degenerates; instead the report partitions CONTROL into candidate / complement (E but not the
condition) with the same launch counts, which is the informative comparison and is stated as such. No other variant.

## Exit (all specifications), costs, latency
Exit when sellable net proceeds (evaluator p.x = (sell(state, tokens) − 0.0015) / 0.2) fall to ≤ 70 % of their running high since fill,
or at 2 h. Two scorings, both with the frozen evaluator unchanged:
S1 — frozen eval-1.1 score: evaluate.main() with the three rule files (--from 2026-11-06T07:40:00 --to 2026-11-07T20:00:00), K = 3,
     pool 30 bps and the evaluator's own 125-bps sensitivity, its unknown/abstain/LCB/scorable/supported fields reported verbatim.
S2 — owner common scenario R4: run_launch with pool_bps = 55, 0.2 SOL, buy lands +1 s, sell +0.7 s, curve 125 bps, 0.0015 SOL fixed,
     30 % trail, 2 h cap; a landing state older than 30 s is reported as unavailable (fill) / uncertain (exit) by a post-check
     (evaluator unchanged), exactly as in CL-L001 (run f001).
Reported for each specification and half: attempted / filled / unavailable, total SOL, mean / median return, win rate, share losing
> 50 %, without best 1 and 3, uncertain exits separately, entry-age (always 300 s), fill-state age. Unknown outcomes are never scored
as losses or zeros in totals. Best-3 removal is a stress test, not a veto.

## What would count as what
Measured result only. Neither candidate can be called "supported" from this run whatever the sign: the thresholds and the features
come from the same 36 h of data. A positive total on resolved trades would be a hypothesis for untouched data; a negative total is a
development failure of this specification, not of the ownership mechanism in general.
