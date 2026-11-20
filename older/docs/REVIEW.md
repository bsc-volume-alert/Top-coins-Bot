# Review package — older-coin paper project (`older-2`)
_20 Nov 2026 (UK). Local build only: nothing pushed, deployed, purchased or funded._

## 1. What is done
| Item | State |
|---|---|
| Frozen specification | `docs/SPEC.md`, matches `src/spec.mjs` |
| 14 families, 2 exit policies, 448 rows | Implemented (`signals.mjs`, `book.mjs`, `report.mjs`) |
| Scheduled-time fills, 5 s buy timeout, persistent sells | Implemented and tested |
| Decoder to the published IDL (effective reserves, deposits/withdrawals, boosts, sweeps) | Implemented; **tested on synthetic events only** |
| Canonical-pool check | Implemented; derivation cross-checked against the standard Solana library (2,900 comparisons, 0 mismatches) |
| Separate database, minute bars only, retention, disk figures | Implemented |
| Page in the old books style | Implemented; rendered from synthetic data without errors |
| Tests | 40 passing (`npm test`) |

## 2. What is NOT done — needs a short authorised live run on the server
1. **Transaction validation** (`src/validate-tx.mjs`): are an event's reserves before or after the swap; does the curve reproduce traded amounts on effective reserves; does the user's real SOL movement match the event. The engine pins "before" until this evidence exists and shows the page tile **UNVALIDATED**. Note: only trades that are large against the pool separate the two readings (small trades fit both), so the tool reports large trades separately.
2. **Measured Helius usage**: one hour of the feed, read off the Helius dashboard.
3. **Remaining GMGN checks**: depth of 1-minute history at 60 and 90 days; whether `open_timestamp` is token creation (the token-info reply has `open_timestamp` and `migrated_timestamp`, and no `creation_timestamp`); the graduated-coin list.
4. **Memory on real traffic**: the synthetic run used ~200 MB for 200 active coins; thousands of active coins may not fit comfortably beside anything else on a 2 GB server.

## 3. Coverage
- **Covered:** canonical SOL-quoted PumpSwap pools of pump.fun coins — existing pools found by one program-accounts query (repeated daily), new pools from their creation event.
- **Not covered:** Meteora (its swap amounts are not in the logs this feed type delivers), Raydium, Orca, non-canonical PumpSwap pools, pools quoted in other pump coins. All counted on the page.
- **Before the pool existed** (bonding-curve period) and **before we started watching:** GMGN 1-minute bars only. No GMGN data → the coin stays not-covered / the reference stays MISSING.
- **The earlier "Raydium losses"** were our own design (a pool was only looked up after 30 swaps in 5 minutes, under a daily cap, and earlier swaps were dropped), not a provider limit. This feed holds events on an unresolved pool and replays them.

## 4. GMGN — verified on the owner's key, 20 Nov 2026
- Plan: **Free** (plan page; response header `x-ratelimit-limit: 5`). Paid tiers: Plus weight 20, Pro weight 50. No streaming on any tier shown.
- Works: token info, 1-minute kline (100 candles a call). First probe was rate-limited before the other checks ran.
- Use here: creation time and history back-fill only, paced at 4 weight/s → about 11 weight a coin → **roughly 45 minutes per 1,000 coins** at start-up.
- Risk: the free tier states a $100 minimum account balance; the account shows almost none. The key works today.

## 5. Operating cost (estimate; measured figures to replace it)
| Item | Figure | Basis |
|---|---|---|
| GMGN | $0 | free plan; Plus (~$24/month billed yearly) only if back-fill proves too slow |
| Server | existing droplet, or ~$24/month for 4 GB | memory to be measured |
| Helius live feed | **unknown** | one log subscription on the PumpSwap program; billed by traffic. Only reference: an earlier multi-venue stream used 1.6–3.3 M credits a day. Measure for one hour before committing. |
| Helius calls | small | inventory: 1 query + ~1 call per 50 pools, daily; pool look-ups batched 100 a call; entry check 1–2 calls per entry; scale-out adds simulated sells only (no calls) |
| Disk | small | synthetic run: ~15 MB per 100,000 minute bars; 10-day retention |

## 6. Deployment requirements (none actioned)
1. Owner's go to push the `older-coins` branch and run it on the server (own process, own database, own port 8793; the old tracker stays stopped and its data untouched).
2. Keys already on the server are reused from `/root/tracker/.env` (never printed): `HELIUS_API_KEY`, `GMGN_API_KEY`.
3. First hour: run `validate-tx.mjs`, read Helius usage, confirm the reserve reading, then decide whether to continue.
4. Free disk: the server is at 92.7% of 47 GB; this project should write to the 100 GB volume.
