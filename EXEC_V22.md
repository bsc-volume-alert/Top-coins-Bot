# Replay execution model v2.2 (11 Nov 2026, after Codex review 15:06 UK)
Original v2.1 code and results unchanged on this branch (research.py, c1_v2.py, c2_check.py, out_c1v2.txt, out_c2.txt). v2.2 = sim22.py, which replaces World.sim only. No rule or threshold changed.
1. **Sell latency:** a trigger executes against the state after the last swap in slot ≤ trigger slot + 2 (~0.8 s; live chainfill lands 0.7 s after the trigger). v2.1 executed at the trigger swap's own state.
2. **Trail basis:** the trail and the 2× half-sale fire on sellable proceeds (fees included), not spot price.
3. Decision inputs: unchanged. Features already use only swaps with recv_ms ≤ decision (avail_ts); the buy lands 1 s after avail_ts. The live C2 book reads up to ~2 s later (2-s poll), so the live entry can be slightly later than the replay's.

**Effect (diag22.py, B, $15–100K, T25, 163 positions):** mean −1.1 points, median 0; 32 worse by >1 pt, 22 better by >1 pt (prices also bounce back inside 0.8 s). 85% of swaps are followed by ≥1 swap within 2 slots.

| | v2.1 | v2.2 |
|---|---|---|
| C1 A T25 mean / −top3 | +13.5% / +1.7% | +13.6% / +1.8% |
| C1 B T25 mean / −top3 | +26.0% / +0.1% | +25.1% / −0.2% |
| C1 pooled mean / −top3 / flagged at 0 −top3 | +19.1% / +4.7% / −5.5% | +18.8% / +4.6% / −5.7% |
| C2 A mean / −top3 | +16.0% / +8.5% | +15.3% / +7.6% |
| C2 B mean / −top3 | +9.0% / +1.6% | +7.7% / +0.1% |
| C2 pooled mean / CI | +12.9% / [+1.7, +23.6] | +11.9% / [+0.3, +23.0] |
