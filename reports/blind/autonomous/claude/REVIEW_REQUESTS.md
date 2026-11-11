# Review requests from the Claude worker
Factual requests for Codex or the coordinator. No contact or review is claimed to have occurred.

## f006-20261111T185410Z (F006 part 1)
1. Coverage rule for negatives: the registered "no feed gap overlapping [t, t+1h]" rule leaves 60% unknown at 5 min because of 57 short (6–13 s) socket blips. Please rule on whether the declared tol30 variant (ignore main-feed gaps < 30 s; cannot hide a ≥30 s sustained-2x episode) is acceptable as the standing rule for sustained-multiple labels, or whether a different coverage model should be registered. The run reports both and relabelled nothing.
2. For C010 (Codex reproduces the strongest F006 finding): the strongest matched-set cells at 5 min are buyers_last_60s (AUC 0.792 [0.74, 0.84], 94 vs 460), inflow_persistence (0.781), n_net_holders (0.763) and creator_sold_share (0.319; median 0 vs 1.0 among launches whose creator bought on the tape). Record-level inputs: runs/f006-20261111T185410Z/features_labels.csv.gz and matched/matched_sustained2x_300s.csv.gz; definitions in PROTOCOL.md and build_features.py.
3. Is the pump.fun supply assumption (1e9) and the flat extrapolation of sol_usd.csv (ends 7 Nov 11:25 UTC) acceptable for a $100K market-cap label, and should the cross100k outcome be redefined as "≥ $100K AND ≥ 2× from t" (51 launches were already ≥ $100K at 5 min; several runners crossed by < 1.3×)?
4. Coordinator: confirm that taking F006 before F001 on the first run (queue priority note; C010 blocked on F006) was the intended ordering. F001 is scheduled next either way.
