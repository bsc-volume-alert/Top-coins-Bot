# 4-hour study — 30 Oct 2026 20:30 UK

**Data is stale: `pushed_at` is still 2026-10-30T12:08:25Z (12:08 UK), `data` still commit 414f098 — 8 h 18 min old at 20:26 UK, over the 5-hour flag.** The 16:05 UK and 20:05 UK pushes both missed. That makes two misses straight after the three landings (04:08, 08:08, 12:08 UK) that the 12:40 UK report called the restart condition; of the last fourteen :05 slots (20:05 UK 28 Oct → 20:05 UK 30 Oct) five landed and nine missed. The shape is the same as 29 Oct (08:08 UK landing, then 12:05 and 16:05 misses, back at 20:08) and the two earlier outages: it lands and misses with nothing changed on `tracker` (no code commit since 24 Oct 17:40 UK; every commit since 12:08 UK is this study's own reports/). The cause can only be found on the box: `pm2 status`, the cron log, then `bash scripts/push-data.sh` by hand with each step timed — a landed push takes 3–5 minutes and stamps :08; the 44 MB abcd.csv fetch and the final `git push -f` are the two steps that exit silently.

**Since last study (30 Oct 16:30 UK):** no push, no trades, no legs, no code change. The five data files are byte-identical to the 12:40 and 16:30 UK runs (md5 checked), so this is the fourteenth study on the same trade rows. The books are still off as far as the data shows (BOOKS_OFF since 19:46 UK 23 Oct, v0.18.185; status.json frozen at 19:48 UK 23 Oct, executor v0.4.18, wallet 0.030 SOL, no open positions). abcd.csv still has 15,225 triggers ending 19:45 UK 23 Oct, others.csv is unchanged, executor.json still holds 1,309 legs, the last MOOF (GR2 live, 10:09 UK 23 Oct), its `now` stamp 12:05 UK (the status writer alive, executor stopped). launches.csv ends 11:05 UK 30 Oct. `numbers.py --write` changed no book file. Whether BOOKS_OFF has been lifted on the server since 12:08 UK cannot be seen from here until a push lands.

## The kept books

Unchanged from 12:50 UK 28 Oct onwards (same rows; numbers.py's scoring: real costs, operator coins out, price-glitch rows out, lateFix). Forward = trades since the book's change, to 19:46 UK 23 Oct.

| Book | Change | Trades since the change | Result a trade (real costs) | Without best 3 | Won | Stopped | Shadow / live legs, real vs paper | Checkpoint |
|---|---|---|---|---|---|---|---|---|
| **AS** | 20 Oct 17:45 UK | 108 (+0) | +1.6% (thirds +13 / −6 / −2) | −3.3% | 53% | 37% | `asoc` shadow 62 legs +0.384 SOL, fills match paper (+3 points) | 120 not reached; frozen |
| AS2 | 21 Oct 01:30 UK | 76 (+0) | −3.1% | −7.5% | 51% | 42% | — | drop (stands) |
| AS3 | 21 Oct 01:30 UK | 56 (+0) | +4.1% (thirds +3 / 0 / +10) | −1.4% | 59% | 36% | — | 56 of 60; frozen |
| AS4 | 21 Oct 14:45 UK | 10 (+0) | −24.2% | −46.7% | 30% | 60% | — | 10 of 30; frozen |
| **GR** | 21 Oct 09:47 UK | 154 (+0) | +3.6%; bundle 96 at +11.3% vs other 58 at −9.1% | 0.0% | 53% | 20% | `grad` shadow 65 legs +0.211 SOL; entry gap +10–35% on fresh bundle-launch pools | whole book: no (stands); bundle split holds |
| GR2 | 21 Oct 17:00 UK | 86 paper (+0) | +80.4% on the trail; −11.7% on the last 22 without og kimchi | +44.6% | 42% | 31% | live 19 legs +0.390 SOL (−0.72 without kimchisol); 27% of paper captured | 20th live leg not reached; frozen |
| **BL** | 21 Oct 14:45 UK | 169 (+0) | +37.2%; −12.3% on the last 42 without og kimchi | +14.7% | 33% | 40% | `bl` shadow 67 legs +1.047 SOL, quotes 10–20 points under paper on trail exits; live 13 legs −0.516 SOL, 0 won | 40 shadow legs: answered 23 Oct — fills do not match paper on trail/stop exits |
| K (revised) | 21 Oct 14:50 UK | 64 (+0) | −19.7% | −24.9% | 23% | 73% | — | retire (stands) |
| S3 (revised) | 21 Oct 08:45 UK | 84 (+0) | −21.9% | −23.1% | 19% | 37% | — | retire (stands) |
| S4 (revised) | 21 Oct 10:28 UK | 13 (+0) | −8.6% (one coin, JETPUMPX) | −24.4% | 31% | 31% | — | 13 of 60; frozen |

No checkpoint moved and none can move while BOOKS_OFF stands.

## Successes and failures this period

No trades this period. The last period's grouping (07:09–19:46 UK 23 Oct, the kimchi wave) is in the 12:50 UK 28 Oct report (reports/history/2026-10-28-1250-utc.md) and in each book's file; the whole-record grouping is the full diagnosis of 13:00 UK today (reports/winners-losers.md).

## Costs — does the model still match the legs?

No legs since 10:09 UK 23 Oct, so nothing to re-fit. The last readings stand: `asoc` 62 legs +3 points above the PumpSwap model (fills match paper); `grad` 65 legs, entry gap +10–35% on fresh bundle-launch pools; `bl` 67 shadow legs 10–20 points under paper on trail exits and live about half of paper (13 legs, 0 won); `gr2` live stops measured from the real entry (og kimchi sold at 0.73x before 20x) — the code question in LESSONS (28 Oct 12:50 UK) is still open.

## Anything new (luck-checked)

Nothing proposed and nothing tested: the files are the same bytes as at 12:40 UK, so there are no new trade rows, no new legs and no new launch hours. The strategy register (reports/strategies.json) was not re-judged — not one out-of-sample trade has been added since it was last judged (28 Oct 12:50 UK). The latest record-only count of the bundle-launch coin type is the 12:40 UK one (99 launches in the 23 h to 11:05 UK, 97 graduated, 48 at 5x+, 17 at 10x+, 83 of the 99 the 79.31% / 85 SOL signature); the verdict on it is the 13:00 UK full diagnosis, unchanged: profitable on paper beyond doubt, and the paper trail is not obtainable on real money until the executor's sell into the dump is fixed.

## What I would do now

The push is the problem to fix first, and it is now over the 5-hour flag for the second time in two days (29 Oct 16:30 UK was the first). Four outages in nine days from a script nobody has changed, each ending on its own, with the server's launch recorder running through every gap, says the cause is on the box, not in the repo — so the box check above is the one thing worth doing before anything else. Until it is done, any restart of paper and shadow (AS, AS3, AS4, S4 paper; `asoc`, `grad`, `bl` shadow; GR2 paper on the trail with h2t40 and the split beside it; about 0.3 SOL in the wallet so shadow quotes simulate) costs nothing in money, but its forward trades will be invisible to the study for up to 16 hours at a time and checkpoints will be judged on rows that arrive in blocks. No live book, for the reasons in the 13:00 UK diagnosis: the GR2 local-stop fault, the watcher blind after graduation and the 6005 buy loss are unfixed in the code, BL's live sells still do not fill near paper, and AS — the only book whose fills match paper — is flat (+1.6% on 108, −3.3% without its best 3). Keep K, S3 and AS2 retired. Nothing here changes the bot; the owner decides.

## Next

The next run (00:30 UK 31 Oct) checks whether the 00:05 UK push lands (on the 29 Oct pattern it would, after two misses) and whether BOOKS_OFF has been lifted; if the books have been restarted, the first forward trades will be scored from the first landed push on, and the gap's rows read as one block.
