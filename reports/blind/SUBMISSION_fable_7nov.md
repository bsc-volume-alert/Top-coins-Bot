# Independent analysis — pump.fun launch rule, brief of 7 Nov 2026 (analyst: Claude "Fable", session 1 of 3)

**Frozen at 2026-11-07 15:19 UTC** (before 8 Nov 00:00 UTC). Written before reading anyone else's work. Data: branch `entry-package-7nov` @ 0e3be03c (supplement + snapshot3 + current), checksums verified. Scripts used are in `reports/blind/fable_7nov/`.

## 0. Bottom line

**The development data does not support any profitable rule.** Every entry rule I could define from the raw trades loses money after costs in the clean half of the data, and the one lead that was positive in both halves (enter at the first PumpSwap trade after migration, sell after 300 s) has a bootstrap lower bound below zero in both halves on its own, before any correction for the number of rules tried. I freeze that lead as my single forward test because the brief requires one primary rule, **and I predict it will not pass**: my central expectation for the test period is between −3% and +2% per scored entry, with a lower bound below zero.

Why I believe this: a 0.2 SOL round trip on the curve costs about 4.6% (fees 1.25% each way, fixed 0.0015 SOL, ~0.65% impact each way), and the average price drift in the 20–60 s after any 60 s+ entry is roughly zero; what turns "zero drift" into −15% to −35% per trade is path dependence under a trailing stop (30–45% of bar-passing coins lose ≥ 50%). No feature observable at the decision time changes the sign; some reduce the losses.

---

## 1. Frozen primary rule (the forward test)

**Name:** MIG300 — post-migration 300-second hold.

**Universe / eligibility (evaluator step 1, 2a):** every launch created in the test period that is retained (gross buys ≥ 15 SOL or bundle tier-1) at or before the decision time t. No funding, creator or bundle fields are used, so no lookup-time conditions apply.

**Entry (decision time t):** t = `recv_ms` of the **first recorded PumpSwap pool trade** of the mint (the first row with venue = pumpswap, ordered by slot, ev_idx, row_id, taken by its receipt time). Conditions, all evaluated on data received by t:
1. the mint was retained at or before t (as above);
2. t − create_ts ≤ 7,200 s (the migration happened within 2 h of creation);
3. the pool evidence for the mint is confirmed: quote_mint is wrapped SOL, base decimals 6, quote decimals 9, fee basis points from the stored evidence or on-chain config (brief step 4). If it cannot be confirmed the launch is **unknown (c)** for this rule, never assumed.

Nothing else. No price, volume or holder condition. One entry per mint.

**Fill (step 2):** buy 0.2 SOL (and an independent 0.02 SOL position) on the pool reserves after the last recorded trade with block time ≤ t + 1,000 ms. If that state is still the completed bonding curve (no pool trade with block time ≤ t + 1,000 ms), the fill is **unavailable → (c)**; it is never moved later.

**Exit (step 3):** a fixed-time exit. Trigger = t + 300,000 ms. Sell the whole position on the pool reserves after the last recorded trade with block time ≤ trigger + 700 ms. Horizon = 300 s (so trigger and horizon coincide; the sale is on the state as of t + 300.7 s). Same exit for the 0.02 SOL position (it has no separate trail). No trailing stop, no take-profit, no re-entry.

**Migration:** entry is after migration, so there is nothing to carry across. If the pool state at any valuation fails the basic checks (non-positive reserves, unconfirmed decimals/fees), that leg is unavailable → (c).

**Costs:** pool fees on both legs from the pool's config (LP 0.20% + protocol 0.05% + coin-creator fee; I used 0.55% total in development), plus 0.0015 SOL fixed per round trip.

**Sizing:** 0.2 SOL primary; 0.02 SOL scored independently with the same exit.

**What I expect (stated before the test):** per scored entry mean −3% … +2%; win rate ≈ 50–55%; share losing ≥ 50% ≈ 15%; **not supported** at the Bonferroni lower-bound test.

---

## 2. Development results for MIG300 (my replay, same cost and latency model)

Development data for this rule can only start at **6 Nov 19:31 UTC** (tracker 0.19.6), when pool trades began to be kept for retained launches. Earlier migrations have no pool history and are unknowable. Time split for this rule: **half 1 = created 6 Nov 19:31 → 7 Nov 06:00, half 2 = 7 Nov 06:00 → 14:31** (the last creation in the supplement). The rule was first seen as "positive in both halves" at the exploration stage on this same split; it was not tuned after that (the 300-s hold is the value I first scanned, see §3, and the hold-time curve is given below so the reader can judge the bump).

Units: per launch that the rule attempts (N below is attempts; in the evaluator's common denominator the abstentions on non-migrating retained launches add zeros and shrink the point estimate but not the sign).

| | Half 1 | Half 2 | Both |
|---|---|---|---|
| Attempts N (migrations ≤ 2 h, pool capture available) | 94 | 108 | 202 |
| (a) scored | 93 | 107 | 200 |
| (c) unknown (feed gap over the exit) | 1 | 1 | 2 |
| **0.2 SOL** point estimate (unknown = 0) | +0.0570 | +0.0180 | +0.0361 |
| **0.2 SOL** lower bound (unknown = −100.75%) | +0.0463 | +0.0086 | +0.0261 |
| mean / median per scored entry | +0.058 / +0.041 | +0.018 / +0.024 | +0.037 / +0.026 |
| win rate | 0.62 | 0.57 | 0.59 |
| without the best coin | +0.024 | −0.010 | +0.021 |
| share losing ≥ 50% | 0.151 | 0.140 | 0.145 |
| total net SOL (0.2 stakes) | +1.07 | +0.39 | +1.46 |
| **bootstrap 5th percentile of the lower-bound score** (10,000 resamples, seed 20261108) | **−0.049** | **−0.075** | −0.038 |
| 95% interval of the point estimate | −0.051 … +0.176 | −0.081 … +0.123 | −0.038 … +0.116 |
| **0.02 SOL** point / lower bound | −0.006 / −0.018 | −0.045 / −0.055 | −0.027 / −0.038 |
| 0.02 SOL win rate, without best | 0.45, −0.040 | 0.42, −0.074 | 0.43, −0.043 |
| peak concurrent positions | | | 5 |

**Why it is not credible even where positive:**
- Hold-time curve (0.2 SOL, both halves, mean return): 10 s −2.9%, 30 s −1.5%, 60 s −1.5%, 120 s −0.3%, 180 s +0.2%, 240 s −0.3%, **300 s +3.6%**, 360 s +1.5%, 420 s +0.1%, 480 s +0.5%, 600 s −0.8%, 900 s −1.6%, 1200 s −2.2%, 1800 s −4.2%. The gross price multiple at 240 s is 1.018, at 300 s 1.062, at 360 s 1.033. A real post-migration drift would not spike at one hold time.
- By migration speed: migrations within 120 s of creation (157 of 202, 78%) return **−1.5%**; the positive mean comes from 18 slow migrations (10–30 min after creation) averaging +49%, i.e. a few outliers.
- Population: in the same window the census shows **439 graduations**; the development set has pool histories for only **165** of them (38%), because the supplement only holds coins some earlier book entered at 60–120 s. The test population for this rule is mostly launches never observed in development.
- The 0.02 SOL version is negative in both halves (the fixed fee is 7.5% of a 0.02 stake).

---

## 3. Everything I tried (counts)

All replays use my own engine written to the brief: decisions from trades with `recv_ms` ≤ t; buy on the reserves as of t + 1,000 ms; trail/take-profit evaluated on the state after each received trade; sell on the state as of trigger + 700 ms; 2-h horizon; curve fee 1.25% and pool fee 0.55% per leg; 0.0015 SOL fixed; exact pump.fun constant-product maths (verified: price = vSol/vTok exactly on every curve row; initial reserves 30 SOL / 1.073e15); fills and exits on a completed curve with no pool state → unavailable; feed gaps and the manifest's outages → unknown; pool states for mints created before 6 Nov 19:31 → unknown; rows without `recv_ms` (5 Nov before 20:12) excluded. Duplicated rows (1,104,147 of 4,241,610, from overlapping capture paths) removed by full fingerprint.

**Validation of the engine:** replaying the bot's own 4,650 closed positions at their recorded `ms_decision` with the bot's venue trail gives a mean of −0.291 vs the bot's −0.309 (correlation 0.77; median absolute difference 0.018). Book by book: BL −0.224 vs −0.231, E60 −0.228 vs −0.221, E90 −0.202 vs −0.222. The large disagreements are (i) the bot's pool reads where the supplement has no pool capture (pre-19:31; I mark these unknown) and (ii) at least one case where the bot's simulator missed a crash to 0.10× within 18 s of entry (8vGTnz…, bot −4%, trades say −91%). I therefore trust the trade-level replay over `r_frac_020`.

**Development population caveat (applies to every number in §3):** the supplement's 1,183 mints are coins some book entered, i.e. coins that passed at least the BL bar (net ≥ 15 SOL and market cap ≥ 60 SOL at a launcher check at 60–120 s). This makes decision ages < 60 s unusable (a 30-s entry on coins known to be strong at 60 s is look-ahead through selection; the 30-s row below is shown only to document that). From 6 Nov 07:40 UTC the BL book entered every screened launch passing that bar, so for decision ages ≥ 60 s the population approximates "all launches passing the BL bar", minus launcher gaps.

**Time split for the 60 s+ analyses:** half A = created 6 Nov 07:40 → 22:00 (454 mints at 60 s), half B = 6 Nov 22:00 → 7 Nov 14:31 (516 mints); "pre" = before 07:40 (86 mints, funded-creator books only). Half A has 20–30% unknown outcomes (migrations before pool capture), which biases A **downward** (the migrated winners are the unknowns). Half B has ~0–1% unknowns and is the clean estimate.

Count of distinct things evaluated (each cell = one rule variant looked at):

| Stage | What | Count |
|---|---|---|
| 1 | Unconditional entry at ages 30, 45, 60, 90, 120, 180, 300 s × 10 exits (bot trail 40/25; trails 20/30/50; 2.0× TP + 40% trail; 1.5× TP + 30% trail; fixed holds 20, 60, 180, 600 s) | 70 |
| 2 | Feature screens on half A only: 26 features (net, gross, sells, buyers, holders-still-holding, mc, drawdown from high, top-1/top-3 buyer SOL and shares, same-slot bundle SOL/count/share, net in last 10/20 s, retention age, max buy, sellers, sell count, buy count, receipt lag, holding fraction, sell ratio, buys per buyer, SOL per buyer) × quartiles × 3 exits × 2 ages | 156 |
| 3 | Organic-launch combinations (BL bar at t plus: retention age ≥ 5 or ≥ 10 s; same-slot bundle buys ≤ 1; bundle SOL ≤ 1; and pairs) × 4 exits × ages 60/90/120, checked A → B | 72 |
| 4 | Migration entry (first pool trade) × 6 exits; then the hold-time curve 10–1800 s (14 holds) | 20 |
| 5 | Breakout (price within 2% of its high and net inflow over the last 20 s > 0 or > 2 SOL) and dip-buy (drawdown ≤ 0.6 with net ≥ 15; drawdown 0.5–0.75 with positive last-10-s net) × 4 exits × ages 120/180/300, checked half-B1 → half-B2 | 48 |
| | **Total rule variants / thresholds / features looked at** | **≈ 366** (26 features, 10 exits, 7 decision ages, ~20 threshold values) |

With ~366 looks, finding one cell at +3.6% with a 95% interval of −4% … +12% is exactly what noise produces.

### 3a. Stage 1 — unconditional, all coins with `recv_ms` (mean return after costs per scored entry; "c" = unknown share)

| age | bot trail | trail 30 | trail 20 | 1.5×TP/30 | hold 20 s | hold 60 s | hold 180 s | hold 600 s |
|---|---|---|---|---|---|---|---|---|
| 30 s (selection-biased, see above) | −0.126 | −0.045 | −0.004 | +0.034 | +0.047 | +0.072 | −0.015 | −0.180 |
| 60 s (n=1056) | −0.205 | −0.145 | −0.098 | −0.073 | −0.041 | −0.035 | −0.131 | −0.237 |
| 90 s | −0.199 | −0.149 | −0.101 | −0.086 | −0.037 | −0.054 | −0.137 | −0.228 |
| 120 s | −0.189 | −0.156 | −0.119 | −0.105 | −0.054 | −0.077 | −0.139 | −0.201 |
| 180 s | −0.147 | −0.128 | −0.103 | −0.095 | −0.051 | −0.074 | −0.116 | −0.166 |
| 300 s | −0.105 | −0.094 | −0.093 | −0.064 | −0.044 | −0.063 | −0.079 | −0.128 |

Win rates at 60 s: 24% (bot trail) to 44% (hold 60 s). Unknown share 11–15%. **Every exit is negative at every usable age.** Short holds lose roughly the round-trip cost (−4%): the price does not drift on average; trails lose more because they sell the dips.

### 3b. Stage 2 — what the features say (age 60 s, bot trail, half A, n=347, quartile means)

Strongest (Spearman ρ with return): retention age (q1 −0.57 → q4 −0.04, ρ +0.46), same-slot bundle count (q1 −0.15 → q4 −0.60, ρ −0.49), holding fraction (ρ −0.46), bundle SOL (ρ −0.43), net inflow (q1 −0.13 → q4 −0.44, ρ −0.32), top-1 buyer share (ρ +0.32). The coherent story: launches that were sniped/bundled to 15 SOL in the first second lose most; "organic" launches (slow to 15 SOL, no same-slot bundle, lower net, many early buyers already out) lose least — **but the best quartile of every feature is still ≤ 0**. With the 60-s hold the same features move returns from −0.20 to +0.10 at best in A.

### 3c. Stage 3 — organic-launch rules, A found → B checked (0.2 SOL, mean per scored entry; n scored)

| rule (at 60 s, BL bar + …) | exit | half A | half B |
|---|---|---|---|
| BL bar only | bot trail | −0.378 (315) | **−0.156 (460)**, win 0.29, ≥50% loss 0.31 |
| BL bar only | hold 60 s | −0.122 (334) | −0.068 (461) |
| retention age ≥ 10 s | bot trail | −0.154 (27) | −0.206 (46) |
| retention age ≥ 10 s | hold 60 s | +0.025 (28) | −0.080 (46) |
| retention age ≥ 5 s | hold 60 s | +0.049 (59) | −0.112 (86) |
| retention age ≥ 5 s | 1.5×TP/30 | +0.039 (61) | −0.098 (86) |
| bundle buys ≤ 1 | bot trail | −0.117 (20) | −0.007 (69) |
| bundle buys ≤ 1 | hold 60 s | +0.022 (21) | −0.040 (69) |
| ret ≥ 5 & bundle ≤ 1 | 1.5×TP/30 | +0.186 (4) | −0.219 (15) |
| same at 90 s, bundle ≤ 1 | bot trail | −0.032 (24) | +0.033 (71), without best −0.043 |
| same at 120 s, bundle ≤ 1 | bot trail | −0.156 (27) | −0.043 (73) |

Every cell that is positive in A is negative in B, or positive only because of one coin. Nothing holds.

### 3d. Stage 5 — breakout and dip, half B1 (6 Nov 22:00 → 7 Nov 06:00) → B2

Breakout at 120 s (price ≥ 98% of its high, net20 > 0): bot trail −0.233 (62) → +0.073 (67) but −0.054 without the best coin; hold 60 s −0.068 → −0.005. At 180 s and 300 s negative in both halves for every exit. Dip-buys (drawdown ≤ 0.6, net ≥ 15): −0.25/−0.15 (120 s), −0.16/−0.16 (180 s), −0.20/−0.00 (300 s). The milder dip (0.5–0.75 drawdown, positive last-10-s net) is +0.47 in B2 at 120 s on 13 coins — one coin; −0.27 at 300 s. Noise.

---

## 4. What I believe, what would change my mind, risks

**Belief.** On this market, entering a pump.fun launch at 60 s or later with 0.2 SOL and exiting within 2 h is negative expectation after costs by roughly 5–20% per trade, and the loss is dominated by (i) the ~4.6% round-trip cost, (ii) 30–45% of bar-passing launches losing ≥ 50% quickly (bundled/sniped launches dumping), and (iii) trailing stops that sell dips. The features visible at 60 s separate "bundled" from "organic" launches well enough to reduce losses, not to make money. The winners (6–10× coins) exist but are not predictable at 60 s from the trade tape alone: in half B the best single coin lifts the BL mean by only 2 points.

**What would change my mind.**
- A test-period result for MIG300 with a lower-bound Bonferroni bound above 0 (I expect it not to happen).
- A feature that is **not** in the trade tape: e.g. creator/funder history with a measured hit rate, or social attention, shown on a population that is not selected by an earlier book.
- Evidence that real fills are better than the model (e.g. buys land earlier than 1 s), which would help the 20–60 s holds that currently lose about the cost.

**Risks of my development work.**
- *Selection:* the supplement is book-entered coins only. For the migration rule, 62% of real graduations are unobserved. For 60 s+ rules, the population approximates "passed the BL bar" only from 6 Nov 07:40.
- *Pool coverage:* pool capture starts 6 Nov 19:31 and pool evidence fields only 7 Nov 09:57; I assumed 6 decimals and 0.55% pool fee for earlier pool rows (the brief treats those as unavailable; the test period will have evidence).
- *Fees:* curve 1.25% and pool 0.55% per leg are the brief's approximate figures; if the creator fee is absent the results improve by ~0.6% per round trip — not enough to change any sign.
- *Pool price convention:* on pool rows `price_sol` is ~10% above the reserve ratio; I value both legs on reserves, so returns are internally consistent, but if the evaluator values on a different convention the migration rule's small numbers could move by a few points either way.
- *Multiple comparisons:* ~366 variants looked at; the one "positive in both halves" cell is a one-hold-time spike driven by 18 slow migrations.
- *Execution:* 1,000 ms / 700 ms landing and no impact on later prices are assumptions; live slippage on fast-moving pools would be worse.

## 5. If no rule is supported — what data would settle it

1. **Trade histories for every retained launch, not only entered ones** (the tracker already keeps them for ~125 min; export the full retained set for 2–3 days). That removes the selection problem that makes every development result conditional on an earlier book's bar.
2. **Pool histories with evidence fields for all graduations for 24 h**, from 7 Nov 09:47 onward — a clean test of the migration idea on the whole population (≈ 600 graduations/day in the census).
3. **A measured hit rate of creator/funder wallets on earlier launches** as a feature observable at trace time (not from the tape), and name/ticker copy counts, both joined to the trade-level outcome under this replay.
4. A few real 0.02 SOL fills per day to calibrate landing delay and slippage against the model.

## 6. Reproduction

`reports/blind/fable_7nov/`: `load.py` (read the six trade parts), `engine.py` (replay + features), `grid.py` (feature/outcome grid at ages 30–300 s), `validate.py` (engine vs bot positions), plus the ad-hoc analysis snippets as `analysis_notes.md`. Run with `python3 -I` from a clean directory on the `entry-package-7nov` branch.
