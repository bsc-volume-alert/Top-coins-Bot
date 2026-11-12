"""f002 — F002 operator-persistence tables (from launch_arrays.npz + the census) and the CL-L006 Idea-lab summary (from ledger.csv).
Usage: python3 -I analyze_f002.py <census tokens_window.csv.gz> <out dir with launch_arrays.npz, launch_meta.json, ledger.csv>
Writes <out>/launches.csv, pairs.csv, results.json. Definitions exactly as PROTOCOL.md (registered before this ran)."""
import sys, os, csv, gzip, io, json, math, statistics, collections, random, bisect
import numpy as np
census_p, out = sys.argv[1], sys.argv[2]
A = np.load(os.path.join(out, "launch_arrays.npz")); M = json.load(open(os.path.join(out, "launch_meta.json")))
LM = M["launch_meta"]; P0 = M["P0"]; SPLIT = M["split"]; OUT = [tuple(x) for x in M["outages"]]
HOR = 3600; DUMP = 0.5
with io.TextIOWrapper(gzip.open(census_p), newline="") as f: census = list(csv.DictReader(f))
def fl(x):
    try: return float(x)
    except (TypeError, ValueError): return None
for r in census: r["created"] = fl(r["create_ts"]); r["slot"] = int(fl(r["create_slot"]) or 0)
census.sort(key=lambda r: (r["created"], r["slot"], r["mint"]))
by_creator = collections.defaultdict(list)
for r in census: by_creator[r["creator"]].append(r)
# ---------------------------------------------------------------- per-launch outcomes (future data allowed) and history-at-t functions
def arr(m, k): return A[m + "|" + k] if (m + "|" + k) in A.files else None
def outage_overlap(c): return any(s < c + HOR and e > c for s, e in OUT)
def peak_and_dump(ts, px, mask):
    """On valid states selected by mask (event order): peak multiple and first dump (price <= 0.5 x running max). Returns (peak_mult, peak_ts, dump_ts, n_valid)."""
    idx = np.where(mask & ~np.isnan(px))[0]
    if len(idx) == 0: return None, None, None, 0
    p = px[idx]; run = np.maximum.accumulate(p); peak = float(run[-1]) / P0; peak_ts = float(ts[idx[int(np.argmax(p))]])
    d = np.where(p <= DUMP * run)[0]
    return peak, peak_ts, (float(ts[idx[d[0]]]) if len(d) else None), int(len(idx))
launches = {}
for r in census:
    m = r["mint"]; meta = LM.get(m); c = r["created"]
    L = {"mint": m, "creator": r["creator"], "created": c, "half": "early" if c < SPLIT else "late", "name": r["name"].strip().casefold(), "symbol": r["symbol"].strip().casefold(),
         "tier": r["tier"], "dev_buy_sol": fl(r["dev_buy_sol"]), "rows": meta["rows"] if meta else 0, "retained_at": meta["retained_at"] if meta else None}
    L["retained_ever"] = L["retained_at"] is not None
    L["outage_1h"] = outage_overlap(c)
    if L["retained_ever"] and not L["outage_1h"]:
        ts, px = arr(m, "ts"), arr(m, "px"); mask = ts <= c + HOR
        pk, pkts, dts, nv = peak_and_dump(ts, px, mask)
        L["peak_mult_1h"] = pk; L["peak_ts_1h"] = pkts; L["n_valid_1h"] = nv
        pk2, _, dts_all, _ = peak_and_dump(ts, px, np.ones(len(ts), bool))
        L["dump_s"] = (dts_all - c) if dts_all is not None else None
        L["observed_span_s"] = float(ts[-1] - c) if len(ts) else 0.0
        L["outcome_known"] = nv > 0
    else: L["peak_mult_1h"] = None; L["dump_s"] = None; L["outcome_known"] = False; L["observed_span_s"] = None
    launches[m] = L
def history(m, t2):
    """Knowable history of launch m at time t2: rows with receipt <= t2 only."""
    L = launches[m]; h = {"gap_s": t2 - L["created"]}
    ra = L["retained_at"]; h["hist_retained"] = "yes" if (ra is not None and ra <= t2) else "no"
    if h["hist_retained"] == "no": h.update(hist_peak_mult=None, hist_peak_bin="unknown", hist_dump_s=None, hist_dump_bin="unknown", hist_creator_sold="unknown", hist_span_s=None); return h
    ts, rt, px, cs = arr(m, "ts"), arr(m, "rt"), arr(m, "px"), arr(m, "csell"); mask = rt <= t2
    pk, pkts, dts, nv = peak_and_dump(ts, px, mask)
    h["hist_peak_mult"] = pk; h["hist_peak_bin"] = "unknown" if pk is None else ("<1.5x" if pk < 1.5 else ("1.5-3x" if pk < 3 else ">=3x"))
    h["hist_dump_s"] = (dts - L["created"]) if dts is not None else None
    span = float(min(t2, rt[mask].max()) - L["created"]) if mask.any() else 0.0; h["hist_span_s"] = span
    if pk is None: h["hist_dump_bin"] = "unknown"
    elif dts is None: h["hist_dump_bin"] = "not dumped by t2"
    else: d = h["hist_dump_s"]; h["hist_dump_bin"] = "<=120s" if d <= 120 else ("120-600s" if d <= 600 else ">600s")
    h["hist_creator_sold"] = "yes" if bool((cs & mask).any()) else "no"
    return h
def gap_bin(g): return "<=10min" if g <= 600 else ("10-60min" if g <= 3600 else ("1-6h" if g <= 21600 else ">6h"))
def prior_bin(k): return "1" if k == 1 else ("2-4" if k <= 4 else ("5-19" if k <= 19 else ">=20"))
# ---------------------------------------------------------------- pairs
pairs = []
for cr, ls in by_creator.items():
    if len(ls) < 2: continue
    n_ret_so_far = 0
    for k in range(1, len(ls)):
        prev, cur = ls[k - 1], ls[k]; t2 = cur["created"]
        # prior retained count as of t2: launches before k whose retention receipt <= t2
        n_prior_ret = sum(1 for j in range(k) if launches[ls[j]["mint"]]["retained_at"] is not None and launches[ls[j]["mint"]]["retained_at"] <= t2)
        h = history(prev["mint"], t2); o = launches[cur["mint"]]
        pairs.append({"creator": cr, "k": k, "prev_mint": prev["mint"], "mint": cur["mint"], "primary": k == 1, "n_prior": k, "n_prior_bin": prior_bin(k), "n_prior_retained_by_t2": n_prior_ret,
                      "half": o["half"], "gap_bin": gap_bin(h["gap_s"]), **h, "o_retained": o["retained_ever"], "o_peak_mult_1h": o["peak_mult_1h"], "o_dump_s": o["dump_s"], "o_outcome_known": o["outcome_known"], "o_outage_1h": o["outage_1h"]})
# ---------------------------------------------------------------- statistics
def wilson(k, n, z=1.959964):
    if n == 0: return None
    p = k / n; d = 1 + z * z / n; c = (p + z * z / (2 * n)) / d; hw = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(c - hw, 4), round(c + hw, 4)]
def med(xs): xs = [x for x in xs if x is not None]; return (statistics.median(xs) if xs else None)
def outcome_block(rows):
    """rows: list of dicts with o_retained, o_peak_mult_1h, o_dump_s, o_outcome_known."""
    n = len(rows); ret = sum(1 for r in rows if r["o_retained"]); known = [r for r in rows if r["o_outcome_known"]]
    pk = [r["o_peak_mult_1h"] for r in known]; dumps = [r["o_dump_s"] for r in known]
    b = {"n": n, "retained": ret, "retained_rate": (ret / n) if n else None, "retained_ci95": wilson(ret, n),
         "outcome_known": len(known), "outcome_unknown_among_retained": ret - len(known),
         "peak_median": med(pk), "peak_ge2_share": (sum(1 for x in pk if x >= 2) / len(pk)) if pk else None, "peak_ge2_ci95": wilson(sum(1 for x in pk if x >= 2), len(pk)),
         "peak_ge3_share": (sum(1 for x in pk if x >= 3) / len(pk)) if pk else None,
         "dump_le120_share": (sum(1 for d in dumps if d is not None and d <= 120) / len(dumps)) if dumps else None, "dump_le120_ci95": wilson(sum(1 for d in dumps if d is not None and d <= 120), len(dumps)),
         "dump_le600_share": (sum(1 for d in dumps if d is not None and d <= 600) / len(dumps)) if dumps else None,
         "dump_le3600_share": (sum(1 for d in dumps if d is not None and d <= 3600) / len(dumps)) if dumps else None,
         "no_dump_observed": sum(1 for d in dumps if d is None), "no_dump_observed_median_span_s": med([r["observed_span_s"] if "observed_span_s" in r else None for r in known if r["o_dump_s"] is None])}
    return b
def launch_rows(ls): return [{"o_retained": L["retained_ever"], "o_peak_mult_1h": L["peak_mult_1h"], "o_dump_s": L["dump_s"], "o_outcome_known": L["outcome_known"], "observed_span_s": L["observed_span_s"], "half": L["half"]} for L in ls]
for p in pairs: p["observed_span_s"] = launches[p["mint"]]["observed_span_s"]
firsts = [launches[ls[0]["mint"]] for ls in by_creator.values()]; singles = [launches[ls[0]["mint"]] for ls in by_creator.values() if len(ls) == 1]; first_multi = [launches[ls[0]["mint"]] for ls in by_creator.values() if len(ls) >= 2]
def by_bins(rows, key, bins):
    return {b: outcome_block([r for r in rows if r[key] == b]) for b in bins}
def table(rows):
    T = {"all": outcome_block(rows),
         "by_hist_retained": by_bins(rows, "hist_retained", ["yes", "no"]),
         "by_hist_peak_bin": by_bins(rows, "hist_peak_bin", ["unknown", "<1.5x", "1.5-3x", ">=3x"]),
         "by_hist_dump_bin": by_bins(rows, "hist_dump_bin", ["unknown", "<=120s", "120-600s", ">600s", "not dumped by t2"]),
         "by_hist_creator_sold": by_bins(rows, "hist_creator_sold", ["unknown", "yes", "no"]),
         "by_gap_bin": by_bins(rows, "gap_bin", ["<=10min", "10-60min", "1-6h", ">6h"])}
    both = [r for r in rows if r["hist_peak_mult"] is not None and r["o_outcome_known"]]
    if len(both) >= 10:
        x = [r["hist_peak_mult"] for r in both]; y = [r["o_peak_mult_1h"] for r in both]
        def spearman(x, y):
            rx = _rank(x); ry = _rank(y); mx, my = statistics.mean(rx), statistics.mean(ry)
            num = sum((a - mx) * (b - my) for a, b in zip(rx, ry)); den = math.sqrt(sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry))
            return num / den if den else None
        rho = spearman(x, y); rnd = random.Random(20261112); bs = []
        for _ in range(2000):
            idx = [rnd.randrange(len(both)) for _ in both]; bs.append(spearman([x[i] for i in idx], [y[i] for i in idx]))
        bs = sorted(v for v in bs if v is not None)
        T["spearman_hist_peak_vs_o_peak"] = {"n": len(both), "rho": rho, "bootstrap_95": [bs[int(0.025 * len(bs))], bs[int(0.975 * len(bs))]] if bs else None}
    return T
def _rank(v):
    order = sorted(range(len(v)), key=lambda i: v[i]); ranks = [0.0] * len(v); i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and v[order[j + 1]] == v[order[i]]: j += 1
        for q in range(i, j + 1): ranks[order[q]] = (i + j) / 2 + 1
        i = j + 1
    return ranks
prim = [p for p in pairs if p["primary"]]
R = {"denominators": {"census_launches": len(census), "creators": len(by_creator), "creators_ge2": sum(1 for ls in by_creator.values() if len(ls) >= 2), "launches_of_creators_ge2": sum(len(ls) for ls in by_creator.values() if len(ls) >= 2),
                      "primary_pairs": len(prim), "all_consecutive_pairs": len(pairs), "retained_launches": sum(1 for L in launches.values() if L["retained_ever"]), "outage_1h_launches": sum(1 for L in launches.values() if L["outage_1h"]),
                      "max_launches_one_creator": max(len(ls) for ls in by_creator.values())},
     "baseline_first_in_window": {"all_firsts": outcome_block(launch_rows(firsts)), "single_launch_creators": outcome_block(launch_rows(singles)), "first_of_multi": outcome_block(launch_rows(first_multi)),
                                  "by_half": {h: {"single": outcome_block([r for r in launch_rows(singles) if r["half"] == h]), "first_of_multi": outcome_block([r for r in launch_rows(first_multi) if r["half"] == h])} for h in ("early", "late")}},
     "primary_first_to_second": table(prim), "primary_by_half": {h: table([p for p in prim if p["half"] == h]) for h in ("early", "late")},
     "all_consecutive": table(pairs),
     "all_consecutive_by_prior_count_x_prev_retained": {b: {hr: outcome_block([p for p in pairs if p["n_prior_bin"] == b and p["hist_retained"] == hr]) for hr in ("yes", "no")} for b in ("1", "2-4", "5-19", ">=20")},
     "all_consecutive_by_prior_retained_count": {b: outcome_block([p for p in pairs if (("0" if p["n_prior_retained_by_t2"] == 0 else ("1" if p["n_prior_retained_by_t2"] == 1 else ">=2")) == b)]) for b in ("0", "1", ">=2")},
     "history_unknown_reasons_primary": dict(collections.Counter(("not retained by t2" if p["hist_retained"] == "no" else ("retained, no valid state by t2" if p["hist_peak_bin"] == "unknown" else "known")) for p in prim)),
     "primary_hist_span_s_median_when_retained": med([p["hist_span_s"] for p in prim if p["hist_retained"] == "yes"]),
     "primary_gap_s_median": med([p["gap_s"] for p in prim])}
# declared side count: name / symbol reuse (knowable at creation; earlier in-window launch with the same trimmed, case-folded name or symbol)
seen_name, seen_sym = set(), set(); reuse_rows = {"reused": [], "new": []}
for r in census:
    L = launches[r["mint"]]; reused = L["name"] in seen_name or L["symbol"] in seen_sym
    reuse_rows["reused" if reused else "new"].append(L); seen_name.add(L["name"]); seen_sym.add(L["symbol"])
R["side_count_name_or_symbol_reuse"] = {k: outcome_block(launch_rows(v)) for k, v in reuse_rows.items()}
R["side_count_name_or_symbol_reuse"]["by_half"] = {h: {k: outcome_block([x for x in launch_rows(v) if x["half"] == h]) for k, v in reuse_rows.items()} for h in ("early", "late")}
# ---------------------------------------------------------------- Idea lab CL-L006 summary from ledger.csv (same functions as f010)
SIZE = 0.2; STALE = 30
led = list(csv.DictReader(open(os.path.join(out, "ledger.csv"))))
for r in led:
    for k in ("net_sol", "ret", "fill_state_age_s", "exit_state_age_s", "hold_s", "entry_t", "created", "trigger_t", "t_sell"): r[k] = fl(r[k])
    r["slots_last_60s"] = fl(r["slots_last_60s"])
def block(rs):
    if not rs: return {"n": 0}
    v = sorted(r["net_sol"] for r in rs); rets = [r["ret"] for r in rs]
    return {"n": len(rs), "total_sol": math.fsum(v), "mean_ret": statistics.mean(rets), "median_ret": statistics.median(rets), "win_rate": sum(x > 0 for x in v) / len(v),
            "share_loss_gt50": sum(x < -0.5 * SIZE for x in v) / len(v), "without_best1_sol": math.fsum(v[:-1]), "without_best3_sol": math.fsum(v[:-3]), "best3_sol": v[-3:], "worst_sol": v[0],
            "median_hold_s": statistics.median([r["hold_s"] for r in rs if r["hold_s"] is not None]), "fill_state_age_median_s": statistics.median([r["fill_state_age_s"] for r in rs])}
def resolved_set(rr):
    att = [r for r in rr if r["cat"] != "abstain"]; filled = [r for r in att if r["cat"] == "scored" or (r["cat"] == "unknown" and r["why"].startswith("exit"))]
    unav = [r for r in att if r["cat"] == "unknown" and r["why"].startswith("fill")]
    stale_fill = [r for r in filled if (r["fill_state_age_s"] or 0) > STALE]
    resolved = [r for r in filled if r["cat"] == "scored" and r not in stale_fill]; uncertain = [r for r in filled if r["cat"] == "unknown" and r not in stale_fill]
    stale_exit = [r for r in resolved if (r["exit_state_age_s"] or 0) > STALE]; res2 = [r for r in resolved if r not in stale_exit]
    return att, filled, unav, stale_fill, uncertain, stale_exit, res2
def summ(rr):
    att, filled, unav, stale_fill, uncertain, stale_exit, res2 = resolved_set(rr)
    return {"attempted": len(att), "filled": len(filled), "unavailable_fill": len(unav), "stale_fill_gt30s_marked_unavailable": len(stale_fill), "uncertain_exit": len(uncertain), "stale_exit_gt30s_marked_uncertain": len(stale_exit),
            "unknown_share_of_attempts": (len(att) - len(res2)) / len(att) if att else None, "resolved_raw_evaluator": block([r for r in filled if r["cat"] == "scored"]),
            "resolved_after_staleness": block(res2), "by_half": {h: block([r for r in res2 if r["half"] == h]) for h in ("early", "late")}, "by_cell": {c: block([r for r in res2 if r["cell"] == c]) for c in ("A", "B", "C")},
            "attempted_by_half": dict(collections.Counter(r["half"] for r in att)), "resolved_mints": sorted(r["mint"] for r in res2)}
ctrl_rows = [r for r in led if r["spec"] == "control"]; cand_rows = [r for r in led if r["spec"] == "l006slots"]
S = {"control": summ(ctrl_rows), "l006slots": summ(cand_rows), "complement_lt8slots": summ([r for r in ctrl_rows if r["eligible_E"] == "True" and r["candidate_slots8"] == "False"])}
cres = set(S["control"]["resolved_mints"]); kres = set(S["l006slots"]["resolved_mints"])
S["paired_R11"] = {"n_pairs": len(cres & kres), "identical_trades": all(abs(next(r["net_sol"] for r in cand_rows if r["mint"] == m) - next(r["net_sol"] for r in ctrl_rows if r["mint"] == m)) < 1e-12 for m in (cres & kres)),
                   "resolved_only_in_candidate": len(kres - cres), "resolved_only_in_control": len(cres - kres), "note": "entry sub-selection with the same exit: paired difference is zero by construction; compare candidate vs complement"}
for name in list(S):
    if "resolved_mints" in S[name]: S[name]["n_resolved_mints"] = len(S[name].pop("resolved_mints"))
E_ctrl = [r for r in ctrl_rows if r["eligible_E"] == "True"]; sl = sorted(r["slots_last_60s"] for r in E_ctrl)
S["diagnostic_slots_over_E"] = {"n": len(sl), "min": sl[0], "q1": sl[len(sl) // 4], "median": sl[len(sl) // 2], "q3": sl[3 * len(sl) // 4], "max": sl[-1], "ge8": sum(1 for x in sl if x >= 8)}
def boot(vals, n=10000, seed=20261112):
    if not vals: return None
    rnd = random.Random(seed); k = len(vals); tots = sorted(math.fsum(rnd.choice(vals) for _ in range(k)) for _ in range(n)); return [tots[int(0.025 * n)], tots[int(0.975 * n)]]
_, _, _, _, _, _, kr = resolved_set(cand_rows); _, _, _, _, _, _, compr = resolved_set([r for r in ctrl_rows if r["eligible_E"] == "True" and r["candidate_slots8"] == "False"])
S["bootstrap_95_total_sol"] = {"l006slots": boot([r["net_sol"] for r in kr]), "complement_lt8slots": boot([r["net_sol"] for r in compr])}
R["idea_lab_cl_l006"] = S; R["audit"] = M["audit"]; R["stream_stats"] = M["stream_stats"]
json.dump(R, open(os.path.join(out, "results.json"), "w"), indent=1)
lk = ["mint", "creator", "created", "half", "tier", "dev_buy_sol", "rows", "retained_at", "retained_ever", "outage_1h", "outcome_known", "peak_mult_1h", "peak_ts_1h", "n_valid_1h", "dump_s", "observed_span_s"]
with open(os.path.join(out, "launches.csv"), "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=lk, extrasaction="ignore"); w.writeheader(); w.writerows(launches[r["mint"]] for r in census)
pk_ = ["creator", "k", "prev_mint", "mint", "primary", "n_prior", "n_prior_bin", "n_prior_retained_by_t2", "half", "gap_s", "gap_bin", "hist_retained", "hist_peak_mult", "hist_peak_bin", "hist_dump_s", "hist_dump_bin", "hist_span_s", "hist_creator_sold",
       "o_retained", "o_peak_mult_1h", "o_dump_s", "o_outcome_known", "o_outage_1h", "observed_span_s"]
with open(os.path.join(out, "pairs.csv"), "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=pk_, extrasaction="ignore"); w.writeheader(); w.writerows(pairs)
print(json.dumps({k: R[k] for k in ("denominators", "history_unknown_reasons_primary", "primary_gap_s_median")}, indent=1))
print(json.dumps(R["idea_lab_cl_l006"], indent=1))
