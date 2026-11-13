"""f004 — results.json: (1) the knowable-at-time audit quantified on the 3,638-launch denominator — what the study's future-looking screen
(>= 20 trades and tape >= 600 s) removes and how those launches trade under the KAT BASE60 entry; (2) study-logic vs KAT entries on the same
launches (entry-time difference, trigger receipt lag); (3) headline S2 / S1 blocks; (4) Codex C015 re-derivation.
Usage: python3 -I analyze_f004.py <out dir with ledger.csv, results_s2.json, results_s1.json, repro_entries_all_window.csv, codex_c015_rederived.json>"""
import sys, os, json, csv, math, statistics, collections
out = sys.argv[1]
S2 = json.load(open(os.path.join(out, "results_s2.json"))); S1 = json.load(open(os.path.join(out, "results_s1.json"))); C015 = json.load(open(os.path.join(out, "codex_c015_rederived.json")))
STALE = 30
def fl(x):
    try: return float(x)
    except (TypeError, ValueError): return None
rows = list(csv.DictReader(open(os.path.join(out, "ledger.csv"))))
rep = list(csv.DictReader(open(os.path.join(out, "repro_entries_all_window.csv"))))
den = sorted({r["mint"] for r in rows}); assert len(den) == 3638
by = collections.defaultdict(dict)
for r in rows: by[r["spec"]][r["mint"]] = r
def resolved(r): return r["cat"] == "scored" and (fl(r["fill_state_age_s"]) or 0) <= STALE and (fl(r["exit_state_age_s"]) or 0) <= STALE
def blk(rr):
    rs = [r for r in rr if resolved(r)]; v = sorted(fl(r["net_sol"]) for r in rs); att = [r for r in rr if r["cat"] != "abstain"]
    return {"attempted": len(att), "resolved": len(rs), "total_sol": math.fsum(v), "per_trade_sol": (math.fsum(v) / len(v)) if v else None, "share_loss_gt50": (sum(x < -0.1 for x in v) / len(v)) if v else None,
            "without_best3_sol": math.fsum(v[:-3]), "unknown_share_of_attempts": ((len(att) - len(rs)) / len(att)) if att else None}
# (1) survivorship: the study's screen on the KAT denominator
screen_pass = {r["mint"] for r in rep if r["trigger"] == "BASE60"}   # a BASE60 row exists iff the launch passed >= 20 trades, tape >= 600 s, i60 >= 0 and a landing trade existed
b60 = by["base60"]
surv = {"denominator": len(den), "pass_study_screen": sum(m in screen_pass for m in den), "fail_study_screen": sum(m not in screen_pass for m in den),
        "KAT_BASE60_on_pass": blk([b60[m] for m in den if m in screen_pass]), "KAT_BASE60_on_fail": blk([b60[m] for m in den if m not in screen_pass]),
        "note": "the screen is evaluated on the whole tape, so at a 60-s decision it is not knowable; launches failing it are the ones whose tape ends before 600 s after the first trade"}
# (2) study-logic vs KAT RUN entries on the same launches
rep_by = collections.defaultdict(dict)
for r in rep: rep_by[r["trigger"]][r["mint"]] = r
cmp = {}
for k in ("2", "3", "5"):
    sl = rep_by["RUN" + k]; kat = by["run" + k]; both = [m for m in den if m in sl and kat[m]["cat"] != "abstain"]
    only_study = [m for m in den if m in sl and kat[m]["cat"] == "abstain"]; only_kat = [m for m in den if m not in sl and kat[m]["cat"] != "abstain"]
    dt = [fl(kat[m]["entry_age_s"]) - fl(sl[m]["t_trig"]) for m in both]   # KAT decision age (receipt, from create_ts) minus study trigger age (chain time from first trade)
    cmp["RUN" + k] = {"study_logic_entries": len(sl), "KAT_attempts": sum(1 for m in den if kat[m]["cat"] != "abstain"), "both": len(both), "study_only": len(only_study), "KAT_only": len(only_kat),
                      "KAT_only_reason": "no study screen (tape < 600 s or < 20 trades) or no landing trade in the study", "study_only_reason": "receipt-time crossing after 900 s, or trigger row's state not usable, or p60 differs (receipt vs chain, create_ts vs first trade)",
                      "entry_age_difference_s_median": statistics.median(dt) if dt else None, "entry_age_difference_s_p90": (sorted(dt)[int(0.9 * len(dt))] if dt else None),
                      "trigger_receipt_lag_s_median": S2["results"]["run" + k]["trigger_receipt_lag_median_s"],
                      "study_logic_trail30_SOL_on_both": 0.2 * math.fsum(fl(sl[m]["trail30"]) - 1 for m in both), "KAT_resolved_on_both": blk([kat[m] for m in both])}
# (3) headline
def head(name):
    s = S2["results"][name]; r = s["resolved_after_staleness"]
    return {"attempted": s["attempted"], "filled": s["filled"], "unavailable_fill": s["unavailable_fill"], "uncertain_exit": s["uncertain_exit"] + s["stale_exit_gt30s_marked_uncertain"], "resolved": r.get("n", 0),
            "total_sol": r.get("total_sol"), "per_trade_sol": r.get("per_trade_sol"), "mean_ret": r.get("mean_ret"), "median_ret": r.get("median_ret"), "win_rate": r.get("win_rate"), "share_loss_gt50": r.get("share_loss_gt50"),
            "without_best1_sol": r.get("without_best1_sol"), "without_best3_sol": r.get("without_best3_sol"), "bootstrap_95_total_sol": r.get("bootstrap_95_total_sol"), "unknown_share_of_attempts": s["unknown_share_of_attempts"],
            "by_half": {h: {"n": s["by_half"][h].get("n", 0), "total_sol": s["by_half"][h].get("total_sol")} for h in ("early", "late")}}
S1r = {k: {kk: v["by_size"]["0.2"][kk] for kk in ("N", "scored", "abstain", "unknown", "total_net_sol_scored", "mean_ret", "median_ret", "win_rate", "share_loss_ge_50", "unknown_share_of_attempts", "scorable", "supported", "bonferroni_lcb_lower")} | {"sens125_total": v["pool_fee_125bps_sensitivity"]["0.2"]["total_net_sol_scored"]} for k, v in S1["rules"].items()}
res = {"run": "f004-20261113T065047Z", "study": {"branch": "analysis-fable-11nov", "commit": "cc20a2ca6819ae455fafa7df41a19e3f6bb80cc6", "script_sha256": "2b4d4faf43b445cab57c4ee20fcf9ec6a902d077c5a286b3e9102c3d2257542c", "entries_sha256": "b45eb610e67c47afea8838b1870180c3601eb10e37e230ef98244808d2097131"},
       "step1_reproduction": json.load(open(os.path.join(out, "study_comparison.json")))["presence"] | {"all_fields_identical_rows": 2171, "study_mints_in_window": 782, "study_mints_outside_window_unread": 537},
       "survivorship_screen": surv, "study_vs_KAT_run_entries": cmp,
       "S2_R4_scenario": {k: head(k) for k in ("base60", "run2", "run3", "run5", "dipctl", "dipcand")}, "S2_R4_scenario_study782": {k: head(k + "_study782") for k in ("base60", "run2", "run3", "run5", "dipctl", "dipcand")},
       "S2_paired": {k: {kk: vv for kk, vv in S2["results"][k].items() if kk not in ("candidate_only_block", "control_only_block")} for k in ("paired_run2_vs_base60", "paired_run3_vs_base60", "paired_run5_vs_base60", "paired_dipcand_vs_dipctl")},
       "S2_per_trade": {k: S2["results"][k] for k in ("per_trade_run2_minus_base60", "per_trade_run3_minus_base60", "per_trade_run5_minus_base60", "per_trade_dipcand_minus_dipctl")},
       "S1_eval11": S1r, "E_control_reference_f003": {"attempted": 679, "resolved": 419, "total_sol": -10.011572, "source": "research-claude f003-20261113T025048Z @ 0490cd0, not re-run here"},
       "codex_c015_rederived": {k: C015[k] for k in ("positions", "above", "below", "equal", "proxy_difference", "by_half", "obstruction_kinds", "mark_strictly_before_obstruction", "max_mark_age_at_obstruction_s", "true_baseline_exit_empty")} | {"peer_five": C015["peer_five"], "changed_pairs": C015["changed_pairs"]}}
json.dump(res, open(os.path.join(out, "results.json"), "w"), indent=2)
print(json.dumps({k: res[k] for k in ("survivorship_screen", "study_vs_KAT_run_entries", "S1_eval11")}, indent=1))
