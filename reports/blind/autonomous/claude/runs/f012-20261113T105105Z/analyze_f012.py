"""f012 — results.json: CL-L010 headline blocks from results_s2.json plus the fixed descriptive breadth-quartile table of the control
(counts and totals only; quartile cuts are the control's own quartiles of breadth at the trigger; nothing is swapped in for the verdict),
the registered-direction checks, and the pointer to the C016 cross-review files.
Usage: python3 -I analyze_f012.py <out dir with ledger.csv, results_s2.json> <run folder with precheck_f012.json, rerun_comparison.json, independent_checks.json, codex_l008_rederived.json>"""
import sys, os, json, csv, math, statistics, collections, random
out, run = sys.argv[1], sys.argv[2]
S2 = json.load(open(os.path.join(out, "results_s2.json")))["results"]; STALE = 30; SEED = 20261113
def fl(x):
    try: return float(x)
    except (TypeError, ValueError): return None
rows = list(csv.DictReader(open(os.path.join(out, "ledger.csv"))))
def resolved(r): return r["cat"] == "scored" and (fl(r["fill_state_age_s"]) or 0) <= STALE and (fl(r["exit_state_age_s"]) or 0) <= STALE
ctrl = [r for r in rows if r["spec"] == "run2" and r["cat"] != "abstain"]; cres = [r for r in ctrl if resolved(r)]
cand_mints = {r["mint"] for r in rows if r["spec"] == "run2b" and r["cat"] != "abstain"}
def blk(rs):
    v = sorted(fl(r["net_sol"]) for r in rs)
    return {"resolved": len(v), "total_sol": math.fsum(v), "per_trade_sol": (math.fsum(v) / len(v)) if v else None,
            "share_loss_gt50": (sum(x < -0.1 for x in v) / len(v)) if v else None, "win_rate": (sum(x > 0 for x in v) / len(v)) if v else None,
            "median_hold_s": statistics.median([fl(r["hold_s"]) for r in rs]) if rs else None}
# fixed quartiles of breadth at the trigger over ALL control attempts (counts), outcomes on the resolved ones
bs = sorted(int(fl(r["breadth_at_trigger"])) for r in ctrl); q = [bs[int(k * (len(bs) - 1))] for k in (0.25, 0.5, 0.75)]
def qi(b): return 0 if b <= q[0] else 1 if b <= q[1] else 2 if b <= q[2] else 3
quart = {}
for i in range(4):
    att = [r for r in ctrl if qi(int(fl(r["breadth_at_trigger"]))) == i]
    quart[f"Q{i+1}"] = {"breadth_range": [min(int(fl(r["breadth_at_trigger"])) for r in att), max(int(fl(r["breadth_at_trigger"])) for r in att)], "attempted": len(att), **blk([r for r in att if resolved(r)])}
# registered-direction checks
kept = [r for r in cres if r["mint"] in cand_mints]; removed = [r for r in cres if r["mint"] not in cand_mints]
def share_ci(a, b, n=10000):
    rnd = random.Random(SEED); fa = [fl(r["net_sol"]) < -0.1 for r in a]; fb = [fl(r["net_sol"]) < -0.1 for r in b]
    d = sorted((sum(rnd.choice(fa) for _ in fa) / len(fa)) - (sum(rnd.choice(fb) for _ in fb) / len(fb)) for _ in range(n)); return [d[int(.025 * n)], d[int(.975 * n)]]
direction = {"per_trade_kept_minus_removed": S2["per_trade_kept_minus_removed"],
             "share_loss_gt50_kept": blk(kept)["share_loss_gt50"], "share_loss_gt50_removed": blk(removed)["share_loss_gt50"],
             "share_loss_gt50_difference_bootstrap_95": share_ci(kept, removed),
             "by_half": {h: {"kept": blk([r for r in kept if r["half"] == h]), "removed": blk([r for r in removed if r["half"] == h])} for h in ("early", "late")},
             "registered_direction_observed": {"per_trade": S2["per_trade_kept_minus_removed"]["difference"] > 0, "loss_share": blk(kept)["share_loss_gt50"] < blk(removed)["share_loss_gt50"],
                                               "per_trade_in_both_halves": all(blk([r for r in kept if r["half"] == h])["per_trade_sol"] > blk([r for r in removed if r["half"] == h])["per_trade_sol"] for h in ("early", "late"))}}
res = {"run": "f012-20261113T105105Z",
       "c016_cross_review": {"rerun_comparison": json.load(open(os.path.join(run, "rerun_comparison.json"))), "independent_checks": json.load(open(os.path.join(run, "independent_checks.json"))),
                             "codex_l008_rederived": json.load(open(os.path.join(run, "codex_l008_rederived.json")))},
       "cl_l010": {"precheck": json.load(open(os.path.join(run, "precheck_f012.json"))), "control_run2": S2["run2"], "candidate_run2b": S2["run2b"], "kept": S2["run2_kept_by_breadth"], "removed": S2["run2_removed_by_breadth"],
                   "paired_run2b_vs_run2": S2["paired_run2b_vs_run2"], "direction": direction, "control_breadth_quartiles_descriptive": {"cuts_p25_p50_p75": q, **quart},
                   "control_matches_f004_run2": (S2["run2"]["attempted"] == 568 and S2["run2"]["resolved_after_staleness"]["n"] == 492 and abs(S2["run2"]["resolved_after_staleness"]["total_sol"] + 16.344741) < 1e-6)}}
json.dump(res, open(os.path.join(out, "results.json"), "w"), indent=2)
print(json.dumps({"direction": direction, "quartiles": {"cuts": q, **quart}, "control_matches_f004": res["cl_l010"]["control_matches_f004_run2"]}, indent=1))
