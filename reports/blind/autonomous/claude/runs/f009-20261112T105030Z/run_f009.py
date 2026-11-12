"""F009 + CL-L004 — owner common scenario R4 (S2) for: CONTROL (eligibility E), cells A / B / C (fixed creator partition of E) and the
CL-L004 time-stop exit on the same E entries. Frozen eval-1.1 run_launch imported unchanged with pool_bps=55; 0.2 SOL; buy +1 s; sell +0.7 s;
curve 125 bps; 0.0015 SOL fixed; 30 % trail on sellable proceeds (CL-L004 adds: exit at the first valid state held >= 600 s with x < 1.20);
2 h cap; landing state older than 30 s => unavailable (fill) / uncertain (exit) by post-check, as in f006p2 run_s2.py (this file is run_s2.py
with the spec table generalised to (entry condition, exit function) and the F009 diagnostics added; nothing else changed).
Usage: F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> python3 -I run_f009.py <replay dir> <out dir>"""
import sys, os, pathlib, importlib.util, json, csv, types, math, statistics, collections, bisect, hashlib, gzip, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ev = rc.ev(); assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
assert not ev.DEV_NO_EVIDENCE
START, SPLIT, END = 1793950800, 1794016200, 1794081600
POOL_BPS = 55; SIZE = 0.2; TRAIL = 0.30; STALE = 30; AGE = 300
tok, gaps, outages, meta = ev.load(str(replay), START, END); fl = ev.fl
SPECS = {"control": (lambda f: True, rc.exit_signal), "cellA": (rc.cond_A, rc.exit_signal), "cellB": (rc.cond_B, rc.exit_signal), "cellC": (rc.cond_C, rc.exit_signal),
         "l004ts": (lambda f: True, rc.exit_signal_ts)}
TOKMETA = {}
with io.TextIOWrapper(gzip.open(os.environ["F006P2_TOKENS"]), newline="") as fh:
    for r in csv.DictReader(fh): TOKMETA[r["mint"]] = {"dev_buy_sol": fl(r.get("dev_buy_sol")), "bundle_pct": fl(r.get("bundle_pct")), "tier": r.get("tier")}

def retained(info, L):
    cum = 0.0
    for r in L:
        if not rc.iscurve(r): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= 15:
            rv = fl(r["recv_ms"]); return rv / 1000 if rv else fl(r["ts"])
    return None

def run(m, info, L, ret, enter, exit_fn):
    mod = types.SimpleNamespace(decide=lambda v: enter and v.t == info["created"] + AGE, exit_signal=exit_fn)
    R = {"decision_offsets": [AGE], "on_trade": False, "horizon_s": 7200, "sizes": [SIZE]}
    res, hyp = ev.run_launch(mod, R, m, info, L, gaps, outages, meta, POOL_BPS)
    rec = {"cat": res["cat"], "why": res.get("why"), "entry_t": res.get("entry_t"), "hypothetical": hyp}
    if res.get("entry_t") is not None:
        te = res["entry_t"]; fs, fw = ev.state_at(L, te + ev.LAND_BUY_S, gaps, outages, info["created"], ret)
        rec["fill_state_age_s"] = (te + ev.LAND_BUY_S - fl(fs["ts"])) if fs else None; rec["entry_age_s"] = te - info["created"]
    if res["cat"] == "scored":
        s = res["sizes"][str(SIZE)]; rec.update(net_sol=s["net_sol"], ret=s["ret"], exit=s["exit"], fill_venue=s["fill_venue"], exit_venue=s["exit_venue"])
        if s["exit"] == "horizon": ts_ = te + 7200
        else:  # re-derive the trigger time exactly as run_launch does (same p object, same exit function)
            RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
            tokq = ev.buy(fs, SIZE, POOL_BPS); hi = -1e9; ts_ = None
            for j in range(bisect.bisect_right(RT, te + ev.LAND_BUY_S), len(RO)):
                r = RO[j]; tr = RT[j]
                if tr >= te + 7200: break
                if not ev.state_ok(r): continue
                p = types.SimpleNamespace(t=tr, size=SIZE, entry_t=te, fill_t=te + ev.LAND_BUY_S)
                p.x = (ev.sell(r, tokq, POOL_BPS) - ev.FIXED_FEE_SOL) / SIZE; hi = max(hi, p.x); p.hi = hi; p.seconds_held = tr - te
                if exit_fn(p): ts_ = tr + ev.LAND_SELL_S; rec["exit_kind"] = ("timestop" if (p.seconds_held >= rc.TS_HOLD_S and p.x < rc.TS_MIN_X and not rc.exit_signal(p)) else "trail"); break
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
    frow = {"mint": m, "half": half, "created": info["created"], "retained_at": ret, "retained_by_t": t >= ret, "eligible_E": E,
            "tape_start_s": (min(fl(r["ts"]) for r in L) - info["created"]) if L else None, "dev_buy_sol": TOKMETA.get(m, {}).get("dev_buy_sol"), "bundle_pct": TOKMETA.get(m, {}).get("bundle_pct")}
    if f: frow.update({kk: f[kk] for kk in f}); frow["cell"] = rc.cell_of(f); frow["creator_bought_gt0"] = f["creator_bought_tokens"] > 0
    feats.append(frow)
    for name, (cond, exit_fn) in SPECS.items():
        enter = E and bool(cond(f))
        rec = run(m, info, L, ret, enter, exit_fn); rec.update(spec=name, mint=m, half=half, created=info["created"], eligible_E=E, cell=(frow.get("cell") if E else None)); rows.append(rec)
    n = audit["eligible_early"] + audit["eligible_late"]
    if n % 500 == 0: print("ELIGIBLE", n, dict(audit), flush=True)
assert stats["non_contiguous"] == 0
keys = ["spec", "mint", "half", "cell", "created", "eligible_E", "cat", "why", "entry_t", "entry_age_s", "fill_state_age_s", "t_sell", "hold_s", "exit_state_age_s", "net_sol", "ret", "exit", "exit_kind", "fill_venue", "exit_venue", "hypothetical"]
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
            "exit_trigger": sum(r["exit"] == "trigger" for r in rs), "exit_horizon": sum(r["exit"] == "horizon" for r in rs), "exit_timestop": sum(r.get("exit_kind") == "timestop" for r in rs),
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
            "unknown_share_of_attempts": (len(att) - len(res2)) / len(att) if att else None,
            "resolved_after_staleness": block(res2), "by_half": {h: block([r for r in res2 if r["half"] == h]) for h in ("early", "late")},
            "attempted_by_half": dict(collections.Counter(r["half"] for r in att)), "resolved_mints": sorted(r["mint"] for r in res2)}
S = {name: summ([r for r in rows if r["spec"] == name]) for name in SPECS}
ctrl = {r["mint"]: r for r in rows if r["spec"] == "control"}; fmap = {r["mint"]: r for r in feats}
# F009 partition checks: cells' resolved trades are the control's trades; sum of cells == control
cres = set(S["control"]["resolved_mints"]); union = set()
for c in ("cellA", "cellB", "cellC"):
    cs = set(S[c]["resolved_mints"]); union |= cs; assert cs <= cres
    for mm in cs:
        rc_ = next(r for r in rows if r["spec"] == c and r["mint"] == mm); assert abs(rc_["net_sol"] - ctrl[mm]["net_sol"]) < 1e-12
assert union == cres
S["partition_check"] = {"cells_union_equals_control_resolved": union == cres, "cells_disjoint": sum(len(S[c]["resolved_mints"]) for c in ("cellA", "cellB", "cellC")) == len(cres),
                        "sum_cells_total_sol": math.fsum(S[c]["resolved_after_staleness"]["total_sol"] for c in ("cellA", "cellB", "cellC")), "control_total_sol": S["control"]["resolved_after_staleness"]["total_sol"]}
# pooled A+B (= f006p2 "creator sold 0") and complement views
ab = [ctrl[mm] for mm in sorted(set(S["cellA"]["resolved_mints"]) | set(S["cellB"]["resolved_mints"]))]
S["cellAB_pooled_creator_sold0"] = {"resolved": block(ab), "by_half": {h: block([r for r in ab if r["half"] == h]) for h in ("early", "late")}}
# CL-L004 paired view vs control (R11): launches resolved under both
ts_rows = {r["mint"]: r for r in rows if r["spec"] == "l004ts"}; both = sorted(cres & set(S["l004ts"]["resolved_mints"]))
pc = [ctrl[mm] for mm in both]; pt = [ts_rows[mm] for mm in both]
diffs = [ts_rows[mm]["net_sol"] - ctrl[mm]["net_sol"] for mm in both]
S["l004ts_paired"] = {"n_pairs": len(both), "control_total_sol": math.fsum(r["net_sol"] for r in pc), "l004ts_total_sol": math.fsum(r["net_sol"] for r in pt),
                      "difference_sol": math.fsum(diffs), "better": sum(d > 1e-12 for d in diffs), "worse": sum(d < -1e-12 for d in diffs), "unchanged": sum(abs(d) <= 1e-12 for d in diffs),
                      "by_half": {h: {"n": sum(1 for mm in both if ctrl[mm]["half"] == h), "control_sol": math.fsum(ctrl[mm]["net_sol"] for mm in both if ctrl[mm]["half"] == h),
                                      "l004ts_sol": math.fsum(ts_rows[mm]["net_sol"] for mm in both if ctrl[mm]["half"] == h)} for h in ("early", "late")},
                      "control_block": block(pc), "l004ts_block": block(pt),
                      "resolved_only_in_l004ts": len(set(S["l004ts"]["resolved_mints"]) - cres), "resolved_only_in_control": len(cres - set(S["l004ts"]["resolved_mints"])),
                      "l004ts_only_block": block([ts_rows[mm] for mm in sorted(set(S["l004ts"]["resolved_mints"]) - cres)]),
                      "control_only_block": block([ctrl[mm] for mm in sorted(cres - set(S["l004ts"]["resolved_mints"]))]),
                      "pairs_share_of_control_resolved": len(both) / len(cres), "pairs_share_of_l004ts_resolved": len(both) / len(S["l004ts"]["resolved_mints"])}
# bootstrap CI on paired difference and on cell totals (seed fixed)
import random
def boot(vals, n=10000, seed=20261112):
    if not vals: return None
    rnd = random.Random(seed); k = len(vals); tots = sorted(math.fsum(rnd.choice(vals) for _ in range(k)) for _ in range(n)); return [tots[int(0.025 * n)], tots[int(0.975 * n)]]
S["bootstrap_95"] = {"l004ts_paired_difference": boot(diffs), **{c: boot([r["net_sol"] for r in rows if r["spec"] == c and r["mint"] in set(S[c]["resolved_mints"])]) for c in ("cellA", "cellB", "cellC")}}
for name in list(S):
    if isinstance(S[name], dict) and "resolved_mints" in S[name]: S[name]["n_resolved_mints"] = len(S[name].pop("resolved_mints"))
E_rows = [r for r in feats if r["eligible_E"]]
def med(xs): xs = [x for x in xs if x is not None]; return statistics.median(xs) if xs else None
cells = {}
for c in ("A", "B", "C"):
    cr = [r for r in E_rows if r["cell"] == c]
    cells[c] = {"n": len(cr), "by_half": dict(collections.Counter(r["half"] for r in cr)), "tape_start_gt5s_share": sum(1 for r in cr if (r["tape_start_s"] or 0) > 5) / len(cr) if cr else None,
                "tape_start_s_median": med([r["tape_start_s"] for r in cr]), "dev_buy_sol_gt0_share": sum(1 for r in cr if (r["dev_buy_sol"] or 0) > 0) / len(cr) if cr else None,
                "dev_buy_sol_median": med([r["dev_buy_sol"] for r in cr]), "bundle_pct_median": med([r["bundle_pct"] for r in cr]),
                "creator_bought_tokens_median": med([r["creator_bought_tokens"] for r in cr if r["creator_bought_tokens"] > 0]),
                "creator_sold_tokens_median": med([r["creator_sold_tokens"] for r in cr if r["creator_sold_tokens"] > 0]),
                "buyers_last_60s_median": med([r["buyers_last_60s"] for r in cr]), "top10_median": med([r["top10_holder_share"] for r in cr]), "early_sold_median": med([r["early_buyer_sold_share"] for r in cr]),
                "cond_t1_count": sum(1 for r in cr if r.get("cond_t1"))}
diag = {"launches": len(feats), "retained_by_300s": sum(r["retained_by_t"] for r in feats), "eligible_E": len(E_rows), "E_by_half": dict(collections.Counter(r["half"] for r in E_rows)),
        "cells": cells, "creator_sold0_pooled": sum(1 for r in E_rows if r["cell"] in "AB"),
        "not_E_reasons": dict(collections.Counter(("not_retained_by_300s" if not r["retained_by_t"] else "no_trades" if "last_is_valid_curve" not in r else "last_not_valid_curve" if not r["last_is_valid_curve"] else "buyers60_lt5") for r in feats if not r["eligible_E"]))}
summary = {"spec": {"size": SIZE, "pool_bps": POOL_BPS, "curve_bps": ev.CURVE_FEE_BPS, "fixed": ev.FIXED_FEE_SOL, "land_buy_s": ev.LAND_BUY_S, "land_sell_s": ev.LAND_SELL_S, "trail": TRAIL, "horizon_s": 7200, "decision_age_s": AGE, "stale_s": STALE,
          "timestop": {"hold_s": rc.TS_HOLD_S, "min_x": rc.TS_MIN_X}, "min_buyers_60": rc.MIN_BUYERS_60},
           "audit": dict(audit), "stream_stats": {k: v for k, v in stats.items() if k != "_done"}, "diagnostics": diag, "results": S}
json.dump(summary, open(out / "results_s2.json", "w"), indent=2); print(json.dumps({k: summary[k] for k in ("audit", "diagnostics")}, indent=1))
for name in SPECS: print(name, json.dumps({k: S[name][k] for k in ("attempted", "filled", "unavailable_fill", "uncertain_exit", "stale_fill_gt30s_marked_unavailable", "stale_exit_gt30s_marked_uncertain")}), json.dumps(S[name]["resolved_after_staleness"]), json.dumps(S[name]["by_half"]))
print("partition", json.dumps(S["partition_check"])); print("paired", json.dumps(S["l004ts_paired"], indent=1)); print("boot", json.dumps(S["bootstrap_95"]))
