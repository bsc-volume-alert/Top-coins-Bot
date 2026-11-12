"""Shared, knowable-at-time feature code for the three rule files (control, F006-T1, CL-L002). Everything is computed from the
evaluator's view v (v.trades = trades RECEIVED by v.t in receipt order, v.t = decision time, v.created). Block time (ts) is used for
the 60-s window exactly as in F006 part 1 build_features.py; knowability is by receipt (the evaluator's Prefix). Creator comes from
tokens_window.csv (known at creation); path from env F006P2_TOKENS. Frozen eval-1.1 is imported for state_ok only."""
import os, sys, csv, gzip, io, collections, importlib.util
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
MIN_BUYERS_60 = 5; EB_SOLD_MAX = 0.8; TOP10_MAX = 0.8; MODE_SHARE_MAX = 0.5; CREATOR_SOLD_MAX_TOKENS = 0.0

def features(v):
    """Returns dict of knowable features at v.t (None if no trades)."""
    L = v.trades; k = len(L)
    if k == 0: return None
    last = L[k - 1]; t = v.t; created = v.created
    mint = last["mint"]; cr = creator_of(mint)
    bought, sold, firstbuy = collections.defaultdict(float), collections.defaultdict(float), {}
    buyers60 = set(); sizes60 = collections.Counter(); nbuys60 = 0
    for r in L:
        ts = fl(r["ts"]); w = r["wallet"]; tk = fl(r["tokens"]) or 0.0; s = fl(r["sol"]) or 0.0
        if r["is_buy"] == "1":
            bought[w] += tk
            if w not in firstbuy: firstbuy[w] = ts
            if iscurve(r) and ts > t - 60:
                buyers60.add(w); sizes60[round(s, 4)] += 1; nbuys60 += 1
        else: sold[w] += tk
    early = [w for w, f in firstbuy.items() if f <= created + 60]
    eb = sum(bought[w] for w in early); es = sum(sold[w] for w in early)
    hold = sorted((max(bought[w] - sold[w], 0.0) for w in set(list(bought) + list(sold))), reverse=True); tot = sum(hold)
    return {"last_is_valid_curve": bool(iscurve(last) and ev().state_ok(last)), "buyers_last_60s": len(buyers60), "n_buys_60": nbuys60,
            "creator_sold_tokens": sold.get(cr, 0.0), "creator_bought_tokens": bought.get(cr, 0.0), "creator_on_tape": cr in bought or cr in sold,
            "n_early_buyers": len(early), "early_buyer_sold_share": (min(es / eb, 1.0) if eb > 0 else None),
            "top10_holder_share": (sum(hold[:10]) / tot if tot > 0 else None), "n_net_holders": sum(1 for h in hold if h > 0),
            "mode_size_share": (max(sizes60.values()) / nbuys60 if nbuys60 else None), "mode_size": (sizes60.most_common(1)[0][0] if nbuys60 else None)}

def eligible(f): return f is not None and f["last_is_valid_curve"] and f["buyers_last_60s"] >= MIN_BUYERS_60
def cond_t1(f):
    return (f["creator_sold_tokens"] <= CREATOR_SOLD_MAX_TOKENS and f["early_buyer_sold_share"] is not None and f["early_buyer_sold_share"] <= EB_SOLD_MAX
            and f["top10_holder_share"] is not None and f["top10_holder_share"] <= TOP10_MAX)
def cond_l002(f): return f["mode_size_share"] is not None and f["mode_size_share"] <= MODE_SHARE_MAX
def exit_signal(p): return p.hi > 0 and p.x <= p.hi * 0.70

# ---- F009 cells (fixed partition of eligibility E; see PROTOCOL.md) and CL-L004 time-stop exit
def cell_of(f):
    """A = creator absent (no buy, no sell received by t); B = creator bought, sold 0; C = creator sold > 0."""
    if f["creator_sold_tokens"] > 0: return "C"
    return "B" if f["creator_on_tape"] else "A"
def cond_A(f): return cell_of(f) == "A"
def cond_B(f): return cell_of(f) == "B"
def cond_C(f): return cell_of(f) == "C"
TS_HOLD_S = 600; TS_MIN_X = 1.20
def exit_signal_ts(p): return exit_signal(p) or (p.seconds_held >= TS_HOLD_S and p.x < TS_MIN_X)
