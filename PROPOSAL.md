# Next-strategy research — 11 Nov 2026 (design and analysis only; no book built; live off)

Brief: owner forwarded Codex 13:19 UK. The three 100K books are classified **not supported for live trading** and stay frozen as paper benchmarks.

## Data and method
- **Period A (development):** launches 6 Nov 07:40 → 8 Nov 15:00 UTC. 2,019 coins with an on-time 5-minute reading, all market-cap bands. Package `replay-9nov-inputs-20261109t1410` @ f9a0086c.
- **Period B (second period):** launches 9 Nov 21:48 → 10 Nov 20:57 UTC. Package `k100-audit-20261110t2102` @ c093afef.
  - Trades exist only for coins whose 5-minute reading was $15–100K (263 coins), so B tests only rules inside that band.
- **Execution model:** replay v2.1 unchanged; it reproduces the published v2.1 shortlist exactly.
  - Curve: virtual reserves.
  - Pool: vault reserves plus an offset calibrated from earlier swaps only.
  - Fees: curve 1.25%, pool 0.55%, plus 0.0015 SOL fixed.
  - Buy lands 1 s after the decision; triggers fire on the post-swap price.
  - A leg inside a feed gap is unresolved and adds no proceeds.
  - 2-hour maximum hold; 0.2 SOL stake.
- **Trade data:** deduplicated (466,625 duplicates in A, 605,947 in B).
- **Decision-time features:** only swaps received by the decision (receipt time).
- **Data held back:** 12 Nov (the reserved confirmation window) and everything after 10 Nov 21:02 UTC were not examined.
- **Every configuration tried** (8 entry groups and 5 continuation/recovery entries, each with 7 exits, in both periods: 182 cells) is in `out_research.txt`. Robustness checks are in `out_robust.txt`.

## Answers
**1. A group with positive after-cost expectancy?** Only one group is positive in both periods, and only weakly: **coins still on the bonding curve with a 5-minute reading of $15–100K**, using a 25% trail.

| | A | B | A + B pooled |
|---|---|---|---|
| Mean return | +13.8% (69 fills) | +22.8% (68 fills) | +18.3% (137 fills) |
| 95% CI (4-hour blocks) | | | +1.3% to +40.1% |
| Median return | | | −4.9% |
| Win rate | | | 42% |
| Severe losses | | | 9% |

It does not pass a defensible bar:
- **It depends on a few coins.** The top 3 coins give 71% of the profit. The pooled mean is +10.3% without the best coin and +5.5% without the top 3.
- **Sub-bands are unstable.** The $30K+ part is +53% in A but −6% in B. The $20–30K part in B is +54%, driven by one coin at +1,102%.
- **43% of eligible coins could not be priced.** 84 had no trade within 30 s (a quiet curve) and 18 had a completed curve. Their real outcome is unknown.
- **Multiple testing.** It is the best of 56 cells per period. A multiple-testing correction would not leave it significantly positive.
- **Execution sensitivity.** Entry 3 s / 10 s later: A +15.0% / +12.7%, B +19.4% / +11.3%. With an extra 2% cost and a 3-second delay: A +13.0%, B +17.4%.

**2. Gradual versus instant launches.** They behave differently.

| Launch type at 5 min ($15–100K) | Result in A and B |
|---|---|
| Instant graduation (first pool trade ≤ 5 s after creation) | Median −57% / −43%; severe losses 55% / 45%. B's mean of +0.3% is outlier-driven. |
| Graduated normally before 5 min | Negative in both: −13% and −19% with a 25% trail in B. |
| Still on the curve | The only positive group. |

"Broadening demand" (buy rate rising) on the curve is inconsistent: A −11%, B +73% on 21 fills.

**3. Continuation or recovery entries.** None are supported.

| Entry | Period A | Period B |
|---|---|---|
| First crossing of $100K (5–60 min) | −4% to +1% | −12% to −29% |
| First crossing of $50K (5–30 min) | −2% to +2% | −12% to +2% |
| First crossing of $200K | −5% to +12% (14 fills) | −23% to −40% |
| Bounce of 1.5× at 15 or 30 min | −0.4% to −13% | −3% to −51% |

All figures are for the trail exits; the time stops are worse.

Buying because a level is crossed does not beat buying at 5 minutes.

**4. Alternative exits on identical entries.**
- **Time stops (15 or 60 minutes) are poor everywhere.** The 60-minute stop is −28% to −75%.
- **A 40% trail is worse than 25%.** It gives back more on the many coins that fade.
- **A 15% trail lowers the severe-loss rate** but cuts off the runners. Its mean is close to zero.
- **25% trail and "sell half at 2×, then 25% trail"** are the best, and similar to each other.
- On the 100K books' own coins (B, $30–50K), every exit is negative (−10% to −69%). No exit rescues that entry.

## Primary candidate (for decision — NOT built)
**C1 "curve stage at 5 minutes"**

**Rules:**
- **Population:** coins the tracker retains, with an on-time 5-minute clock reading of $15,000–$100,000.
- **Venue:** the coin is still on the bonding curve (no pool trade received by the decision).
- **Entry:** 0.2 SOL with curve maths, landing 1 s after the decision.
- **Exit:** 25% trail on the position's own proceeds, on any venue after migration; sell lands 0.7 s after the trigger; 2-hour maximum.
- **Costs:** as in the replay.

**Rationale:** the only group positive in both periods. It also matches the measured damage pattern, since it excludes instant-graduation and already-distributing pool coins.

**Verdict: this candidate does NOT clearly qualify.**
- Its positive result rests on a handful of runners.
- Nearly half the eligible coins cannot be priced from the stored data.
- It is the survivor of 182 configurations.
- It also overlaps the curve-stage thesis of the R3C paper book that the other page started at 13:18 UK today, which is built on the same 6–8 Nov data.

**Recommendation: do not build a C1 book now.**
1. Let R3C run as the forward test of the curve-stage idea.
2. Evaluate C1 on fresh data **by replay, with no book**. Rules are fixed as written above. The evaluation period is launches from **13 Nov 00:00 UTC** until 150 C1-eligible coins are filled or 7 days pass, whichever comes first. It is scored on net SOL with unavailable and unresolved coins shown, plus results without the top 1 and top 3 coins.
3. Acceptance is fixed before the outcome is seen. Every one of these must hold:
   - pooled mean ≥ +5%;
   - mean without the top 3 coins ≥ 0;
   - lower bound of the 95% block CI > −5%;
   - unavailable share ≤ 50%.
4. Otherwise, reject the curve-stage thesis for this execution model.

## Not done / limits
- Period B has no trades for coins outside $15–100K at 5 minutes, so continuation entries in B are a biased subset.
- Wallet-level features (unique buyers, holder concentration at the decision) are not in the trade tuples or packages. "Broadening" uses buy counts.
- 12 Nov and later were not examined.
