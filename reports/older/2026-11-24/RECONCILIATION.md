# Reconciliation of the figures given to the owner on 24 Nov (Codex's brief, section 3)

Two snapshots were involved. They are kept apart below; nothing is combined silently.

| | Snapshot R ("raw") | Snapshot P ("published") |
|---|---|---|
| Source | branch `older-review-data` — full database copy | branch `older-data`, file `entries.json` — compact list written by the bot |
| Cut-off | 2026-11-23 20:19:05.585 UTC | 2026-11-24 12:59:48.624 UTC |
| Bot code | 834ca71 (before the restart) | 1d079b42d956044c2e76059892a069045373cbc2 |
| Entries | 2,300 | 3,020 |
| What it holds | every field of every entry, every stop row | one line per entry: books, re-buy list, returns per stop, 24-hour high, a few features |
| Used by | Codex; me in `REPORT.md` | me for the figures of 24 Nov 13:20–13:35 UK |

Tool: `tools/recon.mjs` (reads both). Output: `reconciliation/reconciliation.json`. **Entry IDs and mints of every buy counted**
are in `reconciliation/*.csv`.

## 1. Definitions used (identical for both snapshots)

- **Included families** — "fast/volume cohort": FAST-1M, FAST-3M, FAST-5M, VOL300K, VOL300K-UP, VOL500K, VOL500K-UP. RUG450 separately.
- **Physical-entry de-duplication** — one row per entry id. A buy shared by several of these books is counted once.
- **First buy / re-buy** — an entry is in the cohort if it is a *first* buy for at least one included family (that family is in
  `families` and not in `again`). An entry that is a re-buy for every included family it carries is excluded.
- **Row** — the 30% pure-trail row without a clock tag (`stop 0.30`, `policy trail`, `stall false`).
- **Closed / open / estimated** — closed = that row's status is `closed` and its exit is not an estimate. Open or pending-sale
  rows are counted but not summed. No estimated exit occurs in either cohort (checked in R; in P the totals match the bot's own
  report rows, which exclude estimates).
- **Net** — `exit.sol − 0.2005` in R; `ret × 0.2005` in P (the published list carries the return rounded to 4 decimals, hence
  differences in the 5th decimal).
- **Peak fields** — two different things, which I did not distinguish on 24 Nov:
  - `runner.maxX` (P: `max`) = highest liquidation value ÷ cost in the **24 hours after the fill**, whether or not the row was
    still held;
  - `versions[].maxX` of the 30% row = highest while **that row was held**. Only in R: the published list does not carry it.

## 2. The two cohorts agree where they overlap

| Fast/volume cohort | Physical first buys | Closed | Coins | Won | Net SOL |
|---|---|---|---|---|---|
| R (Codex's figure) | 82 | 82 | 55 | 20 | −2.13738 |
| P, decided ≤ R's cut-off | 82 | 82 | 55 | 20 | −2.13741 |
| P, decided after R's cut-off | 22 | 20 | 16 | 2 | −1.65807 |
| **P, all (my figure of 13:35 UK)** | 104 | **102** | 71 | 22 | **−3.79549** |

All 82 ids closed in R are closed in P and no other id decided before the cut-off appears. My 102 = Codex's 82 + 20 newer.

| RUG450 | Physical first buys | Closed | Won | Net SOL |
|---|---|---|---|---|
| R (Codex's figure) | 25 | 23 | 3 | −1.79789 |
| P, decided ≤ R's cut-off | 25 | 24 | 3 | −1.83482 |
| P, decided after R's cut-off | 13 | 8 | 1 | −0.34017 |
| **P, all (my figure)** | 38 | **32** | 4 | −2.17498 |

One RUG450 buy that was open at R's cut-off closed afterwards (24 vs 23).

## 3. Two corrections to what I told the owner

**(a) "Never rose 10%".** In P: 40 of 102 buys never rose 10% in the 24 hours after the fill, net −3.59775 SOL. Removing them
leaves **62 buys, net −0.19774 SOL**. That is still a loss. I wrote that those 40 were "almost the whole loss", which is
true, but a filter that removed all 40 and nothing else would bring the cohort to about −0.20 SOL, **not to a profit**.
"Never rose 10%" is also only known afterwards; it is a description, not a rule.

**(b) "Reached 2×" meant within 24 hours of the fill, not while held.** Split properly (R, where the held peak exists):

| Fast/volume cohort, R (82 closed) | Buys | Profitable at the 30% stop | Net SOL |
|---|---|---|---|
| Reached 2× within 24 h of the fill | 23 | 10 | — |
| Reached 2× **while the 30% row was held** | 4 | 4 | +0.61456 |

Same as Codex's figures (23 / 10 and 4 / 4). So 19 of the 23 "reached 2×" did so only **after** the 30% stop had sold them.
For RUG450 in R: 3 reached 2× within 24 h (2 profitable); 1 while held (profitable). The RUG450 coin I described as "peaked
4.19× but the stop had already sold it" is exactly this case.

For the 20 newer fast/volume buys (after R's cut-off) only the 24-hour figure exists: 1 reached 2×, and it was profitable.
The held peak for those needs a fresh full export; it is **not** estimated here.

**Consequence:** nothing in these figures supports a profit-taking change. The earlier "24 reached 2× but only 11 won"
compared a post-exit high with a held position; it says the stop sold before the run, not that profit was left on a held row.

## 4. Missing data in the two exploratory splits (P, 102 closed)

| Split | Value known | Missing |
|---|---|---|
| Top buyer's share of the last 5 minutes' buying (`top5`) | 80 | 22 |
| Holder count (`holders`) | 95 | 7 |

Neither is the owner's proposed condition. They were given as "the nearest recorded figures" and remain exploratory.

## 5. A statement I have to withdraw: "the top-10 condition cannot be tested on past trades"

It can, partly. Since 20 Nov the bot has saved, at every entry that is not a pure re-buy, the token provider's (Jupiter)
`audit.topHoldersPercentage` in `entry.snap.top_holders_pct`. I had overlooked it because the published compact list carries
only the holder *count*. It is in snapshot R for **1,133 of 1,171** closed first buys.

What it is and is not:
- the provider's own figure; its exact definition (which accounts are excluded) is **not verified** by us;
- taken in the background: the answer arrived a median **20.3 s after the decision** (the request waits in the lowest-priority
  lane); only 314 of 1,133 arrived before the simulated fill. It is therefore mostly a just-after-entry reading, shown both ways;
- nothing was recorded for "largest wallet" or for "fees paid".

Results (R; closed first buys; 30% trail; `tools/top10-holders.mjs`, output in `reconciliation/top10-holders-raw-cohort.txt`):

| Cohort | Top-10 < 25% | Top-10 25–40% | Top-10 ≥ 40% | Missing |
|---|---|---|---|---|
| **All books** (1,171 buys, −15.39 SOL) | 528 buys, 28% won, −8.97 | 514, 27%, −6.55 | 91, 19%, −0.86 | 38, +0.99 |
| Fast/volume (82, −2.14) | 38, 16% won, −1.38 | 36, 28%, −0.93 | 1, −0.05 | 7, +0.22 |
| HH-BREAK (162, +0.37) | 67, 40% won, −0.70 | 75, 44%, +1.01 | 20, 20%, +0.05 | 0 |
| HH15/HH30 (468, −7.11) | 223, 28% won, −3.47 | 194, 26%, −3.16 | 50, 20%, −0.52 | 1 |
| RUG450 (23, −1.80) | **23**, 13% won, −1.80 | 0 | 0 | 0 |

Restricted to readings that arrived before the fill: all books, top-10 < 25%: 158 buys, 28% won, −3.23 SOL; fast/volume: 15
buys, 1 won, −0.85.

Reading, with its limits: on this provider's measure, buys with top-10 holders under 25% did **not** do better than the
rest — in the fast/volume cohort and in HH-BREAK they did worse — and every RUG450 buy already passed the condition, so it
would have removed none of them. The share of buys that never rose 10% is 36% under 25% and 33% between 25% and 40%.
This is one provider's figure over four days of defective shakedown data; it is evidence against expecting much from this
condition, not proof.

The record-only patch (see `LOGGING-DESIGN.md`) publishes this existing figure and its arrival time in the compact list at
no credit cost, and adds an optional chain-based reading whose definition we control.
