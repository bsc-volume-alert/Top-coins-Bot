# BSC tracker — Flap (branch `bsc`, droplet `tracker-bsc`, pm2 `tracker-bsc` + `deployer-bsc`)

Clone of the Solana tracker for BNB Chain, Flap launchpad first. Auto-deploys from this branch every 30 s.
Secrets in `/root/tracker-bsc/.env` only (`BSC_TG_BOT_TOKEN`, `BSC_TG_CHAT_ID`, `NODEREAL_API_KEY`). Every setting is a `BSC_*` env var (`bsc/config.js`).

**Pipeline:** gap-free feed (`feed.js`: live WebSocket on publicnode, 2-s HTTP poller when it drops, 10-s sweep, completeness check every 5 min with ⚠️ alarms) → Flap Portal decoder (`flap.js`: TokenCreated, TokenBought/Sold, LaunchedToDEX, quote/tax/threshold events) → PancakeSwap V2/V3 pools after graduation (`pools.js`) → per-token state + strategies (`tokens.js`) → paper trades with the 13 exits from `src/exits.js` (`paper.js`) → Telegram + SQLite → `/csv`.

**Strategies (same logic and starting parameters as Solana):** second wave (2/3/4 min), momentum ($100K/5m) and burst ($30K/1m), graduation runner, graduation recovery, revival, slow build, copy (watched wallets), copy creator; silent: early sampler (inflow ≥$1.5K from ≥8 wallets in 60 s, first 3 min) and graduation control (every graduation tracked since launch). Bundles = buys in the creation block (recorded, never gated).

**Analysis:** `analysis/README.md` rules apply. Entry-time columns: `entry_*`, `*_entry`, `vol5m_usd`, `vol1m_usd`, `bs_ratio_entry`, `bundle_*`, `snipers`, `dev_buy_usd`, `tax_bps`, `creator_*`, `proven_entry`, `q_*`, `hour_utc`, `feed_*`, `quote`. After entry (never predictors): `peak_*`, `last_*`, `x_*`, `exit_*`, `mc_5m`, `mc_15m`, `buyers_5m`. `feed_health` holds every completeness check — exclude periods with `final_pct < 99.5`. Costs: Flap curve ~1% fee each way + slippage (assume 5–10% round trip), tax tokens add `tax_bps`.

**Known limits:** coins launched before the bot started have no launch data and an inferred quote (`USD?`); PancakeSwap Infinity pools (CL migrator) are counted but not followed yet; four.meme / Genius.fun / Brew are counted only (later push).
