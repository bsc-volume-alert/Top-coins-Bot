# Frozen hypotheses — $100K study, frozen 7 Nov 2026 10:45 UK (UTC). Do not edit; add a new dated file instead.

Source: study_v1_1 (development data, launches 6 Nov 09:23 → 7 Nov 07:23 UTC). These are hypotheses, not rules. No book, no live trading.

Confirmation cohort: launches created **after 7 Nov 09:57:18 UTC** (tracker 0.19.9 activation), retained by the launcher,
2-h window complete, same labels and on-time rule as study_v1_1 (study100k.py v1.1, curve-ceiling suspect rule included).
Evaluate once at least 15 POS are available in the cohort (2-h outcome, decision 60 s), or at 14 Nov 2026 10:00 UK, whichever first.

H-sell (warning sign). At 60 s, sell share ≥ 0.50 (DEV threshold 0.5, fixed).
  Prediction: the POS rate among these coins is lower than among coins with sell share < 0.50.
  Supported if: the 95% upper bound of the ≥ 0.50 group's rate is below the < 0.50 group's point estimate.
  Not supported if: ≥ 1 POS per 50 coins in the ≥ 0.50 group, or the intervals overlap such that the condition above fails.

H-hold5 (five-minute persistence). Among coins not already ≥ $100K at 5 min, with on-time 60-s and 5-min readings:
  "held" = cap at 5 min ≥ cap at 60 s; "fell" = below.
  Prediction: POS rate (reaching $100K within 2 h of creation) is higher for "held" than "fell".
  Supported if: held rate > fell rate and the Wilson 95% intervals do not overlap.
  Not supported if: intervals overlap, or held rate ≤ fell rate.

Reported alongside each: n, POS, rate, Wilson 95% interval, recall, false alarms per POS. Detection only — trading value would need
a separate after-cost test on trade-level paths.
