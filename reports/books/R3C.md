# R3C — "buy on the run, still on the curve" (paper, launcher 0.10.0)

- **Activated:** 11 Nov 2026, on the deploy of launcher 0.10.0 (fd_rules 'R3C_ACTIVATION' holds the exact second; the site shows "rule loaded"). Owner's go 11 Nov 13:13 UK.
- **Live trading:** OFF. Every other book unchanged. The K ($100K) books are a separate project and untouched.
- **Basis:** reports/analysis/entry_winners/fable_11nov (DIAGNOSIS_11NOV.md, REPLY_TO_GEMINI_11NOV.md, scripts 13–16): trade-level and reserve-based replay of 2,127 coins launched 6–8 Nov, reviewed by Codex and Gemini on 11 Nov. Not a confirmed edge.
- **Do not adjust in response to early results.** Review at 100 coins or 7 days, whichever first, on net SOL against cash with failed fills and unresolved positions shown. A good week is a checkpoint, not a promotion.

## Rule (R3C-1, frozen)
- Population: launches the tracker retains (trades written in real time: bundle tier ≥ 1 or ≥ 15 SOL of buys).
- p60: the price of the last trade at or before creation + 60 s. No trade by then → not eligible.
- Trigger: the first curve print between 60 s and 15 min after creation at ≥ 3× p60 (standard-curve print ≤ 4.2e-7 SOL/token, not a >10× jump on the previous print).
- Timeliness: trades are read every 2 s; entered only if read within 5 s of the trigger print, else recorded LATE.
- Entry: 0.2 SOL (+ independent 0.02), reserves re-read 1 s after the decision, curve maths (chainfill fill-2/fill-3). A coin that has graduated by the read gets no fill ('skipped-graduated', recorded).
- Exit: 30% trail on the position's own proceeds, any venue after migration; sell lands 0.7 s after the trigger; 2-hour maximum.
- R5 crossings (≥ 5× p60 within 15 min) recorded as events (r3_decisions.r5_ts), never used to select.
- Diagnostics at the trigger, recorded not used: curve vSol, buyers/buys/sells/net SOL in the last 60 s, zero-buy sellers before the trigger, chain holder snapshot (20 largest token accounts, shares with and without the largest = the curve vault).
- Exports: r3_decisions.csv (48 h) on launcher-data; positions in chain_fill / fd_positions as strat 'R3C'.

## What the replay said (why this book exists)
- 3× on the curve within 15 min, 30% trail, reserve-based fills (04_replay.py): 99 fills — 96 closed at +5.00 SOL, 3 unresolved (Codex's check 11 Nov: +4.40 SOL if those three stakes are written off) — +26% uncapped mean, +7.6% with winners capped at 5×, 10% severe losses; positive on both chronological halves (train +4%, test +13% capped).
- The profit sits in the 43 of 99 that graduated during the hold (+7.9 SOL; +1.7 without the top five); the 56 that never graduated lost 27% with 9% wins. The bet is the 43% graduation rate, not a per-coin edge.
- Already-in-pool 3× entries: −5% capped. First-pool-trade entries: −18% against real reserves. Scale-out/moonbag exits, dump-and-recover, smart-wallet copying: all worse or failed (LESSONS.md 11 Nov).
- Expect ~45–50 triggers a day from the 6–8 Nov rate; the forward population is the tracker's retained set, slightly wider than the replay's.

## Change history
- 11 Nov 2026 — created (launcher 0.10.0, scope 0.13.0: R3C on /fd and /fd2 at the top of the list).
- 11 Nov 2026 (0.10.1, with the SW5/G1/RB push) — Codex review: the curve-only check is now repeated at the 1-s landing read ('skipped-graduated-at-landing'); coins created before the launcher started reading the stream are ineligible. Rule R3C-1 itself unchanged.

## Open items
- Reconcile forward fills against the replay's fill model once 100 coins are in (fill gap, landing lag, skipped-graduated rate).
- Holder snapshot: does top-3-excluding-vault share at the trigger predict the drains? (Trade-ledger concentration did not.)
- Codex's wider population (747 R3 triggers incl. 566 unbought coins) to be replayed when its features are on a branch.

## 11 Nov 2026 17:00 UK — Codex review (16:34) and deployed-rule reconciliation (branch next-strategy-v22, r3_deployed.py)
**Corrections to "What the replay said" (from replay_runs.csv, T30, 96 closed on-curve fills):**
- +5.00 SOL total, of which one coin +4.34 SOL. Without the best 3: −3.0% a trade; without the best 5: −6.8% (−1.24 SOL). "+1.7 SOL without the top five" does not reproduce from this file.
- Chronological halves by decision time: first 48 +2.1%, second 48 +49.9%. "Positive on both halves (train +4%, test +13% capped)" came from a different calculation (capped, other split) and is withdrawn as a description of this replay.
- 11 of the 43 "graduated during the hold" graduated after the position had already sold (Codex); 32 graduated before or at the sale.
- The replay's fees were curve 1.0% / pool 0.30%; deployed maths ≈ curve 1.25% / pool 0.55%. Its clock started at the first stored trade; deployment starts at creation. The replay had an exit delay (1 s).

**Deployed rules replayed** (creation clock, arrival order, read = receipt rounded to the 2-s poll, LATE if > trigger + 5 s, buy +1 s, skipped-graduated, 30% trail on sellable proceeds, sell at slot + 2, deployed fees), period-A cohort of 2,019 coins:
| | Fills | Mean | Median | Without top 3 | Without top 5 | Total |
|---|---|---|---|---|---|---|
| Original replay, all its coins | 96 | +26.0% | −13.5% | −3.0% | −6.8% | +5.00 SOL |
| Original replay, same cohort only | 52 | +4.8% | −9.6% | −8.4% | −12.0% | +0.50 SOL |
| **Deployed rules, same cohort** | **173** | **+4.0%** | **−22.6%** | **−7.6%** | **−9.5%** | **+1.38 SOL** |
| Deployed, flagged exits at −100% | 173 | 0.0% | −23.4% | −11.7% | −13.7% | −0.02 SOL |
- Reconciliation: 1,802 no 3× print, 8 late, 35 skipped-graduated, 1 no print by 60 s, 173 filled. Halves: +4.1% / +3.9%.
- The creation clock triggers on about 3× as many coins as the first-trade clock (173 vs 52 on the same coins): the deployed book is not the replayed book.
- Limit: the cohort excludes launches with a late/missing 5-minute reading (1,065) and those past $100K before 5 min (209). The original's +4.34 SOL coin is not in it. A full-population run needs the other page's trades parquet.

**Forward (paper, since 13:13 UK):** 21 closed, mean −25.7%, −1.08 SOL, 5 lost ≥ 50%, best +42%.
