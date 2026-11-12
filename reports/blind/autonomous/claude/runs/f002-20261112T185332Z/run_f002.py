"""f002 — single streaming pass over the allowlisted entry-all export (frozen eval-1.1 iter_mints / run_launch imported unchanged):
(1) per-launch compact arrays for the F002 operator-persistence analysis (event time, receipt time, valid-state price, creator sell flag,
    retention receipt) saved to <out>/launch_arrays.npz (work file, not committed; analyze_f002.py derives the committed tables from it);
(2) Idea lab CL-L006: control (eligibility E) and candidate (E and >= 8 distinct slots in the last-60-s buys) through run_launch under the
    R4 scenario (0.2 SOL, +1 s buy, +0.7 s sell, curve 125 / pool 55 bps, 0.0015 SOL fixed, 30 % trail, 2 h; staleness post-check 30 s),
    exactly as f006p2/f009/f010 did (this is f010's run_f002 loop with the two added exits removed and the slot count added).
Usage: F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> python3 -I run_f002.py <replay dir> <out dir>"""
import sys, os, pathlib, json, csv, types, collections, bisect, hashlib
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ev = rc.ev(); assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
assert not ev.DEV_NO_EVIDENCE
START, SPLIT, END = 1793950800, 1794016200, 1794081600
POOL_BPS = 55; SIZE = 0.2; AGE = 300
tok, gaps, outages, meta = ev.load(str(replay), START, END); fl = ev.fl
SPECS = {"control": rc.eligible, "l006slots": rc.candidate}

def retained(info, L):
    cum = 0.0
    for r in L:
        if not rc.iscurve(r): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= 15:
            rv = fl(r["recv_ms"]); return rv / 1000 if rv else fl(r["ts"])
    return None

def run(m, info, L, ret, enter):
    mod = types.SimpleNamespace(decide=lambda v: enter and v.t == info["created"] + AGE, exit_signal=rc.exit_signal)
    R = {"decision_offsets": [AGE], "on_trade": False, "horizon_s": 7200, "sizes": [SIZE]}
    res, hyp = ev.run_launch(mod, R, m, info, L, gaps, outages, meta, POOL_BPS)
    rec = {"cat": res["cat"], "why": res.get("why"), "entry_t": res.get("entry_t"), "hypothetical": hyp}
    if res.get("entry_t") is not None:
        te = res["entry_t"]; fs, fw = ev.state_at(L, te + ev.LAND_BUY_S, gaps, outages, info["created"], ret)
        rec["fill_state_age_s"] = (te + ev.LAND_BUY_S - fl(fs["ts"])) if fs else None; rec["entry_age_s"] = te - info["created"]
    if res["cat"] == "scored":
        s = res["sizes"][str(SIZE)]; rec.update(net_sol=s["net_sol"], ret=s["ret"], exit=s["exit"], fill_venue=s["fill_venue"], exit_venue=s["exit_venue"])
        if s["exit"] == "horizon": ts_ = te + 7200
        else:  # re-derive the trigger time exactly as run_launch does (same p object, same exit function)
            RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
            tokq = ev.buy(fs, SIZE, POOL_BPS); hi = -1e9; ts_ = None
            for j in range(bisect.bisect_right(RT, te + ev.LAND_BUY_S), len(RO)):
                r = RO[j]; tr = RT[j]
                if tr >= te + 7200: break
                if not ev.state_ok(r): continue
                p = types.SimpleNamespace(t=tr, size=SIZE, entry_t=te, fill_t=te + ev.LAND_BUY_S)
                p.x = (ev.sell(r, tokq, POOL_BPS) - ev.FIXED_FEE_SOL) / SIZE; hi = max(hi, p.x); p.hi = hi; p.seconds_held = tr - te
                if rc.exit_signal(p): ts_ = tr + ev.LAND_SELL_S; rec["trigger_t"] = tr; break
            assert ts_ is not None
        ss, sw = ev.state_at(L, ts_, gaps, outages, info["created"], ret)
        rec["exit_state_age_s"] = (ts_ - fl(ss["ts"])) if ss else None; rec["t_sell"] = ts_; rec["hold_s"] = ts_ - te
    return rec

P0 = 30.0 / 1.073e9   # initial virtual curve price, SOL per token
stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; audit = collections.Counter(); rows = []; feats = []
arrays = {}; launch_meta = {}
for m, L in ev.iter_mints(str(replay), tok, stats):
    info = tok[m]; ret = retained(info, L); cr = rc.creator_of(m)
    # ---- (1) F002 compact arrays: every deduplicated row, event order, with receipt time as the evaluator defines it
    n = len(L); ts = np.empty(n); rt = np.empty(n); px = np.full(n, np.nan); isbuy = np.zeros(n, bool); csell = np.zeros(n, bool); sol = np.zeros(n)
    for i, r in enumerate(L):
        ts[i] = fl(r["ts"]); rv = fl(r["recv_ms"]); rt[i] = (rv / 1000) if rv else ts[i]
        isbuy[i] = r["is_buy"] == "1"; sol[i] = fl(r["sol"]) or 0.0
        if ev.state_ok(r): px[i] = (fl(r["vsol"]) / 1e9) / (fl(r["vtok"]) / 1e6)
        if r["wallet"] == cr and r["is_buy"] != "1" and (fl(r["tokens"]) or 0) > 0: csell[i] = True
    arrays[m + "|ts"] = ts; arrays[m + "|rt"] = rt; arrays[m + "|px"] = px; arrays[m + "|isbuy"] = isbuy; arrays[m + "|csell"] = csell; arrays[m + "|sol"] = sol
    launch_meta[m] = {"created": info["created"], "retained_at": ret, "rows": n}
    audit["streamed"] += 1
    # ---- (2) Idea lab CL-L006 on the usual denominator (retained; 2-h window clear of the six outages)
    if ret is None: audit["not_retained"] += 1; continue
    if any(s < info["created"] + 7200 and e > info["created"] for s, e in outages): audit["outage_excluded"] += 1; continue
    half = "early" if info["created"] < SPLIT else "late"; audit["eligible_" + half] += 1
    t = info["created"] + AGE
    RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
    k = bisect.bisect_right(RT, t); v = types.SimpleNamespace(t=t, created=info["created"], trades=ev.Prefix(RO, k))
    f = rc.features(v) if t >= ret else None
    E = bool(f is not None and rc.eligible(f)); C = bool(f is not None and rc.candidate(f))
    frow = {"mint": m, "half": half, "created": info["created"], "retained_at": ret, "retained_by_t": t >= ret, "eligible_E": E, "candidate_slots8": C}
    if f: frow.update({kk: f[kk] for kk in f}); frow["cell"] = rc.cell_of(f)
    feats.append(frow)
    for name, cond in SPECS.items():
        enter = E if name == "control" else C
        rec = run(m, info, L, ret, enter); rec.update(spec=name, mint=m, half=half, created=info["created"], eligible_E=E, candidate_slots8=C, cell=(frow.get("cell") if E else None), slots_last_60s=(f["slots_last_60s"] if f else None)); rows.append(rec)
    ne = audit["eligible_early"] + audit["eligible_late"]
    if ne % 500 == 0: print("ELIGIBLE", ne, dict(audit), flush=True)
assert stats["non_contiguous"] == 0
np.savez_compressed(out / "launch_arrays.npz", **arrays)
json.dump({"launch_meta": launch_meta, "audit": dict(audit), "stream_stats": {k: v for k, v in stats.items() if k != "_done"}, "P0": P0, "split": SPLIT, "outages": outages,
           "gaps_main": gaps["main"], "gaps_pool": gaps["pool"]}, open(out / "launch_meta.json", "w"))
keys = ["spec", "mint", "half", "cell", "created", "eligible_E", "candidate_slots8", "slots_last_60s", "cat", "why", "entry_t", "entry_age_s", "fill_state_age_s", "trigger_t", "t_sell", "hold_s", "exit_state_age_s", "net_sol", "ret", "exit", "fill_venue", "exit_venue", "hypothetical"]
with open(out / "ledger.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=keys, extrasaction="ignore"); w.writeheader(); w.writerows(rows)
fk = sorted(set(kk for r in feats for kk in r))
with open(out / "features_at_300s.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=fk); w.writeheader(); w.writerows(feats)
print("DONE", dict(audit), {k: v for k, v in stats.items() if k != "_done"}, flush=True)
