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
