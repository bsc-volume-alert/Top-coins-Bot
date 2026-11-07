# Controlled research loop — plan draft, 7 Nov 2026 15:50 UK (for owner + Codex review; nothing here changes the bot)

## 1. Purpose and scope
Keep looking for a trading edge in a way that cannot fool us. Two workstreams stay separate:
- **(A) $100K detection** — predicting later $100K crossings (reports/analysis/100k).
- **(B) Profitable trades** — after-cost returns of entry and exit rules (this plan).

A detection pattern is never promoted straight into trading. A positive backtest is never promoted straight into live trading.

## 2. Where we are (facts, 7 Nov 15:50 UK)
- **Development data:** branch `entry-package-7nov`.
  - uncapped histories of the 1,247 entered coins
  - snapshot 3 (11:54)
  - latest export (14:53)
- **Independent analysts (brief reports/blind/BRIEF_7nov.md rev 4):**
  - Claude: branch `blind-fable-7nov` @ 96bda1bf, frozen 15:19 UTC. "No profitable rule supported". MIG300 frozen as the required forward rule, with its own prediction that it fails. Found ~1.1M exact duplicate rows.
  - Codex: "none supported", frozen 15:22:48 UTC (commit b06fa89f… in its own environment; push failed; text to be published verbatim).
  - Gemini (Jules): running.
- **Evaluator:** `eval-1.0`, frozen on branch `blind-eval-1.0` @ d5085efd. 14 unit tests pass. Hidden test: launches created 8 Nov 00:00 → 10 Nov 00:00 UTC.
- **Not yet done:** cross-review of the analysts' reasoning (once all three are in), and the scoring of the frozen rules after 10 Nov.

## 3. Costs by position size (the bar any rule must clear)
| Stake | Fixed 0.0015 SOL | + curve fees (1.25%/leg) | + pool fees (0.30%/leg) |
|---|---|---|---|
| 0.2 SOL | 0.75% | ≈ 3.25% round trip | ≈ 1.35% round trip |
| 0.02 SOL | 7.5% | ≈ 10.0% round trip | ≈ 8.1% round trip |

All figures are before price impact and slippage, which come from the reserves at fill and exit. The pool fee is an assumption (creator-fee tier not stored); every score is also reported with the pool fee at 1.25%. At 0.02 SOL the fixed cost alone is a heavy handicap.

## 4. Step 1 — use what we already have (no new blockchain collection)
**Verified in code:** the tracker stores every trade of every RETAINED launch (bundle tier-1, or gross buys ≥ 15 SOL). It writes the buffered history at promotion and every later trade, and has no deletion. Pool trades: retained launches from 6 Nov 19:31; every launch for 24 h from 7 Nov 09:47.

- **1a. Export all retained-launch histories** for the development window and, after 10 Nov 02:00 UTC, the test window. This uses the existing read-only exporter (supp-export) with the mint set changed from "entered coins" to "retained launches". It is broader access to existing data, so **no Helius credits**; the costs are disk space and GitHub size. **Needs the owner's go** (small export-code change).
- **1b. Coverage verification before any analysis.** Per mint:
  - rows exported vs database count
  - retention start and end
  - pre-promotion buffer (≤ 12,000)
  - feed gaps and outages over the life of the mint
  - duplicate fingerprints
  - pool evidence present or absent
  Coins whose coverage cannot be shown are reported as uncertain, not dropped.
- **1c. Derive what the trades already contain**, at no extra cost:
  - buyer-cohort holdings and selling (who bought in the first N seconds, and how much of it they still hold at each time)
  - concentration among on-chain buyers
  - absorption (sell volume vs new-buyer volume)
  - creator and early-wallet selling
  These are computed only from trades received by the decision time.

## 5. Step 2 — add new information selectively (only after Step 1 shows a specific gap)
Each addition must name the question it tests, its expected coverage and its measured cost, and is approved separately.
| Priority | Addition | Question it tests | Source / cost |
|---|---|---|---|
| 1 | Execution evidence | Does the replay match what fills would really get? | Jupiter quote shadows at decision and exit (exists in part: fd_quotes); real fills only if live is ever re-enabled |
| 2 | Buyer-cohort holdings beyond trades | Do holder counts / top-10 shares add anything beyond the trade-derived cohort? | GMGN holder snapshots: API cost to be measured |
| 3 | Credible wallet-group provenance | Do linked funding groups (snipers, bundles, farms) predict losses? | Helius funding traces: credits measured per trace (~already used for creators) |
| 4 | Timestamped social / narrative | Does attention BEFORE the rise add anything? | Needs a source with first-seen timestamps (pump.fun API returns 403; Twitter API cost) |

Missing fields are reasons to investigate, not evidence that they hold an edge.

## 6. Earlier-entry research — a separate track
"Earlier" is not automatically better. Any entry before 60 s must respect:
- the actual receipt time of each trade (`recv_ms`)
- retention eligibility at that moment
- computation time
- a measured transaction landing delay

No fast entries reconstructed from buffered trades that the system had not yet received. This track starts only after Step 1 and gets its own frozen test.

## 7. Round protocol (repeatable)
1. **Development:** each analyst (Claude, Codex, Gemini, and the owner's own hypotheses) works on all data up to cutoff T.
2. **Freeze before T:** at most **one** rule per analyst per round, written to the evaluator interface, timestamped and published on GitHub.
3. **Test:** the next untouched period (48 h of launches plus the 2-h follow-up), scored by the frozen evaluator only. Once scored, that period becomes development data. It is never reused as a test.
4. **Multiple-testing control across rounds.** The overall false-discovery budget is fixed in advance, for example α = 0.05 split equally over the planned rounds (R rounds → 0.05/R per round), then Bonferroni over the rules within a round.
5. **Scoreboard (published):** every submission including rejected ones, unknown outcomes, intervals, the evaluator version, and the research cost of the round (credits, time, storage). Not just survivors.

## 8. Budget and stop rule
- **Per-round budget:** to be set by the owner. Step 1 rounds cost storage only; Step 2 additions have measured credit costs.
- **Pause rule:** after **3 consecutive rounds** with no supported rule, pause or change direction. This is a budget decision, not proof that no edge exists.
- **Promotion rule:** one supported round does NOT justify deployment. A supported rule goes to a paper book for ≥ 1 further untouched week. Live trading is discussed only after that, and only with the owner's explicit decision.

## 9. Decisions needed from the owner
1. Go/no-go on Step 1a: exporting all retained-launch histories (development window now; test window after 10 Nov 02:00 UTC).
2. Round length (proposed: 48 h test windows), number of planned rounds (proposed: 3), per-round budget.
3. Whether the proposal to read early trades from the tracker database instead of Helius (faster, fewer failed checks, fewer credits) should be reviewed. It changes the books' data source, so it would start a new measurement epoch.
