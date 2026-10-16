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

## v0.18.17 — Project 2 hypotheses on file, fast-fail exit, clean buy/sell flow (16 Oct)
Recording only; no entry, alert or exit rule changed. The 16 Oct findings on 52 Project 2 trades are written as pre-registered hypotheses in `analysis/README.md`, to be tested on trades entered after this deploy.
- `core_v40` tag: core trade with 1m volume ≥ $40K (`MOM_V40_USD`) and under 10 min old (`MOM_V40_AGE_S`) at entry.
- `x_flow4ff` exit: flow4 plus a fast-fail — at the first tick ≥120 s after entry, if price < 0.90× entry, sell there. Recorded next to `x_flow4` on momentum and copy-variant trades; the sweeper fills it from flow4.
- Clean flow: wallets that buy and sell the same coin within 2 s are bot pairs; `bs_clean_entry` and `bot_share_entry` at entry, and `cs` (clean sell share) / `bot` (bot share of $) / `cv` (clean $) in each path mark.
- `churn_entry` / `cluster_out_entry` now filled on momentum trades (live cluster snapshot, else the tokens table).
- CSV gains `x_flow4ff`, `core_v40`, `bs_clean_entry`, `bot_share_entry`.

## v0.18.16 — `/csv` can no longer take the bot down (16 Oct)
On the morning of 16 Oct `/csv` crashed the tracker in a loop: the export built every table as one in-memory string and zipped it in memory, which passed pm2's 600 MB limit on the 2 GB droplet; pm2 killed it, restarted it, and Telegram re-delivered the same unconfirmed `/csv`. ~15 minutes of feed lost (06:17–06:31 UTC) while Helius rate-limited the reconnects; nothing before that was lost (every write is in SQLite the moment it happens).
- Commands are confirmed to Telegram **before** they run, so a crash mid-command can never replay it.
- The export is streamed row-by-row to temp files and zipped from disk (`zipFiles`, data-descriptor entries); memory stays flat whatever the size. One export at a time; failures are reported in the chat instead of silently.
- `/csv` leaves out `token_life` and `wallet_buys` (the two big tables, unused in analysis so far); `/csvfull` includes them.
- Memory guard: `/status` shows RSS; a warning goes to the chat if it passes 450 MB (pm2 restarts at 600).
- Nothing in entries, exits, tiers or recording changed.

## v0.18.15 — path marks carry volume and sell share (15 Oct)
- `path` marks on momentum and copy-path strategies are now `{m: multiple, v: 5m volume USD, s: sell share of 5m volume}` so sell-share exit thresholds (tolerate sells to ~60% while volume holds; exit regardless at 65–70%) can be tested offline. Early strategy keeps the plain multiple.

## v0.18.14 — price path after entry (15 Oct)
- `paper_trades.path`: JSON of the multiple at 30s/1m/2m/3m/5m/10m after entry on every strategy, so fast-fail rules ("out if not up X by minute Y") can be evaluated offline. Background: on the 27 runner-exit trades, the 14 winners reached 1.5x in a median ~2 min; 9 of the 13 losers never exceeded 1.4x and drifted into the −40% stop; 3 were instant rugs; 2 were stopped first then ran.

## v0.18.13 — non-SOL quoted PumpSwap pools (15 Oct)
- PumpSwap pools quoted in USDC or tokenized stocks (Dacity Coin: $4.6M/24h on a TTWO-quoted pool, pumped 13:00–13:40 UTC, invisible to us) are now priced through the quote asset: its SOL price from DexScreener (best SOL pair, else USD ÷ SOL/USD), decimals from one getTokenSupply call, cached and refreshed every 5 min. Swaps and reserves convert to SOL before the existing gates. `venue` records `pumpswap/<QUOTE>` so these entries can be split out in analysis. The other DEX feed still takes SOL-quoted pools only.

## v0.18.12 — fast tier (15 Oct)
- `momfast` (silent): `MOM_FAST_USD` ($50K) inside `MOM_FAST_WIN_S` (2 min) — same pace as $125K/5m, so it fires earlier on fast movers and ignores slow accumulators. Same gates and cooldown as momentum. Background: the $60K tier fired 45–155s before the $100K trigger on the same coins, sometimes at a much lower price (HellCat $46K vs $64K), but also on 24 coins that never reached $100K (54%); the under-$50K winners differ from the $50–100K ones only in price at trigger, not in any coin feature.

## v0.18.11 — momentum age cap removed (15 Oct)
- `MOM_MAX_AGE_D` 30 → 3650. Groklet (Grok Mascot, 486 days old, PumpSwap) did $100K/5m at ~$300K MC and ran 2.6x; the $60K/$80K tiers (no age cap) caught it, the main rule did not. Any age now; MC cap and sanity gates unchanged.

## v0.18.10 — flow exit with 4x cap (15 Oct)
- `x_flow4`: the flow exit with a voluntary sell at `FLOW_CAP` (4x). Of 36 core winners so far: 21 reached 2x, 13 reached 3x, 8 reached 4x, 4 reached 10x (24h peaks).

## v0.18.9 — runner exits and entry variants (15 Oct)
- Runner analysis on 49 core trades: 3x+ coins (13) still had ≥$100K/5m volume at +15m in 8 of 11 and buys > sells in 10 of 11; the 1.5–3x "modest winners" (23) had median 5m volume of $48K at +15m and a median MC of $1.6K at +30m — rugs that paused. Failures had $2.6K/5m at +15m. At entry the 3x+ group only differed in whale concentration (top-3 share 36% vs 16%/12%) and slightly earlier triggers.
- `x_flow` exit (all strategies): −40% stop until 1.5x, then hold while 5m volume ≥ `FLOW_MIN_VOL` ($100K) and buy$/sell$ ≥ `FLOW_BS_MIN` (1.0); sell when either fails or on a 50% trail. `x_t15s40` / `x_t2s40` (−40% stops). `dd_pre15`: max drawdown before the first 1.5x touch.
- `momdip` (silent): after a core trigger, enter only if price falls `MOM_DIP_PCT` (20%) within `MOM_DIP_WINDOW_S` (10 min) and before 1.5x.
- `momre` (silent, `src/momre.js`): after a core entry, whenever the "1.5x-out / −25% stop" rule would be flat and the coin still satisfies the core condition and price has reclaimed the exit price, re-enter (max `MOM_RE_MAX` 5, ≥ `MOM_RE_GAP_S` 60s apart). Background: ALTAIDOPE stopped at −26% then ran to 10x with 5m volume never below $108K; the 30-min cooldown kept us out.
- `/bigrunners`: 3x+ momentum trades (7d) with 5m volume, buy:sell and MC at +5/15/30/60m.

## v0.18.8 — holder and claim attribution fixes (15 Oct)
- Holders: every graduated coin showed top-10 ≈ 83% with a 42% "largest holder" — a pool/curve/migration account in the ledger. Any single balance ≥ 25% of supply is now excluded (logged once per coin so the address can be confirmed); curve-stage numbers were already sane (top-10 ~25%, largest ~5%).
- Fee claims: the creator vault is shared across a creator's coins, and claims were being credited to every coin they launched in 7 days (54% of coins "claimed"). A claim is now credited to the creator's most recent coin at claim time, flagged `ambiguous` when they launched more than one in the prior 24h; token/entry claim counts use that attribution. Note the "accrued" figure is ~1% of volume (redundant with volume) — claims are the signal.

## v0.18.7 — core-tight tag (15 Oct)
- `core_tight` on momentum: core AND entry under `MOM_CT_MC` ($60K) AND age under `MOM_CT_AGE_S` (6 min) AND trade-size spread (`q_size_cv`) under `MOM_CT_SIZE_CV` (1.6). From the 38-trade winners-vs-losers comparison: losers triggered later (median 7.7 min vs 4.6), higher (median $74K vs $51K) and on churnier, more erratic volume (size CV 1.91 vs 1.42; round-trippers 294 vs 154). Each cut alone was 86–91% vs 60–69%; 8 losers only, so a tag to watch, not a rule. Own line in /summary.

## v0.18.6 — $60K and $80K momentum variants (15 Oct)
- `src/momtiers.js`: silent paper strategies `mom60` / `mom80` (`MOM_TIERS`) fire on $60K / $80K in 5 minutes with the same sanity gates and cooldown as momentum, only while the 5m volume is still below the $100K rule (which then owns the coin). Same exit set via the copy-strategy path; vol5m and venue recorded at entry. Own lines in /summary.

## v0.18.5 — holder distribution at entry (15 Oct)
- `src/holders.js`: per-coin ledger of net token balances per wallet built from the trades we already decode (coins seen from launch; swaps only, transfers invisible). Every paper entry records `top10_entry` (excluding curve/pool), `largest_entry`, `holders_entry`, `dev_hold_entry`. Coins without a ledger (momentum on older/graduated coins) use one `getTokenLargestAccounts` call, dropping the largest account (curve or pool), budget `HOLDERS_RPC_DAILY_BUDGET` 1500/day; holder count is unknown on that path. Alert line: "holders N · top-10 X% · largest Y% · dev Z%". Recorded, not gated.

## v0.18.4 — creator fees & claims, momentum core tag, time to 1.5x (15 Oct)
- `src/fees.js`: creator fee accrued per coin (read from the trade events' `creator_fee` field on pump.fun and PumpSwap — free), and creator fee **claims** decoded from `CollectCreatorFeeEvent` (pump.fun) / `CollectCoinCreatorFeeEvent` (PumpSwap) into `creator_claims`. Claims are per creator (pump.fun pools the vault per creator), attributed to that creator's tokens. Every paper entry records `fee_accrued_entry`, `fee_claims_entry`, `fee_claimed_entry`; tokens get `creator_fee_sol`, `fee_claims`, `fee_claimed_sol`, `first_claim_ts`. Momentum and second-wave alerts show a "dev fees" line. Hypothesis to test (recorded, not gated): devs who claim are still engaged; rug devs don't bother.
- Momentum `core` flag: `vol5m` trigger, entry under `MOM_CORE_MC` ($100K), first entry on the coin — 36 trades at 78% hit-1.5x since the 14 Oct gates, consistent in both halves; bursts (50%), entries over $100K (29–36%) and re-entries (0/3) were the drag. Own line in /summary ("MOMENTUM — CORE"). Nothing stops being recorded.
- `t_hit15_s`: seconds from entry to first touch of 1.5x, on every strategy.

## v0.18.3 — target + hard-stop exits, 1.5x exits on momentum, venue in export (15 Oct)
- Four new paper exits on every strategy: `x_t15s25`, `x_t15s60`, `x_t2s25`, `x_t2s60` — sell all at 1.5x (or 2x), or cut at −25% (or −60%) from entry, whichever comes first. No previous exit had a hard stop. Break-even hit rate at 1.5x after 5% costs: ~41% with a −25% stop, ~59% with a −60% stop — the tight stop's unknown is how many eventual 1.5x hits it knocks out first.
- Momentum now records `x_tp15` and `x_tsl25` too (it had the best 1.5x rate — 51% of 162 closed — and no 1.5x exit recorded). Sweeper fills these columns on over-hold closes so no exit is NULL.
- `/csv` paper_trades now includes `venue` (forgotten in v0.18.0) and the four stop exits; summaries show a "stops" line.

## v0.18.2 — restart-proof volume windows + pre-pump wallets (15 Oct)
- Momentum's rolling 5m/1m windows are saved to `data/momentum-state.json` every 20s and on SIGINT/SIGTERM, and restored on start (ignored if older than 10 min). Why: 9g4Pib…pump IS on PumpSwap (the v0.18.0 note above was wrong — PumpSwap swaps are never stored in the DB, so an empty trades table proved nothing); its 03:42 UTC spike coincided with two deploy restarts (03:39, 03:42) that wiped the tally.
- Pre-pump wallets: every buy with a real wallet (PumpSwap, Raydium CLMM, Meteora) is kept for `PREPUMP_WINDOW_S` (30 min) per token; when a volume trigger opens a paper trade, those buys go to `pump_buyers` (wallet, SOL, MC, lead seconds before the trigger, venue). `/prepump` (7d) and `/prepump30` rank wallets seen before 2+ triggers by how often the coin then hit 2x / 1.5x — the insider finder. Alert shows "buyers before the trigger: N wallets in 30m (M more than 5m early)". Exported in `/csv` as pump_buyers.

## v0.18.1 — DEX feed tuning (15 Oct)
- First 10 minutes live: ~170 tx/s, 1,238 swaps fed, 61 pools mapped, 0 decode failures — but 226 lookup credits, mostly on big Orca/Raydium majors pools that are then discarded. Resolution gate raised to `DEX_RESOLVE_SWAPS` 30 swaps/5m, budget 6,000/day, and resolved/ignored pools are now cached in `dex_pools` so restarts (every deploy) don't re-spend them. DEX socket opens 5s after the other two (Helius returned 429 on the simultaneous third connection).

## v0.18.0 — all-Solana volume feed + /check (15 Oct)
- New `src/dex.js` / `src/dex-decoder.js`: one extra WebSocket subscribed to Raydium CPMM, Raydium CLMM, Raydium LaunchLab, Meteora DLMM and Orca Whirlpool. Swap events are decoded from "Program data:" logs (layouts from the official IDLs; each log line attributed to the program that emitted it via the invoke/success stack, transactions seen on two subscriptions de-duplicated by signature) and priced in SOL from the pool state in the event (CPMM reserves, CLMM/Orca sqrt price, LaunchLab virtual+real reserves, DLMM active bin). They feed the same `onSwap` listeners as PumpSwap, so **momentum's "$100K in 5 min under $2M" now fires on any SOL-quoted pool on Solana**, with volume summed across venues per mint. Why: 9g4Pib…pump spiked at 03:42 UTC on 15 Oct and the bot received zero trades — it was not trading on PumpSwap.
- Pool → mint lookups cost 1–2 credits (getAccountInfo + getTokenSupply) and happen only once a pool has `DEX_RESOLVE_SWAPS` (15) swaps in 5 min, capped at `DEX_POOL_DAILY_BUDGET` (4000); pump-suffix mints skip the supply call. Pools without a SOL side and tokens above `DEX_IGNORE_MC` ($20M) are ignored. Not covered yet: Raydium AMM v4 (legacy; its `ray_log` carries no pool address) and Meteora DAMM v2.
- Caveat for analysis: CPMM, LaunchLab and Orca events carry no wallet, so those trades use a `tx:<sig>` placeholder — buyer counts on DEX-fed momentum entries ≈ transaction counts. `paper_trades.venue` records where the triggering swap came from; the alert shows volume by venue.
- `/check <mint>`: launch record, lifecycle, current 5m volume by venue, mapped DEX pools, paper trades on it, and DexScreener's live pairs with 5m/1h/24h volume — answers "did the bot see this?" from Telegram.

## v0.17.5 — bundle churn at entry (15 Oct)
- Every strategy entry records `churn_entry` (cluster SOL sold ÷ bundle SOL so far), `cluster_out_entry`, cluster holdings % and hand-offs at the moment of entry; second-wave alerts show "bundle churn N%". Day-one finding: bundled launches whose bundle sold out and bought back (churn >150%) reached graduation level 3.6% of the time vs 0.1–0.3% for bundles that held or just exited.
