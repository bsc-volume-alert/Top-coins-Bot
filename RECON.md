# Reconciliations — 100K books (recon.py)

## 1. Decisions → outcome category (30338 decisions, one per coin)

| status | coins |
|---|---|
| out of band | 19521 |
| clock reading not usable: no-price | 4603 |
| late: read by launcher after 315 s | 1579 |
| clock reading not usable: uncertain: feed gap | 1451 |
| late: reading available after 315 s | 1252 |
| clock reading not usable: late-processed | 1080 |
| no market cap | 401 |
| clock reading not usable: uncertain: ingestion lag | 368 |
| entered | 83 |

By reading source (src) and entered: (blank: before src column) = 1582; (blank: before src column) entered = 2; clock = 26496; clock entered = 41; trade = 2177; trade entered = 40

## 2. Unique coins vs book positions

- Decisions 'entered': 83 coins. Distinct mints with positions: 83. Positions: 187 (100K1 83, 100K2 52, 100K3 52).
- Entered without a position: 0 []. Positions without an 'entered' decision: 0 [].
- Decision 'books' field ≠ the books holding positions: 0 [].
- Book combinations per coin: 100K1,100K2,100K3 = 52; 100K1 = 31.
- Shared-entry identity (same entry time and identical token amounts for every book holding the coin): 83 of 83 coins; exceptions: []. Detail: recon_shared_entries.csv.

## 3. Per-position net SOL → book totals (closed positions; open listed separately)

| book | positions | closed | open | wins (0.2) | mean r 0.2 | median r 0.2 | net SOL 0.2 | net SOL 0.02 (independent) |
|---|---|---|---|---|---|---|---|---|
| 100K1 | 83 | 80 | 3 | 18 | -14.9% | -2.7% | -2.3856 | -0.3569 |
| 100K2 | 52 | 51 | 1 | 16 | -2.3% | -2.7% | -0.2347 | -0.1035 |
| 100K3 | 52 | 51 | 1 | 15 | -2.4% | -2.7% | -0.2468 | -0.0907 |

Sum check: the net SOL column of recon_positions.csv, summed per book over closed rows, equals the table above (same rows, no rounding beyond 6 dp).

## 4. Unresolved positions and stress (5 positions not closed at read)

- 100K1: closed net -2.3856 SOL; 3 open → if all open exit at r = 0: -2.3856; at −50%: -2.6856; at −100% (worst case): -2.9856 SOL.
- 100K2: closed net -0.2347 SOL; 1 open → if all open exit at r = 0: -0.2347; at −50%: -0.3347; at −100% (worst case): -0.4347 SOL.
- 100K3: closed net -0.2468 SOL; 1 open → if all open exit at r = 0: -0.2468; at −50%: -0.3468; at −100% (worst case): -0.4468 SOL.

## 5. Severe losses (r 0.2 < −50%): 26 positions on 17 coins — recon_severe_losses.csv

- 100K1: 17 positions, -2.8129 SOL
- 100K2: 5 positions, -0.9234 SOL
- 100K3: 4 positions, -0.7318 SOL

## 6. Paired 20% vs 25% trail exits (same coin, same fill): 52 coins — recon_paired_20_25.csv

- 20% better: 16, 25% better: 11, equal: 24; mean difference (20% − 25%) -0.1 pts of stake.

## 7. The additional $40–50K entries (100K1 only): 31 positions — recon_100K1_40_50K.csv

- $40–50K: 29 closed, wins 2, severe 12, mean r -37.1%, net -2.1508 SOL
- $30–40K (same book): 51 closed, wins 16, severe 5, mean r -2.3%, net -0.2347 SOL

## 8. Evidence coverage of entered coins

- Entered coins with NO retained trade history in the tracker database: 20 of 83 (decision source: clock 19, trade 1). Their positions were simulated from live reserve reads (positions_chain_fill), but the curve/pool trade history needed to re-check them independently was not stored — the tracker keeps trades only for launches it retains (15-SOL screen / bundle tier-1) plus 24 h of pool trades. These coins: 21v6J6jYix45Fths6v5oNLDzDJNrXyFoMbDAiUiApump, 5LCZtSCqjYRocjzyh1SZbs3EJKZ4v5LDu53Wo63vpump, 7HGGYfa9QMcXkvJDmHeRboLSE4W9aiQiWy2oqF2ppump, 7Tw9KfqYbi3A3ENuHkws3CLBeq9Nf8df4QMkjZDppump, 8g5vALXX5U1C53jAM629L5s67XUq9dW4wVac71Rcpump, 9Rk9M1XLBLj4aKT7c8uSK8p4jxBAk4VshSVnQz3Lpump, 9gNZB2AykXaWxQgFs5PbnEFNwEjMQpV6r8xiKogkpump, 9zgKYpYrrjY1GkLA6LF1hXQahWD1Nnt1SLkJ4mJepump, Aa52FKgwmjsgMXwZWWNCp83bwKwjQTu3wvesUqYBpump, E9TehaEqnHiPUm1ucbr13cLr6Fg4dfjUJZedYbR1pump, EDhfrwv57sPDeeduas3TAJrKEH67Sm8EofS54p9Kpump, F2qCYbvgjrcZiPX6Ma9UabMQoA7Ffob5pPCnp5ripump, FJ2tS7N8Z9rHXf3irns43qc87Q41Hg8eN61UpJvUpump, FNxnauVJo9Y39yf3NEgj6uTFcCzLHTiyNnDYCPagpump, Fn6h2hxWFgfgsMr7EhE9BUKoLNYp81HUoUysmAQMpump, GJZZYWz3ecGS3N7HVgqbpYqXFYiD8UHuVurJzJykpump, GLeeS5nXmbG9GzzNhCEpuHDyBe18QVzS2rTXcEBgpump, H7i2c7a3oK31Lahyc6gfquKY3P7BjQNKsgtDqiQSpump, JCaj6rnWnezc4FBHRkGnXVHG69TFCrJhognvvPxBpump, z68Nv2CRghYz4XZzHSoE8pkHtiF1V83MjJ5ip2vpump.
- MISSING EVIDENCE (explicit): trade histories for the coins above; pump_buyers; decision-time holder concentration for coins without token_life holders/top10 values; any data inside the recording gaps listed in MANIFEST.md.
