"""f004 step 2 — compare the verbatim-logic re-run (repro_entries_all_window.csv) with the study's own published rows restricted to the allowlisted
window (study_entries_window.csv), per (mint, trigger): entry present on both sides, and field-by-field agreement (t_trig, run_at_entry, entry_px,
trades_after, every exit multiple and kind). Also recomputes the study's summary lines (mean, cap5x, median, SOL@0.2, win %, severe %, unresolved %)
on (a) the study's own window rows, (b) the re-run restricted to the study's mints, (c) the re-run on every retained window launch.
Usage: python3 -I compare_study.py <out dir>"""
import sys, os, json, math, collections
import pandas as pd, numpy as np
out = sys.argv[1]
S = pd.read_csv(os.path.join(out, "study_entries_window.csv")); Rr = pd.read_csv(os.path.join(out, "repro_entries_all_window.csv"))
study_mints = set(S.mint); R = Rr[Rr.mint.isin(study_mints)]
pols = ['trail30', 'trail50', 'tp1.5_stop50', 'tp2.0_stop50', 'tp3.0_stop50', 't300', 't900', 't3600']
def summ(e):
    o = {"n_mints": int(e.mint.nunique()), "entries": {}}
    for name, g in e.groupby('trigger'):
        d = {"n": int(len(g)), "t_trig_median": float(g.t_trig.median()), "run_at_entry_median": float(g.run_at_entry.median()), "peak_ge2x_pct": float(100 * (g.peak >= 2).mean()), "peak_ge5x_pct": float(100 * (g.peak >= 5).mean()), "trough_le05_pct": float(100 * (g.trough <= 0.5).mean())}
        for pol in pols:
            v = g[pol] - 1; unres = g[pol + '_kind'].str.contains('unresolved').mean()
            d[pol] = {"mean": float(v.mean()), "cap5x": float((g[pol].clip(upper=5) - 1).mean()), "median": float(v.median()), "SOL_at_0.2": float(0.2 * v.sum()), "win_pct": float(100 * (v > 0).mean()), "severe_pct": float(100 * (v <= -0.4).mean()), "unresolved_pct": float(100 * unres),
                      "SOL_without_best1": float(0.2 * (v.sum() - v.max())) if len(v) > 1 else None, "SOL_without_best3": float(0.2 * (v.sum() - v.nlargest(3).sum())) if len(v) > 3 else None}
        o["entries"][name] = d
    return o
key = ["mint", "trigger"]
m = S.merge(R, on=key, how="outer", suffixes=("_s", "_r"), indicator=True)
pres = m._merge.value_counts().to_dict()
both = m[m._merge == "both"]
fields = ["t_trig", "run_at_entry", "entry_px", "trades_after"] + pols + ["peak", "trough"]
agree = {}
for f in fields:
    a, b = both[f + "_s"].astype(float), both[f + "_r"].astype(float)
    agree[f] = {"identical_1e-9_rel": int((np.isclose(a, b, rtol=1e-9, atol=0)).sum()), "of": int(len(both)), "max_abs_rel_diff": float((abs(a - b) / abs(a).clip(lower=1e-300)).max())}
kinds = {f: int((both[f + "_kind_s"] == both[f + "_kind_r"]).sum()) for f in pols}
by_trig = {t: {"study": int((S.trigger == t).sum()), "rerun_same_mints": int((R.trigger == t).sum()), "both": int((both.trigger == t).sum()),
               "all_fields_identical": int(both[both.trigger == t].apply(lambda r: all(np.isclose(float(r[f + "_s"]), float(r[f + "_r"]), rtol=1e-9, atol=0) for f in fields), axis=1).sum()) if (both.trigger == t).any() else 0}
           for t in sorted(set(S.trigger) | set(R.trigger))}
only_s = m[m._merge == "left_only"][key].groupby("trigger").size().to_dict(); only_r = m[m._merge == "right_only"][key].groupby("trigger").size().to_dict()
res = {"study_rows_window": int(len(S)), "study_mints_window": len(study_mints), "rerun_rows_same_mints": int(len(R)), "rerun_mints_same": int(R.mint.nunique()),
       "rerun_rows_all_window": int(len(Rr)), "rerun_mints_all_window": int(Rr.mint.nunique()),
       "presence": {"both": int(pres.get("both", 0)), "study_only": int(pres.get("left_only", 0)), "rerun_only": int(pres.get("right_only", 0)), "study_only_by_trigger": {k: int(v) for k, v in only_s.items()}, "rerun_only_by_trigger": {k: int(v) for k, v in only_r.items()}},
       "field_agreement_on_both": agree, "exit_kind_agreement_on_both": kinds, "by_trigger": by_trig,
       "summary_study_window_rows": summ(S), "summary_rerun_same_mints": summ(R), "summary_rerun_all_retained_window": summ(Rr)}
json.dump(res, open(os.path.join(out, "study_comparison.json"), "w"), indent=2)
print(json.dumps({k: res[k] for k in ("presence", "by_trigger")}, indent=1)); print(json.dumps(agree, indent=1)); print(kinds)
for lab in ("summary_study_window_rows", "summary_rerun_same_mints", "summary_rerun_all_retained_window"):
    print("==", lab, res[lab]["n_mints"])
    for t, d in res[lab]["entries"].items(): print(f"  {t:12s} n={d['n']:5d} trail30 mean {d['trail30']['mean']:+.3f} SOL {d['trail30']['SOL_at_0.2']:+.2f} w/o best3 {d['trail30']['SOL_without_best3']:+.2f} severe {d['trail30']['severe_pct']:.1f}% unres {d['trail30']['unresolved_pct']:.1f}%")
