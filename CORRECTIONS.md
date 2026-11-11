# Corrections v2 (11 Nov 2026, after Codex's review of v1 @ 765a9445) — v1 files are kept in history; this commit replaces scripts and outputs

1. **Duplicate swaps.** v1 did not deduplicate trade rows; overlapping capture paths store the same swap more than once. v2 keeps one row per
   fingerprint (signature, wallet, side, SOL, tokens, venue, pool, event index), first-received copy. Effect: dump-window sells halve for several coins
   (4srewArZ 219.3 → 109.7 SOL; 6k9PpRWd 98.9 → 49.4; B8dvdSHW 185.7 → 92.9; rocFBk2P 131.7 → 70.6 — identical to Codex's figures). Book P&L unchanged.
2. **Received-after-decision rows.** Pre-entry features now use only swaps the tracker had received by the decision (recv_ms ≤ decision ms).
3. **"Liquidity removal" withdrawn.** v1 called Ffs4KXjK a likely liquidity withdrawal from a −68 SOL residual; after deduplication the residual is −1.2 SOL.
   No withdrawal is claimed for any coin; residuals are reported as unexplained, and a withdrawal would need the withdrawal transaction (not in the package).
4. **Quiet-price wording.** "Verified unchanged" → "consistent with a quiet market within the tested tolerance". Tolerance = 10–90% range of fill ÷ reading on
   trade-sourced entries (pool −5.1% … +4.4%; curve fixed 0.995–1.020 because only 2 trade-sourced curve entries exist). Consistency, not proof.
5. **Stall wording.** 83 event-loop blocks ≥ 10 s on 9–10 Nov, of which 46 ≥ 2 min (not "all 1.5–6 min"). A block delays processing; whether trades were
   recovered later from buffers or lost is not measured yet.
6. **Delayed exit kept separate.** HYoM6KGc's sell landed 66 s after its trigger (execution delay), unlike the sub-second collapses; "this trail failed" does
   not establish that every earlier exit would have failed.
Unchanged conclusions: the 12 severe $40–50K pool losses are instant-graduation, heavily bundled coins at ~0.42× their pre-entry peak with net selling;
hundreds of distinct wallets (after deduplication) sell within ~1 s. No new trading filter is proposed from this sample.

# Corrections v3 (11 Nov 2026 12:40 UK, Codex review of v2)
7. **Knowledge time.** Rows without a receipt time are now flagged (`kt_uncertain_rows`) and the flow/peak warnings are also computed on proven-receipt rows only. In this sample 0 of 80 closed fills had any pre-entry row without a receipt time, so nothing changes.
8. **Instant graduation, two separate things.** `RETRO_secs_create_to_first_pool_trade` = retrospective launch class from the whole stored history (not usable by a bot);
   `secs_create_to_migration` = decision-time signal from pool trades received by the decision. Both give 23 hits / 14 severe / 5 winners here.
9. **Unknown features are no longer counted as "kept".** The warning table now shows hit / passed / feature-unknown separately. This matters: e.g. decision-time instant graduation —
   passed mean −9.1% (29), unknown −2.0% (28); v2's "kept −5.6%" was flattered by the 28 coins without retained trades (mostly curve entries).
