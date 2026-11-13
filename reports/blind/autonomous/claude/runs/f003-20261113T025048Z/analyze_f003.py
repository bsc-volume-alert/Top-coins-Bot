"""f003 — headline results.json from results_s2.json / results_s1.json / ledger.csv, the post-hoc "predecessor retained by c" block (the 64 kept
launches that do have an in-window predecessor), and a re-derivation of Codex's C014 runner-ledger counts (R51) from its published CSVs.
Usage: python3 -I analyze_f003.py <out dir with results_s2.json, results_s1.json, ledger.csv> <codex dir with runner_ledger_00[1-3].csv>"""
import sys, os, json, csv, math, statistics, collections, glob
out, cdx = sys.argv[1], sys.argv[2]
S2 = json.load(open(os.path.join(out, "results_s2.json"))); S1 = json.load(open(os.path.join(out, "results_s1.json")))
R = S2["results"]; STALE = 30
rows = list(csv.DictReader(open(os.path.join(out, "ledger.csv"))))
def fl(x):
    try: return float(x)
    except (TypeError, ValueError): return None
ctrl = [r for r in rows if r["spec"] == "control" and r["eligible_E"] == "True"]
def resolved(rr): return [r for r in rr if r["cat"] == "scored" and (fl(r["fill_state_age_s"]) or 0) <= STALE and (fl(r["exit_state_age_s"]) or 0) <= STALE]
def blk(rr):
    rs = resolved(rr); v = sorted(fl(r["net_sol"]) for r in rs)
    return {"attempted": len(rr), "resolved": len(rs), "total_sol": math.fsum(v), "per_trade_sol": (math.fsum(v) / len(v)) if v else None, "win_rate": (sum(x > 0 for x in v) / len(v)) if v else None,
            "median_ret": statistics.median([fl(r["ret"]) for r in rs]) if rs else None, "without_best1_sol": math.fsum(v[:-1]), "without_best3_sol": math.fsum(v[:-3]),
            "by_half": {h: {"resolved": len(resolved([r for r in rr if r["half"] == h])), "total_sol": math.fsum(fl(r["net_sol"]) for r in resolved([r for r in rr if r["half"] == h]))} for h in ("early", "late")},
            "by_cell": {c: {"attempted": sum(1 for r in rr if r["cell"] == c), "resolved": len(resolved([r for r in rr if r["cell"] == c])), "total_sol": math.fsum(fl(r["net_sol"]) for r in resolved([r for r in rr if r["cell"] == c]))} for c in ("A", "B", "C")}}
post_hoc = {"note": "post-hoc description, not registered: E split by creator history at creation into three ordered groups",
            "no_in_window_predecessor": blk([r for r in ctrl if int(r["n_prior"]) == 0]),
            "predecessor_retained_by_c (kept by C1)": blk([r for r in ctrl if int(r["n_prior"]) >= 1 and r["C1"] == "False"]),
            "predecessor_not_retained_by_c (removed by C1)": blk([r for r in ctrl if r["C1"] == "True"])}
# consistency: the three groups partition E and the two kept groups sum to the registered kept side
assert sum(g["attempted"] for k, g in post_hoc.items() if k != "note") == 679
assert abs(post_hoc["no_in_window_predecessor"]["total_sol"] + post_hoc["predecessor_retained_by_c (kept by C1)"]["total_sol"] - R["F003_C1_sides"]["kept"]["resolved_after_staleness"]["total_sol"]) < 1e-9
# hold-time description of the removed side (counts only)
rem = resolved([r for r in ctrl if r["C1"] == "True"]); kep = resolved([r for r in ctrl if r["C1"] == "False"])
holds = {"removed_median_hold_s": statistics.median([fl(r["hold_s"]) for r in rem]), "kept_median_hold_s": statistics.median([fl(r["hold_s"]) for r in kep]),
         "removed_share_exiting_within_60s": sum(1 for r in rem if fl(r["hold_s"]) <= 60) / len(rem), "kept_share_exiting_within_60s": sum(1 for r in kep if fl(r["hold_s"]) <= 60) / len(kep)}
# Codex C014 re-derivation (R51) from the published runner ledgers @ be8cf89
L = []
for p in sorted(glob.glob(os.path.join(cdx, "runner_ledger_00*.csv"))): L += list(csv.DictReader(open(p)))
mx = [fl(r["max_observed_sellable_proceeds_sol"]) for r in L]
codex = {"rows": len(L), "all_max_ge_0.4": sum(1 for x in mx if x >= 0.4), "median_max_sol": statistics.median(mx),
         "observed_ge2x_anywhere": sum(1 for r in L if r["observed_ge2x_anywhere"] == "True"), "observed_ge2x_before_raw_gap": sum(1 for r in L if r["observed_ge2x_before_raw_gap"] == "True"),
         "observed_ge2x_before_an_actual_raw_gap": sum(1 for r in L if r["observed_ge2x_before_raw_gap"] == "True" and r["first_raw_receipt_gap_start"]),
         "no_raw_receipt_gap_at_all (censored tails)": sum(1 for r in L if not r["first_raw_receipt_gap_start"]),
         "tail_without_observation_gt30s": sum(1 for r in L if r["tail_without_observation_gt30s"] == "True"),
         "unfiltered_sustain_confirmed_before_any_original_failure": sum(1 for r in L if r["unfiltered_sustain_confirmed_before_any_original_failure"] == "True"),
         "stored_max_identical": sum(1 for r in L if r["stored_max_identical"] == "True"),
         "codex_R51_claims": {"maxima_ge_0.4": 53, "median_max": 0.642, "before_first_gap": 11, "censored_no_gap_tails": 4, "sustained_before_failure": 0}}
codex["agree"] = (codex["rows"] == 53 and codex["all_max_ge_0.4"] == 53 and round(codex["median_max_sol"], 3) == 0.642 and codex["observed_ge2x_before_an_actual_raw_gap"] == 11 and codex["no_raw_receipt_gap_at_all (censored tails)"] == 4 and codex["observed_ge2x_before_raw_gap"] == 15 and codex["unfiltered_sustain_confirmed_before_any_original_failure"] == 0)
def s1(name): b = S1["rules"][name]["by_size"]["0.2"]; return {k: b[k] for k in ("scored", "abstain", "unknown", "total_net_sol_scored", "unknown_share_of_attempts", "mean_ret", "median_ret", "win_rate", "scorable", "supported")}
C1 = R["F003_C1_sides"]; L8 = R["CL_L008_sides"]
res = {"run": "f003-20261113T025048Z", "control_R4": {k: R["control"][k] for k in ("attempted", "uncertain_exit", "stale_fill_gt30s_marked_unavailable", "stale_exit_gt30s_marked_uncertain", "unknown_share_of_attempts")} | {"resolved": R["control"]["resolved_after_staleness"]},
       "F003_C1": {"removed_share_of_E": C1["removed_share_of_E"], "kept": {k: C1["kept"][k] for k in ("attempted", "unknown_share_of_attempts")} | {"resolved": C1["kept"]["resolved_after_staleness"], "by_half": C1["kept"]["by_half"], "by_cell": C1["kept"]["by_cell"]},
                   "removed": {k: C1["removed"][k] for k in ("attempted", "unknown_share_of_attempts")} | {"resolved": C1["removed"]["resolved_after_staleness"], "by_half": C1["removed"]["by_half"], "by_cell": C1["removed"]["by_cell"]},
                   "per_trade_kept_minus_removed_sol": C1["per_trade_kept_minus_removed_sol"], "per_trade_difference_bootstrap_95": C1["per_trade_difference_bootstrap_95"],
                   "registered_direction_observed": C1["per_trade_kept_minus_removed_sol"] > 0, "interval_excludes_zero": C1["per_trade_difference_bootstrap_95"][0] > 0,
                   "paired_R11": R["c1kept_paired"], "hold_times": holds, "post_hoc_three_groups": post_hoc, "removed_split_by_prev_retained_ever": R["F003_C1_removed_by_prev_retained_ever"]},
       "descriptive_only": {"C2_serial20": {k: R["descriptive_C2_serial20_sides"][k] for k in ("kept_attempted", "removed_attempted", "per_trade_kept_minus_removed_sol", "per_trade_difference_bootstrap_95")} | {"kept_resolved": R["descriptive_C2_serial20_sides"]["kept"]["resolved_after_staleness"], "removed_resolved": R["descriptive_C2_serial20_sides"]["removed"]["resolved_after_staleness"]},
                            "C3_gap10": {k: R["descriptive_C3_gap10_sides"][k] for k in ("kept_attempted", "removed_attempted", "per_trade_kept_minus_removed_sol", "per_trade_difference_bootstrap_95")} | {"kept_resolved": R["descriptive_C3_gap10_sides"]["kept"]["resolved_after_staleness"], "removed_resolved": R["descriptive_C3_gap10_sides"]["removed"]["resolved_after_staleness"]},
                            "no_predecessor_vs_any": {k: R["descriptive_no_predecessor_vs_any"][k] for k in ("kept_attempted", "removed_attempted", "per_trade_kept_minus_removed_sol", "per_trade_difference_bootstrap_95")}},
       "CL_L008": {"threshold": S2["spec"]["ftb_threshold"], "removed_share_of_E": L8["removed_share_of_E"], "kept": {"attempted": L8["kept"]["attempted"], "unknown_share": L8["kept"]["unknown_share_of_attempts"], "resolved": L8["kept"]["resolved_after_staleness"], "by_half": L8["kept"]["by_half"], "by_cell": L8["kept"]["by_cell"]},
                   "removed": {"attempted": L8["removed"]["attempted"], "unknown_share": L8["removed"]["unknown_share_of_attempts"], "resolved": L8["removed"]["resolved_after_staleness"], "by_half": L8["removed"]["by_half"], "by_cell": L8["removed"]["by_cell"]},
                   "per_trade_kept_minus_removed_sol": L8["per_trade_kept_minus_removed_sol"], "per_trade_difference_bootstrap_95": L8["per_trade_difference_bootstrap_95"],
                   "registered_direction_observed": L8["per_trade_kept_minus_removed_sol"] > 0, "interval_excludes_zero": L8["per_trade_difference_bootstrap_95"][0] > 0,
                   "paired_R11": R["l008kept_paired"], "descriptive_ftb_ge_0.5": {k: R["descriptive_ftb_ge_0.5_sides"][k] for k in ("kept_attempted", "removed_attempted", "per_trade_kept_minus_removed_sol", "per_trade_difference_bootstrap_95")} | {"kept_resolved": R["descriptive_ftb_ge_0.5_sides"]["kept"]["resolved_after_staleness"]},
                   "descriptive_quartiles": R["descriptive_ftb_quartiles"], "C1_removed_cell_C_by_ftb": R["descriptive_C1_within_C_cell_by_ftb"]},
       "S1_eval_1_1_verbatim": {k: s1(k) for k in S1["rules"]}, "codex_C014_rederived": codex, "diagnostics": S2["diagnostics"]}
json.dump(res, open(os.path.join(out, "results.json"), "w"), indent=2)
print(json.dumps({"post_hoc": post_hoc, "holds": holds, "codex": codex}, indent=1))
