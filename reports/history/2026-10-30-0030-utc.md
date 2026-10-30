# 4-hour study — 30 Oct 2026 00:30 UK

**The 00:05 UK push did not arrive: `pushed_at` still 2026-10-29T20:08:31Z (20:08 UK), `data` still commit e0d61b3, data 4 h 17 min old at 00:26 UK (under the 5-hour flag, but every push that has ever landed came by :10, so this one is missed, not late).** The 20:30 UK report called this slot the first test of whether the 20:08 UK recovery holds; it did not. Of the last nine :05 slots (20:05 UK 28 Oct → 00:05 UK 30 Oct) two landed (08:08 and 20:08 UK 29 Oct) and seven missed. The pattern since 22 Oct is now: six misses (22–23 Oct), three (28–29 Oct), two (29 Oct), one so far (30 Oct), with no change on the `tracker` branch across all of it (no code commit since 24 Oct 17:40 UK). Nothing is lost for the books: abcd.csv and others.csv have been frozen since BOOKS_OFF (19:46 UK 23 Oct) and the executor is stopped; the only file not being seen is launches.csv (last row 19:04 UK 29 Oct). The cause is still not visible from the data; the check on the box (`pm2 status`, the cron log, `bash scripts/push-data.sh` by hand, and the time each step takes) is still the only way to find it.

**Since last study (29 Oct 20:30 UK):** no push, no trades, no legs, no code change. The data files this run scored are byte-for-byte the files the 20:30 UK run scored (same `data` commit), so this is the ninth study on the same trade rows; `numbers.py --write` changed no book file. The books are still off (BOOKS_OFF since 19:46 UK 23 Oct, v0.18.185; status.json frozen at 19:48 UK 23 Oct, executor v0.4.18, wallet 0.030 SOL, no open positions). abcd.csv still has 15,225 triggers ending 18:45 UK 23 Oct; executor.json's last leg is still MOOF (GR2 live, 10:09 UK 23 Oct).

## The kept books

Unchanged from 12:50 UK 28 Oct onwards (same rows; numbers.py's scoring: real costs, operator coins out, price-glitch rows out, lateFix). Forward = trades since the book's change, to 19:46 UK 23 Oct.

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

No trades this period. The last period's grouping (07:09–19:46 UK 23 Oct, the kimchi wave) is in the 12:50 UK 28 Oct report (reports/history/2026-10-28-1250-utc.md) and in each book's file.

## Costs — does the model still match the legs?

No legs since 10:09 UK 23 Oct. The last readings stand: `asoc` 62 legs +3 points above the PumpSwap model (fills match paper); `grad` 65 legs, entry gap +10–35% on fresh bundle-launch pools; `bl` 67 shadow legs 10–20 points under paper on trail exits and live about half of paper; `gr2` live stops measured from the real entry (og kimchi sold at 0.73x before 20x) — the code question in LESSONS (28 Oct 12:50 UK) is still open.

## Anything new (luck-checked)

Nothing proposed; no new rows of any kind, so nothing was tested and the strategy register (reports/strategies.json) was not re-judged — not one out-of-sample trade has been added since it was last judged. The launches.csv count of 20:30 UK (71 bundle-launch coins in 23 h, 94% graduated, 7 at 10x+) stands as the latest, record only.

## What I would do now

Nothing changes while the books are off; the 12:50 UK 28 Oct recommendations stand: if the record is to continue, restart paper and shadow only, with about 0.3 SOL in the executor wallet so shadow quotes can simulate; settle the GR2 local-stop question (stop measured from the real entry) before any live restart; GR2 live at 0.1 if at all; keep K, S3 and AS2 retired; AS, AS3, AS4, S4 stay paper.

On the push: it has now missed seven of nine slots in 28 hours and each recovery has been a single push, not a run of them. Every landed push since 22 Oct is stamped :08–:10, so the script takes three to five minutes even when it works — the slow step (most likely the abcd.csv fetch from the tracker web port, 44 MB) is the first thing to time on the box. I would not restart any book until the push has landed on three consecutive :05 slots; a restart now would leave the first forward trades invisible to the study for up to 16 hours at a time, and the per-book checkpoints (AS3 at 60, AS4 at 30, S4 at 60, GR2's 20th live leg) would be judged on rows that arrive in blocks.

## Next

The next run (04:30 UK 30 Oct) checks whether the 04:05 UK push lands and whether BOOKS_OFF has been lifted; until the books are back on there is nothing to score beyond the launches file.
