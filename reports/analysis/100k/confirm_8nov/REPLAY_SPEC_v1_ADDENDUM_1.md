# Addendum 1 to REPLAY_SPEC_v1 (commit fc24e6b) — 8 Nov 2026 19:50 UK, before any replay return has been computed or seen

Codex's review (19:30). REPLAY_SPEC_v1.md stays unchanged; where they differ, this addendum overrides it.

## A1. Bands
- **Primary** (used for testing): the narrow 5-min cap bands < $5K, $5–10K, $10–15K, $15–20K, $20–30K, $30–50K and $50–100K, which is **7 bands**.
- **Descriptive only:** the broad bands of v1.

## A2. Exit design — explicitly a NEW design
The exits replace the earlier "$100K target / time-stop" comparison idea. Exact definitions:
- **Shared rules:** all clocks run from the entry landing. The maximum hold for every exit is 120 min. At 120 min, any remaining position is sold.
- **X15 / X30 / X60:** sell at 15 / 30 / 60 min after entry.
- **T25 / T40:** sell when a recorded trade price is 25% / 40% or more below the highest recorded trade price since entry.
- **TP2:** sell everything when a trade price is at or above 2× the entry fill price, or at or below 0.5× it.
- **H2T40:**
  - At entry + 60 s, if the latest reserve price is below the entry fill price, sell everything.
  - Otherwise, sell half at the first trade at or above 2× entry.
  - Trail the remaining half at 40% below the highest trade price since entry. Before the half-sale, the 40% trail applies to the whole position.
- **Coinciding triggers** (on the same trade or within the same 0.7 s landing window) are resolved conservatively:
  - the loss-side trigger (stop or trail) fires before take-profit
  - only the first trigger in trade order acts

## A3. Execution prices
A reserve state carried forward to a landing time prices the fill only if all three hold:
1. its age is no more than 30 s
2. capture of that mint and venue was continuous over the interval: no feed gap in the gap log overlaps it, and the interval lies inside the venue's captured span
3. no migration occurred between the state and landing

Otherwise the fill is **UNAVAILABLE** (buy) or **UNRESOLVED** (sell). States aged 5–30 s are tagged **STALE-PRICED** and reported separately. Quiet-pool exits remain **QUIET-PRICED**, reported separately.

## A4. Search count, primary size, criterion
- **Primary:** 7 bands × 7 exits = **49 cells at 0.2 SOL**.
- **Secondary:** 0.02 SOL, reported for all 49, descriptive, not tested. That makes 98 reported cells in total.
- **Latency:** no latency scenarios in the primary. A +2 s / +5 s buy-delay sensitivity is reported descriptively.
- **Confirmation (12–13 Nov launches):** only cells named in writing before 12 Nov 00:00 UK are tested. A cell is supported if its Bonferroni-adjusted (49) 95% lower bound of mean net SOL per entry at 0.2 SOL is above 0, with UNAVAILABLE fills excluded and UNRESOLVED positions counted at −100%.

## A5. "Did not reach $100K"
- **NOCROSS_OBS** for capital-saved figures requires adequate observation through 2 h from creation:
  - captured trades or pool coverage extend to at least creation + 7,200 s
  - no feed gap over 300 s inside that window
- Coins that fall short are **UNKNOWN**, reported separately, and never counted as failures or savings.

## A6. Data
The export must also carry the feed-gap / coverage log for the window, so that A3 and A5 can be applied.
