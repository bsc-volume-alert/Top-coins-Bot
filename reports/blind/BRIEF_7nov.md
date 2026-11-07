# Independent strategy brief — pump.fun launch trading (issued 7 Nov 2026, UK time = UTC; revised 15:05 after review)

You are one of several independent analysts. You get the same data and this same brief. No one's conclusions are given to you. **This is independent analysis with access to previous attempts, not a fully blind test:** the data includes the bot's earlier rules ("books"), their decisions and their simulated results. Treat those as data, not as guidance. Work from the raw records.

## The question
Find a trading rule for newly launched pump.fun tokens (Solana) that makes money **after realistic costs**. Alternatively, conclude that the data does not support one. **"No profitable rule is supported" is an acceptable and useful answer.**

Paper research only. You must not trade, change the bot, or ask for live trading.

## The test you will be judged on (read before you start)
- **Development data:** everything published up to the cutoff below. Use it however you like.
- **Hidden test period:** launches created **8 Nov 2026 00:00 UTC → 10 Nov 2026 00:00 UTC**. Nobody has seen it, because it has not happened yet. The bot will collect it the same way.
- **Freeze your rule before 8 Nov 00:00 UTC:**
  - **one primary rule** (no alternates)
  - written precisely enough that someone else could code it from your description alone
  - with a timestamp
- After 10 Nov, each frozen rule is replayed on the test period with the same cost and execution model. **Only test-period results count.** You may not change a rule after it is frozen.
- **Report how many rules, thresholds and features you tried in development.** More searching means a higher chance of finding a lucky pattern.
- **Universe and when a launch becomes eligible (no future information):**
  - The tracker stores a launch's trades once the launch is bundle tier-1 at finalisation, or once its cumulative **GROSS** buy volume reaches **15 SOL** (`VOL_TRACK_SOL`). The earlier in-memory trades are written at that moment (up to 12,000 per launch). Storage then continues for 125 min.
  - **A launch is eligible for a decision at time t only if it was already retained at or before t.** A coin that only reaches 15 SOL at 3 minutes cannot be entered by a 15-second rule.
  - Pool trades: for retained launches from 6 Nov 19:31 UTC; for every launch, for 24 h after creation, from 7 Nov 09:47 UTC.
  - The launcher's own "15-SOL screen" (`fd_watch.screened`) uses **net** buying. It is a different measure.
  - **The development trade histories are a SELECTED population.** The uncapped supplement covers only coins that some earlier rule entered, not every retained launch. Findings there may not generalise. Lifecycle checkpoints (token_life) cover every launch, but only at fixed times.
- **Independence:** submit your rule BEFORE reading anyone else's work. Critiques are exchanged only afterwards. If you revise after seeing test results, the revision needs a new, untouched test period.

## How rules will be evaluated (fixed before the test starts)
One evaluation script, written and frozen (committed with a hash) before 8 Nov 00:00 UTC and not changed afterwards, will score every submitted rule the same way:
1. **Entry:** your rule is applied to each launch in the test period. It may use only data observable at its decision time t: the launch's trades with timestamp ≤ t, and the creator, funding and bundle fields recorded at or before t. Recognition delay: none beyond what your rule specifies.
2a. **What the system knew, and when:**
   - A trade counts as known at t only if its receipt time `recv_ms` ≤ t. Where `recv_ms` is missing, the result is labelled a **hypothetical event-time replay**.
   - Funding and creator fields count as known only from their recorded lookup or trace time (`fd_watch.trace_ts` / `scanned_ts`; lookup_status 'pending' or 'failed' means not known). Bundle fields count only from the launch's finalisation.
   - Eligibility (retention) time is reconstructed as the receipt time of the trade whose cumulative gross buys first reach 15 SOL.
   - **Coverage checks.** A span counts as captured only if all of these hold:
     - no tracker outage or restart overlaps it (list in the MANIFEST and deploy log)
     - no feed_gaps close/idle without a following open overlaps it
     - the mint is inside its retention window
     - the pre-promotion buffer (12,000 trades) was not exceeded
     - events are ordered by (slot, ev_idx, row_id) without contradiction
   - Absence of a logged gap is NOT proof of capture. Anything not shown to be captured counts as **uncertain**.
2. **Fill (state at the landing time, bounded):**
   - The buy executes on the pool/curve state **as of t + 1,000 ms**: the reserves after the last recorded trade at or before that instant.
   - This is valid only if capture was complete over that span: no feed gap in feed_gaps overlapping it, and the mint inside its retention window.
   - Otherwise the fill is **unavailable**. It is never moved to a later trade. Unavailable fills stay visible in the denominator.
   - Stake 0.2 SOL; a 0.02 SOL position is scored independently with its own exit.
3. **Exit:**
   - Your exit condition is evaluated on the state after each recorded trade.
   - The sell executes on the state **as of trigger + 700 ms**, under the same validity rule.
   - At your horizon (2 h at most), it sells on the state as of the horizon, same rule.
   - **Your rule must say what happens at migration** (curve → pool), and give an exit for each reported size.
4. **Costs (fixed, frozen with the evaluator eval-1.0):**
   - Per leg: curve **125 bps** (protocol 95 + creator 30); pool **30 bps** (LP 20 + protocol 5 + creator 5).
   - Plus 0.0015 SOL fixed per round trip.
   - Every result is also reported with the pool fee at 125 bps, as a sensitivity check, because the pool creator-fee tier is not stored per trade.
   - Quote asset and decimals are **validated per pool row**: quote_mint must be wSOL, base_dec 6, quote_dec 9 (tracker 0.19.9 evidence). Any state that cannot be confirmed is **unavailable**.
   - States failing basic checks (non-positive reserves, curve price above the curve maximum) are also unavailable.
5. **Counterfactual:**
   - Our own trade is assumed **not** to change later historical prices; we sell into the recorded path.
   - This is a replay scenario with fixed latency, not proof of live fills.
6. **Primary score and the common denominator.** N = the number of launches created in the test period that were retained at any point AND meet the coverage checks in step 2a. N is the same for every rule. Every launch in N falls into exactly one category for a rule:
   - **(a) scored entry:** fill and exit both valid. Contributes its net SOL.
   - **(b) deliberate abstention:** the rule did not enter, including "not yet retained at the decision time". Contributes 0.
   - **(c) unknown outcome:** the rule would enter, but the fill or exit is unavailable or uncertain.
   Reported for each rule:
   - **Point estimate** = Σ net SOL of (a) ÷ N, with (c) counted as 0 and labelled as such.
   - **Lower bound** = the same, with every (c) at the worst case.
   - Counts of (a), (b), (c), total net SOL, mean and median per scored entry, win rate, result without the best coin, share of entries losing ≥ 50%, peak concurrent positions.
   - A rule with (c) > 10% of its attempted entries is **not scorable**. Unknown outcomes can never raise a score.
7. **Worst case and supported rules.**
   - Losing the entire stake plus the fixed fee = **−100.75% at 0.2 SOL**, **−107.5% at 0.02 SOL**.
   - Supported rules: **one entry and one complete exit per mint** (no partial exits, no re-entries, no retries). Rules needing more trades per mint are outside this evaluator.
   - Portfolio: unconstrained capital, every signal taken, one entry per mint per rule, labelled "unconstrained". Entries near the end of the period are scored only after their full horizon has been collected.
8. **Statistical test (fixed now).**
   - The unit is the launch: resample the N launches with replacement, 10,000 times, seed 20261108, and recompute the LOWER-BOUND score each time.
   - With K submitted rules, a rule is **"supported"** only if the one-sided percentile lower confidence bound at level 1 − 0.05/K (Bonferroni) of its lower-bound score is above 0.
   - The point estimate and its two-sided 95% interval are reported for information only.
9. **Observation time vs execution state.**
   - DECISIONS (entry and exit triggers) may use only information received by then (`recv_ms` ≤ t; lookup and trace times for funding).
   - EXECUTION is valued on the chain state at the assumed landing time: the reserves after the last trade ordered by (slot, ev_idx, row_id) whose block time is ≤ the landing time, subject to step 2a.
   - Any rule whose decisions would need trades without `recv_ms` is scored as a **hypothetical event-time replay**, reported separately and never pooled with operational results.
10. **The evaluator is published and frozen:** reports/blind/eval/ (evaluate.py, 14 unit tests, README), git tag **blind-eval-1.0**. Rules are written as a small Python module (interface in the README). Your written rule will be translated into that module and sent back to you to confirm before scoring.
11. Write your rule so it maps onto these steps. Anything that cannot be expressed this way cannot be scored.

## Loading the data (example)
```
git clone --branch entry-snap-7nov-1154 --depth 1 https://github.com/bsc-volume-alert/Top-coins-Bot.git snap3
cd snap3 && sha256sum -c SHA256SUMS.txt && gunzip -k *.csv.gz
python3 -c "import csv; r=list(csv.DictReader(open('fd_positions.csv'))); print(len(r), r[0].keys())"
# supplement (uncapped trades): same pattern with --branch entry-supp-20261107t1433, files trades_part_*.csv.gz,
# coverage_per_mint.csv.gz, feed_gaps_all.csv.gz — order within a mint: slot, ev_idx, row_id.
```

## The data (all on GitHub, repo bsc-volume-alert/Top-coins-Bot)
| What | Where | Cutoff |
|---|---|---|
| **Everything below in ONE place** (supplement at top level, snapshot3/, current/) with corrections and limits | branch **`entry-package-7nov`** — start with **INDEX.md** | 14:33 / 11:54 / 14:53 |
| Main snapshot: launches, checks, decisions, simulated positions and fills, paper trades, checkpoints, wallet and funding traces, runner registry, quotes, live trades (5 Nov) | branch `entry-snap-7nov-1154`; start with its **MANIFEST.md** and **RECONCILIATION.txt** | 7 Nov 11:54:21 |
| Uncapped trade-by-trade histories (curve and pool, incl. after exits) for every simulated entry since 5 Nov, plus pool evidence fields, per-coin coverage and feed gaps | branch `entry-supp-20261107t1433` (MANIFEST.md) | 7 Nov ~14:33 |
| Earlier snapshot (more trade streams from 6 Nov) | branch `tracker`, folder `scope/files/snap_6nov_1830/` at commit b9213f9feca2cacd14edfeb33fac2745ba93ff98 | 6 Nov 18:23:11 |
| Lifecycle checkpoints for every launch (mc at 15 s … 24 h) and launch census, 6–7 Nov | branch `study100k-v1-inputs` @ 3bd9c3b9 (folder inputs/) | 7 Nov 09:26 |

Every file has sha256 checksums in its MANIFEST. Read the MANIFESTs fully: they define units, time fields, retention windows and what is unavailable.

## How the system works (facts, not findings)
- **Tracker:** listens to every pump.fun launch. It keeps trade-by-trade data for launches whose cumulative **gross** buy volume reaches 15 SOL, or that are bundle tier-1 at finalisation ("retained"). It keeps lifecycle checkpoints for every launch.
  - Pool (PumpSwap) trades after migration: kept for retained launches from 6 Nov 19:31, and for every launch (24 h) from 7 Nov 09:47.
- **Launcher:** checks retained launches at 60, 90 and 120 s after creation (net buying, buyers, sells, holder concentration, dev selling, early wallets, farm-wallet scores, funding source, bundle). It records every decision of a set of predefined "books" (rules), including rejections.
  - The existing books are just previous attempts. **You are free to ignore them entirely.** Their definitions are in BOOK_DEFINITIONS.txt.
- **Execution simulator** (reserve-based, per position):
  - stake 0.2 SOL
  - the buy lands 1,000 ms after the decision, on the reserves read then
  - the sell lands 700 ms after the exit trigger
  - fee 0.0015 SOL per round trip
  - exits in the existing simulation are a trailing stop from the running high, chosen BY THE ENTRY VENUE: 40% for a curve entry, 25% for a pool entry. A curve entry keeps the 40% trail after migration. 2-hour horizon.
  - on-chain fees on both legs, from the venue config, plus the 0.0015 SOL fixed cost
  - an independent 0.02 SOL position (`i02_*`, from 6 Nov 20:00) has its own trail and exit
  - You may propose different exits, but they must be evaluated on trade-level paths with the same latency and fees, never on peaks seen afterwards.
- **The replay is a scenario, not live performance.** Our own trade's effect on later prices is not modelled.
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
1. **Your frozen rule:** exact entry conditions, exit conditions, sizing and timestamp, written to map onto the evaluation steps above.
2. **Development results:** both halves separately, with the numbers above.
3. **Everything you tried:** a count and a list.
4. **What you believe and why**, what would change your mind, and the main risks: data problems, execution, overfitting.
5. **If no rule is supported:** say so, and say what data would be needed to find out.
