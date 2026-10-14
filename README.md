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
