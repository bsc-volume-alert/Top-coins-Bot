# Investigation 3 — clock-price freshness

- Control (trade-sourced entries, curve, n=2): fill ÷ reading median 1.4074, 10–90% range 1.0101–1.0101 → 'unchanged' band used: 0.995–1.020
- Control (trade-sourced entries, pool, n=38): fill ÷ reading median 1.0048, 10–90% range 0.9489–1.0442 → 'unchanged' band used: 0.949–1.044

## Clock-sourced entries (all three books share these fills; 100K1 rows)

| price age | entries | verified unchanged | moved/stale: lower | moved/stale: higher | mean r (closed) |
|---|---|---|---|---|---|
| ≤ 10 s | 16 | 13 | 2 | 1 | -4.9% (n=16) |
| > 10 s | 23 | 23 | 0 | 0 | -1.8% (n=22) |

Clock entries outside the unchanged band (with their classification): B8dvdSHW — fresh price, market moved before the fill (down) (40-50K pool, age 6 s, fill÷reading 0.8628, r -95%); A7b25wzw — fresh price, market moved before the fill (up) (30-40K pool, age 0 s, fill÷reading 1.0554, r -37%); 8hF6kWfr — fresh price, market moved before the fill (down) (30-40K pool, age 4 s, fill÷reading 0.8726, r +113%)

## All clock readings with status ok (n=20404) — price age, and what the decision was

| price age | readings | of which decided from this clock row | in a K band ($30–50K) | feed proven connected (feed_ok=1) |
|---|---|---|---|---|
| ≤ 10 s | 1574 | 1042 | 22 | 1574 |
| 11–60 s | 1519 | 1453 | 0 | 1519 |
| 61–180 s | 4420 | 4227 | 9 | 4420 |
| > 180 s | 12891 | 12313 | 15 | 12891 |

- Near-band exposure: 53 clock decisions had a price older than 60 s and a reading within ±25% of the $30–50K band ($24K–$62.5K); for these, a stale price could have put a coin wrongly in or out of the band. Only the entered ones can be checked against reserves (above); for the rest no independent price exists in the stored data.
- The clock marks a reading 'ok' only when the main feed was connected for the whole interval since the last price (feed_ok); an old price with the feed up means no trade was received — consistent with a quiet market, but trades missed while the tracker's event loop was blocked would look the same (see Investigation 2: 83 blocks ≥ 10 s on 9–10 Nov).
