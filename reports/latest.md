# 4-hour study — 22 Oct 2026 09:32 UK

**No new data.** The data branch's latest push is still 05:07 UK (`pushed_at` 2026-10-22T04:07:11Z, rows to 05:04 UK) — the same push the 05:50 UK study used. The 09:05 UK push had not arrived by 09:32 UK (checked five times between 09:25 and 09:32 UK). `numbers.py --write` was run and changed nothing, because nothing changed. So this run adds no trades, no legs and no checkpoint movement; every figure below is the 05:50 UK figure, repeated so the page is not blank, not re-measured. The full reading, successes/failures and cost analysis are in reports/history/2026-10-22-0434-utc.md and stand unchanged.

**Why the push may be missing (facts only, no cause known from here):** at 05:05 UK status.json showed executor v0.4.18 in live mode, wallet 0.0898 SOL, RPC 2,113 calls with 0 errors, tracker feed 26 s behind. Nothing in the 05:04 UK data says the server was in trouble; the push itself (a cron at :05 every 4 hours) is what did not run or did not reach GitHub. The owner should check the server and the push job.

## The kept books (unchanged since 05:50 UK; data to 05:04 UK)

| Book | Change | Trades since the change | Result a trade (real costs) | Without best 3 | Won | Stopped | Shadow / live legs, real vs paper | Checkpoint |
|---|---|---|---|---|---|---|---|---|
| **AS** | 20 Oct 17:45 UK | 55 | **+7.0%** (no-best +4.6%; 14-blocks +23.9 / +8.5 / −2.4 / −2.7) | +1.5% | 64% | 27% | `asoc` shadow 36 legs +0.634 SOL, +4.0 pts above the model; entry +1.6%, exit −1.2% | 30-leg checkpoint reached 23:38 UK 21 Oct; 40 legs: 4 away; wallet cannot fund a live test |
| AS2 | 21 Oct 01:30 UK | 34 | +1.8% | −4.7% | 62% | 32% | — | 30 reached; no edge over AS |
| AS3 | 21 Oct 01:30 UK | 24 | +5.5% | −3.6% | 67% | 29% | — | 24 of 30; x_t2s40 on the same 24 +18.6% vs runner +5.5% |
| AS4 | 21 Oct 14:45 UK | 4 | −25.5% | — | 25% | 50% | — | 4 of 30 |
| **GR** | 21 Oct 09:47 UK | 41 | **+4.2%** (no-best −0.5%) | **−9.4%** | 49% | 29% | `grad` shadow 19 legs +0.587 SOL (frozen); **live 6 legs −0.434 SOL** | 40-row checkpoint reached 05:50 UK: "no" (one coin, moggersha) |
| GR2 | 21 Oct 17:00 UK | 10 | +75.3% (no-best −10.1%) | −31.2% | 30% | 20% | `gr2` shadow 4 legs −0.228 SOL | 4 of 40 legs; the missing legs are now explained (below) |
| **BL** | 21 Oct 14:45 UK | 25 | **+51.4%** (no-best +3.9%) | **−17.1%** | 40% | 36% | `bl` shadow 8 legs (frozen); **live 12 legs −0.465 SOL, 0 won; trail sells −52% median under paper** | 8 of 40 shadow legs |
| K (revised) | 21 Oct 14:50 UK | 16 | **−42.3%** (1 won) | −52.0% | 6% | 94% | — | 16 of 40; retirement recommended |
| S3 (revised) | 21 Oct 08:45 UK | 26 | **−27.6%** (3 won) | −32.4% | 12% | 54% | — | 26 of 40; retirement recommended |
| S4 (revised) | 21 Oct 10:28 UK | 5 | **−27.2%** (0 won) | −42.3% | 0% | 40% | — | 5 of 60 |

## Successes and failures this period

No new trades to group. The 05:50 UK grouping (AS 35 won / 15 stopped / 5 small losers over 55; GR 20 / 12 / 9 over 41; BL 10 won, 15 lost over 25 with the two runners carrying +1384 of +1284 points; K 1 won of 16) stands.

## Costs — does the model still match the legs?

No new legs. Shadow: the PumpSwap and curve models stand (asoc 36 legs +4.0 pts; grad 19 legs +1.7; bl 8 legs +1.6). Live on bundle-launch coins: 18 legs −0.900 SOL, 1 won; sales at roughly half the paper price; four confirmed sells returned less than their recorded minimum-out; 125 failed sell orders against 18 confirmed in 24 h. All as recorded in LESSONS.md on 22 Oct 05:50 UK.

**One open question from 05:50 UK is answered from the same data:** why `gr2` recorded no shadow legs on the night's five bundle graduations. executor.json's skip counts show `gr2` with 4 "sim-failed" and 2 "skipped: balance 0.066 SOL below 0.05 (the live stake) + fees". So the executor's balance check does block shadow quotes, and the rest were simulation failures. `grad` likewise: 10 sim-failed, 4 failed, 6 daily-stop skips, 3 balance skips; `bl`: 2 sim-failed, 4 daily-stop, 1 balance. A shadow leg signs nothing and should not need a balance; that is a code question for the owner. Written to GR.md (Open items).

## Anything new (luck-checked)

Nothing searched (no new data; the cull's rule). Strategy register unchanged; no rule edited or added.

## What I would do now

1. **Check the server and the 4-hourly push.** The 09:05 UK push is missing; the next study (13:25 UK) will have nothing to work with either if it stays down. Nothing in the 05:04 UK data shows a fault, so it is the push job or the box, not the bot's data.
2. Everything from 05:50 UK stands: take BL and GR out of live mode and do not top the wallet up for them; find out why four sells returned less than their minimum-out and why 125 sells failed in 24 h; GR, K and S3 retire; AS holds (36 shadow legs +0.634 SOL, forward +7.0% on 55); AS2 drop; AS3 6 trades to its exit decision; S4 paper only.
3. Fix the shadow-leg balance block before judging GR2 or BL on shadow legs — otherwise their 40-leg checkpoints cannot be reached while the wallet is near empty.

Nothing here changes the bot; the owner decides.

## Next

- Fresh data: confirm the push is back (pushed_at past 09:05 UK).
- AS: 40 shadow legs (4 away); BetPlaza exit mismatch still open.
- AS3 at 30 (6 away): x_t2s40 vs runner, paired.
- Shadow-leg balance block (gr2 / grad / bl): code fix needed for the shadow counts to move.
- F16 out-of-sample count (14 now).
