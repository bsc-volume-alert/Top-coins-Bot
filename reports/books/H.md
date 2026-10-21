# H — A with low holder concentration
_Notes last rebuilt: 21 Oct 2026 00:45 UK._

## What it is now
- Code key `hold` (page name H). A filter on A's passed rows (`p5e30`, operator coins removed on the page). Page box only, paper, box stake 0.1 SOL. No executor book. Code: `src/web.js` `top10Of` / `lowTop10`.
- Entry rule: A's trigger (30 SOL within 60 s; MC under $100K; coin ≥ 60 s old; buys ≥ sells; ≥ 10 buyers; one trade per coin; skips bundled 70%+, launch not seen, 150+ wallets) AND GMGN's top-10 holder share at entry under 23% (`gmgn_entry.hold.top10` < 0.23; in abcd.csv `gh_top10`). The GMGN snapshot is taken about 1 s after the trigger. Rows without a snapshot are left out.
- Exit: `x_flow4`, the runner (as A). PumpSwap real-cost model.
- Started 20 Oct 20:00 UK (v0.18.171; commit 19:51 UK; `CHG_H` 19:00 UTC). No rule change since. Page shows before 20:00 UK (back-test) and since.

## Verdict now
**21 Oct 02:30 UK:** Can't be judged.

Undecided and mostly untestable: only 50 of 336 passed A rows carry a GMGN holder snapshot (21 Oct 00:09 UK data), so H has 18 trades in total and 2 since it started (catdog +32.4%, Mugshot Cat −54.5%). Its +14.5% on 18 is −0.9% without Spidey Show.

## Latest numbers
<!-- NUMBERS -->
_Data to 21 Oct 08:29 UK; A, top-10 holders under 23%. Built by reports/books/numbers.py._

| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |
|---|---|---|---|---|---|---|
| all (from 19 Oct 14:07 UK) | 25 | +8.3% | -2.9% | 48% | 36% | +0.18 |
| before the change (20 Oct 20:00 UK) — back-test | 16 | +17.7% | +0.4% | 50% | 31% | +0.27 |
| since the change — the real test | 9 | -8.4% | -16.2% | 44% | 44% | -0.08 |
| last 24 h | 15 | -2.6% | -7.0% | 40% | 33% | -0.05 |
| last 12 h | 8 | -13.5% | -23.1% | 38% | 50% | -0.12 |
| last 6 h | 7 | -7.7% | -17.9% | 43% | 43% | -0.06 |
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
- awaiting go: feed H from our own ledger's top-10 share (top10_entry) instead of GMGN so it gets enough trades; else retire.
- Coverage is the blocker: GMGN's holder snapshot is missing on most A rows (50 of 336). Unanswered: why the snapshot is missing (rate limit? only taken for some triggers?) and whether to fall back to the tracker's own top-10 at entry (`top10_entry`) — not proposed yet, and the 19 Oct study hint on that column points the other way.
- Next decision: at 20 trades since 20:00 UK (2 now) — at the current rate that is days away unless coverage improves.
