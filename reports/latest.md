# 4-hour study — 28 Oct 2026 20:30 UK

**Nothing new to score. The books are still off, and this run had no new data at all.** The `data` branch is the same commit the 16:30 UK study read (`892c98f`, `pushed_at` 2026-10-28T16:09:48Z): the 20:09 UK push did not arrive, so the data is 4 h 17 min old at this run (under the 5-hour flag, but one push missed). abcd.csv and others.csv still end at 19:45 UK 23 Oct (BOOKS_OFF since 19:46 UK 23 Oct, v0.18.185; executor stopped), executor.json's last leg is still MOOF (GR2 live, 10:09 UK 23 Oct), status.json still shows the wallet at 0.030 SOL, launches.csv still ends 15:05 UK 28 Oct, and `numbers.py --write` changed no book. No commit has touched code on `tracker` since 24 Oct 17:40 UK (radar 0.4.0 / coin scope 0.8.0). As the 16:30 UK report's "Next" says: same rows, so this run says so in one line rather than re-scoring.

**Since last study (28 Oct 16:30 UK):** no trades, no legs, no code change, no data push.

## The kept books

Unchanged from 12:50 UK and 16:30 UK (same rows; numbers.py's scoring: real costs, operator coins out, price-glitch rows out, lateFix). Forward = trades since the book's change, to 19:46 UK 23 Oct.

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

No trades this period. The last period's grouping (07:09–19:46 UK 23 Oct, the kimchi wave) is in the 12:50 UK report (reports/history/2026-10-28-1250-utc.md) and in each book's file.

## Costs — does the model still match the legs?

No legs since 10:09 UK 23 Oct. The last readings stand: `asoc` 62 legs +3 points above the PumpSwap model (fills match paper); `grad` 65 legs, entry gap +10–35% on fresh bundle-launch pools; `bl` 67 shadow legs 10–20 points under paper on trail exits and live about half of paper; `gr2` live stops measured from the real entry (og kimchi sold at 0.73x before 20x) — the code question in LESSONS (28 Oct 12:50 UK) is still open.

## Anything new (luck-checked)

Nothing proposed; nothing to test. launches.csv did not move either (same 44,127 launches to 15:05 UK 28 Oct), so the 16:30 UK bundle-launch count (112 launches of the GR2/BL coin type in 23 h, 88 graduated) is the latest and is not re-counted.

## What I would do now

Nothing changes while the books are off; the 12:50 UK recommendations stand, in short: if the record is to continue, restart paper and shadow only with about 0.3 SOL in the executor wallet for simulation; settle the GR2 local-stop question (stop measured from the real entry) before any live restart; GR2 live at 0.1 if at all; keep K, S3 and AS2 retired; AS, AS3, AS4, S4 stay paper. One thing to watch rather than do: the 20:09 UK data push was missed. One miss is not the 22–23 Oct outage (six in a row), and nothing is lost while the books are off because the trade files are frozen anyway — but if the 00:09 UK push also misses, scripts/push-data.sh is worth a look before any restart, otherwise the restart's first trades would be invisible to the study. The owner decides.

## Next

- If BOOKS_OFF still stands at the next run, say so in one line again; do not re-score.
- Check `pushed_at` first: if it is still 16:09 UK 28 Oct at 00:30 UK, that is two pushes missed — say so at the top.
- If lifted: AS 120 forward (12 to go), AS3 60 (4), AS4 30 (20), GR2 20th live leg, BL/GR2 live sells vs paper leg by leg — and read the first block after the restart separately (a restart wipes in-memory state).
