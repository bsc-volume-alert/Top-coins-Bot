# Analysis pipeline (run on each /csv export)

```
unzip tracker_export_<date>.zip -d analysis/data && cd analysis && for f in [0-9]*.py; do python3 -I $f; done
```
(rename the dated files to `paper_trades.csv`, `token_life.csv`, `wallet_buys.csv`, `big_buys.csv`, `tokens.csv` first — `30_` writes `data/wide.pkl` used by `31_` and `32_`.)

## Rules every analysis must follow (learned the hard way on day one)
1. **Exclude `invalid=1` rows** (decode artefacts) before any aggregate.
2. **Never use closed-only subsets for exit statistics.** Open trades past their hold limit are dead tokens and restart orphans; the sweeper (v0.15.3) closes them at the real price. Until an export has `exit_reason='sweep'` rows for the period, treat exit averages as optimistic.
3. **Entry-time features only.** `buys`, `sells`, `mc_5m`, `mc_15m`, `buyers_5m`, `after_peak_*`, `graduated` are recorded AFTER entry — using them to "predict" is leakage. Entry-time columns: `entry_*`, `inflow_*`, `bundle_*`, `handoffs`, `tier`, `factory`, `dev_buy_sol`, `snipers`, `creator_*`, `hour_utc`, `bs_ratio_entry`, `buyers_entry`, `buys_entry`, `sells_entry`, `proven_entry`, `cluster_held_pct`, `vol5m_usd`/`vol1m_usd` (momentum).
4. **Honest replay beats paper exits for entry questions:** `token_life` checkpoints let you enter at +60s/+5m/+15m with only what was known then and measure forward peak / 1h / 2h value. Sparse checkpoints understate peaks, so forward "hit 2x" is a lower bound; forward 1h/2h value is exact.
5. **Costs:** assume 10% round trip on curve entries (1% fee each way + slippage + 1–2s latency on a moving curve), 5% on PumpSwap.
6. **Wallet "2x" is meaningless** (74% of early buys 2x from the floor price). Use 5x (base ≈25%) and 10x; exclude cluster wallets and 0-second buys.
7. **Creator "prior 2x" is meaningless** — use prior graduations.
8. **Any model: time-split (train early / test late), report AUC and the EV of the top decile on the test half only.** A within-sample rule that looks good is not a finding.
9. **Report sample sizes with every rate.** n<30 is an anecdote.
