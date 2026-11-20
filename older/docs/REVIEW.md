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

## 6. Validation status
| Assumption | Status | How it is settled |
|---|---|---|
| Event decoding matches the published IDL | **UNRESOLVED** (synthetic only) | `validation-run.json`: decoded vs short/rejected counts |
| Failed and duplicate transactions are ignored | **UNRESOLVED** | `failed_tx`, `dupes` counters |
| Event reserves are pre-swap (pinned reading) | **UNRESOLVED** | `tx-validation.json`: vault balances before/after each swap, by instruction and side; large trades separately |
| Several swaps on one pool in one transaction chain correctly | **UNRESOLVED** | `multi_swap` block |
| Effective reserves (vault + virtual) reproduce traded amounts | **UNRESOLVED** | `curve` / `curve_large_trades` |
| Fee per side = user's net debit/credit; rounding | **UNRESOLVED** | `user_amount`, `fee_rate` ranges; `feeOdd` counter |
| Reconstructed state matches account reads | **UNRESOLVED** | per-entry check: slots, times, differences, `suspect` count |
| Feed latency, gaps, backlog | **UNRESOLVED** | `lag_ms_avg`, `reconnects`, `feed_gaps`, `loop_lag_ms_max` |
| Helius credits | **UNRESOLVED** | `helius_stream_credits` (bytes × billing rule) per minute |
| Memory and disk growth | **UNRESOLVED** | `rss_mb`, `db_mb`, `bars` per minute |
| GMGN history depth; `open_timestamp` meaning | **UNRESOLVED** | `gmgn-probe.json` (7/30/60/90 days; open vs migration time) |
| Jupiter price coverage, quote fields, timing | **UNRESOLVED** | `jupiter-probe.json`. The `/order` response schema beyond `inAmount`/`outAmount`/`feeBps`/`router` was not retrievable from this workspace; the client records the keys actually returned. |
| Jupiter `firstPool.createdAt` vs token creation | **UNRESOLVED** | treated as a lower bound on age and labelled on every entry |
| GMGN key is on the Free plan (5 weight/s) | **PASS** | plan page + `x-ratelimit-limit: 5` (owner's key, 20 Nov) |
| Canonical-pool derivation | **PASS** | 2,900 comparisons against the standard Solana library, 0 mismatches |

Until the reserve rows pass, the dashboard tile reads **UNVALIDATED** and no result should be called verified.

## 7. What is ready, and what is not
**Ready:** the PumpSwap live path; the Solana-wide sampled path (against a simulated provider); the 448-row dashboard with method filters; the one-command validation run.
**Remaining, in order:**
1. Owner runs `bash older/scripts/validate.sh 10` on the server (read-only; about 15 minutes). Results publish themselves to branch `older-validation`.
2. Review the evidence; fix whatever fails; run the remaining 50 minutes.
3. Owner: Jupiter developer account and plan (§5). Until then the adapter runs keyless at 0.5 req/s — enough to test, not to run.
4. Start the seven-day paper run.

**Known limits that are not blockers:** no complete start-up inventory of existing non-PumpSwap coins (coverage grows forward from the first day); HH-BREAK unavailable for sampled tokens; LIQ25K impact evidence missing for sampled tokens; the server's memory headroom is unmeasured.
