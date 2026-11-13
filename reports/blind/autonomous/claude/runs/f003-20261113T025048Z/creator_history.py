"""F003 creator-history conditions, knowable at THIS launch's creation (create_ts = decision time; the ~1-block optimism of create_ts is stated in
PROTOCOL.md / README.md). Inputs: the census (tokens_window.csv.gz, env F006P2_TOKENS) ordered exactly as F002 (create_ts, create_slot, mint),
and retention receipt times from Claude's published F002 launches.csv.gz (env F003_F002_LAUNCHES; reproduced exactly by the coordinator, R45).
For each launch m with creation time c and creator cr:
  n_prior        = number of in-window launches by cr ordered before m                       (history before 6 Nov 07:40 is invisible)
  prev_*         = the immediately preceding in-window launch by cr (None if n_prior == 0)
  gap_s          = c - prev.create_ts
  prev_retained_by_c = prev.retained_at is not None and prev.retained_at <= c   (retention receipt time, knowable at c)
Conditions (True = the filter REMOVES the launch):
  C1 prev_not_retained : n_prior >= 1 and not prev_retained_by_c
  C2 serial20          : n_prior >= 20
  C3 gap10             : n_prior >= 1 and gap_s <= 600
A launch with no in-window predecessor is removed by none of them (nothing to veto on)."""
import os, csv, gzip, io
_H = None
def hist():
    global _H
    if _H is None:
        with io.TextIOWrapper(gzip.open(os.environ["F006P2_TOKENS"]), newline="") as f: census = list(csv.DictReader(f))
        census.sort(key=lambda r: (int(r["create_ts"]), int(r["create_slot"]), r["mint"]))
        ret = {}
        with io.TextIOWrapper(gzip.open(os.environ["F003_F002_LAUNCHES"]), newline="") as f:
            for r in csv.DictReader(f):
                if r["retained_at"]: ret[r["mint"]] = float(r["retained_at"])
        last = {}; count = {}; _H = {}
        for r in census:
            cr = r["creator"]; c = int(r["create_ts"]); m = r["mint"]; k = count.get(cr, 0); p = last.get(cr)
            h = {"creator": cr, "n_prior": k, "prev_mint": p["mint"] if p else None, "gap_s": (c - int(p["create_ts"])) if p else None,
                 "prev_retained_by_c": bool(p and ret.get(p["mint"]) is not None and ret[p["mint"]] <= c), "prev_retained_ever": bool(p and ret.get(p["mint"]) is not None)}
            h["C1_prev_not_retained"] = k >= 1 and not h["prev_retained_by_c"]
            h["C2_serial20"] = k >= 20
            h["C3_gap10"] = k >= 1 and h["gap_s"] <= 600
            _H[m] = h; count[cr] = k + 1; last[cr] = r
    return _H
def of(mint): return hist()[mint]
