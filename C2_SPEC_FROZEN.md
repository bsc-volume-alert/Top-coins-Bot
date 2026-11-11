# C2 "$20–40K, calm net buying, half at 2×": frozen candidate and evaluation (11 Nov 2026 ~15:05 UK)

Proposed 14:48 UK after a 12,576-combination search over periods A and B. It was chosen with both periods in view, so it has **no out-of-sample result yet**.

## Re-checked under the corrected rules (`c2_check.py` → `out_c2.txt`)

| | A | B | Pooled |
|---|---|---|---|
| Eligible at $20–40K (B: only live-eligible decisions; 40 late or unusable excluded) | 90 | 139 | |
| Net buying > 20 SOL (not selected) | 15 | 14 | |
| No stored trades, so net buying unknown (not eligible) | 0 | 54 | |
| Selected | 75 | 71 | |
| Unpriced | 16 | 23 | |
| **Priced** | **59** | **48** | **107** |
| Modeled mean | +16.0% | +9.0% | +12.9% |
| Median | 0.0% | +0.2% | 0.0% |
| Win rate | 49% | 50% | 50% |
| Losses > 50% | 7% | 8% | 7% |
| Without the best coin | +12.3% | +6.5% | +10.8% |
| Without the top 3 | +8.5% | +1.6% | +8.6% |
| Flagged exits scored at 0 | +9.8% (without top 3: +1.9%) | +7.0% (without top 3: −0.6%) | +8.5% (without top 3: +4.1%) |
| 95% CI (4-hour blocks) | −6.3 … +32.4 | +2.5 … +23.1 | +1.7 … +23.6 |

- **The original B figure was too high.** It was +12.3% before live eligibility and the second fee were applied; it is now +9.0%.
- **Whole-position 25% trail on the same entries:** A +14.3%, B +4.1%. Selling half at 2× is where most of the extra return comes from.
- **The simulator checks out against real fills.** On 27 coins that 100K2 actually bought and that meet C2's net-buying condition, the real fills averaged +1.0% and the simulated 25% trail +0.7%, with a median gap of 0.1 points. The simulated half-at-2× exit on the same coins gave +9.2%.

## Frozen rule C2-1
Take a coin when all of these hold:
- it has an on-time, usable 5-minute decision (status `entered` or `out of band`);
- the reading is $20,000 ≤ mc5 < $40,000, on any venue;
- at least one swap was received by the decision;
- buys minus sells (SOL) over the swaps received in the last 120 s before the decision is ≤ 20.

Then:
- **Buy** 0.2 SOL, landing 1 s after the decision, using curve or pool maths as in the replay.
- **Exit:** sell half when the post-swap spot price reaches 2× the effective fill price. Run a 25% trail below the running high on the whole position, then on the remaining half. Each sell lands 0.7 s after its trigger; 2-hour maximum.
- **Costs:** curve 1.25%, pool 0.55%, and 0.0015 SOL per sale.

## Frozen evaluation (replay only, no book)
- **Data:** the same fresh data and procedure as C1 (`C1_SPEC_FROZEN.md`): launches from 13 Nov 00:00 UTC until 150 C2 positions are priced or 7 days pass. Run `c2_check.py` at this commit with only the input paths changed.
- **Outcomes:** the same four, with the same thresholds: INSUFFICIENT EVIDENCE / PROFITABLE ON THIS TEST / ADVANCE AS RESEARCH ONLY / FAIL.
- **Two candidates on one window.** C1 and C2 are judged separately. Because there are two, a pass by either is reported with that fact stated. Neither may be changed after 13 Nov data exist.
