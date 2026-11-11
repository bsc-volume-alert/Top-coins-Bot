# Data pack for finding a profitable pump.fun paper strategy (11 Nov 2026)

All times are unix seconds UTC. The stake is 0.2 SOL per trade. These are paper results; no real money is involved.

## Files
**1. coins_5min.csv** — one row per coin (2,282 coins).
- **Periods:**
  - Period **A** = launches 6 Nov 07:40 → 8 Nov 15:00 UTC: every coin with an on-time 5-minute reading, any market cap (2,019 coins).
  - Period **B** = launches 9 Nov 21:48 → 10 Nov 20:57 UTC: only coins whose 5-minute market cap was $15K–$100K and that have stored trades (263 coins).
- **Decision-time columns** (known at the 5-minute decision; only trades received by then were used):
  - `mc5_usd`: market cap at 5 minutes.
  - `venue_at_5m`: `curve` means still on the pump.fun bonding curve; `pool` means trading on the PumpSwap pool.
  - `instant_graduation`: 1 if the first pool trade came within 5 s of creation, meaning the coin was launched straight into a pool, usually heavily bundled.
  - `graduated_normally_before_5m`: 1 if the coin moved to the pool later than that, but before 5 minutes.
  - `price_vs_peak_5m`: last price ÷ highest price so far.
  - `buys_last2m`, `buys_prev3m_per2m`: buy-trade counts per 2 minutes.
  - `net_sol_last2m`, `net_sol_last5m`: buys − sells, in SOL.
- **OUTCOME_ columns** are NOT known at the decision; use them only to label results:
  - `OUTCOME_max_x_2h`: highest price within 2 hours after the decision ÷ the 5-minute price.
  - `OUTCOME_min_x_2h`: the same, for the lowest price.
- **SIM_ columns**: a simulated trade bought 1 s after the 5-minute decision, with realistic costs.
  - Curve and pool maths come from real reserves; fees are curve 1.25%, pool 0.55%, plus 0.0015 SOL; there is a 2-hour maximum hold.
  - `_ret` is the return on the stake: −1 = lost everything, +1 = doubled.
  - Exits:

    | Code | Exit |
    |---|---|
    | T15 / T25 / T40 | Trailing stop 15 / 25 / 40% below the high |
    | TP2xT25 | Sell half at 2×, then a 25% trail |
    | X15m / X60m | Sell after 15 / 60 minutes |

  - `status`: FILLED, UNRESOLVED (part of the sale fell in a data gap; unsold remainder counted as 0) or UNAVAILABLE (no trade within 30 s of the buy, so the price can't be proven). Exclude UNAVAILABLE from averages, but report how many there are.

**2. bars_1min.csv** — 1-minute bars from creation to +2 hours for the same coins.
- Columns: open/high/low/close market cap in USD, buy and sell SOL, trade count, and the venue of the last trade.
- Use these to design entries **later** than 5 minutes, or new exits. A rule may only use bars that have **closed** before its decision. Remember the real buy happens about 1 s after the decision, at a slightly worse price; assume at least 2% extra cost if you simulate fills from bars.

**3. positions_100K_books.csv** — the real paper trades of the three "100K" books in period B. Each book bought at a 5-minute market cap of $30–50K or $30–40K, with a 25% or 20% trail.
- `r_0.2` = the return on the trade.
- They lost: −14.9%, −2.3% and −2.4% per trade.
- Two rows marked "open" are actually failed fills (no tokens bought).

## What has already been tried (don't repeat it as new)
- **Buying at 5 minutes by market-cap band:** $30–50K lost in period B; $50–100K is unstable.
- **Instant-graduation coins:** the typical trade loses 43–57%, and about half are crashes. They are coordinated dumps by hundreds of wallets within about a second, which a trailing stop can't escape.
- **Coins that graduated normally before 5 minutes:** negative in both periods.
- **Buying on the first cross of $50K / $100K / $200K, or a 1.5× bounce at 15 or 30 minutes:** not profitable in period B.
- **Exits:** time exits are worst; a 40% trail is worse than 25%; a 15% trail cuts the big winners.
- **Best lead so far:** "still on the curve at 5 minutes, $15–100K, 25% trail". It made +14% in A and +23% in B, but 3 coins made 71% of the profit; without them it's about +5%. Treat it as weak evidence. A separate book ("buy on the run while still on the curve, 3× within 15 minutes, 30% trail") is already being tested live on paper.

## The task
Find **one** rule that might be profitable after costs, using only information available at the decision.
1. Develop it on period **A** only, then test it unchanged on period **B**. Report both periods separately.
2. For each period, report:
   - number of trades, and number unavailable;
   - mean and median return per trade;
   - win rate;
   - share of trades losing more than 50%;
   - total SOL;
   - the mean **with the best 1 and best 3 coins removed**.
3. List **every** rule and threshold you tried, including the failures. Trying many rules and keeping the best one makes results look better than they are, so say how many you tried.
4. Prefer simple rules with few thresholds. Reject anything whose profit disappears without its top 3 coins.
5. If nothing qualifies, say so plainly. That is a useful answer.
6. Give the final rule in exact, codeable terms: entry condition, time, size, and exit.
