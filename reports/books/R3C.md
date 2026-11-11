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
- 3× on the curve within 15 min, 30% trail, reserve-based fills (04_replay.py): 99 fills, +5.0 SOL total, +26% uncapped mean, +7.6% with winners capped at 5×, 10% severe losses; positive on both chronological halves (train +4%, test +13% capped).
- The profit sits in the 43 of 99 that graduated during the hold (+7.9 SOL; +1.7 without the top five); the 56 that never graduated lost 27% with 9% wins. The bet is the 43% graduation rate, not a per-coin edge.
- Already-in-pool 3× entries: −5% capped. First-pool-trade entries: −18% against real reserves. Scale-out/moonbag exits, dump-and-recover, smart-wallet copying: all worse or failed (LESSONS.md 11 Nov).
- Expect ~45–50 triggers a day from the 6–8 Nov rate; the forward population is the tracker's retained set, slightly wider than the replay's.

## Change history
- 11 Nov 2026 — created (launcher 0.10.0, scope 0.13.0: R3C on /fd and /fd2 at the top of the list).

## Open items
- Reconcile forward fills against the replay's fill model once 100 coins are in (fill gap, landing lag, skipped-graduated rate).
- Holder snapshot: does top-3-excluding-vault share at the trigger predict the drains? (Trade-ledger concentration did not.)
- Codex's wider population (747 R3 triggers incl. 566 unbought coins) to be replayed when its features are on a branch.
