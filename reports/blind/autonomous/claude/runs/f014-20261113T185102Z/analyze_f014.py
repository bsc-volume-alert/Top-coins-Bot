"""f014 — headline results.json from results_s2.json / results_s1.json / precheck_f014.json / codex_c017_confirmation.json; plus the
post-hoc hold-time description of the removed side and the control-reproduction assertion (679 / 419 / −10.011572).
Usage: python3 -I analyze_f014.py <out dir>"""
import sys, os, json, csv, math, statistics
out = sys.argv[1]
S2 = json.load(open(os.path.join(out, "results_s2.json"))); S1 = json.load(open(os.path.join(out, "results_s1.json")))
PC = json.load(open(os.path.join(out, "precheck_f014.json"))); CX = json.load(open(os.path.join(out, "codex_c017_confirmation.json")))
R = S2["results"]; C = R["control"]["resolved_after_staleness"]; L = R["CL_L012_sides"]
assert R["control"]["attempted"] == 679 and C["n"] == 419 and abs(C["total_sol"] - (-10.011572)) < 1e-6, (R["control"]["attempted"], C["n"], C["total_sol"])
assert L["kept_attempted"] == PC["kept_retention_le_T"] == 548 and L["removed_attempted"] == PC["removed_retention_gt_T"] == 131
rows = list(csv.DictReader(open(os.path.join(out, "ledger.csv"))))
def fl(x):
    try: return float(x)
    except (TypeError, ValueError): return None
ctrl = [r for r in rows if r["spec"] == "control" and r["eligible_E"] == "True"]
def resolved(rr): return [r for r in rr if r["cat"] == "scored" and (fl(r["fill_state_age_s"]) or 0) <= 30 and (fl(r["exit_state_age_s"]) or 0) <= 30]
rem = resolved([r for r in ctrl if r["L012_removed"] == "True"]); kep = resolved([r for r in ctrl if r["L012_removed"] == "False"])
holds = {"removed_median_hold_s": statistics.median([fl(r["hold_s"]) for r in rem]), "kept_median_hold_s": statistics.median([fl(r["hold_s"]) for r in kep]),
         "removed_share_exiting_within_60s": sum(1 for r in rem if fl(r["hold_s"]) <= 60) / len(rem), "kept_share_exiting_within_60s": sum(1 for r in kep if fl(r["hold_s"]) <= 60) / len(kep),
         "removed_unknown_reasons": {k: sum(1 for r in ctrl if r["L012_removed"] == "True" and r["cat"] == "unknown" and r["why"] == k) for k in sorted({r["why"] for r in ctrl if r["cat"] == "unknown"})}}
def s1(name): b = S1["rules"][name]["by_size"]["0.2"]; return {k: b[k] for k in ("scored", "abstain", "unknown", "total_net_sol_scored", "unknown_share_of_attempts", "mean_ret", "median_ret", "win_rate", "share_loss_ge_50", "scorable", "supported")}
pt = L["per_trade_difference_bootstrap_95"]; ls = L["loss_gt50_share_difference_bootstrap_95"]
dir_pt = L["per_trade_kept_minus_removed_sol"] > 0; dir_ls = L["loss_gt50_share_kept_minus_removed"] < 0
halves_dir = {h: {"per_trade": L["by_half"][h]["kept"]["per_trade_sol"] > L["by_half"][h]["removed"]["per_trade_sol"], "loss_share": L["by_half"][h]["kept"]["share_loss_gt50"] < L["by_half"][h]["removed"]["share_loss_gt50"]} for h in ("early", "late")}
verdict = ("weak" if (dir_pt and dir_ls and (pt[0] > 0 or ls[1] < 0) and not (pt[0] > 0 and ls[1] < 0)) else "promising" if (pt[0] > 0 and ls[1] < 0) else "failed" if not (dir_pt or dir_ls) else "inconclusive")
res = {"run": "f014-20261113T185102Z", "protocol_commit": "934a86e", "precheck_commit": "6a4fc23", "T_s": 60.0,
       "part_a_codex_C017_confirmation": CX,
       "control_R4": {k: R["control"][k] for k in ("attempted", "uncertain_exit", "stale_fill_gt30s_marked_unavailable", "stale_exit_gt30s_marked_uncertain", "unknown_share_of_attempts")} | {"resolved": C, "reproduces_f003_f009_f010_f011": True},
       "precheck_R54": {k: PC[k] for k in ("removed_retention_gt_T", "removed_share_of_E", "kept_retention_le_T", "testable_R54", "removed_by_half", "removed_by_cell", "E_tier_ge1", "E_retention_s", "E_retention_s_histogram", "R68_activity_at_retention")},
       "CL_L012": {"removed_share_of_E": L["removed_share_of_E"],
                   "kept_fast": {k: L["kept"][k] for k in ("attempted", "filled", "unavailable_fill", "uncertain_exit", "unknown_share_of_attempts")} | {"resolved": L["kept"]["resolved_after_staleness"], "by_half": L["kept"]["by_half"], "by_cell": L["kept"]["by_cell"]},
                   "removed_slow": {k: L["removed"][k] for k in ("attempted", "filled", "unavailable_fill", "uncertain_exit", "unknown_share_of_attempts")} | {"resolved": L["removed"]["resolved_after_staleness"], "by_half": L["removed"]["by_half"], "by_cell": L["removed"]["by_cell"]},
                   "per_trade_kept_minus_removed_sol": L["per_trade_kept_minus_removed_sol"], "per_trade_difference_bootstrap_95": pt,
                   "loss_gt50_share_kept_minus_removed": L["loss_gt50_share_kept_minus_removed"], "loss_gt50_share_difference_bootstrap_95": ls,
                   "registered_direction_observed": {"per_trade": dir_pt, "loss_share": dir_ls, "by_half": halves_dir, "by_cell_per_trade": {c: L["by_cell"][c]["kept"]["per_trade_sol"] > L["by_cell"][c]["removed"]["per_trade_sol"] for c in ("A", "B", "C")}},
                   "interval_excludes_zero": {"per_trade": pt[0] > 0, "loss_share": ls[1] < 0}, "removed_fewer_than_30_resolved": L["removed_fewer_than_30_resolved"],
                   "paired_R11": R["l012kept_paired"], "hold_times": holds, "verdict": verdict,
                   "verdict_note": "weak = registered direction on both measures, one interval excludes zero, the other does not; kept side still a loss on every denominator and worse without its best trades; not profitable, not supported"},
       "descriptive_only": {"retention_quartiles": R["descriptive_retention_quartiles"], "retention_bins": R["descriptive_retention_bins"], "activity_confound_R68": R["descriptive_activity_confound"], "tier_ge1": R["descriptive_tier_ge1"]},
       "S1_eval_1_1_verbatim": {k: s1(k) for k in S1["rules"]} | {"N_common": S1["N_common"], "duplicates_removed": S1["duplicates_removed"]}, "diagnostics": S2["diagnostics"]}
json.dump(res, open(os.path.join(out, "results.json"), "w"), indent=2)
print(json.dumps({"verdict": verdict, "holds": holds, "dir": res["CL_L012"]["registered_direction_observed"], "ci": res["CL_L012"]["interval_excludes_zero"]}, indent=1))
