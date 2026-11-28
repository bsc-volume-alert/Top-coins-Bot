# Book-by-book analysis, 23 Nov 2026 (data to 19:26 UTC)

- `books-analysis.md` — the report: whole run, every book, verdicts (keep / cull), limits.
- `entries-snapshot.json` — the bot's published record exactly as analysed (`entries.json` from the `older-data` branch at 19:26 UTC). The live file moves every 10 minutes: `https://raw.githubusercontent.com/bsc-volume-alert/Top-coins-Bot/older-data/entries.json`.
- `trades.csv` — one line per buy per book (a buy made by several books appears once per book), first buys and re-buys marked.
- `coins.csv` — one line per coin.

## Fields in `entries-snapshot.json` (`entries[]`)
- `id`, `mint`, `sym` (often null), `t` (decision time, Unix seconds UTC), `status` (`filled` / `cancelled`), `mode` (`live` = PumpSwap pool-state fill, `polled` = Jupiter routed quote), `pop` (population).
- `fam` — the books this buy belongs to. `again` — the books for which it is a RE-BUY (buying again, spec older-9, from 22 Nov 21:12 UTC); a book in `fam` and not in `again` is a first buy for that book.
- `ag` — age group at the buy: A0 under 8 h, A1 8–16 h, A2 16–24 h, A3 24–36 h, A4 36 h–90 d. `mc` — market cap (USD) at the signal.
- `ret` — result per row as a fraction of the 0.2005 SOL cost, after modelled fees; `null` = still open; a key that is absent = this buy does not carry that row. Keys: `t20 t25 t30 t40 t60` = trailing stop of that percent; `h…` = half sold at 2× cost, the rest trailed. Suffix `x` = the CONT-STALL rows (sold at 60 min if never 1.15×), suffix `k` = the HH-BREAK-4H rows (sold at 4 h). The 60% stop exists from 21 Nov 14:30 UTC.
- `max` — highest value of the full position after the buy as a multiple of cost (24-hour horizon), whether or not a stop had sold it.
- Measured at the buy: `v5` 5-minute volume (USD), `b1` / `b5` buyers in 1 / 5 minutes, `top5` share of the 5-minute buying by the five largest buyers, `surge` volume against its norm, `holders`, `traders5`, `hc5` holder change over 5 minutes (%), `delay` fill delay (s), `chk` account check difference (%), `flags` count of flags, `fee` transfer fee (bps), `warm` restart gap inside the decision window (s).

SOL result of a row = `ret × 0.2005`. Everything here is paper trading: no real order was placed.
