# Blind strategy brief — pump.fun launch trading (issued 7 Nov 2026, UK time = UTC)

You are one of several independent analysts. You get the same data and this same brief. **You are not given anyone's previous conclusions, on purpose.** Work only from the raw records.

## The question
Find a trading rule for newly launched pump.fun tokens (Solana) that makes money **after realistic costs**. Alternatively, conclude that the data does not support one. **"No profitable rule is supported" is an acceptable and useful answer.**

Paper research only. You must not trade, change the bot, or ask for live trading.

## The test you will be judged on (read before you start)
- **Development data:** everything published up to the cutoff below. Use it however you like.
- **Hidden test period:** launches created **8 Nov 2026 00:00 UTC → 10 Nov 2026 00:00 UTC**. Nobody has seen it, because it has not happened yet. The bot will collect it the same way.
- **Freeze your rule before 8 Nov 00:00 UTC:**
  - one primary rule, plus at most two alternates
  - written precisely enough that someone else could code it from your description alone
  - with a timestamp
- After 10 Nov, each frozen rule is replayed on the test period with the same cost and execution model. **Only test-period results count.** You may not change a rule after it is frozen.
- **Report how many rules, thresholds and features you tried in development.** More searching means a higher chance of finding a lucky pattern.

## The data (all on GitHub, repo bsc-volume-alert/Top-coins-Bot)
| What | Where | Cutoff |
|---|---|---|
| Main snapshot: launches, checks, decisions, simulated positions and fills, paper trades, checkpoints, wallet and funding traces, runner registry, quotes, live trades (5 Nov) | branch `entry-snap-7nov-1154`; start with its **MANIFEST.md** and **RECONCILIATION.txt** | 7 Nov 11:54:21 |
| Uncapped trade-by-trade histories (curve and pool, incl. after exits) for every simulated entry since 5 Nov, plus pool evidence fields, per-coin coverage and feed gaps | branch `entry-supp-20261107t1433` (MANIFEST.md; uploading as this is written) | 7 Nov ~14:33 |
| Earlier snapshot (more trade streams from 6 Nov) | branch `tracker`, folder `scope/files/snap_6nov_1830/` at commit b9213f9feca2cacd14edfeb33fac2745ba93ff98 | 6 Nov 18:23:11 |
| Lifecycle checkpoints for every launch (mc at 15 s … 24 h) and launch census, 6–7 Nov | branch `study100k-v1-inputs` @ 3bd9c3b9 (folder inputs/) | 7 Nov 09:26 |

Every file has sha256 checksums in its MANIFEST. Read the MANIFESTs fully: they define units, time fields, retention windows and what is unavailable.

## How the system works (facts, not findings)
- **Tracker:** listens to every pump.fun launch. It keeps trade-by-trade data for launches that pass a 15-SOL net-buying screen or a bundle test ("retained"). It keeps lifecycle checkpoints for every launch.
  - Pool (PumpSwap) trades after migration: kept for retained launches from 6 Nov 19:31, and for every launch (24 h) from 7 Nov 09:47.
- **Launcher:** checks retained launches at 60, 90 and 120 s after creation (net buying, buyers, sells, holder concentration, dev selling, early wallets, farm-wallet scores, funding source, bundle). It records every decision of a set of predefined "books" (rules), including rejections.
  - The existing books are just previous attempts. **You are free to ignore them entirely.** Their definitions are in BOOK_DEFINITIONS.txt.
- **Execution simulator** (reserve-based, per position):
  - stake 0.2 SOL
  - the buy lands 1,000 ms after the decision, on the reserves read then
  - the sell lands 700 ms after the exit trigger
  - fee 0.0015 SOL per round trip
  - exits in the existing simulation are a trailing stop from the running high: 40% on the pump.fun curve, 25% after migration to the pool; 2-hour horizon
  - an independent 0.02 SOL position (`i02_*`, from 6 Nov 20:00) has its own trail and exit
  - You may propose different exits, but they must be evaluated on trade-level paths with the same latency and fees, never on peaks seen afterwards.
- **Real-world calibration:** live_trades.csv holds a small number of real 0.02 SOL trades (5 Nov), and fd_quotes.csv holds Jupiter quote shadows.

## Known data issues (from audits; take them into account)
1. **Version stamps.** `rule_ver` on positions is the version at EXPORT, not at decision. Map decisions to code by time, using the version list in the MANIFEST.
2. **i02 values before 6 Nov 20:00** were computed afterwards. They are reconstructions, not real-time results.
3. **The trades_books.csv in the main snapshot stops at 6,000 trades per coin.** Use the supplement's uncapped histories instead.
4. **Curve prices above ~4.11e-7 SOL/token** (≈ $37K market cap at SOL $90) cannot occur on the standard pump.fun curve. Treat them as decode errors or non-standard curves.
5. **The `venue` label at a check can lag a fast migration.** The reserves recorded at the check show the true venue.
6. **The pool decoder assumes 6 token decimals**, not read from each mint.
7. **Retained records show current values, not necessarily what the system knew at the time.** This affects open-then-closed positions, rebuilt wallet classifications (farm, snipers, operators) and overwritten fields. For past decisions, contemporaneous values live in `fd_watch.checks`.
8. **Outages and under-checked windows** are listed in the main MANIFEST. Launches that were never retained have no trade history.

## Rules of the work
- **No look-ahead.** A rule may only use information available at the moment of its decision, after realistic delays.
- **Include every losing entry.** Report results per unique coin as well as per position: one coin entered by many rules at the same second is one opportunity.
- **Report uncertainty:** mean and median return after costs, win rate, 95% interval, result without the single best coin, and the worst-loss rate.
- Split development data in time (earlier half to find, later half to check) before freezing anything.
- You may ask the owner for additional existing data. You may not ask for new collection or code changes to the bot as part of this test.

## What to hand back (one document)
1. **Your frozen rule(s):** exact entry conditions, exit conditions, sizing and timestamp.
2. **Development results:** both halves separately, with the numbers above.
3. **Everything you tried:** a count and a list.
4. **What you believe and why**, what would change your mind, and the main risks: data problems, execution, overfitting.
5. **If no rule is supported:** say so, and say what data would be needed to find out.
