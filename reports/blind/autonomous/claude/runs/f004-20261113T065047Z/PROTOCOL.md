# f004-20261113T065047Z — protocol (registered before any knowable-at-time outcome is read)

Task F004 (queue, R64): reproduce the Claude analyst's 11 Nov early-winners study from raw allowlisted data; state what is knowable-at-time and what is not.
Inputs: entry-all-20261107t2210 @ e678331 (16/16 checksums OK), blind-eval-1.1 evaluate.py sha f5686511… unchanged; study = analysis-fable-11nov @ cc20a2c, reports/analysis/entry_winners/fable_11nov/13_momentum_trades.py (sha 2b4d4faf…) and out/momentum_entries.csv (sha b45eb610…).
Dataset boundary: the study's population spans launches 6 Nov 07:40 → 8 Nov 15:00. Only rows whose mint is in the allowlisted census (created ≤ 7 Nov 20:00) were read (filter_study.py reads the mint column alone for every row and discards the rest unread): 782 of 1,319 study mints, 2,171 of 3,728 rows; 537 mints / 1,557 rows discarded without reading any value.

## Step 1 (done before this commit; counts and a reproduction, no new rule): the study's logic re-run verbatim on allowlisted raw trades
repro_momentum.py: study per-mint body and exits() copied character for character; input streamed by the frozen evaluator's reader (dedup by full fingerprint, event order). Result recorded in study_comparison.json: 2,171 / 2,171 (mint, trigger) rows present on both sides, every field identical to 1e-9 relative, every exit kind identical. The same logic over all 4,913 window mints with trades: 1,968 pass the study's screen (2,782 fail "tape ≥ 600 s", 163 fail "≥ 20 trades"), 1,956 BASE60 entries.

## Step 2 — knowable-at-time audit (statements, no numbers to tune)
Not knowable at the decision time in the study's simulation, each to be quantified in the README:
(a) chain time `ts` used for triggers and landings; the tracker sees a trade at recv_ms (receipt). Decisions must use receipt order (R4 / eval-1.1).
(b) population screen "≥ 20 trades and tape ≥ 600 s" is a FUTURE condition at a 60-s (or 195-s) decision: launches that die before 600 s are removed from every trigger's denominator (survivorship).
(c) "unresolved" positions valued at the last printed price × 0.985 — an unknown scored as a number (queue rule: unknowns are never a value).
(d) costs 1.5 % flat each way, no reserve-based price impact, no fixed fee, no staleness limit, fills on the next printed trade at its price.
(e) population = mints at least one paper book bought: a book decision is knowable at 60 s but the set is launcher-dependent and not derivable from the allowlisted files; the 782 window mints are used as given, and the full retained denominator (3,638) is reported beside them.
(f) 2-h horizon on a tape that stops at ~125 min of retention or earlier; "horizon" exits at px[-1] where the tape ended early are unknown, not held-to-horizon.
(g) GRAD (first pool trade) and pool-venue rows: pool capture before tracker 0.19.8/0.19.9 is partial and pool states lack evidence fields; eval-1.1 treats those fills as unavailable.
(h) t0 = first trade's chain time, not the census create_ts.

## Step 3 — knowable-at-time re-scoring (registered specs, no parameters chosen after seeing outcomes)
Frozen eval-1.1 unchanged (S1 CLI, pool 55 bps + 125 bps sensitivity) and the R4 scenario post-check (S2: state older than 30 s at landing ⇒ fill unavailable / exit uncertain), exactly as f006p2 / f009 / f010 / f011 / f003. 0.2 SOL; buy lands +1 s; sell +0.7 s; curve 125 bps; pool 55 bps; 0.0015 SOL fixed; 30 % trail on sellable net proceeds; 2 h cap. Denominator: retained, outage-free window launches (3,638), both halves (split 1794016200).
- F004-BASE60: enter at created + 60 s when the last received state is a usable curve state (the study's "what the books do" comparator, always-on).
- F004-RUN2 / RUN3 / RUN5: on each received trade with receipt time t, 60 s < t − created ≤ 900 s, enter when the received row's state is usable and its trade price ≥ k × p60, p60 = trade price of the last received usable trade by created + 60 s. First crossing only.
Pre-check (precheck_f004.json, counts only): BASE60 2,940; RUN2 568; RUN3 293; RUN5 128 of 3,638. Median receipt lag of the RUN trigger trade ≈ 0.80 s.
Registered expectation (from the study, to be checked, not tuned): RUN entries carry a lower share of >50 % losses than BASE60 and a higher per-trade net SOL; the study's positive RUN totals are expected to shrink or vanish once unknowns are separated and reserve-based costs apply. No claim of profitability is made in advance. Report per spec: attempted / filled / unavailable / uncertain / resolved, total, mean, median, win rate, share losing > 50 %, without best 1 and 3, both halves, iid bootstrap 95 % CI on the total; the same on the 782 study mints; R11 paired view RUNk vs BASE60 on launches where both resolve; the E control (f003: 679 / 419 / −10.011572) quoted as the register's reference, not re-run.

## Idea lab — CL-L009 "dump-and-recover" entry (unconventional; registered before scoring)
Hypothesis: the study's mechanism statement is that losses are one-block withdrawals that happen early; a launch that has ALREADY absorbed a ≥ 50 % drawdown and then recovered has fewer sellers left able to drain it, so entries after the recovery should lose less per trade and have a lower share of > 50 % losses than entries at the dump itself.
Eligibility (shared by candidate and control, R10): retained, outage-free window launch with a dump event = a received usable trade at 60 s < t − created ≤ 1,800 s whose trade price ≤ 50 % of the running high of received usable trade prices since retention. One entry per launch.
- CL-L009-CONTROL: enter at the dump event (receipt of that trade).
- CL-L009-RECOVER (candidate): enter at the first received usable trade after the dump whose price ≥ 1.5 × the post-dump trough (minimum received usable price since the dump), provided it arrives within 300 s of the dump; otherwise no entry.
Exit, costs, scenario: as Step 3. Pre-check (R54, counts only): control attempts 2,727 of 3,638 (75 %); the recovery condition binds on 738 (27 %) — testable (removes 73 %, inside 5–95 %).
Registered direction: candidate per-trade net SOL > control per-trade net SOL, and candidate share losing > 50 % < control's. Paired view (R11) on launches where both resolve; both halves; without best 1 / 3 as a stress test, not a veto. Verdict vocabulary: promising / weak / failed / inconclusive; nothing is called supported or profitable.

## Not done here
No parameter sweeps (k ∈ {2, 3, 5} and the 60–900 s window are the study's own; 50 % / 1.5× / 300 s are fixed before scoring); no change to the frozen evaluator; no protected data; no paid calls.
