"""F011 post-analysis (no scoring): merges results_s1.json / results_s2.json, adds the Codex overlap check (research-codex @ be8cf89,
runs/c013-lab-20261112T151333Z/trade_l005_*.csv and trade_baseline_*.csv, published @ e9b20e1), re-derives Codex's 195-pair L005 figures from
its ledgers, and writes results.json with the verdict fields. Reads only files in <out> and <codex dir>.
Usage: python3 -I analyze_f011.py <out dir> <codex ledger dir>"""
import sys, csv, glob, json, math, statistics, collections, pathlib
out = pathlib.Path(sys.argv[1]); cdir = pathlib.Path(sys.argv[2]); SIZE = 0.2
def f(x):
    try: return float(x)
    except (TypeError, ValueError): return None
rows = list(csv.DictReader(open(out / "ledger.csv"))); feats = {r["mint"]: r for r in csv.DictReader(open(out / "features_at_300s.csv"))}
def resolved(r): return r["cat"] == "scored" and (f(r["fill_state_age_s"]) or 0) <= 30 and (f(r["exit_state_age_s"]) or 0) <= 30 and (f(r["partial_state_age_s"]) or 0) <= 30
R = {s: {r["mint"]: r for r in rows if r["spec"] == s} for s in ("control", "l005e", "l007new")}
RES = {s: {m: r for m, r in R[s].items() if resolved(r)} for s in R}
cx, bx = {}, {}
for p in sorted(glob.glob(str(cdir / "trade_l005_*.csv"))):
    for r in csv.DictReader(open(p)): cx[r["mint"]] = r
for p in sorted(glob.glob(str(cdir / "trade_baseline_*.csv"))):
    for r in csv.DictReader(open(p)): bx[r["mint"]] = r
# Codex's own 195-pair figures re-derived from its ledgers (counts only)
p195 = [m for m in cx if cx[m]["status"] == "scored" and bx[m]["status"] == "scored"]
d195 = sorted(((f(cx[m]["net_sol"]) - f(bx[m]["net_sol"])), m) for m in p195); dv = [x for x, _ in d195]
codex195 = {"n_pairs": len(p195), "baseline_sol": math.fsum(f(bx[m]["net_sol"]) for m in p195), "l005_sol": math.fsum(f(cx[m]["net_sol"]) for m in p195), "difference_sol": math.fsum(dv),
            "better": sum(x > 1e-12 for x in dv), "worse": sum(x < -1e-12 for x in dv), "unchanged": sum(abs(x) <= 1e-12 for x in dv), "largest_difference": d195[-1][0], "largest_mint": d195[-1][1], "share_from_largest": d195[-1][0] / math.fsum(dv),
            "partial_done_in_l005_ledger": sum(1 for m in cx if cx[m]["partial_done"] == "True"), "published": {"difference_sol": 2.436389, "better": 35, "worse": 9, "unchanged": 151, "share_one_trade": 0.613}}
# overlap: Codex's 296 L003 attempts inside E, status cross-tab, partial agreement, net agreement
inE = [m for m in cx if feats[m]["eligible_E"] == "True"]; mine = R["l005e"]
cmp = collections.Counter(); part = collections.Counter(); ptd, pcash, netd_p, netd_np = [], [], [], []
for m in inE:
    r = cx[m]; me = mine[m]
    if r["status"] == "scored" and me["cat"] == "scored":
        cmp["scored | scored"] += 1
        part[(r["partial_done"], me["partial"])] += 1
        if r["partial_done"] == "True" and me["partial"] == "True":
            ptd.append(f(r["partial_trigger_t"]) - f(me["partial_trigger_t"])); pcash.append(f(r["partial_proceeds_after_protocol_fee_sol"]) - f(me["partial_cash_sol"])); netd_p.append(f(r["net_sol"]) - f(me["net_sol"]))
        elif r["partial_done"] != "True" and me["partial"] != "True": netd_np.append(f(r["net_sol"]) - f(me["net_sol"]))
    else: cmp["codex " + r["status"] + (" (" + r["why"] + ")" if r["why"] else "") + " | claude " + me["cat"] + (" " + me["why"] if me["why"] else "") + (" stale" if me["cat"] == "scored" and not resolved(me) else "")] += 1
def view(ms, s="l005e"):
    d = [f(R[s][m]["net_sol"]) - f(R["control"][m]["net_sol"]) for m in ms]
    return {"n": len(ms), "control_sol": math.fsum(f(R["control"][m]["net_sol"]) for m in ms), "candidate_sol": math.fsum(f(R[s][m]["net_sol"]) for m in ms), "difference_sol": math.fsum(d), "better": sum(x > 1e-12 for x in d), "worse": sum(x < -1e-12 for x in d), "unchanged": sum(abs(x) <= 1e-12 for x in d)}
cres = sorted(set(RES["control"]) & set(RES["l005e"]))
overlap = {"codex_l005_attempts": len(cx), "attempts_inside_E": len(inE), "status_crosstab_codex_vs_claude": dict(cmp), "partial_done_crosstab_(codex, claude)_on_jointly_scored": {str(k): v for k, v in part.items()},
           "partial_partial_pairs": len(ptd), "partial_trigger_t_identical": sum(abs(x) < 1e-6 for x in ptd), "partial_cash_identical": sum(abs(x) < 1e-9 for x in pcash), "net_identical_partial_pairs": sum(abs(x) < 1e-9 for x in netd_p), "net_max_abs_diff_partial_pairs": max(map(abs, netd_p)) if netd_p else None,
           "no_partial_pairs": len(netd_np), "net_identical_no_partial": sum(abs(x) < 1e-9 for x in netd_np), "net_max_abs_diff_no_partial": max(map(abs, netd_np)) if netd_np else None,
           "codex_195_pairs_in_claude_framework": view([m for m in p195 if m in RES["control"] and m in RES["l005e"]]), "codex_195_rederived": codex195,
           "E_pairs_inside_L003_attempts": view([m for m in cres if m in cx]), "E_pairs_outside_L003_attempts": view([m for m in cres if m not in cx])}
# single-trade share, as the row requires, plus the pool-reserve question flagged (not settled)
s2 = json.load(open(out / "results_s2.json")); P = s2["results"]["l005e_paired"]
big = P["top3_pairs"][0]; share = {"largest_pair_mint": big["mint"], "largest_pair_difference_sol": big["difference"], "share_of_paired_improvement": P["share_of_difference_from_largest"], "paired_difference_without_it": P["difference_without_largest1"],
        "same_mint_as_codex_largest": big["mint"] == codex195["largest_mint"], "note": "75VDY6... pool-reserve-product question (R38) is not settled here and must not be; the trade is counted and shown with its caveat"}
s1 = json.load(open(out / "results_s1.json"))
merged = {"run_id": "f011-20261112T225049Z", "s1_eval11": {k: v["by_size"]["0.2"] for k, v in s1["rules"].items()}, "s1_pool125": {k: v["pool_fee_125bps_sensitivity"]["0.2"] for k, v in s1["rules"].items()},
          "s1_note": "eval-1.1's single-sale exit hook cannot express L005's two-leg sale; no eval-1.1 L005 row exists. CL-L007 is an entry veto and runs through eval-1.1 unchanged.",
          "s2_r4": s2["results"], "s2_spec": s2["spec"], "s2_diagnostics": s2["diagnostics"], "analysis": {"codex_overlap": overlap, "single_trade_share": share},
          "verdicts": {"F011 L005 on E": "loss reduction in direction on the E population (paired +2.975658 SOL on 418, 79 better / 26 worse / 313 unchanged; iid CI [+0.08, +6.84], 3-h block CI [+0.27, +6.55]); 50.2 % of it is the single trade 75VDY6... (+1.494032, the same trade that carried 61 % of Codex's 195-pair result); +1.481627 without it; early +0.981 (CI above zero, largest pair +0.126) and cells A / C above zero, late and cell B straddle zero; the partial halves the control's three largest winners (-0.613 / -0.228 / -0.166); all-in 418 resolved -6.977163 SOL vs the control's 419 / -10.011572: a loss in both halves (early -6.681, late -0.297) and in cells A and C; cell B +0.297 only because of 75VDY6... (-1.219 without it). Not supported, not profitable; R43 stands",
                       "CL-L007 name/symbol reuse veto": "see results.json s2_r4.l007_sides and l007new; verdict written in README after reading the numbers (registered direction: kept side better per resolved trade)"}}
json.dump(merged, open(out / "results.json", "w"), indent=2); print(json.dumps(merged["analysis"], indent=1)); print(json.dumps(merged["s1_eval11"], indent=1))
