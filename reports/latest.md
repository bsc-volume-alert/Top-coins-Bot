# 4-hour study — 29 Oct 2026 12:30 UK

**The 12:05 UK push did not arrive. `pushed_at` is still 2026-10-29T08:08:47Z (08:08 UK), 4 h 21 min old at 12:30 UK — under the 5-hour flag, but the push due 25 minutes ago is missing, and every push that has ever arrived came by :10.** So the 08:08 UK push was one success inside the outage, not the end of it: of the last five :05 slots (20:05 UK 28 Oct, 00:05, 04:05, 08:05, 12:05 UK 29 Oct) four were missed. This run scored exactly the data commit the 08:30 UK run scored (`data` 3acc7ef) — the sixth study in a row on the same trade rows. The cause is still not visible from the data: no code commit on `tracker` since 24 Oct 17:40 UK, scripts/push-now.txt untouched since 23 Oct 20:22 UK, the server was up through the previous gap (launches.csv had every hour). Whether it was up through this one cannot be seen until a push lands.

**Since last study (29 Oct 08:30 UK):** no data push; no trades, no legs, no code change. The books are still off (BOOKS_OFF since 19:46 UK 23 Oct, v0.18.185; executor stopped — status.json frozen at 19:48 UK 23 Oct, v0.4.18, wallet 0.030 SOL, no open positions). abcd.csv still has 15,225 triggers ending 18:45 UK 23 Oct, others.csv ends at the same hour, executor.json's last leg is still MOOF (GR2 live, 10:09 UK 23 Oct), launches.csv's last row is 07:04 UK 29 Oct. `numbers.py --write` changed no book file.

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

Nothing proposed; nothing to test — no new rows of any kind this run (the launches.csv count in the 08:30 UK report is the latest: 91 bundle-launch coins in 23 h, 82% graduated, 14 at 5x+). The strategy register was not re-judged.

## What I would do now

Nothing changes while the books are off; the 12:50 UK 28 Oct recommendations stand: if the record is to continue, restart paper and shadow only, with about 0.3 SOL in the executor wallet so shadow quotes can simulate; settle the GR2 local-stop question (stop measured from the real entry) before any live restart; GR2 live at 0.1 if at all; keep K, S3 and AS2 retired; AS, AS3, AS4, S4 stay paper.

The push is the thing to fix first. Four of the last five pushes missed, with the server up through the earlier gap, so the failure is in the push step, not the recorder. From here the candidates are unchanged (LESSONS, 00:30 and 04:30 UK 29 Oct): the abcd.csv fetch from the tracker web port exits silently, the final `git push -f` can fail silently, and a cron that is not running looks identical. The check on the box — `pm2 status`, the cron log, then `bash scripts/push-data.sh` by hand to see which step stops — is the only way to find it. Do not restart any book before that, or its first trades will be invisible to the study for as long as the push is down.

## Next

The next run (16:30 UK) checks whether the 16:05 UK push arrives and whether BOOKS_OFF has been lifted; until a push lands there is nothing to score.
