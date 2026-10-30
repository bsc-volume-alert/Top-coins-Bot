# 4-hour study — 30 Oct 2026 12:40 UK

**The 12:05 UK push landed: `pushed_at` 2026-10-30T12:08:25Z (12:08 UK), `data` commit 414f098 of 12:08:27 UK, 29 minutes old at 12:37 UK.** That is the third consecutive :05 landing (04:08, 08:08, 12:08 UK) — the condition the 00:30 UK note set before any book is restarted is now met. Of the last twelve :05 slots (20:05 UK 28 Oct → 12:05 UK 30 Oct) five landed and seven missed. The recorder ran without a gap (launches.csv has every hour from 12:08 UK 29 Oct to 11:05 UK 30 Oct, 31,082 launches, lowest full hour 807 at 07:00 UK), so the server has been up throughout and only the push script has been failing. Three landings say the push is working now; they do not say why it failed seven times with no change on `tracker` (no code commit since 24 Oct 17:40 UK; every landed push stamped :08), so the check on the box (`pm2 status`, the cron log, `bash scripts/push-data.sh` by hand, timing each step) is still the only way to find the cause.

**Since last study (30 Oct 08:30 UK):** one push, no trades, no legs, no code change. The books are still off (BOOKS_OFF since 19:46 UK 23 Oct, v0.18.185; status.json frozen at 19:48 UK 23 Oct, executor v0.4.18, wallet 0.030 SOL, no open positions; executor.json's `now` stamp is 12:05:54 UK, so its status writer is alive while the executor stays stopped). abcd.csv still has 15,225 triggers ending 18:45 UK 23 Oct, others.csv is unchanged, executor.json still holds 1,309 legs, the last MOOF (GR2 live, 10:09 UK 23 Oct). `numbers.py --write` changed no book file — this is the twelfth study on the same trade rows. The only file with new rows is launches.csv (4 new hours, 07:02 → 11:05 UK), which is record only.

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

Nothing proposed; no trade rows, so nothing was tested and the strategy register (reports/strategies.json) was not re-judged — not one out-of-sample trade has been added since it was last judged. One count, record only, from the 4 new hours of launches.csv (07:02 → 11:05 UK, 4,067 launches, 51 graduated = 1.3%): **16 bundle-launch coins (70–80% bundle over 4–10 wallets), 4.0 an hour — 4.8 the night before, 5.5 the evening before that — all 16 graduated, all 16 with an entry MC of $25K+ ($31.8K–$42.1K), 13 peaked at 2x+, 7 at 5x+, 1 at 10x+** (The Meme King 15.3x 09:59 UK; Kim Jong Inu 9.4x 09:18 UK; MrBeast 8.9x 07:29 UK and still 8.8x an hour after launch, one of only 4 of the 16 above the launch price at the hour). Median price one hour after launch 0.14x of the launch price on all 16 (every coin had its full hour before the file ended) — the same peak-then-dump path as every earlier count. The 79.31% / 85 SOL signature made 13 of the 16 (median peak 4.5x, 6 at 5x+, the 15x); the three other signatures (Kim Jong Inu 9.4x, Binance Hack 1.6x, Market Philosopher 2.3x) all graduated too. Over the whole 23-hour file (12:08 UK 29 Oct → 11:05 UK 30 Oct): 99 bundle-launch coins, 97 graduated, 48 at 5x+, 17 at 10x+, the signature 83 of the 99 holding all 17 of the 10x+ coins. These are recorder price paths, not trade results — no luck check applies, and they change nothing about the verdict on this coin type: the paper trail is not obtainable on real money until a live sell fills near paper (13 live BL legs, 0 won; LESSONS 22 Oct 05:50 UK). Output is uneven by the hour (6 coins in the 09:00 hour, 1 in the 08:00 hour), so the 04:30 UK warning stands: a 40-trade checkpoint on BL or GR2 after a restart could be one morning of one operator, and must be judged by signature and by period, not by the count alone.

## What I would do now

The restart condition set on 30 Oct 00:30 UK (three consecutive :05 landings) is met as of 12:08 UK. If the record is to continue, this is the moment for the 12:50 UK 28 Oct plan, unchanged: restart **paper and shadow only** — AS, AS3, AS4, S4 paper; `asoc`, `grad` and `bl` shadow; GR2 paper on the trail — with about 0.3 SOL in the executor wallet so shadow quotes can simulate (at 0.030 SOL every quote fails with 'insufficient lamports', as from 10:21 UK 23 Oct, and the shadow legs are lost). No live book: the GR2 local-stop question (stop measured from the real entry, 28 Oct 12:50 UK) is unanswered in the code, BL's live sells still do not fill near paper (13 legs, 0 won), and AS is the only book whose fills match paper and it is flat (+1.6% on 108, −3.3% without its best 3). Keep K, S3 and AS2 retired. The pending checkpoints after a restart are AS3 at 60 (4 more trades), AS4 at 30 (20 more), S4 at 60 (47 more) and GR2's 20th live leg (only if it goes live, which I would not do yet).

Two things to accept if the restart goes ahead before the push is understood: the push has now landed three times in a row but failed seven of the last twelve slots with nothing changed on `tracker`, so forward trades may again be invisible to the study for up to 16 hours at a time and checkpoints will be judged on rows that arrive in blocks; and the box check (time each step of `bash scripts/push-data.sh` by hand — the 44 MB abcd.csv fetch from the tracker web port and the final `git push -f` are the two steps that exit silently) is still the only way to find the cause, with or without a restart. Nothing here changes the bot; the owner decides.

## Next

The next run (16:30 UK 30 Oct) checks whether the 16:05 UK push lands (a fourth in a row) and whether BOOKS_OFF has been lifted; if the books are restarted this afternoon, the first forward trades will be scored from that run on.
