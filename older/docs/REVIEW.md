# Review package — older-coin paper project (`older-3`, Solana-wide)
_20 Nov 2026 (UK). Review-only branch `older-coins`. Paper only: nothing here signs or sends a transaction. Nothing deployed, purchased or funded._

**Read this first:** everything below marked UNRESOLVED needs the bounded live run (`bash older/scripts/validate.sh 10`), which has not been run yet. No number in this document comes from live market data except the GMGN plan check and the provider price lists.

## 1. What changed from the pump.fun-only build (`older-2`)
| Area | Change |
|---|---|
| Scope | Eligibility is launchpad- and exchange-neutral. Canonical PumpSwap is now one adapter, not a universal condition. |
| Architecture | Three separate jobs: **discovery** (`inventory.mjs`, `polled.mjs#discover`), **signal observation** (`feed.mjs` live events / `polled.mjs#sweep` sampled prices), **execution pricing** (`fills.mjs`: reconstructed pool state **or** routed quote). The signal engine no longer contains PumpSwap assumptions. |
| New: Jupiter adapter | `jupiter.mjs` (prices ≤ 50 a request, token metadata/risk, routed quotes — quote-only, no `taker`, no `/execute`), `polled.mjs` (adaptive hot/cold sampling, quote scheduling, omitted-token handling). Off unless `OLDER_SOLANA_WIDE=1`. |
| New: risk evidence | `risk.mjs`: Token-2022 extensions read from the chain; only known transfer restrictions stop entries; missing ≠ clean. |
| New: capacity planner | `capacity.mjs`: per-job request and credit budget → lowest sufficient tier. |
| Data model | Per token: origin + evidence, venues, token program, discovery source, price source, monitoring mode, cadence, risk, valuation definition, creation source. Per entry: population, mode, execution model, route, quote request/response times. |
| Dashboard | Population filter (PumpSwap live / Solana-wide sampled / all), method shown on every entry, explicit note on what sampling can miss. |
| Corrections (older-3) | Scale-out formula documented and tested (drawdown identical before/after the half-sale; one cost per leg). USD at each observation's own rate (tested). SECOND-WAVE survives an age boundary, classified by age at entry. HH-BREAK uses `[B−15 min, B)` vs sixteen buckets over `[B−255 min, B−15 min)`. Unusual fee rates are used as observed, counted and flagged — not clamped. |
| Validation tooling | `scripts/validate.sh` (bounded live run + publish results), `validate-tx.mjs` (now also reconciles several swaps on one pool in one transaction), `probe-gmgn.mjs` (paced; 7/30/60/90-day history; creation-time meaning), `probe-jupiter.mjs`. The feed measures bytes received, which is what Helius bills. |

## 2. Tests
`cd older && npm test` → **53 tests, 53 pass, 0 fail** (Node 22). Targeted cases: `test/amend.test.mjs` (the five corrections), `test/polled.test.mjs` (Solana-wide adapter with a simulated provider: routed-quote fills never back-dated, one quote per distinct inventory, no-route handling, omitted tokens, live/polled de-duplication, risk blocking, capacity, client behaviour).

## 3. Coverage by venue
| Venue / population | Discovery | History | Live observation | Execution pricing |
|---|---|---|---|---|
| pump.fun coins on canonical PumpSwap (SOL) | **Complete**: one program-accounts query (daily) + pool-creation events | Own minute bars from start; GMGN 1-min bars before that (free plan, ~45 min per 1,000 coins) | **Event-level** (Helius log subscription) | Reconstructed pool state (effective reserves) — UNVALIDATED until transaction evidence |
| Raydium (AMM v4, CPMM, CLMM, LaunchLab) | Forward: Jupiter `/recent` (every new first pool) + category lists. **Start-up inventory of existing 8 h–90 d coins: NOT complete** | Accrues from our own samples (4 h 15 min before LOW4H is evaluable); no back-fill source selected yet | **Sampled** (default: hot 10 s, cold 60 s) | Jupiter routed quote, exact size |
| Meteora (DLMM, DAMM, DBC launchpads) | as Raydium | as Raydium | **Sampled** | Jupiter routed quote |
| Orca Whirlpool | as Raydium | as Raydium | **Sampled** | Jupiter routed quote |
| Non-canonical PumpSwap pools, pools quoted in other tokens | as Raydium | as Raydium | **Sampled** (when a SOL route exists) | Jupiter routed quote |
| Tokens Jupiter's price API omits | counted as omitted | — | none | none (counted) |

Families under the sampled method: LOW4H, AGE-DOUBLE, CONT, CONT-STALL, SLOW-BUILD (candles built from samples, labelled), LOW4H-LIQ25K (liquidity from the provider; impact evidence missing → recorded rejections until a quote-based impact is added), FAST and SECOND-WAVE (evaluated on the samples that exist; can miss moves between samples). **HH-BREAK is not evaluated** there: no volume source.

## 4. Two costed configurations
Provider prices as published 20 Nov 2026. Usage figures are budgets from `capacity.mjs`, not measurements.

### A. Broad polling (built, ready to validate)
PumpSwap live on Helius + everything else sampled through Jupiter.
| Item | Monthly | Basis |
|---|---|---|
| Jupiter **Developer** | **$25** | 10 req/s, 25 M credits. Budget example: 500 hot tokens @10 s (1.0 req/s) + 2,500 cold @60 s (0.83) + 10 distinct open inventories valued every 2 s (5.0) + discovery ≈ 6.9 req/s, ≈ 18 M credits. Pacing is capped at 9 req/s so the plan's credits cannot be exceeded (9 × 2.59 M s = 23.3 M). |
| Jupiter **Launch** (if needed) | $100 | 50 req/s, 100 M credits. Needed when distinct open inventories valued every 2 s exceed about 12, or the hot set exceeds about 3,000 at 10 s (3,000 hot + 50 inventories ≈ 31 req/s, ≈ 81 M credits). |
| Helius (PumpSwap live) | existing plan + **unmeasured** usage | Streams are billed 2 credits per 0.1 MB. The validation run measures bytes directly. Overage on paid plans: $5 per million credits. |
| GMGN | $0 | Free plan (5 weight/s), history back-fill only |
| Server | existing droplet | memory to be measured; a 4 GB droplet is ~$24 if needed (not purchased) |

Open-position quotes dominate the Jupiter budget, not price scans. The built default values non-urgent positions every 10 s and due orders immediately, which fits Developer for the first run.

### B. Broad live monitoring (not built; costed for comparison)
Event-level observation across Raydium, Meteora, Orca and PumpSwap, with Jupiter still supplying routed quotes.
| Option | Monthly | Basis / status |
|---|---|---|
| B1. Helius transaction stream + our own decoders | **≈ $250–500 of credits** on top of the plan (or the $499 Business plan), + Jupiter $25–100 | Our only measured reference: the earlier multi-venue log stream used 1.6–3.3 M credits a day (≈ 48–100 M a month). Meteora needs transaction-level data, which is heavier than logs, so this is a floor. Engineering: decoders and pricing for five-plus pool types. |
| B2. Decoded provider (Birdeye) | **UNVERIFIED** | Its WebSockets are per-token subscriptions billed per byte; the pricing page could not be retrieved today. Needs a quote and a coverage/timestamp test before it can be compared. |

**Recommendation:** run A first with adaptive cadence, and log which sampled tokens produce signals and how often a faster sample would have changed the outcome. Decide on B from that evidence; do not buy B on marketing claims.

## 5. Recommended Jupiter tier
**Developer, $25/month, paced at 9 req/s.** Measure the real workload during validation (keyless is enough for the probe); move to Launch ($100) only if open inventories or the hot set exceed the limits in §4A. The published plans page gives no per-credit overage price, so pacing is set to make overage impossible rather than relying on an unknown rate. The only step that needs the owner: create the Jupiter developer account, choose the plan, and put the key in `/root/older/.env` as `JUP_API_KEY`.

## 6. Validation — run 1, 20 Nov 2026 13:55–14:07 UTC (10 minutes, live, read-only)
Raw results: `docs/validation/run1-20261120/`. Server: 1 vCPU / 2 GB, Node 22, nothing else running.

| Assumption | Result | Evidence |
|---|---|---|
| Event reserves are the reserves **before** the swap | **PASS** | 52 of 52 scored transactions: event reserves = vault balances before the transaction, for `buy`, `buy_exact_quote_in`, `buy_exact_quote_in_v2` and sells (0 "after", 0 "neither"). Live: 5,125 swaps fit only "before", 0 fit only "after". |
| Several swaps on one pool in one transaction chain | **PASS** | 25 of 25 transactions chain under the "before" reading |
| Derived post-swap state (reserves ± amounts, LP fee stays) | **PASS** | consecutive events on a pool: 15,334 chained, 6 did not |
| Effective reserves (vault + virtual) are required | **PASS** | virtual reserves non-zero on 52 of 52 (≈ +17.6 SOL on most pools, negative on 2). Ignoring them would misprice badly. |
| Field meaning for `buy_exact_quote_in[_v2]` | **FAIL → FIXED** | the two quote fields are the other way round for these instructions (total paid in `quote_amount_in`, curve amount in `user_quote_amount_in`). Run 1 rejected 8,398 valid swaps (30% of SOL-pool swaps) and restarted those coins' histories each time, so no signal could form. Fixed in the decoder; a real transaction from this run is now a test fixture (derived reserves = the vault balance after the transaction). |
| Fee per side = user's net amount vs curve amount | **PASS after the fix** | buys 0.30%–1.25%, sells 0.85%–1.25%, matching the events' own LP + protocol + creator rates (creator rate varies 5–95 bps by coin). The negative rates in run 1 were the field mix-up above. Not yet re-measured. |
| Failed and duplicate transactions ignored | **PASS** | 74,776 failed transactions received and skipped; 0 duplicates |
| Feed stability, latency, backlog | **PASS** | 0 reconnects, 0 gaps; receive time ≈ 1.1 s after block time (block time has 1 s resolution); event-loop delay under 0.1 s after start-up |
| Memory and disk | **PASS** | 167 MB after 10 min, flat; database 13.7 MB |
| Paginated pool inventory | **PASS** | 181 pages, 60,172 SOL pools (capped for the test), 36,122 canonical, 24,050 non-canonical; 673 above $5K, 103 inside the band; 1 min 49 s |
| GMGN 1-minute history depth | **PASS** | 100 candles returned at 7, 30, 60 and 90 days back (tested on SOL; small coins not yet checked). `creation_timestamp` exists in token info. |
| GMGN back-fill speed | **FAIL → REDESIGNED** | 38 coins in 10 minutes on the free plan (16 rate-limit hits). Creation times now come from Jupiter in bulk (100 mints a call; for pump.fun coins the first pool is the bonding curve, i.e. token creation). GMGN is kept for history bars of in-band coins only. |
| Jupiter prices | **PASS** | 41 of 41 mints priced, 17 ms |
| Jupiter routed quote without `taker` | **PASS** | 0.2 SOL buy routed through Raydium CLMM in 0.11 s; sell and half-sell quotes returned; round trip −0.53%; invalid mint → explicit error. Response carries `priceImpactPct`, `routePlan`, `feeBps` (10 bps platform fee, inside the quoted output). |
| Jupiter discovery lists | **PASS** | top-traded 1 h: 100 tokens, 21 in the band; origins: 65 no launchpad, 27 pump.fun, 4 stonkfun, 2 met-dbc, 1 letsbonk, 1 raydium-launchlab — most active tokens are **not** pump.fun |
| **Helius cost of the PumpSwap firehose** | **MEASURED — a decision is needed** | 635.8 MB in 10 minutes = 12,716 credits → ≈ 76,000 an hour, **≈ 1.83 M a day, ≈ 55 M a month**. A seven-day run ≈ 12.8 M credits. At the published overage price ($5 per million) that is ≈ $275 a month beyond a plan's allowance. 28% of messages were failed transactions and 66% of decoded events were on pools not quoted in SOL — traffic we pay for and do not use. |
| What the non-SOL pools are | **UNRESOLVED** | 61,196 of 92,293 events. Run 2 tallies the quote tokens. If they are pump.fun coins quoted in a stablecoin, they belong in scope and need pricing support. |
| Reconstructed state vs account reads at entry | **UNRESOLVED** | no entry occurred in 10 minutes (the decoder fault above prevented any coverage) |
| GMGN `creation_timestamp` meaning for pump coins; Jupiter `firstPool` for non-pump tokens | **UNRESOLVED** | graduated-list call was malformed (fixed); non-pump age remains a labelled lower bound |
| GMGN key is on the Free plan; canonical-pool derivation | **PASS** | as before |

### Run 2, 20 Nov 2026 14:32–14:44 UTC (10 minutes; decoder fix + Solana-wide adapter on, Jupiter Free key)
Raw results: `docs/validation/run2-20261120/`.

| Check | Result | Evidence |
|---|---|---|
| `buy_exact_quote_in` fix on live data | **PASS** | swaps that fit neither reading: **6** of 39,056 (run 1: 8,398). The 6: 2 `multi_hop_swap` buys, 4 sells. 7,426 fit only "before", 0 only "after". Chains: 38,240 ok, 10 not. |
| Reserve reading against transactions (second sample) | **PASS** | 67 of 67 "before"; multi-swap 30 of 30 |
| Coins losing history through decoder rejects | **PASS** | 6 (run 1: 8,398) |
| Creation times in bulk from Jupiter | **PASS** | 974 pump.fun coins dated in 10 minutes (GMGN alone: 38); 49 not found |
| Solana-wide adapter, first live contact | **PASS (mechanics)** | 186 tokens registered (120 no launchpad, 34 pump.fun, 12 met-dbc, 10 stonkfun, 7 raydium-launchlab, others); 287 price requests, 4,568 prices, 149 omitted (3.2%), 0 errors, 0 rate limits; average sample gap 20 s on the Free key (target 10 s — needs the Developer plan); 338 curve-stage pump.fun coins skipped by design; 25 tokens blocked for transfer restrictions. No quote was needed (no entry). |
| Pool look-ups | **FAIL → FIXED** | from minute 5 one failing batch was retried whole for ever, blocking later look-ups. Now split and retried, with the error text kept. |
| Unusual fee readings | **OPEN** | 186 swaps with a fee outside 0–10% (0.5%). To be broken down by instruction in the shakedown run. |
| Non-SOL pools | **NARROWED** | 67,211 events; the quote sides are many different tokens, not a stablecoin (top eight each 2,700–6,000 events). Most likely pools with SOL on the base side or token-to-token pools. The next run tallies base/quote pairs. These tokens are reachable through the Solana-wide adapter. |
| Entries, fills, account-read check, routed quotes on live data | **UNRESOLVED** | no family fired in either 10-minute window (FAST needs 5 minutes of coverage, CONT 1 hour, LOW4H 4 hours). Needs the continuous shakedown run. |
| Helius usage | measured again | 734 MB = 14,685 credits in 10 minutes (≈ 2.1 M a day) |
| Memory | **PASS** | 177 MB after 10 minutes with both adapters on |

**Standing rule:** the reserve reading is confirmed (two runs, 119 transactions). The dashboard tile stays UNVALIDATED until the shakedown run has produced entries whose account-read check agrees with the reconstructed pool state.

## 6b. Independent code review of commit d88a250 (ChatGPT, 20 Nov 2026) — response
All nine blockers were confirmed against the code and fixed. Each has a regression test in `test/review.test.mjs` (or the test named). 64 tests pass.

| # | Blocker | Fix | Test |
|---|---|---|---|
| 1 | A state observed after the scheduled time could price it (back-dated fill, negative state age) | A pool state is trusted for time T only if it was observed at or before T. Otherwise the order waits for the first state within 5 s or is cancelled as a data timeout. | B1 |
| 2 | Events of one transaction shared a timestamp: FAST crossings missed, intermediate states could create peaks and stops | All of a transaction's events on a pool are applied in order and only the committed state after the last is an observation (`reduceTx`). Observations of a coin are strictly ordered in time. | B2 |
| 3 | Missing history could count as covered (empty back-fill, empty outage repair, first two omitted samples, boundary minute) | Coverage follows evidence: history extends only to the first bar actually returned; an empty reply extends and repairs nothing; a repaired outage counts at minute-bar resolution only and never for fresh crossings, FAST or SECOND-WAVE (`covered(…, strict)`); an omitted sample breaks coverage at once; boundary-minute bars are included in window lows/highs. | B3 (two tests) |
| 4 | Peaks were saved only on status changes | Open positions are check-pointed to the database within 5 s of any change to peak, last value or runner high. | B4 |
| 5 | A restart stranded sampled positions (restored as live, never quoted again) | Restore order is identity and observation mode first, then one-entry flags, then unfinished entries; the poller rebuilds its watch list from restored sampled coins; decimals and supply are stored. | B5 |
| 6 | A coin could be processed by both adapters; a routed-quote entry could be filled from a pool state | One observation method per mint. Live events for a sampled coin are ignored while it has any pending/open entry; only with none does it move to live, with a fresh history. Each entry is only ever priced by the method it was opened with. | B6 |
| 7 | `unresolved` was terminal: no more quotes, entry could leave tracking | Unresolved is a flag on a still-pending sale. Its inventory keeps being requested (every 10 minutes), the entry stays active, and it closes when a price returns (`was_unresolved_s` recorded). | exits test + B7 |
| 8 | A detected reserve discontinuity still produced an ordinary usable state | A base-side break flags the result; the feed restarts the coin's history and state trust at that moment, so no order or crossing uses the unknown interval. Breaks are counted and the last 20 kept for classification. The quote side is now measured (`chainBadQuote`) and will be enforced once the shakedown run shows its derivation is reliable. | B8 |
| 9 | Sequential quotes for different quantities were merged under one timestamp | Every quote is its own observation with its own request/response time, delivered as it arrives; an order uses only quotes requested at or after its scheduled time, for every quantity it needs; each used quote's times are stored. | B9 |

Should-fix items: validator aligned with the decoder (was already in 68be658); realised proceeds no longer clipped at zero; a buy-and-burn reduces supply immediately; events are accepted only while the PumpSwap program is the one executing (`dec.foreign` counts the rest); the entry check is "suspect" only when the account snapshot is at a comparable slot, otherwise inconclusive; Jupiter pacing honours a monthly credit allowance (`JUP_CREDITS_MONTH`) as well as requests per second.

Answers to the review's questions:
- **Boost reconstruction:** still approximate and now labelled on the state and on any fill that uses it; the next swap's chain check tells us whether it was exact (`chainBadAfterBoost`). Not yet reconciled against transactions.
- **90-day ceiling for sampled tokens:** not established. First-pool age guarantees the 8-hour minimum only. Every sampled entry now says so (`age_basis`). Establishing true age needs a per-entry on-chain lookup; proposed as a follow-up, not built.
- **Run evidence pinned to a commit:** the running commit is recorded at every start (feed log, status, published data).
- **Stopping entries after seven days:** `start.sh <name> 7` fixes the end of the entry window at the first start (never extended by a restart); exits and runner tracking continue.

## 6c. Second independent review, commit 5963512 (ChatGPT, 20 Nov 2026 18:08 UK) and Grok's review of the same commit — response

Verdict received: **not ready for the seven-day run**. Every claim was checked against the source; all were confirmed. Fixes below, each with a regression test in `older/test/review2.test.mjs` (C1–C5, M1–M3, G1). 82 tests pass.

| # | Finding (confirmed) | Fix |
|---|---|---|
| C1 | A coin moved from sampled to live was not saved as live. After a restart it came back as sampled: its live position was ignored by the live adapter and never quoted by the sampled one. | The move is saved (`store.setCoinMode`). On restore, each unfinished entry's own execution method decides how its coin is observed (`engine.forceMode`) — so a database written before this fix is corrected too, and the correction is saved. Two unfinished entries of different methods on one coin: the first keeps the coin, the other is flagged, never hidden. |
| C2a | One back-filled minute could mark an hour-long outage as repaired; CONT then fired on it. | Back-filled bars are continuous evidence only where consecutive bars are ≤ 5 minutes apart (`BACKFILL_MAX_HOLE_S`). An outage is repaired only when bars reach both ends with no such hole. History before the live start is extended only over the unbroken run that reaches it. Cost, declared: a genuinely quiet coin (no trade for 5+ minutes) is treated as not covered for that stretch; after 4 h 30 min of live observation this no longer matters. |
| C2b | `priceAt` preferred an older exact observation to a newer back-filled close (a 25% rise could read as more). | The later of the two wins; lows and highs inside a repaired outage now include its bars. |
| C3a | A quote-side break in the reserve chain was only counted. | Enforced: a mismatch above 0.1% of effective reserves (`QUOTE_CHAIN_TOL`) is a discontinuity (history and trust restart). Smaller mismatches (fee/rounding dust; a price error under 0.1%) are counted, with the largest seen kept (`chainQuoteMinor`, `chainQuoteMaxRel`). |
| C3b | Deposit/withdraw after a decoder-memory reset used zero virtual reserves. | Unknown virtual reserves give no state (`unknownVirtual`); the coin is lost until a swap carries them. Same for a swap event without the field on a pool never seen. |
| C3c | A `multi_hop_swap` that fitted the curve installed a negative buy-fee rate and priced fills. **Live: 85–98 such readings every 5 minutes.** | A fee is installed only from an instruction whose amounts were validated (`buy`, `buy_v2`, `buy_exact_quote_in`, `buy_exact_quote_in_v2`; sells) and only inside 0–10%. Anything else is a failed measurement: counted (`feeNotMeasured`), never installed, never clamped. The pool keeps the last rate it really showed; with none, fills say `fee_src: other-side / assumed`. This replaces "unusual rate used as observed". |
| C3d (item D) | Boost reconstruction not reconciled. | A state rebuilt from a boost event is quarantined until the next swap: it prices no fill, moves no peak or stop, creates no observation or signal (`approxStates`). Live evidence so far: 0 chain breaks after a boost (base or quote) in the runs measured. |
| C4 | Routed half-sales combined quotes for different quantities taken up to minutes apart. | The quotes used for one half-sale must have been requested within 5 s of each other (`SCALE_QUOTE_MAX_SPREAD_S`), else the order waits for a fresh set (`waited_for_coherent_quotes`). All three request/reply times and the spread are stored. A size whose quote fails keeps no old quote. |
| C5 | A sampled token with no supply or market cap was valued at a default billion tokens; `decimals: null` passed the check (`null >= 0`). | No provider market cap or circulating supply → not evaluated (counted, noted once). Decimals must be an integer 0–18 (`validDec`) at registration, restore and quoting. Restored sampled coins without stored decimals are no longer skipped silently: metadata is fetched again, positions first; if still missing, the position is flagged. |
| M1 | Background holder snapshots shared the Jupiter queue with executable quotes. | Priority lanes on the one rate bucket: quotes first, price samples second, discovery third, background last; a waiting request is promoted one lane per 10 s but never into the quote lane. |
| M2 | Several buyers in one transaction were attributed to the first. | Every buyer is carried with its own volume into the bars and the 1/3/5-minute measurements. |
| M3 | `vol60_usd` could claim an hour of history that was back-fill. | Trade-window measurements (1/3/5 minutes, 60-minute volume, surge) are reported only when exact observations cover the whole window; otherwise empty. |
| G1 (Grok) | Peaks could be up to 5 s stale after a restart. | Saved at most 1 s after a change, and all open positions are saved the moment the process is told to stop (SIGINT/SIGTERM), with the last-alive time. |

Checked and **not** changed: Grok's suggestion to leave a sampled position's peak unset until its first sell quote. Tested: a position whose price falls before that first quote would then have no stop. The peak of a quote-priced entry stays at cost until a higher valuation is seen (declared in `book.mjs`).

Question C (coin 8TiMkg, same exit on all four stops): the reviewer reproduced it legitimately on current code — one fall crosses every stop and the price lands at the same state 0.7 s later. The two old-code trades themselves remain unverified.

Still open, labelled: true age of sampled tokens (first-pool age is a lower bound; the 90-day ceiling is not verified); `multi_hop_swap` buys that do not fit the curve are rejected and the coin's history restarts there; sustained memory over days is unmeasured.

The seven-day run must use a **new database name** (`start.sh run7 7`); the shakedown database holds trades made by faulty code and is kept separately.

## 6d. Third independent review, commit c5dda67 (ChatGPT, 20 Nov 2026 18:45 UK) — response

Verdict received: **not ready; two correctness faults remain** (C1, C5, M1, G1 closed; C4's execution blocker closed). Both confirmed. Regression tests T1–T3 in `older/test/review2.test.mjs`. 87 tests pass.

| # | Finding (confirmed) | Fix |
|---|---|---|
| T1a | Bars of a REJECTED back-fill stayed in memory (inserted before validation), and the previous fix let back-filled extremes inside the exact buffer reach FAST: a 22% move was bought as a double. | Validation comes first: a rejected reply, and bars outside the accepted run, are not kept at all. Accepted back-fill lives in its own map (`Series.bf`), apart from live bars. FAST takes its low from an **exact path** (`lowIn(x, t, true)`): exact observations inside the window plus the exact price standing at its start — no back-fill, no minute bar. |
| T1b | At start-up FAST accepted back-filled history before its own exact window existed. | Strict coverage is now exact-observation coverage (`obsFrom`): a fresh crossing, FAST and SECOND-WAVE need exact observations continuous over the whole window. Back-fill never satisfies it. |
| T1c | A returned newer close was discarded when an incomplete live candle occupied the same minute. | Live and back-filled bars of the same minute coexist; a completed back-filled minute that ends after the last exact observation supplies the newer close (hour-scale reads only). |
| T2 | A deposit/withdrawal after a boost produced a state without the quarantine marker; a pending buy filled on it before any swap. | The marker is carried by every deposit/withdrawal state until the next swap (which carries its own virtual reserves and is chain-checked) releases it. |
| left-and-labelled, done anyway | Compression at `RAW_CAP` lost buyers and was not flagged. | Merged observations keep every buyer with its own volume; any measurement window containing a merge is flagged `compressed` (transaction counts understated, volume and buyers complete). |
| left-and-labelled, done anyway | Another quantity's quote reply made an older full-position valuation look current. | A quoted valuation's time is the time of its own quote. |
| tightened | Patch end-point accepted bars ending 221 s before the outage ended. | Both ends of a repaired outage must be within 120 s. |

Declared approximations that remain (accepted by the reviewer as labelled): the 5-minute back-fill tolerance for hour-scale windows (not proof of continuity; never used by exact decisions); the 0.1% quote-chain tolerance; the fee fallback (other side, else 0.3%, labelled on the fill); a quote-priced position's peak starting at cost; true age of sampled tokens; sustained memory; real API cadence.

### Addendum to 6d — a regression found by our own monitoring (20 Nov 2026, 19:02 UK), fixed in the commit after e511f2f
The M1 priority lanes put ALL routed quotes in the first lane. On the free Jupiter key (1 request/s) four open sampled positions need about 1.2 valuation quotes a second, so valuations took the whole allowance: 269 quotes against 11 price requests in five minutes, and price sampling of ~1,700 watched tokens stalled (the sampled side opened no entries). Fix: the first lane is only for an order that is DUE; routine valuations share the second lane with price samples, first come first served (test M1b). No trading rule changed. On the free key both are still slower than their targets; the Developer plan (10 requests/s) removes the contention.

## 6e. Fourth independent review, commit e511f2f (ChatGPT, 20 Nov 2026 19:51 UK) — response

Verdict received: T1 and T2 closed; **one blocker left** — the candle readers. Confirmed. Tests F1–F4 in `older/test/review2.test.mjs` (the three F1 tests were checked to FAIL on the old reader). 95 tests pass.

| # | Finding (confirmed) | Fix |
|---|---|---|
| F1 | `barAt()` / `barsIn()` always preferred a live candle, even a fragment cut by an outage that an accepted back-fill had repaired. SLOW-BUILD entered past a hidden +50% candle; HH-BREAK missed a qualifying break (volume 15 against a real 114). | One rule, in one place (`Series.barAt`, used by `barsIn`): a fully observed live minute → the live candle; a PARTIAL live minute with an accepted back-filled candle → the back-filled candle; partial with no repair → the fragment; no live candle → the back-filled one. A minute is fully observed when exact observation was already running at its start and no outage touches it (`liveComplete`). The two are never added together. |
| F2 (non-blocking) | buy → sell → buy inside a compressed second lost the first buyer. | Buyers already merged are kept whatever sides follow. |
| F3 (non-blocking) | After a quiet coin's history aged out, the wake-up trade had no standing price to be measured against, so a wake-up double was silently missed. | The newest exact observation leaving the buffer is kept as an anchor; the exact price path falls back to it. A loss of the coin's data clears it. This is the rule as written ("including the price standing at the window's start"), now also true after more than 4 h 30 min of silence — it will ADD entries on coins that wake from a long sleep. |
| F4 (non-blocking) | Rejected back-fill bars were saved to SQLite unlabelled. | Audit rows are labelled `backfill` (accepted into decision history) or `backfill-rejected`, and never overwrite a live row. Nothing reads them back into decisions. |

### Addendum to 6e — second regression found by our own monitoring (20 Nov 2026, 20:45 UK), fixed in the commit after 938198b
After 07dd68e put routine valuations in the second Jupiter lane, a full valuation pass on the free key takes tens of seconds, and the poller ran due orders and valuations in ONE sequential pass. A buy that became due while a pass was running was not requested until the pass ended: all three sampled buys between 20:20 and 20:35 UK (entries 49, 50, 53) were cancelled at the 5-second limit. Fix: two independent passes — due orders and routine valuations — so a due order is requested within a quarter of a second and takes the first lane. Test: "a buy that becomes due is quoted at once even while a slow valuation pass is running". No trading rule changed.

## 6f. Fifth independent review, commit 938198b (ChatGPT, 21 Nov 2026 12:32 UK) — response

Verdict received: F1 closed; **one blocker — price-history continuity** (an old price could survive an interruption and be carried into a later window). Confirmed in all three forms shown (feed gap during a silence; old live-bar close after `coinLost`; same-process re-admission of a sampled coin), plus the quarantine not being recorded as a break. Tests P1–P5 in `older/test/review2.test.mjs`; P1 and P2 were checked to FAIL with the provenance check removed. 101 tests pass.

One coherent correction, as requested:

| Requirement | What was done |
|---|---|
| Validate every carried reference across the source-to-window interval | `Series.priceAt()` now returns a price only if the stretch from the price's OWN time to the time it is asked for is known: for exact use `continuous(s0, t)`, for hour-scale use `covered(s0, t)`. Applies to raw observations, live-bar closes (dated from the START of their minute), the anchor, last-price fallbacks and back-filled closes. No fallback to an older candidate (it would span the same break): the answer is "not known". |
| Record unusable-price periods, including quarantine and per-coin losses | Each coin keeps its own breaks (`Series.own`): a boost quarantine opens one at the estimated state and the confirming swap closes it; the interval stays on record. Loss of a coin's data restarts its history (`restartAt`, which also clears the anchor and the break list). |
| One continuity test | `Series.continuous(a, b)`: exact observation running at `a`, no feed / SOL-USD outage in `[a, b]`, none of the coin's own breaks in `[a, b]`. Used by seconds-scale windows, fresh crossings, trade-window measurements, carried prices and candle completeness (`liveComplete`). |
| Re-establish coverage on recovery and re-admission | `Poller.add()` gives a coin that already existed a NEW empty Series (per-age-group entry records are kept). Recovery after a quarantine: exact coverage holds again from the confirming swap. |
| Keep arbitrarily old anchors when silence is verified | Unchanged: no age cut-off. Test P1 shows three verified quiet hours still carrying the price and the wake-up double being taken. |
| Non-blocking: urgency at dispatch | A sell quote's lane is decided when it is sent, not at the start of the pass. |
| Non-blocking: search label | The search banner states that each book's total boxes still show the whole book. |

Decision taken, declared: a coin's own break (quarantine) also makes HOUR-scale windows that span it uncovered, and back-fill does not repair it. This is the strict choice; its cost is counted (`engine.priceBreaks`, and `sizes.coins_with_price_breaks` in the status report).

**Question for the reviewer (not implemented):** live evidence, 20–21 Nov: three feed reconnects of about 2 seconds each in 16 hours; each voids hour-scale coverage for every coin unless back-fill repairs it, and the free GMGN plan repaired 415 coin-gaps against 2,475 not repaired. Would a declared tolerance for hour-scale windows only — an unrepaired feed gap, or a coin's own quarantine, of at most 60 seconds does not break LOW4H / CONT / SLOW-BUILD / HH-BREAK / AGE-DOUBLE coverage; exact windows unchanged — be acceptable, in the same spirit as the 5-minute back-fill tolerance?

Also since 938198b (commit a680362, not yet reviewed): due orders and routine valuations run as independent poller passes, so a buy that becomes due is not held behind a slow valuation pass (three sampled buys had been cancelled at the 5-second limit).

## 6h. Sixth independent review, commit 8474066 (ChatGPT, 21 Nov 2026 14:28 UK) — response

Verdict received: **not ready**; two reproducible faults (A, C), one reporting defect (E), guidance on the 60-second question (D). All three reproduced here on the old code before fixing (tests A1, A2, C1, C2 fail on 8474066's `series.mjs`, pass now). 111 tests.

| Finding | Was it right? | Fix |
|---|---|---|
| **A. Loss ≠ recovery.** `coinLost` restarted history at the loss time, so the stretch between the loss and the first valid price counted as observed; a 1-minute window starting inside it was "continuous" with an unknown starting price ($90K, then $210K ten seconds later → FAST-1M). Same after a reconnection. | Yes. Reproduced through `Series` and through the engine (loss, and reconnection). | (1) `restartAt` marks the restart as pending; the first observation that actually arrives moves `histFrom` and `obsFrom` to its own time — for hour-scale and exact use alike. (2) `exactWindow(x, t)`: an exact window needs unbroken observation **and a price already standing at x** (an exact observation at or before x carried to x without a break). `covered(…, strict)` uses it, so FAST, SECOND-WAVE and the fresh-crossing check all do. This covers loss, reconnection and start-up with one rule. Measurements (`obsCovered`) are unchanged: on a live feed, volume in a covered stretch is complete whether or not a price was standing. |
| **C. Compression changed decisions.** At `RAW_CAP` a later price overwrote the earlier observation of the same second: the low (or high) was lost and the entry kept the earlier time with a later price. | Yes. Reproduced: a dip inside a busy second vanished from `lowIn`. | The newest observation always stays its own entry. The one before it is merged into the earlier entry of the same second, which keeps the lowest, highest, first and last price and its first and last time (`mrg`). `lowIn`/`highIn` answer with the kept extreme. An exact price asked for a moment inside a merged second is "not known" (never a later price), so an exact window cannot start there. At most two entries per second beyond the cap: memory stays bounded. The anchor of a merged entry carries its last time. |
| **E. `entries.json` exported `v.ret`.** | Yes — found independently at 13:27 the same day; fixed in d3403d1 (`v.exit.ret`). | Done. |
| **D. 60-second tolerance.** | Accepted as guidance: not a blanket rule. | Not implemented. If taken up later it will be a declared approximation for hour-scale price windows only, on gaps closed and bounded by trustworthy states, with affected entries recorded separately, exact windows / fresh crossings / fill trust unchanged, missing candles and volume never treated as zero, unknown AGE-DOUBLE references left missing. |

**Declared consequence of A(2):** after a restart, a reconnection or a loss, a coin's FAST windows begin at its first observed price, not at the moment the feed came up. A coin whose first observed trades are themselves the double is not entered by the seconds-scale books for that move.

## 6m. Seventh independent review — the full review of 4dd2897 (ChatGPT, 21 Nov 2026 23:50 UK) — response

Verdict received: **not ready**; five blockers and five non-blocking defects. Each blocker was reproduced here before fixing: `test/review7.test.mjs` (six tests) fails on 4dd2897's source — every test, and test 3 also with its helper assertion removed — and passes now. 133 tests.

| Finding | Was it right? | Fix |
|---|---|---|
| **1. RUG peaks and lows change across restarts** (stored in 10% steps: $540K came back as $500K; a $101K low as $110K; the inventory's metadata write could erase the stored state). | Yes. | **Not the fix proposed** (store the exact state and flush at shutdown). The exact state would still be wrong after a restart: the true peak and low during the outage are unknown, and a hard stop cannot flush. Instead the RUG state is **memory only and valid only over unbroken observation** (SPEC, seventh-review rule 1). Nothing is stored, so nothing can be rounded, go stale or be erased. The reviewer's two cases: $540K → restart → $105K → $99K is not bought; $101K low → restart → $140K → $145K is not bought. |
| **2. Sampled observations arm a live-only strategy**, and the setup survives promotion. | Yes. | The RUG block runs only when at least one RUG book is supported by the coin's observation method, so sampled observations change nothing; the state is cleared on every change of method (`forceMode`, promotion, re-admission). |
| **3. Hour-scale windows accept an unknown price prefix** (`covered()` true while `priceAt(windowStart)` is null: $90K → $210K after a long silence was a LOW4H buy). | Yes. | `Series.priced(x, t)` = covered **and** a known price at `x`. Used by LOW4H, CONT, HH-BREAK and the three faster HH books (for the high window; their volume windows keep `covered`) and by the recorded measurements. A watched quiet period still counts (test 3, last case). |
| **4. Compression changes VOL eligibility** ($300,001 reported as $299,000). | Yes. | `volSince` returns "not known" when the cut-off falls inside a merged second; the VOL books record that and decide nothing. Chosen over keeping per-trade volume inside merged entries, which would undo the memory bound that compression exists for. Cost: a possible VOL entry is missed (never invented) at such a trade; the next trade is evaluated normally. |
| **5. Entry and flags not atomic.** | Yes. | One transaction for the entry and its flags; restore re-creates missing flags from the stored entries before evaluating anything. |
| Migration look-ahead; rejected back-fill rows admitted. | Yes, both. | Last minute **completed before** the clock time; `backfill-rejected` excluded. Applies to databases migrated from now on; the 21 Nov estimates already stored in the shakedown database were made by the old selection and are now outside every total (next row). |
| Estimated clock exits mixed into totals (open question 6j). | Accepted. | Estimated sales are excluded from every total, ranking, win rate and period figure and shown on a separate line (SPEC rule 5). |
| Scaled "high while held". | Yes. | `maxEq`: banked half + value of the rest, tracked while held (display only). |
| Sale market caps not marked approximate. | Yes. | Always marked approximate. |
| "Counting since" inferred from the first page query. | Yes. | Set at program start. |
| Validation script deletes the previous validation database. | Yes. | Archived under `archive/` instead. |
| Stake views (open question 6g). | Accepted as answered: kept as a labelled size-sensitivity scenario. | No change. |

**Declared consequences.** (a) After every restart, feed drop or data loss the four RUG books start from nothing: a rug is bought only if this program watched the peak and the collapse without interruption. On the shakedown server, restarted many times a day, they will buy rarely; over an uninterrupted seven-day run this is the intended rule. (b) The six RUG buys of 21 Nov (22:39–22:48 UK, all within ten minutes of the 22:38 restart, none in the following hour) fit finding 1's mechanism but were not individually proven to be caused by it; they stay in the shakedown database, which is not the scored run. (c) LOW4H and CONT do not enter a coin whose first observed trade lies inside their window.

**To attack:** a break that `continuous()` does not see (is there any path where observation is interrupted without a `feedDown`, a `restartAt` or a mode change?); `priced()` on a window whose start falls inside a merged second; whether excluding estimated sales anywhere changes a figure that is not labelled.

## 6n. Transfer-fee coins allowed up to 5% (22 Nov 2026, 00:40 UK) — owner's decision, for the reviewer

Separate commit from 6m so it can be judged alone. Rule and declared assumption: SPEC "Transfer-fee coins". Code: `risk.mjs` (fee ≤ 500 bps is a warning with `fee_bps`, not a block), `polled.mjs` (fee taken off the bought tokens and off each sale's proceeds), `engine.mjs` (fee coin on the live method not entered; `token.xfer_bps`), `book.mjs` (`fill.quote.xfer_bps`), page asterisk. Test: `test/polled.test.mjs`, last test. 134 tests.

Reporting (owner, 00:48): fee-coin buys appear in one separate book, FEE-COINS (`spec.FEE_BOOK`; `page.mjs booksApi`, `report.mjs bookRows`), one row per buy, and are excluded from the rule books and from the 1,240 rows — so the 1,240 comparisons are unchanged in meaning and contain no fee coins.

Added 01:25 (owner): fee coins are evaluated from their first pool on (age group A0) by the same sampled rules; AGE-DOUBLE excluded there (`engine.onPrice` `feeYoung`, `signals.evaluate` `opts.youngAll`). Reported in FEE-COINS only, so no rule book and no comparison row changes. Test: last test of `test/polled.test.mjs`.

**To attack:** (1) does Jupiter's quote `outAmount` already net a Token-2022 transfer fee on the input or output leg? Its API reference says only "after deducting AMM fees and platform fees". If it does, the deduction here is double (results too low). (2) Multiplying the sale proceeds by (1 − fee) instead of quoting the reduced token amount — the error is second order in trade size over pool depth; is that acceptable for 0.2 SOL? (3) The fee is read once per start; a fee raised by its authority mid-position is not seen until the next start. (4) Stored coins keep their old "restricted" status until the chain is re-read after the restart (one call per second): safe direction, but say if you see a path where a stale status is trusted the other way.

## 6o. Warm restart (22 Nov 2026, 01:05 UK) — owner's decision, for the reviewer

Rule and declared approximation: SPEC "Warm restart". This deliberately relaxes one rule you have insisted on — "a restart is an outage" — for hour-scale windows only, under your own guidance D of the sixth review (a declared approximation for hour-scale price windows, on a gap bounded by trustworthy states, with affected entries recorded separately; exact windows and fresh crossings untouched).

Code: `warm.mjs` (save at SIGINT/SIGTERM, load after `store.restore`); `series.mjs` (`Coverage.resume`/`up` mark the gap "warm" only when observation resumes within 60 s; `covered` tolerates a warm gap, `continuous` does not; `steady`, `warmIn`, `dump`, `load`); `signals.mjs` (`cand(…, from)` records `restart_gap_s`; the RUG state uses `steady`); `engine.mjs` (`restartGap(…, { warm })`, entry flag); `polled.mjs` (history kept, first pause judged by the hole rule at the coin's previous interval); `scripts/start.sh` (`--kill-timeout 20000` so the save can finish). Tests: `test/warm.test.mjs` (8). 142 tests. Measured here on 5,000 coins / 306,000 observations / 198,000 bars: 66 MB file, 0.46 s to save, 0.63 s to load.

Two small corrections found on the way, both in the strict direction: `feedUp` no longer starts the history of a SAMPLED coin at the PumpSwap feed's reconnection (it starts at the coin's own first sample); the minute loop compared the length of `feedCov.gaps` with a counter taken from `cov.gaps`.

**To attack:**
1. Is there any path by which an EXACT decision spans the gap? (`continuous`, `exactWindow`, `prevOk`, `liveComplete`, the SECOND-WAVE check.)
2. HH books: the gap's missing volume sits in one bucket. In a baseline bucket it lowers the median slightly (easier trigger); in the signal bucket it makes the trigger harder. Is marking enough, or should a bucket that contains the gap be excluded?
3. `priceAt` for hour-scale use now carries a price across a warm gap (provenance uses `covered`). AGE-DOUBLE's reference can therefore be a price from before a restart that falls between the last trade and the age-group start.
4. The snapshot keeps `groups[ag].done` flags that the database does not hold (SLOW-BUILD / LOW4H-LIQ25K attempts used, a SECOND-WAVE seed used). After a cold start those are lost as before; after a warm start they are kept. Is the difference acceptable?
5. The stop time written in the snapshot is taken when the signal handler starts. Events already received but not yet processed at that moment are lost inside the gap — is the gap's start early enough?
6. Sampled coins: first pause judged at the previous interval (`warmTol`). A coin that was "hot" before the stop and has no position is restored as "cold"; its first sample may come later than 35 s and the history then restarts (safe direction).
7. `Series.load` trusts the file's contents (it is written and read by this program on the same disk, renamed atomically, used once). Anything that should be validated on read?

## 6l. Full review requested by the owner (21 Nov 2026, 21:35 UK) — map of everything since the sixth review

The sixth review covered `8474066` (spec older-4, 17 families, 104 tests). The owner asked for a complete A-to-Z review of the present head because much has been added since. Spec is now **older-8**: 29 families, 5 stops, 2 exit policies, 1,240 comparison rows, 124 tests.

| Commit | What | Where to read | Section |
|---|---|---|---|
| c1b8fdc | 60% trailing stop; pools saved with every pool-priced sale; website stake views | spec `STOPS`, `STAKE_VIEWS`; book `poolOf`, `atStake` | 6g |
| d3403d1 | entries.json exported `v.ret` (your finding E) | main.mjs `compact` | 6h |
| c3d3bcd, 2aa3eef | stake views: pool rebuilt from the sale for older trades; no trade dropped when the stake changes | book `atStake`; page `booksApi` | 6g |
| 2fe6eb5 | **your sixth-review faults A and C** | series `restartAt`, `add`, `exactWindow`, `mrg`, `priceAt`, `_ext` | 6h |
| 95c042a | HH30-5M, HH30-10M, HH15-5M | spec `HH_FAST`; signals block 5b | 6i |
| 7abc863, 37a5793, d07c49e, bae3939 | website only: book table with rules, "counting since", compact strip, period selector | page.mjs; store `since` | — |
| 3c62cfb | read-only study script (touches nothing the bot reads) | scripts/study-family.mjs | — |
| 95b0a2d | HH-BREAK-4H clock book; `CLOCK` declaration; one-off migration of existing HH-BREAK buys with estimated 4-hour sales | spec `CLOCK`; book `advance`, `versionsFor`; migrate.mjs | 6j |
| c780ef6 | eight any-age books (VOL ×4, RUG ×4); age group A0; evaluation from migration on | spec `VOL`, `RUG`, `ANY_AGE`, `ageGroupAny`; signals block 0; engine `onSwap` | 6k |
| a72d1d3, 7bc6cd7, 2f8457e, 5864356 | website only: coin search lists each buy (books, market cap at our buy and at our sale); "sold at" column; page reloads itself on a new build; "high while held" apart from the later high; open positions' value | page.mjs `usdMc`, `saleMc`, `booksApi`; web.mjs `BUILD` | — |

**Things the implementer is least sure of — please attack these first**
1. `exactWindow` (6h): is "continuous and a price standing at the start" now sufficient for every exact use, and does it wrongly refuse any window that is in fact fully known (e.g. a live coin with a covered feed and no trade for hours — the anchor case)?
2. Compression (6h): merged entries hold lo / hi / first / last; `priceAt` answers "not known" inside a merged second. Any decision path that still reads `o[1]` of a merged entry as if it were the price at `o[0]`?
3. RUG books (6k): the peak is the highest observed market cap, set by a single observation; arming is a fresh crossing. Can a decoder artefact, a quarantined state, or a first observation after a loss set a false peak or a false crossing? Is `prevOk` enough?
4. VOL books (6k): `obsCovered` + `volSince` — is the 5-minute volume complete under compression, under a coin's own price breaks (`own`), and right after a pending restart?
5. A0 (6k): `evaluate` now runs for coins under 8 hours. Does any pre-existing book, note, feature or SECOND-WAVE seed leak into A0, or does A0 state leak into A1 at the 8-hour boundary (one-entry flags are per age group)?
6. Clock books and the migration (6j): `v.stall` now carries a tag; restored entries written by earlier versions have `stall: true/false` only. Any path where an old stored version is misread? Are the estimated exits ever read by a decision?
7. Stake views (6g): display only — confirm nothing in `engine`, `signals` or `book.advance/observe` reads `mark`, `exit.pool`, `est` or the stake.
8. Restart safety across all of the above: `coins.info.rug`, decisions for new families, `since:*` meta rows, HH-BREAK-4H rows.
9. **Observed on the live run, unexplained (21 Nov 22:38–23:18 UK):** the first six RUG buys (three coins, knife then bounce each) all came within ten minutes of a restart and none in the following half hour. The peak and an armed setup are restored from `coins.info.rug`; `prevOk` should stop a crossing being read across the restart gap. Is there any path by which a restart makes a stale fall look like a fresh crossing — e.g. a restored peak with a first post-restart pair of observations, `prevPx` surviving in a restored series, or the restart gap not covering the coin?

## 6k. older-8 (21 Nov 2026, 21:15 UK) — eight any-age books at the owner's request, for the reviewer

- `spec.mjs`: `AGE_YOUNG` (A0, migration to 8 h), `ageGroupAny`, `VOL`, `RUG`, `ANY_AGE`, `agesOf(family)`. `engine.onSwap` no longer returns under 8 hours; `evaluate` runs block 0 (VOL, RUG) for every age and leaves through `break older` when the coin is under 8 hours, so no existing book is evaluated there (tested).
- VOL (signals 0a): `obsCovered(t − 300, t)` required; volume = `Series.volSince` over exact observations (compression sums volume, so it is complete); `-UP` needs `priceAt(t − 300, exact)` and a higher price now; band $40K–$2M.
- RUG (signals 0b): running peak of observed market cap; arming and knife entry on a fresh crossing (`prevOk`) down through 20% of the peak; bounce on a fresh crossing up through 1.3 × the low since arming, within 24 h; setup spent by the bounce. Peak (≥ $450K, on 10% steps) and armed setup persisted in `coins.info.rug` by the engine after `evaluate`.
- Not evaluated for sampled tokens (`POLLED_UNSUPPORTED`). Report rows: `agesOf(family)`.
- Tests: test/anyage.test.mjs (thresholds, -UP, band, feed gap inside the volume window, 8 h+ coin, knife, nesting, bounce, spent setup, gap during the fall, small peak, restart persistence, out-of-band, expiry, row counts). 124 tests.

**Known limits, declared:** a single extreme print sets the peak (it is a real pool price, but one trade can arm a setup); there is no minimum time or volume between peak and fall; the VOL books have no direction condition unless the `-UP` variant is read.

## 6j. older-7 (21 Nov 2026, 16:40 UK) — HH-BREAK-4H at the owner's request, for the reviewer

- `spec.mjs CLOCK`: clock books declared in one place — `CONT-STALL` (base CONT, tag `true`, 60 min, minPeak 1.15, reason "stall": behaviour unchanged, existing tests untouched) and `HH-BREAK-4H` (base HH-BREAK, tag `"4h"`, 4 h, unconditional, reason "clock"). `v.stall` now carries the tag; `versionsFor` matches on `clockTag(family)`; `advance` reads the clock from the tag.
- `signals.mjs`: an HH-BREAK candidate also raises HH-BREAK-4H on the same entry. Not evaluated for sampled tokens.
- `migrate.mjs addClockBook`: one-off, idempotent, runs before restore. Carries stored HH-BREAK buys into the new book: exact copy where the plain version stopped before the 4-hour mark; live copy where the mark is in the future; otherwise an estimated sale from the last minute-bar close at or before the mark, flagged `exit.est` / `exec: "estimated-minute-bar"` and shown as "est." on the page. Inserts the one-buy decision rows so the new book cannot buy those coins again in that age group.
- Tests (review2.test.mjs, "older-7 …"): clock sale at 4 h regardless of peak; stop before 4 h identical to the plain row; CONT-STALL unchanged; engine entry carries both families; migration cases (exact / estimated from the right bar / live copy then sold by the engine's clock / idempotent / done flag restored / page flag / same "counting since" as the base). 119 tests.

**Question for the reviewer:** is an estimated exit acceptable inside a book when it is flagged per row and counted, or should carried-in buys be kept out of the book's totals until the seven-day run (fresh database, nothing estimated)?

## 6i. older-6 (21 Nov 2026, 16:00 UK) — three more books at the owner's request, for the reviewer

`HH_FAST = [["HH30-5M", 1800, 5, 24], ["HH30-10M", 1800, 10, 12], ["HH15-5M", 900, 5, 12]]` — the HH-BREAK rule on shorter clocks (signals.mjs block 5b): strictly above the preceding W-second high (hour-scale `highIn`), volume of the last n completed minutes ≥ 2 × the median of the K adjacent n-minute buckets before them, same `covered` requirement over the whole baseline, same `barsIn` candle selection, same zero-baseline refusal. Not evaluated for sampled tokens (`POLLED_UNSUPPORTED`). No existing rule changed. Tests in signals.test.mjs (entry, shared entry across the three, not-2× refusal, zero-baseline refusal, and the known limit of having no dollar floor). 800 rows. 115 tests.

Evidence behind the request, and the owner's choice: HH-BREAK's 84 buys had a median of $150 traded in the 5 minutes before the buy; under $200 → 46 buys, 1 reached 1.5×; $200 and over → 38 buys, 8 reached 1.5×. A dollar floor was proposed and declined by the owner; the per-entry volume measurements allow the split afterwards.

## 6g. older-5 (21 Nov 2026, 13:30 UK) — owner's two additions, for the reviewer

Not a response to a review; two things the owner asked for while the sixth pass was out.

1. **60% trailing stop** — `STOPS = [0.20, 0.25, 0.30, 0.40, 0.60]`; 680 rows. No rule changed; three tests that used a ~43% fall to mean "every stop sold" now use a deeper fall, and a new test shows the 60% version staying open through a 45% fall and selling on a 65% fall.
2. **Stake views (0.5 / 1 / 2 / 5 SOL) on the books page — display only.** `execSell` now stores the pool it priced on (`pool: { q, b, f }`) with each pool-state half-sale and exit, and `observe` keeps the latest valuation pool on the entry (`mark`). `atStake(e, v, stake)` re-prices buy, half-sale and exit on those reserves. Tests: 0.2 SOL reproduces the recorded result to 1e-12; return falls monotonically with stake; routed-quote trades cannot be re-priced and keep their 0.2 SOL percentage result on the larger stake (flagged `flat`, counted; never dropped — dropping them made a book's 0.5 SOL total exceed 2.5 × its 0.2 SOL total, which the owner spotted); a pre-change sale is re-priced on a pool rebuilt from the sale (buy pool's k; exact at 0.2 SOL, equal to the saved-pool answer when k was unchanged — tested) and marked `est`.

**Question for the reviewer:** each leg is priced on the pool as observed, i.e. without the larger buy's own effect on the pool. For a buy of n SOL into effective reserves Q, held to an unchanged pool, that model returns n·Q/(Q+2n) before fees where a real round trip returns n — so on a flat price it is pessimistic by 2n/(Q+2n): about 0.5% at 0.2 SOL and about 11% at 5 SOL in an 80-SOL pool (arithmetic on an example pool, not a measurement). The other extreme — everyone else trades the same token amounts regardless of the larger buy — would return Q_exit·tokens/(B_exit − tokens), which is optimistic. The page shows the pessimistic figure and says so. Is that the right side to err on, or should both ends be shown as a range?

## 7. What is ready, and what is not
**Ready:** the PumpSwap live path; the Solana-wide sampled path (against a simulated provider); the 448-row dashboard with method filters; the one-command validation run.
**Remaining, in order:**
1. Owner runs `bash older/scripts/validate.sh 10` on the server (read-only; about 15 minutes). Results publish themselves to branch `older-validation`.
2. Review the evidence; fix whatever fails; run the remaining 50 minutes.
3. Owner: Jupiter developer account and plan (§5). Until then the adapter runs keyless at 0.5 req/s — enough to test, not to run.
4. Start the seven-day paper run.

**Known limits that are not blockers:** no complete start-up inventory of existing non-PumpSwap coins (coverage grows forward from the first day); HH-BREAK unavailable for sampled tokens; LIQ25K impact evidence missing for sampled tokens; the server's memory headroom is unmeasured.
