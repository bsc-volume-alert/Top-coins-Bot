"""F003 / R54 bind-share pre-check — COUNTS ONLY, no outcome is read. For the 679 eligibility-E launches (flags from Claude's published f011
features_at_300s.csv.gz, env F003_E_FEATURES — the same E as f006p2 / f009 / f010 / f011), report how many each F002 condition removes, by half
and by F009 cell, plus the census-wide share. Usage: F006P2_TOKENS=... F003_F002_LAUNCHES=... F003_E_FEATURES=... python3 -I precheck_conditions.py <out json>"""
import os, sys, csv, gzip, io, json, collections, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import creator_history as ch
H = ch.hist()
with io.TextIOWrapper(gzip.open(os.environ["F003_E_FEATURES"]), newline="") as f: feats = [r for r in csv.DictReader(f) if r["eligible_E"] == "True"]
assert len(feats) == 679, len(feats)
conds = ["C1_prev_not_retained", "C2_serial20", "C3_gap10"]
out = {"E_total": len(feats), "census_total": len(H), "census_removed_share": {c: sum(1 for h in H.values() if h[c]) / len(H) for c in conds},
       "E_no_in_window_predecessor": sum(1 for r in feats if H[r["mint"]]["n_prior"] == 0),
       "E_n_prior_quantiles": {q: statistics.quantiles([H[r["mint"]]["n_prior"] for r in feats], n=4)[i] for i, q in enumerate(("q1", "median", "q3"))},
       "E_gap_s_quantiles_with_predecessor": {q: statistics.quantiles([H[r["mint"]]["gap_s"] for r in feats if H[r["mint"]]["n_prior"] >= 1], n=4)[i] for i, q in enumerate(("q1", "median", "q3"))},
       "conditions": {}}
for c in conds:
    rem = [r for r in feats if H[r["mint"]][c]]
    out["conditions"][c] = {"removed": len(rem), "removed_share_of_E": len(rem) / len(feats), "kept": len(feats) - len(rem),
                            "removed_by_half": dict(collections.Counter(r["half"] for r in rem)), "removed_by_cell": dict(collections.Counter(r["cell"] for r in rem)),
                            "testable_R54": 0.05 <= len(rem) / len(feats) <= 0.95}
out["overlap"] = {"C1&C3": sum(1 for r in feats if H[r["mint"]]["C1_prev_not_retained"] and H[r["mint"]]["C3_gap10"]),
                  "C1&C2": sum(1 for r in feats if H[r["mint"]]["C1_prev_not_retained"] and H[r["mint"]]["C2_serial20"]),
                  "C2&C3": sum(1 for r in feats if H[r["mint"]]["C2_serial20"] and H[r["mint"]]["C3_gap10"]),
                  "any": sum(1 for r in feats if any(H[r["mint"]][c] for c in conds))}
json.dump(out, open(sys.argv[1], "w"), indent=1); print(json.dumps(out, indent=1))
