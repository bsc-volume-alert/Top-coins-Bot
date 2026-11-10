# 100K paper books — evidence package for independent audit (k100-audit-export 1.0)

Owner forwarded Codex's request 10 Nov 2026 20:40 UK. ONE-OFF, READ-ONLY export; no database, rule or record was changed; live trading OFF.

- Books: 100K1 = K30-50T25 ($30–50K at 5 min, 25% trail) · 100K2 = K30-40T25 ($30–40K, 25%) · 100K3 = K30-40T20 ($30–40K, 20%). Rule K-1. Each entry = 0.2 SOL + an INDEPENDENT 0.02 SOL position (own trail, i02_* columns).
- Activation (fd_rules K_ACTIVATION): 2026-11-09T21:48:43.000Z. Read cutoff: 2026-11-10T21:02:33.000Z. All times UTC (= UK in November). Epochs: trade-triggered 5-min reading (token_life cp=300) from activation; clock checkpoint (token_cp_clock, C5-2) read too from fd_rules K_EPOCH2 (see fd_rules.csv.gz; the launcher re-records its in-memory epoch2 on restart).
- Mint sets: entered = 83 distinct mints with a K position. Comparison = 346 decided mints NOT entered whose 5-min reading was $15K–$100K (any status). Trades for both sets are UNCAPPED, from the first retained trade through the read (post-exit follow-up included as far as captured).
- Trades: 2725753 rows in 5 part(s). Columns as stored + row_id (tracker rowid); order slot, ev_idx, rowid. No dedup, repair or derived price; raw prices only (price_sol as decoded; px_adj marks the decoder's own adjustment, if any). Per-mint reconciliation with COUNT(*) at read: 5 mint(s) differ (still trading during the read). Mints with 0 retained trades: 155 (21v6J6jYix45Fths6v5oNLDzDJNrXyFoMbDAiUiApump, 7Tw9KfqYbi3A3ENuHkws3CLBeq9Nf8df4QMkjZDppump, 9gNZB2AykXaWxQgFs5PbnEFNwEjMQpV6r8xiKogkpump, 9zgKYpYrrjY1GkLA6LF1hXQahWD1Nnt1SLkJ4mJepump, Aa52FKgwmjsgMXwZWWNCp83bwKwjQTu3wvesUqYBpump, E9TehaEqnHiPUm1ucbr13cLr6Fg4dfjUJZedYbR1pump, EDhfrwv57sPDeeduas3TAJrKEH67Sm8EofS54p9Kpump, F2qCYbvgjrcZiPX6Ma9UabMQoA7Ffob5pPCnp5ripump, FJ2tS7N8Z9rHXf3irns43qc87Q41Hg8eN61UpJvUpump, FNxnauVJo9Y39yf3NEgj6uTFcCzLHTiyNnDYCPagpump, Fn6h2hxWFgfgsMr7EhE9BUKoLNYp81HUoUysmAQMpump, GLeeS5nXmbG9GzzNhCEpuHDyBe18QVzS2rTXcEBgpump, z68Nv2CRghYz4XZzHSoE8pkHtiF1V83MjJ5ip2vpump, 5LCZtSCqjYRocjzyh1SZbs3EJKZ4v5LDu53Wo63vpump, 7HGGYfa9QMcXkvJDmHeRboLSE4W9aiQiWy2oqF2ppump, 8g5vALXX5U1C53jAM629L5s67XUq9dW4wVac71Rcpump, 9Rk9M1XLBLj4aKT7c8uSK8p4jxBAk4VshSVnQz3Lpump, GJZZYWz3ecGS3N7HVgqbpYqXFYiD8UHuVurJzJykpump, H7i2c7a3oK31Lahyc6gfquKY3P7BjQNKsgtDqiQSpump, JCaj6rnWnezc4FBHRkGnXVHG69TFCrJhognvvPxBpump, …).
- Pool pricing used by the simulator: vault balances + the pool account's virtual_quote_reserves (see reports/analysis/100k/replay_9nov/POOL_DIAGNOSIS.md on branch tracker); pool fees from the pool's own config.

## Files
- fd_rules.csv.gz — 35 rows. Every rule/epoch key with its start time (K_ACTIVATION, K_EPOCH2, book keys, older books' keys).
- decisions_kpaper.csv.gz — 30338 rows. EVERY K decision (one per coin, first usable reading): status = entered / out of band / late: … / clock reading not usable: … / no market cap / no creation time; books = the K books that entered; src = trade (token_life cp=300) or clock (token_cp_clock).
- positions_vol_paper.csv.gz — 187 rows. Book positions (id = vol_id = position id; strat = book; row = JSON of the decision inputs). 100K1=K30-50T25, 100K2=K30-40T25, 100K3=K30-40T20.
- positions_chain_fill.csv.gz — 187 rows. Simulated fills/exits per position (0.2 SOL s_* and the independent 0.02 SOL i02_* columns), reserves at check/fill/trigger/exit, timings (ms).
- launcher_export_fd_positions.csv — the launcher's own export as published on launcher-data at read time (fd_positions = all books; filter book K30-*).
- launcher_export_k_decisions.csv — the launcher's own export as published on launcher-data at read time (fd_positions = all books; filter book K30-*).
- census_tokens.csv.gz — 38083 rows. EVERY launch in the tracker census created from activation − 1 h. CAUTION: peak_mc_usd, last_mc_usd, graduated, finalized, socials/has_socials, fee and cluster columns are values AS OF THE READ, not as known at decision time.
- token_life.csv.gz — 305787 rows. All lifecycle checkpoints (15 s … 24 h) written from activation − 1 h (ts = checkpoint time, obs_ts = when written). cp=300 rows are the trade-triggered 5-min readings.
- token_cp_clock.csv.gz — 28324 rows. Clock 5-min checkpoints (tracker 0.19.10+, epoch C5-2): computed at create+300 (+2 s grace); status ok / uncertain: feed gap / ingestion lag / no-price / late-processed.
- feed_gaps.csv.gz — 692 rows. Socket open/close/idle/error events from activation − 24 h (capture gaps; nothing backfilled).
- sol_usd.csv.gz — 717 rows. SOL/USD samples.
- features_tracker_wallet_buys.csv.gz — 5503 rows. Buyer records at the moment they bought (ts = buy time). Mints: entered + comparison set.
- features_tracker_big_buys.csv.gz — 4929 rows. Large buys with age_s at the buy. Mints: entered + comparison set.
- features_tracker_creator_claims.csv.gz — 611 rows. Creator fee claims (ts). Mints: entered + comparison set.
- features_tracker_token_peaks.csv.gz — 425 rows. CAUTION: running peaks as of the read (not decision-time). Mints: entered + comparison set.
- features_launcher_fd_watch.csv.gz — 426 rows. Funded-dev watch: bundle/funder at creation (created_ts). Mints: entered + comparison set.
- features_launcher_creator_trace.csv.gz — 426 rows. Creator funding trace; CAUTION peak_mc_usd/graduated as of the trace/read. Mints: entered + comparison set.
- features_launcher_fd_early.csv.gz — 4077 rows. Early buyers (slot0, sec after create). Mints: entered + comparison set.
- features_launcher_buyer_funding.csv.gz — 1476 rows. Buyer funders (ts = when looked up; funded_ts = when funded). Mints: entered + comparison set.
- features_launcher_fd_wallet_state.csv.gz — 73643 rows. Wallet holdings snapshots (at = snapshot time). Mints: entered + comparison set.
- features_launcher_fd_decisions.csv.gz — 13552 rows. Other books' rule decisions on the same mints (at = decision time). Mints: entered + comparison set.
- features_launcher_fd_quotes.csv.gz — 386 rows. Quote checks (ts). Mints: entered + comparison set.
- trades_part_001.csv.gz — 672377 trade rows, 87 mints.
- trades_part_002.csv.gz — 609275 trade rows, 80 mints.
- trades_part_003.csv.gz — 722970 trade rows, 91 mints.
- trades_part_004.csv.gz — 643987 trade rows, 149 mints.
- trades_part_005.csv.gz — 77144 trade rows, 22 mints.
- trade_coverage_per_mint.csv.gz — per mint: role, rows exported vs in DB, curve/pool rows, first/last trade, follow-up seconds after creation, longest gap.
- ops_*.txt / ops_launcher_status.json — deployed commit and versions, pm2 restarts, restart log, the 10 Nov database-repair log, tracker stall/lag lines, deploy history, launcher status (timeouts, errors, push timings).
- code_* — the deployed K entry/exit/pricing code and books notes at read time.

## Known gaps and cautions
- Recording gaps (tracker stopped) during the 10 Nov database repair: 07:53:05–07:57:30 and 08:31:43–08:33:26 UTC; the tracker ran on a slow disk 07:57–08:31 (stalls possible). Rows 04:58:49–07:53:05 were RECOVERED from the damaged database into the live one (1,053,795 trades, 24,024 token_life, 2,585 clock rows; 0 unreadable) — row_id order therefore is NOT time order for that window; sort by slot/ts.
- Earlier capture gaps: feed_gaps.csv.gz. Trades exist only for launches the tracker retains plus pool trades of every launch for 24 h; non-retained coins have no curve history.
- Features: only what the databases recorded, with their own timestamps; columns marked CAUTION are as-of-read values and must not be used as decision-time knowledge. No wallet/social data was re-fetched.
- Not included: pump_buyers (no mint index — full scan avoided), launcher tables not listed. Errors while exporting: none.
