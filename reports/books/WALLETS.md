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

## 27 Nov 2026, 10:20–10:45 UK — first real run stalled silently; collector changed
- He pasted the install at ~10:20; WOOPY started 10:20:05, found the coin (key works), entered the listing step and then
  published nothing for 16+ minutes — no progress, no error. Cause NOT established (no server logs visible from here). My design
  fault: progress was only published every 20 listing pages, so a slow listing and a stuck call looked the same.
- Fix 1 (a453126): status pushed every 90 s by a heartbeat, with listing depth and the last RPC error; 30 s request timeout.
- Fix 2: the read now uses Helius `getTransactionsForAddress` (oldest first, window and success filtered, whole transactions,
  500 a call, 10 credits per 100 — a tenth of the old cost) so a busy coin is no longer walked backwards from today; the old
  list-then-fetch method stays as the fallback if the call is refused. Request format taken from Helius's docs, NOT yet seen
  working against the live API. 12 tests pass (fast path, fallback gives identical output, cap).
- New code loads when the stalled run ends or after `pm2 restart wallets`.

## 27 Nov 2026, 11:07 UK — his exact brief for WOOPY (and the template for later coins)
- Start about 10 minutes before the market cap began to rise (he recalls ~$16K this morning). Take every wallet that bought
  between ~$16K and $200K. For each: did it sell, is it holding, does it still hold right now. Rank by profit made from $16K to
  $200K and analyse the most profitable wallets. "Let's be very specific about it."
- Collector changed to serve this: `mc=200000`; holdings-now check for every band buyer (up to 3,000); profit per wallet =
  sells − buys + holdings at the last price read; age/funder for the biggest and the most profitable. WOOPY re-queued as `run=2`,
  window from 06:00 UTC, cap 150,000 transactions so the read reaches the present. The exact rise start and the 10-minute lead
  are set from the trade data in the analysis, not guessed.
- Still not collected at 11:10: the first run is stalled on the old code; needs `pm2 restart wallets`.
