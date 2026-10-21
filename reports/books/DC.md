# DC — D on a copycat of a $72K+ coin
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `dcopy` (page name DC). Not a strategy of its own: a filter on D's passed rows (`p5e50`, operator coins removed on the page). Page box only, paper, box stake 0.1 SOL. No executor book. Code: `src/web.js` `dCopy`.
- Entry rule: D's trigger (50 SOL bought within 60 s; MC under $100K; coin ≥ 60 s old; buys ≥ sells; ≥ 10 buyers; one trade per coin; skips bundled 70%+, launch not seen, 150+ wallets) AND the coin's name copies a coin that reached $72K+ market cap in the last 24 h (`early_json.ctx.cc.best24h` ≥ 72,000; in abcd.csv `cc_best_mc24h`).
- Exit: `x_flow4`, the runner (−40% stop until 1.5x; then hold while 5-min volume ≥ $100K and buys ≥ sells; 50% trail; cap 4x). PumpSwap real-cost model.
- Started 20 Oct 16:20 UK (v0.18.155; commit 16:02 UK); judged from 20 Oct 16:00 UK (`V2_FROM` 15:00 UTC). No rule change since. The page shows before 16:00 UK (back-test) and since.

## Verdict now
Not working yet: the back-test edge (+17.6% on 40) has not shown up on new trades — 4 trades since 16:00 UK, −32.2%, 3 of them stopped (to 21 Oct 00:09 UK). Far too few to judge either way; it fires about once every two hours.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 01:27 UK; D, copycat of a $72K+ coin. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 12:36 UK) | 45 | +12.2% | +6.2% | 60% | 33% | +0.50 |
| before the change (20 Oct 16:00 UK) — back-test | 40 | +17.6% | +10.9% | 65% | 30% | +0.66 |
| since the change — the real test | 5 | -30.9% | -46.5% | 20% | 60% | -0.16 |
| last 24 h | 23 | -2.8% | -6.0% | 52% | 39% | -0.09 |
| last 12 h | 6 | -19.1% | -30.9% | 33% | 50% | -0.12 |
| last 6 h | 2 | -38.7% | -51.4% | 0% | 50% | -0.08 |
<!-- /NUMBERS -->

## Change history
- 20 Oct 16:20 UK (v0.18.155): DC added as a page book. Found by the 20 Oct ~15:00 UK chat analysis: D's trigger on a coin whose name copies a $72K+ coin made +18% a trade on 39 earlier D trades, both halves positive. Page note: "six rules found this way have failed, so it earns its place forward". Owner's go: "Okay, let's go. Add those things … get working on S10 as soon as possible" (after "tell me the coins that have potential … beta or a second or third version").
- 20 Oct 17:55 UK (v0.18.160): box shows before / since 16:00 UK.
- 20 Oct 19:15 UK (v0.18.164): operator-fingerprint coins removed from the page record (retroactive).

## Ideas tested
- Study rule F13 (the study's own, 20 Oct 13:35 UK study; DC's family with a lower bar): D with `cc_best_mc24h` > $19K, runner — in sample +10.8% on 61 (median +16.5%, win 59%, stop 34%, halves +11.1% / +10.6%, +9.3% at the 5-s price). Threshold a plateau (> $10K +8.9% on 67, > $30K +10.6% on 56, > $50K +10.3% on 54). D with a weaker copycat −11.7% on 61; with no same-name coin −2.1% on 81. Against it: 50 of its 61 rows were also F11 rows (max_share ≤ 0.11) and the other 11 were −22.9%; on A's trigger +1.4% on 79; on C −2.0% on 24. Out of sample at 17:40 UK: −2.5% on 6 (vs +18.2% for the rest of D on 8). Waiting 6/40.
- DC itself ($72K bar) — back-test to 16:00 UK +17.6% on 40 (won 65%, no-top1 +10.9%); since 16:00 UK −32.2% on 4 (won 1, 3 stops). On test.
- Copycat signals seen elsewhere: on AS's trades the COUNT of copycat names (`cc_n24h`) ≤ 5 looked better (+21.9% on 50 vs +0.2% on 28, in sample), and "copycats ≥ 2" reversed between samples (coincidence). Melonie (27 copycats) still ran. DC uses the best copycat's peak, not the count — a different measure.

## Notable coins
- Trades since 16:00 UK: FREEZE AI NOW (20 Oct 17:42, $43.7K, copied a $72.0K coin, +31.6% on low volume); Xitter (18:09, $43.6K, copied $72.1K, peak 1.15x, stop −51.2% — also an AS and DS loser); memestock (18:57, $46.4K, copied $108K, peak 1.25x, stop −57.6%); SpaceXSuperIntelligence (22:10, $53.5K, copied $123K, peak 1.19x, stop −51.4% — the same coin AS bought 20 minutes earlier at $46.1K for +132.7%).

## What the owner said / decided
- 20 Oct ~15:00–16:00 UK: "tell me the coins that have potential … beta or a second or third version", then "Okay, let's go. Add those things … get working on S10 as soon as possible" — the go for DC (with R, GR-lock and the S10 fix).
- No later comment on DC specifically.

## Open items
- Proposed 20 Oct 23:32 UK, awaiting go: keep DC (and DS) on the page with demoted ranking until it has 20 or more trades since its start.
- Next decision: at 20 trades since 16:00 UK (4 now). If the stop rate stays near 75%, drop it.
- Study rule F13 should be scored again at 40 out-of-sample trades (it was 6/40 at 17:40 UK; the study task has been failing since 21:25 UK).
