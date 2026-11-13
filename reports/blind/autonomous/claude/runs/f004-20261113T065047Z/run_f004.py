"""f004 — owner common scenario R4 (S2): the six registered specs (rule_base60 / rule_run2 / rule_run3 / rule_run5 / rule_dipctl / rule_dipcand)
through the frozen eval-1.1 run_launch UNCHANGED (pool_bps = 55) on every retained, outage-free window launch, with the staleness post-check
(landing state older than 30 s => fill unavailable / exit uncertain) exactly as f006p2 run_s2.py / f009 / f010 / f011 / f003.
Writes ledger.csv (one row per spec x launch) and results_s2.json.
Usage: F006P2_EVAL=<evaluate.py> F004_STUDY_MINTS=<study_entries_window.csv(.gz)> python3 -I run_f004.py <replay dir> <out dir>"""
import sys, os, pathlib, json, csv, gzip, io, types, math, statistics, collections, bisect, hashlib, random, importlib.util
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_f004 as rf
HERE = os.path.dirname(os.path.abspath(__file__))
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ev = rf.ev(); assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
assert not ev.DEV_NO_EVIDENCE
ev.KEEP = ev.KEEP + ("price_sol",)   # frozen file unchanged; its reader keeps the trade-price column the registered triggers read
START, SPLIT, END = 1793950800, 1794016200, 1794081600
POOL_BPS = 55; SIZE = 0.2; STALE = 30; HORIZON = 7200; SEED = 20261113
tok, gaps, outages, meta = ev.load(str(replay), START, END); fl = ev.fl
def opn(p): return io.TextIOWrapper(gzip.open(p), newline="") if p.endswith(".gz") else open(p, newline="")
STUDY = {r["mint"] for r in csv.DictReader(opn(os.environ["F004_STUDY_MINTS"]))}
SPECS = ["base60", "run2", "run3", "run5", "dipctl", "dipcand"]
mods = {}
for s in SPECS:
    p = os.path.join(HERE, f"rule_{s}.py"); spec = importlib.util.spec_from_file_location("rule_" + s, p); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); mods[s] = mod

def retained(info, L):
    cum = 0.0
    for r in L:
        if r["venue"] not in ("curve", ""): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= 15:
            rv = fl(r["recv_ms"]); return rv / 1000 if rv else fl(r["ts"])
    return None

def run_eval(mod, m, info, L, ret):
    res, hyp = ev.run_launch(mod, mod.RULE, m, info, L, gaps, outages, meta, POOL_BPS)
    rec = {"cat": res["cat"], "why": res.get("why"), "entry_t": res.get("entry_t"), "hypothetical": hyp}
    if res.get("entry_t") is not None:
        te = res["entry_t"]; fs, fw = ev.state_at(L, te + ev.LAND_BUY_S, gaps, outages, info["created"], ret)
        rec["fill_state_age_s"] = (te + ev.LAND_BUY_S - fl(fs["ts"])) if fs else None; rec["entry_age_s"] = te - info["created"]
        # receipt lag of the trade that triggered the decision (knowable fact): decision receipt time minus its chain time
        RO_ = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT_ = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO_]
        j = bisect.bisect_right(RT_, te) - 1; rec["trigger_receipt_lag_s"] = (te - fl(RO_[j]["ts"])) if j >= 0 else None
        rec["trigger_price_over_p60"] = None
        if mod.RULE["name"].startswith("F004-RUN") and j >= 0:
            b = rf._C.get(m, {}).get("p60"); rec["trigger_price_over_p60"] = (rf.px(RO_[j]) / b) if b else None
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
                if mod.exit_signal(p): ts_ = tr + ev.LAND_SELL_S; rec["trigger_t"] = tr; break
            assert ts_ is not None
        ss, sw = ev.state_at(L, ts_, gaps, outages, info["created"], ret)
        rec["exit_state_age_s"] = (ts_ - fl(ss["ts"])) if ss else None; rec["t_sell"] = ts_; rec["hold_s"] = ts_ - te
    return rec

stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; audit = collections.Counter(); rows = []
for m, L in ev.iter_mints(str(replay), tok, stats):
    info = tok[m]; ret = retained(info, L)
    if ret is None: audit["not_retained"] += 1; continue
    if any(s < info["created"] + HORIZON and e > info["created"] for s, e in outages): audit["outage_excluded"] += 1; continue
    half = "early" if info["created"] < SPLIT else "late"; audit["eligible_" + half] += 1
    for s in SPECS:
        rec = run_eval(mods[s], m, info, L, ret)
        rec.update(spec=s, mint=m, half=half, created=info["created"], study_mint=(m in STUDY)); rows.append(rec)
    rf.reset()
    n = audit["eligible_early"] + audit["eligible_late"]
    if n % 500 == 0: print("ELIGIBLE", n, dict(audit), flush=True)
assert stats["non_contiguous"] == 0
keys = ["spec", "mint", "half", "created", "study_mint", "cat", "why", "entry_t", "entry_age_s", "trigger_receipt_lag_s", "trigger_price_over_p60", "fill_state_age_s", "trigger_t", "t_sell", "hold_s", "exit_state_age_s", "net_sol", "ret", "exit", "exit_kind", "fill_venue", "exit_venue", "hypothetical"]
with open(out / "ledger.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=keys, extrasaction="ignore"); w.writeheader(); w.writerows(rows)

def boot(vals, n=10000, seed=SEED, fn=math.fsum):
    if not vals: return None
    rnd = random.Random(seed); k = len(vals); tots = sorted(fn([rnd.choice(vals) for _ in range(k)]) for _ in range(n)); return [tots[int(0.025 * n)], tots[int(0.975 * n)]]
def block(rs, ci=False):
    if not rs: return {"n": 0, "total_sol": 0.0}
    v = sorted(r["net_sol"] for r in rs); rets = [r["ret"] for r in rs]
    b = {"n": len(rs), "total_sol": math.fsum(v), "per_trade_sol": math.fsum(v) / len(v), "mean_ret": statistics.mean(rets), "median_ret": statistics.median(rets), "win_rate": sum(x > 0 for x in v) / len(v),
         "share_loss_gt50": sum(x < -0.5 * SIZE for x in v) / len(v), "without_best1_sol": math.fsum(v[:-1]), "without_best3_sol": math.fsum(v[:-3]), "best3_sol": v[-3:], "worst_sol": v[0],
         "exit_kinds": dict(collections.Counter(r.get("exit_kind") for r in rs)), "median_hold_s": statistics.median([r["hold_s"] for r in rs]), "median_entry_age_s": statistics.median([r["entry_age_s"] for r in rs]),
         "fill_state_age_median_s": statistics.median([r["fill_state_age_s"] for r in rs]), "fill_venues": dict(collections.Counter(r.get("fill_venue") for r in rs))}
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
            "attempted_by_half": dict(collections.Counter(r["half"] for r in att)),
            "trigger_receipt_lag_median_s": statistics.median([r["trigger_receipt_lag_s"] for r in att if r.get("trigger_receipt_lag_s") is not None]) if att else None,
            "resolved_mints": sorted(r["mint"] for r in res2)}
by = {s: [r for r in rows if r["spec"] == s] for s in SPECS}
S = {s: summ(by[s]) for s in SPECS}
S.update({s + "_study782": summ([r for r in by[s] if r["study_mint"]]) for s in SPECS})
def paired(cand, ctrl):
    cm = {r["mint"]: r for r in by[cand]}; km = {r["mint"]: r for r in by[ctrl]}; cs, ks = set(S[cand]["resolved_mints"]), set(S[ctrl]["resolved_mints"]); both = sorted(cs & ks)
    diffs = [cm[mm]["net_sol"] - km[mm]["net_sol"] for mm in both]
    o = {"n_pairs": len(both), "control_sol": math.fsum(km[mm]["net_sol"] for mm in both), "candidate_sol": math.fsum(cm[mm]["net_sol"] for mm in both), "difference_sol": math.fsum(diffs),
         "better": sum(x > 1e-12 for x in diffs), "worse": sum(x < -1e-12 for x in diffs), "unchanged": sum(abs(x) <= 1e-12 for x in diffs), "difference_bootstrap_95": boot(diffs),
         "resolved_only_in_candidate": len(cs - ks), "resolved_only_in_control": len(ks - cs), "candidate_only_block": block([cm[mm] for mm in sorted(cs - ks)]), "control_only_block": block([km[mm] for mm in sorted(ks - cs)]),
         "by_half": {h: {"n": sum(1 for mm in both if cm[mm]["half"] == h), "difference_sol": math.fsum(cm[mm]["net_sol"] - km[mm]["net_sol"] for mm in both if cm[mm]["half"] == h)} for h in ("early", "late")}}
    return o
for k in ("run2", "run3", "run5"): S[f"paired_{k}_vs_base60"] = paired(k, "base60")
S["paired_dipcand_vs_dipctl"] = paired("dipcand", "dipctl")
def diff_ci(a, b, n=10000):
    if not a or not b: return None
    rnd = random.Random(SEED); d = sorted((math.fsum(rnd.choice(a) for _ in a) / len(a)) - (math.fsum(rnd.choice(b) for _ in b) / len(b)) for _ in range(n)); return [d[int(0.025 * n)], d[int(0.975 * n)]]
def per_trade_cmp(cand, ctrl):
    a = [r["net_sol"] for r in resolved_set(by[cand])[6]]; b = [r["net_sol"] for r in resolved_set(by[ctrl])[6]]
    return {"candidate_per_trade": math.fsum(a) / len(a) if a else None, "control_per_trade": math.fsum(b) / len(b) if b else None, "difference": (math.fsum(a) / len(a) - math.fsum(b) / len(b)) if a and b else None, "bootstrap_95": diff_ci(a, b)}
S["per_trade_dipcand_minus_dipctl"] = per_trade_cmp("dipcand", "dipctl")
for k in ("run2", "run3", "run5"): S[f"per_trade_{k}_minus_base60"] = per_trade_cmp(k, "base60")
# R63: candidate-only resolved launches beside every paired figure (counts in the paired blocks); nothing imputed.
for name in list(S):
    if isinstance(S[name], dict) and "resolved_mints" in S[name]: S[name]["n_resolved_mints"] = len(S[name].pop("resolved_mints"))
summary = {"spec": {"size": SIZE, "pool_bps": POOL_BPS, "curve_bps": ev.CURVE_FEE_BPS, "fixed": ev.FIXED_FEE_SOL, "land_buy_s": ev.LAND_BUY_S, "land_sell_s": ev.LAND_SELL_S, "trail": rf.TRAIL, "horizon_s": HORIZON, "stale_s": STALE,
           "run_window_s": [rf.RUN_MIN_S, rf.RUN_MAX_S], "dip": {"window_s": [rf.DIP_MIN_S, rf.DIP_MAX_S], "draw": rf.DIP_DRAW, "recover": rf.DIP_RECOVER, "within_s": rf.DIP_RECOVER_WITHIN_S}, "bootstrap_seed": SEED},
           "audit": dict(audit), "stream_stats": {k: v for k, v in stats.items() if k != "_done"}, "study_mints_in_denominator": sum(1 for r in by["base60"] if r["study_mint"]), "results": S}
json.dump(summary, open(out / "results_s2.json", "w"), indent=2)
print(json.dumps({"audit": dict(audit)}, indent=1))
for s in SPECS + [x + "_study782" for x in SPECS]:
    print(s, json.dumps({k: S[s][k] for k in ("attempted", "filled", "unavailable_fill", "uncertain_exit", "stale_fill_gt30s_marked_unavailable", "stale_exit_gt30s_marked_uncertain", "unknown_share_of_attempts")}), json.dumps({k: S[s]["resolved_after_staleness"].get(k) for k in ("n", "total_sol", "per_trade_sol", "median_ret", "win_rate", "share_loss_gt50", "without_best1_sol", "without_best3_sol", "bootstrap_95_total_sol")}), json.dumps({h: {k: S[s]["by_half"][h].get(k) for k in ("n", "total_sol")} for h in ("early", "late")}))
for k in ("paired_run2_vs_base60", "paired_run3_vs_base60", "paired_run5_vs_base60", "paired_dipcand_vs_dipctl", "per_trade_dipcand_minus_dipctl", "per_trade_run2_minus_base60", "per_trade_run3_minus_base60", "per_trade_run5_minus_base60"):
    print(k, json.dumps({kk: vv for kk, vv in S[k].items() if kk not in ("candidate_only_block", "control_only_block")}))
