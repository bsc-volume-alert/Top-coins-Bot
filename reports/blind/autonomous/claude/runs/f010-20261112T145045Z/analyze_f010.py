"""F010 post-analysis (no scoring): merges results_s1.json / results_s2.json, adds the paired-difference stress views (without worst 1 / 3
pairs, 3-h block bootstrap as Codex's L004 used), the per-exit-kind blocks, the overlap with Codex's published L004 ledgers (research-codex
@ 5024b9e, runs/c012-lab-20261112T091226Z/trade_l004_*.csv, trade_baseline_*.csv) and the verdicts. Reads only files in <out> and <codex dir>.
Usage: python3 -I analyze_f010.py <out dir> <codex ledger dir>"""
import sys, csv, glob, json, math, statistics, collections, random, pathlib
out = pathlib.Path(sys.argv[1]); cdir = pathlib.Path(sys.argv[2]); SIZE = 0.2; START = 1793950800
def f(x):
    try: return float(x)
    except (TypeError, ValueError): return None
rows = list(csv.DictReader(open(out / "ledger.csv"))); feats = {r["mint"]: r for r in csv.DictReader(open(out / "features_at_300s.csv"))}
def resolved(r): return r["cat"] == "scored" and (f(r["fill_state_age_s"]) or 0) <= 30 and (f(r["exit_state_age_s"]) or 0) <= 30
R = {s: {r["mint"]: r for r in rows if r["spec"] == s} for s in ("control", "l004sc", "l005dd")}
RES = {s: {m: r for m, r in R[s].items() if resolved(r)} for s in R}
def boot(vals, n=10000, seed=20261112):
    rnd = random.Random(seed); k = len(vals); t = sorted(math.fsum(rnd.choice(vals) for _ in range(k)) for _ in range(n)); return [t[int(0.025 * n)], t[int(0.975 * n)]]
def block_boot(pairs, n=10000, seed=20261112):
    """3-h creation blocks of the paired differences (12 blocks over the 36-h window), resampled with replacement as blocks."""
    b = collections.defaultdict(list)
    for d, m in pairs: b[int((f(R["control"][m]["created"]) - START) // 10800)].append(d)
    bl = list(b.values()); rnd = random.Random(seed); t = sorted(math.fsum(math.fsum(rnd.choice(bl)) for _ in range(len(bl))) for _ in range(n))
    return {"n_blocks": len(bl), "block_sizes": [len(x) for x in bl], "ci95": [t[int(0.025 * n)], t[int(0.975 * n)]]}
def kind_block(rs):
    v = sorted(f(r["net_sol"]) for r in rs)
    return {"n": len(v), "total_sol": math.fsum(v), "win_rate": (sum(x > 0 for x in v) / len(v)) if v else None, "median_hold_s": statistics.median([f(r["hold_s"]) for r in rs]) if rs else None}
A = {}
for s in ("l004sc", "l005dd"):
    both = sorted(set(RES["control"]) & set(RES[s])); d = sorted(((f(RES[s][m]["net_sol"]) - f(RES["control"][m]["net_sol"])), m) for m in both); dv = [x for x, _ in d]
    A[s] = {"n_pairs": len(both), "difference_sol": math.fsum(dv), "without_worst1_pair": math.fsum(dv[1:]), "without_worst3_pairs": math.fsum(dv[3:]), "without_best3_pairs": math.fsum(dv[:-3]),
            "worst3_pairs": [{"difference": x, "control_net_sol": f(R["control"][m]["net_sol"]), "candidate_net_sol": f(R[s][m]["net_sol"]), "half": R["control"][m]["half"], "cell": R["control"][m]["cell"], "candidate_exit_kind": R[s][m]["exit_kind"], "candidate_hold_s": f(R[s][m]["hold_s"])} for x, m in d[:3]],
            "changed_pairs": sum(abs(x) > 1e-12 for x in dv), "better": sum(x > 1e-12 for x in dv), "worse": sum(x < -1e-12 for x in dv), "median_difference_changed_pairs": statistics.median([x for x in dv if abs(x) > 1e-12]),
            "iid_bootstrap_95": boot(dv), "block_bootstrap_3h": block_boot(d),
            "resolved_by_exit_kind": {k: kind_block([r for r in RES[s].values() if r["exit_kind"] == k]) for k in sorted(set(r["exit_kind"] for r in RES[s].values()))},
            "control_top5_under_candidate": [{"control_net_sol": f(R["control"][m]["net_sol"]), "candidate_net_sol": f(R[s][m]["net_sol"]) if m in RES[s] else None, "candidate_exit_kind": R[s][m].get("exit_kind"), "cell": R["control"][m]["cell"]} for m in sorted(RES["control"], key=lambda m: -f(RES["control"][m]["net_sol"]))[:5]]}
# overlap with Codex's published L004 / baseline ledgers
cx, bx = {}, {}
for p in sorted(glob.glob(str(cdir / "trade_l004_*.csv"))):
    for r in csv.DictReader(open(p)): cx[r["mint"]] = r
for p in sorted(glob.glob(str(cdir / "trade_baseline_*.csv"))):
    for r in csv.DictReader(open(p)): bx[r["mint"]] = r
inE = [m for m in cx if feats[m]["eligible_E"] == "True"]; mine = R["l004sc"]
coh = [(int(cx[m]["early_cohort_n"]), int(feats[m]["early_cohort_n"])) for m in inE if cx[m]["early_cohort_n"] != ""]
cmp = collections.Counter(); tdiff = []; netdiff = []; nd = []
for m in inE:
    r = cx[m]; me = mine[m]
    if r["status"] == "scored" and me["cat"] == "scored":
        cmp[r["trigger_reason"] + " | " + me["exit_kind"]] += 1
        if r["trigger_reason"] == "early_cohort_sell_cluster" and me["exit_kind"] == "cluster": tdiff.append(f(r["trigger_t"]) - f(me["trigger_t"])); netdiff.append(f(r["net_sol"]) - f(me["net_sol"]))
        if r["trigger_reason"] != "early_cohort_sell_cluster" and me["exit_kind"] == "trail": nd.append(f(r["net_sol"]) - f(me["net_sol"]))
    else: cmp["status " + r["status"] + " | " + me["cat"] + " " + (me["why"] or "")] += 1
def view(ms):
    d = [f(mine[m]["net_sol"]) - f(R["control"][m]["net_sol"]) for m in ms]
    return {"n": len(ms), "control_sol": math.fsum(f(R["control"][m]["net_sol"]) for m in ms), "l004sc_sol": math.fsum(f(mine[m]["net_sol"]) for m in ms), "difference_sol": math.fsum(d), "better": sum(x > 1e-12 for x in d), "worse": sum(x < -1e-12 for x in d), "unchanged": sum(abs(x) <= 1e-12 for x in d), "iid_bootstrap_95": boot(d) if d else None}
pairs195 = [m for m in cx if cx[m]["status"] == "scored" and bx[m]["status"] == "scored"]; cres = sorted(set(RES["control"]) & set(RES["l004sc"]))
extra = [m for m in cx if cx[m]["status"] == "scored" and bx[m]["status"] != "scored" and m in RES["control"] and m in RES["l004sc"]]
A["codex_overlap"] = {"codex_l004_attempts": len(cx), "attempts_inside_E": len(inE), "early_cohort_n_equal": sum(a == b for a, b in coh), "early_cohort_n_compared": len(coh),
                      "status_crosstab_codex_vs_claude": dict(cmp), "cluster_cluster_pairs": len(tdiff), "trigger_t_identical": sum(abs(x) < 1e-6 for x in tdiff), "net_sol_identical_cluster": sum(abs(x) < 1e-9 for x in netdiff),
                      "trail_trail_pairs": len(nd), "trail_net_sol_identical": sum(abs(x) < 1e-9 for x in nd), "trail_max_abs_net_diff": max(map(abs, nd)) if nd else None,
                      "codex_195_pairs": len(pairs195), "codex_195_pairs_in_claude_framework": view([m for m in pairs195 if m in RES["control"] and m in RES["l004sc"]]), "codex_published_paired": {"n": 195, "baseline_sol": -4.645368, "l004_sol": -2.179783, "difference_sol": 2.465585, "better": 69, "worse": 23, "unchanged": 103},
                      "E_pairs_inside_L003_attempts": view([m for m in cres if m in cx]), "E_pairs_outside_L003_attempts": view([m for m in cres if m not in cx]),
                      "codex_l004_only_22_resolved_under_both_exits_here": {"n": len(extra), "codex_baseline_why": dict(collections.Counter(bx[m]["why"] for m in extra)),
                          "control_sol": math.fsum(f(R["control"][m]["net_sol"]) for m in extra), "l004sc_sol": math.fsum(f(mine[m]["net_sol"]) for m in extra), "codex_l004_sol": math.fsum(f(cx[m]["net_sol"]) for m in extra),
                          "per_mint": [{"mint": m, "control_net_sol": f(R["control"][m]["net_sol"]), "control_hold_s": f(R["control"][m]["hold_s"]), "l004sc_net_sol": f(mine[m]["net_sol"]), "codex_l004_net_sol": f(cx[m]["net_sol"])} for m in extra]}}
s1 = json.load(open(out / "results_s1.json")); s2 = json.load(open(out / "results_s2.json"))
merged = {"run_id": "f010-20261112T145045Z", "s1_eval11": {k: v["by_size"]["0.2"] for k, v in s1["rules"].items()}, "s1_pool125": {k: v["pool_fee_125bps_sensitivity"]["0.2"] for k, v in s1["rules"].items()},
          "s2_r4": {k: s2["results"][k] for k in s2["results"]}, "s2_spec": s2["spec"], "s2_diagnostics": s2["diagnostics"], "analysis": A,
          "verdicts": {"F010 L004-SC on E": "loss reduction in direction on the E population (paired +2.108691 SOL on 419, 112 better / 38 worse), concentrated in the early half and in cells A and C; not distinguishable from zero on the full paired set (iid CI straddles zero; 3-h block CI straddles zero) because the exit also cuts the control's two largest winners (cell B); all-in still negative (446 resolved, -7.997302 SOL): not profitable; nothing supported",
                       "CL-L005 demand-decay exit": "failed: paired +0.921393 SOL on 418 (CI straddles zero); 84 launches resolved only under it at -3.277548 SOL (win 7 %) — converts quiet-tape unknowns into realised losses; all-in 502 resolved -12.426409 SOL"}}
json.dump(merged, open(out / "results.json", "w"), indent=2); print(json.dumps(A, indent=1))
