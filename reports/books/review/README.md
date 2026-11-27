# Volume books (VOL100K / VOL300K / VOL500K) — every filled buy, with every recorded figure

File: `volume-books-buys.csv` in this folder. One row per buy. 95 rows, 90 coins, 25 Nov 2026 16:09 to 27 Nov 2026 18:15 (UK time = UTC). Source: the bot's published `entries.json` (branch `older-data`, state 27 Nov 18:33 UTC, bot commit b0f0b0d). PAPER trades only — no real money, no real fills.

## What these buys are
The bot watches the trading pool of every migrated pump.fun coin. A book buys when $100K / $300K / $500K has been traded on the coin in the last 5 minutes. Other conditions: market cap $40K–$2M at the signal; any age after migration up to 90 days; price direction NOT checked; one buy per coin per age group; no re-buys. A buy that triggered two or three of the books at once is ONE row (column `books`).

## How a buy and its result are measured
- Stake 0.2 SOL, bought 1 second after the signal at the pool's own price (constant-product pool, pool fee included, 0.0005 SOL network cost per transaction side). Costs are ALREADY inside every result — do not deduct them again.
- Every buy is tracked under 24 exit rules at once. Each result is a FRACTION OF COST after all costs (-0.0578 = lost 5.78%; 1.4145 = made 141.45%). A BLANK = that row was not recorded for this buy, or is still open. Never treat a blank as zero.
  - `t20 … t70` = pure trailing stop: sold when the holding is worth 20% … 70% less than its highest value since the buy.
  - `h20 … h70` = half sold when the holding is worth 2x its cost, the rest on the same trailing stop.
  - `b20 … b70` = stop measured from the BUY price. Added late: about half the buys have no b rows; t50 / h50 / t65 / t70 are also missing on early buys.
  - Every row is also closed at 24 hours. A sale is priced 0.7 seconds after its trigger at the pool's price then, so on a fast fall the sale lands below the stop level.
- `max_24h` = highest value of the holding within 24 hours of the buy as a multiple of cost, INCLUDING after the rows had sold. A ceiling, not a result.
- The price path between the buy and the sales is NOT available. What can be inferred: for a trailing row the highest value before it sold was at least (1 + result) / (1 − stop); if an `h` row differs from the `t` row with the same stop, the holding was worth 2x before that stop sold; identical results across several rows of one buy mean one single fall took all those stops at once (id 76: about 2x, then −56% in one move; id 833: 2.4x, then to zero in one move).

## Columns
- `id`, `coin`, `mint`, `time_uk`, `unix` (seconds), `books`, `age_group` (A0 = under 8 hours since migration, A1 8–16 h, A2 16–24 h, A3 24–36 h, A4 over 36 h), `cap` = market cap in $ at the signal.
- Own feed (exact, from the pool's trades): `v5_own` = $ traded in the 5 minutes; `buyers_5m`, `buyers_1m` = different wallets that bought in the last 5 minutes / 1 minute; `top_buyer_share` = biggest buyer's share of the 5-minute buying.
- Jupiter, read at the buy (`j_`): `j_cap`, `j_liq` (liquidity $), `j_vol_1h`, `j_vol_cap` (1-hour volume ÷ cap), `j_netvol_1h` (buy volume minus sell volume, $), `j_tx_1h`, `j_buys_1h`, `j_sells_1h`, `j_traders_1h`, `j_netbuyers_1h`, `j_organic_vol_1h`, `j_holders`, `j_vol_5m`, `j_holders_chg_5m_pct` (% change in holders over 5 minutes), `j_traders_5m`.
- GMGN, read at the buy (`g_`, fractions 0–1): `g_top10` (top 10 holders' share), `g_bundlers`, `g_insiders`, `g_snipers`, `g_fees_sol` (total fees paid on the coin so far, SOL), `g_twitter`, `g_ath_cap` (all-time-high market cap, $), `g_holders`, `g_phishing`, `g_bot`, `g_fresh` (share held by phishing / bot / fresh wallets), `g_liq`, `g_late` (the reading arrived late). A blank = not read = unknown.
- `audit_ok` = contract checks passed. `claude_dead_group` = yes when cap is under 15% of `g_ath_cap` (a label added afterwards, see below).

## Check figures (to confirm the file was read correctly)
- 95 rows, 90 different mints. `t20` filled on all 95: mean −19.52%, sum −18.5417.
- `claude_dead_group` = yes on 21 rows: `t20` mean −72.08%, no winner.
- "Clean set" = cap ÷ g_ath_cap ≥ 0.15 AND buyers_5m ≥ 200: 72 rows, `t20` mean −4.63% (sum −3.3333), 19 rows above zero; `t25` −6.41%; `t40` −18.91%; `h20` −3.82%.
- Clean set, cap under $300,000: 42 rows, `t20` mean −9.38%. Cap $300,000 or more: 30 rows, `t20` mean +2.01%.

## What does not exist
The minute-by-minute price after a buy; trades before migration; wallet-level or creator-funding history; real fills. Sample is about two days.
