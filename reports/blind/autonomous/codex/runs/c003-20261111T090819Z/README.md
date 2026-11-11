# C003 — runner evidence and causal coverage inventory

Completed 11 Nov 2026. This is an executed data/schema/coverage audit, not a predictor search, runner-performance reproduction or profitability claim. No protected outcome files were read. No live trades, paid collection or new provider API loops.

## Evidence actually inspected

Raw data contents: only entry-package-7nov @ 0e3be03c71949e069a7a31b5951f332bb563f68f and all-coins @ e67833121f1da0dc992c28fa26c5236a855c151a. Rehashed all 16 package files examined and the two all-coins census/coverage files against their published manifests: 18/18 passed. Columns, populated counts, ranges, checkpoint sources and timing diagnostics are in coverage.json. Audit code executed successfully; no predictive thresholds tried.

Remote branch inspection: branch/commit/tree identities and filenames/sizes/blob hashes ONLY. No remote data/manifests/replay outcomes were opened. No AGENTS.md files were found in inspected branch trees; no local AGENTS.md was present. Remote inventory does not establish data integrity, population coverage, historical completeness or permission to analyse outcomes.

## What the approved package can and cannot support

| Measured item | snapshot3 | current |
|---|---:|---:|
| Census unique mints | 85,016 | 83,856 |
| Lifecycle rows | 130,939 | 121,081 |
| Mints with lifecycle records | 14,455 | 13,041 |
| Census mints without a lifecycle record in this export | 70,561 | 70,815 |
| Lifecycle rows missing obs_ts | 59,116 | 56,128 |
| Lifecycle rows with holders/top10 populated | 189 / 189 | 153 / 153 |
| Mints with a checkpoint >=30 min | 12,050 | 11,770 |
| Mints with a checkpoint >=1 h | 11,138 | 10,660 |
| Mints with a checkpoint >=2 h | 9,185 | 8,619 |
| Mints with a checkpoint >=24 h | 0 | 0 |
| Runner registry rows | 1,480 | 1,476 |

Different census and checkpoint export windows explain much of the mismatch; these counts must not be interpreted as market-wide collection-failure rates. The manifest states 48-hour registry/census-style context versus 12-hour lifecycle/early-checkpoint exports. No 24-hour labels can be certified from these audited lifecycle files. Existence of a late checkpoint does not establish complete continuous path coverage.

All-coins census/coverage: 62,789 unique launches, creation 6 Nov 07:40:03 to 7 Nov 19:59:59 UTC. 4,913 have exported histories; 57,876 have zero exported rows. Zero exported history is neither proof of nonretention nor a negative runner outcome. Capture differs by retention and decoder/pool epochs.

## Causal timing and label risks

- Early checkpoint nominal ages are 15/30/60/90/120 seconds; there are no universal stored 5/10-second checkpoint columns. Shorter intervals require adequate receipt-timed histories and causal retention eligibility.
- snapshot3 age-15 rows: 16,135 total, 14,456 observations present, 14,147 market caps present, 1,674 marked missing and 5 not due. current: 14,557 total, 13,042 observations present, 12,831 market caps present, 1,507 missing and 8 not due.
- Observed age-15 lateness reaches 283 seconds; age-120 lateness reaches 274 seconds. A delayed checkpoint is only usable when actually available, not at its nominal cutoff. Ten lifecycle rows in each snapshot have obs_ts one second before ts; rounding/clock provenance remains unresolved. Do not silently repair.
- Lifecycle rows without obs_ts cannot certify receipt-time feature availability. Even populated obs_ts needs semantic verification; it is not automatically tracker receipt or feature-computation completion time.
- The runner registry is selected by migration and/or observed cap and includes multiple source/detection times. It is a discovery/reconciliation aid, never the standalone launch denominator. Graduation is not >=$100K.
- coverage_crossings: 200 records in each export, 45 suspect_jump=1, 87 with SOL/USD observation age >60 seconds, maximum 119 seconds. FX is present on all 200. This documents evidence age, not automatic invalidity; first-crossing labels still require price/units/decoder validation and timed FX. Both crossing tables and coverage_mints are the same older 7 Nov 11:23:47 cutoff, not the later current export's cutoff.
- No crossing recorded at discrete checkpoints is not evidence that a crossing never occurred between them. Right-censored and missing outcomes must remain unavailable.
- Creator, tier, graduation, peak and last-value census fields are export-time attributes. Their existence does not establish their historical knowledge time. Do not feed future peak/graduation or later rebuilt wallet labels into features.

## Resolved external evidence (metadata only, NOT released)

| Branch | Full immutable commit | Contents located, not read |
|---|---|---|
| study100k-v1-inputs | 3bd9c3b90d6882b80f3dfd6189831f0f43c30998 | Four older token-life/census/fd-watch inputs, registry, crossing/FX tables, study code/search log |
| k100-20261108t1722 | 72d673ed0e5cec92ebf4e7ff612ba419991a3005 | Census, lifecycle, crossing, coverage and FX exports |
| k100-20261109t1144 | 66f2371c99cc8e06c558ed76d64b183cda866d69 | Same families, later snapshot |
| replay-9nov-inputs-20261109t1410 | f9a0086c31e529e9c70409ad743e872968a2ae6e | Cohort, replay specs/addenda, subset histories from BOTH pre-8-Nov and Saturday exports, outputs/scripts |
| replay-9nov-v2-20261109t1900 | 7cd714fb9fb2e1133bdf84d646c49a3e62d8c265 | Pool diagnosis, replay scripts and derived outputs |
| audit-20261110t0210 | 6203f13025cc4fc77fe3a7f2ee1c49d6d96f0a76 | Census, trades, lifecycle/clock, decisions/fills and gaps |
| k100-audit-20261110t2102 | c093afef0b9cc71aa166ac459f543f5f772cbb26 | K-book decisions/features, code snapshots, operations/repair/reconciliation files, census and history evidence |

These are seven discovered evidence branches. Metadata is not a verified manifest/checksum audit. The replay inputs explicitly mix an initially allowed source with an overlapping Saturday source: do not treat the combined cohort/results as approved development. Older study inputs also require an explicit expansion of the current worker allowlist before reading their contents. File identities, sizes and current branch resolution are in remote_inventory.json. Branches can move; use listed commits.

## Causal join map for the next detection experiment

1. Denominator: census for a fixed creation interval, not registry, checked coins or successful runners. Retention-based studies declare that restriction and enforce eligibility at the decision.
2. Features: mint join to early/lifecycle records, using actual knowledge time and source epoch. Missing values and delayed checks remain visible. Histories permit additional flow/cohort features only inside evidenced capture spans.
3. Labels: subsequent >=$100K, distinct from already above threshold and migration. Record decision-time status, crossing evidence, price/FX provenance, follow-up horizon and unknown reason. Do not label absent crossings as negatives solely from sparse checkpoints.
4. Horizons: 30 min/1 h/2 h only where coverage justifies a label; 24 h unsupported by these audited files. Last observation alone is not capture proof.
5. Comparison: earlier development discovery versus later development check, common denominator, all searches recorded. No untouched-test claim for previously read data. Predictor success remains separate from profitable entry/exit.

## Reproduction and next work

Python standard library. Place approved package at ../entry-package-7nov and C001 all-coins cache at ../c001-20261110T211226Z/data; run `python audit_local.py > audit.log 2>&1`. For metadata inventory, refresh branches.json using the public GitHub branches API, then run `python inventory_refs.py > metadata.log 2>&1`; this downloads Git trees/commit metadata only. The saved inventory is a point-in-time observation, not a historical reproduction of movable refs. Source contents are never fetched by the metadata script.

No hypothesis/threshold search, return scoring or trading happened. Monetary costs unmeasured; no Helius/GMGN credits used. No research blocker for C003. C006 is constrained: a full runner-versus-nonrunner test cannot use uncertified negatives. It may need expanded pre-test evidence or a narrower explicitly checkpoint-observed target, clearly distinguished from true crossings.

Next queue task: C004, existing decision/send/landing and quote-shadow calibration. Review requests ask the coordinator to clarify/release specific pre-test runner evidence without releasing protected outcomes. Do not infer any release from this report.
