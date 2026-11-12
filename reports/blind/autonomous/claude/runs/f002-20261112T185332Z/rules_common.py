"""Shared knowable-at-time code for the CL-L006 rule files (control = eligibility E; candidate = E and >= 8 distinct slots in the last-60-s
curve buys). features()/eligible()/cell_of() are identical to f009/f010 rules_common.py; slots_last60() is the only addition.
Frozen eval-1.1 is imported for state_ok only. Creator from tokens_window.csv (known at creation); paths from env F006P2_EVAL / F006P2_TOKENS."""
import os, csv, gzip, io, collections, importlib.util
_EV = None
def ev():
    global _EV
    if _EV is None:
        p = os.environ["F006P2_EVAL"]; spec = importlib.util.spec_from_file_location("ev_frozen", p); _EV = importlib.util.module_from_spec(spec); spec.loader.exec_module(_EV)
    return _EV
_CREATOR = None
def creator_of(mint):
    global _CREATOR
    if _CREATOR is None:
        _CREATOR = {}
        with io.TextIOWrapper(gzip.open(os.environ["F006P2_TOKENS"]), newline="") as f:
            for r in csv.DictReader(f): _CREATOR[r["mint"]] = r["creator"]
    return _CREATOR.get(mint, "")
def fl(x):
    try: return float(x)
    except (TypeError, ValueError): return None
def iscurve(r): return r["venue"] == "curve" or not r["venue"]
MIN_BUYERS_60 = 5
MIN_SLOTS_60 = 8          # CL-L006, registered in PROTOCOL.md before scoring

def features(v):
    """Knowable features at v.t (None if no trades). Identical to f009/f010 plus slots_last_60s."""
    L = v.trades; k = len(L)
    if k == 0: return None
    last = L[k - 1]; t = v.t
    mint = last["mint"]; cr = creator_of(mint)
    bought, sold = collections.defaultdict(float), collections.defaultdict(float)
    buyers60 = set(); slots60 = set()
    for r in L:
        ts = fl(r["ts"]); w = r["wallet"]; tk = fl(r["tokens"]) or 0.0
        if r["is_buy"] == "1":
            bought[w] += tk
            if iscurve(r) and ts > t - 60: buyers60.add(w); slots60.add(int(r["slot"]))
        else: sold[w] += tk
    return {"last_is_valid_curve": bool(iscurve(last) and ev().state_ok(last)), "buyers_last_60s": len(buyers60), "slots_last_60s": len(slots60),
            "creator_sold_tokens": sold.get(cr, 0.0), "creator_bought_tokens": bought.get(cr, 0.0), "creator_on_tape": cr in bought or cr in sold}

def eligible(f): return f is not None and f["last_is_valid_curve"] and f["buyers_last_60s"] >= MIN_BUYERS_60
def candidate(f): return eligible(f) and f["slots_last_60s"] >= MIN_SLOTS_60
def cell_of(f):
    if f["creator_sold_tokens"] > 0: return "C"
    return "B" if f["creator_on_tape"] else "A"
def exit_signal(p): return p.hi > 0 and p.x <= p.hi * 0.70          # 30 % trail on sellable net proceeds (control and candidate)
