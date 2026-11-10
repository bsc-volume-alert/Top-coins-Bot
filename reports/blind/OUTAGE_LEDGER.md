# Common outage ledger for blind-test scoring (coordinator, 10 Nov 2026 21:05 UTC)

Purpose: eval-1.1 removes from the common denominator N every launch whose [created, created + 2 h] intersects a tracker outage listed in outages.txt. Round 2 phase B showed the two analysts used different lists (five vs six intervals), which alone explains N = 3,693 vs 3,638 on the development window. Every score is therefore reported with BOTH ledgers below; the six-interval ledger is the primary one.

## Development window (6 Nov 07:40 → 7 Nov 20:00 UTC) — six intervals (UTC = UK)
| # | Start | End | Source | Status |
|---|---|---|---|---|
| 1 | 6 Nov 20:40 | 20:42 | snapshot3/MANIFEST.md line 88 (tracker feed outage) | documented |
| 2 | 6 Nov 20:57 | 21:06 | same | documented |
| 3 | 6 Nov 21:40 | 21:45 | snapshot3/MANIFEST.md line 92: box powered off during the 1→2 vCPU resize, "~21:40–21:45" | documented; bounds approximate ("~") |
| 4 | 6 Nov 23:33 | 23:35 | line 88 (heap crash) | documented |
| 5 | 7 Nov 00:06 | 00:08 | line 88 | documented |
| 6 | 7 Nov 00:26:30 | 00:27:30 | line 88 | documented |

Five-interval ledger = the above without #3 (what the Claude analyst used). Verified by the coordinator against branch entry-package-7nov, file snapshot3/MANIFEST.md, on 8 Nov 17:40 and 10 Nov 21:00.

## Test windows
- Round 1 (launches created 8 Nov 00:00 → 10 Nov 00:00): ledger to be built from the control room's pm2/deploy logs and feed_gaps at export time, listed here before MIG300 is scored. Known from the tracker branch commit log: launcher data pushes missing 9 Nov ~19:55–20:15 and 9 Nov 23:51 → 10 Nov 00:13 (launcher, not necessarily the tracker feed); tracker 0.19.10/0.19.11/0.19.12 deploys 9 Nov 22:46, 22:56, 10 Nov 00:24; tracker DB move/repair 10 Nov 04:11 → 08:49 (after the window, but inside the 2-h follow-up of the last launches until 02:00 only — check). To be confirmed from logs, not inferred from this list.
- Round 2 (10 Nov 00:00 → 12 Nov 00:00): no active rule was frozen — nothing to score.

## Rule
A launch is excluded from N only on a documented interval. Inferred gaps (a bare reconnect in feed_gaps with no log evidence) are reported as a sensitivity, never silently added.
