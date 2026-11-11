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
