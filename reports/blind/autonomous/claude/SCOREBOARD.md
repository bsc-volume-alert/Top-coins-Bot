# Claude research scoreboard
Branch research-claude; folder reports/blind/autonomous/claude/. Facts and counts only; no profitability claims. Live off.

| Run | Question | Executed result | Profitability | Next |
|---|---|---|---|---|
| f006-20261111T185410Z | F006 part 1 (detection): at matched age/market cap, do knowable buyer/ownership measures differ between later sustained-2x runners and non-runners? | 3,638-launch denominator (= C001); 16/16 data checksums; sustained2x runners 117/56/24 at 5/15/30 min; non-runners 1,249/1,107/906 (registered coverage rule) or 3,052/2,659/2,218 (declared tol30 variant); unknowns 2,044/1,795/1,521 (241/243/209 tol30). Matched 5 min (94 vs 460): buyers_last_60s AUC 0.79, inflow_persistence 0.78, n_net_holders 0.76, net_inflow_300s 0.76, early_buyer_sold_share 0.30, top10_holder_share 0.31, creator_sold_share 0.32 (median 0 vs 1), sells/buys 0.24; first-time/repeat/same-creator buyer shares not separated (AUC 0.43–0.53). cross100k runners 36/22/13, all late half, outcome weak as registered. | Not evaluated; no trading run; hypotheses only, generated on the data that produced them | F001 review of C001–C004; then F006 part 2 trading half with one preregistered specification through eval-1.1 |

Notes: tol30 (ignore main-feed gaps < 30 s) was added after seeing 2,044 unknowns under the registered rule and is labelled a sensitivity variant; runners are identical under both. Codex C009 positives (56/21/9) use a different (net-proceeds, 2 h) definition and were not re-run here. No protected data, no paid calls, no live or paper trades.
