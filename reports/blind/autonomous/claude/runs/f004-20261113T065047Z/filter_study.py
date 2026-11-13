"""f004 step 0 — restrict the 11 Nov study's published entry table to the allowlisted development window WITHOUT reading any row of a launch
outside it. Only the `mint` column of momentum_entries.csv (analysis-fable-11nov @ cc20a2c, sha b45eb610…) is read for every row; the full row
is kept only when the mint is in the allowlisted census (entry-all tokens_window.csv.gz @ e678331, created 6 Nov 07:40 -> 7 Nov 20:00 UTC).
Rows of other mints (launches 7 Nov 20:00 -> 8 Nov 15:00, which overlap the test period) are counted and discarded unread.
Usage: python3 -I filter_study.py <tokens_window.csv.gz> <momentum_entries.csv> <out dir>"""
import sys, csv, gzip, io, json, collections, pathlib
tokens, entries, out = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
START, END = 1793950800, 1794081600
win = {}
with io.TextIOWrapper(gzip.open(tokens), newline="") as f:
    for r in csv.DictReader(f):
        c = float(r["create_ts"])
        if START <= c < END: win[r["mint"]] = c
kept, drop_mints, kept_mints, n_rows = [], set(), set(), 0
with open(entries, newline="") as f:
    rd = csv.DictReader(f)
    for r in rd:
        n_rows += 1; m = r["mint"]
        if m in win: kept.append(r); kept_mints.add(m)
        else: drop_mints.add(m)
with open(out / "study_entries_window.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=rd.fieldnames); w.writeheader(); w.writerows(kept)
summary = {"study_rows_total": n_rows, "study_mints_total": len(kept_mints) + len(drop_mints), "mints_in_allowlisted_window": len(kept_mints),
           "mints_outside_window_dropped_unread": len(drop_mints), "rows_kept": len(kept), "rows_dropped_unread": n_rows - len(kept),
           "entries_per_trigger_window": dict(collections.Counter(r["trigger"] for r in kept)),
           "window_mints_by_half": dict(collections.Counter("early" if win[m] < 1794016200 else "late" for m in kept_mints))}
json.dump(summary, open(out / "study_filter.json", "w"), indent=2); print(json.dumps(summary, indent=1))
