# Analysis pipeline (run on each /csv export)

```
unzip tracker_export_<date>.zip -d analysis/data && cd analysis && for f in [0-9]*.py; do python3 -I $f; done
```
(rename the dated files to `paper_trades.csv`, `token_life.csv`, `wallet_buys.csv`, `big_buys.csv`, `tokens.csv` first — `30_` writes `data/wide.pkl` used by `31_` and `32_`.)

## Rules every analysis must follow (learned the hard way on day one)
1. **Exclude `invalid=1` rows** (decode artefacts) before any aggregate.
2. **Never use closed-only subsets for exit statistics.** Open trades past their hold limit are dead tokens and restart orphans; the sweeper (v0.15.3) closes them at the real price. Until an export has `exit_reason='sweep'` rows for the period, treat exit averages as optimistic.
3. **Entry-time features only.** `buys`, `sells`, `mc_5m`, `mc_15m`, `buyers_5m`, `after_peak_*`, `graduated` are recorded AFTER entry — using them to "predict" is leakage. Entry-time columns: `entry_*`, `inflow_*`, `bundle_*`, `handoffs`, `tier`, `factory`, `dev_buy_sol`, `snipers`, `creator_*`, `hour_utc`, `bs_ratio_entry`, `buyers_entry`, `buys_entry`, `sells_entry`, `proven_entry`, `cluster_held_pct`, `vol5m_usd`/`vol1m_usd` (momentum).
4. **Honest replay beats paper exits for entry questions:** `token_life` checkpoints let you enter at +60s/+5m/+15m with only what was known then and measure forward peak / 1h / 2h value. Sparse checkpoints understate peaks, so forward "hit 2x" is a lower bound; forward 1h/2h value is exact.
5. **Costs:** assume 10% round trip on curve entries (1% fee each way + slippage + 1–2s latency on a moving curve), 5% on PumpSwap.
6. **Wallet "2x" is meaningless** (74% of early buys 2x from the floor price). Use 5x (base ≈25%) and 10x; exclude cluster wallets and 0-second buys.
7. **Creator "prior 2x" is meaningless** — use prior graduations.
8. **Any model: time-split (train early / test late), report AUC and the EV of the top decile on the test half only.** A within-sample rule that looks good is not a finding.
9. **Report sample sizes with every rate.** n<30 is an anecdote.

## v0.18 notes
- `paper_trades.venue` (pumpswap / raydium-cpmm / raydium-clmm / raydium-launchlab / meteora-dlmm / orca) says which feed produced the triggering swap. Momentum rows with a non-PumpSwap venue have wallet counts ≈ transaction counts (CPMM, LaunchLab and Orca events carry no wallet; placeholder `tx:<sig>`), so `q_wallets`, `q_per10k`, `buyers_entry` and `q_new_pct` are not comparable with PumpSwap rows — split by venue before comparing.

## Pre-registered hypotheses — Project 2, written 16 Oct 2026 09:30 UTC (v0.18.17)
Made on the 52 core momentum trades with both `x_t15s40` and `x_flow4` recorded (entries 15 Oct 10:49 → 16 Oct 06:04 UTC, scratchpad run13). **Test only on trades entered after the v0.18.17 deploy** (`core=1`, `entry_utc` > deploy time). Each line states the claim, the number it was made on, and what would confirm or kill it on ≥50 new trades. Project 2 = flow4: core entry, −40% hard stop before 1.5x, then hold while 5m vol ≥ $100K and buy$ ≥ sell$, voluntary sell at 4x, 50% trail backstop.

Baseline on the 52: win 48%, avg +19% (net +13% at 5% costs), 8 trades ≥2x, 3 at the 4x cap; drop the best trade and avg is +2%.

**Claimed to separate winners from losers (confirm if the gap holds in the same direction; kill if it closes or flips):**
1. **1m volume at entry ≥ $40K** (`vol1m_usd`): 19 trades, win 53%, avg +54%, 32% reached ≥2x — vs 33 trades below: win 45%, avg −1%, 6% ≥2x. Confirm: ≥+25pt gap in avg return on ≥15 trades each side. Kill: gap under 10pt or reversed.
2. **Age at entry < 10 min** (`age_s` < 600): 38 trades, win 53%, +33%, all 8 big wins — vs 14 older: win 36%, −17%, no big wins. Confirm: older group still produces ≤10% ≥2x and negative avg.
3. **Combination (tag `core_v40` = 1m vol ≥ $40K AND age < 10 min)**: 17 trades, win 59%, avg +69%, 35% ≥2x; the other 35 trades: −4%. This is the headline claim and the most likely to shrink — 6 big wins is the whole evidence. Confirm: core_v40 avg ≥ +30% and ≥ 2× the non-v40 avg on ≥20 tagged trades.
4. **Top-10 holder share < 30%** (`top10_entry`): 30 trades, win 53%, +31% — vs ≥30%: 22 trades, 41%, +3%. Missing on 12/52 (non-SOL pools, Raydium). Weaker claim.
5. **Fast-fail exit** (`x_flow4ff`: sell at the first tick ≥120 s after entry if price < 0.90× entry, else = flow4): on the 20 trades with path marks it triggered 6 times, all 6 were flow4 losers, avg +13% → +17%. Confirm: `x_flow4ff` avg ≥ `x_flow4` avg AND ≤1 in 5 of its triggers were flow4 winners. Kill: it fires on ≥30% of eventual winners.

**Claimed NOT to separate (confirm = still no gap; a gap appearing on new data is itself a finding to re-check):** entry MC (all ≈$55K), 5m volume at entry (all ≈$100K by construction), raw buy/sell $ ratio (`bs_ratio_entry`, pinned 1.00–1.14 — see below), buyers/wallets in 5m, bundle % at launch (and the 3 unbundled coins all lost), bundle still held at entry, largest holder %, creator fees accrued (≈1% of volume), dev fee claims before entry (7 trades only), dev buy SOL. Heavily bundled "factory" coins (bundle ≥60% and still held ≥60% at entry, 13 trades) performed like the rest (+22%) but hold both wipeouts (<0.3x) — downside shape, not a filter.

**Measurement notes that came out of this pass:**
- Raw buy/sell $ ratio and sell share sit at ~1:1 / 47–53% on every coin at every mark, including coins that 4x'd in 5 minutes. Decoder is right (buy/sell are separate on-chain events); the volume is dominated by paired bot trades (sandwich/arb). v0.18.17 records `bs_clean_entry` / `bot_share_entry` and `cs`/`bot`/`cv` in the path marks with wallets that buy and sell within 2 s removed. Until the clean figures are in, treat the buy≥sell half of the flow exit as noise. The flow rule itself is unchanged for now so the test set is comparable.
- `cluster_out_entry`/`churn_entry` were never filled on momentum rows (copy trades only). Filled from v0.18.17.
- Holders (`top10_entry` etc.) missing on non-SOL-quoted pools and Raydium; a GMGN fallback is planned.

**Added 16 Oct 11:30 UTC (v0.18.19), untested, no prior claim:** `dex_paid` / `dex_paid_lead_s`, `snipers_n` / `snipers_held_pct`, `fresh_share`, `proven_vol_share`. Treat the first read of each as exploratory; a split that appears on <30 trades is a hypothesis for the next day, not a result.

## Project 3 — pre-registered 16 Oct 2026 16:00 UTC (v0.18.22)
**Entry:** core trigger ($100K/5m, MC < $100K, first entry) + 1m volume ≥ $40K + age < 10 min (`core_v40`).
**Exit (`x_split`):** at +120 s: < 0.90× → sell; ≥ 1.20× → hold with 40% trail from peak, cap 4x; else half at 1.5x, rest on the same trail. −40% hard stop before +120 s.
Built on the 33 path-marked core trades of 15–16 Oct (trail approximated by `x_tsl40`): all 33 → +23% avg / 48% win (flow4 +5%, P1 +7%); with the entry filter, 13 trades → +48% / 54% win; the 20 dropped → +6%. Branches: fast-fail 9 trades −28%, runner-hold 13 trades +77% (69% win), middle 11 trades −1%. Thresholds 0.90 / 1.20 / 40% chosen on this data.
**Test only on trades entered after this deploy.** Confirm: `x_split` avg ≥ `x_flow4` avg + 10pt on ≥40 trades, runner-hold branch avg ≥ +30%, fast-fail branch still ≤ 1 winner in 5. Kill: `x_split` ≤ `x_flow4` on ≥40 trades, or runner-hold branch avg < +10%.
Record of today's correction: `HellCat`, `ALIENCY`, `bottle.capital` predate the flow rule and were sweeper-filled; excluded from all Project 2 figures from now on (P2 all-time on 62 proper trades: +12%, net +7%, 48% win).

## Project 3 — result on its test (16 Oct 20:07 UTC export)
19 trades after 16:00 UTC: win 21%, avg −20%, net −1.12 SOL at 0.25. Killed. Cause: the 40% trail gives back gains on coins that peak at 1.5–2.5x (MUSK Index, Glow, Farting Tesla Roadster, ref: P1 1.5x, P3 0.83–1.11x). Every trailing variant is negative on all 80 trades (−5% to −8%). Kept recorded for comparison only.

## Project 4 — pre-registered 16 Oct 2026 21:00 UTC (v0.18.32)
**Rule:** core trigger → wait 60 s → buy at the price then only if it is above the trigger price → sell at 1.5x, −40% stop (also scored: runner, split, dead-coin).
**Built on:** 80 core trades, 15–16 Oct. 28 entry-time factors tested with a both-halves rule (gap ≥12pt in the same direction in the first 40 and last 40 trades); only creator fees accrued at entry passed (above 9 SOL: 40% win vs 60%). Post-trigger path on the 52 trades with marks: above trigger at +60 s → 79% reached 1.5x before −40% (28 trades); below → 12% (24). Estimated P4 with a pessimistic score (anything not clearly reaching 1.5x from the later entry counted as −40%): 28 of 51 trades taken, 64% win, +18% avg, +0.84 SOL vs −0.46 for buying at the trigger; on the 29 test trades after 08:29 UTC: 18 taken, 61% win, +15%, +0.42 vs −0.32. Threshold-insensitive (1.00 / 1.05 / 1.10 give the same result).
**Caveat:** the same first-minute signal underlies the 2-minute fast-fail found on day one, so this is not wholly fresh evidence; the runner exit gets worse under a later entry (≈ +6%), so P4 is scored on P1's exit.
**Confirm** on ≥40 `momconf` trades: win ≥ 55% and avg ≥ +10% on `x_t15s40` after costs, and the skipped triggers' P1 average below 0. **Kill:** P4 avg ≤ the core trades' P1 avg over the same period, or win < 50%.
Also to test from this export onward (recorded, not gated): creator fees accrued ≥ 9 SOL at entry (worse); bundle still holding ≥ 70% at entry (deeper losses when it fails — 3 of the 5 trades that dumped through the stop).

## Project 1 filtered — pre-registered 16 Oct 2026 21:10 UTC (v0.18.33)
**Rule:** core trigger AND (stock-token-quoted PumpSwap pool OR entry MC < $47K) → sell at 1.5x, −40% stop.
**Built on** 80 core trades with 45 entry-time features, each tested at three cut-points for the same gap (≥15pt) in both halves. On SOL pools, entry MC < $47K: 72% reached 1.5x first (18 trades) vs 38% (45); stock-quoted pools: 67% (15) vs 48% on SOL pools. "Creator fees accrued" also passed but is mostly an artefact (fees only counted from first sight; stock pools convert differently) — not used. Filtered P1 on the 80: 35 trades, 66% win, +18% avg, +1.02 SOL at 0.25; on the 29 trades after 08:29: 13 trades, 69%, +22%, +0.51.
**Test:** the next 40 filtered trades (book starts at this deploy). **Confirm:** win ≥ 60% and net > 0 after 5% costs. **Kill:** win < 55% or net ≤ 0 — Project 1 is then removed.

## Project 2 filtered — pre-registered 16 Oct 2026 21:25 UTC (v0.18.34)
**Rule:** core trigger AND (≤ 600 distinct wallets in the 5-min trigger window OR stock-token-quoted pool OR entry MC < $47K) → runner exit unchanged (`x_flow4`: hold while 5m vol ≥ $100K and buys ≥ sells, cap 4x, −40% before 1.5x, 50% trail).
**Built on** the same 80 core trades. "Crowd size" (holders, wallets in 5m, buyers 30m before, launch buyers — ~0.9 correlated) was the robust P2 factor: ≤ 600 wallets +29% avg vs −1%, both halves. Launch outside SOL ≤ 165 also passed but is updated for 30 min after launch (72 of 80 entries were inside that window → look-ahead risk) and selected exactly the same trades once wallets and the P1 filter were in, so it is not used. Filtered P2 on the 80: 51 trades, 57% profitable, +27% avg, +2.66 SOL at 0.25 (h1 +36%, h2 +17%); P1's exit on the same 51: +1.07. On the 29 test trades after 08:29: 19 trades, +20%, +0.65 vs P1's exit +0.68 — no edge for the runner out of sample.
**Test:** the next 40 filtered trades (book starts at this deploy). **Confirm:** net > 0 after 5% costs AND P2 net ≥ P1's exit on the same trades. **Kill:** net ≤ 0, or P1's exit beats it on the same trades — Project 2 is then dropped and "small crowd" is offered to Project 1's filter as a fresh pre-registered test.

## Project 5 — fast trigger, pre-registered 16 Oct 2026 21:45 UTC (v0.18.35)
**Rule (the owner's idea):** buy the first time a coin trades ≥ $100K inside any 2-minute window, coin ≥ 60 s old, buy $ ≥ sell $ in that window, ≥ 5 wallets, no market-cap cap, one trade per coin (strategy `mom2m`). Main exit `x_h2t40`: −40% stop from entry until 2x; at 2x sell half; the other half on a 40% trailing stop, no cap. Also recorded: `x_t15s40` (1.5x / −40%). `x_h2t40` is also recorded on core trades for comparison.
**Prior evidence (against):** on 79 core 5-minute trades only 26 (33%) reached 2x before −40%; "half at 2x + 40% trail" estimated ≈ −0.20 SOL at 0.25 even with a generous trail fill; a plain 40% trail −2.55. The 2-minute trigger selects hotter coins earlier, which is the untested hope.
**Test:** first 40 `mom2m` trades. **Confirm:** `x_h2t40` net > 0 after 5% costs and ≥ 35% of trades reach 2x before the stop. **Kill:** net ≤ 0 or 2x rate < 30%. Market cap at entry recorded on every trade to check whether a cap would have helped (exploratory, not part of the test).
**Amended 16 Oct 21:50 UTC (v0.18.36, before any P5 result):** P5 entry capped at MC < $2M; all positions (every project) also exit when 5m volume < $25K. Pass/kill lines unchanged. Earlier pre-registrations are scored on trades from v0.18.36 with this exit included; the comparison books (P2 vs 1.5x) are both affected equally.

