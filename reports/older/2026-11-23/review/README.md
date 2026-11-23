# Independent-review data package (in preparation, 23 Nov 2026)

Requested by the owner at 19:58 UK on 23 Nov (ChatGPT's brief "full performance investigation and independent-review data package").
Analysis only: nothing here changes a rule, a book or the running bot.

Status at 20:12 UK: the tools are written and tested on a local test database. The raw records are not here yet — they are
copied off the server by the one line in `tools/server-export-line.txt` (read-only; keys removed; refuses to send if a key
pattern is found) to the branch `older-review-data`.

## How the package is produced
1. On the server (owner pastes it once): `tools/server-export-line.txt` → branch `older-review-data` (raw tables as gzipped
   NDJSON + `manifest.json` with row counts, the SQL of each table and SHA-256 of each file).
2. `node tools/build.mjs <raw-dir> <checkout of older-coins> <out-dir>` → books.csv, variants.csv, code_rule_periods.csv,
   coverage_and_incidents.csv, entries.csv, entry_features.csv, entry_candidates.csv, fills.csv, sales.csv, positions.csv,
   decisions.csv, rejections.csv.gz, rejections_by_book.csv, coin_outcomes.csv, manifest.json.
3. `node tools/analyse.mjs <out-dir>` → scoreboard.csv, scoreboard_variants.csv, chronology.csv, coin_ledger.csv,
   book_overlap.csv, candidate_tests.csv, exit_comparison_identical_buys.csv, class_counts.csv.

Needs Node 22 and the bot's own `better-sqlite3` only on the server; steps 2–3 need Node only.
