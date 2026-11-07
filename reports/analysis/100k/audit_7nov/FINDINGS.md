# $100K coverage audit — 7 Nov 2026 09:35 UK (export a3d7db4f, launcher 0.9.50; launches created 6 Nov 09:23 → 7 Nov 09:23 UTC = UK)
Full numbers: audit_out.txt (script audit.py; inputs coverage_mints / coverage_crossings / sol_usd .csv.gz here, sha256 in MANIFEST.txt).

1. Retention: 3,318 of 43,662 launches (7.6%) have kept trades; 40,344 have none → their $100K outcome is UNKNOWN under the strict rule.
2. Migration: 637 launches migrated (tracker flag); 421 retained; pool trades recorded for 191 (pool capture since tracker 0.19.6, ~20:00 UK, retained launches only).
3. Recorded crossings: 168. Not all are real:
   - the pump.fun curve completes at $37,019 at this SOL/USD (every retained migrated coin's curve max = $37,019); 37 of the 39 CURVE-venue crossings are on coins that never migrated — a curve price ≥ $100K without migration is impossible on the standard curve → price-decoding suspects (non-standard tokens; the same family as the registry's $100M–$2B peaks). 58 non-migrated retained coins show a curve max above $60K — same issue.
   - 36 crossings have a > 10× jump from the previous trade; 20 crossing market caps exceed $10M.
   - 127 of 168 crossings happen within 60 s of creation — already achieved before any 60-s decision (instant / concentrated launches; Codex 08:55 category).
   - Crossings AFTER 60 s: 41 (21 pool, 20 curve); 1 suspect jump; none over $10M. The genuinely "predictable" verified set in 24 h is therefore ~20 pool crossings plus whatever of the 20 curve ones survive a decode check.
   - SOL/USD sample age at crossing: median 54 s, max 119 s — no stale conversion.
4. Registry vs verified, coin by coin: registry flags 423 ≥$100K in the window; 168 verified here (all 168 are in the registry); 255 registry-only = 141 not retained, 111 migrated with no pool trades, 3 retained with max < $100K; 4 have registry peaks > $50M.
5. Primary outcome (2-h window, 41,653 mature launches): VERIFIED 116 (+32 with a suspect jump) · DETECTED only 252 · NEVER CROSSED 1,949 · UNKNOWN 39,304 (38,359 not retained, 834 tracker outage in window, 111 migrated without pool trades).

What this means:
- The verified $100K sample after 60 s is about 20 coins a day — too few to find patterns quickly, and smaller than the registry suggested.
- Two collection gaps decide the outcome for most launches:
  (a) POOL trades for EVERY migrated coin (~640/day), not only retained ones — the $100K run happens on the pool;
  (b) a structural rule to verify: a launch that never migrates cannot pass the curve's $37K completion, so non-migrated launches could be labelled NEVER CROSSED — valid only if the tracker's migration flag is complete for every launch and the coin is a standard pump.fun curve (decode suspects excluded). This must be verified before use, not assumed.
- Price-decoding suspects must be fixed or excluded before any study uses them as winners.
