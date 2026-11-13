"""F014 / R54 bind-share pre-check for CL-L012 — COUNTS ONLY, no outcome is read (no fill, no exit, no net SOL is computed here).
For every launch of the 3,638 development denominator: retention_s = retained_at − create_ts with retained_at EXACTLY the frozen evaluator's
retention time (event-ordered, fingerprint-deduplicated rows; curve rows only; cumulative gross curve buy SOL >= 15, or the first curve row for
tier >= 1; recv_ms of that row, block time only if recv_ms is missing); eligibility E at created + 300 s (rules_common.features / eligible,
unchanged from f003); F009 cell. Reports the share of the 679 E attempts with retention_s > T (T = 60, fixed in PROTOCOL.md before this ran),
by half and by cell, the retention_s distribution of E, the tier >= 1 count, and the deduplicated received curve-row count at the retention
receipt by side (R68 caution). Also writes retention_features.csv (one row per denominator launch; no outcome column).
Usage: F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> python3 -I precheck_f014.py <replay dir> <out dir>"""
import sys, os, pathlib, json, csv, types, statistics, collections, bisect, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ev = rc.ev(); assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
START, SPLIT, END = 1793950800, 1794016200, 1794081600
T = 60.0; AGE = 300; HORIZON = 7200
tok, gaps, outages, meta = ev.load(str(replay), START, END); fl = ev.fl

def retention(info, L):
    """Exactly evaluate.run_launch's retention loop; also returns the index of the retention row in event order and the number of curve rows up to it."""
    cum = 0.0; ncurve = 0
    for i, r in enumerate(L):
        if r["venue"] not in ("curve", ""): continue
        ncurve += 1
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= ev.RETAIN_SOL:
            rv = fl(r["recv_ms"]); return (rv / 1000 if rv else fl(r["ts"])), i, ncurve, rv is None, cum
    return None, None, None, None, cum

stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; audit = collections.Counter(); feats = []
for m, L in ev.iter_mints(str(replay), tok, stats):
    info = tok[m]; ret, idx, ncurve, norecv, cum = retention(info, L)
    if ret is None: audit["not_retained"] += 1; continue
    if any(s < info["created"] + HORIZON and e > info["created"] for s, e in outages): audit["outage_excluded"] += 1; continue
    half = "early" if info["created"] < SPLIT else "late"; audit["eligible_" + half] += 1
    t = info["created"] + AGE
    RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
    k = bisect.bisect_right(RT, t); v = types.SimpleNamespace(t=t, created=info["created"], trades=ev.Prefix(RO, k))
    f = rc.features(v) if t >= ret else None
    E = bool(f is not None and rc.eligible(f))
    # received curve rows at the retention receipt (receipt order, RT <= retained_at) — the R68 activity count
    kr = bisect.bisect_right(RT, ret); recv_curve_rows_at_ret = sum(1 for r in RO[:kr] if rc.iscurve(r)); recv_rows_at_ret = kr
    rs = ret - info["created"]
    feats.append({"mint": m, "half": half, "created": info["created"], "tier": info["tier"], "retained_at": ret, "retention_s": rs, "retention_row_recv_missing": norecv,
                  "retention_event_index": idx, "curve_rows_event_order_to_retention": ncurve, "recv_rows_at_retention": recv_rows_at_ret, "recv_curve_rows_at_retention": recv_curve_rows_at_ret,
                  "cum_gross_buy_sol_at_retention": cum, "retained_by_300s": t >= ret, "eligible_E": E, "cell": (rc.cell_of(f) if E else None),
                  "buyers_last_60s": (f["buyers_last_60s"] if f else None), "L012_removed": (E and rs > T), "L012_kept": (E and rs <= T)})
assert stats["non_contiguous"] == 0
with open(out / "retention_features.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(feats[0].keys())); w.writeheader(); w.writerows(feats)
Erows = [r for r in feats if r["eligible_E"]]; assert len(Erows) == 679, len(Erows)
rem = [r for r in Erows if r["L012_removed"]]; kep = [r for r in Erows if r["L012_kept"]]
def dist(xs):
    xs = sorted(xs)
    if not xs: return {"n": 0}
    q = statistics.quantiles(xs, n=20) if len(xs) >= 20 else None
    return {"n": len(xs), "min": xs[0], "p10": (q[1] if q else None), "q1": (q[4] if q else None), "median": statistics.median(xs), "q3": (q[14] if q else None), "p90": (q[17] if q else None), "max": xs[-1], "mean": statistics.mean(xs)}
share = len(rem) / len(Erows)
res = {"protocol": "T fixed at 60 s in PROTOCOL.md (commit 934a86e) before this count", "T_s": T, "counts_only": True, "outcomes_read": False,
       "audit": dict(audit), "denominator": audit["eligible_early"] + audit["eligible_late"], "stream_stats": {k: v for k, v in stats.items() if k != "_done"},
       "E_total": len(Erows), "E_by_half": dict(collections.Counter(r["half"] for r in Erows)), "E_by_cell": dict(collections.Counter(r["cell"] for r in Erows)),
       "removed_retention_gt_T": len(rem), "removed_share_of_E": share, "kept_retention_le_T": len(kep), "testable_R54": 0.05 <= share <= 0.95,
       "removed_by_half": dict(collections.Counter(r["half"] for r in rem)), "kept_by_half": dict(collections.Counter(r["half"] for r in kep)),
       "removed_by_cell": dict(collections.Counter(r["cell"] for r in rem)), "kept_by_cell": dict(collections.Counter(r["cell"] for r in kep)),
       "E_tier_ge1": sum(1 for r in Erows if r["tier"] >= 1), "E_retention_row_recv_missing": sum(1 for r in Erows if r["retention_row_recv_missing"]),
       "E_retention_s": dist([r["retention_s"] for r in Erows]), "E_retention_s_by_half": {h: dist([r["retention_s"] for r in Erows if r["half"] == h]) for h in ("early", "late")},
       "E_retention_s_by_cell": {c: dist([r["retention_s"] for r in Erows if r["cell"] == c]) for c in ("A", "B", "C")},
       "E_retention_s_histogram": {b: sum(1 for r in Erows if lo <= r["retention_s"] < hi) for b, lo, hi in (("<=2s", -1, 2), ("2-10s", 2, 10), ("10-30s", 10, 30), ("30-60s", 30, 60), ("60-120s", 60, 120), ("120-180s", 120, 180), ("180-240s", 180, 240), ("240-300s", 240, 300.0001))},
       "R68_activity_at_retention": {side: {"recv_curve_rows_at_retention": dist([r["recv_curve_rows_at_retention"] for r in rows_]), "recv_rows_at_retention": dist([r["recv_rows_at_retention"] for r in rows_]),
                                            "cum_gross_buy_sol_at_retention": dist([r["cum_gross_buy_sol_at_retention"] for r in rows_]), "buyers_last_60s_at_300s": dist([r["buyers_last_60s"] for r in rows_])}
                                     for side, rows_ in (("kept_fast", kep), ("removed_slow", rem))},
       "denominator_retention_s": dist([r["retention_s"] for r in feats]), "denominator_retained_by_300s": sum(1 for r in feats if r["retained_by_300s"])}
json.dump(res, open(out / "precheck_f014.json", "w"), indent=1); print(json.dumps(res, indent=1))
