# 4-hour study — 22 Oct 2026 21:30 UK

**No new data for the second study in a row.** The data branch's latest push is still 13:07 UK (`pushed_at` 2026-10-22T12:07:03Z; status.json's own clock 13:05 UK; rows to 13:03 UK). That push is now 8 h 20 min old. Three scheduled pushes have been missed today (09:05, 17:05 and 21:05 UK — the 21:05 UK one had not arrived by 21:27 UK) and the push-now request written at 14:50 UK ("BL live-vs-shadow") has gone unanswered for 6.5 hours. `numbers.py --write` was run and changed no file. So this run adds no trades, no legs and no checkpoint movement; every figure below is the 13:50 UK figure, repeated so the page is not blank, not re-measured. The full reading of this data (successes/failures, cost analysis, the GR2 coin-split luck check) is in reports/history/2026-10-22-1236-utc.md and stands unchanged; the 17:30 UK study (reports/history/2026-10-22-1629-utc.md) found the same gap.

**What can be said about the server from here (facts only):** the last status.json (13:05 UK) showed executor v0.4.18 live at 0.1 SOL, wallet 0.584 SOL, RPC 0 errors, tracker feed 8 s behind — nothing wrong at that moment. Since then the `tracker` branch has had 11 commits from the owner's chat session between 15:05 and 20:32 UK (fomo 0.2.30 → 0.2.33 and FOMO.md), so the repo side is active; what has stopped is the server's data push to GitHub (cron at :05 every 4 h, plus push-now). The study cannot tell whether the bot itself is running after 13:05 UK — only the push job's output is visible from here. The study does not write scripts/push-now.txt itself (only reports/ may change on a scheduled run).

## The kept books (unchanged since 13:50 UK; data to 13:03 UK)

| Book | Change | Trades since the change | Result a trade (real costs) | Without best 3 | Won | Stopped | Shadow / live legs, real vs paper | Checkpoint |
|---|---|---|---|---|---|---|---|---|
| **AS** | 20 Oct 17:45 UK | 66 | **+4.1%** (no-best +2.1%; 14-blocks +23.9 / +8.5 / −2.4 / −0.9 / −13.9) | −0.6% | 61% | 32% | `asoc` shadow 37 legs +0.586 SOL, +4.1 pts above the model; entry +1.9%, exit −2.2% | 30-leg condition met on its wording (23:38 UK 21 Oct); 40 legs 3 away; the last 38 paper trades about −5% |
| AS2 | 21 Oct 01:30 UK | 44 | −1.7% | −7.2% | 57% | 39% | — | past 30: no edge over AS; drop |
| AS3 | 21 Oct 01:30 UK | 31 | +4.4% (back-test 35 at +29.7%) | −3.0% | 65% | 32% | — | 30 reached: runner not a book; x_t2s40 on the same 31 +16.1%, p 0.10 — watch to 60 |
| AS4 | 21 Oct 14:45 UK | 4 | −25.5% | — | 25% | 50% | — | 4 of 30; no trade in 22 h at 13:03 UK |
| **GR** | 21 Oct 09:47 UK | 76 | **+8.6%** (no-best +6.2%; thirds +0.3 / +3.7 / +21.3) | +1.4% | 57% | 24% | live `grad` 17 legs −0.362 SOL; the 11 legs of 06:05–11:21 UK +0.073 SOL, real +9.2% vs model +9.7%; entry gap +10.1% median | 40-row "no" at 05:50 UK; at 76 "yes" by 1.4 points on one 8-h wave; the bundle split passes (luck 23/2000) |
| GR2 | 21 Oct 17:00 UK | 40 paper | +79.4% (no-best +56.3%; median −21.8%) | +12.3% | 40% | 30% | `gr2` shadow 9 legs +0.309 SOL, +2.8 pts above the model; LIVE at 0.1 since ~11:00 UK, 0 live legs in the data | 9 of 40 legs |
| **BL** | 21 Oct 14:45 UK | 77 | **+49.0%** (no-best +33.1%; no-top5 −9.1%; median −22.4%) | +1.4% | 35% | 38% | live 13 legs −0.516 SOL, 0 won; shadow 13 legs +0.305 SOL in the data (17 by 15:05 UK from the page) | 13 of 40 shadow legs; 15:05 UK: negative at any live stake until the exit stops selling into the dump |
| K (revised) | 21 Oct 14:50 UK | 26 | **−29.9%** (4 won) | −45.2% | 15% | 85% | — | 26 of 40; retire |
| S3 (revised) | 21 Oct 08:45 UK | 33 | **−25.0%** (4 won) | −28.3% | 12% | 42% | — | 33 of 40; retire |
| S4 (revised) | 21 Oct 10:28 UK | 5 | **−27.2%** (0 won) | −42.3% | 0% | 40% | — | 5 of 60; no trade in 32 h at 13:03 UK |

Counts as before: GR = grf rows under 156 buyers, 10–185 s, x_h3; BL = sn8 rows with a 70–80% bundle over 4–10 wallets and entry MC ≥ $25K, x_tsl40 at curve costs; K = under 912 buyers and MC ≥ $36K, x_t2s40; S3 = copies of $1M+ coins with the serial creator's fingerprint out; S4 = socials + first-time creator + original name. Scoring is numbers.py's (operator coins out, price-glitch rows out, lateFix on curve books).

## Successes and failures this period

No new trades to group. The 13:50 UK grouping stands (AS 11 new: 5 won at a median peak 2.51x, 6 stopped at a median peak 1.18x, nothing at entry separates them; GR 35 new: 15 floor sells, 6 held to 3 min, 6 one-transaction stops, 6 small losers, price at 10 s 1.29x for winners vs 1.01x for stopped; BL 51 new: 17 won at +238%, 20 stopped at −64%, 14 small losers, the graduating coins +128% and the rest −28%; K 10 new: 3 won, 7 stopped; S3 10 new: 8 repeat buys of one name).

## Costs — does the model still match the legs?

No new legs in the data. Shadow: the PumpSwap and curve models stand (asoc 37 legs +4.1 pts; bl shadow 13 legs within 2 pts; gr2 9 legs +2.8 pts). Live GR: the 11 legs of 06:05–11:21 UK matched the model (real +9.2% vs +9.7%), the cost being the +10.1% median entry gap on fresh pools. Live BL: 13 legs, 0 won, trail and stop sales at about half paper; mechanism and watcher fix in S8.md / LESSONS.md (15:05 UK). Whether GR2's live trail sells (live at 0.1 since ~11:00 UK) land near paper or like BL's is still the one open question with real money on it, and 8 h of its legs are invisible to the study until the push resumes.

## Anything new (luck-checked)

Nothing can be tested without new rows. The one result called real on this data remains GR2's coin split (52 at +18.4% vs 24 at −12.6% on GR's 76 forward rows; three periods positive, positive without best 3, label-shuffle 23/2000; 13:50 UK). Not passing, unchanged: the trail over the 3-min on GR's rows, AS3's 2x exit (p 0.10), GR's whole-book "yes" at 76. Strategy register: no rule edited, none added.

## What I would do now

1. **Check the server's push job.** Three scheduled pushes missed today (09:05, 17:05, 21:05 UK) and a push-now unanswered since 14:50 UK. Until it runs, the study is blind to GR2's first live legs, AS's 40th shadow leg, BL's shadow count, and K's and S3's 40-trade checkpoints — and to whether the executor is still live at 0.1 with real money on GR2 and GR. If the bot's page shows legs after 13:05 UK, the bot is fine and it is only the push; if the page is frozen too, the server itself needs looking at.
2. The 13:50 UK recommendations stand unchanged: graduation books buy bundle-launch coins only; GR2's first live trail sells decide the exit (judge at 20 live legs, stake stays 0.1); BL stays in shadow until the watcher fix and a split-exit paper record exist; AS no live switch, read again at 40 shadow legs; retire K, S3, AS2; AS3 on paper to 60.
3. Code questions as before (not reports/ matters): shadow simulation needs a funded wallet; confirmed sells under their own minimum-out; the watcher blind after graduation (fix proposed 15:05 UK).

Nothing here changes the bot; the owner decides.

## Next

- Fresh data, then: GR2's live legs leg by leg (entry gap, trail sell vs paper); AS at 40 shadow legs; BL shadow count toward 40; K at 40 / S3 at 40.
- GR bundle split at 100 forward rows; the trail vs 3-min question on live sells only.
