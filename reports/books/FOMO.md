# FOMO — the fomo.family watcher (/fomo page)
_Notes started: 21 Oct 2026 16:45 UK. Read this before any discussion of the fomo watcher or its books (FW = fomo wallets, FF = fomo flow)._

## What it is
A private page, `/fomo`, inside the tracker website: Trending (coins ranked by unique fomo buyers and volume over 15 min / 1 h / 6 h), Wallets (the owner's chosen fomo handles, every buy scored as a paper trade at real costs), Theses (each thesis stored beside the trade it went with, scored at 1 h / 6 h / 24 h, tagged by type and trader). Stage 1 is Solana only. Stage 2 adds Base / BSC / ETH / Robinhood Chain watching. Stage 3 (EVM execution) only if a feed earns it.

Runs as its **own pm2 app `fomo`** on the tracker droplet (owner's decision, 21 Oct 16:17 UK: one droplet, isolated process): own folder `fomo/`, own database `/root/tracker/data/fomo.db`, own log, memory cap, disk alarm. The tracker's web server proxies `/fomo` to it, so one URL and one key.

## Facts found before building (21 Oct 2026, 16:30 UK)
- **fomo's Solana signer / fee payer is public:** `AgmLJBMDCqWynYnQiPCuj9ewsNNsBJXyzoUhD9LJzN51` signs and pays gas for every fomo trade; the user's own per-handle wallet is the token-account owner on the DFlow route leg (matched the paying wallet 94% of the time in Bitquery's sample of 1,166). Fee account `HrTf9CzXR1dRH4Sof5QrpmGWwpwAf3qZzwCsEjQpXcSq` (USDC; owner `R4rNJHaffSUotNmqSKNEfDcJE8A7zJUkaoM5Jkd7cYX`). Identified by Bitquery from on-chain activity, not confirmed by fomo — if fomo rotates the signer, the feed goes quiet and the alarm fires. Source: docs.bitquery.io/docs/blockchain/Solana/fomo-api/.
- **Volume:** about 26,000 fomo trades in one sampled hour on Solana, ~22,000 of them through the DFlow aggregator (same source). That is roughly 7 a second — far more than assumed in the plan. It decides the design below: logs are free, per-transaction lookups are not.
- **Robinhood Chain / EVM:** fomo orders fill through Relay's solver and look like any other Relay fill. App-wide fomo trending on EVM may not be separable on-chain; tracked wallets are. Stage 2 question.
- **cope.capital API** (`https://api.cope.capital`, key from `POST /v1/register`, header `Authorization: Bearer cope_…`): free and uncounted — leaderboard, trending handles, tokens/hot, convergence, handle stats / positions / theses, token thesis; counted (250 a day free, 10 requests a minute) — `/v1/activity` (buy/sell rows with handle, mint, usd, timestamp). Paid tier is x402 at $0.005 a call. **No handle → wallet endpoint.** So wallets are learned by matching a handle's activity rows (mint, time ±60 s, usd ±5%) to the decoded on-chain flow, or pasted by the owner from the fomo app. Source: the fomo-research skill page (skills.lc) quoting api.cope.capital/docs.

## Principles (owner's standing rules for this project)
- Reliable data first: on-chain via our own feed is the source of truth; cope.capital is colour (theses, handle mapping) and nothing breaks if it disappears.
- Theses never trigger trades. Nothing is bought until a feed shows 40+ trades positive at real costs, and the median trade is positive too (one 20x can carry 39 losers). Paper → shadow → live, stakes stepped up.
- The record to beat: the wallet-copy books S2, S6, S6b, S7, S7b all lost 15–18% a trade on 150–1,350 trades each (see S6.md). Fomo top wallets add a risk those books did not have: their followers see the buy in the app at the same moment we do, so a copy lands in the follower wave. Stage 1 measures the entry-delay curve (+0 / +5 / +30 / +120 s) to settle whether "immediately" is worth anything.
- Facts and statistics only; UK times; propose code changes and wait for "go"; never print keys; sweeps only to the owner's Phantom wallet.

## Stage 1 design — Solana (the change list for "go")
**Data path.** One WebSocket `logsSubscribe` mentioning the signer gives every fomo transaction's logs. The swap events of pump.fun, PumpSwap, Raydium (CPMM / CLMM / LaunchLab), Meteora DLMM and Orca are all in those logs as `Program data:` lines, and the tracker already has the three decoders (`src/pump-decoder.js`, `src/pumpswap-decoder.js`, `src/dex-decoder.js` — pure modules, no side effects, imported by relative path). So mint, side, amounts and price come free; only a pool → mint lookup costs a credit, once per pool, cached in fomo.db. The buyer wallet is not in the pool event; it needs `getTransaction` (1 credit). Budget: a daily cap (`FOMO_DECODE_BUDGET`, default 50,000 = 1.5M a month) spent on (a) every trade of coins in the current top 30 trending, so their unique-buyer counts are exact, and (b) a 1-in-N sample of the rest, so ranks stay right everywhere. Watched wallets are separate subscriptions (mentions: wallet), low volume, decoded fully.
**Credit risk to measure on day 1:** the tracker's DEX stream burned 1.6–3.3M Helius credits a day on its WebSocket (19 Oct), so a 26,000-an-hour firehose may be billed per notification. The signer stream starts on the public RPC WebSocket (free; the tracker lists it as fallback) with Helius as the fallback behind a per-day notification cap; the first hour's Helius dashboard figure decides.
**Prices for scoring.** Jupiter price API v3, batched (≤ 50 mints a call, one call every 10 s — the tracker already uses it for SOL/USD), with DexScreener as fallback (best pair by liquidity, any quote — fomo buys in USDC). Market cap for the trending table from DexScreener, cached 5 min, only for coins on the table.
**Cost model.** LESSONS.md's pool model: x / 1.02 × 0.967 − 1 − 0.006 − 0.02; stops (x ≤ 0.62) −0.05 more; 0.001 SOL a trade. Applied at each entry delay.
**Exits recorded in parallel** (same as the tracker's books): 5-min sale (h5), 40% trail (tsl40), 1.5x / −40% (t15s40), **copy = sell when the trader sells** (the honest copy measure), time 6 h. A sweeper closes stale positions at the real price.
**Disk.** ~600K flow rows a day; raw rows kept 7 days, per-coin hourly aggregates kept 90 days; prices kept per open coin only. Disk alarm at 80%.

### Files
New folder `fomo/` (nothing in it touches the tracker or the executor):
- `fomo/package.json`, `fomo/package-lock.json` — deps `better-sqlite3`, `ws` (same as the tracker); version 0.1.0.
- `fomo/ecosystem.config.cjs` — pm2 app `fomo`, cwd `/root/tracker/fomo`, `max_memory_restart: "600M"`, restart_delay 5000, own log files.
- `fomo/src/env.mjs` — loads `/root/tracker/.env` (same loader as the tracker's `src/env.js`).
- `fomo/src/config.mjs` — `FOMO_SIGNER` (default the Bitquery address), `FOMO_PORT` 8789, `FOMO_WS` public|helius, `FOMO_DECODE_BUDGET` 50000, `FOMO_HANDLES` (comma list), `COPE_KEY`, poll intervals.
- `fomo/src/db.mjs` — `fomo.db`: `flow` (sig, slot, ts, mint, side, quote, quote_amt, usd, tokens, price_usd, wallet, venue, legs), `flow_hourly` (mint, hour, buys, sells, buy_usd, sell_usd, buyers_seen), `wallets` (wallet, handle, label, source, added_ts), `handles` (handle, stats_json, updated_ts), `trades` (paper: wallet, handle, mint, symbol, entry_ts, entry_px, px5, px30, px120, peak, x_h5, x_tsl40, x_t15s40, x_copy, x_time, their_sell_ts, their_sell_px, closed, exit_reason), `theses` (handle, ts, mint, chain, text, type, trade_id, px0, px1h, px6h, px24h, poster_exit_s), `prices` (mint, ts, usd), `pools` (pool, venue, mint, dec, supply, ignore), `stats`.
- `fomo/src/flow.mjs` — the signer firehose: subscribe, decode with the three tracker decoders, pool cache + budgeted lookups, write `flow`, roll `flow_hourly`, the buyer-wallet decode queue (top-30 coins first, then the sample), notification and credit counters.
- `fomo/src/wallets.mjs` — one subscription per watched wallet (all on one socket), full decode; a buy opens a paper trade; the trader's sell closes `x_copy` and records their hold time.
- `fomo/src/price.mjs` — Jupiter batched prices + DexScreener fallback, a price ring per open coin, market cap cache.
- `fomo/src/score.mjs` — cost model, entry-delay marks (0 / 5 / 30 / 120 s), the parallel exits stepped on every price tick, the sweeper.
- `fomo/src/cope.mjs` — cope.capital client with the 10-a-minute limiter and the 250-a-day counter for `/v1/activity`; leaderboard, handle stats / positions / theses, tokens/hot, convergence (colour only); handle → wallet learning by matching activity to flow; every call optional — absent key or 402/429 degrades to nothing.
- `fomo/src/theses.mjs` — theses polled every 5 min per watched handle; typed by keyword rules (team/dev, narrative, chart, insider claim; else "other"); linked to the nearest buy within ±10 min; scored at 1 h / 6 h / 24 h from the linked entry price; poster-exit time from the wallet's sells.
- `fomo/src/web.mjs` — HTTP on `127.0.0.1:8789` only: `/` the page (Trending / Wallets / Theses tabs, UK times, 30-s refresh), `/api/trending?w=15m|1h|6h`, `/api/wallets`, `/api/theses`, `/api/status` (notifications/h, credits used, decode backlog, open trades, memory), `/api/csv/flow|trades|theses`, `POST /api/wallets` add / remove (handle or wallet, label).
- `fomo/src/index.mjs` — boot, `FOMO_SMOKE=1` self-exit for the deploy check, heartbeat log, uncaught/unhandled handlers, alarms through the tracker's Telegram token: bot down, signer stream silent 10 min, decode budget exhausted, disk over 80%.

Tracker changes (small, three files):
- `src/web.js` — after the WEB_KEY check, proxy `/fomo` and `/fomo/*` to `127.0.0.1:8789` (~15 lines); a "fomo" link in the nav. Nothing else in the tracker changes.
- `scripts/deploy-step.sh` — a `fomo/` block like the executor's: `npm install` in `fomo/`, `node --check` on `fomo/src/*.mjs`, a 20-s smoke boot, then `pm2 startOrReload fomo/ecosystem.config.cjs --only fomo`; `fomo/` added to the "tracker untouched" list so fomo pushes never restart the tracker; reject + Telegram on failure, as now.
- `scripts/push-data.sh` — adds `data/fomo_flow_hourly.csv`, `data/fomo_trades.csv`, `data/fomo_theses.csv` (7 days) from the fomo API, so the 4-hourly study can read them.
- `.env` on the box (owner only): `COPE_KEY=…`; optionally `FOMO_HANDLES=…`.

Not in stage 1: no executor link (a feed that earns it later sends `trigger` / `exit` on the existing socket as book FW), no Telegram per trade, no EVM.

### Order of build after "go"
1. `fomo/` skeleton + deploy block + proxy → the page is up, empty, showing status.
2. Signer firehose → trending table live (counts first, unique buyers as the decode queue fills).
3. Watched wallets + scoring → Wallets tab.
4. cope.capital + theses → Theses tab.
5. Data push + notes. Then a week of scoring before any verdict.

## Verdict now
No data yet. Stage 1 built and deployed 21 Oct 2026 ~17:10 UK (v0.18.179 → rebased onto v0.18.180, fomo 0.1.1). Scoring starts when the first wallets are watched; the trending table fills from the firehose on its own. No verdict before a week of data.

## Change history
- 21 Oct 2026 16:45 UK — notes created; stage-1 change list written; facts above found (signer address, 26K trades/h, cope.capital API shape).
- 21 Oct 2026 16:42 UK — owner: "Go."
- 21 Oct 2026 ~17:10 UK — **stage 1 deployed** (commit 245210c + fomo 0.1.1): `fomo/` app as pm2 `fomo` (600 MB cap), `fomo.db`, page at `/fomo` via the tracker's proxy (src/web.js), deploy block in scripts/deploy-step.sh (fomo pushes never restart the tracker), three fomo CSVs in scripts/push-data.sh. Built as designed with these choices: firehose on the **public** RPC websocket first, Helius only when the public socket is quiet for 2 min and capped at 300K notifications a day (`FOMO_WS`, `FOMO_HELIUS_NOTIF_CAP`); pool lookups 3,000 a day; getTransaction 50,000 a day with a fifth reserved for watched wallets; pump.fun and PumpSwap wallets come from the events and are cross-checked against getTransaction on a 1-in-20 sample (`walletMatch` / `walletMismatch` on the Status tab decides whether to trust them); Raydium / Meteora / Orca legs get the wallet from getTransaction (top-30 coins first). Prices in USD (fomo buys in USDC). Entry = the trader's fill from the decoded transaction; marks at +5 / +30 / +120 s; exits h5, tsl40, t15s40, copy (their sell), 6 h; real costs applied on the page with the pool model. Candidates list = most active fomo buyers in 24 h from decoded transactions (our own data). Local checks: syntax, 12-s smoke boot, API round-trip, a synthetic pump.fun trade through decoder → flow → trending.
- 21 Oct 2026 16:41 UK — **cope.capital is dead:** `api.cope.capital` returns NXDOMAIN (Cloudflare DNS, Status 3) from the tracker box; register and leaderboard unreachable. The endpoint list above is from a third-party skill page and is kept for the record only. Stage 1 runs with no third-party source: the "top wallets" list is built from our own decoded flow and scoring; theses wait for a source (fomoapi.io, paid, is the only other one seen — unverified). `fomo/src/cope.mjs` stays a stub behind `COPE_KEY`.

## Ideas tested
- (none yet)

## What the owner said / decided
- 21 Oct ~15:40 UK: build a fomo-like multi-chain tracker — top wallets, their theses, all coins across Solana / Ethereum / BNB / Robinhood, trending, and the ability to buy immediately on alpha. Agreed it is not for copy-trading as such (the copy books all lost); buying waits for a feed to earn it.
- 21 Oct 16:11–16:17 UK: one droplet, not two — fomo as an isolated process on the tracker box (memory cap, own DB, disk alarm); split only at stage 3 if EVM trading earns it (the BSC droplet could take that then). BSC droplet's fate is a separate decision about the Flap tracker.
- 21 Oct 16:17 UK: "let's begin … finalise as soon as possible."

## Open items
- Done 16:30 UK: `free -m` 3,915 MB total, 2,851 available; tracker 511 MB, executor 124 MB — fomo fits. Tracker shows 753 restarts, executor 44 (check the logs for crashes once fomo is up).
- Owner: any fomo handles he rates (typed from the app); their wallets get matched from the flow. No cope key possible (NXDOMAIN, 16:41 UK).
- Done 16:42 UK: "go".
- Owner: add the first wallets on the Wallets tab (or from the Candidates list once decoded transactions appear).
- Known small debt: comments in src/web.js say v0.18.179; the rebase landed the change inside v0.18.180 (another session's GR2 bump). Fix with the next tracker change.
- Day 1: measure whether the signer stream on Helius is billed per notification; measure the public-WS drop rate; set `FOMO_WS` accordingly.
- Day 1: confirm the DFlow route legs decode cleanly from logs (multi-leg routes, "Log truncated" on big transactions); record the share that needed `getTransaction`.
- Stage 2 question: whether fomo's Base / BSC / ETH fills are separable from other Relay fills (a test buy on Base will show).
