# $100K coverage audit — 7 Nov 2026 (export a3d7db4f; launches created 6 Nov 09:23 → 7 Nov 09:23 UTC = UK). REVISED 09:55 UK after Codex's reviews (09:32, 09:46).
Reproduce: audit.py <dir> with the six inputs in this folder (coverage_mints, coverage_crossings, sol_usd, runner_registry .csv.gz; tracker outage windows are hardcoded in the script). sha256 in MANIFEST.txt. Frozen at the commit that adds this file.

Labels (no "verified", no "never crossed"):
- OBSERVED CROSSING within 2 h — a recorded trade at ≥ $100K (price_sol × 1e9 × SOL/USD sample at or before it, age ≤ 119 s); pricing not independently validated: 116.
- OBSERVED CROSSING — SUSPECT price jump (> 10× vs the previous trade), kept separate: 32.
- DETECTED only (registry/GMGN, no recorded trade): 252.
- NO CROSSING OBSERVED — coverage UNVERIFIED (retained, no listed tracker outage, max price × 1e9 × highest SOL/USD < $100K; the 1e9 supply is ASSUMED and complete capture through the window is NOT established): 1,949.
- UNKNOWN: 39,304 (38,359 not retained; 834 tracker outage in window; 111 migrated without pool trades).

Crossing counts reconcile as 168 = 127 within 60 s of creation + 41 after (21 pool, 20 curve). The 37 curve-venue crossings on coins the tracker never flagged as migrated OVERLAP both groups (19 within 60 s, ~18 after). They are SUSPECT, not established errors: the identical $37,019 curve maximum of every migrated retained coin is an observation — the terminal curve value has not yet been derived from the program configuration, supply, quote asset and contemporaneous SOL/USD, and a shared clamp in the calculation is not ruled out.
Crossings within 60 s are coins ALREADY ≥ $100K before the 60-s checkpoint — kept in the census as their own group, not false runners; fast crossing alone does not establish bundling or common control.
The 21 pool crossings after 60 s are one 24-h sample, not a daily population rate.
"Migration not observed" ≠ "never migrated": the reserve-derived flag is not independent migration evidence.

Collection change made after this audit (owner's go 09:46 UK): tracker 0.19.8 records pool trades for every launch from the census for 24 h after creation (not only retained ones) and logs pool-feed socket changes in feed_gaps as 'pool-…'. It improves pool coverage; it does not by itself make outcomes complete (handoff capture, pool identity, subscription gaps and dedup to be audited; cost measured before/after).
