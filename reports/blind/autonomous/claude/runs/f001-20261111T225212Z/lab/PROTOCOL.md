# Idea lab CL-L001 — "absorbed sell" entry (registered before results were read)
Run f001-20261111T225212Z. Written and committed while the simulation was running and before results.json was opened.

Hypothesis: a sizeable curve sell (>= 1 SOL) that is bought back within 10–30 s by >= 3 distinct new wallets, with price back at or above the pre-sell price, marks demand that can absorb supply; entering immediately after such an "absorbed sell" captures more net SOL after costs than entering at a fixed age on the same coins. Competing explanation: the condition only selects busy coins; busy coins still lose after costs (as in Codex L001/L002).

Candidate (one fixed rule, no sweep): first receipt time t with 60 <= age <= 1800 s, t >= retention, last received trade a valid curve state, such that some curve sell S with sol >= 1.0 received in [t-30, t-10] s has price_before(S) (state of the trade received just before S) <= price at t, and >= 3 distinct wallets (excluding S's wallet) bought on the curve between S and t. Control: first receipt time with age >= 60 s, t >= retention, valid curve state, no other condition.

Execution (owner common scenario, R4): frozen eval-1.1 run_launch unchanged; 0.2 SOL; buy lands +1 s; sell +0.7 s; curve 125 bps; pool 55 bps; 0.0015 SOL fixed; exit on 30 % trail of sellable net proceeds (p.x <= 0.7 * running high) or at 2 h; a landing state older than 30 s is reported as unavailable (fill) / uncertain (exit) by post-check, beside the raw evaluator category. Denominator: the C001 3,638 eligible launches (retained, six-interval outage exclusion), both halves.

Reported: attempted / filled / unavailable, total SOL, mean/median, win rate, share losing > 50 %, without best 1 and 3, uncertain exits separately, per half. Variants tried: none beyond candidate + control (one specification each). Best-3 removal is a stress test, not a veto.
