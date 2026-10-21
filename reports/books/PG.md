# PG — pre-graduation (buy on the curve just before graduation)
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

This file also covers PG's variants `pgh` (PG-hold) and `pg3` (sold at 3 min).

## What it is now
- **Code key:** strategy `pg` (src/pregrad.js, `PG = { MAX_AGE_S: 150, MIN_MC: 32_000, MAX_MC: 40_000, MAX_BUYERS: 272, MAX_DEV_SOL: 80 }`). Page box PG with variant lines `pgh` and `pg3`.
- **Where it runs:**
  - **Paper only**, on the page. Not in the executor (`noExec`). No Telegram.
  - Page record from 20 Oct 19:00 UK (`PG_FROM`). Scored at the **curve** cost model with the 1-second late-price rule (`lateFix`).
  - Fingerprint coins are left out of the record.
- **Entry rule:**
  - A pump.fun coin still on the bonding curve (not graduated), **under 150 s old**.
  - Market cap reaches **$32–40K** (graduation is at about $42K).
  - The launch bundle is known (+4 s), and the creator's own buy is **under 80 SOL**, so whole-curve factories are excluded.
  - **272 or fewer buyers** so far. If the buyer count is unknown, the coin is not excluded.
  - One entry per coin.
  - Bought at that trade's curve price.
- **Exits recorded on the same trade:**
  - `x_t2s40` = headline "PG-stop": sell everything at 2x or at −40%.
  - `x_t2n30` = `pgh` "PG-hold": 2x, or sell at 30 min; no stop. This column was new in v0.18.163.
  - `x_h3` = `pg3`: GR's 3-minute sale.
  - `x_h5` is also recorded.
- **Started:** 20 Oct 18:47 UK commit, v0.18.163. Paper record from 19:00 UK; the first row in the data is 18:50 UK.
- **Last rule change:** none since it started.

## Verdict now
**Not working. Proposed for switch-off, awaiting the owner's go.**
- On its first 76 trades (19:00–23:27 UK) the headline exit lost **−21.3% a trade**: median −48.9%, only 24% won, **70% hit the −40% stop**. −1.70 SOL at 0.1 a trade.
- Every other exit on the same coins was also −18% to −25%.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 01:27 UK; curve costs. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 20 Oct 18:50 UK) | 101 | -20.9% | -22.0% | 24% | 69% | -2.22 |
| last 24 h | 101 | -20.9% | -22.0% | 24% | 69% | -2.22 |
| last 12 h | 101 | -20.9% | -22.0% | 24% | 69% | -2.22 |
| last 6 h | 93 | -20.0% | -21.1% | 25% | 69% | -1.95 |
<!-- /NUMBERS -->

## Change history
- **20 Oct 18:45 UK, idea from the owner's question:**
  - The owner asked "how do you propose it? Buy it before it graduates … two exits … buy them on the first dump?"
  - Reasoning recorded in the code: GR's edge is fast, thin graduations, and every such coin races up the curve first, so buy before graduation.
  - The 24-h launch file showed:
    - 88 coins a day at $30–41K at 60 s.
    - 53% of them went on to graduate (+27% at 5 min) and 47% stalled (−26% at 5 min).
    - 43% touched 2x within 30 min.
  - Owner: "100%. Let's add those to the website."
- **20 Oct 18:47 UK commit / 19:00 UK record (v0.18.163), book PG created:**
  - Paper, curve costs, 1-s late-price rule.
  - Exits: `x_t2s40` (headline), the new `x_t2n30` (PG-hold), and `x_h3`.
  - The same release fixed the hold-exit save bug (16:25–19:05 UK). `x_t2n30` is saved by its own update (`setH3L`), so PG rows are not affected by that bug.
- No rule change since.

## Ideas tested
- **Buy the coin on the curve at $32–40K, under 150 s old, before it graduates** (PG itself). 20 Oct 19:00–23:27 UK, 76 trades, real curve costs, as reported to the owner at 23:32 UK:
  - **PG-stop (2x / −40%): −21.3%**, median −48.9%, won 24%, stops 70%, −22.8% without the best, −1.70 SOL at 0.1.
  - **PG-hold (2x / 30 min, no stop): −24.7%**, median −64.3%, won 26%, −1.95 SOL at 0.1.
  - **3-min sale: −18.8%**, won 22%.
  - **5-min sale: −17.8%**, won 24%.
  - **Failed. Proposed to drop.**
  - Rate: 76 trades in about 4.5 hours (about 17 an hour), so it is not a "few big trades" book either.
- **The 1-second late-price rule:** in the data to 00:09 UK, no PG row needed the correction (0 rows with `late_px_x`). The loss is not a price-print artefact.
- **Peaks:** in the later push (87 rows to 23:58 UK) the median peak was only 1.30x. 19 of 87 reached 2x.
- **"Buy them on the first dump"** (owner, 18:45 UK): not built as a book.
  - The closest test is the 5-min candle study of dip-buying on fast pumps after graduation: buying 30% or 50% below the peak within 3 h was −40% to −51% a trade on 300–500 coins. See R.md.
  - The summary records "dip-buying after graduation" as strongly negative.
- **Portfolio role:** PG was the third book in the plan agreed on 20 Oct 20:22 UK (GR + best D-family + PG, PG "if proven"). It is not proven.

## Notable coins
- **Winners on PG-stop (2x hit):**
  - justice for jdot (19:03 UK, $36.4K, 18 s old, peak 2.60x). Its 3-min sale would have been 0.80.
  - Rosy (19:43, peak 2.27x).
  - **PvePad (20:01, peak 5.20x; the 3-min sale would have been 3.26x).**
  - **Grok Pot (20:06, peak 5.04x, 3-min 4.59x).**
  - Fomo Cat (20:14, peak 3.77x).
  - These show the 2x cap also gives away the rare runner.
- **PvePad and Rosy were later bought by GR at graduation.** PvePad's GR leg was +41.7%, Rosy's +10.3%: the same coins, both a PG and a GR entry.
- **Worst (dead on the curve, about −80% to −90%):**
  - Bags (21:15, 118 s old, peak 1.01x): 0.22.
  - Retinue (22:21, peak 1.17x): 0.10.
  - Optimistic Inu (23:04): 0.19.
  - Pokesoft (23:58, 5 s old): 0.19.
  - The −40% stop could not save these: on the curve the price drops through the stop in one trade.

## What the owner said / decided
- **20 Oct 18:45 UK:** "how do you propose it? Buy it before it graduates … two exits … buy them on the first dump?" then "100%. Let's add those to the website …" (go for PG).
- **20 Oct 20:22 UK:** agreed in principle to the plan GR + one D-family book + PG, with PG added live only "if proven".
- **20 Oct 23:32 UK:** told "PG should be switched off … Failed: 70% hit the stop, only 24% won". No reply on PG in the log yet.

## Open items
- **Proposed 20 Oct 23:32 UK, awaiting go:** switch PG off on the page and in the tracker.
- **Possible double listing in the combined 12-h strip** (from reading the code; not checked on the live page):
  - `qBG` in src/web.js leaves out `grf`, `rev` and `k` but not `pg`.
  - So PG may show twice: once as the page book, and once as an off-page line "pg" scored on the runner / 5-min column at PumpSwap costs, without the 1-s check.
  - Fix this, or make it moot by switching PG off.
- **Next decision:** the owner's go or no on the switch-off. If kept, re-judge only on a changed rule (e.g. requiring the coin to still be climbing, or a lower MC band), never on these 76.
