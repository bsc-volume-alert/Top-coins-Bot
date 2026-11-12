"""S2 — owner common scenario R4 for the three registered specifications (control = shared eligibility E; F006-T1; CL-L002).
Frozen eval-1.1 run_launch unchanged with pool_bps=55; 0.2 SOL; buy +1 s; sell +0.7 s; curve 125 bps; 0.0015 SOL fixed; 30 % trail on
sellable proceeds; 2 h cap; landing state older than 30 s => unavailable (fill) / uncertain (exit) by post-check, as in CL-L001.
Usage: F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> python3 -I run_s2.py <replay dir> <out dir>"""
import sys, os, pathlib, importlib.util, json, csv, types, math, statistics, collections, bisect, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ev = rc.ev(); assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
assert not ev.DEV_NO_EVIDENCE
START, SPLIT, END = 1793950800, 1794016200, 1794081600
POOL_BPS = 55; SIZE = 0.2; TRAIL = 0.30; STALE = 30; AGE = 300
tok, gaps, outages, meta = ev.load(str(replay), START, END); fl = ev.fl
SPECS = {"control": lambda f: True, "t1": rc.cond_t1, "l002": rc.cond_l002}

def retained(info, L):
    cum = 0.0
    for r in L:
        if not rc.iscurve(r): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= 15:
            rv = fl(r["recv_ms"]); return rv / 1000 if rv else fl(r["ts"])
    return None

def run(m, info, L, ret, enter):
    mod = types.SimpleNamespace(decide=lambda v: enter and v.t == info["created"] + AGE, exit_signal=rc.exit_signal)
    R = {"decision_offsets": [AGE], "on_trade": False, "horizon_s": 7200, "sizes": [SIZE]}
    res, hyp = ev.run_launch(mod, R, m, info, L, gaps, outages, meta, POOL_BPS)
    rec = {"cat": res["cat"], "why": res.get("why"), "entry_t": res.get("entry_t"), "hypothetical": hyp}
    if res.get("entry_t") is not None:
        te = res["entry_t"]; fs, fw = ev.state_at(L, te + ev.LAND_BUY_S, gaps, outages, info["created"], ret)
        rec["fill_state_age_s"] = (te + ev.LAND_BUY_S - fl(fs["ts"])) if fs else None; rec["entry_age_s"] = te - info["created"]
    if res["cat"] == "scored":
        s = res["sizes"][str(SIZE)]; rec.update(net_sol=s["net_sol"], ret=s["ret"], exit=s["exit"], fill_venue=s["fill_venue"], exit_venue=s["exit_venue"])
        if s["exit"] == "horizon": ts_ = te + 7200
        else:  # re-derive the trigger time exactly as run_launch does
            RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
            tokq = ev.buy(fs, SIZE, POOL_BPS); hi = -1e9; ts_ = None
            for j in range(bisect.bisect_right(RT, te + ev.LAND_BUY_S), len(RO)):
                r = RO[j]; tr = RT[j]
                if tr >= te + 7200: break
                if not ev.state_ok(r): continue
                x = (ev.sell(r, tokq, POOL_BPS) - ev.FIXED_FEE_SOL) / SIZE; hi = max(hi, x)
                if hi > 0 and x <= hi * (1 - TRAIL): ts_ = tr + ev.LAND_SELL_S; break
        ss, sw = ev.state_at(L, ts_, gaps, outages, info["created"], ret) if ts_ else (None, "n/a")
        rec["exit_state_age_s"] = (ts_ - fl(ss["ts"])) if ss else None; rec["t_sell"] = ts_; rec["hold_s"] = (ts_ - te) if ts_ else None
    return rec

stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; audit = collections.Counter(); rows = []; feats = []
for m, L in ev.iter_mints(str(replay), tok, stats):
    info = tok[m]; ret = retained(info, L)
    if ret is None: audit["not_retained"] += 1; continue
    if any(s < info["created"] + 7200 and e > info["created"] for s, e in outages): audit["outage_excluded"] += 1; continue
    half = "early" if info["created"] < SPLIT else "late"; audit["eligible_" + half] += 1
    t = info["created"] + AGE
    # knowable view at t, built as run_launch builds it (receipt order prefix)
    RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
    k = bisect.bisect_right(RT, t); v = types.SimpleNamespace(t=t, created=info["created"], trades=ev.Prefix(RO, k))
    f = rc.features(v) if t >= ret else None
    E = bool(f is not None and rc.eligible(f))
    frow = {"mint": m, "half": half, "created": info["created"], "retained_at": ret, "retained_by_t": t >= ret, "eligible_E": E}
    if f: frow.update({kk: f[kk] for kk in f}); frow["cond_t1"] = rc.cond_t1(f); frow["cond_l002"] = rc.cond_l002(f)
    if f: frow["c_creator"] = f["creator_sold_tokens"] <= 0; frow["c_early"] = f["early_buyer_sold_share"] is not None and f["early_buyer_sold_share"] <= rc.EB_SOLD_MAX; frow["c_top10"] = f["top10_holder_share"] is not None and f["top10_holder_share"] <= rc.TOP10_MAX
    feats.append(frow)
    for name, cond in SPECS.items():
        enter = E and bool(cond(f))
        rec = run(m, info, L, ret, enter); rec.update(spec=name, mint=m, half=half, created=info["created"], eligible_E=E); rows.append(rec)
    n = audit["eligible_early"] + audit["eligible_late"]
    if n % 500 == 0: print("ELIGIBLE", n, dict(audit), flush=True)
assert stats["non_contiguous"] == 0
keys = ["spec", "mint", "half", "created", "eligible_E", "cat", "why", "entry_t", "entry_age_s", "fill_state_age_s", "t_sell", "hold_s", "exit_state_age_s", "net_sol", "ret", "exit", "fill_venue", "exit_venue", "hypothetical"]
with open(out / "ledger.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=keys, extrasaction="ignore"); w.writeheader(); w.writerows(rows)
fk = sorted(set(kk for r in feats for kk in r))
with open(out / "features_at_300s.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=fk); w.writeheader(); w.writerows(feats)

def block(rs):
    if not rs: return {"n": 0}
    v = sorted(r["net_sol"] for r in rs); rets = [r["ret"] for r in rs]
    return {"n": len(rs), "total_sol": math.fsum(v), "mean_ret": statistics.mean(rets), "median_ret": statistics.median(rets), "win_rate": sum(x > 0 for x in v) / len(v),
            "share_loss_gt50": sum(x < -0.5 * SIZE for x in v) / len(v), "without_best1_sol": math.fsum(v[:-1]), "without_best3_sol": math.fsum(v[:-3]), "best3_sol": v[-3:], "worst_sol": v[0],
            "exit_trigger": sum(r["exit"] == "trigger" for r in rs), "exit_horizon": sum(r["exit"] == "horizon" for r in rs), "median_hold_s": statistics.median([r["hold_s"] for r in rs if r.get("hold_s") is not None]),
            "fill_state_age_median_s": statistics.median([r["fill_state_age_s"] for r in rs])}
def summ(rr):
    att = [r for r in rr if r["cat"] != "abstain"]; filled = [r for r in att if r["cat"] == "scored" or (r["cat"] == "unknown" and r["why"].startswith("exit"))]
    unav = [r for r in att if r["cat"] == "unknown" and r["why"].startswith("fill")]
    stale_fill = [r for r in filled if (r.get("fill_state_age_s") or 0) > STALE]
    resolved = [r for r in filled if r["cat"] == "scored" and r not in stale_fill]; uncertain = [r for r in filled if r["cat"] == "unknown" and r not in stale_fill]
    stale_exit = [r for r in resolved if (r.get("exit_state_age_s") or 0) > STALE]; res2 = [r for r in resolved if r not in stale_exit]
    return {"attempted": len(att), "filled": len(filled), "unavailable_fill": len(unav), "unavailable_reasons": dict(collections.Counter(r["why"] for r in unav)),
            "stale_fill_gt30s_marked_unavailable": len(stale_fill), "resolved_raw_evaluator": block([r for r in filled if r["cat"] == "scored"]),
            "uncertain_exit": len(uncertain), "uncertain_reasons": dict(collections.Counter(r["why"] for r in uncertain)), "stale_exit_gt30s_marked_uncertain": len(stale_exit),
            "resolved_after_staleness": block(res2), "by_half": {h: block([r for r in res2 if r["half"] == h]) for h in ("early", "late")},
            "resolved_mints": sorted(r["mint"] for r in res2)}
S = {name: summ([r for r in rows if r["spec"] == name]) for name in SPECS}
# partition of the control into candidate / complement (identical trades on shared launches; see PROTOCOL.md)
ctrl = {r["mint"]: r for r in rows if r["spec"] == "control"}; fmap = {r["mint"]: r for r in feats}
for cand in ("t1", "l002"):
    inset = set(S[cand]["resolved_mints"]); comp = [ctrl[m] for m in S["control"]["resolved_mints"] if m not in inset]
    S[cand + "_complement_resolved"] = block(comp); S[cand + "_complement_by_half"] = {h: block([r for r in comp if r["half"] == h]) for h in ("early", "late")}
    S[cand + "_complement_attempted"] = sum(1 for m, r in ctrl.items() if r["cat"] != "abstain" and not (fmap[m].get("cond_" + cand) and fmap[m]["eligible_E"]))
for name in S:
    if isinstance(S[name], dict) and "resolved_mints" in S[name]: S[name]["n_resolved_mints"] = len(S[name].pop("resolved_mints"))
E_rows = [r for r in feats if r["eligible_E"]]
diag = {"launches": len(feats), "retained_by_300s": sum(r["retained_by_t"] for r in feats), "eligible_E": len(E_rows),
        "E_by_half": dict(collections.Counter(r["half"] for r in E_rows)),
        "within_E": {"cond_t1": sum(r["cond_t1"] for r in E_rows), "c_creator_sold0": sum(r["c_creator"] for r in E_rows), "c_early_le0.8": sum(r["c_early"] for r in E_rows), "c_top10_le0.8": sum(r["c_top10"] for r in E_rows),
                     "creator_on_tape": sum(r["creator_on_tape"] for r in E_rows), "no_early_buyers": sum(r["n_early_buyers"] == 0 for r in E_rows), "cond_l002": sum(r["cond_l002"] for r in E_rows),
                     "mode_size_share_median": statistics.median([r["mode_size_share"] for r in E_rows if r["mode_size_share"] is not None]) if E_rows else None,
                     "top10_median": statistics.median([r["top10_holder_share"] for r in E_rows if r["top10_holder_share"] is not None]) if E_rows else None,
                     "early_sold_median": statistics.median([r["early_buyer_sold_share"] for r in E_rows if r["early_buyer_sold_share"] is not None]) if E_rows else None},
        "not_E_reasons": dict(collections.Counter(("not_retained_by_300s" if not r["retained_by_t"] else "no_trades" if "last_is_valid_curve" not in r else "last_not_valid_curve" if not r["last_is_valid_curve"] else "buyers60_lt5") for r in feats if not r["eligible_E"]))}
summary = {"spec": {"size": SIZE, "pool_bps": POOL_BPS, "curve_bps": ev.CURVE_FEE_BPS, "fixed": ev.FIXED_FEE_SOL, "land_buy_s": ev.LAND_BUY_S, "land_sell_s": ev.LAND_SELL_S, "trail": TRAIL, "horizon_s": 7200, "decision_age_s": AGE, "stale_s": STALE,
          "thresholds": {"min_buyers_60": rc.MIN_BUYERS_60, "early_sold_max": rc.EB_SOLD_MAX, "top10_max": rc.TOP10_MAX, "mode_share_max": rc.MODE_SHARE_MAX}},
           "audit": dict(audit), "stream_stats": {k: v for k, v in stats.items() if k != "_done"}, "diagnostics": diag, "results": S}
json.dump(summary, open(out / "results_s2.json", "w"), indent=2); print(json.dumps({k: summary[k] for k in ("audit", "diagnostics")}, indent=1))
for name in SPECS: print(name, json.dumps({k: S[name][k] for k in ("attempted", "filled", "unavailable_fill", "uncertain_exit", "stale_fill_gt30s_marked_unavailable", "stale_exit_gt30s_marked_uncertain")}), json.dumps(S[name]["resolved_after_staleness"]))
