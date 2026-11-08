# Round 2 — independent exploration on ALL coins (analyst: Claude "Fable"; Phase A report, 8 Nov 2026)

Written alone, before reading any other analyst's Round 2 work. Round 1 (MIG300) is frozen and not reopened here.
Data: branch `entry-all-20261107t2210` @ e678331 (SHA256SUMS verified), 62,789 launches, 4,913 with trades, 8,037,251 rows (1,568,880 exact duplicates removed by full fingerprint). Code: `reports/blind/fable_r2/`. My engine was checked against the frozen evaluator (eval-1.1) on the same data: identical N, scored, unknown, mean, win rate on both halves (§5).

## 0. Bottom line

**No rule is supported.** Across 3,693 retained launches, every decision time from the retention trade to 5 minutes after creation, and every exit I tried, the after-cost return is negative or indistinguishable from zero in at least one half of the data. The whole-universe data removes Round 1's selection problem and the conclusion is the same, now with 3× the launches.

Three findings that matter more than any candidate:

1. **Regime, not rule.** Returns are not stationary even inside 36 hours. 7 Nov 09:00–18:00 UTC was a good stretch: strong-inflow entries made +4% to +38% per 3-h bucket; the same triggers lost money in every other 3-h bucket of the window. A rule tuned on 7 Nov afternoon will look brilliant on 7 Nov afternoon.
2. **The only non-negative place is the first second after retention.** Buying 1.0 s after the trade that tips the 15 SOL gross and selling within 15–30 s is about −2% unconditionally and about +1% to +4% for first-time creators; the same entry 5 s later is negative everywhere. Whatever edge exists is a latency race, and it depends on the 1.0 s landing assumption being real.
3. **An evaluator/data artefact that will produce fake jackpots in the test.** "Instant graduation" launches (a dev buy of ~85 SOL completes the curve at creation; 111 of 3,693 retained launches, 3%) have mis-decoded pool reserves (price ×1000 vs the curve ceiling). eval-1.1 buys them on the completed curve (impossible in reality) and sells on the bad pool state: one such coin, `5kdsd8zW37T2rK47gULpPLLCY181iKCuT8wZrChhpump`, scores **+178× (≈ +36 SOL on a 0.2 stake)** and single-handedly turns the H2 unconditional result from −3.4% to +6.7%. Any rule that enters at retention without excluding these will be "supported" by artefact. Details in §6.

**Best candidate (reported for completeness, not supported):** FTC-R0 — enter at the receipt of the retention trade when the creator has no earlier launch in the census; sell at +20% or at 30 s. 0.2 SOL: +0.8% (H1) / +3.8% (H2) per entry, win 52% / 55%, bootstrap 5th percentile −2.7% / −2.1%; 0.02 SOL: −5.0% / −1.8%. ~1,540 entries a day, peak 8 concurrent (≈1.6 SOL tied up). Not scorable by eval-1.1 as it stands (no creator field in `view`). Full numbers in §4.

---

## 1. Data, universe, split, method

- **Universe (= evaluator's N):** launches created 6 Nov 07:40 → 7 Nov 20:00 UTC, retained (cumulative gross curve buys ≥ 15 SOL, or bundle tier-1 at the first trade), not inside a tracker outage over [created, created+2 h]: **3,693** (≈2,460/day). None lack `recv_ms`. 827 are tier-1. 516 completed the curve; 303 have pool rows, 203 with evidence fields (pool capture of every launch only from 7 Nov 09:47, evidence only from 09:57).
- **Capture is uneven in time.** Retained launches per 4 h: 301, 608, 458, **55** (6 Nov 20:00–24:00, during the outages/deploys), 499, 351, 295, 448, 658. The 6 Nov evening is under-sampled by roughly 10×; nothing can be said about it.
- **Split:** by median creation time, **H1 = created before 7 Nov 03:22 UTC (1,847), H2 = after (1,846)**. Everything below is reported for both.
- **Engine** (`engine_r2.py`): mirrors eval-1.1 — decisions see trades with `recv_ms ≤ t` in receipt order; fill on the chain state (event order) as of t+1.0 s; exit signals evaluated on x = (sell value − 0.0015)/stake after each received trade; sell on the state as of trigger+0.7 s; horizon ≤ 2 h; curve 125 bps per leg with buy net = stake/(1+f); pool 30 bps; 0.0015 SOL fixed; state validity (positive reserves, curve price ≤ 1.1× ceiling, pool evidence wSOL/6/9), feed gaps and outages → unknown; curve states within retention+125 min; pool windows as the evaluator. Time exits are implemented as the horizon (sale exactly at t+hold), as the evaluator would score a `horizon_s` rule.
- **Engine check against the frozen evaluator** (rule "enter at retention, horizon 30 s", all coins, both sizes): see §5 — identical to 4 decimals.
- **Instant-graduation launches** (first-trade gross ≥ 80 SOL or market cap at retention ≥ 380 SOL): excluded from every table after §2's first row, for the reason in §6.

## 2. Everything tried (counts)

| Stage | What | Cells |
|---|---|---|
| A | Fixed decision times — retention + {0, 5, 10, 20, 30, 60} s and creation + {30, 60, 90, 120, 180, 300} s — × 15 exits (trails 15/20/30/40 %; TP 1.3×+20 %, 1.5×+30 %, 2×+40 %; time exits 15, 30, 60, 120, 300, 600 s, 2 h; 50 % stop + 40 % trail) | 180 |
| B | Feature quartiles at the retention entry: 18 features (time to retention, buyers, buys, same-slot bundle SOL/count, dev buy, top-1 buyer SOL and share, market cap, sells, sell ratio, 10-s momentum, drawdown, max buy, holders still holding, sold-out wallets, sellers, receipt lag) × 3 exits × 2 halves | 108 |
| C | Event-triggered entries (first received trade meeting a condition, within 600 s of creation): big buy ≥2 / ≥3 SOL at a new high; new high after 30 s; absorbed ≥1 SOL sell (price back within 2 % inside 20 s); ≥20 buyers with ≥10 in the last 30 s; ≥15 buyers within 20 s of creation; net ≥ 25; net ≥ 40; gross ≥ 30 with sells ≤ 10 %; dip to ≤ 65 % of high with a ≥ 0.5 SOL re-buy — × 7 exits | 70 |
| D | Census features knowable at t: creator's earlier launches in the window (0 / 1–2 / 3+), earlier launches with the same ticker (0 / 1–2 / 3+), creator had an earlier graduation (flagged: graduation time unknown, so possibly look-ahead), bundle tier — × 3 exits; creator history on the net ≥ 25 trigger | 33 |
| E | Candidate refinement: retention + {0, 5} s × 8 exits × 2 sizes, first-time creators only | 32 |
| F | Time-of-day / regime tables (3-h and 6-h buckets) for 5 rule cells; census graduation rate per bucket | 6 |
| | **Total cells looked at** | **≈ 429** (18 features, 15 exits, 12 decision times, 10 event conditions, ~25 thresholds) |

### 2a. Stage A — unconditional, whole universe, mean after-cost return per scored entry (0.2 SOL; win rate after the slash)

| decision | n | tr20 | tr30 | tp1.3/tr20 | tp1.5/tr30 | hold 15 s | hold 30 s | hold 60 s | hold 120 s | hold 300 s | 2 h |
|---|---|---|---|---|---|---|---|---|---|---|---|
| retention +0 s (no instant-grad.) H1 | 1795 | −0.058/0.34 | −0.125/0.25 | −0.007/0.42 | −0.025/0.36 | −0.022/0.41 | −0.027/0.39 | −0.072/0.35 | −0.134/0.26 | −0.233/0.16 | −0.296/0.12 |
| retention +0 s (no instant-grad.) H2 | 1787 | −0.051/0.29 | −0.108/0.23 | **+0.017**/0.40 | −0.021/0.34 | −0.018/0.37 | −0.031/0.39 | −0.083/0.35 | −0.139/0.27 | −0.208/0.21 | −0.140/0.11 |
| retention +5 s | 3693 | −0.078/0.29 | −0.141/0.21 | +0.014/0.38 | −0.030/0.31 | −0.009/0.37 | −0.015/0.36 | −0.053/0.32 | −0.112/0.26 | −0.182/0.18 | −0.244/0.12 |
| retention +10 s | 3693 | −0.096/0.27 | −0.150/0.21 | −0.055/0.35 | −0.084/0.30 | −0.042/0.34 | −0.062/0.34 | −0.106/0.31 | −0.160/0.25 | −0.228/0.18 | −0.277/0.11 |
| retention +30 s | 3693 | −0.129/0.23 | −0.179/0.18 | −0.095/0.30 | −0.125/0.26 | −0.077/0.24 | −0.092/0.28 | −0.111/0.27 | −0.164/0.22 | −0.218/0.16 | −0.235/0.10 |
| retention +60 s | 3693 | −0.153/0.20 | −0.191/0.17 | −0.116/0.26 | −0.145/0.23 | −0.082/0.20 | −0.078/0.22 | −0.094/0.21 | −0.141/0.19 | −0.185/0.15 | −0.178/0.10 |
| creation +60 s | 3193 | −0.131/0.21 | −0.168/0.17 | −0.097/0.28 | −0.131/0.24 | −0.065/0.21 | −0.083/0.24 | −0.106/0.23 | −0.139/0.21 | −0.186/0.16 | −0.165/0.10 |
| creation +120 s | 3533 | −0.145/0.18 | −0.175/0.15 | −0.115/0.24 | −0.130/0.21 | −0.075/0.13 | −0.086/0.16 | −0.100/0.17 | −0.131/0.16 | −0.163/0.13 | −0.164/0.09 |
| creation +300 s | 3691 | −0.111/0.14 | −0.115/0.13 | −0.092/0.19 | −0.082/0.18 | −0.092/0.06 | −0.096/0.08 | −0.102/0.09 | −0.106/0.10 | −0.116/0.09 | −0.152/0.06 |

Unknown share rises with decision age (9 % at retention, 35 % at creation+60 s, 65 % at +300 s) because the launch has died and the last valid state is outside a capture window, or the state is invalid (curve-ceiling decode errors). Trails 15 % and 40 %, 2×/40 %, 600 s and the 50 % stop are all between these columns; none is positive at any decision time. The 2-h column at retention+0 includes a +9.8 mean before the instant-graduation exclusion — see §6.

**Reading:** the cost of a round trip at the 15-SOL point is about 4 % (2 × 1.25 % fees, 0.75 % fixed, ~0.6 % impact each way on ~30–45 SOL of virtual reserves) and the 15–30 s drift after retention is about +2 %, so short holds net −2 %. Everything later than 5 s is worse. Trails lose more than time exits at every horizon: the paths are spiky and a trail sells the dip.

### 2b. Stage B — what features do at the retention entry (both halves)

No feature has the same sign and size across halves. Examples (hold 30 s, quartile means H1 → H2): time-to-retention q1 −1.7 % / +8.8 %, q4 −9.6 % / −14.2 %; sells q1 −3.7 % / +11.5 %; same-slot bundle q1 −10.0 % / −11.6 %, q4 +5.8 % / +3.4 % (the one direction that repeats: **unbundled launches do worse at the retention instant**, the opposite of Round 1's 60-s finding — at the instant of retention a bundle means the price has not yet been dumped). Top-1 buyer share q4 −13 % / −8 %. Nothing reaches +5 % in both halves.

### 2c. Stage C — event-triggered entries (mean per scored entry, 0.2 SOL, H1 → H2; n in brackets)

| trigger | tp1.3/tr20 | hold 30 s | hold 60 s | hold 300 s |
|---|---|---|---|---|
| big buy ≥2 SOL at new high | −0.069 → +0.012 (913/783) | −0.098 → −0.052 | −0.133 → −0.063 | −0.260 → −0.174 |
| big buy ≥3 SOL at new high | −0.059 → +0.044 (571/552) | −0.078 → −0.009 | −0.119 → −0.028 | −0.252 → −0.141 |
| new high after 30 s | −0.084 → −0.064 | −0.086 → −0.098 | −0.142 → −0.149 | −0.269 → −0.244 |
| absorbed ≥1 SOL sell | −0.031 → −0.065 | −0.046 → −0.088 | −0.107 → −0.114 | −0.248 → −0.249 |
| ≥20 buyers, ≥10 in last 30 s | −0.034 → −0.023 | −0.034 → −0.072 | −0.068 → −0.102 | −0.242 → −0.241 |
| ≥15 buyers within 20 s | −0.014 → +0.001 | −0.016 → −0.012 | −0.046 → −0.040 | −0.234 → −0.184 |
| net ≥ 25 SOL | −0.073 → +0.028 | −0.074 → −0.000 | −0.129 → −0.030 | −0.285 → −0.135 |
| net ≥ 40 SOL | −0.077 → **+0.079** (351/365) | −0.071 → **+0.071** | −0.115 → +0.010 | −0.204 → −0.078 |
| gross ≥ 30, sells ≤ 10 % | −0.075 → **+0.140** (192/267) | −0.079 → **+0.111** | −0.109 → **+0.099** | −0.207 → −0.042 |
| dip ≤ 65 % of high + re-buy | −0.072 → −0.072 | −0.091 → −0.092 | −0.103 → −0.082 | −0.224 → −0.200 |

The strong-inflow triggers flip sign between halves. By 3-h bucket (net ≥ 40, tp1.3/tr20): 6 Nov 06–09 +3 %, 09–12 +4 %, 12–15 −12 %, 15–18 −7 %, 18–21 −12 %, 21–24 −21 %, 7 Nov 00–03 −11 %, 03–06 −6 %, 06–09 −7 %, **09–12 +38 %, 12–15 +15 %, 15–18 +4 %**, 18–20 +3 %. Same shape for gross ≥ 30/sells ≤ 10 % (hold 60 s: 12–15 +32 % with 68 % wins, then +6 %, +3 %) and for the big-buy triggers. The census shows nothing special about that stretch (graduation rate 1.7–2.0 % vs 1.2–1.8 % elsewhere; launches per 3 h normal). **One good nine-hour stretch out of thirty-six.**

### 2d. Stage D — census features (retention entry, hold 30 s, H1 → H2)

| | n H1/H2 | mean | win |
|---|---|---|---|
| creator's earlier launches in window = 0 | 1211/1053 | **+0.010 → +0.041** | 0.42 → 0.45 |
| 1–2 | 122/103 | −0.014 → −0.127 | 0.42 → 0.30 |
| 3+ | 433/584 | **−0.132 → −0.145** | 0.29 → 0.29 |
| same ticker launched before: 0 / 1–2 / 3+ | | −0.022→−0.042 / +0.020→−0.031 / −0.048→−0.028 | no pattern |
| creator had an earlier graduation (possible look-ahead) | 157/274 | −0.108 → −0.177 | 0.27 → 0.28 |
| bundle tier-1 | 407/286 | −0.067 → +0.093 | flips |

The creator-history split is the only one that repeats in both halves with a sensible mechanism (serial launchers rug; the window only sees 36 h of history, so "0 earlier launches" is noisy early in the window). It separates a −13 % group from a +1 %/+4 % group — i.e. it mostly removes losers; the remainder is still only marginally positive.

## 3. Regime: the finding that matters

The same rule cells, by 6-h bucket of entry time (first-time creators, retention entry, hold 30 s): +4.4 % (6 Nov 06–12, n=219), −1.1 % (12–18, 697), +4.0 % (18–24, 107, under-captured), +0.8 % (7 Nov 00–06, 299), +2.3 % (06–12, 205), **+9.5 % (12–18, 519)**, −3.8 % (18–20, 218). Five of seven buckets positive, the two negative ones include the largest. With this much bucket-to-bucket variation, two days of test data cannot distinguish a +2 % rule from a −2 % one at the 0.2 SOL level, and the result will be decided by which regime 10–12 Nov happens to be in. That is the honest reason I do not expect any Round 2 rule — mine or anyone's — to clear the lower-bound test.

## 4. Best candidate: FTC-R0 (not supported)

**Rule.** Universe: retained launches. Condition (knowable at t): the creator wallet of the launch has **no earlier launch** in the census at time t (census create_ts < t). Entry decision t = receipt time of the retention trade itself (the trade whose cumulative gross curve buys reach 15 SOL; tier-1: the first trade). Exclude instant graduations (gross ≥ 80 SOL at retention or market cap ≥ 380 SOL at retention). Fill 1.0 s later on the curve. Exit: sell when x ≥ 1.20 (first received trade with the position worth ≥ +20 % after fees), else at t+30 s on the state as of t+30 s. One entry per mint. 0.2 SOL; 0.02 SOL independently.

| | H1 (created < 7 Nov 03:22) | H2 |
|---|---|---|
| attempts (first-time creators, not instant) | 1,234 | 1,092 |
| unknown | 2 % | 4 % |
| **0.2 SOL** mean / median per scored entry | **+0.008 / +0.019** | **+0.038 / +0.023** |
| win rate | 0.52 | 0.55 |
| without the best coin | +0.005 | +0.035 |
| share losing ≥ 50 % | 0.09 | 0.07 |
| worst five | −0.99, −0.98, −0.96, −0.95, −0.95 (hold-30 variant) | |
| best five (hold-30 variant) | +4.0, +3.5, +3.4, +3.3, +3.2 | |
| bootstrap 5th pct of the lower score (unknown = −100.75 %), 4,000 resamples, seed 20261108 | **−0.027** | **−0.021** |
| **0.02 SOL** mean | −0.050 | −0.018 |
| plain hold-30 variant, 0.2 SOL: mean / win / LB5 | +0.010 / 0.42 / −0.034 | +0.041 / 0.45 / −0.024 |
| total net SOL (hold-30, 0.2) | +2.30 | +8.65 |
| entries per day | ≈ 1,540 | |
| peak concurrent positions / capital tied up | 8 / ≈ 1.6 SOL | |
| same rule 5 s after retention (hold 30) | −0.023 | −0.013 |

Sensitivities: 15/20/45/60-s holds are within ±2 pts of the 30-s hold in each half (20 s: +1.8 %/+3.2 %; 60 s: −1.7 %/+3.2 %). The 0.02 SOL version is negative in both halves because the 0.0015 SOL fixed fee is 7.5 % of the stake. Pool fee sensitivity: irrelevant (entries and exits are on the curve).

Why I do not believe it: (i) lower bound negative in both halves; (ii) the edge vanishes 5 s after retention, so it is a race against the other bots that buy on the 15-SOL signal, and the 1.0 s landing is an assumption I cannot test from this data; (iii) ~1,500 trades a day at a few percent each is a fee-and-latency business, not a rule about coins; (iv) the creator-history feature is truncated to 36 h and is not exposed by eval-1.1, so the rule cannot be scored without an evaluator change (see data request 1).

What I would freeze if forced to freeze something that eval-1.1 can score: nothing — "retention entry, hold 30 s, all coins excluding instant graduations" is −2.7 % / −3.1 %.

## 5. Evaluator cross-check

eval-1.1 run on this export (tokens.csv, feed_gaps.csv and outages.txt derived from the package; rule `decide → True`, `horizon_s = 30`, all launches):

| | H1 eval / mine | H2 eval / mine |
|---|---|---|
| N | 1,847 / 1,847 | 1,846 / 1,846 |
| scored / unknown | 1,791 / 56 — same | 1,764 / 82 — same |
| mean ret 0.2 | −0.0285 / −0.0285 | +0.0673 / +0.0673 |
| win rate | 0.384 / 0.384 | 0.388 / 0.388 |
| point SOL per launch | −0.00552 / −0.00552 | +0.01287 / +0.01287 |
| mean without best | −0.0335 | **−0.034** (best coin = the §6 artefact, ≈ +36 SOL) |
| 0.02 mean | −0.085 | +0.018 |
| supported | no | no |

The numbers agree to the last printed digit, so every table in this report is what eval-1.1 would produce for the same rule, with one deliberate difference: I exclude instant graduations.

## 6. Evaluator/data artefact (needs attention before the test is scored)

Mint `5kdsd8zW37T2rK47gULpPLLCY181iKCuT8wZrChhpump` (USOE, tier-1, dev buy 85.005 SOL, census peak cap $36.7K): its first trade completes the curve (vTok at the 279.9e12 floor, price = ceiling). Later pool rows carry evidence fields and reserves of **1,160 SOL quote / 14.96M base tokens** — an implied cap ≈ 77,000 SOL (~$12M), 300× the census peak. eval-1.1 (a) accepts the completed-curve state as a valid buy (price ≤ 1.1× ceiling passes; in reality the curve has no tokens left to sell), and (b) accepts the pool state because quote_mint/decimals are present. Result: +178× at 30 s, +3,494× at 2 h. Three similar mints (`LLzYn4…`, `fBidsB…`, `dEJEFG…`) score +3,000× at the 2-h horizon in my engine under the same checks. 111 retained launches in 36 h are instant graduations (3 %), so the test window will contain ~150 of them.

Consequences: any rule whose first decision can fall on an instant-graduation launch gets lottery tickets paid in bad data. Suggested handling (not an evaluator change, since 1.1 is frozen; a rule-side exclusion plus a flagged re-score): treat a curve state with vTok ≤ 279.9e12 as unavailable for buying; treat a pool state whose implied price is > 3× the curve ceiling within 2 h of a curve completion as invalid; and re-check the pool decoder's base-decimals assumption for these pools. I will raise it in the critique phase.

## 7. Data requests

1. **Creator history (and expose it to rules).** Question: does "first launch by this creator" vs "3+ earlier launches" separate −13 % from +1–4 % at the retention entry when the history is 7+ days rather than 36 h, and does the first-time group become positive with a tighter definition (no earlier launch in 7 days, creator wallet funded > 24 h ago)? Needed: the census `creator` column and `create_ts` for all launches over ≥ 7 days before each test day (already in the tracker DB), exposed in the evaluator's `view.meta` as `creator_prior_launches` computed from launches with create_ts < t. Why existing data cannot: the export's census starts at the window start, so early-window counts are truncated, and eval-1.1's `view` has no creator field, so the rule cannot be scored.
2. **Landing-latency measurement.** Question: is the 1.0 s decision-to-fill assumption realistic for a buy sent at receipt of the retention trade — the only place where returns are non-negative — and what does the fill look like at 1.5 s and 2.0 s? Needed: ~50 real 0.02 SOL buys sent at receipt of the 15-SOL trade, with send time, landed slot/time and fill price; or at minimum the launcher's measured decision→landed distribution. Why existing data cannot: the package has receipt times but no sent-order outcomes; §2a shows the result flips from ≈0 to −5 % between +0 s and +5 s, so the answer is the whole question.
3. **More days of all-coins trades for the regime question.** Question: does the positive stretch (7 Nov 09:00–18:00) recur daily/at a time of day, or is it random; can a regime filter knowable at t (e.g. realised return of the strategy over the previous 3 h, or SOL price trend) select it? Needed: the same all-coins export for ≥ 7 consecutive days, plus an evaluator option to process launches in time order with a small cross-launch state (or a per-hour market-feature file). Why existing data cannot: 36 h contains one such stretch; eval-1.1 streams one mint at a time in export order, so no rule can see the market's recent performance.
4. **Re-export or exclude 6 Nov 18:00–24:00.** Question: were the 55 retained launches captured in that period representative? Needed: the tracker's own count of retained launches it did not record (from pm2/deploy logs) or a re-export if the rows exist. Why: 16,000 launches were created and only 55 retained ones were captured; outage marking covers 13 minutes of it.
5. **Pool decoder check for instant graduations** (§6). Question: are the 1,160-SOL / 15M-token pool states real pools of these mints? Needed: for the 4 mints named, the pool account, base mint decimals read from the mint, and one on-chain reserve read; and whether 0.19.9 reads base_dec from the mint or assumes 6. Why: the exported evidence says base_dec 6 by assumption (MANIFEST), and the states are 300× the census peak cap.
6. **Sniper/bundle wallet groups at receipt time** (not pursued here for lack of time, kept as a request). Question: at the retention trade, does the share of the 15 SOL coming from wallets flagged as snipers/farm wallets on earlier launches (Round 1 files) predict the 30-s outcome? Needed: the Round 1 sniper/farm wallet lists with the time each wallet was first flagged, so the feature is knowable at t.

## 8. Reproduction

`reports/blind/fable_r2/`: `load_r2.py` (dedup + per-mint arrays), `engine_r2.py` (evaluator-faithful replay and features), `grid_r2.py` (stage A/B), `events_r2.py` (stage C), `cand_r2.py` (stage E), `evalcheck/` (rule module, data-dir preparation, eval-1.1 results JSON for both halves), `analysis_notes.md` (the stage B/D/F snippets). Run with `python3 -I`. Round 1 code remains in `reports/blind/fable_7nov/`.
