# 4-hour study — 29 Oct 2026 04:30 UK

**Data is 12 h 17 min old at this run — over the 5-hour flag, and the third scheduled push in a row has now missed (20:05 UK 28 Oct, 00:05 UK and 04:05 UK 29 Oct).** The `data` branch is still commit `892c98f` (`pushed_at` 2026-10-28T16:09:48Z, 16:09 UK): the same files the 16:30 UK, 20:30 UK and 00:30 UK studies read, so this is the fourth study in a row on the same rows and there is nothing new to score. The books are still off (BOOKS_OFF since 19:46 UK 23 Oct, v0.18.185; executor stopped, status.json v0.4.18, wallet 0.030 SOL, no open positions); abcd.csv and others.csv still end at 19:45 UK 23 Oct, executor.json's last leg is still MOOF (GR2 live, 10:09 UK 23 Oct), launches.csv still ends 15:05 UK 28 Oct (44,127 launches). `numbers.py --write` changed no book. No commit has touched code on `tracker` since 24 Oct 17:40 UK.

**Since last study (29 Oct 00:30 UK):** no trades, no legs, no code change, no data push — the third miss.

**What three misses mean.** Two misses could be a late cron; three in a row at 4-hour spacing is an outage, the same shape as 22–23 Oct (six misses, 18 h, LESSONS 23 Oct 01:35 / 05:30 / 09:35 UK), which ended on its own with no cause visible from the data. Nothing is lost for the kept books, because their trade files have been frozen since 23 Oct; the only live file the study is not seeing is launches.csv (the launch recorder for coin scope). scripts/push-data.sh is unchanged since 23 Oct 21:08 UK (coin scope 0.4.0) and its silent exit points are the same: the abcd.csv fetch from the tracker's own web port (`exit 1`, no Telegram) and the final `git push -f` (auth). From the `data` branch, "cron did not run", "web port did not answer" and "push refused" all look identical. The one place that separates them is the box.

## The kept books

Unchanged from 12:50, 16:30, 20:30 and 00:30 UK (same rows; numbers.py's scoring: real costs, operator coins out, price-glitch rows out, lateFix). Forward = trades since the book's change, to 19:46 UK 23 Oct.

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

Nothing proposed; nothing to test. Same rows as the last three studies, so no re-counting: the 16:30 UK bundle-launch count (112 launches of the GR2/BL coin type in 23 h, 88 graduated) is still the latest. The strategy register was not re-judged (no new out-of-sample rows).

## What I would do now

Nothing changes while the books are off; the 12:50 UK recommendations stand, in short: if the record is to continue, restart paper and shadow only with about 0.3 SOL in the executor wallet for simulation; settle the GR2 local-stop question (stop measured from the real entry) before any live restart; GR2 live at 0.1 if at all; keep K, S3 and AS2 retired; AS, AS3, AS4, S4 stay paper.

The one thing to do now is on the box: the data push has failed three times in a row and the study has been blind since 16:09 UK 28 Oct. Check `pm2 status` and the cron log, then run `bash scripts/push-data.sh` by hand — it prints `[push-data] pushed …` on success and names the failing step otherwise (`csv fetch failed` = the tracker web port; a git error = the push to GitHub). Until `pushed_at` moves, a restart of the books would be invisible to the study. The owner decides.

## Next

Same rows → one line, not a re-score. The next run (08:30 UK) checks whether the 08:05 UK push arrives; if `pushed_at` has not moved by then it will be the fourth miss and the data 16 h old, the length of the 22–23 Oct outage.
