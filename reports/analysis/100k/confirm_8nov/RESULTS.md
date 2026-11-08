# $100K frozen-hypothesis confirmation — 8 Nov 2026 17:50 UK

Data: branch `k100-20261108t1722` @ 72d673ed (k100-export 1.0, sha256 verified). Cohort as frozen in ../study_v1_1/HYPOTHESES_FROZEN.md: launches created 7 Nov 09:57:18 → 8 Nov 15:22:40 UTC, retained (3,544 of 43,791), 2-h window complete. 77 POS at 60 s (≥ 15 → evaluation due).

| Hypothesis | Group | n | reached $100K | rate [95%] |
|---|---|---|---|---|
| H-sell | sell share at 60 s ≥ 0.50 | 458 | 4 | 0.87% [0.34–2.22] |
| | < 0.50 | 2,702 | 73 | 2.70% [2.15–3.38] |
| H-hold5 | cap at 5 min ≥ cap at 60 s ("held") | 514 | 36 | 7.00% [5.10–9.54] |
| | fell | 1,543 | 13 | 0.84% [0.49–1.44] |

Both SUPPORTED by their frozen criteria. Sensitivity (sensitivity_out.txt): unchanged after dropping 6 crossings on non-SOL-quoted pools (PUMP/BTC/USDC/DJT…, price in the wrong unit — a new data issue: the export's mc_usd assumes SOL quote) and after excluding coins already ≥ $30K/$50K at 5 min (held 4.7% vs fell 0.46% under $30K).

Limits: no feed-outage list for this window; detection only, NOT a trading result (a held coin's 7% chance of reaching $100K says nothing about profit after entry price and costs). Next step, if the owner wants it: an after-cost test of "enter at 5 min if held" on trade-level paths (pool trades exist for every launch since tracker 0.19.8).
