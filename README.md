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
- `/csv` now sends five files: paper_trades, token_life (lifecycle funnel), wallet_buys, big_buys, tokens.
