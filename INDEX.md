# Entry Features & Winners — combined data package, 7 Nov 2026 (UK = UTC)

One branch, `entry-package-7nov`, holding all relevant raw data for independent analysis. It is built on top of the supplement commit ba9d688d, so the supplement files at the top level are byte-identical to branch `entry-supp-20261107t1433`. Nothing here is a conclusion; every folder has its own manifest and sha256 sums.

## What is where
| Folder | What | Cutoff | Built by | Checksums |
|---|---|---|---|---|
| `/` (top level) | **Supplement.** Uncapped trade-by-trade histories (curve and pool, including after exits) for every mint any simulated book entered since 5 Nov 12:20 UTC: 1,247 mints, 4,241,610 rows in trades_part_001–006, plus coverage_per_mint and feed_gaps_all (complete table, from 5 Nov 08:39 UTC). | DB read 14:33:31 | supp-export 1.1 (heading in its MANIFEST says 1.0) | SHA256SUMS.txt — verified |
| `snapshot3/` | **Frozen snapshot 3**, copied unchanged from branch `entry-snap-7nov-1154` (e05e07da): launches, checks, decisions, positions, fills, paper trades, checkpoints, wallet/funding traces, registry, quotes, live trades, aged-out rows, BOOK_DEFINITIONS, RECONCILIATION | 11:54:21 | launcher 0.9.50 export | snapshot3/SHA256SUMS.txt — verified unchanged |
| `current/` | **Latest regular export**: all launcher-data files, same format as snapshot 3, gzipped | 14:53:26 (launcher-data f3399f9c) | launcher 0.9.53 export | current/SHA256SUMS.txt |

**Earlier frozen data (not copied here; immutable commits):**
- Snapshot 2: commit b9213f9feca2cacd14edfeb33fac2745ba93ff98, folder `scope/files/snap_6nov_1830/` (cutoff 6 Nov 18:23:11). It has trade streams for entries in the 8 h before that.
- 7 Nov 08:53 snapshot: commit da62f6598e5a2c08e2468c776c6e65f1b6fada4f, folder `scope/files/snap_7nov_0900/`.
- $100K study inputs: branch `study100k-v1-inputs` @ 3bd9c3b90d6882b80f3dfd6189831f0f43c30998. Exports c36821d3, b971fcdf, 7add56e0, a3d7db4f: token_life for every launch, census, fd_watch, coverage.

## Corrections to statements inside the frozen manifests (the frozen files are not edited)
1. **Trailing exit.** snapshot3/MANIFEST.md says "25% after migration". In the code the trail is chosen BY THE ENTRY VENUE (40% curve entry, 25% pool entry) and kept after migration.
2. **Retention wording.** The supplement MANIFEST says retention is the "15-SOL screen". The tracker retains a launch when its cumulative **GROSS** buy volume reaches 15 SOL (VOL_TRACK_SOL), or when it is bundle tier-1 at finalisation. The launcher's `screened` flag (fd_watch) uses NET buying, which is a different measure.
3. **rule_ver** on positions and the ledger is the version at export, not at decision. Map decisions to code by time.
4. **i02_\*** values on positions decided before 6 Nov 20:00 UTC are reconstructions.
5. **Truncation.** snapshot3/trades_books.csv stops at 6,000 trades per coin (28 of 106 coins truncated). current/trades_books.csv hit its 90 MB cap (oldest coins dropped). **Use the supplement's trades_part files for trade histories.**

## Known limits of this package
- **Selected population.** The supplement covers mints some book entered. It does NOT cover every retained launch, so findings may not generalise to all launches. Every launch has lifecycle checkpoints only (token_life; 12 h in current/, 48 h in snapshot 2, longer windows in the $100K inputs).
- **Venue empty on 95,990 supplement rows:** rows written before tracker 0.19.2 (6 Nov), which are curve trades by construction. Pool evidence fields exist only on pool rows from 7 Nov 09:57:18 UTC (tracker 0.19.9), for 107 mints. Base decimals are assumed to be 6 by the decoder.
- **Reconciliation.** 22 of 1,247 mints gained trades while being read (rows_exported ≠ rows_in_db_at_read); 64 mints have no stored trades. Both are listed in coverage_per_mint.
- **Coverage.** A quiet stretch can be inactivity OR a capture gap. Use feed_gaps_all and the outage list in snapshot3/MANIFEST.md. Absence of a logged gap does not prove capture.
- **Current values, not past knowledge.** Retained records show current values; rebuilt tables (farm_*, snipers, operators, fd_sniper_stats) and positions that were open at a past time may not reflect what the system knew then. Intermediate export versions between the frozen snapshots were removed from the server's publishing folder on 7 Nov 14:31 UTC (disk emergency; record in reports/books/LAUNCHER.md). The underlying database records were not touched.
- **current/coverage_mints.csv and coverage_crossings.csv** are from 11:23 UTC. That export is paused since launcher 0.9.51 (it filled the disk with temporary sort files).
- **Not included:** trades of launches never retained; per-token decimals; anything outside the capture windows.

## Load example
```
git clone --branch entry-package-7nov --single-branch https://github.com/bsc-volume-alert/Top-coins-Bot.git pkg && cd pkg
sha256sum -c SHA256SUMS.txt && (cd snapshot3 && sha256sum -c SHA256SUMS.txt) && (cd current && sha256sum -c SHA256SUMS.txt)
zcat trades_part_00*.csv.gz | head   # row_id,mint,sig,slot,ts,wallet,is_buy,sol,tokens,price_sol,recv_ms,vsol,vtok,venue,pool,ev_idx,...
```
