# SW5, G1, RB — three paper experiments beside R3C (launcher 0.10.1)

- **Status:** proposed 11 Nov 2026 (Codex recommendation 13:41 UK: "all three, one combined diff for review"); activated on the owner's go — fd_rules 'SW5_ACTIVATION' / 'G1_ACTIVATION' / 'RB_ACTIVATION' hold the exact second.
- **Live trading:** OFF. R3C, the reference books, the K books and the page clean-up are untouched.
- **Judged** at 100 coins or 7 days each, on net SOL against cash with failed fills and unresolved positions visible; a lower severe-loss rate or a higher win rate alone is not success. Overlap and combined exposure measured as data arrives (entries were disjoint historically: SW5 ∩ R3C = 1 of 30).
- **Historical basis** (reports/analysis/entry_winners/fable_11nov, scripts 14–16; not independently verified by Codex yet): SW5 30 entries, +10% at a 5-min hold / −45% with a trail; G1 388 entries, −1% scalp in the light simulation, −18% with a trail against real reserves; RB 54 entries, 37% severe losses. Each is a hypothesis under test, not an expectation.

## SW5 — wallet-led entry, fixed 5-minute hold (SW5-1)
- Wallet list: launcher/lists/sw5_wallets.json — 200 wallets, FROZEN 11 Nov (train half only: coins created before 7 Nov 12:00 UTC; wallets that bought ≥ 8 of them at 15–180 s with ≥ 35% reaching 3× the 60-s price).
- Trigger: the first trade at which ≥ 3 listed wallets each hold a net ≥ 0.5 SOL in the coin and none of the three has sold, coin ≤ 180 s old. Read within 5 s or LATE.
- Entry 0.2 SOL (+0.02) on the reserves 1 s later, curve or pool. Exit: sold at **fill + 300 s** (from chain_fill.entry_ts, the actual fill), no trail; 2-h backstop.
- Recorded: the wallets in and their net SOL; copyexit_ts = when 2 tracked wallets have sold half their tokens (event only).

## G1 — post-graduation scalp on executable reserves (G1-1)
- Trigger: the first pool trade of a coin ≤ 1 h after creation. Read within 5 s or LATE.
- Entry 0.2 SOL (+0.02) against the pool reserves 1 s later (pool fee rates). Pool not readable → data-failure row, no fill.
- Exit: take profit at x ≥ 1.45; **fixed stop at x ≤ 0.50 on the entry value (not a trail)**; stagnation: sold if 0.85 ≤ x ≤ 1.15 on any reading between fill + 90 s and fill + 120 s; **outside that band after 90 s the position continues under the same take-profit / stop to the 2-h horizon.**
- Recorded: last curve print, first pool print, their ratio (the unbuyable pop).

## RB — recovery after a one-wave sell-off (RB-1)
- Life: ≥ 2× the 60-s price within 30 min; running high H from that print.
- Dump: first print ≤ 0.65 × H within 60 s of the print that set H (time tD). Trough L: lowest print from tD until recovery.
- Recovery: first print ≥ L + 0.60 × (H − L) with ts ≤ tD + 180 s AND ≥ 15 distinct wallets buying in (tD, that print] that had not bought before tD. No recovery by tD + 180 s → 'no recovery', dropped. Read within 5 s or LATE.
- Entry 0.2 SOL (+0.02); exit 30% trail, 2 h. Recorded: H, tD, L, prints, new-buyer count; second_dump_ts = a second ≥ 35% wave after entry (event). Recovery does not prove the large sellers have finished — that is what the forward data measures.

## Mechanics shared (chainfill 0.10.1)
- Per-book exit policies (BOOK_POLICY: trail / tp / sl / hold / stagnation) beside the existing trail override; restored on restart from vol_paper; every other book's exit code path unchanged (a policy only adds trigger conditions for its own positions). A policy exit names itself in s_exit_reason at the trigger (tp / stop / hold / stagnation).
- All four new books read the tracker's trades once every 2 s (r3paper.mjs poll, hooks for the siblings).
- Exports: sw5_decisions.csv, g1_decisions.csv, rb_decisions.csv (48 h). Site: SW5, G1, RB after R3C on /fd and /fd2 (scope 0.13.1).

## Change history
- 11 Nov 2026 — written (launcher 0.10.1 / scope 0.13.1), awaiting the owner's go.
