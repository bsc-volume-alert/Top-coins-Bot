# 4-hour study — 29 Oct 2026 08:30 UK

**The data push is back: `pushed_at` 2026-10-29T08:08:47Z (08:08 UK), 17 minutes before this run — fresh, under the 5-hour flag.** It came back on its own after three misses (20:05 UK 28 Oct, 00:05 and 04:05 UK 29 Oct), a 16-hour gap from the 16:09 UK push; no code commit touched `tracker` (none since 24 Oct 17:40 UK) and nothing in the data says why it stopped or why it restarted — the same shape as the 22–23 Oct outage (six misses, 18 h). The server itself was up throughout: launches.csv has rows for every hour from 08:05 UK 28 Oct to 07:04 UK 29 Oct (36,714 launches; the quietest hour 949), so nothing was lost.

**Since last study (29 Oct 04:30 UK):** one data push; no trades, no legs, no code change. The books are still off (BOOKS_OFF since 19:46 UK 23 Oct, v0.18.185; executor stopped — status.json is frozen at 19:48 UK 23 Oct, v0.4.18, wallet 0.030 SOL, no open positions). abcd.csv still has 15,225 triggers ending 18:45 UK 23 Oct, others.csv ends at the same hour, executor.json's last leg is still MOOF (GR2 live, 10:09 UK 23 Oct). `numbers.py --write` changed no book. This is the fifth study in a row on the same trade rows.

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

Nothing proposed; nothing to test — no new trade rows, so the strategy register was not re-judged. One count, record only, from the fresh launches.csv (08:05 UK 28 Oct → 07:04 UK 29 Oct, 36,714 launches, 444 graduated = 1.2%): **the bundle-launch coin type GR2 and BL buy is still being made, at a lower rate than last counted.** 91 launches in 23 h had a 70–80% bundle over 4–10 wallets (4 an hour; 112 in the 16:30 UK 28 Oct count), 75 graduated (82%), 43 peaked at 2x+ and 14 at 5x+ by the recorder's xpeak (34 at 5x+ last time — fewer runners, same graduation rate). The 79.31% / 85 SOL signature is 37 of the 91; og kimchi's 74.3% / 68 SOL signature 9. A price path from the recorder, not a trade result; no luck check applies. Overall launch volume is down too: 36,714 against 44,119 in the previous 23-hour window.

## What I would do now

Nothing changes while the books are off; the 12:50 UK 28 Oct recommendations stand: if the record is to continue, restart paper and shadow only, with about 0.3 SOL in the executor wallet so shadow quotes can simulate; settle the GR2 local-stop question (stop measured from the real entry) before any live restart; GR2 live at 0.1 if at all; keep K, S3 and AS2 retired; AS, AS3, AS4, S4 stay paper.

The push is working again, so a restart of the books would now be seen by the study — but the push has failed twice in six days (18 h and 16 h) with the server up both times and no cause in the data. If the books are restarted, the check on the box (`pm2 status`, the cron log, `bash scripts/push-data.sh` by hand) is worth doing first to find what stops the push, otherwise the next outage will hide the first trades. The owner decides.

## Next

The next run (12:30 UK) checks that the 12:05 UK push arrives (two in a row would say the restoration holds) and whether BOOKS_OFF has been lifted; until then there is nothing to score.
