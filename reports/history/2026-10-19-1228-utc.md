# 4-hour study — 19 Oct 2026 13:28 UK

**Data push:** 13:07 UK (fresh). First real study: 753 triggers since the price fix (18 Oct 20:25 UK) to 19 Oct 13:05 UK. A: 238 fired, 101 passed the website's filters, 100 closed. C 33 · D 80 · 80-SOL 45 · E 31 passed. Live legs 88, shadow legs 60.

**Since the last study (there was none — this covers everything):** the executor traded A and B live from 00:00 to about 10:30 UK and lost **−0.677 SOL on 88 live legs** (A −0.376 on 38, win 45%; B −0.301 on 50, win 42%); the wallet shows 1.025 SOL. Every book is in **shadow** since about 10:00 UK (A, B, C, D all on, 0.1 SOL; B 0.05); shadow since then is +0.152 SOL on 60 legs, nearly all of it in one hour (12:00–13:00 UK, +0.17). Nothing broke, but three things are missing from the data: the GMGN gi_*/gs_* columns are **not in the file at all** (0 columns, not just empty — the rate-limit fix has not reached the dump); smart_wallets.csv is empty (0 bytes), so S6 cannot be judged; and the trace / path / heat / creator columns exist on only 44 rows (from 12:08 UK), so every "after entry" table below is thin. The S books have 15 rows, all from 13:02–13:05 UK — three minutes of data.

**Is the winning formula visible?** Not for the A book as traded: at what the bot pays (the price 5 s after the trigger, +2%) and the measured sale costs, A's runner is **−2.9% a trade on 100 trades**, and live did worse (−9.9% a trade). Two things ARE visible and both are hypotheses until they hold on new trades: (1) in the A book, coins whose launch bundle was 1–3 wallets won 85% of the time (33 trades) against 40% for the rest (67) — registered as **F1**; (2) in launches.csv, **bundled launches** (tier 1, 604 in 24 h) are the one launch-time tell that clears the 10% sniper cost by a wide margin, the opposite of what the website's bundle skip and the S4 "clean launch" book assume — registered as **F2**. Project S itself is unjudgeable yet (15 rows, 3 minutes).

## What the data says
## Data
Triggers since the price fix: **753** (2026-10-18 19:25:36 → 2026-10-19 12:05:00 UTC). A: 238 fired, 101 passed the filters, 100 closed. C passed: 33 · D passed: 80 · E ($100K/5 min) passed: 31. Live legs: 88 · shadow legs: 58.
Skipped by the filters: launch not seen 110 · 150+ wallets 141 · not SOL-paired  114 · bundled 70%+ 82.

## Sell rules on A's coins, then C / D / E (paper, before costs → net at 0.1 SOL with the measured costs)
| rule | n | avg/trade | net @0.1 | win | stopped | ≥2x |
|---|---|---|---|---|---|---|
| A runner (live rule) | 100 | +8.5% | +0.1% | 55% | 38% | 6% |
| sell at 5 min (B) | 100 | +3.5% | -4.9% | 57% | 35% | 4% |
| sell at 3 min | 100 | +8.0% | -0.4% | 55% | 28% | 5% |
| sell at 15 min | 100 | +2.1% | -6.3% | 56% | 37% | 2% |
| 5 min, floor 1.4 | 100 | +6.7% | -2.0% | 57% | 35% | 4% |
| 1.5x / −40% | 100 | +8.2% | +0.1% | 57% | 37% | 0% |
| C coins, runner | 33 | -8.9% | -16.2% | 39% | 45% | 0% |
| D coins, runner | 80 | +7.2% | -1.3% | 49% | 40% | 4% |
| E ($100K in 5 min) runner | 31 | +14.2% | +5.3% | 45% | 45% | 6% |
| E 1.5x / −40% | 31 | +8.1% | -0.1% | 55% | 45% | 0% |
| E sell at 5 min | 31 | +18.5% | +8.8% | 52% | 42% | 3% |
| E sell at 3 min | 31 | +14.3% | +5.0% | 48% | 42% | 3% |
| E 2x / −40% | 31 | +12.7% | +3.9% | 39% | 61% | 39% |
| E ½ at 2x + 40% trail | 31 | +15.4% | +6.4% | 39% | 61% | 10% |

## Time of day (UK) — A's coins
| band | n | runner | 5-min | 3-min | runner win |
|---|---|---|---|---|---|
| 00–06h | 44 | +4.4% | +1.5% | +5.0% | 52% |
| 06–12h | 25 | +5.7% | -0.1% | +11.9% | 52% |
| 12–18h | 2 | +11.3% | -9.2% | -13.4% | 50% |
| 18–24h | 29 | +17.0% | +10.5% | +10.7% | 62% |

## Live vs paper — the same trades
| book | n | live SOL | paper SOL (0%) | entry gap | exit gap |
|---|---|---|---|---|---|
| B | 50 | -0.301 | +0.041 | +1.7% | -3.2% |
| A | 38 | -0.376 | +0.081 | +0.6% | -6.1% |

| book · exit | n | live SOL | paper SOL | exit gap |
|---|---|---|---|---|
| B · h5 | 22 | -0.176 | -0.037 | -1.2% |
| B · time | 10 | +0.063 | +0.119 | -2.2% |
| B · stop | 9 | -0.247 | -0.187 | -5.5% |
| B · floor | 8 | +0.036 | +0.100 | -6.0% |
| B · close:tsl80 | 1 | +0.023 | +0.046 | -16.9% |
| A · flow4 | 5 | -0.048 | +0.007 | -4.0% |
| A · paper-close:lowvol | 1 | +0.008 | +0.015 | -1.7% |
| A · stop | 12 | -0.592 | -0.500 | -8.8% |
| A · fade-volume | 11 | +0.344 | +0.455 | -1.3% |
| A · close:lowvol | 8 | +0.010 | +0.064 | -1.4% |
| A · close:tsl80 | 1 | -0.098 | +0.040 | -79.3% |

## Shadow vs paper — the same trades
| book | n | shadow SOL | paper SOL (0%) | entry gap | exit gap |
|---|---|---|---|---|---|
| B | 39 | -0.123 | +0.196 | +5.6% | -3.0% |
| C | 3 | +0.037 | +0.028 | -3.8% | +2.7% |
| D | 9 | +0.132 | +0.043 | -9.5% | -7.5% |
| A | 7 | +0.086 | +0.116 | +5.2% | +5.0% |

| book · exit | n | shadow SOL | paper SOL | exit gap |
|---|---|---|---|---|
| B · h5 | 29 | -0.019 | +0.214 | -2.0% |
| B · paper-close:lowvol | 1 | -0.002 | +0.002 | -0.4% |
| B · stop | 3 | -0.064 | -0.061 | +3.6% |
| B · time | 3 | -0.035 | +0.004 | -11.6% |
| B · floor | 3 | -0.003 | +0.038 | -12.3% |
| C · fade-volume | 2 | +0.066 | +0.069 | -3.5% |
| C · stop | 1 | -0.029 | -0.040 | +15.1% |
| D · stop | 4 | -0.176 | -0.168 | -22.7% |
| D · close:lowvol | 1 | +0.060 | -0.009 | -0.3% |
| D · fade-volume | 4 | +0.247 | +0.220 | +5.9% |
| A · stop | 3 | -0.125 | -0.127 | +3.4% |
| A · fade-volume | 4 | +0.211 | +0.242 | +6.2% |

## When to sell — the price path after entry (A's passed coins with a trace, n 9)
| seconds after entry | n | avg | median | above entry | net if sold here @0.1 | stopped before (−40%) | 1.5x by then | net: sell here or at the stop |
|---|---|---|---|---|---|---|---|---|
| 10 | 9 | -0.2% | 1.021 | 67% | -7.1% | — | — | — |
| 20 | 9 | +1.6% | 0.977 | 33% | -5.4% | — | — | — |
| 30 | 9 | -2.6% | 0.959 | 44% | -9.3% | — | — | — |
| 40 | 9 | +1.3% | 1.052 | 67% | -5.7% | — | — | — |
| 50 | 9 | +2.3% | 1.004 | 56% | -4.7% | — | — | — |
| 60 | 9 | +2.3% | 1.089 | 56% | -4.7% | — | — | — |
| 120 | 9 | -6.3% | 0.947 | 22% | -12.7% | — | — | — |
| 180 | 9 | -17.4% | 0.792 | 22% | -23.1% | — | — | — |
| 300 | 7 | -24.8% | 0.843 | 14% | -30.0% | — | — | — |
| 600 | 7 | -52.7% | 0.340 | 14% | -55.9% | — | — | — |
| 900 | 2 | -72.9% | 0.410 | 0% | -74.8% | 100% | 50% | -45.9% |
| 1200 | 2 | -81.2% | 0.267 | 0% | -82.5% | 100% | 50% | -45.9% |

| state at 60 s | n | avg at 5 min | runner | 5-min | 3-min |
|---|---|---|---|---|---|
| up ≥20% at 60 s | 3 | -1.7% | +64.6% | +25.0% | +22.2% |
| flat (0.9–1.2) at 60 s | 3 | -15.7% | -33.8% | -31.4% | -15.2% |
| down <0.9 at 60 s | 3 | -50.9% | -41.7% | -41.7% | -41.7% |
| new buyers ≥10 by 60 s | 9 | -24.8% | -3.7% | -16.0% | -11.5% |
| new buyers <5 by 60 s | 0 | — | — | — | — |
| more sold than bought by 60 s | 5 | -50.9% | -37.1% | -35.7% | -30.0% |
| holders up by 5 min | 3 | +6.3% | +26.2% | +3.3% | +7.2% |
| holders down by 5 min | 2 | -72.3% | -42.5% | -42.5% | -42.5% |

## Entry features — A's passed coins split at the median (runner result; spread = top half minus bottom half)
| feature | n | median | bottom half | top half | spread |
|---|---|---|---|---|---|
| fs5_x | 100 | 0.995 | -11.9% (win 38%) | +29.0% (win 72%) | +40.9% |
| max_share | 100 | 0.103 | -2.3% (win 44%) | +19.4% (win 66%) | +21.7% |
| bundle_wallets | 100 | 5 | +19.0% (win 70%) | -1.9% (win 40%) | -21.0% |
| fs1_x | 100 | 1.002 | -1.4% (win 46%) | +18.4% (win 64%) | +19.8% |
| bundle_pct | 100 | 28 | +18.4% (win 68%) | -1.3% (win 42%) | -19.7% |
| dev_hold_entry | 54 | 0 | +9.5% (win 63%) | -5.3% (win 41%) | -14.7% |
| top10_entry | 98 | 24.25 | +0.4% (win 45%) | +13.6% (win 63%) | +13.2% |
| age_s | 100 | 759 | +2.3% (win 54%) | +14.8% (win 56%) | +12.5% |
| outside_buyers | 100 | 292 | +12.8% (win 58%) | +4.3% (win 52%) | -8.5% |
| dev_buy_sol | 100 | 1.185 | +5.2% (win 52%) | +11.9% (win 58%) | +6.6% |
| sell60 | 100 | 29.07 | +11.4% (win 60%) | +5.6% (win 50%) | -5.8% |
| entry_mc | 100 | 45927.363 | +6.0% (win 50%) | +11.0% (win 60%) | +5.0% |
| largest_entry | 98 | 3.446 | +5.0% (win 49%) | +9.1% (win 59%) | +4.2% |
| wal60 | 100 | 69 | +10.3% (win 62%) | +6.8% (win 48%) | -3.5% |
| n60 | 100 | 81 | +8.0% (win 60%) | +9.1% (win 50%) | +1.0% |
| avg_buy_sol | 100 | 0.456 | +8.1% (win 50%) | +9.0% (win 60%) | +0.9% |
| holders_entry | 54 | 219 | +1.8% (win 52%) | +2.4% (win 52%) | +0.7% |
| feed_lag_ms | 100 | 1069 | +8.3% (win 52%) | +8.8% (win 58%) | +0.5% |
| sol60 | 100 | 32.5 | +8.5% (win 58%) | +8.6% (win 52%) | +0.1% |

Quartiles of the five widest spreads:
- **fs5_x**: 0.58–0.94: -14.7% (n 25) · 0.94–0.99: -9.1% (n 25) · 0.99–1.07: +15.7% (n 25) · 1.07–1.48: +42.3% (n 25)
- **max_share**: 0.03–0.07: -15.5% (n 25) · 0.07–0.1: +10.9% (n 25) · 0.1–0.16: +24.4% (n 25) · 0.16–0.54: +14.4% (n 25)
- **bundle_wallets**: 1–3: +26.5% (n 25) · 3–5: +11.5% (n 25) · 5–7: -6.9% (n 25) · 7–13: +3.0% (n 25)
- **fs1_x**: 0.68–0.96: -3.1% (n 25) · 0.97–1: +0.4% (n 25) · 1–1.04: -9.6% (n 25) · 1.04–1.39: +46.4% (n 25)
- **bundle_pct**: 0–17.88: +21.0% (n 25) · 18.55–27.99: +15.8% (n 25) · 28–39.41: -7.8% (n 25) · 39.49–70: +5.2% (n 25)

## Realistic exits — each rule priced off the 5-s path 10 s after it fired, minus the measured costs (A's passed coins)
| rule | fired | median fire (s) | paper avg | path 10 s later | realistic net @0.1 | falling at the fire |
|---|---|---|---|---|---|---|
| flow4 | 2 | 236 | +11.3% | +19.3% (n 2) | +8.8% | 0% |
| flow4 · stop | 1 | 83 | -41.9% | -19.7% | | |
| flow4 · fade-volume | 1 | 236 | +64.4% | +58.2% | | |
| h5 | 2 | 275 | -9.2% | +13.1% (n 2) | +3.1% | 0% |
| h5 · stop | 1 | 83 | -41.9% | -19.7% | | |
| h5 · floor | 1 | 275 | +23.5% | +45.8% | | |
| h3 | 2 | 180 | -13.4% | +6.4% (n 2) | -2.1% | 0% |
| h15 | 2 | 275 | -9.2% | +13.1% (n 2) | +3.1% | 0% |
| h5f14 | 2 | 275 | -5.2% | +13.1% (n 2) | +3.1% | 0% |
| t15s40 | 2 | 216 | +4.1% | +19.5% (n 2) | +10.1% | 0% |
| t2s40 | 2 | 340 | -41.8% | -33.1% (n 2) | -39.6% | 50% |
| h2t40 | 2 | 340 | -41.8% | -33.1% (n 2) | -39.6% | 50% |
| split | 2 | 123 | -28.5% | -9.6% (n 2) | -17.0% | 0% |
| tsl40 | 2 | 97 | -27.2% | -16.0% (n 2) | -23.0% | 0% |

## Does the path predict the real sale?
No live leg yet has both a real sale and a path-stamped exit (the new columns are recorded from 19 Oct 12:08 UK).

## Money management — A's live rule, paper at the cost model, in trade order (n 100)
| net/trade | win rate | avg win | avg loss | worst losing streak | max drawdown (× stake) | total (× stake) | coin went to ≤0.2 | coin went to ≤0.05 | Kelly | half-Kelly stake on 1.5 SOL |
|---|---|---|---|---|---|---|---|---|---|---|
| +0.1% | 49% | +41.3% | +39.5% | 5 | 3.32 | 0.06 | 6% | 0% | 0.2% | 0.001 SOL |

| stake | net/trade (fees scale) | total SOL | max drawdown SOL |
|---|---|---|---|
| 0.05 | -3.5% | -0.176 | 0.279 |
| 0.1 | +0.1% | 0.006 | 0.332 |
| 0.25 | +2.2% | 0.553 | 0.611 |
| 0.5 | +2.9% | 1.465 | 1.177 |

## Clustering — are the trades independent? (A's live rule, paper)
| | n | avg | win |
|---|---|---|---|
| after a winning trade | 54 | -0.6% | 48% |
| after a losing trade | 45 | +19.2% | 62% |
| within 10 min of the previous trigger | 63 | +7.6% | 54% |
| more than 10 min after | 37 | +10.1% | 57% |
| busy hours (6+ passed A triggers) | 67 | +12.1% | 58% |
| quieter hours | 33 | +1.4% | 48% |
Hours with at least one A trigger: 17 · triggers per such hour: median 5, max 11. Treat the hour, not the trade, as the independent unit when judging a rule.

## Project S — paper snipers (bought in the first seconds of a launch; 10% round-trip costs)
| book | n (closed) | entry MC · delay | reached 1.5x · 2x · 5x | 1.5x/−40% net | 2x/−40% net | runner net | 3-min net | 5-min net | 40% trail net | ½ at 2x + trail |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 7 (5) | $4K · 1 s | 80% · 40% · 20% | +0.6% (won 60%) | -25.8% (won 20%) | -49.0% (won 0%) | -14.8% (won 60%) | -14.8% (won 60%) | -32.3% (won 20%) | -32.5% (won 20%) |
| S2 | 3 (0) | $5K · 11 s | — · — · — | — | — | — | — | — | — | — |
| S5 | 5 (0) | $6K · 7 s | — · — · — | — | — | — | — | — | — | — |

## Strategy register — proposed earlier, scored on the trades that came after
| id | rule | proposed | in-sample | out of sample | baseline (all trades since) | verdict |
|---|---|---|---|---|---|---|
| S1 | sell at 3 minutes instead of 5 (from 84 post-fix trades: +10.1% vs +5.0%) — no filter, exit x_h3 | 2026-10-19T09:30Z | +1.4% (n 91) | -18.6% (n 9) | -18.6% (n 9) | waiting (9/40 trades) |
| S2 | fewer than 65 wallets in the trigger minute (from 49 live coins: 72% win vs 38%) — wal60 <= 65, exit x_flow4 | 2026-10-19T09:30Z | +3.9% (n 46) | -49.4% (n 2) | -11.2% (n 9) | waiting (2/40 trades) |
| S3 | one buyer took more than 10% of the trigger minute's buying (from 49 live coins: 75% win vs 36%) — max_share > 0.1, exit x_flow4 | 2026-10-19T09:30Z | +12.4% (n 50) | -3.2% (n 3) | -11.2% (n 9) | waiting (3/40 trades) |

### Study's own tables

**A's runner priced at what the bot actually pays** (entry = the 5-s price × 1.02, sale at the measured cost by exit kind; 100 passed trades): runner **−2.9%** a trade (paper +0.1%), 5-min sell −6.8% (paper −4.9%), 1.5x/−40% −2.8% (paper +0.1%). The paper result flatters by about 3 points because the trigger price is already gone by the time the buy lands.

**Entry features on A's 100 passed coins** (runner, net at the cost model, paper entry; win = share above entry):

| split | yes | no |
|---|---|---|
| bundle wallets ≤ 3 | n33 **+18.4%**, win 85%, stopped 12% | n67 −9.0%, win 40%, stopped 51% |
| bundle % < 28 | n51 +10.0%, win 69% | n49 −10.3%, win 41% |
| one buyer > 10% of the trigger minute (S3) | n53 +11.5%, win 66% | n47 −12.9%, win 43% |
| wallets in the trigger minute ≤ 65 (S2) | n48 +1.7%, win 62% | n52 −1.5%, win 48% |
| price up at 5 s (fs5 ≥ 1.0) — but see below | n47 +17.9%, win 70% | n53 −15.7%, win 42% |
| sold < 20 SOL in the trigger minute | n18 +15.2%, win 67% | n82 −3.2%, win 52% |
| ≥ 40 SOL in the trigger minute | n25 −7.6%, win 40% | n75 +2.6%, win 60% |
| creator still holds at entry | n17 −9.4%, win 47% | n83 +2.0%, win 57% |
| coin older than 30 min at the trigger | n31 +5.5%, win 58% | n69 −2.4%, win 54% |
| has socials | n72 +1.9%, win 60% | n28 −4.8%, win 43% |
| 30 SOL crossed within 30 s of the window start | n9 −11.2% | n91 +1.2% |

The "price up at 5 s" split mostly measures the paper entry being cheaper than the real one: re-priced at the 5-s price itself, fs5 ≥ 1.0 earns +3.4% (n47) and fs5 ≥ 1.1 earns +18.1% (n20, too few). Bundle wallets ≤ 3 survives the re-pricing: **+13.9% at the 5-s price, win 76%**, and the rest −11.1%. Volume-streak features (≥ $20K/$50K/$80K in each of three minutes) cannot be tested: pre_min2/min3 exist on 6 rows. Pool depth, snipers, proven wallets, heat, creator and copycat columns are filled on 2–9 of the 100 A rows — not testable yet.

**The website's four skips, judged on the paper runner (A's skipped coins):** bundled 70%+ — right to skip (n22, −21.5%, win 41%). Launch not seen — right (n41, −9.2%, win 34%). Not SOL-paired — these coins did as well as the passed ones (n47, +0.1%) but the wallet cannot trade them anyway. **150+ wallets — wrong on this sample**: n26, runner +5.3%, 5-min sell +35.9% (win 69%), 1.5x/−40% +13.2%. 26 trades is a hypothesis, not a finding; worth a shadow book.

**E ($100K in 5 min) and the owner's 1A/1B/2A/2B** (E's rows, passed): runner +5.3% (n31, win 45%), 1.5x/−40% −0.1%, **sell at 5 min +8.8%** (win 52%), ½ at 2x + trail +6.4%. 1A/2A (stock-paired or MC < $47K): 1.5x/−40% −5.4%, runner +3.2% (n14). 1B/2B (SOL pool and MC < $47K): 1.5x/−40% +4.1%, runner +23.1% (n8). Eight and fourteen trades say nothing yet. E's bundle split runs the other way from A's (bundle < 28%: n18 −10.1% vs n13 +26.7%), so the bundle tell is not universal.

**C, D, 80:** C runner −16.2% (n33, win 39%) — the $100K–$250K band loses under every exit. D −1.3% (n80) — 85% of D's coins are A's coins, so D is not an independent test. 80-SOL −12.1% (n45).

**Later entry (29 traced non-S rows, one hour of data — hypothesis only):** 62% of coins dip below 0.95 within 60 s of the trigger (median low in the first 60 s: 0.909). Buying at the 60-s mark and selling at 5 min scored +34.8% net (n26) against +52.0% for buying at the trigger: on this hour the later entry gave up more than the dip saved. Entering only if the coin was up ≥ 5% at 60 s: +59.5% (n16). These are one hot hour (12:00–13:00 UK); the "sell at" marks on the same 26 traced rows show +65% at 5 min and +31% at 10 min, where A's 100-trade paper says the opposite. Treat the hour, not the trade, as the unit: 29 rows is one data point.

**State at 60 s (same 29 rows):** up ≥ 20% at 60 s → runner +74.7%, win 9/9; more sold than bought by 60 s → −17.4%, win 3/10. Creator selling by 60 s (t60_ds): 0 rows. Direction matches the owner's intuition; count does not yet.


## Findings
1. **The A book as traded loses money, and it is the entry that costs it.** Paper runner +0.1% net (100 trades); at the 5-s fill +2% it is −2.9%; live was −9.9% a trade (38 legs). The live exit gap on A averaged −6.1%, double the −3% in the cost model, with stops at −8.8% (12 legs) — established on 88 live legs.
2. **B (sell at 5 min) is worse than A under every pricing:** paper −4.9% (100), live −0.301 SOL on 50 legs. Established.
3. **Launch bundle size is the strongest before-trigger tell in A:** bundle of 1–3 wallets → 85% win, +18.4% net (33); 4+ wallets → 40% win, −9.0% (67). A 45-point gap on 33 vs 67 is well past the 20-point/40-trade bar, it holds in 10 of 13 hours, at the 5-s fill, and on D's (overlapping) coins — but it was found by scanning ~70 features, so it is a **hypothesis** until it holds out of sample (registered as F1).
4. **The single-big-buyer tell (S3) still looks real** (66% vs 43%, 53/47) and bundle % < 28 looks similar (69% vs 41%); the wallet-count tell (S2) has faded to 62% vs 48% on 48/52 — not enough.
5. **The website's 150+ wallets skip threw away the best group of coins on this sample** (26 trades, 5-min sell +35.9%, 1.5x/−40% +13.2%). Hypothesis.
6. **A's edge is a few hours.** Over 17 hours with A triggers the paper runner nets +0.06 stakes in total; 9 hours positive, and without the best two hours it is −2.55 stakes. "After a loss" (+19.2%, 45 trades) beats "after a win" (−0.6%, 54) — a clustering artefact, not a rule.
7. **C loses under every exit** (33 trades, −16.2%); the 80-SOL level loses (45, −12.1%). E's best exit is a plain 5-min sell (+8.8%, 31) — too few.
8. **Time of day:** 21:00–01:00 UK was the best band for A (29 trades, runner +17.0%, win 62%); 02:00–03:00 and 08:00–11:00 UK lost. One night of data.
9. **The 60-s momentum state matters in the right direction** (up ≥ 20% at 60 s: 9/9 winners; more sold than bought by 60 s: 3/10) — one hour of traces, hypothesis.
10. **GMGN columns are absent, not empty;** smart_wallets.csv is empty; S6 has no rows. Nothing from the GMGN work can be judged this run.

## Selling without going live
No live leg yet has both a real sale and a path-stamped exit: the path columns start 12:08 UK and the books went to shadow at about 10:00 UK, so the residual (live_exit_gap minus the path gap) cannot be measured. What can be said from the 88 live legs alone: timed sells landed −1.2% to −2.2% below paper (32 legs), floors −6.0% (8), stops −5.5% on B (9) and −8.8% on A (12), and one tsl80 close on a rug −79% (the "france is dead" leg, −0.098 SOL). Stops cost about twice what the cost model charges, so every "stopped" trade in the tables above is a point or two worse live. Realistic (path-priced) exits exist on 2 A rows — nothing to report. For the calibration to work, one book needs to run live again for ~40 legs with the path on; at 0.05 SOL that costs about the fee drag (0.0033 SOL a leg, 0.13 SOL in all) plus whatever the book loses.

## Project S — snipers
**Base rates (launches.csv, 38,723 launches with a +4 s price, 18 Oct 13:05 → 19 Oct 12:05 UK):** 14.0% reach 2x, 3.5% reach 5x, 1.5% reach 10x, 1.7% graduate. A buy at +4 s sold at 5 min, 10% cost, missing marks treated as the last price or zero: **−22.6% a launch**; even selling at the exact peak nets only +46%, because the median launch peaks at 1.01x. Marks are missing on 25% of launches at 1 min and 35% at 5 min; graduated coins keep their 5-min mark 86% of the time, so the replay is not biased against winners by much.

**Launch-time tells, each as a rate** (5x / 10x / graduation from the +4 s price; 5-min replay net at 10% cost):

| tell | n | 5x | 10x | grad | 5-min net |
|---|---|---|---|---|---|
| all launches | 38,723 | 3.5% | 1.5% | 1.7% | −22.6% |
| **tier-1 bundled launch** (bundle 40–79%, median dev buy 4.9 SOL) | 604 | 28.0% by 5 min (42% ever) | 16.1% (34% ever) | 55% | **+690%** (capped at 100x; +268% capped at 10x; median 1.24 on the 86% still trading; 44% above cost; positive in all six 4-h blocks, +131% to +442%) |
| bundle ≥ 30% | 1,761 | 10.7% | 6.1% | 22% | +228% (median 0.65 — most lose, a few carry it) |
| dev buy > 3 SOL | 2,876 | 6.3% | 3.4% | 11% | +122% |
| dev buy = 0 | 15,491 | 0.4% | 0.2% | 0.3% | dead on arrival |
| proven wallet in the first 60 s (S2's tell) | 240 | 9.6% by 5 min (53% ever) | 4.2% (19% ever) | 12.5% | +111% (median 0.60) — **look-ahead risk**: if "proven" is scored on today's record it includes these very coins |
| 15+ SOL from scored buyers within 60 s (S5-like) | 716 | 1.7% from the 60-s price | 0.1% | 37% | +10.7% bought at 60 s; the move is over by then |
| S1 rule (dev ≤ 30 launches, 2+ grads or one > $100K, ≥ 10%) | 77 | 2.6% | 1.3% | 5.2% | +76% (median 0.56; 15-min −47%) — a few outliers |
| copycat of a ≥ $300K coin (S3's tell) | 389 | 2.1% | 0.5% | 3.6% | **−21%** — no lift at all |
| S4-like clean launch (bundle < 5%, dev 0.2–3 SOL, 10+ outside buyers) | 917 | 2.3% | 0.4% | 2.0% | **−19.5%**, median 0.28 — clean launches die |
| socials | 3,477 | 1.5% | 0.3% | 5.5% | −10.8% |
| first launch by the creator | 10,733 | 3.8% | 2.6% | 3.8% | — (a mild lift over factories: > 100 prior launches graduate 0.7%) |
| creator wallet < 1 h old / funded ≥ 5 SOL | 308 / 274 | 45% / 48% | 25% / 25% | 80% / 89% | **unusable**: filled on 1.3% of rows, almost all tracked winners (selection, not a tell) |

Time of day barely moves the base rate (5x between 2.6% and 5.1% in every UK hour; 03:00–04:00 UK the highest).

**Later entry on launches** (buy at the 1-min price): every momentum condition I tried loses at 5 and 15 min after 10% cost — MC ≥ $15K and 30+ buyers at 1 min (n428): −8.7% at 5 min, −26% at 15 min, although 78% graduate; 8 of 24 hours positive. The first minute is where the money is made, and it is made by whoever is in the create block or the next second.

**The 10x hit rate a stacked filter needs (~8–10% of entries):** only the bundled-launch tells reach it on a +4 s entry — tier 1 at 16% by 5 min / 34% ever (n604), bundle ≥ 30% at 6%/13% (n1,761). Proven-wallet entries reach 19% ever but only 4% by 5 min, and carry the look-ahead doubt. No "clean" or "social" or "copycat" filter comes anywhere near.

**The S books themselves:** 15 rows, 13:02–13:05 UK: S1 7 (5 closed; all factory creators with 139–2,420 prior launches — the ≤ 30-launch rule was not yet in force, so judge S1 from 14:17 UK, i.e. no S1 trade counts yet), S2 3 (0 closed; two fires on the same wallet mGbB…kdG1 in two minutes), S5 5 (0 closed), S3/S4/S6 none. Peak multiples so far 1.0–5.0; 1.5x/−40% net +0.6% on S1's 5. Nothing to conclude. Entry delays are 1–19 s and entry MC $2–9K, as designed.

**Wallets:** wallets.csv has 2,494 wallets; 1,396 with 8+ scored buys; **37 with a 5x rate ≥ 60%** (91 at ≥ 50%); the median 5x rate is 24%. The top of the list (e.g. 98 buys, 66% 5x, buys at 27 s, 0.5 SOL) looks like what S2 wants, but every wallet's buys_24h is 0 and last_utc ≤ 18 Oct 13:05 UK — buys are only scored once resolved (24 h), so the file cannot say how often these wallets buy *now*; the S2 feed (3 fires in 3 min) says often enough. smart_wallets.csv is empty, so the GMGN/proven overlap cannot be checked.

**What a seventh book should be:** a bundled-launch sniper (F2): tier-1 launch, buy at +4 s (bundle known from +4 s), exit 2x/−40% or sell at 5 min. It has 604 launches a day behind it and the strongest hit rates in the file. The open question is execution: the +4 s price is after the bundle's buy, and the bundle sells into whoever comes next (churn) — a paper book with the real quote is the way to find out, not SOL.

## Money management
A's runner, paper at the cost model, in trade order (100): net +0.1% a trade, 49% winners, average win +41%, average loss −40%, worst losing streak 5, max drawdown 3.3 stakes, 6 coins went to ≤ 0.2 (a rug books −100% live, not −42%). Kelly is 0.2% — no stake is justified by the paper book as it stands. Booking rugs at −100% in the simulation on a 1.5 SOL wallet: 0.05 SOL loses 0.20 (max drawdown 0.30), 0.10 loses 0.41 (drawdown 0.61), 0.15 loses 0.61 (0.91), 0.25 loses 1.02 (drawdown 1.52 — the wallet is gone). A stop after 5 losses or −0.4 SOL in a day would have cut the 0.1-SOL loss to −0.06, but by skipping 63 of the 100 trades — it is a "switch it off" rule, not a money-management rule, because nearly everything happened in one day. The practical answer: a 1.5 SOL wallet survives 0.05 SOL stakes through a 5-loss streak and a rug with room to spare; at 0.1 SOL the live night already used 45% of it. Fees at 0.05 SOL are 6.6% a round trip, so a book must clear +7% paper to be worth running at that size.

## Clustering
17 hours with A triggers, median 5 an hour, max 11. Busy hours (6+): +12.1% (67 trades); quiet hours +1.4% (33). After a loss +19.2% (45), after a win −0.6% (54): trades inside an hour are not independent, and the whole +8.5% paper average is two hours (01:00 and 06:00–08:00 UK). The honest unit is the hour: 9 of 17 positive is a coin toss.

## Project F
**F1 — small-bundle A coins (registered).** Buy A's trigger only when the launch bundle was at most 3 wallets (bundle_wallets ≤ 3), runner exit. Evidence: 33 of 100 passed A trades, +18.4% net, 85% above entry, 12% stopped; the other 67: −9.0%, 40%, 51% stopped. Holds at the real 5-s fill (+13.9%, win 76%), in 10 of 13 hours (+6.1 stakes, +2.1 without the best two), on D's coins (+13.2% n27 vs −8.7% n53, mostly the same mints) and on A's skipped coins (+2.5% n38 vs −8.2% n98). It fails on E (bundle % runs the other way) and on C. About a third of A's triggers qualify (~1–2 an hour). Implementable now: bundle_wallets is known at the trigger. A real book if it holds on the next 40 qualifying triggers (two to three days at the current rate); if it does, it is the entry filter for A, at 0.05 SOL, runner exit.

**F2 — bundled-launch sniper (registered as a launch-time rule, book S7 to be).** Buy a tier-1 bundled launch (bundle 40–79% of supply, dev buy typically 3–8 SOL) at +4 s; sell at 5 min (or 2x/−40%: 59% reach 2x within 30 min from +4 s). Evidence above: 604 launches, +131% to +442% a launch in each of six 4-hour blocks (capped at 20x), 16% at 10x by 5 min, 55% graduate, against −22.6% for the average launch and −19.5% for S4's clean launches. Caveats that stop it being a book today: the fill (does the +4 s price exist for an outside buyer once the bundle starts selling?), the tail (half the launches lose; the mean is a few 20–100x coins), and the fact that this is one day of launches. Next run: score it on launches created after 13:05 UK (the register's after_ts); if the 5-min replay stays positive and the hit rates hold, it becomes a paper S7 book with the real quote.

Not registered: "150+ wallets" skip reversal (26 trades) — watch; E sold at 5 min — registered as S4 for the owner (31 trades).

## Strategy register
| id | rule | out of sample | verdict |
|---|---|---|---|
| S1 | A, sell at 3 min | −18.6% (9) | waiting 9/40 |
| S2 | A, wal60 ≤ 65, runner | −49.4% (2) | waiting 2/40 |
| S3 | A, max_share > 0.1, runner | −3.2% (3) vs baseline −11.2% (9) | waiting 3/40 |
| F1 (new) | A, bundle_wallets ≤ 3, runner | — | waiting 0/40 |
| F2 (new) | launch-time: tier-1 bundled launch, +4 s, 5 min — scored by hand from launches.csv | — | waiting |
| S4 (new) | E, sell at 5 min | — | waiting 0/40 |

No existing rule was edited. The three S-rules have had 9 out-of-sample trades since 10:30 UK; the sample since then is one bad hour and one good hour.

## What I would do now
Nothing here changes the bot; the owner decides.
- **Keep every book in shadow.** The A book, priced at the real fill, is −2.9% a trade on 100 trades and the live night was −0.677 SOL on 88 legs; there is no basis for live SOL on A, B, C, D or 80 today. B and C should be switched off outright (B −4.9%/100 paper and −0.30 live; C −16.2%/33): they only add fees.
- **Add F1 as a shadow book** (A's trigger + bundle_wallets ≤ 3, runner, 0.05 SOL shadow). Cost: nothing. It needs 40 trades (two to three days).
- **Add a "crowded" shadow book**: A's trigger with 150–500 wallets, which the website skips (26 trades say +13% to +36%). Cost: nothing.
- **If one live leg is wanted for the path calibration**, run A at **0.05 SOL, runner exit, F1's filter**, with a hard stop at −0.3 SOL for the day; expected cost of the calibration is the fee drag (~0.13 SOL over 40 legs) plus whatever A loses. I would not do it before F1 has 20 out-of-sample trades.
- **Project S:** keep all six on paper. Replace nothing yet — S1 only counts from 14:17 UK, S6 has no rows. Add the bundled-launch book (F2) as paper S7 when convenient; the launch data says it is the one sniper idea with a base rate behind it, and the one most likely to be undone by the fill.
- **Fix the data before the next study:** GMGN columns are absent from the dump; smart_wallets.csv is empty; pre_min2…min5 and the pool/sniper/proven/heat columns are filled on under 10% of rows.

## Next
F1 and S3 out of sample (both are the same family: a concentrated, small-wallet launch); the 150+ wallets skip; S1 from 14:17 UK and S6's first rows; whether the GMGN columns and smart_wallets.csv arrive; the first live-leg-plus-path rows for the calibration if any book goes live; F2 on the launches created after 13:05 UK — the 5-min replay and the 10x rate on fresh tier-1 launches; and whether the 21:00–01:00 UK band repeats tonight.
