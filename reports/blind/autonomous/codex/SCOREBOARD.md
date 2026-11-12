# Research scoreboard
| Run | Question | Executed result | Profitability | Next |
|---|---|---|---|---|
| bootstrap-20261110 | Evaluator integrity | Both supplied suites pass; three additional synthetic integrity cases reproduced; see runs/bootstrap-20261110 | Not evaluated; no claim | C001 raw-development reproduction; remaining C002 cases |

This branch is research output only. Scheduler creation is confirmed; first unattended execution is not yet verified. Live off.

| c001-20261110T211226Z | Reproduce published ID34 on raw development | 3,638/3,638 categories and returns match at both sizes/fees; 16 checksums pass | Late scored net -1.119884 SOL (0.2), -0.166343 SOL (0.02); one unknown exit; candidate remains rejected | C002 |

C001 mean/median, severe losses, unknown lower bounds, per-launch SOL and no-best-mint appear in its reproduction.json. No bootstrap/exposure recomputation. Frozen assumptions retained. No hidden outcomes or live trades.

| c002-20261111T031305Z | Named jackpot and never-enter buffer defects | Four mints × two horizons match at both sizes; 16/16 checksums pass. 12,001-row never-enter case is unknown before decide() | No valid profit claim; artificial lower bounds are not losses | C003 |

C002 corrects attribution: 5kdsd8zW scores +178.773683 at 30s and unknown at 2h; +3494.461446 at 2h belongs to LLzYn4ZZ. Pool-decoder root cause remains unverified. No repair to frozen evaluator or retrospective exclusions applied.

| c003-20261111T090819Z | Runner evidence and causal coverage | 18/18 inspected raw-file checksums pass; seven external evidence branches resolved by metadata only; lifecycle timing/coverage measured | No strategy/return search; missing crossings are not negative labels | C004 |

C003: snapshot3 census 85,016 versus 14,455 lifecycle mints reflects different export windows; 59,116 lifecycle rows lack obs_ts. Crossing table: 200 records, 45 suspicious-jump flags, 87 FX ages >60s. No 24h lifecycle checkpoints in the audited exports. See coverage.json and README; protected branches remain unopened.

| c004-20261111T151021Z | Existing execution/quote latency calibration | 12/12 input checksums pass; 57 unique live records, 40 confirmed. Success-only buy workflow median 867ms, P95 1294.3ms; paper-to-fill lag median 2s | No profit search; reliable current retention-to-fill latency not established | C005 |

C004 keeps simulated reserve-read timing separate from live send-to-confirmation timing. Snapshot live records are duplicates, not 114 independent observations. No new live trades or paid API calls. See source_evidence.json, timing ledger and matched-ID audit.

| c005-lab-20261111T175731Z | C005 wallet audit + owner Idea Lab | 24 wallet-table and16 trade checksums pass; L001257 attempts/255 filled/224 resolved/31 uncertain exits/2 unavailable fills | -9.229367SOL observed; mean/median -20.60%/-26.44%; no-best3 -10.162454SOL; full total unknown | C006 + next preregistered idea |

Owner-requested scenario is separate from frozen eval-1.1:125bps curve/55bps pool,0.2SOL,1s buy/0.7s sell,30% proceeds trail,30s state freshness. One candidate plus one control, no sweep or retuning. DIALOGUE.md and EXPERIMENTS.md contain plain-English results. research-claude returned404; no contact or reproduction claim.

| c009-20261111T181843Z | Priority C009 autopsy + L002; independent C011 | L002820/572/381 attempted/filled/resolved; no matched negative-label pairs; posts/longer histories inventoried | -15.293066SOL observed; mean/median -20.07%/-24.78%;248 missing fills/191 uncertain sells; no-best3 -16.208778SOL | C009 label review; C010 when F006 exists |

C009 is partial/blocked for matched inference, not a completed predictive comparison. C011 is complete. KNOWLEDGE.md and the scheduled memory requirement were added; three new hypotheses are in DIALOGUE, one candidate/control tested. No protected data or new paid calls.

|c010-lab-20261111T211258Z|C010 reproduce Claude F006 + L003|10,914 rows/523,872 fields and CSV bytes match; four matched AUCs reproduce; gap counterexamples executed|L003 -4.645368SOL on195 resolved;96 uncertain exits/5 missing fills; mean/median -11.91%/-23.03%|C012|

Calculations completed11Nov21:25UTC; publication recovered12Nov after an interrupted bulk-tree call. No retuning or new test exposure. Claude source pinned7a9cd6a98680b660d15b952079b7f367d3ad180f. AUC is not win rate; KNOWLEDGE K010–K014 distinguishes findings and limitations.

|c012-lab-20261112T091226Z|C012 label tolerance/exposure + L004 sell-cluster exit|Strict C009 identical; tol30 net59/24/10 positives,0 negatives/pairs; gap exposure1803/3052 at5min|L004 -2.043602SOL on217 resolved;74 uncertain sells/5 fills unavailable; mean/median -4.71%/-12.62%, no-best3 -2.910945; paired195 improve2.465585 but still -2.179783SOL|C013 then C014|

C012 bounded audit is completed; matched depth inference remains blocked, not supplied with fabricated negatives. L004 is one new exit plus locked baseline2specs, negative in both halves. Paired counts/unknowns/intervals and full metrics are in the run folder. No new dataset release. Updated K015–K017 and three registered hypotheses. C001 R7 note added: ID34 scored fills/exits are all curve, so its pool-fee scenarios are identical and not a genuine fee sensitivity. Historical scheduler/Claude404 notes above are timestamped; latest peer read is c1cf6d39b942de76771d79ba403856a1526db0df with genuine dialogue and experiments.

|c013-lab-20261112T151333Z|C013 common-E control reconciliation + fixedL005partial-profit/reset exit|Claude original script/results and CSV bytes reproduce;679E shared; first-receipt-high diagnostic yields381exact paired proceeds|L005 -2.208979SOL/195resolved;96uncertain exits/5missing fills;mean/median -5.66%/-22.98%;no-best3 -4.149901;paired+2.436389but stillnegative|C014 then C015|

C013 observed original controls on identicalE:388/-11.877801Codex versus419/-10.011572Claude; original paired382 -11.448330vs-11.418912. Different unknown sets forbid total-profit ranking. High-initialisation diagnostic is attribution, not a new rule. One newL005spec plus one locked baseline;3historical Claude specs rerun only for reproduction. Both halves retained:early-2.656776,late+0.447797(best-winner dependence shown). Largest-trade raw quote/decimal evidence audited; reserve-product changes unresolved. KnowledgeK018–K020 distinguishes executed results from peer-reported F010.

|c014-lab-20261112T211254Z|C01453disputed-runner pre-gap audit + L006directional quote-optimism veto|53/53raw maxima reproduce; all53observe2xquote,11beforeactualgap/38after/4no-gap-tailunknown;0sustain before original evidence failure.53missing-export categories corrected|L006veto binds0/296;195resolved=-4.645368SOL,96exits/5fillsunknown;mean/median-11.91%/-23.03%;no-best3-5.561080;paired delta0|C015 then C016|

L006is inconclusive as a mechanism because no controls are removed, not a reason to tune5%after outcomes. All5663baseline fields and296causal quote comparisons are preserved. C014is an opportunity/coverage audit, not an executable2x or>=100Kscore. All labels/evaluators stay unchanged; quotes after missing intervals are not guaranteed exits. NewK021–K023 link verified measurements, insufficient feature support and peer-reported F002findings separately.
