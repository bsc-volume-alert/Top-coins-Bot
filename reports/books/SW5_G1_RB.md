# SW5, G1, RB — three paper experiments beside R3C (launcher 0.10.1)

- **Status:** proposed 11 Nov 2026 (Codex recommendation 13:41 UK: "all three, one combined diff for review"); activated on the owner's go — fd_rules 'SW5_ACTIVATION' / 'G1_ACTIVATION' / 'RB_ACTIVATION' hold the exact second.
- **Live trading:** OFF. R3C, the reference books, the K books and the page clean-up are untouched.
- **Judged** at 100 coins or 7 days each, on net SOL against cash with failed fills and unresolved positions visible; a lower severe-loss rate or a higher win rate alone is not success. Overlap and combined exposure measured as data arrives (entries were disjoint historically: SW5 ∩ R3C = 1 of 30).
- **Historical basis** (reports/analysis/entry_winners/fable_11nov, scripts 14–16; Codex's independent check 11 Nov 17:16): SW5 — the 30-entry / 80%-at-5-min figure used a looser entry; under the deployed rule (none of the three wallets has sold, ≥ 0.5 SOL net each) only **11 of those coins qualify, 5 at the original time** — so SW5 starts with no usable historical figure; G1 388 entries, −1% scalp in the light simulation, −18% with a trail against real reserves; RB 54 entries, 37% severe losses. Each is a hypothesis under test, not an expectation.
- **Codex code review (17:16) fixes, all in launcher 0.10.1:** policy clocks (hold / stagnation) run from the recorded fill (s_ms_land), not the decision; coins created before the launcher started reading the stream are never eligible for R3C / SW5 / G1 / RB (no history seen → no false 'first pool trade', no unseen earlier sale); the 0.02 position's trigger schedules its own landing read; RB coins that go silent after the dump are expired on the clock with a 'no recovery' record; R3C's curve-only check is repeated at landing (graduation during the 1-s buy delay → 'skipped-graduated-at-landing', no pool fill). Unit test launcher/test/policy_exits.test.mjs: 15/15.

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
- 11 Nov 2026 — written (as launcher 0.10.1 / scope 0.13.1); Codex review fixes applied 17:30 UK.
- 12 Nov 2026 — owner's go 04:38 UK ("paper trail these 100%"); rebased onto the live tree (C2 0.10.1, old books stopped 0.10.2, M2 0.10.3) and deployed as **launcher 0.10.4 / scope 0.14.2**. Books on the page: M2, R3C, C2, SW5, G1, RB, 100K1-3.

## Forward results — 12 Nov 16:27 UK read (11 h 47 min since activation 04:40:37)
- **SW5:** 0 triggers. 497 coins saw a listed wallet trade, none reached 3 listed wallets ≥ 0.5 SOL net with none sold inside 180 s. Codex's reproduction (11 of 30 historical coins qualify under this rule, ~4 a day) predicted a trickle; 12 h with none is consistent with a rule that is too strict, or with the list having gone stale (it was built on 6–7 Nov wallets). Leave to the 7-day mark, then decide whether to widen (2 wallets / 0.3 SOL) as a new version, never by editing SW5-1.
- **G1:** 170 triggers, 37 late (22%), 133 entered, 118 fills (15 landing failures: pool not readable at +1 s), all closed: **−0.26 SOL, mean −1.1%, median +4.5%, 67% wins (79/118)**. Exits: stagnation 80 (+3.3% mean, +0.52 SOL), take-profit 19 (+42%, +1.59 SOL), stop 19 (−62% mean, −2.38 SOL — the fixed −50% stop lands at −62% because the drop is one block). Pool gap (first pool print vs last curve print) median 1.21×. Working exactly as specified; the 19 stops cost what the 19 take-profits earn. Zero 2× from entry — it is a scalp, by design.
- **RB:** 2,703 coins watched, 362 reached 2×, 265 dumped ≥ 35% in a wave, 242 never recovered in time (196 went silent — expired on the clock), 23 recovered with ≥ 15 new buyers, 4 late, 19 entered, 16 fills, all closed: **0.00 SOL, mean 0%, median −7%, 6 wins, 0 severe, 1 reached 2×, best +45%, worst −32%.** New buyers at entry median 52. 13 second dumps after entry (recorded). Too few to say anything; the funnel itself is the finding: 1 in 11 dumped coins recovers under the rule.
- M2 and C2 (the other page's books, for the owner's overview): M2 60 fills +1.31 SOL (mean +11%, median −15%, 22 wins, 6 severe, 10 reached 2×, best +529%); C2 90 fills, 85 closed −0.91 SOL (mean −5%, 29 wins, 19 severe, 14 reached 2×).

## G1B and RB2 (launcher 0.10.5 / scope 0.14.4) — owner + Codex go 12 Nov 17:07 UK; awaiting the owner's go on the diff
**G1 review at 118 fills (12 Nov 16:27):** −0.26 SOL, −1.1% mean, 67% wins; stagnation 80 (+3.3%), take-profit 19 (+42%), fixed stop 19 (−62% mean, median 140 s to the stop; 5 of 19 inside 10 s). The "positive last 6 h" tile (+0.62 on 79) is part of this result, chosen after the fact: weak evidence.
**G1B (G1B-1, frozen):** same decision and the same fill read as G1 (one chainEntry, two ids; G1B rows relabelled after landing). At the FIRST valid observation at or after fill + 90 s (each size on its own value and fill time): sell if the after-cost liquidation value ≤ 1.15× stake (flat or down); else continue under take-profit 1.45 / fixed stop 0.50 / 2-h hold. Exit reason 'check90'. After a restart an open position is checked once more at its next observation (in-memory one-shot flag).
Replay of the rule on G1 entries with trade coverage (trades_books, 13:00–16:26 only: 34 of 118 fills): G1 −0.01 SOL → G1B +0.21; 2 drifting stops (−99% at 329 s) become −35% / −44%; 25 stagnation exits unchanged within ±1% (validates the price proxy); 0 take-profits sacrificed in that window (none occurred in it). The five fast stops cannot be helped. The earlier "+1.3 SOL" projection is withdrawn as unmeasured; 34 coins is exploratory only.
**RB2 (RB2-1, frozen):** dump ≥ 25% within 60 s of the high, reclaim ≥ 50% of the drop within 180 s of the dump, ≥ 10 new buyers; 30% trail; independent state machine on the same stream (rbpaper.mjs factory). Not a superset of RB: report RB-only / RB2-only / shared entries at review. Question: do shallower recoveries work, not just more of them. RB rate check (Codex): 16 fills in 12 h → ~100 in three days, not a month.
**R3C logging (no rule change):** at each trigger now also recorded — tx_per_wallet60, net_over_gross60, both_sides60, new_buyers60, returning_buyers60, curve_ata (the curve vault's token account, so holder-snapshot shares can exclude it), obs_ms (observation time; trigger ts and read ts already recorded; landing evidence is in chain_fill s_ms_land / s_res_fill).
Unit test launcher/test/policy_exits.test.mjs: 23/23.
