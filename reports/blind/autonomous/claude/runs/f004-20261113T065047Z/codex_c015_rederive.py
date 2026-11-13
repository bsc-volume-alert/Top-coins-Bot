"""f004 — re-derivation of Codex C015's headline counts from its PUBLISHED marks ledgers (research-codex @ 9a9fa3d, runs/c015-lab-20261113T031524Z/
marks_ledger_00[12].csv, peer_five_marks_001.csv, changed_pairs_001.csv). Counts and sums only; no raw replay. Usage: python3 -I codex_c015_rederive.py <codex dir> <out json>"""
import sys, os, csv, glob, json, math, collections
d, outp = sys.argv[1], sys.argv[2]
L = []
for p in sorted(glob.glob(os.path.join(d, "marks_ledger_00*.csv"))): L += list(csv.DictReader(open(p)))
f = float
diff = [f(r["last_mark_minus_l004_exit_sol"]) for r in L]
o = {"positions": len(L), "l004_arithmetic_reproduced": sum(r["l004_arithmetic_reproduced"] == "True" for r in L), "marks_available": sum(r["last_mark_available"] == "True" for r in L),
     "above": sum(x > 1e-12 for x in diff), "below": sum(x < -1e-12 for x in diff), "equal": sum(abs(x) <= 1e-12 for x in diff),
     "l004_proceeds_sum": math.fsum(f(r["l004_proceeds_sol"]) for r in L), "l004_net_sum": math.fsum(f(r["l004_net_sol"]) for r in L),
     "mark_proceeds_sum": math.fsum(f(r["last_mark_proceeds_sol"]) for r in L), "mark_pnl_sum": math.fsum(f(r["last_mark_pnl_sol"]) for r in L), "proxy_difference": math.fsum(diff),
     "by_half": {h: {"n": sum(1 for r in L if r["half"] == h), "proxy_difference": math.fsum(f(r["last_mark_minus_l004_exit_sol"]) for r in L if r["half"] == h)} for h in ("early", "late")},
     "obstruction_kinds": dict(collections.Counter(r["obstruction_kind"] for r in L)), "baseline_reasons": dict(collections.Counter(r["baseline_reason"] for r in L)),
     "mark_strictly_before_obstruction": sum(f(r["last_mark_t"]) < f(r["obstruction_t"]) for r in L), "max_mark_age_at_obstruction_s": max(f(r["mark_age_at_obstruction_s"]) for r in L),
     "true_baseline_exit_empty": sum(r["true_baseline_exit_net_sol"] == "" for r in L), "in_peer_five": sum(r["in_peer_five"] == "True" for r in L)}
P = list(csv.DictReader(open(os.path.join(d, "peer_five_marks_001.csv")))); cols = P[0].keys() if P else []
o["peer_five"] = {"rows": len(P), "columns": list(cols)}
for c in cols:
    if "mark" in c and "pnl" in c and all(r[c] not in ("", None) for r in P):
        try: o["peer_five"][c + "_sum"] = math.fsum(f(r[c]) for r in P)
        except ValueError: pass
    if "l004" in c and "net" in c and all(r[c] not in ("", None) for r in P):
        try: o["peer_five"][c + "_sum"] = math.fsum(f(r[c]) for r in P)
        except ValueError: pass
C = list(csv.DictReader(open(os.path.join(d, "changed_pairs_001.csv")))); o["changed_pairs"] = {"rows": len(C), "columns": list(C[0].keys()) if C else [], "rows_data": C}
json.dump(o, open(outp, "w"), indent=2); print(json.dumps(o, indent=1))
