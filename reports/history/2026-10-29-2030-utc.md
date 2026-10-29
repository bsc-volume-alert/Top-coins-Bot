# 4-hour study — 29 Oct 2026 20:30 UK

**The data push is back: `pushed_at` 2026-10-29T20:08:31Z (20:08 UK), 22 minutes old at this run, `data` commit e0d61b3.** It landed after the 12:05 and 16:05 UK misses — 16 hours from the 08:08 UK push, the same shape as the 28–29 Oct and 22–23 Oct outages. Of the last eight :05 slots (20:05 UK 28 Oct → 20:05 UK 29 Oct) two landed and six missed, and each outage has ended on its own with no change on the `tracker` branch (no code commit since 24 Oct 17:40 UK). The launch recorder ran through the whole gap — launches.csv has every hour from 20:05 UK 28 Oct to 19:04 UK 29 Oct (32,083 launches, lowest hour 672 at 08:00 UK) — so the server was up and only the push step failed. The cause is still not visible from the data; the check on the box (`pm2 status`, the cron log, `bash scripts/push-data.sh` by hand) is still the only way to find it.

**Since last study (29 Oct 16:30 UK):** one push (20:08 UK), no trades, no legs, no code change. The books are still off (BOOKS_OFF since 19:46 UK 23 Oct, v0.18.185; executor stopped — status.json frozen at 19:48 UK 23 Oct, v0.4.18, wallet 0.030 SOL, no open positions). abcd.csv still has 15,225 triggers ending 18:45 UK 23 Oct, others.csv ends at the same hour, executor.json's last leg is still MOOF (GR2 live, 10:09 UK 23 Oct). `numbers.py --write` changed no book file — this is the eighth study on the same trade rows. The only file with new rows is launches.csv.

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

Nothing proposed; no trade rows to test, so the strategy register (reports/strategies.json) was not re-judged — not one out-of-sample trade has been added since it was last judged. One count, record only, from the fresh launches.csv (20:05 UK 28 Oct → 19:04 UK 29 Oct, 32,083 launches, 418 graduated = 1.3%): **the bundle-launch coin type GR2 and BL buy is still being made, at about the same rate as this morning's count.** 71 launches in 23 h had a 70–80% bundle over 4–10 wallets (3 an hour; 91 in the 08:30 UK count on a window that overlaps this one by 11 hours, 112 on 28 Oct), 67 graduated (94%), 40 peaked at 2x+, 14 at 5x+ and 7 at 10x+ by the recorder's xpeak; the median price one hour after launch is 0.10x of the launch price — the same peak-then-dump path as always. The 79.31% / 85 SOL signature is 35 of the 71 (all graduated, median peak 2.6x) and holds six of the seven 10x+ coins (Hexncoin 43.8x at 16:56 UK, Houseworming 24.1x, Amazon.com Inc. 20.0x, OWLO 14.1x, RETARDIO TROLL 13.3x, tofu 10.9x); the other 36 signatures graduated 32, median peak 2.05x, one at 10x+. These are recorder price paths, not trade results — no luck check applies, and they change nothing about the verdict on this coin type: the paper trail is not obtainable on real money until a live sell fills near paper (13 live BL legs, 0 won; LESSONS 22 Oct 05:50 UK).

## What I would do now

Nothing changes while the books are off; the 12:50 UK 28 Oct recommendations stand: if the record is to continue, restart paper and shadow only, with about 0.3 SOL in the executor wallet so shadow quotes can simulate; settle the GR2 local-stop question (stop measured from the real entry) before any live restart; GR2 live at 0.1 if at all; keep K, S3 and AS2 retired; AS, AS3, AS4, S4 stay paper.

On the push: it is working again, but it has now failed and recovered three times in eight days (22–23 Oct six misses; 28–29 Oct three; 29 Oct two) with nothing changed on this side each time. A push that comes back on its own points at something that clears itself — a hung fetch of abcd.csv from the tracker port that times out eventually, or a `git push -f` that fails while something else holds the remote — rather than a dead cron. Every landed push is stamped :08–:10 rather than :05 (20:08, 08:08, 16:09 UK), so the script runs three to five minutes before it pushes — a step inside it is slow even when it works, which is worth noting while on the box. I would still not restart any book until the push has landed on three consecutive :05 slots, otherwise the first forward trades after the restart may be invisible to the study for 16 hours at a time.

## Next

The next run (00:30 UK 30 Oct) checks whether the 00:05 UK push lands (the first test of whether this recovery holds, unlike the 08:08 UK one) and whether BOOKS_OFF has been lifted; until the books are back on there is nothing to score beyond the launches file.
