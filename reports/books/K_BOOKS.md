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

## Impact report — 10 Nov 01:37 UK (Codex 01:46 request; data: launcher-data at 01:37)
- **What the K books depend on:** their decisions read the tracker's own database (token_life / token_cp_clock) and make NO Helius checks. The fdCheck timeouts and errors belong to the older 60/90/120-s books.
  - The K books touch RPC only at the fill and the exit (chainfill reserve reads).
  - Entry failures there would show as chain_fill data-failure rows: none among the 13 K mints.
- **Older books, since the 0.9.61 restart (~00:21 UK):**
  - 693 recorded checks (60 s: 303, 90 s: 298, 120 s: 92), of which 3 failed with "data unavailable: deadline". All 3 coins were below the base bar at their earlier checks, so they could not have entered.
  - 5 checks timed out (checkTimeouts). A timed-out check writes NO row (0.9.47), so its due/never-attempted impact cannot be measured from exports. This is a gap.
  - fd.errors (13) mixes funding-trace errors, scan errors and check failures. incomplete (6) is a subset of errors. Timeouts are counted separately.
- **K decisions so far (5,013):**
  - **Clock readings (epoch C5-1/2):**
    - out of band 2,075
    - no-price 493
    - feed gap 303
    - late-processed 179
    - read late 132
    - ingestion lag 10
    - entered 5
  - **Trade-triggered readings:** about half late in epoch 1. 8 entered across the two trade-triggered epochs.
- **Positions (0.2 SOL, after costs), 13 unique mints:**

| Book | Closed | Open | Mean | Median | Total | Without the best | 0.02 SOL independent |
|---|---|---|---|---|---|---|---|
| 100K1 | 10 | 3 | −13.4% | −5.1% | −0.267 SOL | −24.1% | −19.9% |
| 100K2 | 4 | 1 | −3.0% | | −0.024 SOL | | |
| 100K3 | 4 | 1 | −16.6% | | −0.133 SOL | | |

- **Execution evidence:** fill price vs the 5-min reading is median about +1%, but 3FRaTecs filled **+80%** above its reading. The trade-triggered reading was stale relative to the market at fill: an execution-quality case to audit. CRWuYpES lost 91% through a 25% trail, a dump between trades.
- **Small numbers:** no conclusion. Rules unchanged.

## Audit of the two abnormal trades — 10 Nov 02:25 UK (branch audit-20261110t0210, read-only dump)

### 3FRaTecs — 100K1 fill 80% above the 5-minute reading
**Timeline (UK = UTC):** created 00:18:03; trade-triggered 5-min reading at 00:23:03 (age 300 s, price age 0); launcher read 00:23:04.
- **Decision:** 00:23:04.577 at $41,665. Reserves read at the check: 00:23:04.597. Fill landed at 00:23:05.612, on the curve.
- **The reading:** $41.7K is the price of the first trade in second 300 (4.82e-7 SOL/token).
- **What moved before the fill:** in the same and the next second, trades pushed the price to 6.92e-7, then 8.24e-7 (+71%). Our 0.2 SOL buy then landed on that state.
- **Fill price:** the chain-read fill (check state vSol 805.6 SOL / vTok 978.2M) is the genuine executable price 1 s later. **No pricing error.**
- **The clock reading for the same coin said $59.8K** and was flagged 'uncertain: feed gap', so it was not used.

**Why:**
- **Non-standard curve** (tokens.factory = 1). Virtual SOL swings 250–1,032 SOL on sub-SOL trades. A 0.7-SOL buy moved the price +19%, and the price moved ±20–40% per second in the 10 s before the decision.
- **The 5-minute "market cap" is not a stable quantity for this coin.** The exit fired 0.6 s after entry (trail from a 1.20 high), giving −7.6%.

**Warnings available before entry:** per-trade price impact and 10-s price range from the trades, and the non-standard curve flag. None of these is used by the K-1 rules (unchanged).

### CRWuYpES — 100K1 loss of 91% through a 25% trail
**Launch:** created 00:26:29 with an 84-SOL dev buy, migrating at once ("instant graduation"). Bundle 79% held in 2 wallets.

**Our position:** K entry at 00:31:29 (age 300 s), on the pool: quote 82.3 SOL, base 177.0M tokens.

**The dump:**
- **The last watch value before the trigger** was close to the 1.03 high.
- **Trigger:** at 00:32:20.3 (age 751 s), the chain read showed sale value ×0.32. The pool had gone from 82.3 SOL / 177M tokens to 14.7 SOL / 569M tokens, so about 392M tokens were sold into it.
- **Sell:** landed at 00:32:21, ×0.0986 (−91% after costs).
- **The same dump hit BL, E60 and E90 positions in this coin** (exit ×0.12).

**Assessment:**
- **The loss is genuine executable market conditions.** The exit valuation is a direct chain read of the pool vaults, not a carried-forward state.
- **The tracker recorded NO trades of this coin after age 352 s (00:32:21)**, the moment the tracker restarted for 0.19.12. In-flight coins lose their lifecycle and trade capture on a tracker restart. That is a capture gap caused by my restart; it did not affect the launcher's exit, which reads the chain directly.

**Warnings available before entry:** an instant-graduation launch with 79% held by 2 bundle wallets and an 84-SOL dev buy, so a single holder could drain the pool. The K-1 rules do not use concentration (unchanged).

### Consequences for the measurement
- **Tracker restarts blank in-flight coins.** Restarts must be minimised and logged as capture gaps for the coins alive at that moment (to do in the reliability work).
- **Dedup takes the first reading of any kind.** An unusable clock reading recorded first blocks a later trade-triggered reading of the same coin. That is valid as "one decision per coin", but it limits the old-versus-new method comparison. This will be reported.

## Snapshot 10 Nov 2026 10:11 UK (36 unique coins since activation 9 Nov 21:48)
| Book | Closed | Open | Wins | Mean r | Median r | Total (0.2 SOL stake) |
|---|---|---|---|---|---|---|
| 100K1 K30-50T25 | 34 | 2 | 5 | −17.0% | −2.7% | −1.158 SOL |
| 100K2 K30-40T25 | 14 | 1 | 3 | −1.3% | −2.7% | −0.038 SOL |
| 100K3 K30-40T20 | 14 | 1 | 3 | −6.7% | −2.7% | −0.187 SOL |
- 30-coin mark passed for 100K1; 100K2/3 (the $30–40K band) only 15 coins each. No conclusions drawn yet; coin-by-coin analysis is next.
- Recording gaps during the DB repair: 07:53–07:57 and 08:31–08:33 UK (see LAUNCHER.md).

## Snapshot 10 Nov 2026 20:35 UK (82 unique coins)
| Book | Closed | Open | Wins | Mean r | Median r | Total | Crashes (r < −50%) | Crash total | Rest total |
|---|---|---|---|---|---|---|---|---|---|
| 100K1 K30-50T25 | 76 | 6 | 18 | −14.0% | −2.7% | −2.130 SOL | 16 | −2.622 | +0.492 |
| 100K2 K30-40T25 | 48 | 4 | 16 | −0.3% | −2.7% | −0.033 SOL | 4 | −0.733 | +0.700 |
| 100K3 K30-40T20 | 48 | 4 | 15 | −2.2% | −2.7% | −0.213 SOL | 4 | −0.732 | +0.519 |
- Fact (not yet a conclusion): the $40–50K slice that only 100K1 buys = 28 closed coins with 12 crashes (43%); the $30–40K slice = 48 coins with 4 crashes (8%). To check coin by coin: what the crashes had in common.

## Evidence package for Codex audit — 10 Nov 2026 21:02 UTC read (branch k100-audit-20261110t2102 @ c093afef; export @ da33a7e2)
- Export: reports/tools/k100-audit-export.mjs (read-only). Reconciliations: recon.py + RECON.md on the package branch.
- 83 coins entered (52 in all three books, 31 in 100K1 only), 187 positions; shared entry identical for 83/83. 30,338 decisions (19,521 out of band; 7,502 clock readings unusable; 2,831 late; 401 no market cap).
- Closed net (0.2 SOL): 100K1 −2.386 · 100K2 −0.235 · 100K3 −0.247 SOL; open 3/1/1.
- 100K1's $40–50K entries: 29 closed, 2 wins, 12 severe (< −50%), net −2.151 SOL; its $30–40K entries: 51 closed, 16 wins, 5 severe, net −0.235 SOL. (Facts, not yet a conclusion.)
- 20% vs 25% trail on the same 52 coins: 20% better 16, 25% better 11, equal 24; mean difference −0.1 pts.
- MISSING EVIDENCE: 20 of 83 entered coins have no stored trade history (19 decided on the clock checkpoint — not tracker-retained launches). Backfilling them from chain would be new collection → needs the owner's go.

## Codex independent check of the 21:02 package — 11 Nov 2026 10:01 UK (verified by me 10:10)
- Totals reproduce (100K1 −2.386 / 100K2 −0.235 / 100K3 −0.247 SOL, closed 80/51/51).
- CORRECTION to my RECON.md: 2 of 100K1's "open" positions are NO-FILLS (fetch failed, no tokens, no stake: JCaj6rnW, B22nnGeh). 100K1 funnel = 83 attempts → 81 fills → 80 closed, 1 open (FNxnauVJ, curve, open in all three books).
- 100K1 by band × venue at entry (closed): $40–50K pool 20, mean −52.3%, all 12 severe; $40–50K curve 9, −3.3%, 0 severe; $30–40K pool 33, −1.8%, 5 severe; $30–40K curve 18, −3.3%, 0 severe.
- Coverage: Codex counts 5,548 of 35,801 decision-age launches with no K decision record — to reconcile (missing-checkpoint reconciliation).
- Clock entries $30–40K: median recorded price age 99 s — quiet-price verification needed.
- 20% vs 25% trail: 20% 0.12 pts worse on 51 shared closed trades — effectively tied.
- Agreed next: books stay frozen; investigate $40–50K pool losses, missing-checkpoint reconciliation, quiet-price verification; any band exclusion only as a separately versioned forward test (owner's go). No profitable strategy demonstrated yet.

## Investigations 1–3 on the frozen package — 11 Nov 2026 (branch k100-investigations-20261111 @ 765a9445; scripts reproduce byte-identical)
1. $40–50K pool losses (100K1): 20 entries, 12 severe, mean −52.3%. Severe ones are INSTANT-GRADUATION coins (created straight into a pool, create→pool 0 s), heavily bundled (median bundle 79%), already at 0.42× their pre-entry peak with net selling −54 SOL in the 5 min before entry. The crashes are coordinated dumps: hundreds–thousands of distinct wallets selling within ~1 s (up to 316 sells in one slot), pool SOL halving inside the 0.8 s between trail trigger and sell → the trail cannot protect; reserves recorded at trigger and exit confirm a genuine market loss (not simulation error); 3 crashes have reserve evidence but no recorded trades (capture gap), HYoM6KGc's sell landed 66 s after its trigger (execution uncertainty), Ffs4KXjK lost pool SOL beyond swaps (likely liquidity removal).
   In-sample candidate warnings (hypotheses only): instant graduation (≤ 5 s) hits 23 entries, avoids 14 severe, rejects 5 winners incl. the two biggest (EMfnF5D4 +137%, 8hF6kWfr +113%); kept mean −5.6% vs −14.9%. "$40–50K AND pool" avoids 12 severe, rejects 2 winners; kept −2.4%. Nothing makes the book profitable.
2. 5,548 missing decisions: no trade processed before 420 s 4,355 (3,606 of them are non-"pump"-suffix launches; 557 had a feed gap in their first 420 s; the rest are unverifiable because non-retained trades are not stored); tracker restarts 858 (470 created before the new process started — not tracked by design; 388 while not receiving); before the clock checkpoint existed 234; tracker event loop blocked through the whole 300–420 s window 84; unexplained 16; launcher missed a written row 1.
   RELIABILITY DEFECT FOUND: the tracker's event loop is blocked for 1.5–6 min 20–50 times a day since late October (83 blocks ≥ 10 s on 9–10 Nov = 3.4 h); it also causes feed idle-reconnects and unusable clock readings. Tracker 0.19.13 adds slow-SQL timing (logging only) to find the cause.
3. Clock-price freshness: all 23 clock entries with price age > 10 s (up to 272 s) were confirmed by live reserves within ~1 s (fill ÷ reading inside our own buy's impact band) → genuinely quiet, not stale. 3 fresh-price pool entries moved > 5% before the fill (market movement, not staleness). Unverifiable: 53 non-entered clock decisions near the band with prices older than 60 s (no independent price stored).
- Codex note accepted: 100K2 already tests "exclude $40–50K" against 100K1; a new book only for a genuinely different policy. Judge by after-cost expected return, severe-loss rate, runner capture, uncertainty.
- Monitoring backstop: hourly cloud scheduled task "Bot health watch (independent backstop)" (push notifications), independent of the chat workspace.

## Corrections v2 to investigations 1–3 — 11 Nov 2026 11:50 UK (Codex review; branch k100-investigations-20261111 @ 80cc3c97, see CORRECTIONS.md)
- Trades are now deduplicated (same swap stored by two capture paths) and pre-entry features use only swaps received by the decision. Dump-window sells halve for several coins (4srewArZ 219.3 → 109.7 SOL etc.); book P&L unchanged.
- WITHDRAWN: "Ffs4KXjK likely liquidity removal" — after deduplication its unexplained residual is −1.2 SOL. No withdrawal is claimed for any coin.
- Quiet-price wording: "consistent with a quiet market within the tested tolerance" (pool −5.1% … +4.4%), not "verified unchanged".
- Stalls: 83 blocks ≥ 10 s on 9–10 Nov, 46 of them ≥ 2 min (not all 1.5–6 min). Delayed-vs-lost trades during blocks still to be measured.
- HYoM6KGc's exit (sell 66 s after trigger) is an execution delay, kept separate from the sub-second collapses.
- Still no new trading filter from this sample; books frozen.
