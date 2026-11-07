# Ad-hoc analysis steps (run in order after load.py → engine.build() → grid.py)
1. validate.py — engine vs the bot's closed positions (fd_positions in current/, snapshot3/ and the two aged-out files).
2. Unconditional table: grid.pkl, eligible==1, group by age, mean/median/win per exit column r_<exit>, unknown = cat_<exit> != 'a'.
3. Feature quartiles: half A = create in [2026-11-06 07:40, 22:00) UTC; qcut each feature into 4; mean r per quartile; Spearman rho.
4. Organic rules: blbar = net>=15 & mc_sol>=60 at t; masks ret_age>=5/10, nbundle<=1, bundle_sol<=1 and pairs; report A, B, pre.
5. Migration: for each mint created >= 2026-11-06 19:31 UTC, t = recv_ms of the first pool row; replay with trails 25/40, 1.5xTP/30, holds 60/300/1800; then hold curve 10..1800 s; split at 2026-11-07 06:00 UTC.
6. Breakout/dip at ages 120/180/300 on the B era, split at 06:00.
7. Final stats + bootstrap (seed 20261108, 10,000) for MIG300 at 0.2 and 0.02 SOL; unknown at worst case for the lower bound.
