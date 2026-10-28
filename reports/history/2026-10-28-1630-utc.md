# 4-hour study — 28 Oct 2026 16:30 UK

**Nothing new to score. The books are still off** (BOOKS_OFF since 19:46 UK 23 Oct, v0.18.185; executor stopped). The data push works (`pushed_at` 2026-10-28T16:09:48Z, 20 minutes before this run) but abcd.csv and others.csv still end at 19:45 UK 23 Oct (15,220 and 20,710 rows, the same as at 12:50 UK), executor.json's last leg is still MOOF (GR2 live, 10:09 UK 23 Oct), status.json still shows the wallet at 0.030 SOL, and `numbers.py --write` changed no book. No commit has touched the books or the reports since the 12:50 UK study. As that study said: same rows, so this run says so rather than re-scoring.

**Since last study (28 Oct 12:50 UK):** no trades, no legs, no code change on `tracker`. The only live file is launches.csv; one count from it is under "Anything new".

## The kept books

Unchanged from 12:50 UK (same rows; numbers.py's scoring: real costs, operator coins out, price-glitch rows out, lateFix). Forward = trades since the book's change, to 19:46 UK 23 Oct.

| Book | Change | Trades since the change | Result a trade (real costs) | Without best 3 | Won | Stopped | Shadow / live legs, real vs paper | Checkpoint |
|---|---|---|---|---|---|---|---|---|
| **AS** | 20 Oct 17:45 UK | 108 (+0) | +1.6% (thirds +13 / −6 / −2) | −3.3% | 53% | 37% | `asoc` shadow 62 legs +0.384 SOL, fills match paper (+3 points) | 120 not reached; frozen |
| AS2 | 21 Oct 01:30 UK | 76 (+0) | −3.1% | −7.5% | 51% | 42% | — | drop (stands) |
| AS3 | 21 Oct 01:30 UK | 56 (+0) | +4.1% (thirds +3 / 0 / +10) | −1.4% | 59% | 36% | — | 56 of 60; frozen |
| AS4 | 21 Oct 14:45 UK | 10 (+0) | −24.2% | −46.7% | 30% | 60% | — | 10 of 30; frozen |
| **GR** | 21 Oct 09:47 UK | 154 (+0) | +3.6%; bundle 96 at +11.3% vs other 58 at −9.1% | 0.0% | 53% | 20% | `grad` shadow 65 legs +0.211 SOL; entry gap +10–35% on fresh bundle-launch pools | whole book: no (stands); bundle split holds |
| GR2 | 21 Oct 17:00 UK | 86 paper (+0) | +80.4% on the trail; −11.7% on the last 22 without og kimchi | +44.6% | 42% | 31% | live 19 legs +0.390 SOL (−0.72 without kimchisol) | 20th live leg not reached; frozen |
| **BL** | 21 Oct 14:45 UK | 169 (+0) | +37.2%; −12.3% on the last 42 without og kimchi | +14.7% | 33% | 40% | `bl` shadow 67 legs +1.047 SOL, quotes 10–20 points under paper on trail exits; live 13 legs −0.516 SOL, 0 won | 40 shadow legs: answered 23 Oct — fills do not match paper on trail/stop exits |
| K (revised) | 21 Oct 14:50 UK | 64 (+0) | −19.7% | −24.9% | 23% | 73% | — | retire (stands) |
| S3 (revised) | 21 Oct 08:45 UK | 84 (+0) | −21.9% | −23.1% | 19% | 37% | — | retire (stands) |
| S4 (revised) | 21 Oct 10:28 UK | 13 (+0) | −8.6% (one coin, JETPUMPX) | −24.4% | 31% | 31% | — | 13 of 60; frozen |

No checkpoint moved and none can move while BOOKS_OFF stands.

## Successes and failures this period

No trades this period. The last period's grouping (07:09–19:46 UK 23 Oct, the kimchi wave) is in the 12:50 UK report (reports/history/2026-10-28-1249-utc.md) and in each book's file.

## Costs — does the model still match the legs?

No legs since 10:09 UK 23 Oct. The last readings stand: `asoc` 62 legs +3 points above the PumpSwap model (fills match paper); `grad` 65 legs, entry gap +10–35% on fresh bundle-launch pools; `bl` 67 shadow legs 10–20 points under paper on trail exits and live about half of paper; `gr2` live stops measured from the real entry (og kimchi sold at 0.73x before 20x) — the code question in LESSONS (28 Oct 12:50 UK) is still open.

## Anything new (luck-checked)

Nothing proposed. One count, record only, from the live launches.csv (16:06 UK 27 Oct → 15:05 UK 28 Oct, 44,119 launches): **the bundle-launch coin type that GR2 and BL buy is still being made.** 112 launches in 23 h had a 70–80% bundle over 4–10 wallets (about 5 an hour); 88 of them graduated (79%, against 1.1% of all launches), 64 peaked at 2x+ and 34 at 5x+ by the recorder's peak multiple (xpeak — a price path, not a trade result). The 79.31% / 85 SOL signature (LESSONS, 21 Oct: 27 in 23 h then) is 48 of the 112 (37 over 7 wallets); og kimchi's 74.3% / 68 SOL signature 9. This is not a test of any book and passes no luck check; it only says the factory did not stop when the books did.

## What I would do now

Nothing changes while the books are off; the 12:50 UK recommendations stand, in short: if the record is to continue, restart paper and shadow only with about 0.3 SOL in the executor wallet for simulation; settle the GR2 local-stop question (stop measured from the real entry) before any live restart; GR2 live at 0.1 if at all; keep K, S3 and AS2 retired; AS, AS3, AS4, S4 stay paper. The one thing this run adds: the coin type is still available at about 5 launches an hour, so a paper/shadow restart would refill GR2's and BL's records quickly (BL took 169 rows in 2½ days). The owner decides.

## Next

- If BOOKS_OFF still stands at the next run, say so in one line again; do not re-score.
- If lifted: AS 120 forward (12 to go), AS3 60 (4), AS4 30 (20), GR2 20th live leg, BL/GR2 live sells vs paper leg by leg — and read the first block after the restart separately (a restart wipes in-memory state).
- launches.csv only ever holds about 23 h, so the bundle-launch count above cannot be extended backwards; if the owner wants the daily rate kept, it has to be counted each run.
