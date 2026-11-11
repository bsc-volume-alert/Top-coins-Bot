# Investigation 2 — 35801 launches old enough for a decision; 30253 decided; 5548 without a decision

| reason (first that fits) | launches | share |
|---|---|---|
| no trade processed by the tracker before 420 s (never entered the lifecycle) | 4355 | 78.5% |
| tracker restart: launch created before the new process started (not tracked by design) | 470 | 8.5% |
| tracker not receiving (restart) | 388 | 7.0% |
| before the clock checkpoint existed (trade-triggered cp=300 needs a trade after 300 s) | 234 | 4.2% |
| tracker event loop blocked through the whole 300–420 s window | 84 | 1.5% |
| in the lifecycle (early checkpoints written) but no clock row — UNEXPLAINED | 16 | 0.3% |
| launcher did not read a written clock row | 1 | 0.0% |

Split of 'no trade processed before 420 s': feed connected, no trade observed: 3798; feed gap in the first 420 s: 557

Note: the census 'peak/last market cap' fields cannot show whether a launch traded (24 entered coins and 1,849 out-of-band coins look untraded there), so they are not used as evidence.

Dated tracker event-loop stalls of ≥ 10 s on 9–10 Nov found in the logs: 83; ≥ 120 s: 46; total blocked time 3.4 h.
