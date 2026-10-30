# 4-hour study — 30 Oct 2026 08:30 UK

**The 08:05 UK push landed: `pushed_at` 2026-10-30T08:08:41Z (08:08 UK), `data` commit e36eafc of 08:08:42 UK, 18 minutes old at 08:26 UK.** That is two :05 landings in a row (04:08 and 08:08 UK) — the first time since the outage began on 22 Oct that two consecutive pushes have arrived. Of the last eleven :05 slots (20:05 UK 28 Oct → 08:05 UK 30 Oct) four landed and seven missed. The 00:30 UK note asked for three consecutive landings before any book is restarted; the 12:05 UK push is the third. The recorder ran without a gap (launches.csv has every hour from 08:05 UK 29 Oct to 07:02 UK 30 Oct, 30,917 launches, lowest full hour 947), so the server has been up throughout and only the push script has been failing; the cause is still not visible from the data (no code commit on `tracker` since 24 Oct 17:40 UK; every landed push is stamped :08). The check on the box (`pm2 status`, the cron log, `bash scripts/push-data.sh` by hand, timing each step) is still the only way to find it, and two landings do not mean it has gone away — 29 Oct had a landing at 08:08 UK followed by two misses.

**Since last study (30 Oct 04:30 UK):** one push, no trades, no legs, no code change. The books are still off (BOOKS_OFF since 19:46 UK 23 Oct, v0.18.185; status.json frozen at 19:48 UK 23 Oct, executor v0.4.18, wallet 0.030 SOL, no open positions; executor.json's `now` stamp is 08:05:54 UK, so its status writer is alive while the executor stays stopped). abcd.csv still has 15,225 triggers ending 18:45 UK 23 Oct, others.csv is unchanged, executor.json still holds 1,309 legs, the last MOOF (GR2 live, 10:09 UK 23 Oct). `numbers.py --write` changed no book file — this is the eleventh study on the same trade rows. The only file with new rows is launches.csv (4 new hours, 03:05 → 07:02 UK), which is record only.

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

Nothing proposed; no trade rows, so nothing was tested and the strategy register (reports/strategies.json) was not re-judged — not one out-of-sample trade has been added since it was last judged. One count, record only, from the 4 new hours of launches.csv (03:05 → 07:02 UK, 4,302 launches, 79 graduated = 1.8%): **19 bundle-launch coins (70–80% bundle over 4–10 wallets), 4.8 an hour — down from 5.5 an hour the evening before — 18 graduated, 18 peaked at 2x+, 10 at 5x+, 4 at 10x+** (DeepSeek 13.7x 03:43 UK, Grok 12.6x 06:17 UK, Tesla Super Intelligence 10.9x 04:25 UK, GTA6 10.5x 06:42 UK; Grok and GTA6 were still inside their first hour when the file ends, so their figures are not final). Median price one hour after launch 0.12x of the launch price on the 14 coins with a full hour — the same peak-then-dump path as every earlier count. The 79.31% / 85 SOL signature made 18 of the 19 (all graduated, median peak 6.8x, all four of the 10x+ coins); the one other signature (70% / 56 SOL, Commish, entry MC $14.9K — under BL's $25K floor) peaked 1.5x. Over the whole 23-hour file (08:05 UK 29 Oct → 07:02 UK 30 Oct): 105 bundle-launch coins, 103 graduated, 43 at 5x+, 16 at 10x+, the signature 81 of the 105 holding all 16 of the 10x+ coins. These are recorder price paths, not trade results — no luck check applies, and they change nothing about the verdict on this coin type: the paper trail is not obtainable on real money until a live sell fills near paper (13 live BL legs, 0 won; LESSONS 22 Oct 05:50 UK). The operator's output stays uneven (36 launches in the evening's 8 hours, 18 in the night's 4), so the 04:30 UK warning stands: a 40-trade checkpoint on BL or GR2 could be one night of one operator, and must be judged by signature and by period, not by the count alone.

## What I would do now

Nothing changes while the books are off; the 12:50 UK 28 Oct recommendations stand: if the record is to continue, restart paper and shadow only, with about 0.3 SOL in the executor wallet so shadow quotes can simulate; settle the GR2 local-stop question (stop measured from the real entry) before any live restart; GR2 live at 0.1 if at all; keep K, S3 and AS2 retired; AS, AS3, AS4, S4 stay paper.

On the push: two landings in a row is better than any stretch since 22 Oct, but it is not yet the three the 00:30 UK note asked for, and 29 Oct showed a single landing can be followed by two misses. I would wait for the 12:05 UK push to land before restarting any book; if it does, a paper-and-shadow restart in the afternoon would be seen by the study from its first trade. Whether it lands or not, the script should still be timed by hand on the box, because nothing on `tracker` changed between the misses and the landings, so whatever fails is on the server side (the 44 MB abcd.csv fetch from the tracker web port or the final `git push -f` are the two steps that exit silently). If a restart is wanted before that, the first forward trades can be invisible to the study for up to 16 hours at a time and the per-book checkpoints (AS3 at 60, AS4 at 30, S4 at 60, GR2's 20th live leg) will be judged on rows that arrive in blocks.

## Next

The next run (12:30 UK 30 Oct) checks whether the 12:05 UK push lands (the third consecutive landing) and whether BOOKS_OFF has been lifted; until the books are back on there is nothing to score beyond the launches file.
