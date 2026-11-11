# Investigation 1 — 100K1 losses by band × venue at entry

| group | n | wins | severe (<−50%) | mean r | median r | net SOL (0.2) |
|---|---|---|---|---|---|---|
| 40-50K pool | 20 | 2 | 12 | -52.3% | -67.5% | -2.092 |
| 40-50K curve | 9 | 0 | 0 | -3.3% | -2.7% | -0.059 |
| 30-40K pool | 33 | 15 | 5 | -1.8% | -2.4% | -0.117 |
| 30-40K curve | 18 | 1 | 0 | -3.3% | -2.7% | -0.118 |

## Medians at entry — $40–50K pool (severe vs rest) and $30–40K pool

| feature | 40–50K pool severe | 40–50K pool rest | 30–40K pool all |
|---|---|---|---|
| mc5_usd | 4.59e+04 (n=12) | 4.37e+04 (n=8) | 3.48e+04 (n=33) |
| decision_age_s | 301 (n=12) | 301 (n=8) | 301 (n=33) |
| clock_price_age_s | 6 (n=1) | 4 (n=3) | 0 (n=9) |
| quote_sol_at_check | 79.5 (n=12) | 80.7 (n=8) | 69.9 (n=32) |
| fill_over_check | 1 (n=12) | 1.01 (n=8) | 1.01 (n=33) |
| roundtrip_x0 | 0.991 (n=12) | 0.991 (n=8) | 0.991 (n=33) |
| secs_since_migration | 301 (n=12) | 299 (n=8) | 89 (n=32) |
| secs_create_to_migration | 0 (n=12) | 1.5 (n=8) | 212 (n=32) |
| bundle_pct | 79.3 (n=12) | 60.3 (n=8) | 39.6 (n=33) |
| dev_buy_sol | 0.0494 (n=12) | 0.593 (n=8) | 0.889 (n=33) |
| top10_pct_cp300 | – (n=0) | – (n=0) | – (n=0) |
| holders_cp300 | – (n=0) | – (n=0) | – (n=0) |
| buy_sol_300s | 40.8 (n=12) | 349 (n=8) | 261 (n=33) |
| sell_sol_300s | 90.8 (n=12) | 310 (n=8) | 198 (n=33) |
| net_sol_300s | -47.4 (n=12) | 31.6 (n=8) | 64.7 (n=33) |
| net_sol_60s | 3.98 (n=12) | 4.9 (n=8) | 0.864 (n=33) |
| trades_300s | 4.88e+03 (n=12) | 1.87e+03 (n=8) | 1.7e+03 (n=33) |
| wallets_300s | 142 (n=12) | 467 (n=8) | 677 (n=33) |
| price_vs_peak_before_entry | 0.419 (n=12) | 0.831 (n=8) | 0.868 (n=33) |
| price_change_60s | 0.0885 (n=12) | 0.102 (n=8) | 0.03 (n=33) |
| volatility_300s | 0.0134 (n=12) | 0.0207 (n=8) | 0.0129 (n=33) |
| largest_sell_share_300s | 0.602 (n=12) | 0.076 (n=8) | 0.017 (n=33) |
| EXE_max_gap_s | 12 (n=12) | 3 (n=8) | 13 (n=33) |
| EXE_exit_slip | 0.283 (n=12) | 0.897 (n=8) | 0.996 (n=33) |
| OUT_hi_x | 1.17 (n=12) | 1.18 (n=8) | 1.4 (n=33) |
| OUT_held_s | 192 (n=12) | 92.5 (n=8) | 167 (n=33) |

## Severe and non-severe $40–50K pool entries (one line each)

| mint | decision | mc5 | src | price age | quote SOL | since migration s | net SOL 300s | vs peak | fill/check | exit | r | hi_x | max gap s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B8dvdSHW | 10 16:00:20 | 46748 | clock | 6 | 75.8 | 307 | 9.189 | 0.951 | 0.8628 | trail | -95% | 1.6565 | 119.0 |
| D29eMiBe | 10 19:09:14 | 44405 | trade |  | 80.1 | 302 | -40.451 | 0.43 | 1.0156 | trail | -93% | 1.0 | 16.0 |
| CRWuYpES | 10 00:31:29 | 48286 | trade |  | 82.3 | 300 | -11.903 | 0.678 | 1.0093 | trail | -91% | 1.0267 | 12.0 |
| HYoM6KGc | 10 10:26:10 | 45116 | trade |  | 79.2 | 301 | -44.063 | 0.435 | 1.0139 | trail | -89% | 1.3268 | 65.0 |
| 6k9PpRWd | 10 09:57:33 | 46790 | trade |  | 79.8 | 301 | -48.15 | 0.439 | 0.997 | trail | -80% | 1.0795 | 3.0 |
| GV7zKZVD | 10 01:39:36 | 42475 | trade |  | 76.1 | 301 | -52.549 | 0.409 | 1.0133 | trail | -80% | 5.7986 | 102.0 |
| CwLA95p5 | 10 01:23:43 | 40654 | trade |  | 72.9 | 301 | -55.236 | 0.374 | 0.984 | trail | -78% | 1.438 | 8.0 |
| Cm6YvbRv | 10 03:10:50 | 43993 | trade |  | 77.4 | 300 | -50.76 | 0.405 | 1.0045 | trail | -78% | 1.1844 | 2.0 |
| 7xGyCTrA | 10 12:46:01 | 48246 | trade |  | 82.9 | 301 | -58.857 | 0.372 | 0.9944 | trail | -72% | 1.0341 | 6.0 |
| ArrFSNqR | 10 10:18:09 | 47895 | trade |  | 81.4 | 300 | -46.718 | 0.456 | 0.9914 | trail | -71% | 1.0642 | 2.0 |
| rocFBk2P | 10 03:23:58 | 42288 | trade |  | 75.8 | 301 | -52.775 | 0.395 | 1.0073 | trail | -64% | 1.156 | 12.0 |
| 4srewArZ | 10 03:36:08 | 48173 | trade |  | 82.1 | 301 | -45.947 | 0.392 | 1.0042 | trail | -54% | 1.985 | 75.0 |
| 5wzp3d5b | 10 13:01:48 | 41722 | clock | 1 | 75.0 | 303 | -52.213 | 0.382 | 1.0009 | trail | -49% | 1.1232 | 2.0 |
| DBpD6sF8 | 10 09:55:05 | 42237 | trade |  | 80.2 | 272 | 55.873 | 0.887 | 0.976 | trail | -40% | 1.0512 | 2.0 |
| 9q8FWD6D | 10 20:42:33 | 40291 | trade |  | 73.5 | 73 | 70.431 | 0.948 | 0.9543 | trail | -27% | 1.0395 | 3.0 |
| HWXR3P6f | 10 02:21:39 | 47115 | clock | 4 | 82.5 | 303 | 7.412 | 0.344 | 1.0126 | trail | -19% | 1.244 | 11.0 |
| 32Bah3tc | 10 20:28:00 | 44380 | trade |  | 83.8 | 227 | 88.981 | 0.959 | 1.0442 | trail | -17% | 1.0974 | 3.0 |
| J68JLX62 | 10 04:50:45 | 42940 | clock | 6 | 76.6 | 302 | -0.552 | 0.86 | 1.011 | trail | -7% | 1.4223 | 197.0 |
| DJmHV336 | 10 00:43:09 | 49623 | trade |  | 88.7 | 297 | 65.281 | 0.802 | 1.0307 | trail | 27% | 1.7811 | 1.0 |
| 5JZCjeSS | 09 23:32:07 | 48496 | trade |  | 81.2 | 301 | -57.547 | 0.357 | 1.0069 | trail | 30% | 2.488 | 10.0 |

## Candidate warnings (in-sample, exploratory — all 100K1 closed fills, n=80, baseline mean -14.9%, net -2.386 SOL)

| warning (skip the entry if …) | entries hit | severe avoided | winners rejected | mean r of hit | mean r passed (n) | mean r feature unknown (n) | runners (hi ≥ 2×) rejected | winners rejected (r) |
|---|---|---|---|---|---|---|---|---|
| band $40–50K AND pool | 20 | 12 | 2 | -52.3% | -2.4% (60) | – (0) | 2 | 5JZCjeSS +30%, DJmHV336 +27% |
| RETROSPECTIVE launch class: instant graduation (first stored pool trade ≤ 5 s) | 23 | 14 | 5 | -38.0% | -7.6% (30) | -3.3% (27) | 6 | 5JZCjeSS +30%, DJmHV336 +27%, EMfnF5D4 +137%, CtUeBwNo +19%, 8hF6kWfr +113% |
| decision-time: instant graduation (pool trade received by decision, ≤ 5 s after create) | 23 | 14 | 5 | -38.0% | -9.1% (29) | -2.0% (28) | 6 | 5JZCjeSS +30%, DJmHV336 +27%, EMfnF5D4 +137%, CtUeBwNo +19%, 8hF6kWfr +113% |
| instant graduation AND price < 0.8 × pre-entry peak | 20 | 13 | 4 | -40.0% | -10.6% (32) | -2.0% (28) | 6 | 5JZCjeSS +30%, EMfnF5D4 +137%, CtUeBwNo +19%, 8hF6kWfr +113% |
| pool AND migrated < 300 s before entry | 30 | 3 | 12 | -7.9% | -19.1% (50) | – (0) | 3 | 8xcAhQmS +84%, HYxUWHLP +20%, DJmHV336 +27%, 9e3qBX1e +17%, 4EB8RZVp +49%, 7b4VfXAw +15%, 52TS3puK +22%, 3HyA7Q2T +1%, G8uy3NRg +9%, EKgANR64 +5%, 7LtE7Yr6 +58%, Ae9DKPq1 +46% |
| net SOL last 300 s < 0 | 27 | 13 | 4 | -31.3% | -10.2% (35) | 0.5% (18) | 6 | 5JZCjeSS +30%, EMfnF5D4 +137%, CtUeBwNo +19%, 8hF6kWfr +113% |
| net SOL last 300 s < 0 — proven-receipt rows only | 27 | 13 | 4 | -31.3% | -10.2% (35) | 0.5% (18) | 6 | 5JZCjeSS +30%, EMfnF5D4 +137%, CtUeBwNo +19%, 8hF6kWfr +113% |
| net SOL last 60 s < 0 | 17 | 5 | 6 | -9.2% | -23.2% (45) | 0.5% (18) | 5 | 8xcAhQmS +84%, HYxUWHLP +20%, EMfnF5D4 +137%, CtUeBwNo +19%, 7b4VfXAw +15%, 8hF6kWfr +113% |
| price < 0.8 × pre-entry peak | 26 | 13 | 6 | -29.7% | -12.0% (36) | 0.5% (18) | 7 | 8xcAhQmS +84%, HYxUWHLP +20%, 5JZCjeSS +30%, EMfnF5D4 +137%, CtUeBwNo +19%, 8hF6kWfr +113% |
| price < 0.8 × pre-entry peak — proven-receipt rows only | 26 | 13 | 6 | -29.7% | -12.0% (36) | 0.5% (18) | 7 | 8xcAhQmS +84%, HYxUWHLP +20%, 5JZCjeSS +30%, EMfnF5D4 +137%, CtUeBwNo +19%, 8hF6kWfr +113% |
| fill/check > 1.05 | 7 | 1 | 2 | -17.2% | -14.7% (73) | – (0) | 0 | HYxUWHLP +20%, Ae9DKPq1 +46% |
| volatility_300s > 0.05 | 9 | 0 | 0 | -10.9% | -20.8% (53) | 0.5% (18) | 0 |  |
| quote SOL at check < 40 | 0 | | | | -21.9% (52) | -2.0% (28) | | |
| clock price age > 60 s | 22 | 0 | 1 | -1.8% | -4.9% (16) | -25.6% (42) | 0 | EDhfrwv5 +56% |
| bundle_pct > 20 | 49 | 17 | 17 | -20.8% | -5.6% (31) | – (0) | 9 | 8xcAhQmS +84%, HYxUWHLP +20%, 5JZCjeSS +30%, DJmHV336 +27%, EMfnF5D4 +137%, 9e3qBX1e +17%, CtUeBwNo +19%, 4EB8RZVp +49%, 7b4VfXAw +15%, J1W5iWVz +34%, 52TS3puK +22%, 3HyA7Q2T +1%, G8uy3NRg +9%, EKgANR64 +5%, 7LtE7Yr6 +58%, Ae9DKPq1 +46%, 8hF6kWfr +113% |

Knowledge time: 0 of 80 closed fills have pre-entry rows without a receipt time (block time used); the 'proven-receipt rows only' lines exclude those rows.

Caution: 81 fills, 29 in the $40–50K band; thresholds were chosen by eye on this same sample, so every row above is a hypothesis to test on later coins, not a rule.

## Execution check of the severe losses — did the trail fail because of one crash, and is the exit evidenced?

| mint | trigger x | exit x | exit/trigger | biggest sell within 5 s before exit (SOL) | its share of pool quote | exit reserves recorded |
|---|---|---|---|---|---|---|
| Ffs4KXjK | 0.0401 | 0.0401 | 1.0 | no retained trade |  | yes |
| 1f3LAi4P | 0.7745 | 0.0536 | 0.069 | 29.5 | 0.42 | yes |
| B8dvdSHW | 0.2858 | 0.0542 | 0.19 | 92.9 | 1.23 | yes |
| 68VYvpLE | 0.5887 | 0.0552 | 0.094 | 28.1 | 0.42 | yes |
| D29eMiBe | 0.1185 | 0.0796 | 0.672 | 55.9 | 0.7 | yes |
| BitupP6N | 0.7922 | 0.0853 | 0.108 | 12.6 | 0.18 | yes |
| CRWuYpES | 0.3221 | 0.0986 | 0.306 | 70.3 | 0.85 | yes |
| HYoM6KGc | 0.9932 | 0.1202 | 0.121 | no retained trade |  | yes |
| 6kitH34U | 1.0756 | 0.1863 | 0.173 | no retained trade |  | yes |
| 6k9PpRWd | 0.7884 | 0.2044 | 0.259 | 14.7 | 0.18 | yes |
| GV7zKZVD | 3.756 | 0.2114 | 0.056 | 27.9 | 0.37 | yes |
| CwLA95p5 | 1.0771 | 0.2263 | 0.21 | 3.4 | 0.05 | yes |
| Cm6YvbRv | 0.8863 | 0.23 | 0.26 | 1.9 | 0.02 | yes |
| 7xGyCTrA | 0.7718 | 0.2846 | 0.369 | 21.9 | 0.26 | yes |
| ArrFSNqR | 0.7966 | 0.2973 | 0.373 | 6.8 | 0.08 | yes |
| rocFBk2P | 0.8659 | 0.3686 | 0.426 | 2.3 | 0.03 | yes |
| 4srewArZ | 1.4854 | 0.4675 | 0.315 | 9.7 | 0.12 | yes |

## Pool SOL between entry and exit: reserves vs recorded swaps, deduplicated (severe losses) — residuals are unexplained, NOT evidence of withdrawal

| mint | pool at check | pool at exit | quote SOL at check | quote SOL at exit | change | net swap SOL in between (buys − sells) | unexplained change |
|---|---|---|---|---|---|---|---|
| Ffs4KXjK | 5AjYPQcn | 5AjYPQcn | 72.6 | 0.7 | -72.0 | -70.7 (30955 swaps) | -1.2 |
| 1f3LAi4P | 2RKbD51q | 2RKbD51q | 70.9 | 3.4 | -67.5 | -60.2 (2269 swaps) | -7.3 |
| B8dvdSHW | 5aFrWdpn | 5aFrWdpn | 75.8 | 4.4 | -71.4 | -78.7 (367 swaps) | +7.3 |
| 68VYvpLE | EZEyejy5 | EZEyejy5 | 67.6 | 3.2 | -64.4 | -55.9 (2562 swaps) | -8.5 |
| D29eMiBe | DE3Eeznt | DE3Eeznt | 80.1 | 10.2 | -69.9 | -69.7 (212 swaps) | -0.2 |
| BitupP6N | 8LSw2HNN | 8LSw2HNN | 69.4 | 8.7 | -60.7 | -60.2 (1681 swaps) | -0.5 |
| CRWuYpES | NVYfpoi8 | NVYfpoi8 | 82.3 | 14.7 | -67.7 | -80.8 (6 swaps) | +13.1 |
| HYoM6KGc | 2JqLZHJy | 2JqLZHJy | 79.2 | 16.3 | -62.9 | -69.4 (7540 swaps) | +6.6 |
| 6kitH34U | AjKQpSc6 | AjKQpSc6 | 62.6 | 17.1 | -45.4 | -51.5 (5250 swaps) | +6.0 |
| 6k9PpRWd | 28S8H6e3 | 28S8H6e3 | 79.8 | 26.9 | -52.9 | -54.5 (3180 swaps) | +1.6 |
| GV7zKZVD | As9sSitw | As9sSitw | 76.1 | 25.9 | -50.2 | -47.9 (33813 swaps) | -2.3 |
| CwLA95p5 | DuhyCedB | DuhyCedB | 72.9 | 25.6 | -47.4 | -51.9 (3508 swaps) | +4.5 |
| Cm6YvbRv | HHsP3MUh | HHsP3MUh | 77.4 | 28.2 | -49.2 | -54.1 (1838 swaps) | +4.9 |
| 7xGyCTrA | EsG6bg6j | EsG6bg6j | 82.9 | 36.6 | -46.3 | -48.6 (370 swaps) | +2.3 |
| ArrFSNqR | 7uehPBKW | 7uehPBKW | 81.4 | 36.6 | -44.8 | -63.0 (1339 swaps) | +18.2 |
| rocFBk2P | 2o8HQNXR | 2o8HQNXR | 75.8 | 39.4 | -36.4 | -52.6 (2239 swaps) | +16.3 |
| 4srewArZ | CanfTxiv | CanfTxiv | 82.1 | 51.1 | -31.0 | -58.5 (8938 swaps) | +27.4 |

## The trigger-to-exit window (~0.8 s): pool SOL at trigger vs exit, and recorded sells in that window

| mint | quote SOL at trigger | quote SOL at exit | sells recorded trig−1 s … exit+1 s (SOL, count, distinct wallets) | same-slot sells | value at trigger → exit |
|---|---|---|---|---|---|
| Ffs4KXjK | 0.7 | 0.7 | 0.0 SOL, 0, 0 wallets | – | 0.0401 → 0.0401 |
| 1f3LAi4P | 51.0 | 3.4 | 63.6 SOL, 17, 17 wallets | max 16 sells in one slot | 0.7745 → 0.0536 |
| B8dvdSHW | 97.1 | 4.4 | 92.9 SOL, 1, 1 wallets | max 1 sells in one slot | 0.2858 → 0.0542 |
| 68VYvpLE | 65.2 | 3.2 | 0.0 SOL, 0, 0 wallets | – | 0.5887 → 0.0552 |
| D29eMiBe | 16.3 | 10.2 | 6.3 SOL, 37, 37 wallets | max 16 sells in one slot | 0.1185 → 0.0796 |
| BitupP6N | 65.0 | 8.7 | 63.3 SOL, 34, 34 wallets | max 34 sells in one slot | 0.7922 → 0.0853 |
| CRWuYpES | 14.7 | 14.7 | 83.0 SOL, 2, 1 wallets | max 1 sells in one slot | 0.3221 → 0.0986 |
| HYoM6KGc | 79.9 | 16.3 | 0.0 SOL, 0, 0 wallets | – | 0.9932 → 0.1202 |
| 6kitH34U | 65.8 | 17.1 | 0.0 SOL, 0, 0 wallets | – | 1.0756 → 0.1863 |
| 6k9PpRWd | 77.5 | 26.9 | 49.4 SOL, 921, 921 wallets | max 149 sells in one slot | 0.7884 → 0.2044 |
| GV7zKZVD | 180.0 | 25.9 | 199.4 SOL, 1266, 1266 wallets | max 212 sells in one slot | 3.756 → 0.2114 |
| CwLA95p5 | 76.6 | 25.6 | 81.2 SOL, 1300, 1300 wallets | max 202 sells in one slot | 1.0771 → 0.2263 |
| Cm6YvbRv | 72.3 | 28.2 | 34.3 SOL, 891, 891 wallets | max 116 sells in one slot | 0.8863 → 0.23 |
| 7xGyCTrA | 60.9 | 36.6 | 9.7 SOL, 185, 185 wallets | max 26 sells in one slot | 0.7718 → 0.2846 |
| ArrFSNqR | 71.2 | 36.6 | 67.0 SOL, 1162, 1162 wallets | max 118 sells in one slot | 0.7966 → 0.2973 |
| rocFBk2P | 69.8 | 39.4 | 70.6 SOL, 1164, 1164 wallets | max 158 sells in one slot | 0.8659 → 0.3686 |
| 4srewArZ | 104.7 | 51.1 | 109.7 SOL, 1059, 1059 wallets | max 140 sells in one slot | 1.4854 → 0.4675 |
