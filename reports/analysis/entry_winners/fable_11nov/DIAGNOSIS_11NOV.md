# Early-winners project — full diagnosis for outside review (11 Nov 2026)

Written for a reviewer (Gemini / Codex) who has not seen the work. Everything below is paper trading on Pump.fun launches; no live money. UK time = UTC. The $100K/K-book project is a separate project and is not covered here.

## 1. What we are trying to do
Buy new Pump.fun coins in their first minutes and catch the ones that run (2×, 5×, 10×), while avoiding the ones that get rugged. Stake 0.2 SOL per coin. The owner accepts risk: he wants a probability game that pays, not a safe one.

## 2. Data we have (all read-only exports from our own tracker)
- Every launch the tracker retains (≥ 15 SOL gross buys in the first minute, or a tier-1 bundle): ~18,000 per day, with price/market-cap checkpoints at 15, 30, 60, 90, 120, 300, 900, 1800, 3600, 7200 s.
- A 60-second metrics snapshot for every coin the launcher looked at (10,032 coins on 10 Nov; 8,478 never bought): net SOL, buys, buyers, sells, big buys, market cap, holders, top-1/5/10 %, dev buy/sell, bundle, farm-wallet %, funder details.
- Full trade-by-trade history (9.3 M trades) for 2,127 coins that at least one paper book bought, launches 6 Nov 07:40 → 8 Nov 15:00.
- 19,419 simulated positions across 26 paper books (6–10 Nov), each with chain-read reserves at the check, at the fill and at the exit, trail/time-stop outcomes, and a 0.02 SOL independent position.

## 3. What has been tested and what came out

### 3.1 The books (entry at 60 / 90 / 120 s after launch with a "net buying" bar, trail exits)
All 26 negative over the week. Typical: −16% to −22% per coin at 0.2 SOL. The best family (E90C: 90-s entry with a stricter bar) cuts the loss to about −10% but is still negative and level with the 60-s book over the last 48 h. P&L differences between books are explained by which coins happened to migrate to the pool during the hold (hindsight), not by the entry rule.

### 3.2 A "winner profile" at 60 seconds
Owner's method: take every coin that reached 2×, find features present in ≥ 60–70% of them, test those in the losers. Result: no feature or combination lifts the 2× rate by more than 1.3× (e.g. from 17% to 22%), and every such group keeps the same rug rate. The 60-s snapshot does not separate runners from rugs.

### 3.3 Rugs
Rugs (peak < 1.2×, loss ≥ 60%) ARE predictable from the 60-s snapshot: holders/buyers ≥ 0.87, sell share ≤ 0.5, exited ≤ 22, fresh-wallet funder, dev buy 0–1 SOL, bundle unsold. Logistic model AUC 0.79 on held-out data. But the same profile also describes the winners: using it as a filter turns −22% into −16/−18% and throws away about a third of the runners. It is a risk reducer, not an edge.

### 3.4 Exits
34 exit policies replayed on identical entries (trail 15–50%, take-profits, time stops 30 s to 2 h, halves): none profitable. Shortest holds lose least (30-s hold ≈ −5%); losses grow with hold time. Being above 1.3× at +60 s predicts giveback, not continuation (that group averaged 1.61× at +60 s and 1.27× at exit).

### 3.5 Where the money is lost (mechanism, from chain reads)
The large losses are not slow declines. They are single-block withdrawals: one to three wallets sell 30–60 SOL into the pool in one second. In 18 of 19 severe pool losses we examined, the trailing stop triggered and the sale landed 15–94% below the trigger value 0.7 s later. A trail, any trail, cannot sell before a one-block dump. The loss is decided at entry by who holds the supply — and holder concentration at entry is the one thing we do NOT record for most coins.

### 3.6 Base rates (coins tracked the full 2 h, 10 Nov)
| group | n | reach 2× | 3× | 5× | 10× |
|---|---|---|---|---|---|
| coins the books bought (≥ 15 SOL net at 60 s) | 414 | 17% | 10% | 4% | 1.2% |
| sub-15-SOL coins with repeat small buys (a lead we were given) | 588 | 6% | 3% | 2% | 0.7% |
| everything else watched | 1,277 | 2% | 1% | 0.3% | 0.1% |

Break-even for "hold for the target, eat the loss on the rest" (losers cost 50–70%): 2× needs 35–43% hits (we have 17%); 5× needs 12–15% (we have 4%); 10× needs 5–7% (we have 1.2%). Every target is short by 2–4×.

### 3.7 NEW — buying on the run (trade-level simulation, 2,127 coins, 6–8 Nov)
The owner's idea: don't buy at 60 s, buy when the coin is already running. Simulated on the trade path: buy lands on the first trade ≥ 1 s after the trigger (+1.5% cost), sell lands on the first trade ≥ 1 s after the signal (−1.5%), 2-h horizon. 30% trail from the running high.

| entry trigger | n | median entry time | severe loss (≤ −40%) | reach 5× from entry | mean return, winners capped at 5× | total SOL @0.2 | …without the top 5 coins |
|---|---|---|---|---|---|---|---|
| at 60 s (what the books do) | 1,319 | 60 s | **28%** | 9% | −5.3% | +8.2 | −13.7 |
| price burst +50% in 30 s with ≥ 15 buys | 666 | 78 s | 14% | 10% | +0.7% | +6.1 | — |
| price ≥ 2× its 60-s price (within 15 min) | 343 | 195 s | 15% | 12% | +5.5% | +11.8 | −0.1 |
| price ≥ 3× its 60-s price | 166 | 352 s | **9%** | 13% | +7.4% | +6.7 | −1.1 |
| price ≥ 5× its 60-s price | 59 | 525 s | **5%** | 10% | +13.9% | +3.4 | −0.8 |
| first trade in the pool after graduation, TP 1.5× / stop −50% | 388 | 5 s after migration | 32% | 12% | +11.6% | +9.0 | — |

Reading it honestly:
- Buying later, on a confirmed run, cuts the rug rate from 28% to 5–9%, because the instant rugs have already happened. That part is structural and is the first thing in this project that is not clearly negative.
- The average goes from about −5% to about break-even / slightly positive. **The whole profit is five coins** (10–50× runners) in 2.5 days; take them out and every trigger is flat to slightly negative. This is a lottery at roughly a fair price, not a strategy with an edge yet.
- This simulation is optimistic against our launcher's own measurements: the same 60-s entry shows −5% here versus −16% in the launcher (no price impact modelled, sells land on the next printed trade). Expect the run entries to be a few points worse in practice.
- Survivorship: the 2,127 coins are those that passed a book's 60-s bar. Runs among coins that never passed any bar are not in this test.
- The "first pool trade" entry looks good on take-profit 1.5× (66% wins) but 32% severe losses with a trail; its upside is the post-graduation pop, which is partly unbuyable (the first pool trade is often the pop itself).

## 4. Our current reading
1. Nothing tested so far is profitable after costs. Two independent reviewers (Codex, and this analysis) agree.
2. The 60-second snapshot cannot tell a runner from a rug. Waiting for the run (price 3–5× its 60-s level) removes most rugs at the cost of entering higher; it brings the expectation to about zero, with the profit concentrated in a few 10×+ coins.
3. The missing pre-buy information is holder concentration (who can drain the pool). We do not record it for most coins.
4. Losses cannot be fixed by exits; the single-block dump defeats any trail.

## 5. Questions for the reviewer
1. Is there an entry signal we have not tested that distinguishes the 10×+ coins (we have 5 per 2.5 days among 2,127) from the coins that run to 3× and die? We have the full trade path for all of them.
2. Buy-on-the-run at 3× or 5×: is the break-even-with-lottery-tail result worth running as a paper book, and how would you size and exit it (30% trail vs. partial sells at 2×/5×)?
3. Should the run entry be conditioned on how the run happened (buyer count, buy sizes, time taken, pool vs curve, concentration)? Which of those would you test first with n ≈ 170?
4. Is there a way to estimate holder concentration from the trade stream alone (wallets that bought ≥ X% of supply and have not sold) that would have flagged the one-block dumps before entry?
5. Any strategy family we have not considered: copy-trading the wallets that bought the 10× coins early; buying only pool coins after a dump-and-recover; entering on social/name signals; cross-coin (same deployer/funder) history.

## 6. What we will NOT do without evidence
Change a live rule, deploy a new book, or claim an edge from a five-coin tail. Any new book is a paper book, reviewed at 100 coins / 7 days on after-cost SOL, severe-loss rate, runner capture and unresolved positions.

## Files (available on request)
Scripts 01–13 and outputs: positions.csv (19,419 rows), winner_profile_60s.xlsx, winners_rugs_out.txt, exit_grid_*.txt, momentum_entries.csv (3,000 simulated run entries with every exit policy), watch60_outcomes.csv (10,032 60-s snapshots with 2-h outcomes).
