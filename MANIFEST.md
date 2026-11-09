# replay_9nov — v2 correction package (immutable)

Published 9 Nov 2026 19:00 UK.
- **Inputs:** UNCHANGED, the original package at branch `replay-9nov-inputs-20261109t1410` @ f9a0086c. Use its inputs/ and run v2 with the same arguments as replay.py.
- **v1 outputs:** preserved there, untouched.

## Corrections in v2 (scripts/replay_v2.py header)
- **C1 Pool pricing** (see POOL_DIAGNOSIS.md):
  - Pool event reserves are pre-trade (98.8% of 942,833 consecutive pairs).
  - Swaps execute as constant product on (Q + c, B), with c a per-pool quote offset: median 17.3 SOL, stable within a pool. The mechanism is unidentified.
  - Pool legs use the post-swap state plus c, estimated from that pool's own earlier swaps only (median of the last 50, at least 5 needed). Otherwise the leg is tagged CAL-FALLBACK.
- **C2 Scoring:** a sell leg inside a feed gap adds no proceeds. UNRESOLVED keeps only the legs already realised.
- **C3 Triggers:** pool triggers read the post-swap effective spot, not the swap's own average price. This catches pool-draining sells. `TRIGGER=trade` reproduces v2 without C3: outputs/replay_v2_noC3_out.txt.

## Outputs
- **replay_v2_out.txt:**
  - the original 49 cells at 0.2 and 0.02 SOL
  - the shortlist on identical entries (30–50K T25, 30–40K T25, 30–40K T20)
  - the finite search: bands 20–30K, 30–40K, 40–50K, 30–50K and 20–50K × 13 exits (X15, X30, X60, T15–T40, TP2, H2T20/25/40). Every configuration is listed. The Bonferroni bound is computed over 114 cells; the column header still says 49.
- **positions_v2.csv.gz:** one row per coin × exit × size, with ret_zero_remainder (downside scenario) and ret_last_state_remainder.
- **v1_v2_diag_out.txt:** v1 → v2 by entry venue, the largest changes, winner and loser features before entry, and the extreme-winner audit (693RVZyu).
- **pool_check_out.txt:** the reserve tests.

SHA256SUMS.txt covers every file.
