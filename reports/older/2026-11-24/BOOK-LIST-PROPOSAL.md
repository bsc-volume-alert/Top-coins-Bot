# Proposed book list — keep / retire / tag (Codex's brief, section 6)

**A proposal for the owner and Codex. Nothing is implemented.** No book has been switched off, no rule changed.
The blanket removal of 22 books I suggested earlier is withdrawn: it contradicted the owner's wish to keep the fast-moving
ideas.

Figures: snapshot P (bot's published list, 24 Nov 12:59:48 UTC, all shakedown trades since 20 Nov 14:55 UTC), first buys,
30% pure trail, closed, 0.2005 SOL per buy. Shakedown data with the known execution defects — indicative only.
Columns: buys | won | net SOL | net without the best coin | re-buys closed | re-buys' net.

## 1. Kept as research parents — rule unchanged, results negative or near zero, judged in the scored week

| Book | Figures | Why kept |
|---|---|---|
| FAST-1M | 34 \| 21% \| −0.87 \| −1.00 \| 5 \| −0.01 | owner's pick (fast movers) |
| FAST-3M | 45 \| 22% \| −0.85 \| −1.05 \| 9 \| −0.20 | owner's pick |
| FAST-5M | 47 \| 21% \| −1.02 \| −1.21 \| 11 \| −0.27 | owner's pick |
| VOL500K | 8 \| 0% \| −1.32 \| −1.32 \| 3 \| −0.25 | owner's pick (5-minute volume) |
| VOL500K-UP | 0 buys | owner's pick; has not fired once |
| VOL300K | 14 \| 7% \| −1.81 \| −1.83 \| 10 \| −0.92 | owner's pick |
| VOL300K-UP | 3 \| 33% \| −0.08 \| −0.10 \| 1 \| −0.05 | owner's pick |
| HH-BREAK | 174 \| 40% \| +0.39 \| +0.02 \| 109 \| −1.02 | the only book above zero |
| HH-BREAK-4H | 102 \| 31% \| −0.04 \| n/a \| 205 \| −0.88 | HH-BREAK's own buys with a 4-hour sale (no extra buys) |
| LOW4H | 38 \| 37% \| +0.03 \| −0.35 \| 10 \| −0.21 | near zero |
| SLOW-BUILD | 22 \| 45% \| −0.03 \| −0.16 \| 2 \| −0.11 | near zero; highest share of winners |

These are **research ideas with negative results so far**, not a profitable set. The four volume books have 25 buys between
them and two winners.

## 2. Reported as a tag of a parent — no separate buys

| Book | Becomes | Why |
|---|---|---|
| LOW4H-LIQ25K (16 \| 25% \| −0.30) | tag on LOW4H buys that also meet the liquidity test | it is LOW4H's own candidate plus one condition: the same buy |
| RUG950-BOUNCE (3 \| 33% \| −0.12) | tag on RUG450-BOUNCE buys whose peak was ≥ $950K | the books nest: a $950K peak also qualifies for the $450K book |

## 3. Optional, separately judged

| Book | Figures | Note |
|---|---|---|
| RUG450-BOUNCE | 13 \| 15% \| −0.65 \| −0.90 \| 3 \| −0.23 | a recovery experiment (fell 80%, then up 30% off the low). Closest existing thing to the owner's "fell, then runs again" idea. Keep only if the owner wants it; judged on its own, never pooled. |

## 4. Proposed for retirement from NEW entries

"Retired" means: no new buys. The definition stays in the specification, every past trade and loss stays in the ledger and
the reports, and positions already open are managed to their end exactly as now.

| Book | Figures | Reason |
|---|---|---|
| RUG450 | 32 \| 13% \| −2.17 \| −2.49 \| 3 \| −0.11 | buys a falling price: 18 of 32 never rose 10% (−2.21); all 9 buys above $450K lost |
| RUG950 | 19 \| 16% \| −1.22 \| −1.53 \| 0 \| 0 | same entry at a higher peak: 14 of 19 never rose 10% |
| HH30-10M | 216 \| 25% \| −4.11 \| −4.35 \| 161 \| −2.59 | largest loss of all books |
| HH30-5M | 213 \| 28% \| −3.37 \| −3.62 \| 169 \| −2.37 | second largest |
| HH15-5M | 240 \| 27% \| −3.10 \| −3.36 \| 253 \| −4.64 | third largest; worst re-buys |
| CONT | 176 \| 24% \| −2.08 \| −2.75 \| 71 \| −1.68 | large loss on a large sample |
| CONT-STALL | 177 \| 18% \| −2.79 \| n/a \| 80 \| −0.89 | CONT's buys with a timed sale: worse than CONT |
| AGE-DOUBLE | 40 \| 15% \| −1.38 \| −1.53 \| 26 \| −0.84 | 15% winners; also the only book needing GMGN's reference price |
| SECOND-WAVE | 19 \| 11% \| −0.60 \| −0.71 \| 4 \| +0.03 | 11% winners |

Retiring a book because it lost is a selection on returns. It is acceptable only as a decision taken **once, before T0**,
written down, and not revisited during the scored week; the retired books' shakedown results stay on record so the choice
can be judged later.

## 5. For the owner to decide (my proposal: retire)

These are also "fast-moving", but they are the looser or slower versions of the three fast books kept in section 1, and
they lose more:

| Book | Figures |
|---|---|
| FAST-10M | 43 \| 12% \| −1.35 \| −1.64 \| 11 \| −0.37 |
| FAST-30M | 47 \| 15% \| −1.38 \| −1.55 \| 17 \| −0.46 |
| FAST150-1M | 105 \| 25% \| −1.52 \| −1.86 \| 42 \| −0.62 |
| FAST150-3M | 125 \| 25% \| −2.00 \| −2.35 \| 55 \| −1.19 |
| FAST150-5M | 137 \| 24% \| −1.87 \| −2.24 \| 64 \| −1.46 |
| FAST150-10M | 121 \| 21% \| −2.28 \| −2.66 \| 67 \| −1.49 |

If the owner prefers to keep them as fast-moving research parents, they move to section 1 unchanged.

## 6. Count

29 books = 11 kept (section 1) + 2 tags + 1 optional + 9 retired + 6 for the owner to decide.

## 7. Common risk conditions — recorded on every buy, reported as subsets, not applied

One structure on every physical buy of every retained book:

| Condition (hypothesis) | Status values | Source |
|---|---|---|
| Top 10 holders < 25% | PASS / KNOWN FAIL / MISSING / TOO LATE | provider figure already recorded; optional chain snapshot (`LOGGING-DESIGN.md`) |
| Largest wallet ≤ 5% | PASS / KNOWN FAIL / MISSING / TOO LATE | chain snapshot only (top-account measure, labelled as such) |
| Total fees ≥ 2 SOL | UNRESOLVED until its meaning and unit are established | — |

Reporting for the scored week: each parent **unchanged**, and beside it the subset of its buys where every resolved
condition is PASS. The subset is a report column, not a book: it makes no buys of its own and cannot change a parent.
Evidence so far on the first condition is against it (`RECONCILIATION.md`, section 5): buys under 25% did no better than
the rest, and all 23 RUG450 buys passed it.

## 8. Not in this list

- **New-coin books (5 / 10 minutes old) and the "fell, went flat, breaks out" book.** Not proposed for the first scored week.
  They are new strategies needing new data (a source of brand-new coins and launch-curve prices; an all-time high), and the
  owner's ceiling is no paid GMGN and no extra Helius credits. Under that ceiling they cannot be built now: the free GMGN key
  is already saturated by back-fill for the 4-hour books, and following the launch curve would mean a second program stream.
  They can be pre-registered as a separate addition after the first frozen week produces reliable results.
- **A follow-through entry** (for example a further 10% rise within 60 s after a FAST signal). Mentioned by Codex as an option
  only. Not proposed and not added. If it were ever tested it would be a new variant that buys at the later price and starts
  its execution delay from the confirmation.
- **Re-buys.** They lose in every book except two tiny ones (−22.7 SOL in total against −37.9 for first buys, counting a
  shared buy in each book). Whether they stay on is the owner's decision; either way they are reported apart from first buys.
