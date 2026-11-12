"""F011 + CL-L007 — owner common scenario R4 (S2) for, on the same 679 eligibility-E entries:
  control   : E entries, 30 % trail (frozen eval-1.1 run_launch unchanged, pool_bps=55) — identical to f006p2 / f009 / f010 CONTROL;
  base_re   : the SAME exit re-implemented in this file with the evaluator's own primitives (partial disabled) — asserted identical to control
              on every launch (category, why, net_sol, sell time) before any result is written: the transcription check;
  l005e     : Codex's L005 partial-profit exit (PROTOCOL.md) on top of base_re — half sale at full-position net sellable proceeds >= 0.30 SOL,
              remaining-half 30 % trail reset at the partial landing, + 0.00075 SOL when the partial executes;
  l007new   : CL-L007 entry veto (name and symbol both new in the window), control exit, through run_launch unchanged.
0.2 SOL; buy +1 s; sell +0.7 s; curve 125 bps; pool 55 bps; 0.0015 SOL fixed; 2 h cap; landing state older than 30 s => unavailable (fill) /
uncertain (exit / partial) by post-check, exactly as in f006p2 run_s2.py / f009 / f010.
Usage: F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> F011_F002_LAUNCHES=<f002 launches.csv.gz> python3 -I run_f011.py <replay dir> <out dir>"""
import sys, os, pathlib, json, csv, types, math, statistics, collections, bisect, hashlib, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc, reuse
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ev = rc.ev(); assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
assert not ev.DEV_NO_EVIDENCE
START, SPLIT, END = 1793950800, 1794016200, 1794081600
POOL_BPS = 55; SIZE = 0.2; TRAIL = 0.30; STALE = 30; AGE = 300; HORIZON = 7200
PARTIAL_PROCEEDS = 0.30; PARTIAL_FRACTION = 0.5; PARTIAL_EXTRA_FIXED = 0.00075       # Codex L005, PROTOCOL @ 6e9db55 (frozen)
tok, gaps, outages, meta = ev.load(str(replay), START, END); fl = ev.fl
RF = reuse.flags()

def retained(info, L):
    cum = 0.0
    for r in L:
        if not rc.iscurve(r): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= 15:
            rv = fl(r["recv_ms"]); return rv / 1000 if rv else fl(r["ts"])
    return None

def run_eval(m, info, L, ret, enter):
    """CONTROL / L007 through the frozen evaluator's run_launch (as run_f009.py / run_f010.py)."""
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

def run_l005(m, info, L, ret, enter, RO, RT, partial_enabled):
    """run_launch's post-fill scan re-implemented with the evaluator's primitives, plus (if enabled) Codex's L005 partial sale."""
    created = info["created"]; t = created + AGE
    if not enter or ret is None or t < ret or t > created + HORIZON: return {"cat": "abstain", "why": "rule did not enter" if ret is not None else "never retained"}
    pre = sum(1 for r in L if fl(r["ts"]) <= ret)
    if pre > ev.PRE_BUFFER: return {"cat": "unknown", "why": "pre-promotion buffer exceeded", "entry_t": t}
    rec = {"entry_t": t, "entry_age_s": AGE}
    fs, why = ev.state_at(L, t + ev.LAND_BUY_S, gaps, outages, created, ret)
    if fs is None: rec.update(cat="unknown", why="fill: " + why); return rec
    rec["fill_state_age_s"] = t + ev.LAND_BUY_S - fl(fs["ts"]); rec["fill_venue"] = fs["venue"] or "curve"
    tok0 = ev.buy(fs, SIZE, POOL_BPS); tokens = tok0; hi = -1e9; trig = None; cash = 0.0
    partial_done = False; partial_t = None; rec["partial"] = False
    for j in range(bisect.bisect_right(RT, t + ev.LAND_BUY_S), len(RO)):
        r = RO[j]; tr = RT[j]
        if tr >= t + HORIZON: break
        if not ev.state_ok(r): continue
        if partial_done and tr <= partial_t: continue                     # Codex resume_at: monitoring resumes strictly after the partial landing
        x = (ev.sell(r, tokens, POOL_BPS) - ev.FIXED_FEE_SOL) / SIZE; hi = max(hi, x)
        if hi > 0 and x <= hi * 0.70: trig = tr; break                      # control trail (rc.exit_signal), precedence over the partial on the same row
        if partial_enabled and not partial_done and x * SIZE >= PARTIAL_PROCEEDS and tr + ev.LAND_SELL_S < t + HORIZON:
            pt = tr + ev.LAND_SELL_S; ps, pwhy = ev.state_at(L, pt, gaps, outages, created, ret)
            rec.update(partial=True, partial_trigger_t=tr, partial_landing_t=pt, partial_trigger_proceeds_full=x * SIZE + ev.FIXED_FEE_SOL)
            if ps is None: rec.update(cat="unknown", why="partial: " + pwhy); return rec
            rec["partial_state_age_s"] = pt - fl(ps["ts"]); rec["partial_venue"] = ps["venue"] or "curve"
            cash = ev.sell(ps, tok0 * PARTIAL_FRACTION, POOL_BPS); tokens = tok0 * (1 - PARTIAL_FRACTION)
            hi = (ev.sell(ps, tokens, POOL_BPS) - ev.FIXED_FEE_SOL) / SIZE   # reset: remaining half's own net proceeds at the partial landing
            rec.update(partial_cash_sol=cash, partial_reset_high_proceeds=hi * SIZE); partial_done = True; partial_t = pt
    ts_ = trig + ev.LAND_SELL_S if trig is not None else t + HORIZON
    ss, why = ev.state_at(L, ts_, gaps, outages, created, ret)
    rec.update(trigger_t=trig, t_sell=ts_, hold_s=ts_ - t, exit_kind=("trail" if trig is not None else "horizon"), exit=("trigger" if trig is not None else "horizon"))
    if ss is None: rec.update(cat="unknown", why="exit: " + why); return rec
    rec["exit_state_age_s"] = ts_ - fl(ss["ts"]); rec["exit_venue"] = ss["venue"] or "curve"
    net = cash + ev.sell(ss, tokens, POOL_BPS) - SIZE - ev.FIXED_FEE_SOL - (PARTIAL_EXTRA_FIXED if partial_done else 0.0)
    rec.update(cat="scored", why=None, net_sol=net, ret=net / SIZE, final_leg_sol=ev.sell(ss, tokens, POOL_BPS), hypothetical=False)
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
    E = bool(f is not None and rc.eligible(f)); rf = RF[m]
    frow = {"mint": m, "half": half, "created": info["created"], "retained_at": ret, "retained_by_t": t >= ret, "eligible_E": E, "name_or_symbol_reused": rf["reused"], "copy_of_retained": rf["copy_of_retained"]}
    if f: frow.update({kk: f[kk] for kk in f}); frow["cell"] = rc.cell_of(f)
    feats.append(frow)
    c = run_eval(m, info, L, ret, E); b = run_l005(m, info, L, ret, E, RO, RT, False); l5 = run_l005(m, info, L, ret, E, RO, RT, True)
    l7 = run_eval(m, info, L, ret, E and not rf["reused"])
    # transcription check: the re-implemented scan without the partial must equal the frozen evaluator's control on every launch
    same = c["cat"] == b["cat"] and (c.get("why") == b.get("why")) and (c["cat"] != "scored" or c.get("t_sell") == b.get("t_sell")) and ((c.get("net_sol") is None and b.get("net_sol") is None) or abs(c["net_sol"] - b["net_sol"]) < 1e-12)
    if not same: mism.append({"mint": m, "control": {kk: c.get(kk) for kk in ("cat", "why", "t_sell", "net_sol")}, "base_re": {kk: b.get(kk) for kk in ("cat", "why", "t_sell", "net_sol")}})
    for name, rec in (("control", c), ("base_re", b), ("l005e", l5), ("l007new", l7)):
        rec.update(spec=name, mint=m, half=half, created=info["created"], eligible_E=E, cell=(frow.get("cell") if E else None), reused=rf["reused"], copy_of_retained=rf["copy_of_retained"]); rows.append(rec)
    n = audit["eligible_early"] + audit["eligible_late"]
    if n % 500 == 0: print("ELIGIBLE", n, dict(audit), "mismatches", len(mism), flush=True)
assert stats["non_contiguous"] == 0
print("TRANSCRIPTION CHECK mismatches:", len(mism), flush=True)
json.dump(mism, open(out / "transcription_mismatches.json", "w"), indent=1)
assert not mism, "re-implemented baseline differs from the frozen evaluator's control"
keys = ["spec", "mint", "half", "cell", "created", "eligible_E", "reused", "copy_of_retained", "cat", "why", "entry_t", "entry_age_s", "fill_state_age_s", "partial", "partial_trigger_t", "partial_landing_t", "partial_state_age_s", "partial_trigger_proceeds_full", "partial_cash_sol", "partial_reset_high_proceeds", "partial_venue", "trigger_t", "t_sell", "hold_s", "exit_state_age_s", "net_sol", "ret", "final_leg_sol", "exit", "exit_kind", "fill_venue", "exit_venue", "hypothetical"]
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
            "exit_kinds": dict(collections.Counter(r.get("exit_kind") for r in rs)), "partial_executed": sum(1 for r in rs if r.get("partial")),
            "partial_executed_total_sol": math.fsum(r["net_sol"] for r in rs if r.get("partial")), "no_partial_total_sol": math.fsum(r["net_sol"] for r in rs if not r.get("partial")),
            "median_hold_s": statistics.median([r["hold_s"] for r in rs if r.get("hold_s") is not None]), "fill_state_age_median_s": statistics.median([r["fill_state_age_s"] for r in rs])}
def resolved_set(rr):
    att = [r for r in rr if r["cat"] != "abstain"]; filled = [r for r in att if r["cat"] == "scored" or (r["cat"] == "unknown" and (r["why"].startswith("exit") or r["why"].startswith("partial")))]
    unav = [r for r in att if r["cat"] == "unknown" and not (r["why"].startswith("exit") or r["why"].startswith("partial"))]
    stale_fill = [r for r in filled if (r.get("fill_state_age_s") or 0) > STALE]
    resolved = [r for r in filled if r["cat"] == "scored" and r not in stale_fill]; uncertain = [r for r in filled if r["cat"] == "unknown" and r not in stale_fill]
    stale_exit = [r for r in resolved if (r.get("exit_state_age_s") or 0) > STALE or (r.get("partial_state_age_s") or 0) > STALE]; res2 = [r for r in resolved if r not in stale_exit]
    return att, filled, unav, stale_fill, uncertain, stale_exit, res2
def summ(rr):
    att, filled, unav, stale_fill, uncertain, stale_exit, res2 = resolved_set(rr)
    return {"attempted": len(att), "filled": len(filled), "unavailable_fill": len(unav), "unavailable_reasons": dict(collections.Counter(r["why"] for r in unav)),
            "stale_fill_gt30s_marked_unavailable": len(stale_fill), "resolved_raw_evaluator": block([r for r in filled if r["cat"] == "scored"]),
            "uncertain_exit": len(uncertain), "uncertain_reasons": dict(collections.Counter(r["why"] for r in uncertain)), "stale_exit_gt30s_marked_uncertain": len(stale_exit),
            "stale_exit_by_leg": dict(collections.Counter(("partial" if (r.get("partial_state_age_s") or 0) > STALE else "final") for r in stale_exit)),
            "unknown_share_of_attempts": (len(att) - len(res2)) / len(att) if att else None,
            "partial_attempted": sum(1 for r in att if r.get("partial")), "partial_unresolved": sum(1 for r in att if r.get("partial") and r not in res2),
            "partial_unresolved_reasons": dict(collections.Counter((r.get("why") or ("stale partial" if (r.get("partial_state_age_s") or 0) > STALE else "stale fill/exit")) for r in att if r.get("partial") and r not in res2)),
            "resolved_after_staleness": block(res2), "by_half": {h: block([r for r in res2 if r["half"] == h]) for h in ("early", "late")},
            "by_cell": {c: block([r for r in res2 if r["cell"] == c]) for c in ("A", "B", "C")},
            "attempted_by_half": dict(collections.Counter(r["half"] for r in att)), "attempted_by_cell": dict(collections.Counter(r["cell"] for r in att)), "resolved_mints": sorted(r["mint"] for r in res2)}
SPECS = ("control", "base_re", "l005e", "l007new")
S = {name: summ([r for r in rows if r["spec"] == name]) for name in SPECS}
ctrl = {r["mint"]: r for r in rows if r["spec"] == "control"}
def boot(vals, n=10000, seed=20261112):
    if not vals: return None
    rnd = random.Random(seed); k = len(vals); tots = sorted(math.fsum(rnd.choice(vals) for _ in range(k)) for _ in range(n)); return [tots[int(0.025 * n)], tots[int(0.975 * n)]]
def block_boot(diffs_ms, n=10000, seed=20261112):
    b = collections.defaultdict(list)
    for d, mm in diffs_ms: b[int((ctrl[mm]["created"] - START) // 10800)].append(d)
    bl = list(b.values())
    if not bl: return None
    rnd = random.Random(seed); tt = sorted(math.fsum(math.fsum(rnd.choice(bl)) for _ in range(len(bl))) for _ in range(n))
    return {"n_blocks": len(bl), "block_sizes": [len(x) for x in bl], "ci95": [tt[int(0.025 * n)], tt[int(0.975 * n)]]}
cres = set(S["control"]["resolved_mints"])
def paired(name):
    cand = {r["mint"]: r for r in rows if r["spec"] == name}; cs = set(S[name]["resolved_mints"]); both = sorted(cres & cs)
    diffs = {mm: cand[mm]["net_sol"] - ctrl[mm]["net_sol"] for mm in both}
    def sub(ms):
        dd = sorted(diffs[mm] for mm in ms)
        return {"n": len(ms), "control_sol": math.fsum(ctrl[mm]["net_sol"] for mm in ms), "candidate_sol": math.fsum(cand[mm]["net_sol"] for mm in ms), "difference_sol": math.fsum(dd),
                "better": sum(x > 1e-12 for x in dd), "worse": sum(x < -1e-12 for x in dd), "unchanged": sum(abs(x) <= 1e-12 for x in dd), "bootstrap_95_difference": boot(dd),
                "largest_single_difference": (dd[-1] if dd else None), "share_of_difference_from_largest": (dd[-1] / math.fsum(dd) if dd and math.fsum(dd) > 0 else None),
                "difference_without_largest1": math.fsum(dd[:-1]), "difference_without_largest3": math.fsum(dd[:-3]), "difference_without_worst1": math.fsum(dd[1:]), "difference_without_worst3": math.fsum(dd[3:])}
    only_c = sorted(cs - cres); only_k = sorted(cres - cs)
    top = sorted(both, key=lambda mm: -diffs[mm])[:3]
    return {"n_pairs": len(both), **sub(both), "block_bootstrap_3h": block_boot([(diffs[mm], mm) for mm in both]),
            "top3_pairs": [{"mint": mm, "difference": diffs[mm], "control_net_sol": ctrl[mm]["net_sol"], "candidate_net_sol": cand[mm]["net_sol"], "half": ctrl[mm]["half"], "cell": ctrl[mm]["cell"], "partial": cand[mm].get("partial"), "candidate_exit_kind": cand[mm].get("exit_kind"), "control_exit_kind": ctrl[mm].get("exit_kind"), "candidate_hold_s": cand[mm].get("hold_s"), "control_hold_s": ctrl[mm].get("hold_s")} for mm in top],
            "worst3_pairs": [{"mint": mm, "difference": diffs[mm], "control_net_sol": ctrl[mm]["net_sol"], "candidate_net_sol": cand[mm]["net_sol"], "half": ctrl[mm]["half"], "cell": ctrl[mm]["cell"], "partial": cand[mm].get("partial")} for mm in sorted(both, key=lambda mm: diffs[mm])[:3]],
            "by_half": {h: sub([mm for mm in both if ctrl[mm]["half"] == h]) for h in ("early", "late")},
            "by_cell": {c: sub([mm for mm in both if ctrl[mm]["cell"] == c]) for c in ("A", "B", "C")},
            "by_partial": {"partial_executed": sub([mm for mm in both if cand[mm].get("partial")]), "no_partial": sub([mm for mm in both if not cand[mm].get("partial")])},
            "control_block": block([ctrl[mm] for mm in both]), "candidate_block": block([cand[mm] for mm in both]),
            "resolved_only_in_candidate": len(only_c), "resolved_only_in_control": len(only_k),
            "candidate_only_block": block([cand[mm] for mm in only_c]), "control_only_block": block([ctrl[mm] for mm in only_k]),
            "control_only_candidate_status": dict(collections.Counter(" / ".join(x for x in (cand[mm]["cat"], cand[mm].get("why") or "", "stale_partial" if (cand[mm].get("partial_state_age_s") or 0) > STALE else "", "stale_exit" if (cand[mm].get("exit_state_age_s") or 0) > STALE else "") if x) for mm in only_k)),
            "candidate_only_control_status": dict(collections.Counter(" / ".join(x for x in (ctrl[mm]["cat"], ctrl[mm].get("why") or "", "stale_exit" if (ctrl[mm].get("exit_state_age_s") or 0) > STALE else "") if x) for mm in only_c)),
            "control_top5_under_candidate": [{"mint": mm, "control_net_sol": ctrl[mm]["net_sol"], "candidate_net_sol": cand[mm].get("net_sol"), "candidate_status": cand[mm]["cat"] + (" / " + cand[mm]["why"] if cand[mm].get("why") else ""), "partial": cand[mm].get("partial"), "cell": ctrl[mm]["cell"]} for mm in sorted(cres, key=lambda mm: -ctrl[mm]["net_sol"])[:5]],
            "pairs_share_of_control_resolved": len(both) / len(cres), "pairs_share_of_candidate_resolved": len(both) / len(cs) if cs else None}
S["l005e_paired"] = paired("l005e"); S["l007new_paired"] = paired("l007new")
# CL-L007: the removed side (E launches with a reused name or symbol), control exit — counts and totals only; declared breakdown by copy_of_retained
E_rows = [r for r in feats if r["eligible_E"]]
removed = [ctrl[r["mint"]] for r in E_rows if r["name_or_symbol_reused"]]; kept = [ctrl[r["mint"]] for r in E_rows if not r["name_or_symbol_reused"]]
def side(rs):
    s = summ(rs); s["n_resolved_mints"] = len(s.pop("resolved_mints")); return s
S["l007_sides"] = {"E_total": len(E_rows), "kept_new_name_and_symbol": len(kept), "removed_reused": len(removed), "removed_share_of_E": len(removed) / len(E_rows),
                   "kept": side(kept), "removed": side(removed),
                   "removed_copy_of_retained": side([r for r in removed if r["copy_of_retained"]]), "removed_copy_of_never_retained": side([r for r in removed if not r["copy_of_retained"]]),
                   "census_reused_share": sum(1 for x in RF.values() if x["reused"]) / len(RF), "census_copy_of_retained_share": sum(1 for x in RF.values() if x["copy_of_retained"]) / len(RF)}
for name in list(S):
    if isinstance(S[name], dict) and "resolved_mints" in S[name]: S[name]["n_resolved_mints"] = len(S[name].pop("resolved_mints"))
def med(xs): xs = [x for x in xs if x is not None]; return statistics.median(xs) if xs else None
l5 = [r for r in rows if r["spec"] == "l005e" and r["cat"] != "abstain"]
diag = {"launches": len(feats), "retained_by_300s": sum(r["retained_by_t"] for r in feats), "eligible_E": len(E_rows), "E_by_half": dict(collections.Counter(r["half"] for r in E_rows)), "E_by_cell": dict(collections.Counter(r["cell"] for r in E_rows)),
        "transcription_mismatches": len(mism),
        "l005e_partial_triggered": sum(1 for r in l5 if r.get("partial")), "l005e_partial_trigger_age_s_median": med([r["partial_trigger_t"] - r["entry_t"] for r in l5 if r.get("partial")]),
        "l005e_partial_state_age_s_median": med([r.get("partial_state_age_s") for r in l5 if r.get("partial")]), "l005e_partial_venue": dict(collections.Counter(r.get("partial_venue") for r in l5 if r.get("partial"))),
        "l005e_final_triggers_in_last_0.7s_of_horizon": sum(1 for r in l5 if r.get("trigger_t") is not None and r["trigger_t"] > r["entry_t"] + HORIZON - ev.LAND_SELL_S),
        "l005e_ordering_ok": all((r["entry_t"] + ev.LAND_BUY_S < r["partial_trigger_t"] <= r["partial_landing_t"] - ev.LAND_SELL_S + 1e-9) and (r.get("trigger_t") is None or r["trigger_t"] > r["partial_landing_t"]) for r in l5 if r.get("partial"))}
summary = {"spec": {"size": SIZE, "pool_bps": POOL_BPS, "curve_bps": ev.CURVE_FEE_BPS, "fixed": ev.FIXED_FEE_SOL, "land_buy_s": ev.LAND_BUY_S, "land_sell_s": ev.LAND_SELL_S, "trail": TRAIL, "horizon_s": HORIZON, "decision_age_s": AGE, "stale_s": STALE,
           "l005": {"partial_proceeds_sol": PARTIAL_PROCEEDS, "partial_fraction": PARTIAL_FRACTION, "extra_fixed_sol": PARTIAL_EXTRA_FIXED, "reset_high": "remaining half's net proceeds at the partial landing", "trail_high_init": "first received valid state after the fill (eval-1.1 / E control)"}, "min_buyers_60": rc.MIN_BUYERS_60},
           "audit": dict(audit), "stream_stats": {k: v for k, v in stats.items() if k != "_done"}, "diagnostics": diag, "results": S}
json.dump(summary, open(out / "results_s2.json", "w"), indent=2); print(json.dumps({k: summary[k] for k in ("audit", "diagnostics")}, indent=1))
for name in SPECS: print(name, json.dumps({k: S[name][k] for k in ("attempted", "filled", "unavailable_fill", "uncertain_exit", "stale_fill_gt30s_marked_unavailable", "stale_exit_gt30s_marked_uncertain")}), json.dumps(S[name]["resolved_after_staleness"]), json.dumps(S[name]["by_half"]))
for name in ("l005e_paired", "l007new_paired"): print(name, json.dumps({k: v for k, v in S[name].items() if not k.endswith("_block")}, indent=1))
print("l007_sides", json.dumps({k: (v if not isinstance(v, dict) else {kk: v[kk] for kk in ("attempted", "resolved_after_staleness", "by_half") if kk in v}) for k, v in S["l007_sides"].items()}, indent=1))
