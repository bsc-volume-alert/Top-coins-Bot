"""f013 — R54 bindability pre-check for CL-L011, COUNTS ONLY, run after PROTOCOL.md was written and before any outcome is read: on the retained,
outage-free window launches, how many F004-RUN2 triggers (first crossing, 60 < t-created <= 900 s) have ZERO curve sell rows received in
(created + 60 s, trigger], by half; plus the sell-count distribution at the trigger (counts only). No exits, no P&L, no outcome field read.
Usage: F006P2_EVAL=<evaluate.py> F013_TOKENS=<tokens_window.csv.gz> python3 -I precheck_f013.py <replay dir> <out json>"""
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
stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; C = collections.Counter(); br = []
for m, L in ev.iter_mints(replay, tok, stats):
    info = tok[m]; ret = retained_at(info, L)
    if ret is None: C["not_retained"] += 1; continue
    if any(s < info["created"] + 7200 and e > info["created"] for s, e in outages): C["outage_excluded"] += 1; continue
    half = "early" if info["created"] < SPLIT else "late"; C["denominator_" + half] += 1
    RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
    def view(t):
        v = types.SimpleNamespace(t=t, created=info["created"], retained_at=ret); k = bisect.bisect_right(RT, t); v.trades = ev.Prefix(RO, k); v.last = RO[k - 1] if k else None; return v
    for t in sorted(set(RT)):
        if t < ret or t > info["created"] + rf.RUN_MAX_S: continue
        v = view(t)
        if rf.run_decide(v, 2):
            b = rf.sells(v); C["RUN2_" + half] += 1; br.append((half, b))
            if b == 0: C["RUN2C_" + half] += 1
            break
    rf.reset()
    n = C["denominator_early"] + C["denominator_late"]
    if n % 500 == 0: print(n, dict(C), flush=True)
tot = lambda k: C[k + "_early"] + C[k + "_late"]
bs = sorted(b for _, b in br)
o = {"condition": "sells == 0 in (created+60 s, trigger]", "sell_from_s": rf.SELL_FROM_S, "counts": dict(C), "denominator": tot("denominator"), "RUN2_control_attempts": tot("RUN2"), "RUN2C_candidate_attempts": tot("RUN2C"),
     "removed": tot("RUN2") - tot("RUN2C"), "removed_share_of_control": (1 - tot("RUN2C") / tot("RUN2")) if tot("RUN2") else None,
     "testable_5_95": (0.05 <= 1 - tot("RUN2C") / tot("RUN2") <= 0.95) if tot("RUN2") else None,
     "sells_at_trigger_quantiles_counts_only": {"min": bs[0], "p10": bs[int(.1 * (len(bs) - 1))], "p25": bs[int(.25 * (len(bs) - 1))], "median": statistics.median(bs), "p75": bs[int(.75 * (len(bs) - 1))], "p90": bs[int(.9 * (len(bs) - 1))], "max": bs[-1], "share_zero": sum(1 for b in bs if b == 0) / len(bs), "share_le_1": sum(1 for b in bs if b <= 1) / len(bs), "share_le_3": sum(1 for b in bs if b <= 3) / len(bs)} if bs else None,
     "stream_stats": {k: v for k, v in stats.items() if k != "_done"}}
json.dump(o, open(outp, "w"), indent=2); print(json.dumps(o, indent=1))
