# C002 — completed evaluator-integrity reproduction

No new strategy search, protected outcomes, live trading or paid blockchain requests. Frozen evaluator source unchanged. Both sizes (0.2 and 0.02 SOL) were checked against previously published results at horizons 30 and 7,200 seconds for four named development mints: all eight mint/horizon categories and scored returns match within 1e-12. All 16 cached development manifest checksums were reverified.

## Raw-record results

| Mint prefix | 30 seconds: 0.2 SOL | 2 hours: 0.2 SOL |
|---|---|---|
| 5kdsd8zW | scored +178.773683 return (+35.754737 net SOL) | unknown: exit capture gap |
| LLzYn4ZZ | unknown: invalid exit state | scored +3494.461446 return |
| fBidsBVN | unknown: invalid exit state | scored +3491.724020 return |
| dEJEFGBe | unknown: invalid exit state | scored +3095.137081 return |

These are evaluator outputs, not executable profit. All four initial curve states show 85.005359057 SOL buying and virtual token reserve at 279900000000000. The evaluator admits the completed-curve state for buying, then accepts pool states based on its stored evidence fields. results.json includes exact fill/exit rows and unavailable reasons.

The execution-validity problem is reproduced. The specific pool-decoder cause, true mint decimals and historical on-chain balances were NOT independently established here; anomalous pricing alone does not prove misdecoding. No arbitrary price cap or cohort exclusion was applied. The 2-hour result for 5kdsd8zW must remain unknown; the extreme 2-hour jackpots belong to other mints.

## Never-enter boundary

Synthetic control with 12,000 rows: decide() called once, returns false, deliberate abstention, both lower scores zero.
At 12,001 rows: decide() never called; result unknown/pre-promotion buffer exceeded. Frozen scorer point is zero, but worst-case lower score is -0.2015 SOL at size 0.2 and -0.0215 SOL at size 0.02; unknown share is 100%, not scorable. These are imputed bounds, not executed losses. Synthetic prevalence does not measure how often this occurs in the market.

This supports recording none-supported decisions outside active rule scoring. It does not silently repair the frozen evaluator. Future evaluator review should distinguish unavailable trade attempts from rules that never attempt entry, validate actual retention/finalisation time and completion state, and require independently verified pool units/configuration.

## Reproduce

Use the C001 cache prepared from the immutable artifact commit e622e625d626c365969321f7aa2634e87c7c858b (its prepare.py and reproduce.py create the data cache and replay filename adapter). Then run:

    python reproduce.py --cache /absolute/path/to/c001-20261110T211226Z > run.log 2>&1

Only Python standard library is used by C002. Preserve expected_artifacts.json alongside this script. Expected buffer output is separately archived in expected_buffer.json. The script rehashes every input listed by the development manifest, checks the frozen evaluator hash, extracts four mint histories, executes unmodified run_launch and asserts all published category/return comparisons plus the synthetic boundary controls.

provenance.json records source identities and the hash of the regenerated 66 MB target-history extraction (not duplicated on GitHub). There is no bootstrap, portfolio study or new profitable candidate in this run. Model/compute/storage monetary costs were not measured. No Helius/GMGN API calls occurred.

Next ready task: C003, runner-data inventory and causal coverage map. No hidden-test dataset is released by this report.
