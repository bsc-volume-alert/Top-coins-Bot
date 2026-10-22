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
**21 Oct 11:30 UK:** Switch off and fold into one book. PG's only paying slice — 31 rows where the launch bundle bought 70–80% of supply over 4–10 wallets (2x-or-30-min +66.7%, luck 1) — is S8's trade: 27 of the 31 are S8 rows bought at the same second (median 6 s) and the same price (median ratio 1.00), and S8 has 91 of them back to 19 Oct. It is not independent confirmation, it is the same coins seen twice. Outside that slice PG is −19.9% on 204. The owner wants fewer books: one bundle-launch book, built on S8's trigger (S8.md), covers it.

**21 Oct 02:30 UK:** Dead; the pre-graduation run-up is where the bundle sells.

**Not working. Proposed for switch-off, awaiting the owner's go.**
- On its first 76 trades (19:00–23:27 UK) the headline exit lost **−21.3% a trade**: median −48.9%, only 24% won, **70% hit the −40% stop**. −1.70 SOL at 0.1 a trade.
- Every other exit on the same coins was also −18% to −25%.

## Latest numbers
<!-- NUMBERS -->
_Data to 22 Oct 01:04 UK; curve costs. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 20 Oct 18:50 UK) | 322 | -15.2% | -15.5% | 30% | 63% | -5.22 |
| last 24 h | 223 | -12.8% | -13.3% | 33% | 61% | -3.08 |
| last 12 h | 51 | -10.0% | -12.0% | 33% | 59% | -0.56 |
| last 6 h | 0 | — | — | — | — | — |
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
- 21 Oct 14:15 UK — SWITCHED OFF the page (v0.18.176); folded into BL (S8.md). Data keeps recording.

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

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/PG.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 107 trades −21.8% (no-best −22.9%), 69% stopped, −8.5 SOL a day at 0.1 pace. Best exit (x_h3l) −14.0%. One slice: entry MC < $32.2K, 16 trades +15.8%, luck 2 — tiny.

- 21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_PG.md; scratchpad/rev_op/s8pg1.py–s8pg4.py, bund_op.py):
  - **Winners as a group** (235 rows, 2x/−40%): 55 big winners (+88%): launch bundle 29% of supply over 3 wallets, 14 holders at entry, 1.09x at 10 s, peak 3.4x. **Losers:** 150 stopped (−56%): bundle 0.9% over 1 wallet, 5 holders, 0.78x at 10 s, peak 1.26x. PG's losers are unbundled coins racing up the curve on their own; its winners are bundled launches. The book as a whole: −14.9% on 235, −5.7 SOL a day at 0.1.
  - **Exit verdict, whole book:** every exit loses (−2.5% to −34.7%); the "best", x_h3l, is a corrupt column (see GR.md 11:30 UK: 3-min exits printed above the 3-min high) and is not to be used.
  - **Factor / pair verdict:** 247 filters × 14 exits, 27 candidates unlikely to be luck — all of them the same thing: a heavy bundle bought young. The search's pick, **bundle ≥ 58% and under 21 s old, 2x-or-30-min: n31 +72.5% (without best +50.8%, without top 3 +22.3%), won 61%, thirds +18.0 / +64.9 / +128.8, luck 1.** All 31 are the 70–80%-bundle, 4–10-wallet launch type (bundle 74.3–75.4%, 4–6 wallets, bought at $32K MC 4–9 s after launch). On the type (31 rows) PG's exits: 2x-or-30-min +66.7% (without top 3 +15.9%, won 58%, 42% end at about −78% because it has no stop); trail +62.7% (without top 3 +7.4%); 15-min +33.1%; 5-min +16.4%; current 2x/−40% +12.4%; 3-min +0.1%. The launch type, its base rates (100 a day, 83% graduate, dumped by 15 min) and the operator signatures are described in S8.md.
  - **Same coins as S8:** 27 of the 31 are S8 rows — same second (median 6 s), same price (median ratio 1.00). PG's slice is S8's slice seen again; S8 has 91 of these rows back to 19 Oct 14:36 UK against PG's 31 since 20 Oct 19:43 UK, so S8 is the book to revise. The 4 PG-only rows (Kimchi Boss, Baaumi, Hello Kitty, Pepchi — all 03:31–04:46 UK 21 Oct, 74.3–75.4% over 4–6 wallets) have no S8 row at all, not even a skip; the reason is not in the data. The 3 S8-only rows PG missed were under $32K at entry.
  - **Which exit for the one book** (paired on S8's 91 rows, S8.md): 2x-or-30-min is a lottery — median −21 points against the trail, worse on 20 of 30, without top 3 −18 points; the trail beats 5-min by +20.7 (p 0.045) and split beats 5-min by +12.9 (p 0.054). Not PG's exit.
  - **Which entry:** PG's ($32–40K, under 150 s) and S8's (first trade after +4 s) are the same trade on this type because the bundle itself puts the first trade at $27–36K. S8's trigger is earlier by nothing and catches the under-$32K ones too; PG's 272-buyer and 80-SOL-dev gates add nothing here (creator buys are 0–0.3 SOL).
  - **Proposed: SWITCH PG OFF** (all three variants) and fold the slice into the revised S8 ("BL", S8.md). No profitable PG version exists that is not already S8's.
- 21 Oct 14:00 UK (data to 13:20 UK; method: scratchpad deep.py / cross.py / decile.py; full output in diag/deep_seven_1400.txt): Deep multivariate search (LESSONS 14:00 UK): 17 entry columns; AUC 0.50 / 0.51 out of sample (chance); top 30% −19% vs −14%. The only separating columns are the launch bundle (bundle_wallets 0.59, bundle_pct 0.57, top-10 share 0.56) — the bundle-launch slice already folded into S8. Winner box holds 69% of winners and 75% of losers. Depth-2 rule (entry MC in a $32,086–32,222 band) +48.9% in sample → n6 +8.4% on the last 91 — a sliver, not a rule. **Nothing beyond the slice; switch-off stands.**

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
- PROPOSAL (21 Oct rev): SWITCH OFF — PG's only paying slice (launch bundle 70–80% of supply over 4–10 wallets, bought at $32K about 6 s after launch) is S8's trade on the same coins at the same price; fold it into the revised S8 bundle-launch book and switch PG and its variants off — exit x_t2n30 (the slice's own exit; a no-stop lottery, not the one to use) — n31 +66.7% (no-best +44.8%) thirds +0.0/+64.9/+128.8 luck 1/20 — REAL slice but NOT independent (27 of 31 are S8 rows) — fewer books: one bundle-launch book, not two; PG outside the slice is −19.9% on 204.
- awaiting go: switch PG off (all three variants).
- **Proposed 20 Oct 23:32 UK, awaiting go:** switch PG off on the page and in the tracker.
- **Possible double listing in the combined 12-h strip** (from reading the code; not checked on the live page):
  - `qBG` in src/web.js leaves out `grf`, `rev` and `k` but not `pg`.
  - So PG may show twice: once as the page book, and once as an off-page line "pg" scored on the runner / 5-min column at PumpSwap costs, without the 1-s check.
  - Fix this, or make it moot by switching PG off.
- **Next decision:** the owner's go or no on the switch-off. If kept, re-judge only on a changed rule (e.g. requiring the coin to still be climbing, or a lower MC band), never on these 76.
