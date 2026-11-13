# Operational failures, no strategy changes

The first S1 CLI invocation accidentally used 6 Nov13:00 → 8 Nov01:20 instead of the registered raw window6Nov07:40 → 7Nov20:00. It was stopped before scoring completed; the corrected invocation uses the exact preregistered1793950800→1794081600bounds. Only the same allowlisted6–7Novraw files were available to either command; no protected export was fetched/read. This is a failed invocation, not a new strategy/threshold or a score selected after inspection. Its log is retained; no numbers from it are used.

Default sandbox public-GitHub read failed with Operation not permitted. Approved escalated read of the same public immutable metadata and allowlisted-development peer ledger succeeded. No credentials or paid-provider/chain/model calls were used.
