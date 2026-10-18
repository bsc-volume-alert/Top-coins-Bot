# Analysis pipeline (run on each /csv export)

```
unzip tracker_export_<date>.zip -d analysis/data && cd analysis && for f in [0-9]*.py; do python3 -I $f; done
```
(rename the dated files to `paper_trades.csv`, `token_life.csv`, `wallet_buys.csv`, `big_buys.csv`, `tokens.csv` first — `30_` writes `data/wide.pkl` used by `31_` and `32_`.)

## Rules every analysis must follow (learned the hard way on day one)
1. **Exclude `invalid=1` rows** (decode artefacts) before any aggregate.
2. **Never use closed-only subsets for exit statistics.** Open trades past their hold limit are dead tokens and restart orphans; the sweeper (v0.15.3) closes them at the real price. Until an export has `exit_reason='sweep'` rows for the period, treat exit averages as optimistic.
3. **Entry-time features only.** `buys`, `sells`, `mc_5m`, `mc_15m`, `buyers_5m`, `after_peak_*`, `graduated` are recorded AFTER entry — using them to "predict" is leakage. Entry-time columns: `entry_*`, `inflow_*`, `bundle_*`, `handoffs`, `tier`, `factory`, `dev_buy_sol`, `snipers`, `creator_*`, `hour_utc`, `bs_ratio_entry`, `buyers_entry`, `buys_entry`, `sells_entry`, `proven_entry`, `cluster_held_pct`, `vol5m_usd`/`vol1m_usd` (momentum).
4. **Honest replay beats paper exits for entry questions:** `token_life` checkpoints let you enter at +60s/+5m/+15m with only what was known then and measure forward peak / 1h / 2h value. Sparse checkpoints understate peaks, so forward "hit 2x" is a lower bound; forward 1h/2h value is exact.
5. **Costs:** assume 10% round trip on curve entries (1% fee each way + slippage + 1–2s latency on a moving curve), 5% on PumpSwap.
6. **Wallet "2x" is meaningless** (74% of early buys 2x from the floor price). Use 5x (base ≈25%) and 10x; exclude cluster wallets and 0-second buys.
7. **Creator "prior 2x" is meaningless** — use prior graduations.
8. **Any model: time-split (train early / test late), report AUC and the EV of the top decile on the test half only.** A within-sample rule that looks good is not a finding.
9. **Report sample sizes with every rate.** n<30 is an anecdote.

## v0.18 notes
- `paper_trades.venue` (pumpswap / raydium-cpmm / raydium-clmm / raydium-launchlab / meteora-dlmm / orca) says which feed produced the triggering swap. Momentum rows with a non-PumpSwap venue have wallet counts ≈ transaction counts (CPMM, LaunchLab and Orca events carry no wallet; placeholder `tx:<sig>`), so `q_wallets`, `q_per10k`, `buyers_entry` and `q_new_pct` are not comparable with PumpSwap rows — split by venue before comparing.

## Pre-registered hypotheses — Project 2, written 16 Oct 2026 09:30 UTC (v0.18.17)
Made on the 52 core momentum trades with both `x_t15s40` and `x_flow4` recorded (entries 15 Oct 10:49 → 16 Oct 06:04 UTC, scratchpad run13). **Test only on trades entered after the v0.18.17 deploy** (`core=1`, `entry_utc` > deploy time). Each line states the claim, the number it was made on, and what would confirm or kill it on ≥50 new trades. Project 2 = flow4: core entry, −40% hard stop before 1.5x, then hold while 5m vol ≥ $100K and buy$ ≥ sell$, voluntary sell at 4x, 50% trail backstop.

Baseline on the 52: win 48%, avg +19% (net +13% at 5% costs), 8 trades ≥2x, 3 at the 4x cap; drop the best trade and avg is +2%.

**Claimed to separate winners from losers (confirm if the gap holds in the same direction; kill if it closes or flips):**
1. **1m volume at entry ≥ $40K** (`vol1m_usd`): 19 trades, win 53%, avg +54%, 32% reached ≥2x — vs 33 trades below: win 45%, avg −1%, 6% ≥2x. Confirm: ≥+25pt gap in avg return on ≥15 trades each side. Kill: gap under 10pt or reversed.
2. **Age at entry < 10 min** (`age_s` < 600): 38 trades, win 53%, +33%, all 8 big wins — vs 14 older: win 36%, −17%, no big wins. Confirm: older group still produces ≤10% ≥2x and negative avg.
3. **Combination (tag `core_v40` = 1m vol ≥ $40K AND age < 10 min)**: 17 trades, win 59%, avg +69%, 35% ≥2x; the other 35 trades: −4%. This is the headline claim and the most likely to shrink — 6 big wins is the whole evidence. Confirm: core_v40 avg ≥ +30% and ≥ 2× the non-v40 avg on ≥20 tagged trades.
4. **Top-10 holder share < 30%** (`top10_entry`): 30 trades, win 53%, +31% — vs ≥30%: 22 trades, 41%, +3%. Missing on 12/52 (non-SOL pools, Raydium). Weaker claim.
5. **Fast-fail exit** (`x_flow4ff`: sell at the first tick ≥120 s after entry if price < 0.90× entry, else = flow4): on the 20 trades with path marks it triggered 6 times, all 6 were flow4 losers, avg +13% → +17%. Confirm: `x_flow4ff` avg ≥ `x_flow4` avg AND ≤1 in 5 of its triggers were flow4 winners. Kill: it fires on ≥30% of eventual winners.

**Claimed NOT to separate (confirm = still no gap; a gap appearing on new data is itself a finding to re-check):** entry MC (all ≈$55K), 5m volume at entry (all ≈$100K by construction), raw buy/sell $ ratio (`bs_ratio_entry`, pinned 1.00–1.14 — see below), buyers/wallets in 5m, bundle % at launch (and the 3 unbundled coins all lost), bundle still held at entry, largest holder %, creator fees accrued (≈1% of volume), dev fee claims before entry (7 trades only), dev buy SOL. Heavily bundled "factory" coins (bundle ≥60% and still held ≥60% at entry, 13 trades) performed like the rest (+22%) but hold both wipeouts (<0.3x) — downside shape, not a filter.

**Measurement notes that came out of this pass:**
- Raw buy/sell $ ratio and sell share sit at ~1:1 / 47–53% on every coin at every mark, including coins that 4x'd in 5 minutes. Decoder is right (buy/sell are separate on-chain events); the volume is dominated by paired bot trades (sandwich/arb). v0.18.17 records `bs_clean_entry` / `bot_share_entry` and `cs`/`bot`/`cv` in the path marks with wallets that buy and sell within 2 s removed. Until the clean figures are in, treat the buy≥sell half of the flow exit as noise. The flow rule itself is unchanged for now so the test set is comparable.
- `cluster_out_entry`/`churn_entry` were never filled on momentum rows (copy trades only). Filled from v0.18.17.
- Holders (`top10_entry` etc.) missing on non-SOL-quoted pools and Raydium; a GMGN fallback is planned.

**Added 16 Oct 11:30 UTC (v0.18.19), untested, no prior claim:** `dex_paid` / `dex_paid_lead_s`, `snipers_n` / `snipers_held_pct`, `fresh_share`, `proven_vol_share`. Treat the first read of each as exploratory; a split that appears on <30 trades is a hypothesis for the next day, not a result.

## Project 3 — pre-registered 16 Oct 2026 16:00 UTC (v0.18.22)
**Entry:** core trigger ($100K/5m, MC < $100K, first entry) + 1m volume ≥ $40K + age < 10 min (`core_v40`).
**Exit (`x_split`):** at +120 s: < 0.90× → sell; ≥ 1.20× → hold with 40% trail from peak, cap 4x; else half at 1.5x, rest on the same trail. −40% hard stop before +120 s.
Built on the 33 path-marked core trades of 15–16 Oct (trail approximated by `x_tsl40`): all 33 → +23% avg / 48% win (flow4 +5%, P1 +7%); with the entry filter, 13 trades → +48% / 54% win; the 20 dropped → +6%. Branches: fast-fail 9 trades −28%, runner-hold 13 trades +77% (69% win), middle 11 trades −1%. Thresholds 0.90 / 1.20 / 40% chosen on this data.
**Test only on trades entered after this deploy.** Confirm: `x_split` avg ≥ `x_flow4` avg + 10pt on ≥40 trades, runner-hold branch avg ≥ +30%, fast-fail branch still ≤ 1 winner in 5. Kill: `x_split` ≤ `x_flow4` on ≥40 trades, or runner-hold branch avg < +10%.
Record of today's correction: `HellCat`, `ALIENCY`, `bottle.capital` predate the flow rule and were sweeper-filled; excluded from all Project 2 figures from now on (P2 all-time on 62 proper trades: +12%, net +7%, 48% win).

## Project 3 — result on its test (16 Oct 20:07 UTC export)
19 trades after 16:00 UTC: win 21%, avg −20%, net −1.12 SOL at 0.25. Killed. Cause: the 40% trail gives back gains on coins that peak at 1.5–2.5x (MUSK Index, Glow, Farting Tesla Roadster, ref: P1 1.5x, P3 0.83–1.11x). Every trailing variant is negative on all 80 trades (−5% to −8%). Kept recorded for comparison only.

## Project 4 — pre-registered 16 Oct 2026 21:00 UTC (v0.18.32)
**Rule:** core trigger → wait 60 s → buy at the price then only if it is above the trigger price → sell at 1.5x, −40% stop (also scored: runner, split, dead-coin).
**Built on:** 80 core trades, 15–16 Oct. 28 entry-time factors tested with a both-halves rule (gap ≥12pt in the same direction in the first 40 and last 40 trades); only creator fees accrued at entry passed (above 9 SOL: 40% win vs 60%). Post-trigger path on the 52 trades with marks: above trigger at +60 s → 79% reached 1.5x before −40% (28 trades); below → 12% (24). Estimated P4 with a pessimistic score (anything not clearly reaching 1.5x from the later entry counted as −40%): 28 of 51 trades taken, 64% win, +18% avg, +0.84 SOL vs −0.46 for buying at the trigger; on the 29 test trades after 08:29 UTC: 18 taken, 61% win, +15%, +0.42 vs −0.32. Threshold-insensitive (1.00 / 1.05 / 1.10 give the same result).
**Caveat:** the same first-minute signal underlies the 2-minute fast-fail found on day one, so this is not wholly fresh evidence; the runner exit gets worse under a later entry (≈ +6%), so P4 is scored on P1's exit.
**Confirm** on ≥40 `momconf` trades: win ≥ 55% and avg ≥ +10% on `x_t15s40` after costs, and the skipped triggers' P1 average below 0. **Kill:** P4 avg ≤ the core trades' P1 avg over the same period, or win < 50%.
Also to test from this export onward (recorded, not gated): creator fees accrued ≥ 9 SOL at entry (worse); bundle still holding ≥ 70% at entry (deeper losses when it fails — 3 of the 5 trades that dumped through the stop).

## Project 1 filtered — pre-registered 16 Oct 2026 21:10 UTC (v0.18.33)
**Rule:** core trigger AND (stock-token-quoted PumpSwap pool OR entry MC < $47K) → sell at 1.5x, −40% stop.
**Built on** 80 core trades with 45 entry-time features, each tested at three cut-points for the same gap (≥15pt) in both halves. On SOL pools, entry MC < $47K: 72% reached 1.5x first (18 trades) vs 38% (45); stock-quoted pools: 67% (15) vs 48% on SOL pools. "Creator fees accrued" also passed but is mostly an artefact (fees only counted from first sight; stock pools convert differently) — not used. Filtered P1 on the 80: 35 trades, 66% win, +18% avg, +1.02 SOL at 0.25; on the 29 trades after 08:29: 13 trades, 69%, +22%, +0.51.
**Test:** the next 40 filtered trades (book starts at this deploy). **Confirm:** win ≥ 60% and net > 0 after 5% costs. **Kill:** win < 55% or net ≤ 0 — Project 1 is then removed.

## Project 2 filtered — pre-registered 16 Oct 2026 21:25 UTC (v0.18.34)
**Rule:** core trigger AND (≤ 600 distinct wallets in the 5-min trigger window OR stock-token-quoted pool OR entry MC < $47K) → runner exit unchanged (`x_flow4`: hold while 5m vol ≥ $100K and buys ≥ sells, cap 4x, −40% before 1.5x, 50% trail).
**Built on** the same 80 core trades. "Crowd size" (holders, wallets in 5m, buyers 30m before, launch buyers — ~0.9 correlated) was the robust P2 factor: ≤ 600 wallets +29% avg vs −1%, both halves. Launch outside SOL ≤ 165 also passed but is updated for 30 min after launch (72 of 80 entries were inside that window → look-ahead risk) and selected exactly the same trades once wallets and the P1 filter were in, so it is not used. Filtered P2 on the 80: 51 trades, 57% profitable, +27% avg, +2.66 SOL at 0.25 (h1 +36%, h2 +17%); P1's exit on the same 51: +1.07. On the 29 test trades after 08:29: 19 trades, +20%, +0.65 vs P1's exit +0.68 — no edge for the runner out of sample.
**Test:** the next 40 filtered trades (book starts at this deploy). **Confirm:** net > 0 after 5% costs AND P2 net ≥ P1's exit on the same trades. **Kill:** net ≤ 0, or P1's exit beats it on the same trades — Project 2 is then dropped and "small crowd" is offered to Project 1's filter as a fresh pre-registered test.

## Project 5 — fast trigger, pre-registered 16 Oct 2026 21:45 UTC (v0.18.35)
**Rule (the owner's idea):** buy the first time a coin trades ≥ $100K inside any 2-minute window, coin ≥ 60 s old, buy $ ≥ sell $ in that window, ≥ 5 wallets, no market-cap cap, one trade per coin (strategy `mom2m`). Main exit `x_h2t40`: −40% stop from entry until 2x; at 2x sell half; the other half on a 40% trailing stop, no cap. Also recorded: `x_t15s40` (1.5x / −40%). `x_h2t40` is also recorded on core trades for comparison.
**Prior evidence (against):** on 79 core 5-minute trades only 26 (33%) reached 2x before −40%; "half at 2x + 40% trail" estimated ≈ −0.20 SOL at 0.25 even with a generous trail fill; a plain 40% trail −2.55. The 2-minute trigger selects hotter coins earlier, which is the untested hope.
**Test:** first 40 `mom2m` trades. **Confirm:** `x_h2t40` net > 0 after 5% costs and ≥ 35% of trades reach 2x before the stop. **Kill:** net ≤ 0 or 2x rate < 30%. Market cap at entry recorded on every trade to check whether a cap would have helped (exploratory, not part of the test).
**Amended 16 Oct 21:50 UTC (v0.18.36, before any P5 result):** P5 entry capped at MC < $2M; all positions (every project) also exit when 5m volume < $25K. Pass/kill lines unchanged. Earlier pre-registrations are scored on trades from v0.18.36 with this exit included; the comparison books (P2 vs 1.5x) are both affected equally.

**Project 3 — result 16 Oct 23:30 UTC:** killed. 26 trades, −0.32 SOL at 0.25 (P1's exit on the same coins −0.10, P2's −0.02). Price at +60 s split it: above entry 14 trades +0.76, at/below 12 trades −1.08. On the same 26, P2's filter kept 19 (+0.29 P3, +0.53 P1, +0.74 P2) and dropped 7 (−0.61 P3) — about half these trades postdate the filter, so this is partial out-of-sample support for the P1/P2 filters.

## Split exit beside Project 1 — pre-registered 17 Oct 2026 01:30 UTC (v0.18.49)
**Rule:** P1's entry and filter; exit = −40% stop until 1.5x, half sold at 1.5x, other half at 2x or at entry if it falls back. **Evidence:** 95 core trades 15–16 Oct: +0.86 SOL vs −0.27 for P1's exit, positive in both halves (assumes the entry-price stop fills at entry; if the second half instead rides to −40% the same rule is −0.94). P1-filtered trades 16 Oct 22:10–17 Oct 02:15: +0.68 vs +0.39. **Test:** first 40 P1-filtered trades with `x_s15be` recorded. **Adopt as P1's exit** if its net beats `x_t15s40` on the same trades; **drop** otherwise. The recorded second-half fill shows whether the entry-price stop really fills near 1.0x.

## Project 5 retired (fast trigger) and Project 5 early — pre-registered 17 Oct 2026 01:45 UTC (v0.18.50)
**Old P5 result:** 10 closed trades, −0.60 SOL (h2t40); on every coin both triggers fired on, it bought at the same time or later than the core trigger — killed.
**Evidence for early:** on 105 core pumps (15–17 Oct) the first minute with ≥50 SOL bought came a median ~146 s before the $100K/5m trigger, at MC ~$35K (73% between $25–45K, i.e. right after graduation); the trigger price was a median ~1.5x higher. Simulated on those coins: +6.35 SOL vs +0.27 for P1 — **heavily biased**: only coins that later pumped are in the data. Pre-trigger features (buyers, buy sizes, largest-buy share, repeat buyers, bundle, top-10, dev hold) did not separate runners (2x+) from duds consistently in both halves.
**Test:** first 60 `p5e50` trades. **Confirm:** net > 0 after 5% costs on 1.5x/−40% and win ≥ 50%. **Kill:** net ≤ 0. The 30/80 levels and the split exit are compared descriptively; entry features in `early_json` are screened for a rug filter only after 60 trades, with a both-halves check.


## Project 1A / 1B — pre-registered 17 Oct 2026 10:50 UTC (v0.18.55)
**Evidence:** 54 P1-filtered core trades 15 Oct 12:52 → 17 Oct 09:54 (35 won, 15 stopped, 2 rugs, 2 flat; +1.54 SOL at 0.25). Losers grouped: 8 stock/other-token pools, 6 launches ≥ 70% bundled, 1 Raydium (AI Frontier), 2 ordinary SOL coins. Across all bots (8,416 trades since 15 Oct) ≥ 70%-bundled coins rugged through the stop on 28.5% of trades vs 9.5% (both halves: 31% / 28% vs 11% / 8%). Inside P1 they won 5 of 11 (−0.19) vs 30 of 43 (+1.73). SOL-paired, < $47K, not ≥ 70% bundled: 20 trades, 18 won, +1.67 (5 of the 18 wins have unknown bundle — launch not seen). Stock/other-token pools: 21 trades, 12 won, +0.33. Holder panels (top-10, holders, dev hold, snipers, fresh) are unknown for ~half of trades and "unknown" ≈ coin older than 5 min, so they were not used. Age < 5 min was not significant once bundled coins were removed (p = 0.32). 
**Fitted on this data.** **Test:** next 30 trades of each book. **P1B confirm:** win ≥ 65% and net > 0 after 5% costs. **P1A confirm:** net > 0. **If P1B passes and P1A does not beat it per trade, stock pools stay out; if P1A beats P1B in net, stock pools come back.** Old P1 keeps recording for comparison.

## Project 2A / 2B — pre-registered 17 Oct 2026 11:00 UTC (v0.18.56)
**Evidence:** 81 P2 trades 15–17 Oct, +2.88 SOL (runner) of which +0.23 on its 24 live trades. By group: clean SOL coins (P1B-type) 20 trades +3.17 runner vs +1.67 at 1.5x (both halves: +2.38 vs +1.14, +0.79 vs +0.53); stock/other-token pools 21 trades +0.32 vs +0.33; ≥ 70%-bundled under $47K 11 trades −0.63 vs −0.19; old "≤ 600 wallets" extras 27 trades +0.29 (−0.34 live, 20 of 27 bundled, 5 rugs). Holding the runner only when big buys arrived before 1.5x was worse than always holding (both halves). The runner's edge rests on 3–5 big runners (XZON, Roadster League 4x; exponential curve, dots, PEDRO 2x+). **Fitted.**
**Test:** next 30 trades of each. **Confirm:** net > 0 after 5% costs AND net ≥ its P1 twin on the same trades. **Kill:** otherwise — the coins stay with the P1 exit.

## Project 5 early — result 17 Oct 2026 11:00 UTC, and Project 5 v2 pre-registered (v0.18.58)
**Result:** `p5e50` 70 trades, 35 won, 8 rugs, −0.42 SOL → **killed** by its own test (needed net > 0 with win ≥ 50%). 30 SOL: 86 trades −0.85; 80 SOL: 52 trades −1.04.
**Evidence for v2 (02:34–10:49 UK, one window — fitted):** losers concentrate in ≥ 70%-bundled launches (50 SOL: 14 trades, 7 won, 5 rugs, −0.35; rugs all bought at 1 min old with 55–82 holders), launches not seen (6 trades, 0 won, −0.74; 30 SOL: 14 trades −0.98) and crowded bursts ≥ 150 wallets in 60 s (11 trades, 4 won, −0.38, negative in both halves and at every level; on core trades ≥ 150 buyers in the last 60 s: 76 trades −1.00 vs 43 trades +0.46). Remainder: 30 SOL 48 trades, 65% won, +1.45 (halves +1.38 / +0.07); 50 SOL 39 trades, 62%, +1.05 (+0.90 / +0.15). 1.5x beat the runner, split and half-at-2x exits on those trades. When the core trigger later fired (13 coins) P5 got in a median 154 s earlier at ~1.3x lower MC and won 11/13 (+0.87) vs −0.88 for the core trades.
**Test:** next 40 v2 trades. **Confirm:** net > 0 after 5% costs and win ≥ 55%. **Kill:** otherwise.

## Project 6 "sleepers" — started 17 Oct 2026 11:55 UTC (v0.18.60), data collection
**No back-test:** our own feed caught only 4 coins ≥ 6 h old at $300K–$1.5M doing $100K/5m in 45 h (none ran) — but that is our blind spot (old pools unresolved, Meteora unseen), so the GMGN scanner is the main source. Earlier evidence on runner exits (all core $80K–$400K triggers, 38 coins): ½ at 2x + 40% trail +1.08, 60% trail −0.61, 40% trail −1.61, 1.5x −0.28; 10x coins often dipped 40–60% before running. **Plan:** collect ≥ 40 trades, then choose the exit. **Judge:** the chosen exit must be net > 0 after 5% costs and ahead in both halves.

## P5 v3 — pre-registered 17 Oct 19:05 UK
P5 v2 (30 SOL in 60 s, skip unseen / bundled 70%+ / 150+ wallets, 1.5x / −40%) FAILED its test: 54 live trades since 12:20 UK, 48% won, −0.25 SOL
(needed ≥55% and > 0). The skips still helped (no-skip −0.77 on the same window). On the same 107 kept coins since 02:34 UK the P2 runner exit
(x_flow4) made +1.56 SOL, positive in both halves (+0.84 / +0.72) and in the live window (+0.60), vs 1.5x/−40% +1.41 / −0.13. No 4x coin.
P5 v3 = same coins and skips, runner exit, fresh book from 17 Oct 18:05 UTC. Test: 40 trades, net > 0 AND win ≥ 55% (0.25 SOL, 5% costs).
Not adopted (mixed by half): skip bundled 50–70% (live +0.58, morning −0.12) — recorded only.

## P6 v2 — set by the owner 17 Oct 19:04 UK, fresh book from 18:15 UTC
Entry: coin ≥ 12 h old, MC $300K–$1.5M, ≥ $60K traded in 5 min (our feed or GMGN, any Solana DEX incl. Meteora), buys ≥ sells, one per coin per 24 h.
Exits recorded side by side, each with −40% stop and golden rule (sell the rest when 5-min volume < $15K), max 24 h:
A all at 2x · B half at 2x, rest 40% trailing stop (website headline) · C all at 3x · plus the v1 exit (half at 4x, rides 24 h, no stop).
Test: 40 trades; the best exit must be net > 0 in both halves. P6 v1 ($100K, 6 h+) had 3 trades (peaks 2.97x / 2.54x / 1.76x, none reached 4x).
No back-test exists for $60K on older coins (never recorded) — this is data collection first.

### P6 v2 amended 17 Oct 19:11 UK (owner): three volume levels, age from 6 h
$60K / $80K / $100K in 5 min are separate paper trades (p6_tier); minimum age 6 h (age_s recorded; compare 6–12 h vs 12 h+). Exits A / B / C as above.
Recorded per trade for the 50–60-trade review: age, entry MC, 5-min $ in / $ out, GMGN token info + security snapshot (holders, top 10, dev hold and
history, bundler / insider / sniper shares, fresh wallets, rug score, socials), our launch bundle % and dev buy where we saw the launch, source and DEX.

## P7 "slow sleepers" — set by the owner 17 Oct 19:25–19:27 UK
Entry: coin ≥ 6 h old, MC $300K–$1.5M, ≥ $20K (was $50K until 17 Oct 21:02 UK) traded in each of three back-to-back minutes (checked at first sighting, +1 min, +2 min;
our feed or GMGN's 1m list for coins our feed cannot read), GMGN check just before buying: top 10 < 20%, dev (creator / dev team) < 5%,
bundle wallets < 15% (GMGN list bundler hold %, else GMGN info bundler share). One trade per coin per 24 h.
Exits recorded side by side: all at 2x (headline) · all at 3x · all at 4x, each with −40% stop; no time limit — everything left is sold when 5-min
volume < $15K. After the exit the coin is watched 24 h and the highest price is recorded (p7_after_peak).
Test: 40 trades; an exit must be net > 0 in both halves. Expect few trades (strict holder filters).

## Clean line (v0.18.85): all Project 5 live figures and tests count from 18 Oct 2026 06:14 UTC. Earlier P5 data (17 Oct 02:34 UK → 18 Oct 00:20 UTC, 150 live-book trades, +3.08 runner) is reference material with deploy-restart caveats (`restart_span`); 18 Oct 00:20–06:14 UTC is `crashloop=1` and excluded.

## P5 sell rules — pre-registered 18 Oct 2026 13:30 UTC (v0.18.87)
- Candidates recorded on every P5 trade: runner (headline), hold-5 (floor 1.2/1.3/1.4), hold-3, **hold-15 (floor 1.3)**, **fast-starters-run (up 30%+ at 60 s → hold to the position's close; else hold-5)**, 1.5x/−40, 2x/−40, ½ at 2x + 40% trail, hold-to-close. **Rule:** the headline exit changes only to a rule that is ahead of the runner over ≥ 40 live trades since 18 Oct 06:14 UTC and ahead in both halves of those trades. Hold-15 / fast-starters count from their first recorded trade (~13:30 UTC 18 Oct). The 2-minute cut is retired (failed on the first out-of-sample P5 sample and on the core family).

## P5 deviations — pre-registered 18 Oct 2026 00:20 UTC (v0.18.81) · **counts restart 06:14 UTC (v0.18.84)**: the bot crash-looped 00:20–06:14 UTC (restart every ~31 s), so trades in that window carry `crashloop=1` and are excluded from the 40-trade tests and from every website figure. Any analysis of 13–18 Oct data should filter `crashloop=0`; `restart_span` counts restarts (mostly deploys) while a trade was open.
**Evidence (17 Oct, 150 live-book P5 trades, one day, fitted):** runner +3.08 (58% won); 48 stops (32%) are the whole loss; no entry feature separates stops from wins in both halves (MC, burst size, wallets, bundle, age, largest-buy share all matched). Exits on the same trades: 1.5x/−40% +2.50; runner +3.08; runner + 1.3 floor +3.51; 2x/−40% +3.41 (44% won); −25% stop +2.19; −60% +2.14; hold-5 (−40% stop, 1.3 floor after 1.5x, sell at 5 min) **+4.90** (halves +2.60/+2.30; windows +1.42/+0.50/+2.99); on the 50 SOL level +5.83 vs +3.36; on 80 SOL +2.29 vs +2.26. Hold-3 +2.75 (worse than the runner); hold-10 +5.89 but only 47 positions were still tracked at 10 min. Bootstrap: runner ≥ hold-5 in 2.5% of resamples. Floor checked at marks only — the live tick-level floor will fire more often.
**Skips re-checked:** unseen launches 34 trades −1.94, crowd ≥150 wallets 35 trades −0.83 (both negative in both halves), bundled ≥70% 95 trades −1.39 (mixed by half, 48% rugs). Coins that reached 30 SOL but never 50 SOL: 31 trades −1.74.
**Tests (0.25 SOL, 5% costs):**
- **P5 Hold-5:** first 40 live trades from 18 Oct 00:20 UTC. **Adopt as Project 5's exit** if `x_h5` net > 0, beats `x_flow4` on the same trades, and is ahead in both halves; otherwise keep the runner. Floor variants and hold-3 are descriptive only.
- **P5 Wide:** first 40 trades on the extra coins ($100K–$250K). **Keep** if net > 0 and win ≥ 55%; **kill** otherwise. No prior evidence.
- **P5 Strict (50 SOL):** next 40 trades. **Confirm** if net > 0, win ≥ 55% and net per trade ≥ Project 5's on the same window; otherwise it stays a comparison line.

## P6 v3 — pre-registered 18 Oct 2026 13:30 UTC (v0.18.88)
**Evidence (wake-up log, 18 h, 304 wake-ups ≥ $100K/5m; P6 v2 11 clean coins):** v2 A +0.66 / B +0.52 / 1.5x +0.41 on 11 coins; golden rule ($15K = 3.6% of MC) closed 8 of 11 inside 2 h, El Gato sold 1.23x then 5x. Wake-ups 6–72 h old at $300–600K: **36% reached 2x** from the wake-up, 27% fell to 0.6x first, ~15 a day; over $600K or over 3 days old: 0 doublers; 1–6 h old: 93% stopped; 5-min volume under 10% of MC: 0 doublers. P7: 5 trades +0.06, its holder check and 3-minute streak were never tested on enough coins.
**Rule:** 6–72 h · $300K–$600K · 5-min vol ≥ $60K and ≥ 10% of MC · buys ≥ sells · one per coin per 24 h. Exit: −40% stop until 2x · ½ at 2x · rest 50% trail from peak · 6 h · no golden rule. Flags recorded, not used: holders clean, sustained volume, first source.
**Expectation (declared before the first trade):** ≈ +0.025 SOL per trade at 0.25 and 5% costs (≈ +0.4 SOL/day), win rate ≈ 40%; one 5x in the sample roughly doubles the result. The honest alternative is that the 36% doublers were mostly coins the rule's 10%-of-MC and buys ≥ sells filters remove, and the live figure is flat.
**Test:** first **30 closed v3 trades**. **Go to a live trial at 0.25** if `x_p6v3` net > 0, positive in both halves, and ahead of A (all at 2x) on the same trades; **keep as paper and revisit** if net > 0 but one half negative; **cut** if net ≤ 0. The flags (clean / sustained / source) are descriptive at 30 trades — a flag becomes a filter only after it is ahead over 40 trades and both halves, like the P5 sell rules.

## P6 v2 — review 18 Oct 2026 00:50 UTC (v0.18.82)
14 trades on 7 coins (one evening): A +1.12 (11 won), B +0.97, C +0.55, old +0.48; first level per coin A +0.81. 4 of 7 reached 2x while held, 0 reached 3x. Golden rule closed 9 of 14; El Gato (5x two hours after a 1.2x golden-rule sale on a one-pool volume reading) cost more than the whole result. Candidates: 5 in-band wake-ups in 7 h of the volume log. Decision: headline exit A; DexScreener all-pool volume referee; **judge at 20 coins (first level per coin)** — ≥ +0.10 per coin and positive in both halves → live trial at 0.25; otherwise cut. Not changed: age, MC band, levels, rebuy.
