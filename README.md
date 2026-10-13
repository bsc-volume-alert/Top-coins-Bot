# bundler-tracker (branch: tracker)
Paper-trading tracker for pump.fun launches. Auto-deploys to the droplet via `deploy.sh` (pm2 `deployer` pulls this branch every 30s). Secrets live in `/root/tracker/.env` on the server only.

Pipeline: Helius WebSocket → decode pump.fun Create/Trade events → bundle stats at T+4s → cluster/hand-off/flow tracking → early-inflow paper entry → parallel paper exits → Telegram + SQLite.

- `src/launch-monitor.js` — firehose, bundle detection (create-slot buys), tiering, factory flag, graduation
- `src/signals.js` — cluster set, hand-off detection, cluster/outside SOL flows, paper entry/exit variants
- `src/rpc.js` — budgeted RPC, wallet age + funder lookup
- `src/report.js` — `node src/report.js`
All thresholds are env-overridable (see `src/config.js`).
