# 4-hour study — not run yet

The first study runs after the data has started flowing to the `data` branch (every four hours from the box). It reads every A–D trigger since the price fix (18 Oct 20:25 UK), scores the strategy register on the trades that arrived after each rule was proposed, and writes its findings here.

## Strategy register
Three rules are registered to be judged on the next trades, not on the ones they came from:
- **S1** — sell at 3 minutes instead of 5 (from 84 post-fix trades: +10.1% vs +5.0%).
- **S2** — fewer than 65 wallets in the trigger minute (from 49 live coins: 72% win vs 38%).
- **S3** — one buyer took more than 10% of the trigger minute's buying (from 49 live coins: 75% win vs 36%).
Each needs 40 out-of-sample trades before a verdict.
