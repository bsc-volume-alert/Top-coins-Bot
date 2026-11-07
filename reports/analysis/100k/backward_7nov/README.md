# Backward runner study, 7 Nov 2026 (development data — nothing here is a validated rule)
Inputs: launcher-data exports c36821d3 (6 Nov 19:14 UK, token_life 48 h), b971fcdf (6 Nov 23:56), 7add56e0 (7 Nov 08:42): token_life, tracker_tokens, runner_registry, fd_watch.
These commits were force-pushed off the branch; they exist in the analyst's local reflog only — a frozen copy must be published from the droplet's tracker.db before reproduction.
Run: back_build.py <dir> (labels → rows.pkl), back_an.py (60-s deciles), back_rules.py (rules), back_ret.py (paths), back_p2.py (windows, crowding, 5-min split), back_p3.py (corrected: $100K within 2 h, exclusions, three entry arms, Wilson CIs).
Results and their retraction: reports/books/LAUNCHER.md, entries 7 Nov 08:55, 09:00 and 09:10 UK.
