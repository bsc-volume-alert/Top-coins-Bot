# bundler-tracker (branch: tracker)
Paper-trading tracker for pump.fun launches. Auto-deploys to the droplet via `deploy.sh` (pm2 `deployer` pulls this branch every 30s). Secrets live in `/root/tracker/.env` on the server only.

Pipeline: Helius WebSocket → decode pump.fun Create/Trade events → bundle stats at T+4s → cluster/hand-off/flow tracking → early-inflow paper entry → parallel paper exits → Telegram + SQLite.

- `src/launch-monitor.js` — firehose, bundle detection (create-slot buys), tiering, factory flag, graduation
- `src/signals.js` — cluster set, hand-off detection, cluster/outside SOL flows, paper entry/exit variants
- `src/rpc.js` — budgeted RPC, wallet age + funder lookup
- `src/report.js` — `node src/report.js`
All thresholds are env-overridable (see `src/config.js`).

## v0.15.0 — data-quality fixes + graduation strategy (14 Oct)
- PumpSwap feed drops swaps above `PS_MAX_SWAP_SOL` (1000) — instant-graduation curve buys decoded with bogus amounts and produced 200–5,000x "momentum" rows.
- Momentum trigger sanity: ≥`MOM_MIN_TRADES5` (10) swaps from ≥`MOM_MIN_WALLETS5` (5) wallets, token age ≥`MOM_MIN_AGE_S` (60s); hard gate buy$/sell$ ≥ `MOM_BS_MIN` (1.0).
- Momentum paper cap `MOM_PAPER_MC_CAP` ($200K): above it an ℹ️ info alert is sent but no paper position (0/24 hit 2x above $500K on day one).
- `paper_trades.invalid` column; the 18 bogus rows are flagged at startup and excluded from /report, /summary and the digest.
- New **grad** strategy: paper-enters every graduation of a token tracked since launch (≥5 buyers), recording +5m MC, +5m buyers, total buyers, max 1m burst as features; alerts 🎓 only when buyers ≥ `GRAD_ALERT_BUYERS` (250). Same 12 exits.
- Confirm and climber alerts only when buyers ≥ 250 (`CONF_ALERT_BUYERS`, `CLIMB_ALERT_BUYERS`); paper trades unchanged.
- `/csv` exports paper_trades, token_life (lifecycle funnel), wallet_buys, big_buys, tokens — as one `tracker_export_<date>.zip` since v0.15.2 (dependency-free writer in `src/zip.js`; large CSVs crashed Telegram preview on iPad).

## v0.15.1 — wallet/creator scoring from the first-night data (14 Oct)
- `/wallets` ranks by **5x and 10x hit rate** (base ≈25%), excludes cluster wallets and create-block (0s) buys — bundlers/snipers always "win" at the floor price and cannot be copied.
- `/creators` ranks by **graduations**; alerts show the creator's prior launches / graduations / $100K+ hits and a ⭐ proven flag at ≥`CREATOR_GRADS_FLAG` (2) prior graduations (the only creator history that lifted odds, ~4× base).
- Watch lists seeded from config (`WATCH_SEED_WALLETS`, `WATCH_SEED_CREATORS`): 3 copyable wallets and the 5-address 79%-bundle group whose launches graduate 30–100% of the time.

## v0.15.3 — position sweeper, leak-proof entry columns, proven-wallet signal (14 Oct)
- **Sweeper** (`src/sweeper.js`): every 5 min closes paper trades past their hold limit at the real current price (bonding-curve account read, or DexScreener for graduated tokens) — survives restarts, handles dead tokens, back-fills the ~1,500 orphaned day-one trades (`exit_reason='sweep'`).
- `buys_entry`, `sells_entry`, `proven_entry` recorded at entry (the old `buys`/`sells` are updated at scorecards/close and must not be used as predictors).
- **Proven wallets**: ≥4 resolved non-bundle early buys with ≥50% reaching 5x (`PROVEN_*`); 👛 alert when one buys within 60s of launch; count stored per early entry and shown on alerts. Day-one replay: 1 proven wallet in the first 60s → 20% forward 2x vs 1.9% baseline (n=49).
- `analysis/` holds the day-one scripts and the rules every future analysis must follow.

## v0.16.0 — volume quality: organic vs manufactured (14 Oct)
- `src/routes.js`: every trade is tagged with the program the user called (Jupiter / Raydium / OKX = retail routers; pump / PumpSwap direct; `other` = custom program) from the `invoke [1]` log lines — no extra RPC.
- `src/quality.js`: at each momentum trigger the 5-minute window is scored — distinct wallets and wallets per $10K, top-3 wallet share, round-trippers (bought and sold inside the window), router vs custom share, trade-size dispersion, new-buyer share, price move per $10K, buy$/sell$ — stored as `q_*` columns and summarised as a 0–100 organic score (🟢 ≥65 · 🟡 40–64 · 🔴 <40) on VOLUME/BURST alerts. Recorded, not gated: the analysis decides the thresholds.

## v0.17.0 — second-wave-early + revival strategies, combined exit, feed fixes (14 Oct)
- **wave2** (`🌊 SECOND WAVE`): at 2, 3 and 4 minutes, enter when MC $10–40K, ≥80 distinct buyers, ≥30 new buyers in the last 60s, buy$ ≥ sell$ over 60s, price above 60s ago, bundle <60% (`W2_*`). Day-one replay: the only point where runners were separable from look-alikes was continued buyer growth after minute one.
- **revival** (`🔁 REVIVAL`, the user's hypothesis): token 5–60 min old, ≥40% below its peak, then ≥20 new buyers in 5 min with volume ≥ the previous 5 min (`REV_*`). Day-one replay found almost no such cases; running to measure.
- **combo exit** (`x_combo`): half at 2x, then out on a 60% trail, a volume stop after a 30% drop, or MC back under $20K after being above it. Reported on close messages and in /summary.
- Graduation flagged from PumpSwap evidence (first swap seen for the mint), not only the curve threshold; swaps from pools holding <10 SOL ignored (`PS_MIN_POOL_SOL`) — secondary pools priced tokens at 1% of their value; SOL/USD readings that jump >20% are rejected; trades on the 79.3%/85 SOL operator's tokens marked invalid; sweeper take-profit fixed.

## v0.17.1 — graduation runner + recovery, calmer alerts (14 Oct, evening)
- **gradrun** (`🎓🚀 GRADUATION RUNNER`): within 15 min of graduation, 5m volume ≥ $80K, price ≥ graduation price, ≥30 new buyers in 2 min, buy$ ≥ sell$ (`GR_*`).
- **gradrec** (`🔁🎓 GRADUATION RECOVERY`): graduated, ≥60% below post-graduation peak, then ≥20 new buyers in 5 min with volume ≥ previous 5 min (`GREC_*`). The plain `grad` entry stays as the control (no entries below $20K MC — bad prices).
- Second wave: paper-trades all, alerts only ≥150 buyers and ≥50 new in 60s (`W2_ALERT_*`). Revival (curve): age ≥8 min, not graduated, the peak being recovered from ≥3 min old.
- Combo exit: the $20K floor stop arms only once the position has been up 1.5x (`COMBO_FLOOR_ARM`).
- Momentum paper cap back to $2M (all $100K/5m spikes paper-traded; MC recorded for analysis).

## v0.17.2 — slow build / base breakout (14 Oct, late)
- **slow** (`📈🔁 SLOW BUILD`): token ≥10 min old that fell ≥50% from its peak, with the low ≥10 min ago; three consecutive 5-min windows each with more new buyers and more volume than the one before; price ≥30% above the post-dump low and above its 10-min average; ≥30 new buyers in 10 min; MC ≥ $8K (`SLOW_*`). Per-token history extended to 21 minutes.

## v0.17.3 — proven-wallet bar raised (14 Oct, night)
- Proven = 8+ scored non-bundle buys of ≥0.3 SOL at ≥3s, ≥50% of them 5x, and not a high-frequency wallet (50+ buys/day). Alert only on buys ≥0.2 SOL. The volume snipers (460 buys/day at 0.01 SOL) qualified under the old bar and are not copyable.

## v0.17.4 — second-wave "tight" tag, 1.5x and trail-25 exits (15 Oct, early)
- Second-wave entries are tagged `tight=1` when: check at 2–3 min, MC $12–25K, dev holds a position, buy$ ≥ 1.3× sell$ (`W2T_*`). Entry unchanged; /summary shows a separate SECOND WAVE — TIGHT line.
- New exit columns on every strategy: `x_tp15` (sell all at 1.5x) and `x_tsl25` (25% trail); summaries show 1.5x hit rate.

## v0.18.0 — all-Solana volume feed + /check (15 Oct)
- New `src/dex.js` / `src/dex-decoder.js`: one extra WebSocket subscribed to Raydium CPMM, Raydium CLMM, Raydium LaunchLab, Meteora DLMM and Orca Whirlpool. Swap events are decoded from "Program data:" logs (layouts from the official IDLs; each log line attributed to the program that emitted it via the invoke/success stack, transactions seen on two subscriptions de-duplicated by signature) and priced in SOL from the pool state in the event (CPMM reserves, CLMM/Orca sqrt price, LaunchLab virtual+real reserves, DLMM active bin). They feed the same `onSwap` listeners as PumpSwap, so **momentum's "$100K in 5 min under $2M" now fires on any SOL-quoted pool on Solana**, with volume summed across venues per mint. Why: 9g4Pib…pump spiked at 03:42 UTC on 15 Oct and the bot received zero trades — it was not trading on PumpSwap.
- Pool → mint lookups cost 1–2 credits (getAccountInfo + getTokenSupply) and happen only once a pool has `DEX_RESOLVE_SWAPS` (15) swaps in 5 min, capped at `DEX_POOL_DAILY_BUDGET` (4000); pump-suffix mints skip the supply call. Pools without a SOL side and tokens above `DEX_IGNORE_MC` ($20M) are ignored. Not covered yet: Raydium AMM v4 (legacy; its `ray_log` carries no pool address) and Meteora DAMM v2.
- Caveat for analysis: CPMM, LaunchLab and Orca events carry no wallet, so those trades use a `tx:<sig>` placeholder — buyer counts on DEX-fed momentum entries ≈ transaction counts. `paper_trades.venue` records where the triggering swap came from; the alert shows volume by venue.
- `/check <mint>`: launch record, lifecycle, current 5m volume by venue, mapped DEX pools, paper trades on it, and DexScreener's live pairs with 5m/1h/24h volume — answers "did the bot see this?" from Telegram.

## v0.17.5 — bundle churn at entry (15 Oct)
- Every strategy entry records `churn_entry` (cluster SOL sold ÷ bundle SOL so far), `cluster_out_entry`, cluster holdings % and hand-offs at the moment of entry; second-wave alerts show "bundle churn N%". Day-one finding: bundled launches whose bundle sold out and bought back (churn >150%) reached graduation level 3.6% of the time vs 0.1–0.3% for bundles that held or just exited.
