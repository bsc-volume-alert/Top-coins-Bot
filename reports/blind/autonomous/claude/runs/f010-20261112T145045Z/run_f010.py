"""F010 + CL-L005 — owner common scenario R4 (S2) for: CONTROL (eligibility E, 30 % trail), L004-SC (Codex's early-cohort sell-cluster exit
added, parameters unchanged) and CL-L005 (demand-decay exit added), all on the same 679 E entries. Frozen eval-1.1 run_launch imported
unchanged with pool_bps=55; 0.2 SOL; buy +1 s; sell +0.7 s; curve 125 bps; 0.0015 SOL fixed; 2 h cap; landing state older than 30 s =>
unavailable (fill) / uncertain (exit) by post-check, exactly as in f006p2 run_s2.py / f009 run_f009.py (this file is run_f009.py with the
spec table changed to the three exits, the F009 cells kept as a fixed breakdown, and the exit-kind / cluster diagnostics added).
Usage: F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> python3 -I run_f010.py <replay dir> <out dir>"""
import sys, os, pathlib, json, csv, types, math, statistics, collections, bisect, hashlib, gzip, io, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ev = rc.ev(); assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
assert not ev.DEV_NO_EVIDENCE
START, SPLIT, END = 1793950800, 1794016200, 1794081600
POOL_BPS = 55; SIZE = 0.2; TRAIL = 0.30; STALE = 30; AGE = 300
tok, gaps, outages, meta = ev.load(str(replay), START, END); fl = ev.fl
SPECS = {"control": rc.exit_signal, "l004sc": rc.exit_signal_sc, "l005dd": rc.exit_signal_dd}

def retained(info, L):
    cum = 0.0
    for r in L:
        if not rc.iscurve(r): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= 15:
            rv = fl(r["recv_ms"]); return rv / 1000 if rv else fl(r["ts"])
    return None

def run(m, info, L, ret, enter, exit_fn, RO, RT):
    mod = types.SimpleNamespace(decide=lambda v: enter and v.t == info["created"] + AGE, exit_signal=exit_fn)
    R = {"decision_offsets": [AGE], "on_trade": False, "horizon_s": 7200, "sizes": [SIZE]}
    rc.reset_scan()
    res, hyp = ev.run_launch(mod, R, m, info, L, gaps, outages, meta, POOL_BPS)
    rec = {"cat": res["cat"], "why": res.get("why"), "entry_t": res.get("entry_t"), "hypothetical": hyp}
    if res.get("entry_t") is not None:
        te = res["entry_t"]; fs, fw = ev.state_at(L, te + ev.LAND_BUY_S, gaps, outages, info["created"], ret)
        rec["fill_state_age_s"] = (te + ev.LAND_BUY_S - fl(fs["ts"])) if fs else None; rec["entry_age_s"] = te - info["created"]
    if res["cat"] == "scored":
        s = res["sizes"][str(SIZE)]; rec.update(net_sol=s["net_sol"], ret=s["ret"], exit=s["exit"], fill_venue=s["fill_venue"], exit_venue=s["exit_venue"])
        if s["exit"] == "horizon": ts_ = te + 7200; rec["exit_kind"] = "horizon"
        else:  # re-derive the trigger time and kind exactly as run_launch does (same p object, same exit function, fresh scan)
            rc.reset_scan(); tokq = ev.buy(fs, SIZE, POOL_BPS); hi = -1e9; ts_ = None
            for j in range(bisect.bisect_right(RT, te + ev.LAND_BUY_S), len(RO)):
                r = RO[j]; tr = RT[j]
                if tr >= te + 7200: break
                if not ev.state_ok(r): continue
                p = types.SimpleNamespace(t=tr, size=SIZE, entry_t=te, fill_t=te + ev.LAND_BUY_S)
                p.x = (ev.sell(r, tokq, POOL_BPS) - ev.FIXED_FEE_SOL) / SIZE; hi = max(hi, p.x); p.hi = hi; p.seconds_held = tr - te
                rc.LAST.update(kind="trail", cluster_n=None, cluster_sol=None, buyers=None)
                if exit_fn(p):
                    ts_ = tr + ev.LAND_SELL_S; rec["trigger_t"] = tr; rec["exit_kind"] = rc.LAST["kind"]; rec["cluster_n"] = rc.LAST["cluster_n"]; rec["cluster_sol"] = rc.LAST["cluster_sol"]; rec["buyers_at_exit"] = rc.LAST["buyers"]; break
            assert ts_ is not None
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
    RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
    k = bisect.bisect_right(RT, t); v = types.SimpleNamespace(t=t, created=info["created"], trades=ev.Prefix(RO, k))
    f = rc.features(v) if t >= ret else None
    E = bool(f is not None and rc.eligible(f))
    frow = {"mint": m, "half": half, "created": info["created"], "retained_at": ret, "retained_by_t": t >= ret, "eligible_E": E}
    if f: frow.update({kk: f[kk] for kk in f}); frow["cell"] = rc.cell_of(f)
    if E:
        rc.set_tape(v); tp = rc.tape(); frow["early_cohort_n"] = len(tp.cohort)
        # diagnostic (no scoring): does any cluster event occur on valid rows within 2 h after the fill, regardless of the trail?
        fill_t = t + ev.LAND_BUY_S; ev_t = None; dd_t = None
        for j in range(bisect.bisect_right(RT, fill_t), len(RO)):
            if RT[j] >= t + 7200: break
            if not tp.ok[j]: continue
            if ev_t is None:
                lo = RT[j] - rc.SC_WINDOW_S; ws = set(); sol = 0.0; i = j
                while i >= 0 and RT[i] >= lo:
                    r = RO[i]
                    if tp.ok[i] and RT[i] > fill_t and r["is_buy"] != "1" and r["wallet"] in tp.cohort: ws.add(r["wallet"]); sol += fl(r["sol"]) or 0.0
                    i -= 1
                if len(ws) >= rc.SC_MIN_WALLETS and sol >= rc.SC_MIN_SOL: ev_t = RT[j] - t
            if dd_t is None and RT[j] - t >= rc.DD_MIN_HOLD_S:
                p_ = types.SimpleNamespace(t=RT[j])
                if tp.buyers_last(p_, rc.DD_WINDOW_S) <= rc.DD_MAX_BUYERS: dd_t = RT[j] - t
            if ev_t is not None and dd_t is not None: break
        frow["first_cluster_event_s"] = ev_t; frow["first_demand_decay_s"] = dd_t
    feats.append(frow)
    for name, exit_fn in SPECS.items():
        rec = run(m, info, L, ret, E, exit_fn, RO, RT); rec.update(spec=name, mint=m, half=half, created=info["created"], eligible_E=E, cell=(frow.get("cell") if E else None)); rows.append(rec)
    n = audit["eligible_early"] + audit["eligible_late"]
    if n % 500 == 0: print("ELIGIBLE", n, dict(audit), flush=True)
assert stats["non_contiguous"] == 0
keys = ["spec", "mint", "half", "cell", "created", "eligible_E", "cat", "why", "entry_t", "entry_age_s", "fill_state_age_s", "trigger_t", "t_sell", "hold_s", "exit_state_age_s", "net_sol", "ret", "exit", "exit_kind", "cluster_n", "cluster_sol", "buyers_at_exit", "fill_venue", "exit_venue", "hypothetical"]
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
            "exit_kinds": dict(collections.Counter(r.get("exit_kind") for r in rs)),
            "median_hold_s": statistics.median([r["hold_s"] for r in rs if r.get("hold_s") is not None]), "fill_state_age_median_s": statistics.median([r["fill_state_age_s"] for r in rs])}
def resolved_set(rr):
    att = [r for r in rr if r["cat"] != "abstain"]; filled = [r for r in att if r["cat"] == "scored" or (r["cat"] == "unknown" and r["why"].startswith("exit"))]
    unav = [r for r in att if r["cat"] == "unknown" and r["why"].startswith("fill")]
    stale_fill = [r for r in filled if (r.get("fill_state_age_s") or 0) > STALE]
    resolved = [r for r in filled if r["cat"] == "scored" and r not in stale_fill]; uncertain = [r for r in filled if r["cat"] == "unknown" and r not in stale_fill]
    stale_exit = [r for r in resolved if (r.get("exit_state_age_s") or 0) > STALE]; res2 = [r for r in resolved if r not in stale_exit]
    return att, filled, unav, stale_fill, uncertain, stale_exit, res2
def summ(rr):
    att, filled, unav, stale_fill, uncertain, stale_exit, res2 = resolved_set(rr)
    return {"attempted": len(att), "filled": len(filled), "unavailable_fill": len(unav), "unavailable_reasons": dict(collections.Counter(r["why"] for r in unav)),
            "stale_fill_gt30s_marked_unavailable": len(stale_fill), "resolved_raw_evaluator": block([r for r in filled if r["cat"] == "scored"]),
            "uncertain_exit": len(uncertain), "uncertain_reasons": dict(collections.Counter(r["why"] for r in uncertain)), "stale_exit_gt30s_marked_uncertain": len(stale_exit),
            "uncertain_by_exit_kind_raw": dict(collections.Counter(r.get("exit_kind") for r in uncertain)), "stale_exit_by_kind": dict(collections.Counter(r.get("exit_kind") for r in stale_exit)),
            "unknown_share_of_attempts": (len(att) - len(res2)) / len(att) if att else None,
            "resolved_after_staleness": block(res2), "by_half": {h: block([r for r in res2 if r["half"] == h]) for h in ("early", "late")},
            "by_cell": {c: block([r for r in res2 if r["cell"] == c]) for c in ("A", "B", "C")},
            "attempted_by_half": dict(collections.Counter(r["half"] for r in att)), "attempted_by_cell": dict(collections.Counter(r["cell"] for r in att)), "resolved_mints": sorted(r["mint"] for r in res2)}
S = {name: summ([r for r in rows if r["spec"] == name]) for name in SPECS}
ctrl = {r["mint"]: r for r in rows if r["spec"] == "control"}
def boot(vals, n=10000, seed=20261112):
    if not vals: return None
    rnd = random.Random(seed); k = len(vals); tots = sorted(math.fsum(rnd.choice(vals) for _ in range(k)) for _ in range(n)); return [tots[int(0.025 * n)], tots[int(0.975 * n)]]
cres = set(S["control"]["resolved_mints"])
def paired(name):
    cand = {r["mint"]: r for r in rows if r["spec"] == name}; cs = set(S[name]["resolved_mints"]); both = sorted(cres & cs)
    diffs = {mm: cand[mm]["net_sol"] - ctrl[mm]["net_sol"] for mm in both}; d = [diffs[mm] for mm in both]
    def sub(ms):
        dd = [diffs[mm] for mm in ms]
        return {"n": len(ms), "control_sol": math.fsum(ctrl[mm]["net_sol"] for mm in ms), "candidate_sol": math.fsum(cand[mm]["net_sol"] for mm in ms), "difference_sol": math.fsum(dd),
                "better": sum(x > 1e-12 for x in dd), "worse": sum(x < -1e-12 for x in dd), "unchanged": sum(abs(x) <= 1e-12 for x in dd), "bootstrap_95_difference": boot(dd)}
    only_c = sorted(cs - cres); only_k = sorted(cres - cs)
    return {"n_pairs": len(both), **sub(both), "by_half": {h: sub([mm for mm in both if ctrl[mm]["half"] == h]) for h in ("early", "late")},
            "by_cell": {c: sub([mm for mm in both if ctrl[mm]["cell"] == c]) for c in ("A", "B", "C")},
            "control_block": block([ctrl[mm] for mm in both]), "candidate_block": block([cand[mm] for mm in both]),
            "changed_pairs_block_candidate": block([cand[mm] for mm in both if abs(diffs[mm]) > 1e-12]), "changed_pairs_block_control": block([ctrl[mm] for mm in both if abs(diffs[mm]) > 1e-12]),
            "resolved_only_in_candidate": len(only_c), "resolved_only_in_control": len(only_k),
            "candidate_only_block": block([cand[mm] for mm in only_c]), "control_only_block": block([ctrl[mm] for mm in only_k]),
            "candidate_only_control_status": dict(collections.Counter(" / ".join(x for x in (ctrl[mm]["cat"], ctrl[mm].get("why") or "", "stale_exit" if (ctrl[mm].get("exit_state_age_s") or 0) > STALE else "") if x) for mm in only_c)),
            "control_only_candidate_status": dict(collections.Counter(" / ".join(x for x in (cand[mm]["cat"], cand[mm].get("why") or "", "stale_exit" if (cand[mm].get("exit_state_age_s") or 0) > STALE else "") if x) for mm in only_k)),
            "pairs_share_of_control_resolved": len(both) / len(cres), "pairs_share_of_candidate_resolved": len(both) / len(cs) if cs else None}
S["l004sc_paired"] = paired("l004sc"); S["l005dd_paired"] = paired("l005dd")
for name in list(S):
    if isinstance(S[name], dict) and "resolved_mints" in S[name]: S[name]["n_resolved_mints"] = len(S[name].pop("resolved_mints"))
E_rows = [r for r in feats if r["eligible_E"]]
def med(xs): xs = [x for x in xs if x is not None]; return statistics.median(xs) if xs else None
sc_rows = [r for r in rows if r["spec"] == "l004sc" and r["cat"] == "scored"]
diag = {"launches": len(feats), "retained_by_300s": sum(r["retained_by_t"] for r in feats), "eligible_E": len(E_rows), "E_by_half": dict(collections.Counter(r["half"] for r in E_rows)),
        "E_by_cell": dict(collections.Counter(r["cell"] for r in E_rows)),
        "early_cohort_n": {"median": med([r["early_cohort_n"] for r in E_rows]), "min": min(r["early_cohort_n"] for r in E_rows), "max": max(r["early_cohort_n"] for r in E_rows), "lt3": sum(1 for r in E_rows if r["early_cohort_n"] < 3)},
        "E_with_any_cluster_event_within_2h": sum(1 for r in E_rows if r.get("first_cluster_event_s") is not None),
        "first_cluster_event_s_median": med([r.get("first_cluster_event_s") for r in E_rows]),
        "E_with_any_demand_decay_within_2h": sum(1 for r in E_rows if r.get("first_demand_decay_s") is not None),
        "first_demand_decay_s_median": med([r.get("first_demand_decay_s") for r in E_rows]),
        "l004sc_raw_scored_exit_kinds": dict(collections.Counter(r.get("exit_kind") for r in sc_rows)),
        "l004sc_cluster_triggers_in_last_0.7s_of_horizon": sum(1 for r in sc_rows if r.get("exit_kind") == "cluster" and r.get("trigger_t") is not None and r["trigger_t"] > r["entry_t"] + 7199.3),
        "l004sc_cluster_min_sol": min([r["cluster_sol"] for r in sc_rows if r.get("exit_kind") == "cluster"] or [None]), "l004sc_cluster_min_wallets": min([r["cluster_n"] for r in sc_rows if r.get("exit_kind") == "cluster"] or [None]),
        "l004sc_ordering_ok": all(r["entry_t"] + ev.LAND_BUY_S <= r["trigger_t"] <= r["t_sell"] - ev.LAND_SELL_S + 1e-9 for r in sc_rows if r.get("trigger_t") is not None)}
summary = {"spec": {"size": SIZE, "pool_bps": POOL_BPS, "curve_bps": ev.CURVE_FEE_BPS, "fixed": ev.FIXED_FEE_SOL, "land_buy_s": ev.LAND_BUY_S, "land_sell_s": ev.LAND_SELL_S, "trail": TRAIL, "horizon_s": 7200, "decision_age_s": AGE, "stale_s": STALE,
           "sell_cluster": {"cohort_s": rc.SC_COHORT_S, "window_s": rc.SC_WINDOW_S, "min_wallets": rc.SC_MIN_WALLETS, "min_sol": rc.SC_MIN_SOL}, "demand_decay": {"window_s": rc.DD_WINDOW_S, "max_buyers": rc.DD_MAX_BUYERS, "min_hold_s": rc.DD_MIN_HOLD_S}, "min_buyers_60": rc.MIN_BUYERS_60},
           "audit": dict(audit), "stream_stats": {k: v for k, v in stats.items() if k != "_done"}, "diagnostics": diag, "results": S}
json.dump(summary, open(out / "results_s2.json", "w"), indent=2); print(json.dumps({k: summary[k] for k in ("audit", "diagnostics")}, indent=1))
for name in SPECS: print(name, json.dumps({k: S[name][k] for k in ("attempted", "filled", "unavailable_fill", "uncertain_exit", "stale_fill_gt30s_marked_unavailable", "stale_exit_gt30s_marked_uncertain")}), json.dumps(S[name]["resolved_after_staleness"]), json.dumps(S[name]["by_half"]))
for name in ("l004sc_paired", "l005dd_paired"): print(name, json.dumps({k: v for k, v in S[name].items() if not k.endswith("_block")}, indent=1))
