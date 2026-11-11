# Next strategy — research notes (started 11 Nov 2026)

## 11 Nov 2026 — round 1 (owner forwarded Codex 13:19 UK; design/analysis only, no book built, live off)
- Branch next-strategy-20261111 @ b526ac15 (PROPOSAL.md, scripts, every configuration). Periods: A = 6–8 Nov (dev), B = 9–10 Nov ($15–100K at 5 min only). Execution = replay v2.1 (reproduced exactly).
- Q1: only "still on the bonding curve with a 5-min reading $15–100K, 25% trail" is positive in both periods (A +13.8% n=69, B +22.8% n=68, pooled +18.3% CI [+1.3, +40.1]) — but top 3 coins = 71% of the profit (pooled −top3 +5.5%), sub-bands flip between periods, 43% of eligible coins unpriceable, best of 182 cells.
- Q2: instant graduation median −57% / −43%; normal graduation before 5 min negative; still-on-curve best. Q3: $50K/$100K/$200K crossings and 1.5× bounces — none supported (B −3% to −51%). Q4: time stops worst; T40 < T25; T15 cuts runners; T25 ≈ TP2×T25 best; no exit rescues the 100K-book entries.
- Candidate C1 (rules in PROPOSAL.md) does NOT clearly qualify and overlaps R3C (other page, same curve-stage thesis) → not built. Pre-registered replay evaluation from 13 Nov 00:00 UTC (150 fills or 7 days): accept only if pooled mean ≥ +5%, mean without top 3 ≥ 0, 95% block CI lower bound > −5%, unavailable ≤ 50%; else reject the curve-stage thesis for this execution model.
