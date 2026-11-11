# Next-strategy research 11 Nov 2026 — reproduce
Inputs (immutable): period A = `replay-9nov-inputs-20261109t1410` @ f9a0086c (folder `inputs/` → `A/`); period B = `k100-audit-20261110t2102` @ c093afef (folder → `pkg/`).
```
python3 build_tr.py A/tr.pkl.gz A/trades_*cohort_*.csv.gz          # 2,080,832 rows, 466,625 duplicates removed
python3 build_tr.py B_tr.pkl.gz pkg/trades_part_*.csv.gz            # 2,119,806 rows, 605,947 duplicates removed
python3 sanity.py      # reproduces replay v2.1's shortlist exactly (+12.4 / +19.6 / +21.5%)
python3 research.py A B_tr.pkl.gz pkg out_research   # every configuration (182 cells)
python3 robust.py      # sub-bands, delays, costs, pooled CI, top contributors for the best group
```
Read PROPOSAL.md for the answers and the (not built) candidate. Python 3 standard library only.
