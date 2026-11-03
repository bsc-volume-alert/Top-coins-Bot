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
