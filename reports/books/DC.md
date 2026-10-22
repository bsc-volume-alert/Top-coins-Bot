# DC — D on a copycat of a $72K+ coin
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `dcopy` (page name DC). Not a strategy of its own: a filter on D's passed rows (`p5e50`, operator coins removed on the page). Page box only, paper, box stake 0.1 SOL. No executor book. Code: `src/web.js` `dCopy`.
- Entry rule: D's trigger (50 SOL bought within 60 s; MC under $100K; coin ≥ 60 s old; buys ≥ sells; ≥ 10 buyers; one trade per coin; skips bundled 70%+, launch not seen, 150+ wallets) AND the coin's name copies a coin that reached $72K+ market cap in the last 24 h (`early_json.ctx.cc.best24h` ≥ 72,000; in abcd.csv `cc_best_mc24h`).
- Exit: `x_flow4`, the runner (−40% stop until 1.5x; then hold while 5-min volume ≥ $100K and buys ≥ sells; 50% trail; cap 4x). PumpSwap real-cost model.
- Started 20 Oct 16:20 UK (v0.18.155; commit 16:02 UK); judged from 20 Oct 16:00 UK (`V2_FROM` 15:00 UTC). No rule change since. The page shows before 16:00 UK (back-test) and since.

## Verdict now
**21 Oct 11:10 UK:** RETIRE from the page (data kept). The back-test edge was AS's coins: the 17 DC coins that AS also took are +29.1%, the other 31 are +2.4% (no-best −0.6%); the forward test since 16:00 UK is −14.5% on 8 with 4 stops; nothing in the search beats luck.

**21 Oct 02:30 UK:** Back-test edge has not carried forward.

Not working yet: the back-test edge (+17.6% on 40) has not shown up on new trades — 4 trades since 16:00 UK, −32.2%, 3 of them stopped (to 21 Oct 00:09 UK). Far too few to judge either way; it fires about once every two hours.

## Latest numbers
<!-- NUMBERS -->
_Data to 22 Oct 01:04 UK; D, copycat of a $72K+ coin. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 12:36 UK) | 48 | +12.2% | +6.6% | 60% | 33% | +0.54 |
| before the change (20 Oct 16:00 UK) — back-test | 40 | +17.6% | +10.9% | 65% | 30% | +0.66 |
| since the change — the real test | 8 | -14.5% | -23.8% | 38% | 50% | -0.12 |
| last 24 h | 3 | +12.8% | -6.1% | 67% | 33% | +0.04 |
| last 12 h | 0 | — | — | — | — | — |
| last 6 h | 0 | — | — | — | — | — |
<!-- /NUMBERS -->

## Change history
- 20 Oct 16:20 UK (v0.18.155): DC added as a page book. Found by the 20 Oct ~15:00 UK chat analysis: D's trigger on a coin whose name copies a $72K+ coin made +18% a trade on 39 earlier D trades, both halves positive. Page note: "six rules found this way have failed, so it earns its place forward". Owner's go: "Okay, let's go. Add those things … get working on S10 as soon as possible" (after "tell me the coins that have potential … beta or a second or third version").
- 20 Oct 17:55 UK (v0.18.160): box shows before / since 16:00 UK.
- 20 Oct 19:15 UK (v0.18.164): operator-fingerprint coins removed from the page record (retroactive).

## Ideas tested
- Study rule F13 (the study's own, 20 Oct 13:35 UK study; DC's family with a lower bar): D with `cc_best_mc24h` > $19K, runner — in sample +10.8% on 61 (median +16.5%, win 59%, stop 34%, halves +11.1% / +10.6%, +9.3% at the 5-s price). Threshold a plateau (> $10K +8.9% on 67, > $30K +10.6% on 56, > $50K +10.3% on 54). D with a weaker copycat −11.7% on 61; with no same-name coin −2.1% on 81. Against it: 50 of its 61 rows were also F11 rows (max_share ≤ 0.11) and the other 11 were −22.9%; on A's trigger +1.4% on 79; on C −2.0% on 24. Out of sample at 17:40 UK: −2.5% on 6 (vs +18.2% for the rest of D on 8). Waiting 6/40.
- DC itself ($72K bar) — back-test to 16:00 UK +17.6% on 40 (won 65%, no-top1 +10.9%); since 16:00 UK −32.2% on 4 (won 1, 3 stops). On test.
- Copycat signals seen elsewhere: on AS's trades the COUNT of copycat names (`cc_n24h`) ≤ 5 looked better (+21.9% on 50 vs +0.2% on 28, in sample), and "copycats ≥ 2" reversed between samples (coincidence). Melonie (27 copycats) still ran. DC uses the best copycat's peak, not the count — a different measure.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/DC.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 45 trades +12.2% (no-best +6.2%) but thirds +22.4 / +17.3 / −3.1 and last block −10.5%; 48 pass vs 69 by luck — nothing real.

- 21 Oct 11:10 UK — revision search (data to 10:36 UK; diag/rev_DC.md; scratch in scratchpad/rev_as/):
  - The book now: 48 trades +12.2% (no-best +6.6%, no-top3 +2.2%), 60% won, 33% stopped, thirds +17.7 / +13.1 / +5.9, 25 a day, +0.28 SOL a day at 0.1. Since 20 Oct 16:00 UK (the real test): 8 at −14.5% (no-best −23.8%), 3 won, 4 stopped — FREEZE AI NOW +31.6%, Xitter −51.2% (an AS and DS stop too), memestock −57.6%, SpaceXSuperIntelligence −51.4% (bought 20 min after AS's +132.7% entry), Where's the Airdrop? −25.9%, The Onboarder −53.7%, SYLPH +41.6%, Larry The Cat +50.4% (AS +33.1% on it).
  - Overlap: 17 of the 48 are DS (and AS) coins — +29.1% (no-best +13.7%); AS made +24.7% on the same 17. The 31 DC coins that are not DS: +2.4% (no-best −0.6%, thirds +16.7 / −14.5 / +4.9). DC's back-test edge was AS's coins again, as with DS.
  - Winners as a group (29): 3–8 min old, bundle 32–33% over 5 wallets, 46–47 SOL of first-minute selling, price at 60 s 1.06–1.08x. Losers: 16 stopped at −52.1% — younger (4 min), bundle 26% over 4 wallets, creator bought 2.4 SOL, 60-s price 0.80x. By the copied coin's peak: $72–100K n44 +16.1%; $100K+ n4 −30% (3 stops) — copies of the bigger names did worse, but n4.
  - Exit verdict: runner +12.2% (no-best +6.6%) vs x_t15s40 +9.0% (no-best +8.4%, every third positive) — nothing decisive; x_t2s40 +3.5%, x_tsl40 −1.3%, x_h5 −3.5%. No change.
  - Factor / pair verdict: 1,144 filters × 12 exits + 252 pairs; 373 pass the three-period test, **0 are unlikely to be luck** (shuffles reach +35% to +57%). revise.py's pick, `heat_win2h_hit` < 12 (fewer than 12 of the last two hours' A/C/D triggers reached 1.5x — a "quiet market" reading) n38 +24.5% (no-best +17.7%) vs 10 at −34.5%, luck 20. The same cut goes the same way on DS (+27.5% vs −8.6%), D (+1.5% vs −11.1% on 156 / 134), AS (+14.3% vs +6.3%) and A (−2.5% vs −5.4%) — but all five books share coins, so it is one observation, not five: a regime signal for whoever owns A/D to look at, not a DC rule.
  - Proposed: RETIRE DC from the page (data kept). Study rule F13 (the $19K bar) is the same family and should be closed with it.

## Notable coins
- Trades since 16:00 UK: FREEZE AI NOW (20 Oct 17:42, $43.7K, copied a $72.0K coin, +31.6% on low volume); Xitter (18:09, $43.6K, copied $72.1K, peak 1.15x, stop −51.2% — also an AS and DS loser); memestock (18:57, $46.4K, copied $108K, peak 1.25x, stop −57.6%); SpaceXSuperIntelligence (22:10, $53.5K, copied $123K, peak 1.19x, stop −51.4% — the same coin AS bought 20 minutes earlier at $46.1K for +132.7%).

## What the owner said / decided
- 20 Oct ~15:00–16:00 UK: "tell me the coins that have potential … beta or a second or third version", then "Okay, let's go. Add those things … get working on S10 as soon as possible" — the go for DC (with R, GR-lock and the S10 fix).
- No later comment on DC specifically.

## Open items
- PROPOSAL (21 Oct rev): RETIRE — D on a copycat of a $72K+ coin off the page, data kept; no revised rule — exit x_flow4 — n48 +12.2% (no-best +6.6%) thirds +17.7/+13.1/+5.9 luck 20/20 (best revision) — UNPROVEN — forward −14.5% on 8 (4 stops); its 17 AS coins are +29.1% and the 31 others +2.4%, so it is AS's coins plus losers; nothing in the search beats luck.
- Keep on paper to 20 trades since its 16:00 UK change, then decide (4 so far; 8 at 11:10 UK 21 Oct — see the proposal above).
- Proposed 20 Oct 23:32 UK, awaiting go: keep DC (and DS) on the page with demoted ranking until it has 20 or more trades since its start.
- Next decision: at 20 trades since 16:00 UK (4 now). If the stop rate stays near 75%, drop it.
- Study rule F13 should be scored again at 40 out-of-sample trades (it was 6/40 at 17:40 UK; the study task has been failing since 21:25 UK).
