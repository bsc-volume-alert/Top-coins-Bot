# eval-1.1 cross-check
Data dir built from the all-coins export: symlinks to trades_part_*.csv.gz; tokens.csv = tokens_window.csv.gz[mint,create_ts,tier,finalized];
feed_gaps.csv = feed_gaps_all.csv.gz; outages.txt = the five outages in snapshot 3's MANIFEST (unix seconds).
Runs: python3 -I evaluate.py --data <dir> --rules rule_r0_h30.py --from 2026-11-06T07:40:00 --to 2026-11-07T03:22:00 --out res_H1.json
      python3 -I evaluate.py --data <dir> --rules rule_r0_h30.py --from 2026-11-07T03:22:00 --to 2026-11-07T20:00:00 --out res_H2.json
evaluate.py is the frozen file from branch blind-eval-1.1 (not copied here).
