"""f013 — COUNTS-ONLY descriptive of the CL-L011 statistic on the 568 F004-RUN2 control triggers (no exit, no P&L, no outcome field read):
sells received in (created+60 s, trigger] by half; cross-tab of sells == 0 against the CL-L010 breadth statistic (>= 10 outside buyers);
entry age and trigger price / p60 for the zero-sell triggers vs the rest; and how early the FIRST curve sell after 60 s is received
relative to the trigger (a feature of the tape, not an outcome). Same stream and trigger code as precheck_f013.py.
Usage: F006P2_EVAL=<evaluate.py> F013_TOKENS=<tokens_window.csv.gz> python3 -I descriptive_f013.py <replay dir> <out json>"""
import sys, os, json, bisect, types, collections, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_f013 as rf
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
stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; recs = []
for m, L in ev.iter_mints(replay, tok, stats):
    info = tok[m]; ret = retained_at(info, L)
    if ret is None: continue
    if any(s < info["created"] + 7200 and e > info["created"] for s, e in outages): continue
    half = "early" if info["created"] < SPLIT else "late"
    RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
    def view(t):
        v = types.SimpleNamespace(t=t, created=info["created"], retained_at=ret); k = bisect.bisect_right(RT, t); v.trades = ev.Prefix(RO, k); v.last = RO[k - 1] if k else None; return v
    for t in sorted(set(RT)):
        if t < ret or t > info["created"] + rf.RUN_MAX_S: continue
        v = view(t)
        if rf.run_decide(v, 2):
            s = rf.sells(v); b = rf.breadth(v); p = rf.p60(v); lo = info["created"] + rf.SELL_FROM_S
            first_sell = next((RT[j] for j in range(len(RO)) if RT[j] > lo and RO[j]["venue"] in ("", "curve") and RO[j]["is_buy"] != "1"), None)
            # buys received in the same interval, so the sell share is a ratio of two knowable counts
            buys = sum(1 for j in range(len(RO)) if lo < RT[j] <= t and RO[j]["venue"] in ("", "curve") and RO[j]["is_buy"] == "1")
            recs.append({"half": half, "sells": s, "breadth": b, "buys": buys, "entry_age_s": t - info["created"], "price_over_p60": (rf.px(v.last) / p) if p else None,
                         "first_sell_minus_60_s": (first_sell - lo) if first_sell is not None else None, "first_sell_before_trigger": (first_sell is not None and first_sell <= t),
                         "trigger_is_sell": v.last["is_buy"] != "1"})
            break
    rf.reset()
def q(xs):
    xs = sorted(xs); return {"n": len(xs), "min": xs[0], "p25": xs[int(.25 * (len(xs) - 1))], "median": statistics.median(xs), "p75": xs[int(.75 * (len(xs) - 1))], "max": xs[-1]} if xs else None
zero = [r for r in recs if r["sells"] == 0]; pos = [r for r in recs if r["sells"] > 0]
o = {"control_attempts": len(recs), "by_half": {h: {"attempts": sum(1 for r in recs if r["half"] == h), "zero_sell": sum(1 for r in recs if r["half"] == h and r["sells"] == 0), "sells_quantiles": q([r["sells"] for r in recs if r["half"] == h])} for h in ("early", "late")},
     "zero_sell": {"n": len(zero), "entry_age_s": q([r["entry_age_s"] for r in zero]), "breadth": q([r["breadth"] for r in zero]), "buys": q([r["buys"] for r in zero]), "price_over_p60": q([r["price_over_p60"] for r in zero if r["price_over_p60"]]), "breadth_ge_10": sum(1 for r in zero if r["breadth"] >= 10)},
     "positive_sell": {"n": len(pos), "entry_age_s": q([r["entry_age_s"] for r in pos]), "breadth": q([r["breadth"] for r in pos]), "buys": q([r["buys"] for r in pos]), "price_over_p60": q([r["price_over_p60"] for r in pos if r["price_over_p60"]]), "breadth_ge_10": sum(1 for r in pos if r["breadth"] >= 10),
                       "sell_share_of_curve_rows": q([r["sells"] / (r["sells"] + r["buys"]) for r in pos if r["sells"] + r["buys"]]), "first_sell_minus_60_s": q([r["first_sell_minus_60_s"] for r in pos]), "trigger_row_is_sell": sum(1 for r in pos if r["trigger_is_sell"])},
     "crosstab_zero_sell_x_breadth_ge_10": {f"sells{'0' if z else '>0'}_breadth{'>=10' if bb else '<10'}": sum(1 for r in recs if (r["sells"] == 0) == z and (r["breadth"] >= 10) == bb) for z in (True, False) for bb in (True, False)},
     "stream_stats": {k: v for k, v in stats.items() if k != "_done"}, "note": "counts and knowable-at-time features only; no exit, P&L or outcome category was computed or read"}
json.dump(o, open(outp, "w"), indent=2); print(json.dumps(o, indent=1))
