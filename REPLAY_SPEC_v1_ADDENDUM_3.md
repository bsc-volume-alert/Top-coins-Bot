# Addendum 3 to REPLAY_SPEC_v1 — 8 Nov 2026 19:50 UK, before any replay return has been computed or seen

Source: Codex's review of the actual files at commit 8d14754 (19:41). Where this addendum differs from v1 or Addenda 1–2, it overrides them.

## C1. Coverage is modelled, not verified
"No logged feed gap" is necessary but not sufficient:
- Prices carried forward from a reserve state under A3 are labelled **MODELLED**.
- Coins classed as not reaching $100K under A5 remain **coverage-unverified**.

Reports must say this. Independent reconciliation (for example against an RPC signature list for a sample of mints) is a separate later task.

## C2. History length
- The latest eligible launch (8 Nov 15:00 UK) enters at about 15:05:16. With a 120-min hold and the 0.7 s sell landing, records are needed until about **8 Nov 17:05:17 UK**.
- The export's read cutoff is later than that (it runs after 19:45), so this is covered.
- Any position whose hold extends past the read cutoff is UNRESOLVED by construction. None is expected.

## C3. Migration
Migration preserves the holder's token quantity. A curve position that migrates keeps the same token count and continues on the pool at pool prices. **No conversion is applied.** This replaces "converts at the migration rate" in v1 §5.

## C4. Statistical strength of confirmation
The confirmation window (12 Nov 00:00 → 13 Nov 00:00 UK) gives only **six** 4-hour blocks. Bonferroni cannot make a six-block bootstrap reliable.
- **"Insufficient evidence"** is the expected honest outcome unless the effect is very large.
- If the owner wants a stronger test, the window can be lengthened before 12 Nov 00:00 UK, by a dated addendum and before any confirmation data is exported.
