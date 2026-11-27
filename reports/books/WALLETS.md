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

## 27 Nov 2026, 16:46–17:10 UK — the "stall" was my check, not the collector; WOOPY result
- **My error.** The collector was never stuck. Run 1 finished at 10:37 and run 2 at 11:48; both were pushed. My check command
  (`git fetch --depth 1 origin wallets-data:refs/…`) was silently refusing every update after the first because each new shallow
  tip is not a descendant of the last one. Fixed by forcing the refspec (`+wallets-data:…`). Always fetch the data branch with `+`.
- **Two real collector faults found by the log he pasted:** (1) asking with `maxSupportedTransactionVersion: 0` made Helius refuse
  the fast call and drop every version-1 transaction (1,333 of 31,365 in run 1; 4,974 of 65,041 in run 2). Now asks with 1.
  (2) Some multi-hop bot transactions give an absurd price (2,509 of 97,647 rows, almost all one bot wallet); the analysis drops
  rows more than 3x away from the rolling median. Not yet fixed in the collector.
- **Fast path proven:** `getTransactionsForAddress` read 136,009 transactions in under 3 minutes with none missing (run 5).
- **His memory of the timing was a day out:** the rise from the floor happened on **26 Nov 15:16–19:08 UTC**, not this morning.
  This morning's leg started from ~$195K at ~08:30 UTC.

### WOOPY — what the chain shows (run 5, complete: 97,647 trades, 6,065 wallets, 26 Nov 15:16 → 27 Nov 16:53 UTC)
1. **15:16:57, 26 Nov** — wallet `8KFwm8HA…QK6r` buys **81.9% of the supply in one transaction for 83.9 SOL**; nothing had traded in the
   6 days before. Market cap goes from a few thousand dollars to ~$42K in that one buy.
2. **15:17:04 and 15:17:22** — six bot wallets (about 1,000 transactions each, six different funders) buy 0.4–0.65 SOL each in the
   same second, twice. Reaction bots, not the operator. They made 1.1–1.6 SOL each.
3. **15:42–15:55** — a dozen wallets buy 3–14 SOL each and trade in and out; market cap to ~$100K.
4. **16:21:14–16:54:12** — **100 wallets each make exactly one buy of 10–18 SOL, one every 20 seconds**, and every one is in the same
   block as a sell by `8KFwm8HA`. The first buyer sold its whole 81.9% in 100 sells for 1,372 SOL; the 100 wallets paid 1,372 SOL
   and ended with 80.2% of the supply. Supply moved from one wallet to a hundred. Market cap ~$105K → ~$145K.
5. **All 100, the first buyer and 22 of the other big band buyers were first funded by one of two addresses**
   (`ASTyfSima4LL…iaJZ` 85 wallets, `6LY1JzAFVZsP…zkzF` 38), each with 0.014–0.029 SOL, all created 31 Oct–13 Nov 2026, 14–66
   transactions each. 123 wallets. Caveat: a first funding that small could be a shared service, so the funder match alone is not
   proof on a future coin — here it sits on top of the same-block trades.
6. **Band ($7K → first sustained $200K at 19:08:43):** 364 buyers, 1,860 SOL bought. The 123 linked wallets did 1,829 SOL of it
   (98%). The other 241 wallets put in 30 SOL in total; only 39 bought 0.1 SOL or more.
7. **27 Nov ~08:30 → 14:58** — the public leg: $195K → peak ~$783K (1-minute median). ~1,700 outside wallets bought.
8. **15:01:55–15:02:16** — exit. Five unlinked wallets sell 20–43 SOL each in one second (169 SOL), the linked traders follow at
   15:02:05, and at **15:02:14–15:02:16 all 100 holding wallets sell everything** (80.2% of supply for 104 SOL, the pool was
   nearly empty by then). ~$757K → ~$3K in 35 seconds. Holding now (16:50 check): none of the 100, none of the linked traders.
- **Money:** linked wallets net **+180 SOL** in total (first buyer +1,288, the 100 holders −1,268, linked traders +159) — the
  first buyer's "profit" is a sale to its own wallets. Unlinked wallets net **−421 SOL**: 1,048 lost 621 SOL, 148 made 200.
  By first entry (outsiders, ≥0.05 SOL): under $200K 90 wallets net −6.5; $200–350K 198 wallets +65 (11% won); $350–500K 663
  wallets −249; over $500K 813 wallets −228.
- **What this means for the idea:** there were no clever outside early wallets to find — below $200K the buy side WAS the
  operator. The useful output is the operator's fingerprint, saved in `wallets/db/` (two funder addresses, 123 wallets) to match
  against the next coins. Candidate signals, n = 1, untested: one wallet taking >50% of a dead coin's supply in one buy; then
  single equal-sized buys at a fixed interval, each in the same block as that wallet's sell.
