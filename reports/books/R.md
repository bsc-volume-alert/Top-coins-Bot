# R — revival (an older coin whose price doubles off its 6-hour low)
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

This file also holds the whole Pokémon revival study (GMGN 5-minute candle back-tests, 20 Oct). For the old curve-stage "revival" tracker book (`revival`, coins 8–60 minutes old), see OFFPAGE.md.

## What it is now
- **Code key:** strategy `rev` (src/revive.js, `R = { MIN_AGE_S: 6 h, LOOK_S: 6 h, BREAK_S: 2 h, MULT: 2.0, COOL_S: 2 h, MAX_MC: 500_000 }`). Page box R.
- **Where it runs:**
  - **Paper only**, on the page. Not in the executor (`noExec`). No Telegram.
  - Page record from 20 Oct 16:00 UK (`V2_FROM`). PumpSwap costs. Fingerprint coins are left out.
- **Entry rule:**
  - On every PumpSwap swap, the coin must be **at least 6 h old** (from its create time).
  - The swap price must be **≥ 2x the lowest 5-minute close of the last 6 h**.
  - The coin must **not have closed at 2x that low in the last 2 h** (a fresh break).
  - **MC under $500K.** At least 6 closed 5-min buckets in the window.
  - One entry per coin per 2 h.
  - Bought at that swap's pool price.
- **Exit:** headline `x_tsl40`, a 40% trailing stop from the peak. `x_h5`, `x_h3` and `x_flow4` are recorded too.
- **Started:** 20 Oct 16:02 UK commit, live 16:20 UK (v0.18.155). First row 20:46 UK.
- **Last rule change:** none.
- **Known bug (unfixed):**
  - The 5-minute price history lives only in memory (a `Map`) and is **wiped on every tracker restart**. There were 32 restarts in the 24 h to 00:07 UK 21 Oct, plus a crash at 23:53 UK.
  - After a restart R cannot fire for at least 30 minutes (6 buckets).
  - Its "6-hour low" really means "lowest since the last restart", so the trigger is not the rule that was back-tested.
  - This is why it had 0 fires for hours.

## Verdict now
**21 Oct 11:30 UK:** Switch off. 19 live trades −3.8% (−7.0% without the best, −14.1% without the top 3, 32% won, last 6 h six trades all losers); the 20 Oct candle back-test of the exact rule is −8.9% a trade on 160 events and −18.9% without Pokémon; and the restart bug means the live book has never traded its own rule. Fixing the bug would only make the record match a rule already known to be negative. No profitable version found.

**21 Oct 02:30 UK:** Can't be judged; still starved by the restart bug.

**Not a trade, and never was. R records an idea that the 5-minute candle back-tests already showed is negative.**
- Fair test: −9% a trade with a 40% trail on 160 events, positive only because of Pokémon.
- Live record: 4 trades by 23:27 UK (+10.7%, 2 won, −3.5% without the best) and 7 by 00:09 UK. Far too few, and distorted by the restart bug.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 17:06 UK; real costs. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 20 Oct 20:46 UK) | 29 | -1.5% | -3.6% | 34% | 10% | -0.07 |
| last 24 h | 29 | -1.5% | -3.6% | 34% | 10% | -0.07 |
| last 12 h | 15 | -4.5% | -8.6% | 27% | 7% | -0.08 |
| last 6 h | 9 | +5.5% | -0.4% | 44% | 0% | +0.04 |
<!-- /NUMBERS -->

## Change history
- **20 Oct 09:07 UK, the owner's prompt:**
  - Screenshot of **Pokémon** (mint D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1): "$50K to $2M … analyze deeply".
  - The code records it as: Pokémon went from $50K to $2.1M about a day after launch; "maybe a double in market cap is the signal".
  - He followed up: "Yeah, 100% … double in the market cap … focus everything on this … What do you think?"
- **20 Oct 09:09–09:11 UK:** scripts/revival-pull.mjs, a one-off GMGN 5-minute candle pull for every coin that graduated since 18 Oct. It runs via the `scripts/job-now.txt` hook and is published on the data branch as `revival_klines.jsonl.gz`.
- **20 Oct 09:30 UK:** the first pull returned 0 candles; GMGN needs **millisecond** timestamps. A probe on Pokémon was added.
- **20 Oct 09:51 UK:** GMGN returns at most the last 100 candles a call, so the first pull had only each coin's last 8 hours. Fixed by paging backwards in 500-minute windows. Full file: 1,876 graduated coins, 110,091 candles; 1,337 coins were still trading 6 h+ after launch.
- **20 Oct 09:11–10:27 UK:** back-tests rev/backtest.py and rev/bt2.py (results under Ideas tested). All doubling triggers negative.
- **20 Oct 16:02 UK commit / 16:20 UK live (v0.18.155), book R created** as a recording book only. The code comment says: "this book RECORDS the idea from today; it is not a trade until it has earned one."
  - Rule: ≥ 6 h old, ≥ 2x the 6-h low, no 2x in the last 2 h, MC < $500K, one per coin per 2 h.
  - Back-test quoted in the code: 175 events on 1,337 coins, **−4% to −14% a trade** at real costs depending on the exit, **+17.7x on Pokémon alone**.
- **20 Oct ~17:45–18:20 UK, follow-up studies on the owner's level ideas:** rev/hit250.py at 17:53 UK and rev/old.py at 18:19 UK. All negative (below). No book was built from them.
- **20 Oct 16:25–19:05 UK, save bug:** final exit values were not saved when a copy position closed before the rule fired. R had no rows in that window.
- **Restart bug** found on 20 Oct. Fix proposed (persist the 6-h history to disk), **not done**.

## Ideas tested
All tests run on GMGN 5-minute candles for coins that graduated since 18 Oct:
- Entry at the next candle's open, the earliest a bot can act on a closed candle.
- PumpSwap real costs: x/1.02 × 0.967 − 0.006 − 0.01, stops −0.05 more.
- A −40% hard stop on every exit.

The figures below were re-run on 21 Oct 00:40 UK from the saved scripts and the saved candle file (rev/k2.jsonl.gz, pulled 20 Oct 10:26 UK). They may differ by a few trades from what was told to the owner on 20 Oct.

- **Doubling trigger, book R's exact rule** (≥ 6 h old, 2x the 6-h low, no 2x in the last 2 h, MC < $500K, 2-h cooldown):
  - Code comment: 175 events, −4% to −14%.
  - Re-run: **160 events on 109 coins.**
  - Trail 40% / 12 h: **−8.9%**, median −34.2%, won 19%, **−18.9% without the best (Pokémon)**.
  - Hold 1 h: +5.5%, but −11.4% without Pokémon.
  - Hold 6 h: +1.3%, −23.0% without Pokémon.
  - Without a stop, hold 24 h: +209% mean, median −52.7%. Pokémon alone shows up at 85–100x.
  - Pokémon fired 4 times on 19 Oct, at 08:30, 11:50, 20:00 and 23:55 UK. **The first three hit the −40% stop. Only the fourth ran (17.7x on the 40% trail).** A trader following the rule would have taken three stops on Pokémon before its run.
  - Verdict: **negative without the one coin; recorded only (book R).**
- **Fresh break at 1.5x / 2x / 3x the 6-h low, one event per coin per 24 h** (backtest.py):
  - 1.5x, 23 events: −6.7% (hold 1 h) to −17.3% (hold 12 h). The 30% trail was +6.6% on the mean but median −11.9%, −8.6% without the best, and the halves split +25.8% / −11.1%.
  - 2x, 56 events: −7.5% to −25.6%.
  - 3x, 46 events: −18.7% to −31.5%.
  - **Dropped.**
- **The same with a 2-h cooldown and a "quiet before" filter** (bt2.py, 1,337 coins):
  - 1.5x, 94 events: −5.4% to −12.9%.
  - 2x, 92 events: −13.2% to −26.7%.
  - 3x, 68 events: −25.9% to −34.4%.
  - Requiring under $50K or under $20K of volume in the prior 6 h did not help (2x with < $20K: 58 events, −11.4% to −26.4%).
  - In this version Pokémon's 2x events at 08:35 and 20:05 UK on 19 Oct ($20K and $41K) both stopped at −40%.
  - **Dropped.**
- **Volume spike after a quiet hour** (one 5-min candle ≥ $20K after an hour under $4K):
  - 7 events. Mean +160% to +373%, but median −51.4%: one coin (For Our Future, 15.6x) and the rest stopped.
  - **A lottery. Dropped.**
- **The fast-pump idea**: coins that hit **$250K within 15 min of launch** (627 of 1,876) or **$500K within 20 min** (419). From hit250.py, after the owner's "any coin which hits 250k and then comes back down … 500k".
  - Bought at the next candle: −18.6% to −37.5% a trade (won 13–26%). The best was "half at 2x, trail 40%" on $500K coins, at −21.9%.
  - **Dip-buying, 30% or 50% below the peak within 3 h** (all these coins had graduated): **−40% to −51% a trade, won 0–10%**, on 300–520 coins.
  - Whole-curve creators (80+ SOL dev buy) and normal launches were both negative.
  - **Dropped. This is the "dip-buying after graduation" result.**
- **Big early peak, then a 75% fall: does it come back?** (old.py)
  - 163 coins peaked at $500K+ in their first 2 h, fell 75%+, and had 6 h+ of history after.
  - Only **3 (2%)** came back to half the old peak (OpenAI ChatGPT-6, SpaceX, Mimi). **None** reached the old peak.
  - **Dropped.**
- **Older coins pumping across levels**: 6 h+ old, crossing $250K / $500K / $1M from half that level or less within the hour before. From old.py, after the owner's "this is where you're wrong … older coin … 40k→250k, 250k→500k, 500k→1M".
  - 15 events: **−29.7% to −41.2% a trade, won 0–13%** under every exit.
  - Pokémon crossing $250K (20 Oct 00:35 UK) ended 0.8x on a 40% trail.
  - **Dropped.**
- **Book R live** (20 Oct 16:20 UK onwards, restart-crippled):
  - 4 trades to 23:27 UK: `x_tsl40` +10.7%, median +1.8%, 2 won, no stops, −3.5% without the best.
  - 7 rows by 00:09 UK.
  - Still recording.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/R.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 9 trades +3.5% (no-best −3.0%).

- 21 Oct 11:30 UK — revision search (data to 10:36 UK; diag/rev_R.md says "only 19 closed trades — too few to search"; scratchpad/rev_op/s10r.py):
  - **The book now:** 19 trades, 20:46 UK 20 Oct – 08:21 UK 21 Oct, **−3.8% a trade (without best −7.0%, without top 3 −14.1%)**, median −10.5%, won 32%, stopped 16%, thirds +0.8 / −1.8 / −9.4; last 12 h 16 at −8.0%, last 6 h 6 at −18.7% with none won. −0.09 SOL at 0.1.
  - **Winners as a group** (6): onboardinu +55%, Extra Thick Hoe +53%, long degeneracy +16%, three small — coins 14–38 h old at $20–67K. **Losers** (13): ARTEMI −40% (GR's 7x coin, bought on its revival), PikaJew −28%, Ash Ketchum −14% — the same ages and MCs. Too few to group by anything; nothing at entry is recorded beyond age and MC.
  - **Exit verdict:** every recorded exit is within 4 points of the trail (−1.0% to +4.3%); nothing to choose. **Factor / pair verdict:** not searchable at 19. The independent evidence is the 20 Oct candle back-test of this exact rule: −8.9% a trade on 160 events, −18.9% without Pokémon; hold 1 h / 6 h / 24 h all negative without it.
  - **Restart bug:** still unfixed; all 19 fired between restarts, so the trigger traded was "2x the low since the last restart", not the 6-h low that was back-tested. Fixing it changes which coins fire, not the back-test.
  - **Proposed: SWITCH OFF.** No profitable version found; the one positive figure in its history (+10.7% on 4 trades, 20 Oct 23:27 UK) was 4 trades.

## Notable coins
- **Pokémon (D42TjMjz5H7toPu5md5KBXreZkCSdZMEfLQwmBhJXvb1), 18–20 Oct:**
  - $50K to about $2.1M about a day after launch; the reason R exists.
  - On the 5-min candles, R's rule fired on it four times on 19 Oct and the first three were stopped. Its 17.7x is the only reason the rule's average is not clearly negative.
- **Privacy Cat, FrunkStore, Yu-Gi-Oh, Dacity Coin, startupSI:** the next-best revival events (2–4x). Too few to carry a book.
- **For Our Future:** the single 15.6x behind the "volume spike" test's mean.
- **Live R trades, 20 Oct:**
  - Extra Thick Hoe (20:46 UK, about 38 h old, peak 1.85x, trail 1.64x): the best so far.
  - long degeneracy (21:16, 1.25x) and REAGENT (23:32, 1.10x).
  - Tetsuo Super Intelligence (0.95x), Ash Ketchum (0.93x) and PikaJew (0.79x).
  - **ARTEMI (23:39 UK, 6.5 h old): 0.66x.** This was GR's +329% coin from 17:12. R bought its revival and lost.

## What the owner said / decided
- **20 Oct 09:07 UK:** Pokémon screenshot, "50 k to 2m … analyze deeply".
- **20 Oct (after the first answer):** "Yeah, 100% … double in the market cap … focus everything on this … What do you think?" The analysis said no: negative without Pokémon. R was added as a recording book only.
- **20 Oct ~17:45 UK:** "Are you making another box? … any coin which hits 250k and then comes back down … 500k …". Tested; negative.
- **20 Oct ~18:15 UK:** "Actually, this is where you're wrong … older coin … 40k → 250k, 250k → 500k, 500k → 1M alerted …". Tested on older coins crossing those levels; negative.
- **20 Oct 18:45 UK** (in the PG discussion): "buy them on the first dump?". The dip-buying test above is negative.

## Open items
- PROPOSAL (21 Oct rev): SWITCH OFF — revival (a 6 h+ old coin at 2x its 6-h low, MC under $500K) — exit x_tsl40 — n19 −3.8% (no-best −7.0%) thirds +0.8/−1.8/−9.4 luck n/a (too few to search) — no profitable version found — the exact rule back-tests at −8.9% a trade on 160 (−18.9% without Pokémon), the 19 live trades are negative, and the restart bug means it never traded its own rule; no reason to spend a fix on it.
- awaiting go: persist R's 6-h history so restarts don't wipe it (open since 20 Oct).
- **Proposed, awaiting go:** persist R's 6-h price history to disk so it survives restarts (fix the restart bug). Until then R's live record is not the back-tested rule.
- **Proposed 21 Oct 00:11 UK, awaiting go:** record the crash reason and show it on the page (the 23:53 UK crash). Every crash also wipes R's history.
- **Decision for the owner:** R is a recording book with a negative back-test. Either fix the bug and let it record, or switch it off. No case for real money.
- **Next review trigger:** 30+ trades after the history fix, judged without the best trade.
