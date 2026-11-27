# WALLETS — early-buyer wallet research (started 27 Nov 2026, UK)

- **Owner's idea (27 Nov, ~08:50–10:10 UK):** he sends coins that pump (older coins especially); for each, identify every wallet
  that bought from the quiet period up to ~$100K market cap (and who sold), keep them in one database, and look for wallets,
  funders and groups that repeat across pumps. Earlier the same morning: find the side wallets that buy before tracked wallets.
- **Independent of the paper project.** Own branch (`wallets`, code) and data branch (`wallets-data`), own pm2 process. Shares
  only the Helius key (1 credit per transaction read) and the server.
- **Honest prior:** the copy-wallet books all lost. One pump proves nothing — a wallet counts only when it repeats across several
  pumps AND its other buys are checked (hit rate). Nothing is a signal before ~20–30 coins; then a forward paper test.
- **Method agreed:** per coin capture buyer, time, size, market cap, sells, funder, wallet age; strip bots (very busy wallets,
  dust, arbitrage); look for same wallet / same funder / same group / same behaviour; check each repeat wallet's full record.

## 27 Nov 2026, ~10:20 UK — collector built, not yet installed
- `wallets/` on branch `wallets`: 12 tests pass (transaction reader on hand-built pool, bonding-curve, bot, transfer and
  arbitrage cases; whole collector against a fake RPC; request → collect → push against a local remote; key check clean).
- **Not yet verified on real chain data** — this workspace cannot reach Helius. First real run is the check: WOOPY
  (`2va3NUJtEcPemDYg2N1RgA79rPKGTGGJKo3gTY5zpump`, queued in requests.txt). Verify against DexScreener's pool totals before
  trusting any wallet list.
- First look at WOOPY from DexScreener (10:00 UK): ~$411K market cap, PumpSwap pool B9xKSbD9…, 12,298 of the day's 12,847 buys in
  the last hour, ~20,000 trades for ~$272K in that hour (~$13 a trade — bot-sized). X account created Nov 2026 on a coin whose
  pool dates from May 2025. Axiom screenshot: a handful of wallets repeating in ~0.95 SOL clips.
- Known limits: one SOL/USD rate per window; first funder only for wallets with under 3,000 transactions; a coin at or above the
  line at the start of the window has no "early" buyers (pass `mc=` higher); reads stop at the cap, oldest first.
