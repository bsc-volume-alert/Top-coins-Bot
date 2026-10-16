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
