# H — A with low holder concentration
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `hold` (page name H). A filter on A's passed rows (`p5e30`, operator coins removed on the page). Page box only, paper, box stake 0.1 SOL. No executor book. Code: `src/web.js` `top10Of` / `lowTop10`.
- Entry rule: A's trigger (30 SOL within 60 s; MC under $100K; coin ≥ 60 s old; buys ≥ sells; ≥ 10 buyers; one trade per coin; skips bundled 70%+, launch not seen, 150+ wallets) AND GMGN's top-10 holder share at entry under 23% (`gmgn_entry.hold.top10` < 0.23; in abcd.csv `gh_top10`). The GMGN snapshot is taken about 1 s after the trigger. Rows without a snapshot are left out.
- Exit: `x_flow4`, the runner (as A). PumpSwap real-cost model.
- Started 20 Oct 20:00 UK (v0.18.171; commit 19:51 UK; `CHG_H` 19:00 UTC). No rule change since. Page shows before 20:00 UK (back-test) and since.

## Verdict now
**21 Oct 11:10 UK:** RETIRE (data kept); do not rebuild it on the ledger's top-10. The ledger column would fix the coverage (368 of 370 A rows against GMGN's 72, correlation 0.87, same side of 23% on 88% of rows) but the rule has no edge on it: A + ledger top-10 < 23% is 136 trades at −6.0% (no-best −8.1%, every third negative), and inside AS the 30%+ band does best. H's own forward test since 20:00 UK is −16.3% on 11 (6 stops).

**21 Oct 02:30 UK:** Can't be judged.

Undecided and mostly untestable: only 50 of 336 passed A rows carry a GMGN holder snapshot (21 Oct 00:09 UK data), so H has 18 trades in total and 2 since it started (catdog +32.4%, Mugshot Cat −54.5%). Its +14.5% on 18 is −0.9% without Spidey Show.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 19:49 UK; A, top-10 holders under 23%. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 14:07 UK) | 34 | +4.9% | -3.3% | 47% | 35% | +0.13 |
| before the change (20 Oct 20:00 UK) — back-test | 16 | +17.7% | +0.4% | 50% | 31% | +0.27 |
| since the change — the real test | 18 | -6.4% | -10.8% | 44% | 39% | -0.13 |
| last 24 h | 18 | -6.4% | -10.8% | 44% | 39% | -0.13 |
| last 12 h | 9 | -4.5% | -13.4% | 44% | 33% | -0.05 |
| last 6 h | 3 | +12.0% | -8.1% | 67% | 0% | +0.03 |
<!-- /NUMBERS -->

## Change history
- 20 Oct 20:00 UK (v0.18.171): H added. Found earlier that evening across A, D and 80-SOL: GMGN top-10 under 23% gave +10.6% a trade on 145, positive in each book, halves +21.0% / +0.4% (so only just positive in the second half). Owner's lead-in: "any new strategies … hold accounts? … similarity …"; on seeing it: "Excellent. You want to add that into separate boxes or as a variant? … top 10 holder is a good idea".

## Ideas tested
- GMGN top-10 < 23% across A / D / 80-SOL — 20 Oct ~19:45 UK — +10.6% on 145, halves +21.0% / +0.4% — kept as book H (on A only).
- H on A at 23:27 UK — 17 trades +18.5% (median +15.5%, no-top1 +2.4%); before 20:00 UK +17.7% on 16; since 1 (+32.4%). At 00:09 UK — 18 trades +14.5% (no-top1 −0.9%); since 2 at −11.1%.
- Same cut on GR (23:31 UK) — untestable: no GR row has a GMGN holder snapshot (0 of 45).
- Holder concentration on AS's trades (23:31–00:01 UK) — no separation: tracker's own top-10 at entry 24.9% (winners) vs 24.6% (losers); GMGN top-10 0.25 vs 0.23.
- Contrary early hint: 19 Oct 13:28 UK study, A's passed coins split at the median of the tracker's own `top10_entry` (24.25%): the higher-concentration half did better (+13.6%, win 63%) than the lower half (+0.4%, win 45%). Different column (tracker snapshot, not GMGN), older cost model, 98 trades — but it points the other way to H.

- 21 Oct 02:30 UK — full diagnosis (all data since 18 Oct, to 21 Oct 01:42 UK; reports/books/diag/H.md; method: diagnose.py with the family-wise luck check — a filter counts as real only if luck matches it in ≤ 2 of 20 shuffled runs): 18 trades +14.5% but without best −0.9% — one coin. GMGN top-10 data missing for most coins, so it barely trades (~12 a day at best).

- 21 Oct 11:10 UK — revision search (data to 10:36 UK; diag/rev_H.md; scratch in scratchpad/rev_as/):
  - The book now: 27 trades +3.8% (no-best −6.7%, no-top3 −13.1%), 44% won, 41% stopped, thirds +25.6 / +3.3 / −17.5, 14.6 a day, +0.04 SOL a day at 0.1. Since 20 Oct 20:00 UK (the real test): 11 at −16.3% (no-best −23.3%), 4 won, 6 stopped — catdog +32.4%, Mugshot Cat −54.5%, Larp Final Boss −51.5%, PHP-UP-2026 +34.2%, Aura Final Boss +20.3% and (a second coin of the same name, 09:44) −52.6%, CVE-2026-109618 −2.4%, X Holdings −53.4% and −54.6% (two same-name coins 5 min apart), Clout +53.7%, Cumchi −50.9%. Only 6 of H's 27 coins are AS coins.
  - Can the ledger's top-10 replace GMGN? As a measurement, yes: GMGN's `gh_top10` exists on 72 of A's 370 passed rows, the ledger's `top10_entry` on 368 of 370; on the 72 rows with both they agree — correlation 0.87, medians 25.0% vs 25.5%, the same side of 23% on 88% of rows (the one big miss: Spidey Show, GMGN 19.5% vs ledger 42.1%).
  - But the rule does not work on it: A + ledger top-10 < 23% = 136 trades −6.0% (no-best −8.1%), thirds −12.3 / −5.1 / −0.9; its 31 AS coins +8.5% (worse than AS's +10.8%), its 105 non-AS coins −10.3%. No threshold helps (< 15% n41 +3.2% / no-best −3.7%; < 19.6% n79 −1.4%; < 25% n187 −3.9%; < 30% n286 −4.3%) and the bands are not monotone (0–15% +3.2, 15–20% −7.3, 20–23% −12.4, 23–26% −0.4, 26–30% −5.1, 30–40% −6.0, 40%+ +0.6). Inside AS the best band is 30%+ (26 at +21.1%, no-best +10.9%) and 26–30% is the worst (−7.2%) — the 19 Oct study's hint (higher concentration did better) was right for AS, i.e. the opposite of H. On D: < 23% −4.7% vs ≥ 23% −4.5%, no difference. The GMGN version itself: A + gh < 0.23 n27 +3.8% vs ≥ 0.23 n45 −3.8% — the whole gap is Spidey Show.
  - Winners vs losers: 12 winners (bundle 28–30% over 5–7 wallets, 75–80 wallets in the minute, peak 1.7–3.2x); 11 stopped at −51.0% (98 wallets in the minute, creator bought 3 SOL, 17 copycat names in 24 h, 60-s price 0.93x, 6 of 11 never saw 1.2x); 4 small losers (old coins, 29 min). Nothing separates them that is not AS's own story (quiet minute, small creator buy).
  - Exit verdict: every exit is negative without the best trade; x_t15s40 (−3.6%, no-best −5.2%) is the least bad. Factor / pair: 1,618 filters × 12 exits + 98 pairs; 103 pass, **0 are unlikely to be luck**. revise.py's pick (biggest buyer ≥ 8.2% of the minute / x_time, n14 +25.9%, no-best +5.8%) is a hold-to-the-end exit on 14 trades, luck 20 — ignore.
  - Proposed: RETIRE H (data kept); don't feed it from the ledger — the measurement is fine, the rule is not. Keep `top10_entry` in the data set for the AS analyses (where high concentration, not low, is the hint).

## Notable coins
- Spidey Show (19 Oct 21:58 UK, top-10 19.4%) — +276.6% at the 4x cap; most of H's total.
- Octo (19 Oct 16:39, +83.5%), Conviction (20 Oct 19:11, +58.5%), Poképad (20 Oct 17:34, +55.8%), Justice for Cole (19 Oct 14:25, +39.9%).
- catdog (20 Oct 20:11 UK, top-10 19%) — first trade after the start, +32.4%.
- Mugshot Cat (20 Oct 23:55 UK, top-10 16.4%) — second trade after the start, stop −54.5% (also a DS loser).
- Stopped: MAG-7 (19 Oct 14:07, −51.0%), ARE YOU READY? and archive (19 Oct 21:53 / 21:56, −51.8% / −51.6%), C'est la vie (20 Oct 04:51, −50.9%).

## What the owner said / decided
- 20 Oct ~19:30–19:45 UK: "any new strategies … hold accounts? … similarity …"; "Excellent. You want to add that into separate boxes or as a variant? … top 10 holder is a good idea" → separate box H.
- 20 Oct ~20:00–20:22 UK: "lots of coins small profit, or fewer coins big runners … H … 12 trades … minimum like 0.3 SOL" (his framework for judging books; H had about 12 trades in view then).

## Open items
- PROPOSAL (21 Oct rev): RETIRE — A + top-10 holders under 23% off the page, data kept; do not rebuild it on the ledger's top-10 — exit x_flow4 — n27 +3.8% (no-best −6.7%) thirds +25.6/+3.3/−17.5 luck 20/20 (best revision) — UNPROVEN — forward −16.3% on 11 (6 stops); the ledger column agrees with GMGN (0.87) and covers 368/370 rows, but A + ledger top-10 < 23% is −6.0% on 136 (no-best −8.1%, every third negative) and inside AS the 30%+ band does best.
- awaiting go: feed H from our own ledger's top-10 share (top10_entry) instead of GMGN so it gets enough trades; else retire. [ANSWERED 21 Oct 11:10 UK: the ledger column works as a measurement but the rule is −6.0% on 136 with it — retire.]
- Coverage is the blocker: GMGN's holder snapshot is missing on most A rows (50 of 336). Unanswered: why the snapshot is missing (rate limit? only taken for some triggers?) and whether to fall back to the tracker's own top-10 at entry (`top10_entry`) — not proposed yet, and the 19 Oct study hint on that column points the other way.
- Next decision: at 20 trades since 20:00 UK (2 now) — at the current rate that is days away unless coverage improves.
