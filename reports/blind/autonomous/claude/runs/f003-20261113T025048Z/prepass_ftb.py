"""CL-L008 first-time-buyer share — pre-pass (COUNTS ONLY, no outcome read). Two things:
 (1) a cross-mint wallet map over the whole allowlisted window: for every wallet, the receipt time of its first received curve buy on each of its
     first two distinct mints (enough to answer "did this wallet buy ANY OTHER mint before time t?" without storing full histories);
 (2) for the 679 eligibility-E launches (flags from f011 features_at_300s.csv.gz, env F003_E_FEATURES), at t = created + 300 s, over the
     distinct wallets with a received curve buy with ts > t - 60 and receipt <= t (exactly rc.features' buyers_last_60s set):
     ftb_share = share of those wallets with NO received curve buy on another mint with receipt < t  ("first-time buyers in the window").
     Knowable at t: only rows with receipt <= t on this mint and receipt < t on other mints are used.
Limitation stated in advance: history before 6 Nov 07:40 UTC is invisible, so "first-time" means "first time within the window"; wallets that
bought other coins only on venues/mints outside the export look first-time.
Usage: F006P2_EVAL=... F006P2_TOKENS=... F003_E_FEATURES=... python3 -I prepass_ftb.py <replay dir> <out dir>  -> wallet_map.pkl, ftb_precheck.json"""
import sys, os, pathlib, csv, gzip, io, json, bisect, pickle, collections, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
ev = rc.ev(); fl = ev.fl
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
START, SPLIT, END = 1793950800, 1794016200, 1794081600
tok, gaps, outages, meta = ev.load(str(replay), START, END)
with io.TextIOWrapper(gzip.open(os.environ["F003_E_FEATURES"]), newline="") as f: E = {r["mint"]: r for r in csv.DictReader(f) if r["eligible_E"] == "True"}
assert len(E) == 679
# pass over every window mint: wallet -> [(mint1, first_recv1), (mint2, first_recv2)] (two earliest distinct mints by first-buy receipt)
wm = {}; per_mint_first = {}
stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}
E_rows = {}
for m, L in ev.iter_mints(str(replay), tok, stats):
    first = {}
    for r in L:
        if r["is_buy"] == "1" and rc.iscurve(r):
            rv = fl(r["recv_ms"]); tr = rv / 1000 if rv else fl(r["ts"]); w = r["wallet"]
            if w not in first or tr < first[w]: first[w] = tr
    for w, tr in first.items():
        lst = wm.setdefault(w, [])
        lst.append((m, tr)); lst.sort(key=lambda x: x[1])
        if len(lst) > 2: del lst[2:]
    if m in E: E_rows[m] = L
    if stats["mints_streamed"] % 10000 == 0: print("streamed", stats["mints_streamed"], "wallets", len(wm), flush=True)
assert stats["non_contiguous"] == 0
print("wallets", len(wm), "mints", stats["mints_streamed"], flush=True)
pickle.dump(wm, open(out / "wallet_map.pkl", "wb"))
def bought_other_before(w, m, t):
    for mm, tr in wm.get(w, []):
        if mm != m and tr < t: return True
    return False
rows = []
for m, L in E_rows.items():
    created = tok[m]["created"]; t = created + 300
    RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
    k = bisect.bisect_right(RT, t); buyers = {}; sol = collections.defaultdict(float)
    for r in RO[:k]:
        if r["is_buy"] == "1" and rc.iscurve(r) and fl(r["ts"]) > t - 60:
            buyers[r["wallet"]] = True; sol[r["wallet"]] += fl(r["sol"]) or 0.0
    assert len(buyers) == int(E[m]["buyers_last_60s"]), (m, len(buyers), E[m]["buyers_last_60s"])
    ft = [w for w in buyers if not bought_other_before(w, m, t)]
    rows.append({"mint": m, "half": E[m]["half"], "cell": E[m]["cell"], "buyers_last_60s": len(buyers), "first_time_buyers_60s": len(ft), "ftb_share": len(ft) / len(buyers),
                 "ftb_sol_share": (sum(sol[w] for w in ft) / sum(sol.values())) if sum(sol.values()) > 0 else None})
with open(out / "ftb_features.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
sh = sorted(r["ftb_share"] for r in rows)
q = statistics.quantiles(sh, n=10)
pre = {"E_total": len(rows), "ftb_share_min": sh[0], "ftb_share_deciles": q, "ftb_share_max": sh[-1], "ftb_share_mean": statistics.mean(sh),
       "registered_threshold_0.5": {"kept_ge": sum(1 for x in sh if x >= 0.5), "removed_lt": sum(1 for x in sh if x < 0.5), "removed_share": sum(1 for x in sh if x < 0.5) / len(sh)},
       "by_half_kept_ge_0.5": dict(collections.Counter(r["half"] for r in rows if r["ftb_share"] >= 0.5)), "by_cell_kept_ge_0.5": dict(collections.Counter(r["cell"] for r in rows if r["ftb_share"] >= 0.5)),
       "median_ftb_share": statistics.median(sh), "wallets_in_map": len(wm), "stream_stats": {k: v for k, v in stats.items() if k != "_done"}}
json.dump(pre, open(out / "ftb_precheck.json", "w"), indent=1); print(json.dumps(pre, indent=1))
