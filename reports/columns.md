One row per trigger since the price fix (18 Oct 20:25 UK), for books A, C, D (the P5 levels), 80 (the old 80-SOL level) and E (the $100K/5-min core trigger). Rows are kept whether the website's filters took the coin or skipped it (`pass` = 1 / 0). All money is USD unless the name says SOL; all multiples are price ÷ entry price (1.2 = up 20%, 0.6 = down 40%). Times are seconds after the trigger unless the name says otherwise. Empty = not known / not applicable.

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
| gi_*, gs_* | GMGN's token-info and security snapshot at entry, one column per numeric field (gi_ = info, gs_ = security) |

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
