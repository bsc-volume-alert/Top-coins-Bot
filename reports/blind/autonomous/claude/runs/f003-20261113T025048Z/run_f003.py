"""F003 + CL-L008 — owner common scenario R4 (S2) on the same 679 eligibility-E entries, every spec through the frozen eval-1.1 run_launch UNCHANGED
(pool_bps=55), exactly as run_f009.py / run_f010.py / run_f011.py's run_eval:
  control  : E entries, 30 % trail — identical to f006p2 / f009 / f010 / f011 CONTROL;
  c1kept   : F003-C1 veto (skip when the creator's previous in-window launch was not retained by this creation), control exit;
  l008kept : CL-L008 (first-time-buyer share at 300 s >= 0.125), control exit.
Removed sides (C1 true; ftb < 0.125) and the pre-declared descriptive cuts (C2 serial20, C3 gap10, ftb >= 0.5, C1 removed by predecessor
retained-ever) are read off the CONTROL rows by flag: the kept spec's rows equal the control's on kept launches by construction (asserted).
0.2 SOL; buy +1 s; sell +0.7 s; curve 125 bps; pool 55 bps; 0.0015 SOL fixed; 2 h cap; landing state older than 30 s => unavailable (fill) /
uncertain (exit) by post-check, exactly as in f006p2 run_s2.py / f009 / f010 / f011.
Usage: F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> F003_F002_LAUNCHES=<f002 launches.csv.gz> F003_WALLET_MAP=<wallet_map.pkl>
       python3 -I run_f003.py <replay dir> <out dir>"""
import sys, os, pathlib, json, csv, types, math, statistics, collections, bisect, hashlib, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc, creator_history as ch, ftb
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ev = rc.ev(); assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
assert not ev.DEV_NO_EVIDENCE
START, SPLIT, END = 1793950800, 1794016200, 1794081600
POOL_BPS = 55; SIZE = 0.2; TRAIL = 0.30; STALE = 30; AGE = 300; HORIZON = 7200; SEED = 20261113
tok, gaps, outages, meta = ev.load(str(replay), START, END); fl = ev.fl

def retained(info, L):
    cum = 0.0
    for r in L:
        if not rc.iscurve(r): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= 15:
            rv = fl(r["recv_ms"]); return rv / 1000 if rv else fl(r["ts"])
    return None

def run_eval(m, info, L, ret, enter):
    """Through the frozen evaluator's run_launch (as run_f009.py / run_f010.py / run_f011.py)."""
    mod = types.SimpleNamespace(decide=lambda v: enter and v.t == info["created"] + AGE, exit_signal=rc.exit_signal)
    R = {"decision_offsets": [AGE], "on_trade": False, "horizon_s": HORIZON, "sizes": [SIZE]}
    res, hyp = ev.run_launch(mod, R, m, info, L, gaps, outages, meta, POOL_BPS)
    rec = {"cat": res["cat"], "why": res.get("why"), "entry_t": res.get("entry_t"), "hypothetical": hyp}
    if res.get("entry_t") is not None:
        te = res["entry_t"]; fs, fw = ev.state_at(L, te + ev.LAND_BUY_S, gaps, outages, info["created"], ret)
        rec["fill_state_age_s"] = (te + ev.LAND_BUY_S - fl(fs["ts"])) if fs else None; rec["entry_age_s"] = te - info["created"]
    if res["cat"] == "scored":
        s = res["sizes"][str(SIZE)]; rec.update(net_sol=s["net_sol"], ret=s["ret"], exit=s["exit"], fill_venue=s["fill_venue"], exit_venue=s["exit_venue"], exit_kind=("horizon" if s["exit"] == "horizon" else "trail"))
        if s["exit"] == "horizon": ts_ = te + HORIZON
        else:
            RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
            tokq = ev.buy(fs, SIZE, POOL_BPS); hi = -1e9; ts_ = None
            for j in range(bisect.bisect_right(RT, te + ev.LAND_BUY_S), len(RO)):
                r = RO[j]; tr = RT[j]
                if tr >= te + HORIZON: break
                if not ev.state_ok(r): continue
                p = types.SimpleNamespace(t=tr, size=SIZE, entry_t=te, fill_t=te + ev.LAND_BUY_S)
                p.x = (ev.sell(r, tokq, POOL_BPS) - ev.FIXED_FEE_SOL) / SIZE; hi = max(hi, p.x); p.hi = hi; p.seconds_held = tr - te
                if rc.exit_signal(p): ts_ = tr + ev.LAND_SELL_S; rec["trigger_t"] = tr; break
            assert ts_ is not None
        ss, sw = ev.state_at(L, ts_, gaps, outages, info["created"], ret)
        rec["exit_state_age_s"] = (ts_ - fl(ss["ts"])) if ss else None; rec["t_sell"] = ts_; rec["hold_s"] = ts_ - te
    return rec

stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; audit = collections.Counter(); rows = []; feats = []; mism = []
for m, L in ev.iter_mints(str(replay), tok, stats):
    info = tok[m]; ret = retained(info, L)
    if ret is None: audit["not_retained"] += 1; continue
    if any(s < info["created"] + HORIZON and e > info["created"] for s, e in outages): audit["outage_excluded"] += 1; continue
    half = "early" if info["created"] < SPLIT else "late"; audit["eligible_" + half] += 1
    t = info["created"] + AGE
    RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
    k = bisect.bisect_right(RT, t); v = types.SimpleNamespace(t=t, created=info["created"], trades=ev.Prefix(RO, k))
    f = rc.features(v) if t >= ret else None
    E = bool(f is not None and rc.eligible(f)); h = ch.of(m); fs_ = ftb.share(v) if E else None
    frow = {"mint": m, "half": half, "created": info["created"], "retained_at": ret, "retained_by_t": t >= ret, "eligible_E": E,
            "creator": h["creator"], "n_prior": h["n_prior"], "prev_mint": h["prev_mint"], "gap_s": h["gap_s"], "prev_retained_by_c": h["prev_retained_by_c"], "prev_retained_ever": h["prev_retained_ever"],
            "C1_prev_not_retained": h["C1_prev_not_retained"], "C2_serial20": h["C2_serial20"], "C3_gap10": h["C3_gap10"], "ftb_share": fs_}
    if f: frow.update({kk: f[kk] for kk in f}); frow["cell"] = rc.cell_of(f)
    feats.append(frow)
    c = run_eval(m, info, L, ret, E); k1 = run_eval(m, info, L, ret, E and not h["C1_prev_not_retained"]); l8 = run_eval(m, info, L, ret, E and fs_ is not None and fs_ >= ftb.THRESHOLD)
    for name, rec, kept in (("control", c, E), ("c1kept", k1, E and not h["C1_prev_not_retained"]), ("l008kept", l8, E and fs_ is not None and fs_ >= ftb.THRESHOLD)):
        rec.update(spec=name, mint=m, half=half, created=info["created"], eligible_E=E, cell=(frow.get("cell") if E else None), kept=kept,
                   C1=h["C1_prev_not_retained"], C2=h["C2_serial20"], C3=h["C3_gap10"], n_prior=h["n_prior"], gap_s=h["gap_s"], prev_retained_ever=h["prev_retained_ever"], ftb_share=fs_); rows.append(rec)
        if name != "control" and kept and not (rec["cat"] == c["cat"] and rec.get("why") == c.get("why") and ((rec.get("net_sol") is None and c.get("net_sol") is None) or abs(rec["net_sol"] - c["net_sol"]) < 1e-12)):
            mism.append({"mint": m, "spec": name})
    n = audit["eligible_early"] + audit["eligible_late"]
    if n % 500 == 0: print("ELIGIBLE", n, dict(audit), flush=True)
assert stats["non_contiguous"] == 0
assert not mism, mism      # kept launches must be identical to the control by construction
keys = ["spec", "mint", "half", "cell", "created", "eligible_E", "kept", "C1", "C2", "C3", "n_prior", "gap_s", "prev_retained_ever", "ftb_share", "cat", "why", "entry_t", "entry_age_s", "fill_state_age_s", "trigger_t", "t_sell", "hold_s", "exit_state_age_s", "net_sol", "ret", "exit", "exit_kind", "fill_venue", "exit_venue", "hypothetical"]
with open(out / "ledger.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=keys, extrasaction="ignore"); w.writeheader(); w.writerows(rows)
fk = sorted(set(kk for r in feats for kk in r))
with open(out / "features_at_300s.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=fk); w.writeheader(); w.writerows(feats)

def boot(vals, n=10000, seed=SEED, fn=math.fsum):
    if not vals: return None
    rnd = random.Random(seed); k = len(vals); tots = sorted(fn([rnd.choice(vals) for _ in range(k)]) for _ in range(n)); return [tots[int(0.025 * n)], tots[int(0.975 * n)]]
def block(rs, ci=False):
    if not rs: return {"n": 0, "total_sol": 0.0}
    v = sorted(r["net_sol"] for r in rs); rets = [r["ret"] for r in rs]
    b = {"n": len(rs), "total_sol": math.fsum(v), "per_trade_sol": math.fsum(v) / len(v), "mean_ret": statistics.mean(rets), "median_ret": statistics.median(rets), "win_rate": sum(x > 0 for x in v) / len(v),
         "share_loss_gt50": sum(x < -0.5 * SIZE for x in v) / len(v), "without_best1_sol": math.fsum(v[:-1]), "without_best3_sol": math.fsum(v[:-3]), "best3_sol": v[-3:], "worst_sol": v[0],
         "exit_kinds": dict(collections.Counter(r.get("exit_kind") for r in rs)), "median_hold_s": statistics.median([r["hold_s"] for r in rs if r.get("hold_s") is not None]),
         "fill_state_age_median_s": statistics.median([r["fill_state_age_s"] for r in rs])}
    if ci: b["bootstrap_95_total_sol"] = boot(v); b["bootstrap_95_per_trade_sol"] = boot(v, fn=lambda xs: math.fsum(xs) / len(xs))
    return b
def resolved_set(rr):
    att = [r for r in rr if r["cat"] != "abstain"]; filled = [r for r in att if r["cat"] == "scored" or (r["cat"] == "unknown" and r["why"].startswith("exit"))]
    unav = [r for r in att if r["cat"] == "unknown" and not r["why"].startswith("exit")]
    stale_fill = [r for r in filled if (r.get("fill_state_age_s") or 0) > STALE]
    resolved = [r for r in filled if r["cat"] == "scored" and r not in stale_fill]; uncertain = [r for r in filled if r["cat"] == "unknown" and r not in stale_fill]
    stale_exit = [r for r in resolved if (r.get("exit_state_age_s") or 0) > STALE]; res2 = [r for r in resolved if r not in stale_exit]
    return att, filled, unav, stale_fill, uncertain, stale_exit, res2
def summ(rr, ci=True):
    att, filled, unav, stale_fill, uncertain, stale_exit, res2 = resolved_set(rr)
    return {"attempted": len(att), "filled": len(filled), "unavailable_fill": len(unav), "unavailable_reasons": dict(collections.Counter(r["why"] for r in unav)),
            "stale_fill_gt30s_marked_unavailable": len(stale_fill), "resolved_raw_evaluator": block([r for r in filled if r["cat"] == "scored"]),
            "uncertain_exit": len(uncertain), "uncertain_reasons": dict(collections.Counter(r["why"] for r in uncertain)), "stale_exit_gt30s_marked_uncertain": len(stale_exit),
            "unknown_share_of_attempts": (len(att) - len(res2)) / len(att) if att else None,
            "resolved_after_staleness": block(res2, ci), "by_half": {h: block([r for r in res2 if r["half"] == h]) for h in ("early", "late")},
            "by_cell": {c: block([r for r in res2 if r["cell"] == c]) for c in ("A", "B", "C")},
            "attempted_by_half": dict(collections.Counter(r["half"] for r in att)), "attempted_by_cell": dict(collections.Counter(r["cell"] for r in att)), "resolved_mints": sorted(r["mint"] for r in res2)}
SPECS = ("control", "c1kept", "l008kept")
S = {name: summ([r for r in rows if r["spec"] == name]) for name in SPECS}
ctrl = {r["mint"]: r for r in rows if r["spec"] == "control"}
cres = set(S["control"]["resolved_mints"])
def paired(name):
    cand = {r["mint"]: r for r in rows if r["spec"] == name}; cs = set(S[name]["resolved_mints"]); both = sorted(cres & cs)
    diffs = [cand[mm]["net_sol"] - ctrl[mm]["net_sol"] for mm in both]
    return {"n_pairs": len(both), "control_sol": math.fsum(ctrl[mm]["net_sol"] for mm in both), "candidate_sol": math.fsum(cand[mm]["net_sol"] for mm in both), "difference_sol": math.fsum(diffs),
            "better": sum(x > 1e-12 for x in diffs), "worse": sum(x < -1e-12 for x in diffs), "unchanged": sum(abs(x) <= 1e-12 for x in diffs),
            "resolved_only_in_candidate": len(cs - cres), "resolved_only_in_control": len(cres - cs), "control_only_block": block([ctrl[mm] for mm in sorted(cres - cs)]),
            "pairs_share_of_control_resolved": len(both) / len(cres), "pairs_share_of_candidate_resolved": len(both) / len(cs) if cs else None}
S["c1kept_paired"] = paired("c1kept"); S["l008kept_paired"] = paired("l008kept")
E_ctrl = [ctrl[r["mint"]] for r in feats if r["eligible_E"]]
def side_cmp(label, kept, removed):
    """kept / removed sides of E under the control exit: summaries with CIs, the per-trade difference with an iid bootstrap CI, halves and cells."""
    sk, sr = summ(kept), summ(removed)
    for s in (sk, sr): s["n_resolved_mints"] = len(s.pop("resolved_mints"))
    rk = [r["net_sol"] for r in resolved_set(kept)[6]]; rr_ = [r["net_sol"] for r in resolved_set(removed)[6]]
    def diff_ci(a, b, n=10000):
        if not a or not b: return None
        rnd = random.Random(SEED); d = sorted((math.fsum(rnd.choice(a) for _ in a) / len(a)) - (math.fsum(rnd.choice(b) for _ in b) / len(b)) for _ in range(n)); return [d[int(0.025 * n)], d[int(0.975 * n)]]
    out_ = {"E_total": len(kept) + len(removed), "kept_attempted": len(kept), "removed_attempted": len(removed), "removed_share_of_E": (len(removed) / (len(kept) + len(removed))) if (kept or removed) else None,
            "kept": sk, "removed": sr,
            "per_trade_kept_minus_removed_sol": ((math.fsum(rk) / len(rk)) - (math.fsum(rr_) / len(rr_))) if rk and rr_ else None, "per_trade_difference_bootstrap_95": diff_ci(rk, rr_),
            "removed_fewer_than_30_resolved": len(rr_) < 30,
            "by_half": {h: {"kept": block([r for r in resolved_set([x for x in kept if x["half"] == h])[6]]), "removed": block([r for r in resolved_set([x for x in removed if x["half"] == h])[6]])} for h in ("early", "late")},
            "by_cell": {c: {"kept": block([r for r in resolved_set([x for x in kept if x["cell"] == c])[6]]), "removed": block([r for r in resolved_set([x for x in removed if x["cell"] == c])[6]]),
                            "kept_attempted": sum(1 for x in kept if x["cell"] == c), "removed_attempted": sum(1 for x in removed if x["cell"] == c)} for c in ("A", "B", "C")}}
    return out_
S["F003_C1_sides"] = side_cmp("C1", [r for r in E_ctrl if not r["C1"]], [r for r in E_ctrl if r["C1"]])
S["F003_C1_removed_by_prev_retained_ever"] = {"prev_never_retained_in_window": side_cmp("C1a", [], [r for r in E_ctrl if r["C1"] and not r["prev_retained_ever"]])["removed"],
                                               "prev_retained_only_after_c": side_cmp("C1b", [], [r for r in E_ctrl if r["C1"] and r["prev_retained_ever"]])["removed"]}
S["descriptive_C2_serial20_sides"] = side_cmp("C2", [r for r in E_ctrl if not r["C2"]], [r for r in E_ctrl if r["C2"]])
S["descriptive_C3_gap10_sides"] = side_cmp("C3", [r for r in E_ctrl if not r["C3"]], [r for r in E_ctrl if r["C3"]])
S["descriptive_no_predecessor_vs_any"] = side_cmp("P", [r for r in E_ctrl if r["n_prior"] == 0], [r for r in E_ctrl if r["n_prior"] >= 1])
S["CL_L008_sides"] = side_cmp("L008", [r for r in E_ctrl if r["ftb_share"] is not None and r["ftb_share"] >= ftb.THRESHOLD], [r for r in E_ctrl if not (r["ftb_share"] is not None and r["ftb_share"] >= ftb.THRESHOLD)])
S["descriptive_ftb_ge_0.5_sides"] = side_cmp("L008b", [r for r in E_ctrl if r["ftb_share"] is not None and r["ftb_share"] >= 0.5], [r for r in E_ctrl if not (r["ftb_share"] is not None and r["ftb_share"] >= 0.5)])
# post-hoc description (no verdict): ftb_share quartiles of E under the control exit, counts and totals only
qs = statistics.quantiles([r["ftb_share"] for r in E_ctrl], n=4)
def qbin(x): return "Q1" if x < qs[0] else ("Q2" if x < qs[1] else ("Q3" if x < qs[2] else "Q4"))
S["descriptive_ftb_quartiles"] = {"cuts": qs, **{q: {"attempted": sum(1 for r in E_ctrl if qbin(r["ftb_share"]) == q), **block(resolved_set([r for r in E_ctrl if qbin(r["ftb_share"]) == q])[6])} for q in ("Q1", "Q2", "Q3", "Q4")}}
S["descriptive_C1_within_C_cell_by_ftb"] = {"note": "C1 removed launches in cell C split at the registered ftb threshold — counts and totals only",
    "removed_ftb_ge": block(resolved_set([r for r in E_ctrl if r["C1"] and r["cell"] == "C" and r["ftb_share"] >= ftb.THRESHOLD])[6]), "removed_ftb_lt": block(resolved_set([r for r in E_ctrl if r["C1"] and r["cell"] == "C" and r["ftb_share"] < ftb.THRESHOLD])[6])}
for name in list(S):
    if isinstance(S[name], dict) and "resolved_mints" in S[name]: S[name]["n_resolved_mints"] = len(S[name].pop("resolved_mints"))
E_rows = [r for r in feats if r["eligible_E"]]
diag = {"launches": len(feats), "retained_by_300s": sum(r["retained_by_t"] for r in feats), "eligible_E": len(E_rows), "E_by_half": dict(collections.Counter(r["half"] for r in E_rows)), "E_by_cell": dict(collections.Counter(r["cell"] for r in E_rows)),
        "kept_equals_control_mismatches": len(mism), "E_C1": sum(r["C1_prev_not_retained"] for r in E_rows), "E_C2": sum(r["C2_serial20"] for r in E_rows), "E_C3": sum(r["C3_gap10"] for r in E_rows),
        "E_no_predecessor": sum(1 for r in E_rows if r["n_prior"] == 0), "E_ftb_ge_threshold": sum(1 for r in E_rows if r["ftb_share"] is not None and r["ftb_share"] >= ftb.THRESHOLD), "E_ftb_median": statistics.median([r["ftb_share"] for r in E_rows])}
summary = {"spec": {"size": SIZE, "pool_bps": POOL_BPS, "curve_bps": ev.CURVE_FEE_BPS, "fixed": ev.FIXED_FEE_SOL, "land_buy_s": ev.LAND_BUY_S, "land_sell_s": ev.LAND_SELL_S, "trail": TRAIL, "horizon_s": HORIZON, "decision_age_s": AGE, "stale_s": STALE,
           "min_buyers_60": rc.MIN_BUYERS_60, "ftb_threshold": ftb.THRESHOLD, "bootstrap_seed": SEED}, "audit": dict(audit), "stream_stats": {k: v for k, v in stats.items() if k != "_done"}, "diagnostics": diag, "results": S}
json.dump(summary, open(out / "results_s2.json", "w"), indent=2); print(json.dumps({k: summary[k] for k in ("audit", "diagnostics")}, indent=1))
for name in SPECS: print(name, json.dumps({k: S[name][k] for k in ("attempted", "filled", "unavailable_fill", "uncertain_exit", "stale_fill_gt30s_marked_unavailable", "stale_exit_gt30s_marked_uncertain")}), json.dumps(S[name]["resolved_after_staleness"]), json.dumps(S[name]["by_half"]))
for name in ("F003_C1_sides", "CL_L008_sides", "descriptive_C2_serial20_sides", "descriptive_C3_gap10_sides", "descriptive_no_predecessor_vs_any", "descriptive_ftb_ge_0.5_sides"):
    s = S[name]; print(name, json.dumps({"kept": {k: s["kept"][k] for k in ("attempted", "resolved_after_staleness")}, "removed": {k: s["removed"][k] for k in ("attempted", "resolved_after_staleness")}, "per_trade_diff": s["per_trade_kept_minus_removed_sol"], "ci": s["per_trade_difference_bootstrap_95"], "by_half": s["by_half"], "by_cell": s["by_cell"]}, indent=1))
print("ftb_quartiles", json.dumps(S["descriptive_ftb_quartiles"], indent=1)); print("C1_removed_split", json.dumps(S["F003_C1_removed_by_prev_retained_ever"], indent=1)); print("C1_C_by_ftb", json.dumps(S["descriptive_C1_within_C_cell_by_ftb"], indent=1))
