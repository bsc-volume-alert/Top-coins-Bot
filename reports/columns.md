One row per trigger since the price fix (18 Oct 20:25 UK), for books A, C, D (the P5 levels), 80 (the old 80-SOL level), E (the $100K/5-min core trigger) and, from 19 Oct 14:00 UK, S1–S6 (Project S, the paper snipers — bought in a coin's first seconds on one alpha each; `pass` is always 1 for them, and the pre_* / sol60 columns are blank because there is no 60-s window before a launch). Rows are kept whether the website's filters took the coin or skipped it (`pass` = 1 / 0). All money is USD unless the name says SOL; all multiples are price ÷ entry price (1.2 = up 20%, 0.6 = down 40%). Times are seconds after the trigger unless the name says otherwise. Empty = not known / not applicable.

## Identity

| column | meaning |
|---|---|
| id | the paper trade's id (the executor's `paper_id`) |
| strategy | p5e30 (A), p5w30 (C), p5e50 (D), p5e80 (80), momentum (E) |
| book | A / C / D / 80 / E. B shares A's row (same trigger, different exit) — see the legB_ columns |
| name, mint | the coin |
| entry_utc, entry_ts, hour_uk | when the trigger fired (UTC text, unix seconds, hour of day in UK time) |
| pass, skip_why | 1 = the website's filters would have taken it; else why not (launch not seen, bundled ≥ 70%, ≥ 150 wallets, not SOL-paired) |
| venue | where it traded (pumpswap, pumpswap/<quote>, raydium…) — only pumpswap in SOL is tradable by the live wallet |
| entry_mc, entry_price | market cap (USD) and price (SOL per token) at the trigger |
| age_s | seconds since the coin was created |

## The coin at the trigger

| column | meaning |
|---|---|
| bundle_pct | % of supply bought by the launch bundle |
| bundle_wallets, handoffs | wallets in the bundle; how many times bundle tokens were handed on |
| dev_buy_sol | the creator's own buy at launch (SOL) |
| outside_buyers | buyers outside the bundle in the launch window |
| factory | 1 = the creator launched another coin within the factory window |
| has_socials | 1 = a twitter / website / tiktok was on the launch |
| holders_entry, top10_entry, largest_entry, dev_hold_entry | holder count, top-10 %, largest holder %, creator's % at entry |
| snipers_n, snipers_held_pct | sniper wallets at launch and what they still hold |
| fresh_share, fresh_n | share of the 5-min buy volume from fresh wallets, and how many |
| proven_vol_share, proven_wallets_5m | share of the 5-min buy volume from wallets with a winning record, and how many such wallets |
| dex_paid | 1 = DexScreener profile paid for |
| q_wallets | unique wallets in the 5-min window |
| pool_sol | the PumpSwap pool's SOL side after the triggering trade (depth: how much a 0.25 SOL buy moves the price) |
| gi_*, gs_* | GMGN's token-info and security snapshot at entry, one column per numeric field (gi_ = info, gs_ = security). Note: before 19 Oct 14:50 UK these were read from the wrong column and are blank |
| gh_* | GMGN's top-20 holders at entry (A/C/D/E; snipers at +90 s), summarised by wallet tag as a share of supply (0–1): gh_top10, gh_top20, gh_largest, gh_pool (pools / exchanges), gh_dev, gh_bundler, gh_sniper, gh_smart, gh_kol, gh_fresh, gh_insider (rat traders), gh_transfer_in, gh_suspicious; counts gh_n_smart / n_kol / n_bundler / n_sniper / n_fresh; gh_sold_out = top wallets that have fully exited; gh_on_curve |
| gm_* | GMGN's trending-list row for the coin, if it was on the list in the 10 min before entry (gm_mc, gm_holders, gm_rug, gm_bundler, gm_top10, gm_smart, gm_renowned…) |
| gw_big_*, gw_sig_* | GMGN's 7-day record of the trigger minute's biggest buyer (big; its address in max_wallet) and of the wallet that fired a sniper book (sig): winrate (0–1), pnl (realized ÷ cost), realized, unrealized, cost, buys, sells, tags, followers (GMGN followers), age_d (wallet age in days), created (tokens it created) |
| sm_buys_5m, sm_sells_5m, sm_buy_usd_5m, sm_sell_usd_5m, sm_wallets_5m, sm_kol_buys_5m, sm_smart_buys_5m, sm_last_buy_s | GMGN's smart-money / KOL feed on this coin in the 5 min before the trigger: buys and sells, USD, distinct buying wallets, how many were KOL vs smart-money, seconds since the last smart buy (blank = none seen; the feed lags the chain by some seconds) |

## The buying that made the trigger

| column | meaning |
|---|---|
| sol60, wal60, n60 | SOL bought, unique buying wallets and buy count in the 60 s before the trigger |
| max_share | the biggest single buy's share of those 60 s |
| avg_buy_sol | average buy size (SOL) |
| sell60 | SOL sold in those 60 s |
| pre_m1_*, pre_m2_*, pre_m3_*, pre_m5_* | the last 1 / 2 / 3 / 5 minutes before the trigger: b = USD bought, s = USD sold, nb = unique buyers, ns = unique sellers |
| pre_min1_* … pre_min5_* | the same per minute: min1 = the last 60 s, min2 = 60–120 s before, … min5 = 4–5 min before |
| pre_30sol_t / _w … pre_80sol_t / _w | seconds BEFORE the trigger at which 30 / 40 / 50 / 80 SOL of buying (in the 60-s window) was crossed, and the wallets by then |
| feed_lag_ms | how late we saw the triggering trade (our clock − block time) |
| fs1_x, fs2_x, fs5_x, fs10_x | price multiple 1 / 2 / 5 / 10 s after the trigger by OUR wall clock (feed lag included: what a bot buying now would pay) |

## Market heat at the trigger (the whole market, not this coin)

| column | meaning |
|---|---|
| heat_trig1h, heat_trig24h | A/C/D triggers in the last hour / 24 h |
| heat_win2h_n, heat_win2h_hit, heat_win2h_dead | A triggers entered 10 min – 2 h earlier; how many reached 1.5x at a mark; how many were at ≤ 0.5 at 10 min |
| heat_launch1h, heat_launch10m | pump.fun launches in the last hour / 10 min |
| heat_grad1h, heat_pools1h | graduations and new PumpSwap pools seen in the last hour |
| heat_sol1h_pct, heat_sol24h_pct | SOL/USD change over the last hour / 24 h (%) |
| heat_uptime_s | seconds since the tracker last restarted — the launch / graduation / pool counts only cover that long when it is under 3600 |

## The creator and copycats

| column | meaning |
|---|---|
| cr_n | the creator's earlier launches we saw |
| cr_best_mc | the best peak market cap among them (USD) |
| cr_grads, cr_over100k | how many graduated; how many peaked above $100K |
| cr_last_min | minutes since the creator's previous launch |
| cr_n24h | the creator's launches in the last 24 h |
| cr_wallet_age_s | age of the creator's wallet at launch |
| cr_funded_sol | SOL the creator's wallet was funded with |
| cc_n24h | coins with the same name launched in the last 24 h (copycats) |
| cc_best_mc24h, cc_grads24h | the best peak among them; how many graduated |
| cc_last_min | minutes since the latest same-name launch |
| cc_sym_n24h | coins with the same ticker in the last 24 h |

## Project S — what the sniper book saw at its entry (S1–S5 rows only)

| column | meaning |
|---|---|
| sn_delay_s, sn_slot_gap | seconds, and blocks, between the coin's creation and the trade we bought on |
| sn_buyers, sn_out_sol | distinct buyers outside the create block (not the creator) by then, and the SOL they put in |
| sn_sol_in, sn_sol_out, sn_sells, sn_trades | all buying / selling (SOL), sells and trades seen by then, create block included |
| sn_mc_first | market cap at the first trade after the create block |
| sn_dev_buy_sol, sn_bundle_pct, sn_bundle_sol, sn_bundle_wallets | the create block: the creator's own buy, the bundle's % of supply, SOL and wallets (known from +4 s; blank if the book bought before that) |
| sn_signal, sn_signal_n | the alpha in words, and its number (S1 graduations, S2 the wallet's 5x rate, S3 the copied coin's peak, S4 buyers, S5 SOL in, S6 the wallet's early wins) |
| sn_wallet, sn_wallet_n, sn_wallet_x5, sn_wallet_x10, sn_wallet_rate | S2: the proven wallet, its scored early buys, how many reached 5x / 10x, the 5x rate. S6: the smart wallet, the big coins it was seen on, its early wins, their ratio |

The six books: S1 creator record (a dev with at most 30 launches, 2+ graduated or one over $100K, and at least 10% of them did) · S2 proven wallet (our own scoring: 8+ early buys, half of them 5x) · S3 copycat (same name as a coin that peaked ≥ $300K in 24 h) · S4 clean launch (bundle < 5%, dev 0.2–3 SOL, 10+ outside buyers and 5+ SOL within 15 s) · S5 20-s inflow (15+ SOL from 12+ wallets within 20 s) · S6 GMGN smart wallet (a wallet GMGN tags smart_degen / renowned / pump_smart, or that was early — after the create block, within 10 min — and in profit on 2+ coins that peaked ≥ $300K, harvested every 30 min from GMGN's top traders, or any wallet seen in GMGN's smart-money / KOL feed; dev / bundler / sniper / rat-trader tags excluded) · S7 GMGN smart-money feed (GMGN's feed shows a smart-money or KOL buy on a coin under 10 min old that we track from launch — bought at our own feed's last price; sn_feed_lag_s = how long after the buy the feed showed it) · S8 bundled launch · S9 swarm dip (20+ outside wallets ≥ 0.3 SOL in the first 60 s, bundle < 20%, bought at +60 s, sold at 5 min; also the executor's shadow book S9, so its rows carry live_* columns) (a tier-1 prepared launch, 40–79% of supply and ≥ 20 SOL bought in the create block — bought on the first trade after +4 s, when the bundle is known; the 13:28 study's F2).

Costs on the bonding curve are about 10% a round trip (1% fee each way, slippage, a second of latency on a moving curve) — price S rows at 10%, not at A's 5–6%.

## Two more files on the `data` branch (Project S research, every 4 hours)

**launches.csv** — every pump.fun launch we saw in the last 24 h (at least an hour old), winners and losers alike: what was known at launch and what happened. Columns (NOTE, 19 Oct 15:40 UK: outside_buyers, cluster_sol_out, churn, handoffs, fee_claims and creator_fee_sol are totals over the coin's tracked life, not launch-time facts — do not use them as tells for a buy at launch or at 60 s; the launch-time columns are bundle_*, dev_buy_sol, factory, has_socials, creator_age_s, cr_prior_*, cc_prior_*; the 60-s columns are mc_60, buyers_60, vol5m_60, wb_60s_*, proven_60s): mint, name, symbol, creator, create_utc/ts, hour_uk, tier (1 = bundled launch), bundle_pct/sol/wallets, dev_buy_sol, outside_buyers, cluster_sol_in/out and churn (bundle SOL sold ÷ bundle SOL), handoffs, factory, has_socials, creator_age_s, creator_funded_sol, fee_claims, creator_fee_sol; cr_prior_* = the creator's launches BEFORE this one (count, graduations, over $100K, best peak, minutes since the last); cc_prior_* = same-name launches in the 24 h before (count, best peak, minutes since); wb_n / wb_sol = scored early buyers (≥ 0.3 SOL within 180 s) and their SOL, wb_60s_* the same within 60 s, proven_60s / proven_180s = how many of them were proven wallets; entry_mc = market cap at +4 s; mc_60, mc_300, mc_900, mc_1800, mc_3600 = market cap at 1, 5, 15, 30, 60 min (buyers_60, buyers_300, holders_300, top10_300, vol5m_60 alongside); peak_30m, peak_24h, peak_mc, last_mc, graduated, grad_3600; x60 … x3600, xpeak = those marks ÷ entry_mc (an honest replay of a buy at +4 s). Base rates, not trades: use it to find which launch tells lift the odds of 5x / graduation, and by how much.

**smart_wallets.csv** — the GMGN-harvested smart wallets S6 trades on: wallet, early_wins (coins ≥ $300K it was early and in profit on), coins_seen, gmgn_tags, profit_usd (GMGN's figure summed), first/last seen, median_early_s (how many seconds after launch it typically buys), gmgn_smart (1 = GMGN itself tags it smart / renowned).

**wallets.csv** — our wallet leaderboard: every wallet with 5+ resolved non-bundle early buys (≥ 0.3 SOL, ≥ 3 s after launch): buys, x2 / x5 / x10 (how many reached that multiple within 24 h of the buy), rate5x, rate10x, avg_age_s (how early it buys), avg_sol, sol_total, avg_entry_mc, buys_24h, first/last seen. "2x" is meaningless for early buys (most launches 2x from the floor); judge wallets on 5x and 10x with at least 8 buys, and treat a wallet with 50+ buys a day as a volume bot.

## After the trigger — the trace (marks at 10, 20, 30, 40, 50, 60 s and 2, 3, 5, 10, 15, 20, 30 min; `t60_x` = at 60 s)

| column | meaning |
|---|---|
| t{m}_x | price multiple at the mark |
| t{m}_lo, t{m}_hi | the lowest / highest multiple seen between entry and the mark |
| t{m}_b, t{m}_s | USD bought / sold since entry |
| t{m}_bs, t{m}_ss | SOL bought / sold since entry |
| t{m}_nb, t{m}_nn, t{m}_ns | unique buyers since entry; how many of them are NEW (had not bought in the 5 min before the trigger); unique sellers |
| t{m}_mx | the biggest single sell so far (USD) |
| t{m}_ib, t{m}_is, t{m}_inb, t{m}_ins | the interval since the previous mark only: USD bought / sold, unique buyers / sellers |
| t{m}_ps, t{m}_psn | USD sold by wallets that had bought BEFORE the trigger (distribution into the pump), and how many of them |
| t{m}_ds | USD sold by the creator |
| after_10sol_t / _w … after_50sol_t / _w | seconds after the trigger at which +10 / 20 / 30 / 50 SOL more buying arrived, and the buyers by then |
| h0_*, h60_*, h300_*, h600_* | holders at entry, 1, 5 and 10 min: n = count, t10 / t20 = top-10 / top-20 %, lg = largest %, dev = creator's % |
| lo_x, lo_t, hi_x, hi_t | the lowest and highest multiple in the 30 min after entry, and when |
| path5s | the price multiple every 5 s for the first 10 min (121 values, `|`-separated; a quiet 5 s keeps the last price). Point k = k×5 s |

## What the paper exits did (every rule runs on every row)

| column | meaning |
|---|---|
| x_flow4 | A, C, D's rule: −40% stop until 1.5x; after 1.5x hold while the 5-min volume and buy/sell ratio hold and the price stays within 50% of its peak; sell at 4x |
| x_h5 | B's rule: −40% stop until 1.5x; after 1.5x a floor at 1.3x; whatever is left is sold at 5 min |
| x_h3, x_h15 | the same with the sale at 3 min / 15 min |
| x_h5f14 | the same as h5 with the floor at 1.4x |
| x_t15s40, x_t2s40 | sell everything at 1.5x / 2x, or at −40% from entry, whichever comes first |
| x_h2t40 | −40% stop until 2x; at 2x sell half; the rest rides on a 40% trail from the peak |
| x_split | −40% stop until the 2-min mark; at 2 min: below 0.9 → out; at or above 1.2x → ride a 40% trail from the peak (cap 4x); in between → half out at 1.5x, the rest on the trail |
| x_tsl40 | 40% trailing stop from the peak (tsl60 / tsl80 = 60% / 80%) |
| x_flow | the flow rule without the 4x cap |
| x_time | the hold-limit close |
| ex_{rule}_t | seconds after entry at which that rule FIRED (rules: flow4, h5, h3, h15, h5f14, t15s40, t2s40, h2t40, split, tsl40, flow, tsl60, tsl80) |
| ex_{rule}_x | the multiple at the tick that fired it |
| ex_{rule}_px10 | the 5-s path 10 s after the fire — about what a real sale lands at |
| ex_h5_why, ex_flow4_why | why: time / stop / floor / trail / cap / fade-volume / fade-sellers |
| peak_mult, after_peak_mult | the highest multiple while the paper position was open; and in the after-watch |
| dd_pre15, t_hit15_s | the worst drawdown before 1.5x; seconds to 1.5x |
| exit_reason, closed | how the paper position closed; 1 = closed |

## The executor's legs (only where a book was LIVE or SHADOW at the time)

| column | meaning |
|---|---|
| live_book, live_mode | which book's leg (A / C / D) and whether it was live (real SOL) or shadow (simulated at the quote) |
| live_stake_sol, live_cost_sol, live_proceeds_sol, live_pnl_sol | stake, what the buy cost (fees in), what the sale returned (fees out), profit |
| live_x | proceeds ÷ cost |
| live_entry_gap | real fill price vs the paper entry (+0.02 = paid 2% more) |
| live_exit_gap | real sale price vs the paper exit price |
| live_rule, live_why | the exit that sold it, and the sub-reason |
| live_fill_ms | trigger → buy confirmed |
| live_opened_utc, live_closed_utc | when |
| legB_* | the same for B's leg on this coin (mode, stake, pnl, x, entry gap, exit gap, rule, why) |

## Reading the exit columns together

For any rule R on any row: `ex_R_t` says when it fired, `ex_R_x` the multiple at that tick, `ex_R_px10` the path 10 s later. A realistic sale ≈ `ex_R_px10` × (1 − 0.03) for the price impact and fees at 0.1 SOL (measured on the 81 real sells: timed sells −1.6%, floors −3%, stops −3.8%; a rug −100%). The entry ≈ `fs5_x` × 1.02 (measured median +1.8%).

**v0.18.142 (19 Oct 20:10 UK) — new books and exits.** book `A5` = strategy p5c5: opened 5 s after A's own trigger only when the price is still ≥ 1.02x the trigger price (early_json.a5 = {trigPx, px5, r, aId} — aId is A's paper row on the same coin); its executor leg is book A5 (key `confirm`) in live_*. `S10` = sn10, the 10-wallet operator fingerprint (10 bundle wallets, 37–41%, 22–28 SOL, dev < 0.2), executor book S10 (key `op`). `S4b` = sn4b, S4 with a bundle under 3%, paper only. **x_flow4ff is now A2's exit** (sell at 60 s if below 0.95x, else the runner) for rows entered from 19 Oct 19:00 UTC; before that it was 120 s / 0.90. Book G's executor leg sells at 5 min (h5) from 20:10 UK (runner before). The website prices paper with the measured costs (`real`): PumpSwap books x/1.02 × 0.967 − 0.016, stops (x ≤ 0.62) another −0.05; curve snipers x × 0.97 − 0.01, stops −0.06; x ≤ 0.05 → 0.

**v0.18.143 (19 Oct 20:40 UK).** New sniper books: `S6b` = sn6b (S6 when the smart wallet has 1,000+ GMGN followers, bought at our feed's price once the follower count is known; executor shadow book S6b, key `famous`), `S7b` = sn7b (S7 when the feed wallet has under 100 followers; paper), `S11` = sn11 (300+ outside buyers in the first 60 s, bought on the first trade at or after +60 s; paper). sn_followers = the signal wallet's GMGN followers at entry (S6b, S7b). **Suspect prices:** a sniper multiple above 15x is treated as a suspect print (the bonding curve tops out about 15x above the launch price) and capped at 15x in the website's results and the study's real-cost model.

**v0.18.146 (19 Oct 22:00 UK).** `x_flow4ff` (A2's exit) is now in abcd.csv. New paper books: `F6` = strategy p5c10 (10 s after A's trigger, opened only if the price is still ≥ 1.05x; early_json.a5 has waitS, lagA, lagNow) and `S3b` = sn3b (S3 bought at least 1 s after the launch). A5 and F6 stand down when A's own trigger was more than 8 s behind the chain or the tracker's feed is (the 20:39 UK A5 leg read a price 21 s stale). After a restart, A5/F6 and the executor's sniper books (sn1/3/4/6/6b/9/10) keep sending their exits to the executor (before, only A–D did), and a restored position's 5-min sale is not booked on the clock until a live trade has priced it. The website's real-cost model takes the fixed part of the fees per trade (0.001 SOL), so a 0.05 SOL stake pays about 2.6% on PumpSwap and 2% on the curve, 0.25 SOL about 1.0% / 0.4%.


## v0.18.148 / executor v0.4.2 (20 Oct 05:30 UK) — owner: remove what isn't working, add what has potential
- New strategy `grf` = **GR**: fast, thin graduations (≤ 272 buyers AND graduated ≤ 185 s after launch), sold at 3 min (`x_h3`). Shadow at 0.05. Back-test 18–20 Oct: 94 trades, +33% mean, +16% median at real prices (+8.5% without the top 3). The plain `grad` row keeps recording every graduation.
- The executor now handles an `h3` exit leg (fallback sell at 5 min).
- Shadow → paper: F, G, S3, S6b (migration m042). S7b → shadow (exec: true): paper +55% a trade on 33, median −4%, carried by two 10x coins.
- Page shows A, A5, D, F6, S3b, S4, S4b, S7b, S10, GR. Off the page but still recorded: B, C, E, E2, F, G, A2, S1, S2, S3, S5–S9, S6b, S11.

## v0.18.149 (20 Oct 05:40 UK) — sniper price fixes (owner: "why are we still getting price problems?")
- Snipers no longer fire on a coin that has already graduated. KFC and Super Saiyan: an 85 SOL dev buy took the whole curve inside the launch transaction; the paper entry was the curve's final price while the coin was trading 9x higher on the pool.
- Late-price rule on the page and in `abcd.csv`: `late_px_x` = the price 1 s after a sniper entry when it is above 1.5x. Score such trades as x / late_px_x. 14 trades on 20 Oct (S2, S3b, S5, S6, S7, S7b, S8), including S6/S7's Pump Pack 24x.

## v0.18.150 (20 Oct 07:20 UK) — curve cost model fitted to real shadow sells
- Page curve model is now x × 0.97 − 0.02, stops −0.01 more, floor sells −0.12 more (plus the 0.001 SOL a trade fixed fee). On the 384 real sniper shadow sells: real −11.8%, old model −7.8%, new −11.6%. Studies should use the same.
- A hold-5/hold-3 sell counts as a floor sell when peak_mult ≥ 1.5 and 0.62 < x ≤ 1.32 (or use ex_h5_why = floor in abcd.csv).

## v0.18.153 (20 Oct 07:30 UK) — GR skips instant graduations
- `grf` now needs the coin to be 10–185 s old at graduation (was ≤ 185 s). Coins that graduate inside their own launch transaction were bought on paper at the curve price; the real shadow buys paid +272% (Leonida) and +194% (MONUMENTAL EGO). The page's GR record leaves out the earlier instant ones and applies the 1-second price check.

## v0.18.154 / executor v0.4.3 (20 Oct 15:45 UK)
- The 24-h strip and box order rank by return per trade (net ÷ trades ÷ stake), not SOL at the box's stake: a 0.5-stake paper box was outranking a 0.05-stake shadow one.
- GR box shows two paper variants on the same trades: under 70 buyers at graduation (`gr70`), 85 s or older at graduation (`gr85`).
- Every S10 fingerprint decision is logged (`[sn10]` lines); `scripts/s10-check.cjs` (job `s10`) dumps each fingerprint launch's first 40 s from the DB.
- S7b back to paper (m043): 41 shadow legs −0.553 SOL, win 20%.

## v0.18.155 (20 Oct 16:20 UK) — S10 on the pool; DC, R and GR-lock; sniper table at real costs
- **S10 fires on the first PumpSwap swap** after the bundle is known (fingerprint launches graduate inside their first seconds, so the curve handler never saw a trade to fire on — the reason for 0 rows on 29 launches). Entry = that swap's pool price; `venue` = pumpswap. The curve path still fires if the coin is somehow still on the curve.
- `dcopy` is not a strategy: it is D's passed rows filtered on `early_json.ctx.cc.best24h ≥ 72000` (a same-name coin reached $72K+ in 24 h). Book **DC** on the page, judged from 20 Oct 16:00 UK.
- New strategy `rev` = book **R** (revival): coin ≥ 6 h old, pool price ≥ 2x its lowest 5-min close of the last 6 h, no 2x in the last 2 h, MC < $500K, one entry per coin per 2 h. Paper only; headline exit `x_tsl40`.
- New exit column `x_h3l` ("GR-lock"): 3-min sale, floor 1.1x once 1.25x has been seen (plain h3 arms at 1.5x, floor 1.3x). Shown as a GR variant from 16:00 UK.
- Project S table now at the real curve cost model (was a flat 10%).

## v0.18.156 (20 Oct 16:35 UK) — socials at launch; AS, DS; GR socials variant
- Every launch's metadata is fetched at creation (IPFS first, pump.fun API, DexScreener; 6 in flight), so `tokens.has_socials` (and so `has_socials` in abcd.csv / launches.csv) is known at entry for the sniper books and GR from now on. Before, it was only fetched for coins another book engaged with - the sniper books' socials figures before 16:35 UK are selection-biased.
- **AS** = A skipping coins KNOWN to have no socials (unknown kept). **DS** = D skipping no-socials coins and whale-led minutes (`maxShare > 0.11`). Both are filters on A's / D's passed rows; their page record runs from the price fix and is partly in sample - judge from 16:30 UK.
- GR box: `grsoc` variant (socials only, from 16:00 UK).

## v0.18.157 (20 Oct 17:30 UK) — book K
- New strategy `k` = **K** ("keeps going"): a coin that was $10–50K with 50+ buyers at its 5-min lifecycle checkpoint, bought when its MC reaches 2x that level before 15 min. Paper. Headline `x_h2t40` (half at 2x, trail 40%, −40% stop).

## v0.18.158 (20 Oct 17:45 UK) — AS / DS = the owner's standard filter set
- AS and DS are now A / D with: socials present (`tok_soc` ≠ 0), the creator has not bought-and-sold-out (`dev_hold_entry` = 0 with `dev_buy_sol` > 0 is the skip), and the biggest buyer in the trigger minute (`max_share × sol60`) between 3 and 5 SOL. The 11% whale-share rule is dropped (owner: a conviction buyer split over wallets defeats it). In sample: A +12.9% on 70, D +14.7% on 62, both halves positive on both; judge from 17:45 UK.

## v0.18.159 / executor v0.4.4 (20 Oct 17:50 UK) — 6-hour figures
- Every box shows a "last 6 hours" figure (paper boxes: trades opened in the last 6 h; shadow / live boxes: legs closed in the last 6 h), and the top strip shows each book's 6-h result next to its 24-h one. Executor status carries `h6Live` / `h6Shadow` per book.

## v0.18.160 (20 Oct 17:55 UK) — before / since the change
- Books whose rule changed show two records side by side: the same rule on the trades BEFORE the change (a back-test - the rule was chosen by looking at them) and on the trades SINCE (the real test). AS and DS: changed 17:45 UK (standard filters). DC: 16:00 UK. GR: 07:30 UK (instant graduations skipped), shown as a line in its shadow box. Books whose rule has not changed keep a single total.

## v0.18.161 (20 Oct 18:35 UK) — off-page books box; profit / loss colours
- New box under the 24-h strip: every book still recorded but not on the page (B, C, 80-SOL, E, S1–S3, S5–S9, S6b, S11, the background momentum/graduation books), last 12 h, closed trades, real costs, best first. Sniper books at the curve model with the 1-s late-price rule, at 5 min; B at 5 min; graduations at 3 min; the rest at the runner. Books with fewer than 3 trades in 12 h are left out.
- Strip and off-page box colour profit cyan, loss pink.

## v0.18.163 (20 Oct 19:05 UK) — book PG; save-bug fix
- **Bug fixed:** v0.18.155 added `x_h3l` to the hold-exit update, but two callers (momentum.js every tick and at close; copytrade.js at close) still passed the old 7 values, so the update threw silently. **From 16:25 to ~19:05 UK on 20 Oct, `x_h5`, `x_h5f12`, `x_h5f14`, `x_h3`, `x_h15`, `x_h5fast` were not saved for A / D / A5 / F6 rows, and the final values were not saved when a copy position (snipers, GR, K, R, graduations) closed before the rule fired.** Treat those columns on rows from that window as incomplete. `x_flow4` (A/D headline) and the executor's real trades were not affected. `x_h3l` (and the new `x_t2n30`) now have their own update.
- New strategy `pg` = **PG** (pre-graduation): curve coin under 150 s old at $32–40K MC, ≤ 272 buyers, creator < 80 SOL. Exits: `x_t2s40` (2x or −40%, headline), `x_t2n30` (2x or 30 min, no stop — new column), `x_h3`. Paper from 19:00 UK, curve costs, 1-s late-price rule.

## v0.18.164 (20 Oct 19:15 UK) — the operator's coins are skipped everywhere except S10
- Fingerprint = `tokens.bundle_wallets = 10`, `bundle_pct` 37–41, `bundle_sol` 22–28, `dev_buy_sol` < 0.2. 24 h: 31 launches, median MC $218K at 60 s → $150K at 5 min → $28K at 15 min → $4K at 1 h. A and D bought 20 / 19 of them (−11% a trade).
- The tracker no longer sends a fingerprint coin to the executor for any book but S10 (`pos.noExec`). The page leaves them out of every book's record (past and future) except S10's, and out of the off-page box. Paper rows are still recorded in the DB and in abcd.csv / others.csv - studies should drop them (join `launches.csv` or `tokens` on mint) when scoring any book other than S10.

## v0.18.168 (20 Oct 19:30 UK) — one combined 12-hour strip
- The top strip ranks every book together (on the page and off it) on the last 12 h, by return per trade; the separate off-page box is hidden. Books on the page show their 6-h result beside the 12-h one; off-page books are marked "off the page".
- "✓ worth a look" = 15+ trades in 12 h, still positive without its best trade (summaries now carry `mx`, the best single trade after costs), and positive over 24 h.

## v0.18.171 (20 Oct 20:00 UK) — book H (low holder concentration)
- **H** = A's passed rows (`p5e30`) where GMGN's top-10 holder share at entry (`gh_top10`, from `paper_trades.gmgn_entry.hold.top10`, snapshot ~1 s after the trigger) is under 0.23. Runner exit, paper. Found on 20 Oct across A, D and 80-SOL (+10.6% on 145, halves +21.0% / +0.4%); page record split before / after 20 Oct 20:00 UK. Rows without a snapshot are left out.

## v0.18.172 / executor v0.4.5 (21 Oct 01:30 UK) — AS2, AS3, AS in shadow, sniper count kept through restarts
- **AS2** (`as2`) = AS on coins whose launch bundle had 2+ wallets (`tokens.bundle_wallets`, the creator plus 1+ sniper). **AS3** (`as3`) = 5+ wallets. Paper, runner exit. Each box shows the back-test (all trades since the 18 Oct price fix, in sample) and the real test from 21 Oct 01:30 UK (`CHG_AS2`). Back-test on AS's 79 trades to 00:59 UK: 2+ wallets 62 at +19.4% vs 17 at −17.4%; 5+ 34 at +31.5% vs 45 at −3.7%; both halves and since 17:45 UK.
- **Executor book `asoc` (AS)**, shadow at 0.1 SOL (migration m044): takes A's passed trigger when the tracker's new `asStd` flag is true — the page's standard filters decided at the trigger (socials not known-missing; the creator has not bought and sold out, ledger balance 0 with a launch buy; biggest buyer in the trigger minute 3–5 SOL). Small known difference: the page re-reads socials later, so a coin whose socials are fetched as missing after the trigger can be in the shadow book but not in the paper AS. Data export: AS legs land in A's `live_*` columns with `live_book` = AS.
- **Sniper count:** `snipers_n` was kept only in memory and every restart blanked it (58% of AS rows). When the in-memory set is gone, it now falls back to the saved launch data: bundle wallets minus the creator if the creator bought (matches the live count on 1,295 of 1,308 rows); `snipers_held_pct` stays blank in that case.
- Dropped before building: the "MC ≠ price × 1 billion" fake-token skip. The suspect "Pump.fun" coin was real (graduated within a minute, crashed to $6K, GMGN agrees); the check would catch 1 coin in 2,478.

## v0.18.173 (21 Oct 08:45 UK) — S3 revised (replaces S3 and S3b on the page)
- Owner, 21 Oct 08:35–08:37 UK: "just keep it S3 … this is the revised version of S3"; culling of other boxes left for later.
- **S3 (page box `s3`)** = S3b's recorded trades (`sn3b`: copycat name, bought ≥ 1 s after the launch, sold at 5 min) filtered on the page: the copied coin reached **$1M+ in the last 24 h** (`early_json.ctx.cc.best24h`), and the **serial creator is skipped** (token creator buy 0.055–0.062 SOL with a 0.15–0.26% launch bundle; ~250 launches a day). Curve costs, lateFix. Back-test (19 Oct 21:54 – 21 Oct 08:45 UK): 72 trades +22.5% a trade, without best +11.6%, without best 3 −5.9%, 25% won, 5 big winners — in sample. Judged from 08:45 UK (`CHG_S3`).
- The old S3 (`sn3`) and S3b boxes and their off-page strip lines are gone from the page; the tracker still records `sn3` / `sn3b` rows (data kept; the export still labels them S3 / S3b).

## v0.18.174 / executor v0.4.6 (21 Oct 09:47 UK) — GR revised
- Owner go 21 Oct 09:40 UK. **GR (`grf`) now takes graduations with under 156 buyers** (GR.MAX_BUYERS 272 → 155; age 10–185 s unchanged).
- **10-second rule in GR's exit:** on the first tick once the price 10 s after the buy is known (`first_secs.t10`), if it is below the buy price the 3-min exit (`x_h3`) closes there, with `h3why` = "10s". So for `grf` rows from now, `x_h3` includes the 10-s rule; older rows don't. The executor sells its `grad` leg on that signal.
- Page GR box: record on the revised coins (rows with 156+ buyers left out), split at the change time (`CHG_GR`); the back-test uses the old exit on the < 156-buyer coins.
- Executor: a GR buy that fails because the new pool isn't initialised yet (AccountNotInitialized / 3012) is retried once after 1.5 s with a fresh pool read. **Guard:** if GR is LIVE and its last 20 live legs (since the last guard trip) are net negative, it switches itself back to SHADOW and sends one Telegram alarm.
- GR stays in SHADOW until the owner switches it to LIVE from the page.

## v0.18.175 / executor v0.4.7 (21 Oct 10:28 UK) — S4 revised; old S4 shadow off
- Owner, 21 Oct 10:25 UK: revise S4 on the statistics and see if it works. **S4 (page box `s4`)** = S4's recorded trades (`sn4`: clean launch — bundle under 5%, creator bought 0.2–3 SOL, 10+ outside buyers and 5+ SOL within 15 s) filtered on the page: the coin has socials (`tokens.has_socials` = 1), the creator has never launched before (`early_json.ctx.cr.n` = 0) and the name is original (`ctx.cc.n24h` = 0). Curve costs, lateFix, 5-min sale. Back-test (19 Oct 13:10 – 21 Oct 10:28 UK): 32 trades +25.7% a trade (without best +9.7%), 41% won, 5 big winners vs −16.4% for the 204 it drops — in sample; judged from 10:28 UK (`CHG_S4`), at about 60 trades.
- **Executor book `clean` (old S4) switched OFF** (migration m045): 217 real-quote legs −1.085 SOL. Its box leaves the page (hidden while off). The tracker still records `sn4` rows.
