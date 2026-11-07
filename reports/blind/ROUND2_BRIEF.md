# Round 2 — explore ALL coins, critique each other, freeze, test (issued 7 Nov 2026, UK time = UTC)

You are one of several analysts: Claude, Codex, Gemini, and possibly the owner's own ideas. The goal is a concrete, profitable pump.fun strategy: **buy under these conditions, sell under these conditions, and show it makes money after realistic costs**. If the data shows none, say so. That is an acceptable answer.

Everything in reports/blind/BRIEF_7nov.md (rev 4) still applies: costs, fills, knowledge-time rules, the frozen evaluator (branch `blind-eval-1.1`), and no live trading or bot changes. What changes in Round 2 is the data and the process.

## The data: every coin, not just the ones earlier books bought
| What | Where |
|---|---|
| **All-coins trade histories:** every launch created 6 Nov 07:40 → 7 Nov 20:00 UTC that the tracker captured (curve trades of retained launches; pool trades). Plus the census of every launch in that window (tokens_window.csv.gz), per-coin coverage and the full feed-gap log | branch **`entry-all-…`** (link given with this brief; start with its MANIFEST.md) |
| Everything from Round 1 (entered-coin histories, decisions, positions, checkpoints, wallet/funding traces, bundles, snipers, farm wallets, registry) | branch `entry-package-7nov` (INDEX.md) |

Known data issues (dedup by full fingerprint, curve-ceiling decode errors, venue-label lag, receipt times, capture windows) are listed in BRIEF_7nov.md and the MANIFESTs. Read them first.

## Explore freely
Any entry timing, buying/selling pattern, buyer arrivals, absorption of selling, concentration, wallet groups, bundles, snipers, creator behaviour, migrations, fixed or trailing or partial exits, combinations. Two conditions:
- **Record everything you try.** The count matters, because more searching means more lucky patterns.
- **No look-ahead.** Use only information received by the decision time, and execute with the stated delays and costs.

## The process
| Phase | Until (UTC) | What happens |
|---|---|---|
| A. Independent exploration | **8 Nov 18:00** | Each analyst works alone and publishes a report: what was tried, the best candidate with full numbers (both halves of the data, costs at 0.2 and 0.02 SOL, frequency, worst losses, without the best coin), reproducible code, and **data requests** (see below). |
| B. Cross-critique | **9 Nov 18:00** | The owner gives each analyst the others' reports. Each one reproduces the others' key numbers from the raw data, says where they are wrong or unrealistic, and may revise its own candidate in response. Disagreements are settled against the raw records, not by majority. |
| C. Freeze | **before 10 Nov 00:00** | Each analyst freezes ONE rule (or "none supported") in the evaluator's module interface, published with a timestamp. |
| D. Test | launches created **10 Nov 00:00 → 12 Nov 00:00** | Scored by the frozen evaluator only, after 12 Nov 02:00. Round 1's test period (8–10 Nov) is not reused. |

## Data requests (how the search widens)
If an analyst believes missing information could matter (top-10 holders over time, sniper and bundle wallet groups, funding provenance, social timing, earlier entries, more days…), it writes a request with:
- the exact question the information would test
- what is needed (source, fields, timing)
- why existing data cannot answer it

Requests are collected into the next round. Each costs time and money (Helius/GMGN credits, storage), and the owner decides.

## What counts as success
Only a rule that is **supported on the untouched test period** (evaluator lower-bound test, with the number of rules accounted for) moves on, and then only to a paper book for at least another week. Agreement between analysts is useful but is not evidence. Later performance is.
