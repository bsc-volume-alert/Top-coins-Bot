# Brief for a second opinion — pump.fun "funded-dev" paper books: what makes the failures fail and the successes succeed

Prepared 5 Nov 2026 08:00 UK. Everything in this folder is real data from the owner's tracker (droplet 159.89.50.72, launcher 0.8.19), pulled at 07:50 UK. Nothing is simulated. UK times = UTC in this period.

## 1. What the system does (so the columns make sense)

Every pump.fun launch is picked up at creation. For each one the tracker records:
- **Who funded the creator wallet** (`creator_trace.csv`, `wallet_trace.csv`): the funder wallet, how much SOL, how long before the launch, how many other launches that funder has made, and the funder's own funder (hop 2). Exchange hot wallets are labelled (`funder_type`).
- **The bundle** (`bundle_pct`, `bundle_sol`): share of the supply bought in the creation block and the SOL that bought it.
- **Minute-1 buying** at 60 / 90 / 120 s (`fd_watch.csv` → `checks` JSON array): net SOL bought (`net`), buy SOL / sell SOL, number of buyers, buys of 2+ SOL (`big`), market cap in SOL (`mcSol`), GMGN holder count (`holders`), chain-side buyers still holding (`holding`, = buyers − those who sold 95%+), top-holder shares, dev buy/sell, bundle sold %, venue (`pump.fun curve` or graduated/PumpSwap).
- **The first buyers** (`fd_early.csv`): up to 40 wallets per launch that bought in the creation block (`slot0`=1) or within 3 s, with SOL, tokens and whether they have exited.

Rules ("books") then book a **paper entry** at the chain price the moment they pass (`vol_paper.csv`, one row per book per coin; several books can hold the same coin). Nothing was bought for real until 06:23 UK today (see §6). Two hours after entry every trade is **scored from GMGN 1-minute candles** under ~12 exit rules, **after a real-cost model** (see §3). The score is the record.

### The books (rule definitions are in `code/fundeddev.mjs`, `RULES` array — read that, it is the truth)
Funding test ("pre_nb" in fd_watch): creator funded ≥ 2 SOL, within 2 h of launch, by a funder with ≤ 2 other launches, creator wallet's first launch, no other launch funded with the identical amount in the last days, grand-funder not a factory.
Buying bar (minute-1): net ≥ 27 SOL, mcSol ≥ 100, ≥ 3 buys of 2+ SOL, checked at 60/90/120 s ("confirm" = also not collapsing between checks — see code).

| Book | Rule | Scored | Won (venue) | Avg/trade | Avg without best coin | Median |
|---|---|---|---|---|---|---|
| FDH | FDB + still on the curve + GMGN holders ≥ 0.97 × chain buyers + holders ≥ 100 (loaded 4 Nov 22:36) | 5 | 100% | +33% | +22% | +15% |
| FDX | FD35's bar + creator funded ≥ 20 SOL + entered at 120 s only if buying still rising | 12 | 58% | +55% | +32% | +18% |
| FD | funding test + bundle 10–60% + buying bar | 62 | 39% | +43% | +30% | −22% |
| FDB | funding test + buying bar, **no bundle test** | 165 | 41% | +36% | +31% | −14% |
| A1 | buying bar only, **no funding test** — the control, on a 1-in-7 sample of launches | 238 | 36% | +22% | +19% | −20% |
| FD35 | FD with net ≥ 35, mcSol ≥ 130 | 25 | 40% | +25% | +12% | −47% |
| FD120 | FD entered at 120 s only, if still holding | 21 | 33% | +17% | +2% | −10% |
| FDL | funding test + looser bar (net ≥ 15, mcSol ≥ 60) | 92 | 36% | +40% | +27% | −41% |

(venue exit, after costs, at 07:50 UK; FD-family entries are 4 Nov 10:46 → now.) Older strategies in `vol_paper.csv` (`V300`, `V500`, `VA*`, `RF*`) are volume-trigger / runner-follow books from before 4 Nov — ignore unless useful as a control.

## 2. The files

`data/`
- **`vol_paper_flat.csv`** — START HERE. One row per paper trade, the `row` JSON already flattened: `chk_*` = the check metrics at entry (`chk_net`, `chk_buyers`, `chk_big`, `chk_mcSol`, `chk_holders` (GMGN), `chk_holding` (chain-side), `chk_exited`, `chk_sellers`, `chk_top10_pct`, `chk_dev_sold_pct`, `chk_bundle_sold_pct`, `chk_early_n`/`chk_early_sol`, `chk_venue`, `chk_at` = which check entered (60/90/120)), `fd_*` = funder data (`fd_funder_sol`, `fd_funded_min_before`, `fd_funder_launches`, `fd_bundle_pct`, `fd_bundle_sol`). Scored rows: `done=1 AND err IS NULL`. Outcomes: `x5 x15 x30 x60 x120` = price vs entry at those minutes, `peak120`, `peak_min`, `low_before_peak`; exits `x_*` (multiple at exit) and `r_*` (net return after costs; `r_venue` is the exit we use; `r_trail40`, `r_trail25`, `r_tp2sl50`, `r_tp15sl30`, `r_half2`, `r_out10/15/20`, `r_hold60/120`, `r_tw` tight→wide, `r_trail60`). `curve`=1 bought on the bonding curve, 0 after graduation. Quote columns `q_*` = Jupiter quotes taken since 5 Nov 01:06 (entry gap `q_gap`, quoted exit `q_exit_x`).
- `vol_paper.csv` — the same with the raw `row` JSON.
- **`fd_watch.csv`** — every launch scanned since 4 Nov ~10:45 (40,500 rows), entered or not: funder data, `pre_nb` (passed funding), `pre` (passed funding + bundle 10–60%), `why` (which test failed), `checks` (JSON array of the 60/90/120 s checks, only for launches past the funding test), `entered` (which books), `name_1h`/`name_24h` (same-name launches before it), `dev_buy_sol`, `koth_ts`. This is the **non-entered population** — the base rates.
- `fd_early.csv` — first buyers per launch (see above). Join on `mint`.
- `creator_trace.csv` (61k launches, 3 h+ old, with peak mc and graduated flag — the funder base rates: who funds what, and what graduates) and `wallet_trace.csv` (funder's funder, exchange labels).
- `snipers.csv` — wallets seen buying in the first 3 s across many launches, with hit rates.
- `study_coins.jsonl` — the earlier "winner census" study: 214 coins that migrated and reached $100K+, traced back (role `runner`) plus controls; `data` holds the wallet/bundle/organic breakdown. Older, different window; use for base rates only.
- `exit_sweep.jsonl` — per-coin exit sweep on the census coins (older).
- `fd_quotes.csv` — Jupiter buy quotes on a 1-in-10 sample of checked launches that entered nothing (fill cost of the coins we avoid).
- `live_trades.csv` — empty: real trading at 0.02 SOL on FD started 06:23 UK today and FD has had no entry since (see §6).

`code/` — `fundeddev.mjs` (scanner, funding test, checks, RULES), `volpaper.mjs` (scoring, cost model, exits, live mark), `live.mjs` + `quote.mjs` (the real trades / quotes), `exits.py` + `boot.py` (the exit study with paired bootstrap — reuse the loader).
`notes/` — `LAUNCHER.md` (the project's full record, newest at the top of "Ideas tested / findings"; read 5 Nov 06:40, 04:36, 04:15, 03:20, 00:20 and 4 Nov 22:40, 21:05 entries), `LESSONS.md` (cost models and what live trading taught before).

## 3. Cost model (already applied in every `r_*` column)
Bonding curve: `r = x×0.97 − 0.02 − 1 − 0.02` (−0.01 more if the exit is a stop, x ≤ 0.62). PumpSwap (graduated): `r = x/1.02×0.967 − 1 − 0.006 − 0.02` (−0.05 more on stops). From live trading in October (LESSONS.md): a trail/stop sale into a one-transaction dump fills at about **half** the paper price — so paper stop exits on fast rugs are optimistic; real loss on a rug is −60…−80%, not −47%. First measured today: paper trail sold Robinhood at 0.908x, the live quotes (every ~5 s) showed 1.18x then 0.60x — −34% vs paper.

## 4. What we have found so far (please check it, then look past it)

A. **Half of all entries are fast rugs** (under 0.5x within 5 min of entry: 125 of 245 distinct coins) and they lose under every exit. The exit decides little; coin selection decides. Fixed targets (2x/−50%, 1.5x/−30%) lose on every book; trails win. On non-rug coins the venue decides the trail: curve coins want a wide trail (40%), graduated coins a tight one (25%) — bootstrap on 75 graduated coins +15.8 pts, CI +3.6…+25.4. That is the "venue" exit now used.

B. **The one thing most failures share that the successes don't: the buyers are already gone at 60 s.** GMGN holders at entry ÷ chain buyers so far (`chk_holders / chk_buyers`, "hpb"): < 0.5 → 16 of 16 rugged, 0 wins; 0.5–0.97 → 28% won; ≥ 0.97 → 56% won. Holds in every book (FDB 41→48%, A1 36→47%, FDL 39→53%, FD 40→56% when hpb < 0.97 is dropped). Holders < 30 at entry: 0 wins of 13. → FDH book (forward test since 22:36; 5/5 so far, ~1 trade an hour).

C. **Size at 60 s**: entry mc < $10K (< 110 SOL) → 81% rug; net < 29 SOL → 77% rug; mc ≥ $18K → 12% rug; net ≥ 48 → 22%. FDL's looser bar sits in the rug zone.

D. **Creator funding amount**: 19–60 SOL → 53% won, avg +1.0…+1.5; < 19 SOL → 64% rug; > 100 SOL → a brand-name graduated factory (below). Winners' funder median 31 SOL vs losers 13.

E. **Operator signatures** (bundle % is a fingerprint): the **79.31% / 85.005 SOL** bundle = a launch tool used on 136 launches by 135 creators (brand names: YouTube, NVIDIA, MrBeast, GTA6, Robinhood…), graduates inside 60 s, creator funded 100–780 SOL minutes before — FDB took 48: +31% avg, won 46%, a lottery with thin edge. The **42–44%** bundle operator: 13 of 16 rugged within 5 min. The **48–49.5%** operator: 8 of 22 rugged, 12 won, avg +0.75. 20–42% bundle (FDL-only zone): 22 of 38 rugged.

F. **Timing of the rug**: between 60 and 120 s (27% of losers vs 4% of winners had net buying fall 25%+ between checks), but by 120 s those coins are already at 0.33x — a flow stop at 120 s is too late. Must be avoided at entry.

G. **No effect found**: hour of day, funded-minutes-before (median 0 both), name reuse, sells/buys ratio once hpb is in, bundle 0% vs some. The night (23:00–08:00 UK) has few funded-dev launches: FD booked nothing for 9 h while FDB/A1 traded on the 79% tool's coins.

H. **Fill cost (Jupiter quotes, 0.2 SOL)**: graduated coins fill 1–4% above the paper price (impact 1–3%); curve coins quote 4–37% *below* the paper price because the chain price the paper book uses is the last transaction and is stale by the time the check runs — paper curve entries are booked at a price that had already moved.

I. The recall problem: FD's funding test catches only ~20% of the coins that later became big winners (214-coin census); 43% of those winners were funded straight from an exchange hot wallet, which the funder-launch-count test rejects; the buying bar alone catches 75% of them (A1 pond) but at a 36% win rate.

## 5. What we want from you

1. **Reproduce** the win/loss split on `vol_paper_flat.csv` (scored rows, `r_venue`, distinct coins — the books overlap, so de-duplicate by `mint` or analyse per book) and check findings A–I. Tell us where they don't hold.
2. **Failures vs successes, exhaustively**: for every feature available at entry time (everything in `chk_*`, `fd_*`, `fd_watch` columns, `fd_early` aggregates — count of block-0 wallets, their SOL, how many have exited by 60 s, sniper wallets from `snipers.csv` present, `name_1h/24h`, `dev_buy_sol`, funder hop-2 type from `wallet_trace`), compare the distributions in the two groups. Split failures into the three types (never went up / pop then dump / ran then fell through the trail) — they may have different causes. **What do the failures have in common that the successes don't, and vice versa? What have we missed?**
3. **Base rates from the non-entered population** (`fd_watch.csv`, `creator_trace.csv`): for any feature you propose, what share of launches has it, and does it predict graduation / peak mc on the 61k traced launches, not just on our 633 trades?
4. **A rule proposal** that is tested on all books, not fitted per book, with: trades kept, win rate, average, average without the best coin, thirds by time, and which winners it throws away. We judge a rule at 40+ trades: won ≥ 45%, avg ≥ +15%, positive in all thirds and without the best coin.
5. **Honest statistics**: 633 scored trades, ~250 distinct coins, heavy-tailed (the best coin is a third of a book's average). Use paired bootstrap / permutation tests; say what is noise. Do not fit to the 79% tool or to one operator's run.
6. Anything about the **fill problem** (§3, H): is there a feature that predicts a one-transaction dump (the case where no trail can fill)?

Output wanted: a written report with tables, plus the code (Python, pandas is fine) so it can be re-run on tomorrow's data.

## 6. Current live state (context, not a task)
Launcher 0.8.19 buys FD's entries for real at 0.02 SOL (Jupiter swap; curve or PumpSwap), re-quotes every 4 s, sells on the venue trail or at 2 h; records SOL out, tokens, SOL back, and the transaction timings both ways. Wallet 0.51 SOL. No FD entry has occurred since the switch went on at 06:23 UK (the night has no funded-dev launches passing the bar).
