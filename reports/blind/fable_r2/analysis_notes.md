# Analysis steps (Round 2), in order
1. load_r2.py -> mints_r2.pkl (dedup by full fingerprint; per-mint arrays).
2. engine_r2.universe(): prep (retention per eval-1.1, receipt order, validity) and the universe = retained, not in outage -> U.pkl (3,693).
3. grid_r2.py -> grid_r2.pkl: 12 decision times x 15 exits + features (stage A/B).
4. Instant-graduation flag at the retention row: mc_sol>=380 or gross>=80 (111 mints) -> excluded -> grid_r2_clean.pkl.
5. Stage B: quartile means of 18 features at dec=='r0' for exits h30, tp13tr20, tr20, by half (split 2026-11-07 03:22 UTC).
6. events_r2.py -> events_r2.pkl (stage C). 3-h bucket tables: group scored returns by floor(create,3h).
7. Stage D: tokens_window sorted by create_ts; creator_prior = groupby(creator).cumcount(); sym_prior likewise on lower(symbol); joined to grid at r0.
8. cand_r2.py: first-time creators, retention+{0,5}s, 8 exits, 2 sizes, bootstrap of the lower score (4,000 resamples, seed 20261108).
9. evalcheck/: eval-1.1 on the same export for the plain r0/hold-30 rule, both halves.
