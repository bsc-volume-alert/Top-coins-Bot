"""CL-L007 name / symbol reuse flags, knowable at creation from the census alone (tokens_window.csv.gz, path from env F006P2_TOKENS).
Definition = F002's (analyze_f002.py): census ordered by (create_ts, create_slot, mint); a launch is REUSED if its trimmed, case-folded name
or symbol was already used by an earlier launch in that order (any creator). Also: "copy of a retained coin" = some earlier bearer of the same
name or symbol had reached the 15-SOL retention screen BEFORE this launch's create_ts (retained_at from the published F002 launches.csv.gz,
path from env F011_F002_LAUNCHES — Claude's own artifact, reproduced exactly by the coordinator R45; counts only)."""
import os, csv, gzip, io, bisect, collections
_R = None
def flags():
    global _R
    if _R is None:
        with io.TextIOWrapper(gzip.open(os.environ["F006P2_TOKENS"]), newline="") as f: census = list(csv.DictReader(f))
        census.sort(key=lambda r: (int(r["create_ts"]), int(r["create_slot"]), r["mint"]))
        ret = {}
        p = os.environ.get("F011_F002_LAUNCHES")
        if p:
            with io.TextIOWrapper(gzip.open(p), newline="") as f:
                for r in csv.DictReader(f):
                    if r["retained_at"]: ret[r["mint"]] = float(r["retained_at"])
        seen_name, seen_sym = {}, {}   # key -> sorted list of retained_at of earlier bearers (None if never retained)
        _R = {}
        for r in census:
            n, s = r["name"].strip().casefold(), r["symbol"].strip().casefold(); c = int(r["create_ts"])
            reused = n in seen_name or s in seen_sym
            copy_ret = any(x is not None and x < c for x in seen_name.get(n, [])) or any(x is not None and x < c for x in seen_sym.get(s, []))
            _R[r["mint"]] = {"reused": reused, "copy_of_retained": copy_ret}
            seen_name.setdefault(n, []).append(ret.get(r["mint"])); seen_sym.setdefault(s, []).append(ret.get(r["mint"]))
    return _R
def is_new(mint): return not flags()[mint]["reused"]
