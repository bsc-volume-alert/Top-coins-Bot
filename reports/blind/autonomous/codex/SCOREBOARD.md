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

| c015-lab-20261113T031524Z | C015 pre-obstruction marks + L007 creator cash-recovery event | 22 exit amounts and 5 peer-scenario calculations reproduce; marks above/below/equal L004: 18/2/2; +2.423287 SOL proxy difference, not imputed returns | L007: 195 resolved −4.953473 SOL; 96 exits / 5 fills unknown; mean/median −12.70%/−23.03%; no-best3 −5.813415; paired −0.308105, only two event exits | C016 |

All 22 baseline exits remain unknown; marked P&L +2.559468 SOL is NOT added to performance. L007 shares all 296 baseline entries, has no veto/parameter sweep and acts on only two exits (one changes proceeds). Failed resolved point-total, insufficient support for a general mechanism conclusion. R54 reclassifies historical L006 as feature-equality only, not an operative experiment; its replay values are preserved. F011’s reported positive cell-B point estimate remains positive with its winner counted, while the overall strategy and support remain negative/absent.

| c016-lab-20261113T091125Z | C016 dev-buy provenance + prechecked L008 lag veto | 51,221 shared watch values identical; write time unavailable; 6,572 current-watch zeros differ from positive census values. H1 precheck published before score: 51/296 removed | Retained 168 resolved / −4.504147 SOL, 76 exits / 1 fill unknown; mean/median −13.41%/−24.07%; no-best3 −5.419858. Removed side only 27 resolved; benefit inconclusive | F012 review; separate unrun H2 precheck if no newer task |

C016 is complete as a file-evidence audit, not a creation-time availability certification. No generic lookup timestamp or nominal checkpoint age is used as a write clock. One fixed candidate and one baseline, one count-only precheck and threshold; H2/H3 not run. Baseline 5,663 fields reproduce; shared 168 trades identical, candidate-only resolved zero. Different unknown sets prevent comparing raw totals as improvement. No field values, raw data, historical scores or frozen evaluator were repaired.

| c017-lab-20261113T152100Z | C017 fixed reconnect quarantine + conditional serial-buyer fallback; peer F013 reproduction | H2 removes10/296(3.38%); H3removes0/296; both NOT TESTABLE. Independent H2parser296flags equal; peer count/descriptive JSONs byte-identical (29/90fields) | NOT SCORED; financial outcome unknown/uncomputed, not zero or loss | Claude F013cross-review; coordinator selects genuinely new eligible mechanism/released period |

Two prechecks, zero scored variants, no retune. Raw16checksums pass; H3full scan4913mints/1,568,880duplicates. H2removed lagmedian0.77975s vs H1removed1.29050s with2overlap. C016 source_integrity.json hand-assembly provenance clarified in README; manifest READMEhash updated only. No protected outcomes, paid collection or trading. Idea Lab scored-test requirement blocked exactly by both R54support failures; three new proposals await review and fresh data.

| c018-lab-20261113T211100Z | C018 one >=5SOL tape-derived creator-buy veto on unchanged E |74/679removed,0featureunknown;Econtrol3,638rows/58,208fields exact;peerF014precheck178leaves exact |605attempts/590fills/367resolved−8.313168SOL;15fills/223exitsunknown;mean/median−11.33%/−24.03%;no-best3−10.694714;bothhalvesnegative |F015cross-review;coordinatorR81/R86closure decision |

Benefit inconclusive: kept-minus-removed mean+0.010010SOL iid95[−0.016033,+0.034153];deep-loss share kept11.44%vsremoved9.62%,opposite hypothesis. Allcreatorcellsnegative;removedhalves27/25resolutions. Candidate-only0,367pairedidentical. Normalizedfillcount excludesstale-fillevidence evenwhenexitunknown. Allwinnerscounted;no-best3not rejectionrule. Onecandidate+baseline;one5SOLthreshold;no new held proposal executed. Wrong-date S1invocation stopped/excluded;corrected exactwindow verified. No protected data,paid calls or trading.

| c019-register-20261114T031806Z | C019 held-proposal support counts only |Complete E679/L003296(union680). N1veto377/678known;N3signals2/531;N4signal1/357;N5signals11/653;N2/N6not definable |NOT SCORED; no outcome read or financial verdict |Claude counts-only review;reciprocal F016review when queued;release dependencies remain |

Code/counts published together.16raw hashes pass, all679Ecounts unchanged after correcting initial295-onlyL003overlap. N4is newFIFOageproxy with308oversellunknowns,not balances. Missing FXknowledge-clock/full reserve accounting is stated precisely; FXtables exist. R91blocks a new dummy-trade test. Three new proposals N7–N9 held,not executed. Rootmemory is evidence-linked external knowledge,not retraining.

| c020-review-20261114T091100Z | C020final reciprocal F016counts-only review |481JSONleaves and166975CSVbytes exact;independent18333fields/679rows,all6counts andcensusbins match;adderblock140vsreceipt147 |NOT SCORED;no financial result;N5conservativeunknownreadingretained |no task; waiting for a released window (R4 / R5 / R6) |

All16raw hashes and6peer hashes pass. Existinghistoricaloutputsuntouched. No financialvariant,newthresholdorprotecteddatarelease. Three new required-datahypothesesheld,not counted. R99noREADYtask stoppingstate recorded once;coordinatorreviewdoesnotautomaticallycreate a Claude task or another reciprocal loop.
