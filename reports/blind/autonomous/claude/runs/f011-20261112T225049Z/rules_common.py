"""Copied unchanged from f010-20261112T145045Z/rules_common.py (features = eligibility E and the F009 cells; the F010 tape exits are unused here).
Shared, knowable-at-time feature and exit code for the F010 rule files (control, L004-SC sell-cluster exit, CL-L005 demand-decay exit).
Features are identical to f009's rules_common.py (eligibility E, creator cells). Exits that need the tape (sell cluster, buyer arrivals) read
the receipt-ordered trade list that the evaluator hands to decide() (Prefix.L) and use ONLY rows whose receipt time is <= the current p.t
(asserted); nothing after the current receipt is read. Frozen eval-1.1 is imported for state_ok only. Creator from tokens_window.csv
(known at creation); path from env F006P2_TOKENS."""
import os, sys, csv, gzip, io, collections, importlib.util, bisect, math
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

def features(v):
    """Returns dict of knowable features at v.t (None if no trades). Identical to f009."""
    L = v.trades; k = len(L)
    if k == 0: return None
    last = L[k - 1]; t = v.t; created = v.created
    mint = last["mint"]; cr = creator_of(mint)
    bought, sold = collections.defaultdict(float), collections.defaultdict(float)
    buyers60 = set()
    for r in L:
        ts = fl(r["ts"]); w = r["wallet"]; tk = fl(r["tokens"]) or 0.0
        if r["is_buy"] == "1":
            bought[w] += tk
            if iscurve(r) and ts > t - 60: buyers60.add(w)
        else: sold[w] += tk
    return {"last_is_valid_curve": bool(iscurve(last) and ev().state_ok(last)), "buyers_last_60s": len(buyers60),
            "creator_sold_tokens": sold.get(cr, 0.0), "creator_bought_tokens": bought.get(cr, 0.0), "creator_on_tape": cr in bought or cr in sold}

def eligible(f): return f is not None and f["last_is_valid_curve"] and f["buyers_last_60s"] >= MIN_BUYERS_60
def cell_of(f):
    """A = creator absent (no buy, no sell received by t); B = creator bought, sold 0; C = creator sold > 0 (F009, fixed)."""
    if f["creator_sold_tokens"] > 0: return "C"
    return "B" if f["creator_on_tape"] else "A"
def exit_signal(p): return p.hi > 0 and p.x <= p.hi * 0.70          # control: 30 % trail on sellable net proceeds (f006p2/f009)

# ---- tape access for the two added exits -------------------------------------------------------------------------------
# Codex L004 parameters, transcribed from research-codex @ 5024b9e runs/c012-lab-20261112T091226Z/lab.py (no changes):
SC_COHORT_S = 60       # early cohort: received curve buy with receipt <= created + 60 s
SC_WINDOW_S = 2        # rolling window [tr - 2, tr] on receipt time
SC_MIN_WALLETS = 3     # >= 3 distinct early-cohort sellers
SC_MIN_SOL = 2.0       # >= 2 SOL combined sells
# CL-L005 parameters (registered in PROTOCOL.md before scoring):
DD_WINDOW_S = 60; DD_MAX_BUYERS = 1; DD_MIN_HOLD_S = 60

class Tape:
    """Receipt-ordered rows of one launch with precomputed receipt times, validity, and the early cohort."""
    def __init__(self, RO, created):
        self.RO = RO; self.created = created
        self.RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]           # exactly the evaluator's RT
        self.ok = [ev().state_ok(r) for r in RO]
        self.cohort = {r["wallet"] for r, tr in zip(RO, self.RT) if iscurve(r) and r["is_buy"] == "1" and tr <= created + SC_COHORT_S}
        self.idx = -1; self.last_t = None
    def reset(self): self.idx = -1; self.last_t = None
    def advance(self, p):
        """Move the row pointer to the evaluator's current row: the next valid-state row (after the previous one) with receipt time == p.t.
        The evaluator calls exit_signal once per valid-state row after the fill, in receipt order, so this is exact."""
        j = self.idx + 1
        while j < len(self.RO) and (not self.ok[j] or self.RT[j] < p.t or self.RT[j] <= p.fill_t): j += 1
        assert j < len(self.RO) and self.RT[j] == p.t, ("row pointer lost", j, p.t)
        self.idx = j; self.last_t = p.t; return j
    def cluster(self, p):
        """Early-cohort sells with valid state, receipt in [p.t - 2, p.t], after the fill, up to and including the current row."""
        j = self.advance(p); lo = p.t - SC_WINDOW_S; wallets = set(); sol = 0.0; i = j
        while i >= 0 and self.RT[i] >= lo:
            r = self.RO[i]
            if self.ok[i] and self.RT[i] > p.fill_t and r["is_buy"] != "1" and r["wallet"] in self.cohort:
                wallets.add(r["wallet"]); sol += fl(r["sol"]) or 0.0
            i -= 1
        assert all(self.RT[k] <= p.t for k in range(i + 1, j + 1))
        return len(wallets), sol
    def buyers_last(self, p, window):
        """Distinct wallets with a curve buy received in (p.t - window, p.t] (all rows, any state)."""
        hi = bisect.bisect_right(self.RT, p.t); lo = bisect.bisect_right(self.RT, p.t - window); s = set()
        for i in range(lo, hi):
            r = self.RO[i]
            if iscurve(r) and r["is_buy"] == "1": s.add(r["wallet"])
        return len(s)

_TAPE = {"cur": None}
def set_tape(v):
    """Called from decide(v): capture the receipt-ordered list the evaluator built (Prefix.L) for the exits of this launch."""
    _TAPE["cur"] = Tape(v.trades.L, v.created)
def tape(): return _TAPE["cur"]
def reset_scan():
    if _TAPE["cur"] is not None: _TAPE["cur"].reset()

LAST = {"kind": None, "cluster_n": None, "cluster_sol": None, "buyers": None}
def exit_signal_sc(p):
    """L004-SC: trail first (Codex tests the trail before the cluster on the same row), then the sell cluster."""
    n, sol = tape().cluster(p)
    if exit_signal(p): LAST.update(kind="trail", cluster_n=n, cluster_sol=sol); return True
    if n >= SC_MIN_WALLETS and sol >= SC_MIN_SOL: LAST.update(kind="cluster", cluster_n=n, cluster_sol=sol); return True
    return False
def exit_signal_dd(p):
    """CL-L005: trail first, then demand decay (<= 1 distinct curve buyer in the last 60 s of receipt, held >= 60 s)."""
    if exit_signal(p): LAST.update(kind="trail", buyers=None); return True
    if p.seconds_held >= DD_MIN_HOLD_S:
        b = tape().buyers_last(p, DD_WINDOW_S)
        if b <= DD_MAX_BUYERS: LAST.update(kind="demand", buyers=b); return True
    return False
