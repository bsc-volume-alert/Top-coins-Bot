> The data files (`data/`) and `APPENDIX-coins.md` are on the branch **`older-review-package`** (same folder layout): https://github.com/bsc-volume-alert/Top-coins-Bot/tree/older-review-package

# Older-coins paper books — independent-review package (23 Nov 2026)

Analysis only. Nothing here trades, signs, deploys or changes a rule. No key, credential, wallet file or authenticated URL is
included: the server-side export removes key patterns and refuses to send if one is found; the download was re-checked.

| What | Where |
|---|---|
| Report (direct answer, evidence check, scoreboard, one section per book, experiments, data gaps) | `REPORT.md` |
| Every coin in every book, searchable | `APPENDIX-coins.md` |
| Data package (CSV; large files gzipped) | `data/` |
| Scripts | `tools/` |
| Raw database copy | branch `older-review-data` of this repository |

## Pins
- Export cut-off: **2026-11-23T20:19:05Z**, one read transaction on `older-shakedown.db` (920 MB; first start 2026-11-20T14:53:46Z).
- Code running at the cut-off: `834ca71`, specification `older-9`. Rule constants: `older/src/spec.mjs` at that commit.
- Paper stake 0.2 SOL; cost per buy 0.2005 SOL (stake + one transaction cost of 0.0005); each sale leg pays 0.0005.
- Returns are after costs: `ret = proceeds / 0.2005 − 1`; `net_sol = proceeds − 0.2005`.

## Reproduce
```
git clone -b older-review-data https://github.com/bsc-volume-alert/Top-coins-Bot.git raw      # raw tables + manifest (SHA-256 per file)
git clone -b older-coins       https://github.com/bsc-volume-alert/Top-coins-Bot.git repo     # the bot's source (rule constants, row mapping)
node tools/build.mjs raw repo data          # raw → CSV package            (Node 22, no dependencies)
node tools/analyse.mjs data                 # scoreboard, ledger, candidate tests, overlap
node tools/reconcile.mjs data raw           # package vs the bot's own published report (1,236 of 1,240 rows identical)
node tools/report.mjs data .                # REPORT.md and APPENDIX-coins.md
gzip -dk data/*.csv.gz                      # the published copies of the large files are gzipped
```
`tools/server-export-line.txt` is the exact one-line command that produced the raw copy on the server (read-only).
`tools/v1.mjs … v9.mjs` are the exploratory checks quoted in the report (evidence check, runners, distinct buys by band and by
day, censoring, clock books against their parents, never-bought coins).

## Time and units
- `*_utc` columns are ISO-8601 UTC. `*_t` columns are Unix seconds on the bot's **receive clock** (when the bot processed the
  event). `block_ts` is the chain time of the triggering transaction; `feed_lag_s = signal_t − block_ts`.
- Prices in bars and `signal_px_usd` are USD per token (pool spot). `*_sol` are SOL. `*_x` are multiples of cost (0.2005 SOL)
  unless the name starts with `spot_` (multiples of the signal spot price — not executable values).
- `*_pct` in the analysis files are percentages; `ret` in `positions.csv` is a fraction.

## Files in `data/`
**Definitions**
- `books.csv` — the 30 books: rule text, category, ages, band, observation method, stops, exits, clock parameters, when the database first evaluated it.
- `variants.csv` — the 1,240 comparison rows (family × age group × stop × exit). Rows are alternatives on the same buys, never a portfolio.
- `code_rule_periods.csv` — every commit to the bot's source with its specification version and the first program start after it.
- `coverage_and_incidents.csv` — the bot's feed log: feed down/up, price-polling failures, restarts (with seconds not running).

**Records (one buy = one `entry_id`)**
- `entries.csv` — every buy decision: coin, pool, age group, the books that fired together (`families`), which of them were buying again (`rebuy_families`), method (live pool events / polled = sampled-routed), signal and scheduled-fill times, feed lag, status, market cap and price at the signal, token program and fee status, 24-hour follow-up (`runner_max_x_24h`, seconds to 2×/3×/5×/10×), inferred code period, machine `quality` flags and the bot's own free-text `flags`.
- `fills.csv` — the simulated buy: time, delay, pool-state age, tokens received, fee and its source, pool reserves used, and for routed fills the quote request/response times, route, router, fee and raw quoted amount.
- `sales.csv` — every sale leg (`half-at-2x`, `exit`) of every row: time, SOL received net of the transaction cost, reason (`trail`, `stall`, `clock`, `max-hold`), trigger time and value, delay, pool reserves and fee used or the routed quote, `estimated`.
- `positions.csv(.gz)` — **the ledger: one line per buy × book × stop × exit.** Status, exit reason, cost, proceeds, result, peak executable value while held (`peak_x_held`), last valuation of open rows, spot high/low while held and in the 24 h after the sale, 24-hour reach flags, code period, `quality` flags. `book` is the reporting book (FEE-COINS for fee coins), `rule_family` the rule that fired.
- `entry_features.csv` — the background measurements stored at each buy (1/3/5-minute volume, buys, sells, buyers, top-buyer share; 15- and 60-minute volume; liquidity; round-trip impact; rise over 15 minutes; distance from the 1-hour high; 4-hour drawdown/recovery; age; market cap). Empty = not recorded, never zero.
- `entry_candidates.csv` — the rule-specific trigger detail per book on each buy (window, multiple, low, threshold…).
- `decisions.csv` — the first decision per coin × age group × book. `rejections.csv.gz` — all 521,011 recorded rejections with reason; `rejections_by_book.csv` — the same counted.
- `coin_outcomes.csv(.gz)` — all 41,647 coins seen, bought or not: creation, first/last seen, buys, result, and from hourly bars the high, the low before it and the low after it. `mc_*_if_1bn_supply` assumes the pump.fun supply; the coin table does not record supply. Hourly lows include back-filled bars: treat extreme multiples as unreliable.

**Analysis outputs**
- `scoreboard.csv` — per book on the 30% trail row, for first buys / first buys with strict evidence / re-buys / all buys. `scoreboard_variants.csv` — the same for every stop × exit and per age group. `chronology.csv` — per book, day, code period.
- `coin_ledger.csv(.gz)` — positions with the two classifications (`financial_outcome`, `price_path_class`) and `loss_mechanism_labels`. Definitions are in REPORT.md section 5.1; they are labels computed from recorded fields.
- `candidate_tests.csv` — every filter tested (one fixed grid; in-sample; exploratory). `exit_comparison_identical_buys.csv` — the ten rows on buys where all ten are closed (biased towards quick stop-outs; see the report). `book_overlap.csv`, `class_counts.csv`, `distinct_first_buys.csv`.
- `manifest.json` — cut-off, commit, row counts and SHA-256 of every file, and the raw tables' SQL.

## What is not in the package, and what that prevents
- Minute bars of coins that were never bought (only hourly high/low/volume for all coins; minute bars of the 272 bought coins are in the raw branch). Prevents exact replay of signals on never-bought coins.
- Raw per-trade observations (the bot keeps them in memory only; a buy stores up to 1,500 observations of its own trigger window — in the raw `entries` table, field `evidence`). Prevents re-running a rule tick by tick outside those windows.
- Coins whose pool is not paired with SOL (never priced by the bot), coin names of live coins, social fields, holder and deployer history.
- The commit of each program start (inferred) and the lowest executable value while held (only spot lows from minute bars).
