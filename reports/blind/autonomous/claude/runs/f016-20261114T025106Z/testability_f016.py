"""F016 / R92 testability record — COUNTS ONLY. No outcome of any launch is read: no fill, no exit, no net SOL, no price after the decision time.
For every launch of the 3,638 development denominator, rebuild eligibility E at t = created + 300 s (rules_common, unchanged from f014) and, on the
679 E launches, compute the six held-proposal statistics of PROTOCOL.md from received rows with RT <= t only; report bind shares (R54, both halves,
F009 cells), quartiles, unknown-at-decision counts, and for CL-P3 the create_ts mod 60 distribution with a chi-square against uniform and the
create_ts source check. Writes f016_features.csv (one row per E launch, no outcome column) and results.json.
Usage: F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> python3 -I testability_f016.py <replay dir> <out dir>"""
import sys, os, pathlib, json, csv, types, statistics, collections, bisect, hashlib, math, gzip, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ev = rc.ev(); assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
START, SPLIT, END = 1793950800, 1794016200, 1794081600
AGE = 300; HORIZON = 7200
# thresholds — all fixed in PROTOCOL.md (commit 323c1e6) before this script was written or run
P1_RATIO = 1.0; P2_SHARE = 0.25; P3_CV = 0.5; P3_MIN_N = 10; CLP1_S = 0.5; CLP2_RHO = -0.5; CLP2_MIN_N = 10; CLP3_BIN = {58, 59, 0, 1, 2}
tok, gaps, outages, meta = ev.load(str(replay), START, END); fl = ev.fl
RT_of = lambda r: (fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000
def px(r):
    vs, vt = fl(r["vsol"]), fl(r["vtok"])
    if not vs or not vt or vs <= 0 or vt <= 0: return None
    return (vs / 1e9) / (vt / 1e6)

def retention(info, L):
    """Exactly evaluate.run_launch's retention loop; returns (retained_at, retention row)."""
    cum = 0.0
    for r in L:
        if r["venue"] not in ("curve", ""): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= ev.RETAIN_SOL:
            rv = fl(r["recv_ms"]); return (rv / 1000 if rv else fl(r["ts"])), r
    return None, None

def spearman(xs):
    """Spearman rho of xs against their order 0..n-1, average ranks for ties; None if all equal."""
    n = len(xs); order = sorted(range(n), key=lambda i: xs[i]); ranks = [0.0] * n; i = 0
    while i < n:
        j = i
        while j + 1 < n and xs[order[j + 1]] == xs[order[i]]: j += 1
        for k in range(i, j + 1): ranks[order[k]] = (i + j) / 2 + 1
        i = j + 1
    if len(set(xs)) == 1: return None
    pos = [k + 1.0 for k in range(n)]; mr = statistics.mean(ranks); mp = statistics.mean(pos)
    cov = sum((a - mr) * (b - mp) for a, b in zip(ranks, pos)); sr = math.sqrt(sum((a - mr) ** 2 for a in ranks)); sp = math.sqrt(sum((b - mp) ** 2 for b in pos))
    return cov / (sr * sp) if sr > 0 and sp > 0 else None

# census for CL-P3 (create_ts and create_slot of all 62,789 launches; counts only)
census = []
with io.TextIOWrapper(gzip.open(os.environ["F006P2_TOKENS"]), newline="") as fh:
    for r in csv.DictReader(fh): census.append((r["mint"], int(fl(r["create_ts"])), int(fl(r["create_slot"]) or -1)))
create_slot = {m: s for m, _, s in census}

stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; audit = collections.Counter(); feats = []
src = collections.Counter(); den_created = []   # create_ts source check; denominator create_ts for the clock
for m, L in ev.iter_mints(str(replay), tok, stats):
    info = tok[m]; ret, rrow = retention(info, L)
    if ret is None: audit["not_retained"] += 1; continue
    if any(s < info["created"] + HORIZON and e > info["created"] for s, e in outages): audit["outage_excluded"] += 1; continue
    half = "early" if info["created"] < SPLIT else "late"; audit["eligible_" + half] += 1
    created = info["created"]; t = created + AGE; den_created.append(int(created))
    # create_ts source check (denominator launches; uses only slot / ts / recv_ms of rows in the creation slot — no outcome)
    cs = create_slot.get(m, -1); same = [r for r in L if int(r["slot"]) == cs]
    if same:
        bts = {int(fl(r["ts"])) for r in same}; rcv = {int(fl(r["recv_ms"]) // 1000) for r in same if fl(r["recv_ms"])}
        c = int(created); src["has_creation_slot_row"] += 1
        if c in bts: src["create_ts_equals_block_ts"] += 1
        elif c in rcv: src["create_ts_equals_recv_floor_not_block"] += 1
        else: src["create_ts_equals_neither"] += 1; src["diff_create_minus_block_%+d" % (c - min(bts))] += 1
    else: src["no_creation_slot_row"] += 1
    RO = sorted(L, key=lambda r: (RT_of(r) * 1000, int(r["slot"]), int(r["row_id"]))); RT = [RT_of(r) for r in RO]
    k = bisect.bisect_right(RT, t); v = types.SimpleNamespace(t=t, created=created, trades=ev.Prefix(RO, k))
    f = rc.features(v) if t >= ret else None
    if not (f is not None and rc.eligible(f)): continue
    cell = rc.cell_of(f); cr = rc.creator_of(m); P = RO[:k]; PT = RT[:k]; assert all(x <= t for x in PT)
    # --- 1. price drift
    p_ret = px(rrow) if (rrow is not None and ev.state_ok(rrow)) else None
    last_ok = next((r for r in reversed(P) if rc.iscurve(r) and ev.state_ok(r)), None); p_t = px(last_ok) if last_ok else None
    ratio = (p_t / p_ret) if (p_ret and p_t) else None
    # --- 2. adder share
    lo60 = bisect.bisect_right(PT, t - 60)
    # W is EXACTLY the buyers_last_60s set of rules_common.features: curve buys among rows received by t whose block ts > t - 60 (asserted equal);
    # "before" = curve buys among rows received by t whose block ts <= t - 60 (the same clock as W, so a wallet is never in both by one row)
    inwin = [r for r in P if rc.iscurve(r) and r["is_buy"] == "1" and fl(r["ts"]) > t - 60]; W = {r["wallet"] for r in inwin}; assert len(W) == f["buyers_last_60s"]
    before = {r["wallet"] for r in P if rc.iscurve(r) and r["is_buy"] == "1" and fl(r["ts"]) <= t - 60}
    adders = W & before; inwin_counts = collections.Counter(r["wallet"] for r in inwin)
    repeats_only = {w for w, c in inwin_counts.items() if c >= 2} - before
    adder_share = len(adders) / len(W)
    # --- 3. CV of inter-receipt intervals of last-60-s curve buys
    Bt = [PT[i] for i in range(lo60, k) if rc.iscurve(P[i]) and P[i]["is_buy"] == "1"]; nB = len(Bt)
    cv = None
    if nB >= P3_MIN_N:
        d = [b - a for a, b in zip(Bt, Bt[1:])]; mu = statistics.mean(d)
        cv = (statistics.pstdev(d) / mu) if mu > 0 else None
    # --- 4. sell-absorption share
    buy_sol = sum(fl(r["sol"]) or 0 for r in P[lo60:] if rc.iscurve(r) and r["is_buy"] == "1"); sell_sol = sum(fl(r["sol"]) or 0 for r in P[lo60:] if rc.iscurve(r) and r["is_buy"] != "1")
    n_sells60 = sum(1 for r in P[lo60:] if rc.iscurve(r) and r["is_buy"] != "1")
    s_abs = (sell_sol / buy_sol) if buy_sol > 0 else None
    # --- 5. escalation
    outside = [fl(r["sol"]) or 0 for r in P if rc.iscurve(r) and r["is_buy"] == "1" and r["wallet"] != cr]; n_out = len(outside)
    rho = spearman(outside[-CLP2_MIN_N:]) if n_out >= CLP2_MIN_N else None
    # --- 6. clock
    c60 = int(created) % 60
    feats.append({"mint": m, "half": half, "cell": cell, "created": created, "tier": info["tier"], "buyers_last_60s": f["buyers_last_60s"],
                  "p1_price_ratio": ratio, "p1_ret_state_ok": p_ret is not None, "p1_veto": (ratio is not None and ratio < P1_RATIO),
                  "p2_adder_share": adder_share, "p2_n_W": len(W), "p2_n_adders": len(adders), "p2_n_repeat_only": len(repeats_only), "p2_veto": adder_share < P2_SHARE,
                  "p3_n_buys60": nB, "p3_cv": cv, "p3_veto": (cv is not None and cv < P3_CV),
                  "clp1_buy_sol60": buy_sol, "clp1_sell_sol60": sell_sol, "clp1_n_sells60": n_sells60, "clp1_s": s_abs, "clp1_veto": (s_abs is not None and s_abs >= CLP1_S),
                  "clp2_n_outside_buys": n_out, "clp2_rho": rho, "clp2_veto": (rho is not None and rho <= CLP2_RHO),
                  "clp3_create_mod60": c60, "clp3_veto": c60 in CLP3_BIN})
assert stats["non_contiguous"] == 0
assert len(feats) == 679, len(feats)
assert collections.Counter(r["half"] for r in feats) == {"early": 313, "late": 366} and collections.Counter(r["cell"] for r in feats) == {"A": 251, "B": 122, "C": 306}
with open(out / "f016_features.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(feats[0].keys())); w.writeheader(); w.writerows(feats)

def dist(xs):
    xs = sorted(x for x in xs if x is not None)
    if not xs: return {"n": 0}
    q = statistics.quantiles(xs, n=20) if len(xs) >= 20 else None
    return {"n": len(xs), "min": xs[0], "p10": (q[1] if q else None), "q1": (q[4] if q else None), "median": statistics.median(xs), "q3": (q[14] if q else None), "p90": (q[17] if q else None), "max": xs[-1], "mean": statistics.mean(xs)}
def bind(key, vkey, defined):
    """Bind share on E (undefined counted as not vetoed) and on the defined subset; by half and by cell on the defined subset."""
    D = [r for r in feats if defined(r)]; V = [r for r in D if r[vkey]]
    sh_all = len(V) / 679; sh_def = (len(V) / len(D)) if D else None
    byh = {h: {"defined": sum(1 for r in D if r["half"] == h), "veto": sum(1 for r in V if r["half"] == h)} for h in ("early", "late")}
    byc = {c: {"defined": sum(1 for r in D if r["cell"] == c), "veto": sum(1 for r in V if r["cell"] == c)} for c in ("A", "B", "C")}
    for g in (byh, byc):
        for kk in g: g[kk]["share"] = (g[kk]["veto"] / g[kk]["defined"]) if g[kk]["defined"] else None
    verdict = "can bind (5-95 %)" if (sh_def is not None and 0.05 <= sh_def <= 0.95 and 0.05 <= sh_all <= 0.95) else ("NOT DEFINABLE" if not D else "unlikely to bind")
    return {"E": 679, "defined": len(D), "unknown_at_decision": 679 - len(D), "veto": len(V), "bind_share_of_E": sh_all, "bind_share_of_defined": sh_def,
            "by_half": byh, "by_cell": byc, "statistic_quartiles_E": dist([r[key] for r in D]), "R54": verdict}

res = {"protocol": "thresholds fixed in PROTOCOL.md (commit 323c1e6) before this count", "counts_only": True, "outcomes_read": False,
       "audit": dict(audit), "denominator": audit["eligible_early"] + audit["eligible_late"], "stream_stats": {k: v for k, v in stats.items() if k != "_done"},
       "E_total": 679, "E_by_half": dict(collections.Counter(r["half"] for r in feats)), "E_by_cell": dict(collections.Counter(r["cell"] for r in feats))}
res["R86_1_price_drift"] = bind("p1_price_ratio", "p1_veto", lambda r: r["p1_price_ratio"] is not None)
res["R86_1_price_drift"]["ret_row_state_not_ok"] = sum(1 for r in feats if not r["p1_ret_state_ok"])
res["R86_1_price_drift"]["ratio_histogram"] = {b: sum(1 for r in feats if r["p1_price_ratio"] is not None and lo <= r["p1_price_ratio"] < hi) for b, lo, hi in (("<0.5", 0, 0.5), ("0.5-0.8", 0.5, 0.8), ("0.8-1.0", 0.8, 1.0), ("1.0-1.25", 1.0, 1.25), ("1.25-2", 1.25, 2), ("2-5", 2, 5), (">=5", 5, 1e9))}
res["R86_2_adder_share"] = bind("p2_adder_share", "p2_veto", lambda r: True)
res["R86_2_adder_share"]["complement_share_ge_0.25"] = 1 - res["R86_2_adder_share"]["bind_share_of_E"]
res["R86_2_adder_share"]["n_adders_E"] = dist([r["p2_n_adders"] for r in feats]); res["R86_2_adder_share"]["n_repeat_only_E"] = dist([r["p2_n_repeat_only"] for r in feats])
res["R86_2_adder_share"]["E_with_zero_adders"] = sum(1 for r in feats if r["p2_n_adders"] == 0)
res["R86_3_arrival_cv"] = bind("p3_cv", "p3_veto", lambda r: r["p3_cv"] is not None)
res["R86_3_arrival_cv"]["min_n_precheck"] = {"n_buys60_quartiles_E": dist([r["p3_n_buys60"] for r in feats]), "share_E_with_n_ge_10": sum(1 for r in feats if r["p3_n_buys60"] >= P3_MIN_N) / 679,
                                            "by_half": {h: sum(1 for r in feats if r["half"] == h and r["p3_n_buys60"] >= P3_MIN_N) for h in ("early", "late")}}
res["R86_3_arrival_cv"]["cv_histogram_defined"] = {b: sum(1 for r in feats if r["p3_cv"] is not None and lo <= r["p3_cv"] < hi) for b, lo, hi in (("<0.25", 0, 0.25), ("0.25-0.5", 0.25, 0.5), ("0.5-0.75", 0.5, 0.75), ("0.75-1", 0.75, 1), ("1-1.5", 1, 1.5), ("1.5-2", 1.5, 2), (">=2", 2, 1e9))}
res["CLP1_sell_absorption"] = bind("clp1_s", "clp1_veto", lambda r: r["clp1_s"] is not None)
res["CLP1_sell_absorption"]["E_with_zero_sells_60s"] = sum(1 for r in feats if r["clp1_n_sells60"] == 0)
res["CLP1_sell_absorption"]["s_histogram"] = {b: sum(1 for r in feats if r["clp1_s"] is not None and lo <= r["clp1_s"] < hi) for b, lo, hi in (("0", 0, 1e-12), ("0-0.25", 1e-12, 0.25), ("0.25-0.5", 0.25, 0.5), ("0.5-1", 0.5, 1), ("1-2", 1, 2), (">=2", 2, 1e9))}
res["CLP2_escalation"] = bind("clp2_rho", "clp2_veto", lambda r: r["clp2_rho"] is not None)
res["CLP2_escalation"]["min_n_precheck"] = {"n_outside_buys_quartiles_E": dist([r["clp2_n_outside_buys"] for r in feats]), "share_E_with_n_ge_10": sum(1 for r in feats if r["clp2_n_outside_buys"] >= CLP2_MIN_N) / 679,
                                           "rho_undefined_all_equal": sum(1 for r in feats if r["clp2_n_outside_buys"] >= CLP2_MIN_N and r["clp2_rho"] is None)}
res["CLP2_escalation"]["rho_histogram_defined"] = {b: sum(1 for r in feats if r["clp2_rho"] is not None and lo <= r["clp2_rho"] < hi) for b, lo, hi in (("<=-0.5", -1.01, -0.5 + 1e-12), ("-0.5-0", -0.5 + 1e-12, 0), ("0-0.5", 0, 0.5), (">=0.5", 0.5, 1.01))}
# CL-P3: clock distribution over the census and over E, chi-square vs uniform (59 df), +-2 s bin vs 5/60
def clock(vals):
    n = len(vals); cnt = collections.Counter(vals); obs = [cnt.get(i, 0) for i in range(60)]; exp = n / 60
    chi = sum((o - exp) ** 2 / exp for o in obs); inbin = sum(cnt.get(i, 0) for i in CLP3_BIN)
    return {"n": n, "counts_mod60": obs, "chi2_vs_uniform_59df": chi, "chi2_99.9pct_critical_59df": 98.3, "max_bin": max(range(60), key=lambda i: obs[i]), "max_bin_count": max(obs), "min_bin_count": min(obs),
            "bin_58_2_count": inbin, "bin_58_2_share": inbin / n, "uniform_expectation": 5 / 60}
res["CLP3_clock"] = bind("clp3_create_mod60", "clp3_veto", lambda r: True)
res["CLP3_clock"]["census"] = clock([c % 60 for _, c, _ in census]); res["CLP3_clock"]["E"] = clock([r["clp3_create_mod60"] for r in feats])
res["CLP3_clock"]["denominator_3638"] = clock([c % 60 for c in den_created])
res["CLP3_clock"]["create_ts_source_check"] = dict(src)
json.dump(res, open(out / "results.json", "w"), indent=1); print(json.dumps(res, indent=1))
