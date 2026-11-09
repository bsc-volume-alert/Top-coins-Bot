# K books — PROVISIONAL $100K-study paper books (frozen rules)

- **Activated:** 9 Nov 2026 21:48:43 UK (fd_rules K_ACTIVATION = 1794260923), launcher 0.9.56, rule version K-1.
  - 0.9.57 and 0.9.58 added logging and exports only. The rules are unchanged.
- **Owner's go:** 9 Nov 21:45 UK (spec: Codex 18:14 / 21:45).
- **Live trading:** OFF. Existing books are unchanged.
- **Basis:** reports/analysis/100k/replay_9nov, v2.1. Exploratory, about one day of data, NOT confirmed.
- **Do not adjust or reset these books in response to early results.**

| Book | Market cap at the 5-min reading | Exit |
|---|---|---|
| K30-50T25 | $30,000 ≤ mc < $50,000 | 25% trail |
| K30-40T25 | $30,000 ≤ mc < $40,000 | 25% trail |
| K30-40T20 | $30,000 ≤ mc < $40,000 | 20% trail |

## Rules
- **Population:** launches the tracker retains, meaning 15 SOL gross buys or bundle tier-1. These are the only launches with token_life checkpoints, the same population as the replay cohort.
- **Decision:**
  - **The reading:** the tracker's 5-minute checkpoint (token_life, cp = 300), polled by the launcher every 2 s.
  - **When it is available:** obs_ts, else ts. For cp = 300, ts is the block time of the coin's first trade after the 300-s mark.
  - **Market cap used:** token_life.mc, in USD.
- **Timeliness:**
  - A coin is entered only if its reading was available by creation + 315 s AND the launcher read it by creation + 315 s.
  - Otherwise it is recorded as LATE (two reasons are recorded separately) and not entered.
  - Every decision is in kpaper_decisions and exported as launcher/k_decisions.csv (48 h).
- **Entry:**
  - **One shared simulated fill per coin:** every K book that takes the coin gets identical tokens (one chainEntry call).
  - **Size:** 0.2 SOL, plus an independent 0.02 SOL position.
  - **Landing:** the buy lands 1 s after the decision (BUY_LAND_MS), on the reserves re-read at landing. If they can't be read, there is no fill and a data-failure row is recorded.
  - **Pricing:** curve maths on the bonding curve. In a pool: vault balances + virtual_quote_reserves, with the pool's own LP, protocol and creator fee rates (chainfill.mjs, measurement fill-2/fill-3). Fixed network fee 0.0015 SOL.
- **Exit:**
  - **Trail:** 25% or 20% below the running high of the position's own sale proceeds (high starts at 1 = stake in), on any venue.
  - **Landing:** the sell lands 0.7 s after the trigger.
  - **Maximum hold:** 2 hours. At 2 h it sells, or is recorded unresolved if no state can be read.
  - **Migration:** the token count is kept and the subscription moves to the pool.
  - **The 0.02 SOL position** has its OWN trail, on its own proceeds and its own high (independent exit, i02_* columns).
- **Differences from the replay:** no exclusion of coins already past $100K before 5 minutes; no non-SOL-pool exclusion.

## Reporting
- **Website:** /fd2, which shows the three books with their descriptions.
- **Exports, launcher-data branch:**
  - **Positions:** fd_positions.csv. These are chain_fill rows with strat = the comma-joined list of the K books that took the coin.
  - **Decisions:** k_decisions.csv.
  - **Status:** status.json, key k.
- **Downside scenario:** an unresolved remainder is valued at zero, alongside the modelled value (chain_fill s_exit_src / s_fail_kind).

## First measurements (9 Nov 22:12 UK, 454 decisions)
- **Late, 75%:**
  - 222 because the reading was available after 315 s
  - 120 because the launcher read it after 315 s
- **Of the rest:** 96 out of band, 16 with no market cap, none in band yet.
- **Read lag after availability:** median 4 s, p90 61 s.
- **Availability after creation:** median 315 s, p90 329 s.
- **Expect few entries:** the replay counted 35% late on availability alone.
