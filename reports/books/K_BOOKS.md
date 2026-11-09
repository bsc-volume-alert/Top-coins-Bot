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

## Epoch 2 — clock 5-minute checkpoint (owner 9 Nov 22:44 UK, spec Codex)
- **Versions:** tracker 0.19.10 (epoch C5-1, 22:53 UK), then 0.19.11 (epoch **C5-2**, about 23:02 UK). In C5-2 the feed-health check covers the whole interval from the last price observation to the cutoff. Launcher 0.9.59 / 0.9.60. fd_rules K_EPOCH2 = 1794264802.
- **What changed:**
  - The tracker writes token_cp_clock at creation + 300 s (+2 s grace), only from trades with ts ≤ cutoff that had been received by then.
  - **Recorded:** the cutoff, processing time, last-price time and age, venue, feed_ok, ingestion lag, and status (ok | uncertain:* | no-price | late-processed).
  - The trade-triggered token_life cp=300 row is kept beside it.
  - The K books read both. There is one decision per coin (the first usable reading). A clock reading that is not 'ok' is recorded and never entered.
- **Unchanged:** the entry and exit predicates (K-1) and the ≤ 315 s rule.
- **The population is wider than in the replay:**
  - Quiet coins are now included. The replay's returns were for trade-triggered readings and do not carry over automatically.
  - Every K entry records src (clock | trade) and, for clock, the price age. Report coins that would have qualified under the old method separately from those admitted only by the clock.
- **First measurements, 23:05 UK:**
  - All clock readings were on time: available about 302 s after creation, read at about 304 s.
  - About 25% were 'no-price' (to investigate).
  - Price age at the cutoff: median 215 s (8–300 s). Many coins are quiet at 5 minutes.
- **First records (verified in fd_positions.csv), 0.2 SOL:**

| Coin | Reading | Entry (cap, fill vs reading) | 100K1 (K30-50T25) | 100K2 (K30-40T25) | 100K3 (K30-40T20) |
|---|---|---|---|---|---|
| 8xcAhQmS | trade-triggered, 22:31 UK | $31.5K at 5 min, fill 3.5% above the reading | +83.5% (trail, exit ×1.84) | +83.5% (same) | +28.5% (tighter trail exited first, ×1.29) |
| HYxUWHLP | trade-triggered, 22:57 UK | $37.8K, fill +7.2% | +20.4% | +20.4% | +20.4% |
| 5LCZtSCq | clock, 23:04 UK | $40.1K, last price 244 s old, fill +0.9% | open | not taken (above $40K) | not taken |

- **Backend kept running while the page was blank** (≈ 21:50–22:36): the 22:31 entry and the data pushes continued. That was a display failure only, not a collection outage.
