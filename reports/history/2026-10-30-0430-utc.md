# 4-hour study — 30 Oct 2026 04:30 UK

**The 04:05 UK push landed: `pushed_at` 2026-10-30T04:08:41Z (04:08 UK), `data` commit of 04:08:43 UK, data 17 minutes old at 04:25 UK.** That is the third landing in the last ten :05 slots (08:08 UK and 20:08 UK 29 Oct, 04:08 UK 30 Oct; seven missed, the last of them 00:05 UK). The landings are now 12 and 8 hours apart, each a single push; the 00:30 UK note asked for three consecutive :05 landings before any book is restarted, and this is one. The recorder ran through the missed 00:05 slot without a gap (launches.csv has every hour from 04:00 UK 29 Oct to 03:05 UK 30 Oct, 30,358 launches, lowest hour 672), so, as on 23 Oct and twice on 29 Oct, the server was up and only the push failed; the cause is still not visible from the data (no code commit on `tracker` since 24 Oct 17:40 UK; every landed push is stamped :08–:10). The check on the box (`pm2 status`, the cron log, `bash scripts/push-data.sh` by hand, timing each step) is still the only way to find it.

**Since last study (30 Oct 00:30 UK):** one push, no trades, no legs, no code change. The books are still off (BOOKS_OFF since 19:46 UK 23 Oct, v0.18.185; status.json frozen at 19:48 UK 23 Oct, executor v0.4.18, wallet 0.030 SOL, no open positions; executor.json's `now` stamp is 04:05:59 UK, so its status writer is alive while the executor stays stopped). abcd.csv still has 15,225 triggers ending 18:45 UK 23 Oct, others.csv is unchanged, executor.json's last leg is still MOOF (GR2 live, 10:09 UK 23 Oct). `numbers.py --write` changed no book file — this is the tenth study on the same trade rows. The only file with new rows is launches.csv (8 new hours, 19:04 UK 29 Oct → 03:05 UK 30 Oct), which is record only.

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

Nothing proposed; no trade rows, so nothing was tested and the strategy register (reports/strategies.json) was not re-judged — not one out-of-sample trade has been added since it was last judged. One count, record only, from the 8 new hours of launches.csv (19:04 UK 29 Oct → 03:05 UK 30 Oct, 11,731 launches, 172 graduated = 1.5%): **the bundle-launch coin type came faster than before — 44 coins in 8 hours (5.5 an hour against 3 an hour on 28–29 Oct), 43 graduated (98%), 37 peaked at 2x+, 24 at 5x+, 7 at 10x+**; median price one hour after launch 0.18x of the launch price (the same peak-then-dump path). The 79.31% / 85 SOL signature made 36 of the 44 (all graduated, median peak 5.8x) and all seven of the 10x+ coins (Amazon.com Inc. 23.3x 20:42 UK, fomo 18.9x 19:59 UK, NVIDIA 16.9x 22:33 UK, WASTED 14.4x 21:40 UK, Rockstar Games 12.6x 02:07 UK, Tesla Super Intelligence 11.9x 01:16 UK, Fomo Family 11.2x 22:20 UK); the other 8 signatures graduated 7, median peak 1.65x, none at 10x+. Over the whole 24-hour file: 99 bundle-launch coins, 97 graduated, 35 at 5x+, 13 at 10x+, the signature 67 of the 99 holding 12 of the 13. These are recorder price paths, not trade results — no luck check applies, and they change nothing about the verdict on this coin type: the paper trail is not obtainable on real money until a live sell fills near paper (13 live BL legs, 0 won; LESSONS 22 Oct 05:50 UK). What the evening adds is a warning about counting: one operator made 36 launches in 8 hours after 35 in the previous 23, so BL's and GR2's forward trades will arrive in bursts, and a 40-trade checkpoint on either could be one evening of one operator — judge those checkpoints by operator signature and by period, not by the count alone (the three-period test in LESSONS already requires this).

## What I would do now

Nothing changes while the books are off; the 12:50 UK 28 Oct recommendations stand: if the record is to continue, restart paper and shadow only, with about 0.3 SOL in the executor wallet so shadow quotes can simulate; settle the GR2 local-stop question (stop measured from the real entry) before any live restart; GR2 live at 0.1 if at all; keep K, S3 and AS2 retired; AS, AS3, AS4, S4 stay paper.

On the push: one landing is not a recovery. Three of the last ten slots landed and no two in a row; the pattern since 22 Oct is still a silent failure that clears on its own for one push. I would hold the restart until the 08:05 and 12:05 UK pushes both land (three in a row), and in the meantime time the script by hand on the box — every landed push is stamped 3–5 minutes after the slot, so the slow step (most likely the 44 MB abcd.csv fetch from the tracker web port, or the final `git push -f`) is the first thing to look at. If a restart is wanted before the push is fixed, the first forward trades will be invisible to the study for up to 16 hours at a time and the per-book checkpoints (AS3 at 60, AS4 at 30, S4 at 60, GR2's 20th live leg) will be judged on rows that arrive in blocks.

## Next

The next run (08:30 UK 30 Oct) checks whether the 08:05 UK push lands (the second of the three consecutive landings asked for) and whether BOOKS_OFF has been lifted; until the books are back on there is nothing to score beyond the launches file.
