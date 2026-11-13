"""f004 — knowable-at-time re-specification of the 11 Nov study's run-entry triggers and the CL-L009 dump-and-recover entry, for the frozen
eval-1.1 (decide/exit_signal). Every decision reads ONLY trades received by the decision time (the evaluator's Prefix view); prices are the
export's trade price (price_sol), the same quantity the study used, restricted to rows whose recorded state passes the evaluator's state_ok.
Parameters registered in PROTOCOL.md before scoring. Frozen evaluator imported unchanged (path in env F006P2_EVAL)."""
import os, importlib.util
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

RUN_MIN_S, RUN_MAX_S = 60, 900          # the study's window: first crossing with 60 s < t <= 900 s (here: receipt time after creation)
DIP_MIN_S, DIP_MAX_S = 60, 1800         # CL-L009 dump event window (receipt time after creation)
DIP_DRAW = 0.50                         # dump = received usable price <= 50 % of the running high of received usable prices since retention
DIP_RECOVER = 1.5                       # recovery = received usable price >= 1.5 x the post-dump trough
DIP_RECOVER_WITHIN_S = 300              # recovery must arrive within 300 s of the dump event, else no entry
TRAIL = 0.30

_C = {}   # per-launch cache (keyed by mint): p60, running high, dump state — all computed from received rows only
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
def base60_decide(v):
    return v.t == v.created + 60 and usable(v.last) and (v.last["venue"] == "curve" or not v.last["venue"])

def dip_state(v):
    """Walk received usable rows (cached incrementally): running high since retention, first dump row index, post-dump trough, recovery row."""
    m = _key(v); c = _C.setdefault(m, {})
    s = c.setdefault("dip", {"i": 0, "hi": 0.0, "dump_t": None, "trough": None, "rec_t": None})
    L = v.trades; n = len(L)
    while s["i"] < n:
        r = L[s["i"]]; s["i"] += 1
        if not usable(r): continue
        rt = (fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000
        if rt < v.retained_at: continue
        p = px(r)
        if s["dump_t"] is None:
            if p > s["hi"]: s["hi"] = p
            if s["hi"] > 0 and p <= DIP_DRAW * s["hi"] and v.created + DIP_MIN_S < rt <= v.created + DIP_MAX_S:
                s["dump_t"] = rt; s["trough"] = p
        elif s["rec_t"] is None:
            if p < s["trough"]: s["trough"] = p
            if p >= DIP_RECOVER * s["trough"] and rt <= s["dump_t"] + DIP_RECOVER_WITHIN_S: s["rec_t"] = rt
    return s
def dip_control_decide(v):
    s = dip_state(v); return s["dump_t"] is not None and v.t == s["dump_t"]
def dip_candidate_decide(v):
    s = dip_state(v); return s["rec_t"] is not None and v.t == s["rec_t"]
def exit_signal(p): return p.hi > 0 and p.x <= p.hi * (1 - TRAIL)
def reset(): _C.clear()
