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
- **31 Oct 18:50 UK — V300 / V500 started.** In the first 11 polls (18:45–18:57 UK) the highest 5-min volume on all of Solana was $161K. $300K+ is rare at these hours.

## What the owner said
- 31 Oct 17:49 UK: "analyze … all the tokens that we bought … I want to see the copycats … any runners … highest market cap."
- 31 Oct 18:06 UK: "We need to know the prices of the copycats."
- 31 Oct 18:20 UK: "identify why were they different to us … bundled wallets? wash trading? sniping? fresh wallets? genuinely traders buying?"
- 31 Oct 18:21 UK: paper trade for now, research first; "it looks like we have to copy trade the actual runner"; look at 5-min volume; touch base in 1–2 days.
- 31 Oct 18:41 UK: paper trade any coin with 5-min volume of $300K and of $500K, under $1M, any age.

## Open items
- Fix the ~0-SOL decoding on serial-launcher pump.fun coins (new trade path?).
- Keep the hourly study running and re-read with more posts (need ≥ 20 genuine runners before any rule).
- Full check-in scheduled for 1 Nov 19:00 UK.
