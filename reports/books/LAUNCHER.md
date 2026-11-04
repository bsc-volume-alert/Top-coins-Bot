# LAUNCHER — the tweet → pump.fun coin launcher and the copycat study
_Created 31 Oct 2026 19:10 UK. Data: launcher-data branch (launches.csv, copy_peaks.csv, study_coins.jsonl, study_buyers.jsonl, vol_paper.csv)._

## What it is now
- Watches X accounts through TwitterAPI.io (WhiteHouse, elonmusk, Pumpfun, a1lon9 + others the owner added) and names a coin from each post, using the post's words and picture (claude-haiku-5-5 via the Anthropic API, with rules as the fallback).
- **Mode: PAPER since 31 Oct 18:27 UK** (launcher 0.3.0, live.txt = "paper"; owner 18:21 UK: "let's just paper trade for now … it's the time to research"). It still names every post and records it, tracks all copycats, prices them hourly and studies the runners. No SOL is spent.
- Copycat prices (0.2.2): hourly GMGN token info and candles for every same-name coin made from 1 min before to 30 min after a post, plus ours: peak market cap and when, market cap at +5/15/30/60 min, now, graduated or not, launchpad.
- Copycat study (0.3.x–0.4.1): every copycat with a peak ≥ $30K, plus up to 3 copies of the same post that did not run, plus ours. Method:
  - the first 40 min of trades from Helius (getTransactionsForAddress);
  - pump.fun coins decoded from their TradeEvents; other launchpads (Meteora DBC/DAMM etc.) from balance changes;
  - the first 100 buyers profiled (wallet age, activity, funder);
  - a GMGN snapshot per coin.
  Budget 250k Helius credits a day; the first run used 2,200.
- V300 / V500 volume paper books (0.4.0; owner 18:41 UK). Any Solana coin from GMGN's top 100 by 5-min volume, any age, paper buy the first time its 5-min volume is ≥ $300K / ≥ $500K and under $1M. Scored 2 h later: 15/60/120 min, peak, 2x/−50%, 1.5x/−30%, 40% trail, after the LESSONS.md cost models.

## Live record (31 Oct 12:15–17:46 UK, 0.1 SOL a launch)
- 44 live launches. None rose more than 6% (peak market caps $2.7K–3.5K = the starting market cap).
- Most buys by others in 10 min: 14 (HOPE SUSTAINABLE PEACE Oleshky), all tiny.
- Every sale lost ~0.011 SOL (deployment + fees). 39 sold = −0.437 SOL; about −0.49 SOL with the 5 still open at 17:47.
- The wallet fell under 0.15 SOL at 17:29 UK, which made the bot paper-only from then. At 18:27 UK it was switched to paper on purpose.

## Copycats, 31 Oct (prices 18:12 UK)
- 78 copycats on 14 of the 44 posts. We were first on 5 of the 14.
- Runners (peak ≥ $30K):

| Post | Copycat | Made after post | Peak market cap | Now | Venue |
|---|---|---|---|---|---|
| No Kings | Hsdhmq | 8.2 min | $505K | $184K | Meteora DBC |
| No Kings | 3c7T9i | 9.6 min | $129K | $1.9K | pump.fun, graduated |
| Starlink | Saved By Starlink, 3UYjKk | 18 min | $78K | $0 | Meteora DBC |
| Starlink | Saved By Starlink, 3mBnUo | 4.6 min | $62K | $1.8K | pump.fun, graduated |
| Pumpfun | just use Pumpfun, GMLmSo | 1.2 min | $37K | — | small launchpad (tenurepad) |
| Pumpfun | just use Pumpfun, FkSuZg | 2.8 min | $33K | — | small launchpad (launchon.fun) |

- Our "No Kings" (6 s after the post, same name, ticker NOKINGS): zero buyers.
- About 20 other copies show a one-candle $10–24K "peak" in their first minute, then sit at $2.7K with 1–4 holders. That is the creator's own buy, not traders.

## Ideas tested / findings
- **4 Nov 17:05 UK — FD 15 scored (222 entries, 142 scored across the family).** FD: 6 of 15 reached 2x (Chrome-Chan 22x, Tattie 8.4x, The Donkey 8.2x, Ram Altman 5.7x, SICompute 3.1x); 9 of 15 to ~0.25x inside 2 min of entry. Exits (0.2 SOL × 15, after costs): 2x/−50% −0.23 SOL (−8%/trade); 1.5x/−30% −0.15; half-at-2x+trail +1.21 (+40%, no-best +11%); out10 +1.39; out15 +1.92 (+64%, no-best +29%); out20 +2.07; trail40 +2.20 (+73%, no-best +20%). FDL 27: trail40 +44%; FDB 45: trail40 +25%; A1 55: 2x −12%, half2 +13%, trail40 +24%, out15 +22%. FD ahead of A1 on every exit at n=15. Signature inside FD's passes: bundle 43–49%, exactly 4 buys ≥ 2 SOL, ~30 SOL net at minute 1, creator funded 3–45 SOL in the launch minute — one operator/script launching repeatedly (Chrome-Chan ×4 in 25 min), ~1 in 3 runs, the rest dumped at minute 1–2 right after entry. Conclusion so far: on the live mix the 2x cap loses to the rug rate; the trail (or out15/20) is the exit; proposed variant FD120 (enter at the 120 s check only, if still holding) to skip the dump window.
- **4 Nov 15:10 UK — FD book (0.8.0 live 10:45; 0.8.2 factory tests 12:55; 0.8.3 chain-priced entries 13:05 — GMGN lagged ("I voted" $2K vs chain $10.6K); 0.8.4 re-priced the earlier entries; 0.8.5 14:20 closed the re-used-creator hole (one funder, one creator wallet, 2.133 SOL × 5 in 50 min counted as 0 launches) and added creator-prior-launch and same-amount-any-launch tests; scope /fd page 12:58, plain-words box 13:20).** First scored batch, 0.2 SOL stake: FD 1 scored (Hopecoin: 13.3 SOL funded same minute, 43% bundle, 28.6 SOL net at minute 1, 0.26x by minute 5 — rug), 16 open; FDL 4 (won 1, 2x exit −20% avg); FDB 11 (won 4, 2x −6% avg, half2 +12%, trail40 +18%, 8 of 11 dipped below 0.5x); A1 18 (won 7, 2x −6%, half2 +7%, trail40 +9%, 8 of 18 below 0.5x). Observation (34 trades, not a conclusion): the 2x/−50% exit is slightly negative on the live mix while half-at-2x+trail and the 40% trail are positive — the opposite of the winners-only sweep, because most live entries are not winners. Launch rate ~2,100/h; strict passes ~0.7% after 0.8.5.
- **4 Nov 11:08 UK — exit sweep over the 214 census winners (0.8.1; GMGN 1-min candles, real cost model; winners only = the ceiling).** $25K entry (204 of 214, median minute 1, $31K): 98% reach 1.5x, 95% 2x, 89% 3x; −35% stop before 1.5x 14%; peak median 4.97x at minute 16, dip before peak 0.82x; +30 min median 0.17x, +60 min 0.08x (74% below 0.65x). $50K entry (198, minute 4, $58K): 2x 78%, 3x 42%, stopped 20%, peak 2.72x at minute 11. Exits at $25K after costs (avg / median / won / total on 1 SOL each): 1.5x +27% / +41% / 82% / +54 SOL; **2x +60% / +90% / 77% / +123**; 3x +128% / +187% / 74% / +261; half-at-2x+trail40 +89% / +96% / 77% / +181; trail40 +107% / +90% / 73% / +217; out10 +98% / +71% / 65%; out15 +108% / +37% / 53%; out20 +105% / −41% / 45%. Minute-1 entry (all 214, $34K at minute 2) ≈ the $25K entry; minute-5 entry ($53K): 2x 67%, 3x 47%, stop 28%. By type at $25K: self-bundlers (≥60%, 55 coins) 100% reach 3x, 2x exit won 89% — paper only (LESSONS: real sells on this type fill at half paper, 13 live legs 0 won); bundle <60% (139): 2x 94%, 3x 85%, 2x exit +55% avg won 73%; + net ≥27 SOL minute 1 (101): 2x 96%, 2x exit won 76%. Verdict: winners are tradeable at $25K, minute 1–2, with a 2x take-profit (or half at 2x + trail); nothing is held past minute 20; the unknown is the filter's hit rate on non-winners — FD (0.8.0, live 10:45 UK: 186 scanned, 4 entries by 11:05) measures it. Break-even for the 2x exit ≈ 1 winner in 3 passes; 1 in 2 ≈ +25% a trade.
- **4 Nov 10:45 UK — all 214 census coins studied (feed stalled 05:19–10:33 by GitHub's secret scanner on a wallet address in study_buyers.jsonl; 0.7.8 drops flagged lines and retries). No operator to follow.** 114 distinct creator-funders behind the 214 winners; funders with 2+ winners are exchange hot wallets (Binance 35, KuCoin 14, Bybit 11, MoonPay 3, Gate 3); private funders with 2+ winners: two, 2 each; 16 of 214 winners in any multi-coin group; HckQ93 (5 winners) 33 launches since 3 Nov 22:00, 5 graduated, 0 ≥ $100K. Creator census 13,400 launches (tracker back on 3 Nov 21:51, ~1,100 launches/h): on 10,128 ≥ 3 h old — 1.7% graduate (1.0% excluding bundle ≥ 60%, which graduates 92% by self-buying); bundle < 60% & creator funded ≥ 2 SOL ≤ 2 h & funder ≤ 2 launches: 68, 7.4% graduated; + bundle 10–60%: 42, 11.9%; ≥ 5 SOL: 32, 12.5%; bundle 30–60% alone: 343, 7.0%; factory funders (20+ launches): 6,406, 0.8%. The 53% of the first 32 was the factory. FD = book A's minute-1 trigger (net ≥ 27 SOL, mc ≥ 100 SOL) plus the funding pre-filter; expectation modest; paper only.
- **4 Nov 09:50 UK — full read on 134 census winners, 6,400 traced launches, 122 scored paper trades (data to 05:19 UK; the export then stalled).** Winners vs copycat non-runners (medians): net SOL minute 1 57.5 (p25 27) vs 10.7 (p75 28); net SOL by 5 min 82.7 vs 4.4; mc at 1 min 247 SOL vs 51; buyers minute 1 88 vs 118 (fewer, bigger); 2+ SOL buys in 15 min 47 vs 7; sniper SOL 3 s 2.9 vs 8.8; creator prior launches (GMGN) 1 vs 35; creator CEX-funded 53% (Binance 28, KuCoin 13, Bybit 10) vs 9%; creator funding 3.7 SOL ~2 h before launch vs 1 SOL at launch. Timing: 129/134 graduated inside 40 min, median 176 s; peak median minute 16 (p25 6, p75 27); mc at 30 min median $4K; now 4% of mc5. Creator census (2,116 launches 4 h+ old): graduation by funder's launches in window — 1: 6.3%, 2–4: 2.1%, 5–19: 0.7%, 20–99: 0.3%, 100+: 0.2% (base 1.4%); creator funded ≥2 SOL ≤2 h before launch by a funder with ≤2 launches: 32, 17 graduated (53%); with bundle 10–60%: 13/6; bundle <10%: 7/0. Factories: 8szGUC ~300/day, NEAR bridge 351 in 3.5 h. Dead: VA 6 trades −13%/−10%, backfill 1 hit in 1,500; V300/V500 42 at −11%/−10%; RF 64 at 0…+10% mean, −36% median, won 27–45% (lottery); snipers nothing to follow. Proposed FD book (waiting for yes): trigger at launch — funder found by RPC, ≥2 SOL ≤2 h, funder ≤2 launches/14 d, creator's first coin, bundle 10–60%; confirm at 60–120 s net ≥27 SOL and mc ≥100 SOL; entry next price; half at 2x, 40% trail, hard out minute 15, stop −35%; curve costs; judged at 40.
- **4 Nov 01:40 UK — 89/214 census coins; creator census 3,200/19,200 (3 Nov 21:50 → 4 Nov 01:20 only). Most "operators" are spam factories.** Study stalled 20–40 min a coin behind the VA backfill in the GMGN pacer (40 coins × ~43 kline pages every 2 min) and its own candle walk (~175 calls for a 60-day coin); 0.7.7 (proposed): backfill 8 a tick, census coins take the tracker's peak (one GMGN call), study 400 a run, creator pass 3,000 a run. Creator census facts: 3,200 launches, 43 graduated (1.3%), 5 ≥ $100K so far; NEAR OmniBridge funded 351 creators in 3.5 h, private wallets 202/86/83/66, MoonPay 135, Bybit 88, MEXC 73, Binance 67, Coinbase 29 — factories at 1–3 graduations per hundred. 8szGUC ("12 winners, 10 ran" at 23:35) launched 43 in 3.5 h, 0 graduated (~300 a day → 12 hits in 60 days is below the 0.95% base rate); CnTeYC 28/0; BigrT9 22/0. Zero launches in the window: HbrD3h (8/8), DAzZgv (5/5, 11 SOL, private), EuWS4Q (2/2, KuCoin) — the low-volume candidates, to be judged when the trace reaches 20 Oct. The 5 hits' creators were funded a median 33 SOL 70 min before launch vs 0.23 SOL days earlier for the rest (n=5; candidate live filter "creator funded ≥ 10 SOL within 2 h"). Snipers: 440 on 2+ coins; 5QY3MB on 36 of 89 (7 SOL total); BwWK17 814 SOL over 7 (all ran, sells in seconds); 3azG8r 130 SOL over 3 (none ran). VA book: 6 scored — half-at-2x +13/−36/−36/−10/−19/+7 (avg −13%), trail40 avg −10%; backfill 1 entry in 910 coins.
- **3 Nov 23:35 UK — interim (0.7.6 live 21:19; study 10–40 s a coin now, GMGN the slow part; still 30 an hour).** 80 of 214 census coins studied. Creator census (0.7.6): 1,600 of 19,200 launches (14 days; the tracker logs ~1,400 a day) traced; 1,394 with a funder; 535 (33%) funded straight from a labelled exchange/bridge (NEAR OmniBridge 184, MoonPay 62, MEXC 43, Binance 37, Bybit 35, Coinbase 26, FOMO co-signer 20, Gate 12); 330 distinct funders, 125 behind 2+ creators, two private wallets behind 95 and 62 creators in a day (launch factories). Operators (19 groups): 8szGUC 12 winners/10 ran, 26 SOL bundles, Binance-funded — but 10 launches in the last day, 0 graduated (the winners-only hit rate was an illusion); A9Venj 9/9, 41 SOL; 74.3%/68 SOL signature 6/6 ($748K); 42.6%/20 SOL 6/6; DAzZgv 5/5, 11 SOL, private; G318mt 2/2, Binance. VA book 3 entries, backfill 479/1,500, no new hits.
- **3 Nov 20:58 UK — sniper analysis on 43 census coins (668 wallets in the creation block or first 3 s) and 0.7.5 grouping fix (proposed, waiting for "go").** Only 36 of 668 early wallets (5%) trace to the creator's funding chain; in the creation block 27 of 186 (15%); 12 of 43 coins have any creator-linked early wallet (GTA6 $427K 4 wallets 71 SOL, SOLMATE $315K 8 wallets 74 SOL, CAPDOG 66, GOBLO 67, The Last Agency $748K 34 SOL, the rest 1–19 SOL). 74 wallets early on 2+ coins, 38 on 3+; the top repeaters (14–15 of 43 coins) buy 0.05–0.2 SOL each, net ≈ 0 — mass sniper bots, present on the copycats that died as well (34% of early wallets vs 48% on the ones that ran). One big-money repeat: BwWK17… 13–460 SOL within 0–3 s on 7 of 43 (Pump Bara, Trump One, explosion, nudge, fvckisrael, FREE DUMB, To the Moon), selling 1–9 s later, no creator link — flip bot or router. Snipers do not ride the run. The grouping had merged 91 coins into one "operator" (52%) through these snipers and through payout addresses shared by 5+ coins (plumbing). 0.7.5 (replayed on the real data): snipers out of identity (early on ≥ 3 coins, not creator-linked), payout links capped at 4 coins, link kinds counted once each; result A9Venj 8/8 (42 SOL bundles, best Punani $479K), GG5ATP 5/8 (26 SOL, Punchdog $419K), 74.3%/68 SOL signature 6/6 (The Last Agency $748K), BigrT9 3/10; plus a snipers table (338 wallets). Denominators are winners-only until every tracker launch's creator is traced to its funder (proposed step 3, ~6,500 lookups). Opinion given to owner 20:40 UK: the 79.31%/85 SOL operator's coins are already known untradeable on real fills (BL/GR2/S8: 13 live legs, 0 won); the database is worth it only if organic launchers repeat; order: finish 213 → grouping fix → true denominators → watch funders of any operator with 5+ launches and 40%+ → OP paper book (entry min 2–5 after the bundle sells, 1.5x/−30%, judged at 40) → sniper dud counts.
- **3 Nov 20:20 UK — 0.7.3 cap worked (5,000 txs a coin) but a census coin still takes 20–40 min; 0.7.4 proposed (waiting for "go").** 43/213 done. KAI (600 pages) took 78 min; the 50-page coins take 20–40 min, so the pages are not the cost. The fixed cost is the first-100-buyers profiling: the "first transaction" scan (getTransactionsForAddress asc limit 1) on trading-bot wallets with 100K+ transactions times out at 30 s and retries up to 5 times. 0.7.4: wallets with 1,000+ transactions take their funder/age from the Helius wallet-API funded-by index (already used by the operator tracing); per-phase timing (gmgn/pages/wallets ms, heavy-wallet count) recorded in status.json and each row; 3 coins studied at once (LAUNCH_STUDY_PARALLEL); the VA backfill remembers scanned coins (vol_bf_done) instead of restarting from zero on every deploy. VA book so far: MAMESUKE (26 h, $149K/5 min at $1.88M mc) peak 1.43x, half-at-2x exit +13%; Sweet Onchain, Anakin (4–5 days) open; backfill King of Larp (22 Oct) 3.08x peak then −36% on the exit.
- **3 Nov 12:58 UK — census study too slow; 0.7.3 proposed (waiting for "go").** 31 of 213 census coins ($100K+, migrated, last 60 days) studied. A runner does 50–100 transactions a second early on, so the full 40-minute read is ~600 Helius pages, ~6,000 credits and 20–40 min a coin (2 an hour, ~4 days, ~1.1M credits against the 250K/day cap). Fix: census coins stop at 5,000 transactions (LAUNCH_STUDY_CENSUS_MAX_TX) — the creation block, the snipers and the first 100 buyers (all the operator tracing uses) sit inside the first minute even on the busiest coin; vol5/wash become partial for those coins (covered_s records how much was read). Expected: remaining 182 coins in ~6 h, ~110K credits. VA backfill: 267/1,500 scanned, 0 entries (biggest peaks first, usually above $2M when they trade $100K/5 min); the October candle pull (2,022 graduated coins) had 25 coins with a ≥$100K 5-min candle at 12h+ and under $2M, so entries are expected from the mid-size coins. Live VA poll: 180 polls, max 5-min volume seen $259K, no entry.
- **31 Oct 19:10 UK — copycat study, first run (11 coins: 6 runners, 7 controls/ours; method as above).**
  - **The two biggest runners were wash-traded (volume bots).** Measured on the chain, not inferred from labels:
    - No Kings Hsdhmq ($505K):
      - 3,113 buys and 2,980 sells in 15 min, but only 254 different buyers.
      - 235 wallets bought and sold at least twice each, making up 99.6% of the volume. 95% of all volume was round trips.
      - 80 of the first 100 buyers were funded by the same wallet. Only 3% of buyers were organic, carrying 0% of the SOL.
      - It traded ~700 SOL every 5 min for 25 min, while new buyers per 5 min went 245 → 8 → 1 → 4 → 1.
    - Saved By Starlink 3UYjKk ($78K):
      - 88 of the first 100 buyers came from one funder, and 94.5% of the volume came from wash wallets. Organic buyers 8%, with 0.1% of the SOL.
      - The creator bought 8.65 SOL and sold 94%. The creator had made 57 coins before. The coin is now ~$0.
    - The two "just use Pumpfun" coins (small launchpads): 75–96% of buyers came from one funder, the median buy was 0.005 SOL (micro-buy spam), and wash share was over 90%.
    - **Conclusion:** 4 of the 6 "runners" had made-up volume, and their peak market caps were not set by traders.
  - **The two genuine runners are both pump.fun coins with a bundled launch and a real crowd.**
    - 3c7T9i No Kings ($129K) and 3mBnUo Saved By Starlink ($62K):
      - 12 wallets bought 13.7–15.0 SOL (~$1.4K) in the creation block, plus a 0.6–0.8 SOL creator buy and 16–25 snipers in the first 3 s (7–8 SOL).
      - Then 190–235 different buyers in the first minute (82 SOL) and 442–514 in 5 min (149–207 SOL).
      - Organic buyers were 57–63% of the first 100 (52–54% of the SOL). Fresh wallets 3–4%, funder clusters 0–3%, wash 4–14% of volume.
      - They peaked 2–3 min after creation and graduated. Early insiders sold 54–84% of their tokens within 15 min.
  - **The pump.fun copies that did NOT run look the same at the start:**
    - FqzNve $23K, 4XtcKA $18K, aZB283 $21K and EMY9ya $17K each had:
      - 12–13 creation-block wallets with 13.7–15.5 SOL;
      - a 0.7–1.3 SOL creator buy;
      - 6–14 snipers;
      - 106–434 different buyers.
    - They peaked within 30–90 s, then went back to the starting price within 5 min. Insiders sold 70–96% within 15 min.
  - **The measurable difference between runner and non-runner was net buying in the first 5 minutes.**
    - Buy SOL minus sell SOL: runners +80 SOL (both). Non-runners +3 to +16 SOL.
    - Market cap at 5 min: runners 411–423 SOL; non-runners back at 28 SOL.
    - Timing after the post doesn't separate them (runners 4.6 and 9.6 min, non-runners 0.5–4.6 min). The creation-block bundle doesn't either: every copy that drew 100+ buyers had one.
  - **The block-0 wallets differ every time.** No creation-block wallet appears in more than one coin, so these are each creator's own bundle wallets, not a shared sniper group.
  - **Ours vs theirs.** Every pump.fun copy that drew traders had a ~14–15 SOL bundle across 12 wallets plus a 0.6–1.3 SOL creator buy. Ours had a single 0.1 SOL buy, and none drew a crowd.
    - Hypotheses, NOT tested: our 0.1 SOL is invisible to the "new coin" feeds and sniper bots, which react to early buying; and our mint addresses don't end in "pump", as pump.fun-website coins do, which some feeds may filter.
  - **Data caveats:**
    - 1 run, 6 runners, 2 posts with genuine runners.
    - On four pump.fun coins made by serial launchers (93eW4L and 5QBwQ7: GMGN creator launches 1,935; 3hvD7n: 241), the trade events decode the SOL amount as ~0. Buy counts there are right, but SOL figures are not.
    - Balance-change market caps for 0.005-SOL micro-buys are unreliable (fees and rent swamp the price).
- **3 Nov 10:05 UK — Axiom KOL / FOMO / Pump App leaderboard pulled (owner's Chrome, logged in) and tested against the study.**
  - Source: Axiom's Trackers → KOLs tab calls `api8.axiom.trade/smart-money-traders?source={kol|fomo|pump}&window={24h|7d|30d|all}`. 384 rows saved to reports/wallets/axiom_smart_money_2026-11-03.csv: KOL 188, FOMO 100, Pump App 96; 376 with a verified Solana address. The "Axiom" filter on the page is a tag on KOL rows, not a fourth list.
  - **FOMO traders have verified Solana addresses here** (frankdegods 498g1r…, Rowdy CzU8Ma…), which answers the 22 Oct dead end in FOMO.md: fomo's own API gave custodial addresses; Axiom resolves the real ones.
  - 86 of the 369 Axiom wallets were already in the GMGN harvest (18,455 wallets, 19–30 Oct). jacksneth 12 early wins / 18 coins; flipski77 (Cented) 10 / 19, GMGN-tagged wash_trader.
  - **Test on the 62 pump.fun coins of study v7** (23 runners, 39 copies that died): did an Axiom-listed trader buy in the first 100?
    - no Axiom trader: 28 coins, 14 ran (50%);
    - ≥ 1 Axiom trader: 34 coins, 9 ran (26%); ≥ 2: 19 coins, 4 ran (21%); ≥ 3: 10 coins, 2 ran (20%).
    - **Coins the KOLs bought ran LESS often.** 14 of the 23 runners had no listed trader in their first 100 buyers, including the genuine Regretamine $312K coin's first 100 (chestererer and fnmilito appear in the 101+).
  - **How the KOLs trade these coins:** 68 buys, median entry +11 s after creation (45 of 68 within 15 s), median first sell +37 s. Where they sold inside 40 min (66 of 68): +46.7 SOL in total, 35 of 66 won. They are snipers who flip the bundle spike, not holders. Following them at their entry is impossible (we'd be 10–30 s behind, into their sell).
  - **Conclusion:** the Axiom/FOMO/Pump leaderboard wallets are a sniper signal, not a runner signal, on this data. No paper book built on them. The list is kept and will be matched against every new study coin automatically so this re-tests itself.
- **3 Nov 09:30 UK — full diagnosis (data to 09:10 UK; owner asked "full diagnosis of our website and what we're doing").**
  - **Health:**
    - launcher 0.6.3, paper mode, online. pm2 restarts 154 → 158 since the 19:34 UK 1 Nov deploy, the last at 23:40 UK 1 Nov, stable 33 h since.
    - X stream connected (7 reconnects; 231 posts since 06:01 UK today).
    - GMGN 47,803 calls with 0 errors and 0 rate limits.
    - Helius: study 115.6K credits since 1 Nov 19:01 UK (31.6K today by 09:10), runner-follow 19.1K today.
    - **AI naming failed on 16 of 118 calls (14%)** with "URL disallowed by robots.txt": the image link can't be fetched by the Anthropic API, so those posts fall back to the word rules.
    - Wallet 0.5145 SOL, nothing open. The tracker, executor, fomo and radar apps are stopped by choice.
  - **Posts and runners:** 350 posts named in total.
    - 1,011 copycats priced; 46 credible runners (peak ≥ $30K and ≥ $25K at 5 or 15 min) on 14 of 145 posts that had copies.
    - Runner posts: elonmusk 10, Pumpfun 2, WhiteHouse 1, a1lon9 1.
    - Launchpads: Meteora 17, pump.fun 15, unknown 14.
  - **Data problem:** GMGN one-candle wicks and non-standard supplies still give impossible "peaks" ($23M Anakin, $13M Regretamine 9uH2Yq, $132M+ American Dividend). They show on the page's "Copycats that ran" table and need a close-based peak.
  - **Study v7 (164 coins), medians:**

    | Group | n | net 1 min | net 5 min | buyers at 5 min | bundle (block 0) | snipers | round trips | organic | biggest funder group | KOL | smart money |
    |---|---|---|---|---|---|---|---|---|---|---|---|
    | pump.fun runners | 23 | +43.6 SOL | +58.5 SOL | 598 | 12.1 SOL | 14.8 SOL | 74% | 33% | 3 | 10 of 23 | 19 of 23 |
    | pump.fun copies that didn't run | 39 | +13.2 | +6.5 | 205 | 3.0 | 9.2 | 77% | 49% | 6 | 15 of 39 | 24 of 39 |
    | Meteora/other runners | 76 | +9.7 | +12.5 | 230 | — | — | 87% | 5% | 78 | — | — |
    | Meteora/other non-runners | 23 | +10.4 | +17.3 | 241 | — | — | 92% | 7% | 62 | — | — |

    - **On pump.fun, net buying in the 1st and 5th minute and the number of buyers separate runners from the rest; KOL/smart-money presence does not.**
    - **Meteora runners and non-runners are indistinguishable** (one-operator coins, ~6% organic). Nothing on chain predicts which of them goes up.
  - **Paper results** (31 Oct 19:27 – 3 Nov 06:40 UK, after costs):
    - RF30, 14 trades: 1.5x/−30% +3.8%, median +10.5%, 7 won; without the best trade +0.9%; halves +8.0 / −0.4.
    - RF50, 11 trades: 2x/−50% +9.8%; without the best +1.8%, without the top 3 −20.2%.
    - RF50W, 35 trades: every exit negative.
    - V300, 26 trades: every exit negative (best −10.6%).
    - V500, 5 trades: −3%.
    - Holding: −55% to −95% on every book.
  - **Verdict:** no book is proven. RF30/RF50 are near break-even on 11–14 trades (one or two coins decide the sign). The volume books lose, as E did. Keep paper; go live with nothing.
  - **Proposals** (awaiting go):
    - (a) fix the AI image fetch by downloading the picture and sending it as data;
    - (b) close-based peaks on the page;
    - (c) a new paper variant RF-E: net ≥ 30 SOL by 1–2 min and ≥ 400 buyers by 5 min, pump.fun only, 1.5x/−30%;
    - (d) stop V300 / V500 / RF50W and the old first/strongest copy picks to save calls;
    - (e) the subscription review on 7 Nov: Pinata is only needed for live launches.
- **1 Nov 19:46 UK — fixes 0.6.1–0.6.3 (owner's go 18:59 UK), checked on the server.**
  - The study and runner-follow now read the coin's own address, so PumpSwap and other pools after graduation are included.
  - Pages are turned into small trade records at once, so memory stays low.
  - Only succeeded transactions are fetched, up to 60,000 per coin.
  - No crash since 19:01 UK: pm2 restarts 150 → 154, all four from deploys. Three study runs of 12 coins each completed.
  - Coverage of the first 40 min:
    - full on every coin except Regretamine Dbyy9L (60,000 succeeded transactions in its first 11 min, so it is covered to 655 s);
    - Regretamine 5ZxTxQ is now covered to 2,385 s.
  - Regretamine Dbyy9L re-measured: at 5 min 975 buyers and +75.8 SOL net, organic 41%, round trips 68% (the old curve-only view had frozen at 79 buyers).
  - Helius credits today ≈ 55K (study) + runner-follow.
- **1 Nov 18:50 UK — 24-hour check-in (data to 18:38 UK).**
  - **Posts:** 92 posts named since 18:27 UK 31 Oct (76 paper, 16 skipped): elonmusk 64, WhiteHouse 20, a1lon9 5, Pumpfun 3. 544 copycats priced.
  - **Runners:** 32 credible runners (peak ≥ $30K and ≥ $25K at 5 or 15 min) on 10 posts. Copies whose "peak" is a one-candle wick at creation are excluded.
    - Biggest: Regretamine (elonmusk, 12:50 UK 1 Nov): 90 copies, 13 runners.
      - The genuine one is pump.fun Dbyy9L: made 25 s after the post; $131K at 5 min, $160K at 15 min, peak $312K at 19.8 min, still $112K at 18:38 UK with 1,549 holders.
      - The Meteora GAdoW8 (made 23.5 min after the post) peaked at $1.68M at 12.7 min and is now $0.
  - **Study groups** (62 coins, v4; medians):
    - pump.fun runners (9): net buying at 5 min +63.9 SOL; 442 buyers; bundle 14.4 SOL; round trips 50%; organic 57%; biggest funder group 3. KOL wallets on 3 of 9, smart money on 6 of 9.
    - Meteora/other runners (45): net +15.5 SOL; round trips 90%; organic 6%; **biggest funder group 77** (one wallet funded ~77 of the first 100 buyers). KOL on 0 of 45, smart money on 1.
    - pump.fun copies that died (5): net +6.5 SOL; organic 63%.
  - **Paper results** (scored 2 h after entry, after costs; small samples):
    - RF50, 5 trades: half at 2x + trail +12.3% (median −36%), 2x/−50% +2.1%, 1.5x/−30% −5.1%, hold 60 min −94%.
    - RF30, 7 trades: **1.5x/−30% +8.0%, 4 of 7 won, without the best trade +2.4%**; the other exits are negative; hold −91%.
    - RF50W (keeps wash-traded copies), 21 trades: every exit negative (−8.6% to −19.4%); hold −51%.
    - V300, 9 trades: every exit negative (best 1.5x/−30% −2.5%); hold 2 h −47%. V500: 1 entry, not scored yet.
    - **Holding loses 50–95% on every book; only quick exits come out near or above zero.**
  - **Problems found:**
    - (1) The launcher ran out of memory, with 150 restarts (pm2) and the last at 18:37 UK. The study and runner-follow load up to 15,000 full transactions at once against a 256 MB limit. Counters reset on each crash, and checks due during a restart were skipped.
    - (2) The runner-follow reads only the bonding curve, so a copy that graduates within 2 min goes blind after graduation. Dbyy9L (the $312K genuine runner) showed the same 79 buyers / +85 SOL at every check, and RF never bought it; Ae6TX5 likewise. Fixed 0.6.1–0.6.3 (see 19:46 UK).
- **1 Nov 11:10 UK — what the creation-block ("bundle") wallets made** (study v4, 9 pump.fun coins with a bundle, gross SOL within the first 40 min, before fees):
  - The bundle is always 12–13 wallets, 13.7–23.7 SOL, plus a creator buy of 0.55–1.32 SOL. On GMGN, every one of these creator wallets is new (0–1 launches).
  - Bundle in → out, runners: No Kings 13.7 → 47.9; Saved By Starlink 15.0 → 41.4; Spam 14.4 → 33.3; Anubis ($96K) 23.7 → 46.5; Dopamine ($46K) 23.3 → 20.4 (the only loss).
  - **Bundle in → out, the copies that "died": 13.7 → 47.0, 15.5 → 37.5, 14.7 → 22.8, 15.4 → 30.1, i.e. 1.5–3.4x.** The creator's own buy also came back at 2.5–4.6x on every one.
  - Snipers (first 3 s, after the bundle) roughly broke even or lost on 8 of 9 coins (e.g. 7.8 → 3.1 and 7.0 → 3.8 on the two genuine runners).
  - No Mames (a serial creator with 78 launches, no bundle): 6 creation-block bot wallets 8.7 → 18.3; 27 snipers 23.3 → 32.9.
  - **Conclusion:** the bundle wallets profit from the first 30–90 s spike whether or not the coin runs, by selling into the first-minute buyers. A coin that keeps running is extra, not the requirement. For a buyer, the first minute is where the money is taken; only after the bundle has sold (minutes 3–5) does the coin's own demand show. That supports RF's 2–10 min entry, not an earlier one.
  - Owner, 1 Nov 11:01 UK: "to launch a coin you need a professional setup … fresh wallets, wash trade … capital … they keep doing it until one narrative kicks off." The data agrees on capital and setup (~15 SOL a launch). On fresh wallets it doesn't: fresh wallets were 3–4% of buyers on the genuine runners. And the operators don't need one narrative to "kick off" to make money: the bundles came out ahead on 8 of 9 coins.
- **31 Oct 19:50 UK — study re-run (v4: zero-SOL pump.fun trades now take the SOL from the wallet's balance change), 16 coins incl. 3 new runners on a "Spam" post.** Net buying in the first 5 min (buy SOL − sell SOL), round-trip share, organic share:
  - genuine pump.fun runners 3c7T9i +79.6 SOL (514 buyers, rt 41%, organic 63%) and 3mBnUo +80.3 (442, 26%, 57%);
  - Spam 5h66ry ($52K, pump.fun, 12-wallet bundle 14.4 SOL) +43.0 (548 buyers, rt 74%, organic 40%) — mixed;
  - wash/micro-buy runners: Spam 8KNRh8 ($43K) +96.2 with 1,189 "buyers", median buy 0.006 SOL, rt 98%; FkSuZg +60.8 (rt 92%); Hsdhmq +22.7 (rt 95%); 3UYjKk +7.4; 7fBMgS ($67K) +8.5 (rt 80%); GMLmSo +3.8;
  - pump.fun non-runners of the same posts: +2.8 to +16.0 SOL.
  - **GMGN KOL wallets: 0 on all 9 runners; smart-money wallets: 0 on 8, 5 on Spam 5h66ry.** (Owner, 19:29 UK: wash volume is "part of the game" and draws big callers — to be tested by counting KOL/smart wallets on every runner; RF50W keeps wash-traded copies in so the paper results decide.)
  - Helius credits used today: study 7,592; runner-follow 4,300.
- **31 Oct 19:25 UK — runner-follow paper test started (0.5.0/0.5.1):** RF50 (net ≥ 50 SOL, ≥ 300 buyers, rt < 60%, median buy ≥ 0.02), RF30 (≥ 30, ≥ 200, same filters), RF50W (≥ 50, ≥ 100, no wash filter), checked at 2/3/4/5/7/10 min after each copy is made; scored 2 h later with five exits incl. half at 2x + 40% trail. On tonight's numbers at 5 min, RF50 would take both genuine runners and skip the wash ones; RF50W would also take 8KNRh8 and FkSuZg.
- **31 Oct 18:50 UK — V300 / V500 started.** In the first 11 polls (18:45–18:57 UK) the highest 5-min volume on all of Solana was $161K. $300K+ is rare at these hours.

## What the owner said
- 31 Oct 17:49 UK: "analyze … all the tokens that we bought … I want to see the copycats … any runners … highest market cap."
- 31 Oct 18:06 UK: "We need to know the prices of the copycats."
- 31 Oct 18:20 UK: "identify why were they different to us … bundled wallets? wash trading? sniping? fresh wallets? genuinely traders buying?"
- 31 Oct 18:21 UK: paper trade for now, research first; "it looks like we have to copy trade the actual runner"; look at 5-min volume; touch base in 1–2 days.
- 31 Oct 18:41 UK: paper trade any coin with 5-min volume of $300K and of $500K, under $1M, any age.
- 31 Oct 19:22 UK: go for the runner-follow paper test ("find the coins that ran and buy in early").
- 31 Oct 19:29 UK: "I haven't got nothing against washbots … part of the game … don't look at that in a negative way for your analysis."

## Open items
- ~~Fix the ~0-SOL decoding~~ done 0.5.1 (19:28 UK): SOL taken from the wallet's balance change; those coins' market cap from the curve stays 0.
- Keep the hourly study running and re-read with more posts (need ≥ 20 genuine runners before any rule).
- Full check-in scheduled for 1 Nov 19:00 UK.
