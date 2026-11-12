"""F008 — label concordance at 5 min on the 3,638-launch denominator. Counts only; no new labels.
Inputs (record-level, published): Claude f006 features_labels.csv.gz (research-claude @ 7a9cd6a; label2x = price >= 2x state price at t,
held >= 30 s, 1-h horizon; label2x_tol30 = R2 standing rule) and Codex c009 ledger_*.csv (research-codex @ e9f952d; label = net sellable
proceeds >= 2x the 0.2 SOL stake after costs, held >= 30 s, 2-h horizon, requires a fill at t+1 and a continuous valid path).
Usage: python3 -I concordance.py <claude features_labels.csv.gz> <codex ledger dir> <out dir>"""
import sys, csv, gzip, glob, json, collections, pathlib, statistics
cl_path, cx_dir, out = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
cl = [r for r in csv.DictReader(gzip.open(cl_path, "rt")) if r["age_s"] == "300"]
cx = []
for f in sorted(glob.glob(cx_dir + "/ledger_*.csv")): cx += [r for r in csv.DictReader(open(f)) if r["age"] == "300"]
assert len(cl) == 3638, len(cl); assert len(cx) == 3489, len(cx)
C = {r["mint"]: r for r in cl}; X = {r["mint"]: r for r in cx}
assert len(C) == 3638 and len(X) == 3489
res = {"inputs": {"claude": "f006 features_labels.csv.gz @ 7a9cd6a (age_s=300)", "codex": "c009 ledger_001..053.csv @ e9f952d (age=300)"},
       "n_claude": len(cl), "n_codex": len(cx), "codex_mints_not_in_claude": sorted(set(X) - set(C)), "claude_mints_not_in_codex": len(set(C) - set(X))}
def fl(x):
    try: return float(x)
    except: return None
def xlab(m):
    r = X.get(m)
    if r is None: return "not_in_codex_cohort"
    return r["label"]
def xstatus(m):
    r = X.get(m)
    if r is None: return "not_in_codex_cohort"
    return r["trade_status"] + ("" if r["trade_status"] == "scored" else ":" + r["reason"])
for lab in ("label2x", "label2x_tol30"):
    ct = collections.Counter((C[m][lab] or "no_record", xlab(m)) for m in C)
    res["crosstab_" + lab] = {f"{a} | {b}": n for (a, b), n in sorted(ct.items())}
# Claude's runners vs Codex's observed_sustained2x
cl_run = sorted(m for m in C if C[m]["label2x"] == "runner"); cx_run = sorted(m for m in X if X[m]["label"] == "observed_sustained2x")
both = sorted(set(cl_run) & set(cx_run)); only_cl = sorted(set(cl_run) - set(cx_run)); only_cx = sorted(set(cx_run) - set(cl_run))
res["claude_runners"] = len(cl_run); res["codex_runners"] = len(cx_run); res["in_both"] = len(both); res["claude_only"] = len(only_cl); res["codex_only"] = len(only_cx)
# why Claude-only runners are not Codex runners
why = collections.Counter(); detail = []
for m in only_cl:
    r = X.get(m); c = C[m]
    if r is None: k = "not_in_codex_cohort"
    elif r["trade_status"] == "fill_unavailable": k = "codex_fill_unavailable: " + r["reason"]
    else:
        mp = fl(r["max_observed_sellable_proceeds_sol"]) if "max_observed_sellable_proceeds_sol" in r else None
        if r["label"] == "captured_path_nonrunner": k = "codex_filled_captured_path_but_proceeds<2x"
        else: k = "codex_filled_label_unknown(path_not_continuous): " + ("proceeds_reached_2x_sometime" if (mp is not None and mp >= 0.4) else "max_proceeds<2x")
    why[k] += 1
    detail.append({"mint": m, "claude_half": c["half"], "claude_max_multiple_1h": fl(c["max_multiple_1h"]), "claude_coverage_ok": c["coverage_ok"], "codex": k,
                   "codex_trade_status": xstatus(m), "codex_max_proceeds_sol": fl(r["max_observed_sellable_proceeds_sol"]) if r and "max_observed_sellable_proceeds_sol" in r else None,
                   "codex_net_sol": fl(r["net_sol"]) if r else None, "codex_quote_reserve_sol": fl(r["quote_reserve_sol"]) if r else None})
res["claude_only_reasons"] = dict(why)
# among Claude-only runners that Codex filled: max multiple (price) distribution and max proceeds
filled = [d for d in detail if d["codex_trade_status"] != "not_in_codex_cohort" and not d["codex_trade_status"].startswith("fill_unavailable")]
res["claude_only_codex_filled"] = {"n": len(filled), "median_claude_max_multiple_1h": statistics.median([d["claude_max_multiple_1h"] for d in filled if d["claude_max_multiple_1h"] is not None]) if filled else None,
    "n_codex_max_proceeds_ge_0.4": sum(1 for d in filled if d["codex_max_proceeds_sol"] is not None and d["codex_max_proceeds_sol"] >= 0.4),
    "n_codex_max_proceeds_lt_0.4": sum(1 for d in filled if d["codex_max_proceeds_sol"] is not None and d["codex_max_proceeds_sol"] < 0.4),
    "n_codex_max_proceeds_missing": sum(1 for d in filled if d["codex_max_proceeds_sol"] is None)}
# why Codex-only runners are not Claude runners
why2 = collections.Counter(); detail2 = []
for m in only_cx:
    c = C[m]; mm = fl(c["max_multiple_1h"])
    if c["label2x"] == "runner": k = "impossible"
    elif not c["status"] or c["status"] != "ok": k = "claude_no_state_at_t: " + (c["status"] or "no_record")
    elif mm is not None and mm >= 2: k = "claude_price_reached_2x_within_1h_but_not_held_30s"
    elif mm is not None: k = "claude_price_max_multiple_1h<2 (horizon 1h vs 2h, or fill-price basis)"
    else: k = "claude_max_multiple_missing"
    why2[k] += 1
    detail2.append({"mint": m, "claude_label2x": c["label2x"], "claude_status": c["status"], "claude_max_multiple_1h": mm, "claude_coverage_ok": c["coverage_ok"], "codex_net_sol": fl(X[m]["net_sol"]), "codex_trade_status": xstatus(m), "codex_max_proceeds_sol": fl(X[m].get("max_observed_sellable_proceeds_sol"))})
res["codex_only_reasons"] = dict(why2)
# fill availability of Claude runners in Codex's model, and the 'both' set by half and by Codex trade result
res["claude_runners_by_codex_trade_status"] = dict(collections.Counter(xstatus(m).split(":")[0] for m in cl_run))
res["claude_runners_codex_fill_reasons"] = dict(collections.Counter(xstatus(m) for m in cl_run if xstatus(m).startswith("fill_unavailable")))
res["both_by_half"] = dict(collections.Counter(C[m]["half"] for m in both)); res["claude_runners_by_half"] = dict(collections.Counter(C[m]["half"] for m in cl_run)); res["codex_runners_by_half"] = dict(collections.Counter(X[m]["half"] for m in cx_run))
res["codex_runners_by_claude_status"] = dict(collections.Counter(C[m]["status"] or "no_record" for m in cx_run))
sc = [fl(X[m]["net_sol"]) for m in cx_run if X[m]["trade_status"] == "scored"]
res["codex_runners_scored_trades"] = {"n": len(sc), "total_sol": sum(sc), "n_positive": sum(1 for v in sc if v > 0)}
sc2 = [fl(X[m]["net_sol"]) for m in cl_run if X.get(m) and X[m]["trade_status"] == "scored"]
res["claude_runners_codex_scored_trades"] = {"n": len(sc2), "total_sol": sum(sc2), "n_positive": sum(1 for v in sc2 if v > 0)}
# Codex's negatives (0) vs Claude's: counts
res["codex_label_counts"] = dict(collections.Counter(r["label"] for r in cx)); res["claude_label_counts"] = dict(collections.Counter(r["label2x"] or "no_record" for r in cl)); res["claude_label_tol30_counts"] = dict(collections.Counter(r["label2x_tol30"] or "no_record" for r in cl))
# Claude's tol30 non-runners: what does Codex say about them
res["claude_tol30_nonrunners_by_codex"] = dict(collections.Counter(xlab(m) for m in C if C[m]["label2x_tol30"] == "nonrunner"))
res["claude_tol30_nonrunners_by_codex_status"] = dict(collections.Counter(xstatus(m).split(":")[0] for m in C if C[m]["label2x_tol30"] == "nonrunner"))
json.dump(res, open(out / "results.json", "w"), indent=2)
with open(out / "claude_only_runners.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(detail[0].keys())); w.writeheader(); w.writerows(detail)
with open(out / "codex_only_runners.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=["mint", "claude_label2x", "claude_status", "claude_max_multiple_1h", "claude_coverage_ok", "codex_net_sol", "codex_trade_status", "codex_max_proceeds_sol"]); w.writeheader(); w.writerows(detail2)
with open(out / "runners_in_both.txt", "w") as fh: fh.write("\n".join(both) + "\n")
print(json.dumps(res, indent=1))
