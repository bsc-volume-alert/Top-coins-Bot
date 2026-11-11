# F006 part 1 — Autopsy A (buyer and ownership behaviour), detection at matched observation ages

Run f006-20261111T185410Z, Claude research worker, first unattended run (2026-11-11 18:54 → ~19:40 UTC).
Task F006 was taken instead of the lower-numbered F001 because RESEARCH_QUEUE.md marks the runner autopsy as the owner's
priority for each worker's next run and Codex's C010 is blocked on a published F006. F001 remains READY and is the next run.

This run covers the DETECTION half of F006 only (did knowable-at-time buyer/ownership measures differ between launches
that later ran and matched launches that did not). The TRADING half (a precisely specified entry/exit through the frozen
evaluator) was not run; it will be registered before scoring in a later run. **Nothing here is a validated predictor or a
profitability claim.** Flagged features are hypotheses generated on development data; they can only be judged on untouched data.

## Inputs (all verified; see build_summary.json → checks)
- entry-all-20261107t2210 @ e67833121f1da0dc992c28fa26c5236a855c151a — 16/16 SHA256SUMS entries pass. 62,789 census launches;
  4,913 mints streamed; 1,568,880 duplicate rows removed by the evaluator's full-fingerprint rule; 0 non-contiguous mints.
- entry-package-7nov @ 0e3be03c71949e069a7a31b5951f332bb563f68f — current/sol_usd.csv.gz only (sha 93cb758f…, 770 rows,
  2026-11-06 10:24 → 2026-11-07 11:25 UTC; SOL ≈ $90 throughout). Times outside that range use the nearest row.
- blind-eval-1.1 @ be9b5459e2f7670946d9ca012f875b77aaaf5d5b — evaluate.py sha f5686511… matches EVAL_SHA256.txt; imported
  unchanged for load / iter_mints / state_ok / state_at / gap_overlap / constants. Not edited.
- Outages: the six intervals Codex C001 used (snapshot3 MANIFEST five feed outages + 6 Nov 21:40–21:45 box resize).
- Codex material read (not copied): research-codex @ 0aa4b4998d296239f5950ec599e3989eefc6f907 (C009 README, STATUS, SCOREBOARD, REVIEW_REQUESTS).
- No 8–10 Nov data, no protected outcomes, no paid APIs, no live or paper trading.

## Method (as preregistered in PROTOCOL.md, committed at 3f07ae0 before any result)
Denominator identical to eval-1.1 / Codex C001: 3,638 launches (301 never retained, 974 outage-excluded). Ages A ∈ {5, 15, 30} min;
decision time t = created + A; features from trades with recv_ms ≤ t only; cross-mint wallet history from the same tape with
recv_ms ≤ t. Outcomes computed from future data only: (a) sustained2x = price ≥ 2 × state price at t, held across trades ≥ 30 s,
within 1 h; (b) cross100k = market cap (price × 1e9 supply × SOL/USD) crosses $100K within 1 h from below. Non-runner only when
capture is shown unbroken (registered rule: no feed gap or outage overlapping [t, t+1h], curve window inside retention + 125 min,
pool coverage guaranteed if the curve completed); otherwise unknown. Full-group and matched (≤5 non-runners per runner, same half,
created within ±2 h, nearest log market cap at t, without replacement) comparisons; AUC per feature (Mann-Whitney), 2,000-resample
bootstrap 95% CI, Bonferroni α = 0.05/132 = 3.79e-4. Commands: `commands.sh`.

### One deviation, declared
The registered coverage rule produced 2,044 unknowns of 3,410 at 5 min because the main feed has 57 logged socket gaps, mostly
6–13 s long (total 377 s over 36 h; one 141-s gap on 7 Nov 04:56). A 1-h window overlaps one of them for most launches.
AFTER seeing that count I added a SENSITIVITY variant `tol30` that ignores main-feed gaps shorter than 30 s. Justification (logical,
not fitted): a sustained-2x episode requires ≥ 30 s of trades above 2×, so a gap shorter than 30 s cannot contain one entirely.
For cross100k the same tolerance is weaker (a single crossing trade can fall inside a short gap). Both label sets are reported;
runners are identical under both (the tolerance only moves records from unknown to non-runner). Neither was relabelled after
seeing feature results.

## Counts (every launch × age; results.json has everything)
| Age | records | status ok | no state at t (gap / invalid) | sustained2x R / N / U (registered) | R / N / U (tol30) | cross100k R / N / U (registered) | (tol30) | already ≥$100K at t |
|---|---:|---:|---|---|---|---|---|---:|
| 5 min | 3,638 | 3,410 | 84 / 142 (+2 not yet retained) | 117 / 1,249 / 2,044 | 117 / 3,052 / 241 | 36 / 1,261 / 2,062 | 36 / 3,099 / 224 | 51 |
| 15 min | 3,638 | 2,958 | 535 / 145 | 56 / 1,107 / 1,795 | 56 / 2,659 / 243 | 22 / 1,106 / 1,777 | 22 / 2,673 / 210 | 53 |
| 30 min | 3,638 | 2,451 | 1,041 / 146 | 24 / 906 / 1,521 | 24 / 2,218 / 209 | 13 / 902 / 1,494 | 13 / 2,215 / 181 | 42 |

Unknown reasons (registered rule, 5/15/30 min): gap or outside capture 1,920 / 1,688 / 1,441; curve completed without guaranteed
pool coverage 124 / 107 / 80. "No state at t" grows with age because dead coins have long trade-free stretches that contain a
socket blip, which eval-1.1 treats as a broken state; those launches are their own group (not non-runners) throughout.
Runners by half (sustained2x): 5 min 37 early / 80 late; cross100k runners are all late-half (36 / 22 / 13) because $100K is ≈2.7× the
curve-completion cap at $90 SOL (~$37K), so a crossing needs pool price evidence, which exists only from tracker 0.19.9 (7 Nov 09:57).
Max multiple within 1 h among labelled launches at 5 min: n 907, median 1.00, p90 2.66, max 53.2.

Matched sets (registered labels): 5 min sustained2x 94 runners (23 had no eligible match) vs 460; 15 min 43 (13 unmatched) vs 212;
30 min 19 (5) vs 94; cross100k 28 vs 139, 16 vs 78, 7 vs 35. tol30: 117 vs 585, 56 vs 280, 24 vs 120 (all runners matched 5:1).

Comparison with Codex C009 (its definition: net sellable proceeds ≥ 2× stake after fees and 1-s landing, held 30 s with
observations ≤ 30 s apart): 56 / 21 / 9 positives at 5/15/30 min among 3,489/3,488/3,487 attempts, zero negatives under its
2-h path-density rule. This run: 117 / 56 / 24 positives under a price-only, 1-h definition and 1,249 / 1,107 / 906 negatives under
the registered coverage rule (3,052 / 2,659 / 2,218 under tol30). The difference in positives is the definition (price vs net
proceeds, 1 h vs 2 h), not a dispute of Codex's numbers, which were not re-run here (F007 is the place for that).

Census cross-check: tokens_window.peak_mc_usd is capped near the curve completion (~$36.9K for graduated coins) and shows 17
values ≥ $100K that do not coincide with any trade-derived crossing (e.g. 4ZzioLtL peak $135,828 vs $191 at 5 min) — consistent
with Codex C003's 45 suspicious-jump flags. The census peak is therefore not usable as an outcome cross-check; graduated flag:
73 of 117 sustained2x runners at 5 min are census-graduated vs 111 of 1,249 non-runners.

## Measured results — sustained2x (registered labels), AUC runner vs non-runner (>0.5 = higher in runners)
Full group, 5 min (117 vs 1,249): buyers_last_60s 0.889 [0.86, 0.92] (median 50 vs 0); inflow_persistence 0.872 [0.84, 0.90]
(0.80 vs 0.20); net_inflow_last_300s 0.811 (+11.8 vs −4.2 SOL); n_buys 0.790; buy_sol_total 0.789; n_buyers 0.783 (183 vs 62);
n_net_holders 0.856 (112 vs 8); early_buyer_sold_share 0.254 [0.22, 0.29] (0.75 vs 0.94); sells_to_buys_ratio 0.183 (0.77 vs 0.98);
top10_holder_share 0.211 [0.18, 0.25] (0.63 vs 1.00); hhi 0.224 (0.062 vs 0.343); creator_sold_share 0.309 [0.25, 0.37] (median 0 vs 1.0;
88 runners / 845 non-runners whose creator bought on the tape); tape_recurring_share 0.380 (0.50 vs 0.57); p90_buy_sol 0.318
(0.97 vs 1.04 SOL); median_buy_sol 0.356.
Not flagged at 5 min (CI covers 0.5): share_buy_sol_ge_1sol 0.50, first_time_buyer_share 0.51, repeat_buyer_share 0.50,
creator_bought_sol 0.49, same_creator_repeat_share 0.36 [0.20, 0.54] (only 13 runners / 344 non-runners had a prior same-creator launch in the tape).

Matched, 5 min (94 vs 460, matched on half, ±2 h creation, market cap at t): the same directions survive with smaller effects:
buyers_last_60s 0.792 [0.74, 0.84] (45 vs 1); inflow_persistence 0.781 (0.8 vs 0.4); n_net_holders 0.763 (107 vs 21);
net_inflow_last_300s 0.762 (+11.6 vs −1.9 SOL); n_buys 0.707; buy_sol_total 0.704; n_buyers 0.679; sells_to_buys_ratio 0.240
(0.77 vs 0.94); early_buyer_sold_share 0.303 (0.75 vs 0.90); top10_holder_share 0.308 (0.63 vs 0.96); hhi 0.314; creator_sold_share
0.319 (0 vs 1.0); p90_buy_sol 0.350. Not flagged: first_time_buyer_share 0.53, repeat_buyer_share 0.44, tape_recurring_share 0.42,
share_buy_sol_ge_1sol 0.51, creator_bought_sol 0.50, median_buy_sol 0.40, same_creator_repeat_share 0.43 [0.21, 0.66].

Matched, 15 min (43 vs 212): inflow_persistence 0.824; buyers_last_60s 0.794 (15 vs 0); n_net_holders 0.740; n_buys 0.734;
n_sells 0.737; buy_sol_total 0.722; net_inflow_last_60s 0.705; creator_sold_share 0.223 (0 vs 1.0); sells_to_buys_ratio 0.241.
Matched, 30 min (19 vs 94): inflow_persistence 0.908 [0.84, 0.96]; buyers_last_60s 0.870 (87 vs 0); n_buys 0.840 (6,300 vs 285);
n_sells 0.845; creator_sold_share 0.240; sells_to_buys_ratio 0.192 (0.55 vs 0.96). At 30 min runners' median buy is tiny
(median_buy_sol 0.006 SOL, p90 0.048 SOL, AUC 0.25–0.29 in tol30 matched) with thousands of buys — the 30-min runners look like
already-migrated coins with high-frequency small trades, not fresh demand; this is an observation, not a mechanism claim.

Half stability (full group, 5 min): every flagged feature has the same direction in both halves but the early half is weaker
(n_buyers 0.68 vs 0.83, n_buys 0.67 vs 0.84, early_buyer_sold_share 0.35 vs 0.18, sells_to_buys_ratio 0.29 vs 0.11); only
inflow_persistence (0.85 / 0.88), net_inflow_last_300s (0.82 / 0.82) and buyers_last_60s (0.84 / 0.90) are similar in both.
tol30 labels (3,052 non-runners at 5 min) give the same full-group AUCs within ±0.02 (e.g. top10_holder_share 0.223, hhi 0.235,
creator_sold_share 0.298, tape_recurring_share 0.361, n_net_holders 0.853). In tol30 matched sets the concentration measures are NOT
flagged at 15 min (top10 0.42, hhi 0.41) or 30 min (0.53, 0.50): concentration separates groups mainly at 5 min.

cross100k (36 / 22 / 13 runners, all late half, matched 28 / 16 / 7): the same activity features dominate (n_buys 0.92, n_sells 0.90,
n_buyers 0.83 full at 5 min; matched 30 min tol30: n_net_holders 0.94, buyers_last_60s 0.93, tape_recurring_share 0.03 [0.00, 0.08]
with 13 vs 65). This outcome is weak as registered: 51 launches were already ≥ $100K at 5 min and several runners started at
$77–100K and crossed by < 1.3×; it should be redefined (e.g. ≥ $100K AND ≥ 2× from t) before any further use.

Overall: 308 (age, outcome, set, feature) cells are flagged at α = 3.79e-4 out of 22 × 3 × 4 × 2 = 528; they are not independent
(ages share launches, tol30 shares runners with the registered labels, n_buys/n_sells/n_buyers/buy_sol_total co-move).

## What this does and does not say
- Measured: at matched market cap and time, launches that went on to a sustained 2× within the hour had, at the decision time,
  more buyers in the last 60 s, positive net inflow in more one-minute buckets since creation, more trade-derived net holders,
  less concentrated trade-derived holdings, a lower sold/bought ratio among first-minute buyers and overall, and a creator who
  had not sold — on development data, with every number above.
- Not measured: any trading result. Whether an entry conditioned on these features captures net profit after the brief's costs
  and latency is unknown; the early-whale-exit specification (Codex L001) already lost on resolved trades despite being in the
  same family, so direction of a feature is not evidence of tradability.
- Not supported: "coordination" proxies. first_time_buyer_share, repeat_buyer_share and same_creator_repeat_share did not
  separate the groups at 5 min; tape_recurring_share did only in some cells. The tape holds retained launches only, so these
  wallet-history measures are lower bounds on real history, and funding links (fd_watch / buyer_funding) were not used because
  their knowledge timestamps are unresolved (Codex C005).

## Limitations
1. Unknowns dominate under the registered rule (60% at 5 min); the tol30 variant was added after seeing that and is labelled as such.
2. Trade-derived holdings ignore transfers and wallets outside the tape; "holders" are net buyers on the tape, not verified balances.
3. Supply assumed 1e9; SOL/USD from a 6 Nov 10:24 → 7 Nov 11:25 series extrapolated flat outside; pool prices only where
   eval-1.1 evidence fields exist (tracker 0.19.9+), so pool-phase outcomes before 7 Nov 09:57 are unknown, not negative.
4. Ages are not independent samples; CIs are per cell. Early-half effects are weaker than late-half for most features.
5. The matched set drops runners without a same-half, ±2 h, mcap-known non-runner (23 of 117 at 5 min, registered labels).
6. This is hypothesis generation on the data that produced it; nothing here was tested on untouched data.
7. Features were computed over ALL knowable rows including pool rows without evidence (used for counts/sizes only, never prices).

## Reproduce
    sha256sum -c SHA256SUMS.txt            # in the entry-all data dir
    python3 -I build_features.py --data <entry-all dir> --solusd <current/sol_usd.csv.gz> --eval <dir with evaluate.py> --out <work>
    python3 -I analyze.py --features <work>/features_labels.csv.gz --summary <work>/build_summary.json --out <work>/out
Runtime ≈ 2.5 min build + 7.5 min analysis on 2 vCPU. Outputs here: build_summary.json, build.log, features_labels.csv.gz
(record-level, 10,914 rows = 3,638 × 3), results.json (all cells), matched/*.csv.gz (the matched records per outcome and age).
ARTIFACT_SHA256SUMS.txt lists every file in this folder.

## Next
F001 (independent review of Codex C001–C004) per the queue order; then F006 part 2 (trading half): register ONE entry/exit
specification from the 5-min matched findings (candidates: buyers_last_60s / inflow_persistence / creator_sold_share) and score it
unchanged through eval-1.1 on both halves with costs, unknowns and no-best-mint, before any threshold is looked at on outcomes.
