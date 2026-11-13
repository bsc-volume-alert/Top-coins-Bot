"""f004 — R54 bindability pre-check, COUNTS ONLY, run before the protocol commit and before any outcome is read: on the retained, outage-free
window launches, how many launches each knowable-at-time trigger enters (BASE60, RUN2/3/5, CL-L009 dump event = control attempts, CL-L009
recovery = candidate attempts), by half. Uses the frozen evaluator's loader/stream and receipt ordering; decisions via rules_f004 (no exits, no P&L).
Usage: F006P2_EVAL=<evaluate.py> python3 -I precheck_f004.py <replay dir> <out json>"""
import sys, os, json, bisect, types, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_f004 as rf
ev = rf.ev(); replay, outp = sys.argv[1], sys.argv[2]
START, SPLIT, END = 1793950800, 1794016200, 1794081600
tok, gaps, outages, meta = ev.load(replay, START, END); fl = ev.fl
ev.KEEP = ev.KEEP + ("price_sol",)
def retained_at(info, L):
    cum = 0.0
    for r in L:
        if r["venue"] not in ("curve", ""): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= 15:
            rv = fl(r["recv_ms"]); return rv / 1000 if rv else fl(r["ts"])
    return None
stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; C = collections.Counter(); lag = []
for m, L in ev.iter_mints(replay, tok, stats):
    info = tok[m]; ret = retained_at(info, L)
    if ret is None: C["not_retained"] += 1; continue
    if any(s < info["created"] + 7200 and e > info["created"] for s, e in outages): C["outage_excluded"] += 1; continue
    half = "early" if info["created"] < SPLIT else "late"; C["denominator_" + half] += 1
    RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
    def view(t):
        v = types.SimpleNamespace(t=t, created=info["created"], retained_at=ret); k = bisect.bisect_right(RT, t); v.trades = ev.Prefix(RO, k); v.last = RO[k - 1] if k else None; return v
    t60 = info["created"] + 60
    if t60 >= ret and rf.base60_decide(view(t60)): C["BASE60_" + half] += 1
    hit = {}
    for t in sorted(set(RT)):
        if t < ret or t > info["created"] + 7200: continue
        v = view(t)
        for k in (2, 3, 5):
            if k not in hit and rf.run_decide(v, k): hit[k] = t; C[f"RUN{k}_" + half] += 1; lag.append((k, t - fl(v.last["ts"])))
        if "dc" not in hit and rf.dip_control_decide(v): hit["dc"] = t; C["L009_control_" + half] += 1
        if "dr" not in hit and rf.dip_candidate_decide(v): hit["dr"] = t; C["L009_recover_" + half] += 1
        if len(hit) == 5 or (t > info["created"] + 2100 and "dc" not in hit): break
    rf.reset()
    n = C["denominator_early"] + C["denominator_late"]
    if n % 500 == 0: print(n, dict(C), flush=True)
tot = lambda k: C[k + "_early"] + C[k + "_late"]
o = {"counts": dict(C), "denominator": tot("denominator"), "BASE60": tot("BASE60"), "RUN2": tot("RUN2"), "RUN3": tot("RUN3"), "RUN5": tot("RUN5"),
     "L009_control_attempts": tot("L009_control"), "L009_candidate_attempts": tot("L009_recover"),
     "L009_recovery_binds_share_of_control": (tot("L009_recover") / tot("L009_control")) if tot("L009_control") else None,
     "L009_removed_share_of_control": (1 - tot("L009_recover") / tot("L009_control")) if tot("L009_control") else None,
     "run_trigger_receipt_lag_s_median": {str(k): sorted(x for kk, x in lag if kk == k)[len([1 for kk, x in lag if kk == k]) // 2] for k in (2, 3, 5) if any(kk == k for kk, x in lag)},
     "stream_stats": {k: v for k, v in stats.items() if k != "_done"}}
json.dump(o, open(outp, "w"), indent=2); print(json.dumps(o, indent=1))
