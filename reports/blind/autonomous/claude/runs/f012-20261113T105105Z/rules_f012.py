"""f012 — knowable-at-time RUN2 trigger (copied unchanged from f004 rules_f004.py: p60 / run_decide / exit_signal) plus the CL-L010
breadth condition. Every decision reads ONLY trades received by the decision time (the evaluator's Prefix view). Frozen evaluator imported
unchanged (path in env F006P2_EVAL). Creator wallets come from the allowlisted census (env F012_TOKENS), read once."""
import os, csv, gzip, io, importlib.util
_EV = None
def ev():
    global _EV
    if _EV is None:
        p = os.environ["F006P2_EVAL"]; spec = importlib.util.spec_from_file_location("ev_frozen", p); _EV = importlib.util.module_from_spec(spec); spec.loader.exec_module(_EV)
    return _EV
def fl(x):
    try: return float(x)
    except (TypeError, ValueError): return None
def px(r): return fl(r.get("price_sol"))
def usable(r): return r is not None and ev().state_ok(r) and (px(r) or 0) > 0

RUN_MIN_S, RUN_MAX_S = 60, 900          # f004: first crossing with 60 s < t <= 900 s (receipt time after creation)
TRAIL = 0.30
BREADTH_B = 10                          # CL-L010: registered in PROTOCOL.md before any count was read
BREADTH_FROM_S = 60                     # count distinct non-creator curve BUYERS received in (created + 60 s, trigger receipt]

_CREATOR = None
def creators():
    global _CREATOR
    if _CREATOR is None:
        p = os.environ["F012_TOKENS"]; fh = io.TextIOWrapper(gzip.open(p), newline="") if p.endswith(".gz") else open(p, newline="")
        _CREATOR = {r["mint"]: r["creator"] for r in csv.DictReader(fh)}
    return _CREATOR

_C = {}   # per-launch cache (keyed by mint): p60 — computed from received rows only
def _key(v): return v.last["mint"] if v.last is not None else None
def p60(v):
    """Trade price of the last RECEIVED usable trade by created + 60 s (None if none). Cached per launch after t >= created + 60."""
    m = _key(v); c = _C.get(m)
    if c is None or "p60" not in c:
        lim = v.created + 60; best = None
        for r in v.trades:
            rt = (fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000
            if rt > lim: break
            if usable(r): best = px(r)
        if v.t < lim: return best
        _C.setdefault(m, {})["p60"] = best; return best
    return c["p60"]
def run_decide(v, k):
    if v.t <= v.created + RUN_MIN_S or v.t > v.created + RUN_MAX_S: return False
    if not usable(v.last): return False
    b = p60(v)
    return b is not None and px(v.last) >= k * b
def breadth(v):
    """Distinct wallets other than the census creator with at least one curve buy received in (created + 60 s, v.t]. Received rows only."""
    m = _key(v); cr = creators().get(m); lo = v.created + BREADTH_FROM_S; w = set()
    for r in v.trades:
        rt = (fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000
        if rt <= lo: continue
        if r["venue"] not in ("", "curve") or r["is_buy"] != "1" or r["wallet"] == cr: continue
        w.add(r["wallet"])
    return len(w)
def run2b_decide(v):
    """CL-L010 candidate: the F004-RUN2 trigger, taken only if breadth >= B at that trigger; otherwise the launch is skipped (no later entry)."""
    if not run_decide(v, 2): return False
    m = _key(v); c = _C.setdefault(m, {})
    if "first_run2" not in c: c["first_run2"] = v.t
    if v.t != c["first_run2"]: return False           # first crossing only, same as the control
    return breadth(v) >= BREADTH_B
def exit_signal(p): return p.hi > 0 and p.x <= p.hi * (1 - TRAIL)
def reset(): _C.clear()
