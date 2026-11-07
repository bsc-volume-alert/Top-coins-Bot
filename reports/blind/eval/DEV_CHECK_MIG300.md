# Development check of the Claude analyst's MIG300 with eval-1.1 (7 Nov 2026 ~16:30 UK)
Window: launches created 6 Nov 19:31 → 7 Nov 12:31 UTC. Data: entry-package-7nov (supplement = coins some book entered; only 462 mints in this window, so this is NOT the test population). Runtime 55 s, peak memory 216 MB, 914,863 duplicate rows removed, 0 non-contiguous mints.

| 0.2 SOL | strict (scoring rules) | diagnostic (evidence check off) | analyst's own (SUBMISSION §2, both halves) |
|---|---|---|---|
| attempts (scored + unknown) | 139 (30 + 109) | 139 (139 + 0) | 202 (200 + 2) |
| mean / median per scored entry | +13.6% / +8.2% | +3.8% / +2.6% | +3.7% / +2.6% |
| win rate | 63% | 63% | 59% |
| share losing ≥ 50% | 6.7% | 12.2% | 14.5% |
| Bonferroni lower bound (K = 1) | −0.068 | −0.0024 | −0.038 (5th pct) |
| supported | no (and not scorable: 78% unknown) | no | no |

- **Strict mode: 109 of 139 attempts are unknown.** Development pool rows before tracker 0.19.9 (7 Nov 09:57 UTC) carry no evidence fields (wSOL, decimals), and the brief requires them. Every pool row in the 8–10 Nov test period will carry them.
- **The diagnostic run reproduces the analyst's figures closely.** Differences: window 12:31 vs 14:31, and pool fee 0.30% here vs 0.55% in the analyst's engine.
- **Reproducibility gap in the analyst's package.** Its data-cleaning step (trades_clean.pkl) and steps 2–7 of analysis_notes.md are not scripted in the branch.
