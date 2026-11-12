"""CL-L003 launch-crowding test under the owner common scenario R4 (frozen eval-1.1 run_launch unchanged, pool 55 bps).
Pass 1: retention time of every launch in tokens_window (knowable). Pass 2: for every launch in the 3,638 denominator, eligibility E at
300 s (as f006p2 rules_common), crowd10, and the R4 paper trade for control (E) — the candidate/complement are fixed subsets of the same trades.
Usage: F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> python3 -I run_l003.py <replay dir> <out dir>"""
import sys, os, pathlib, json, csv, types, math, statistics, collections, bisect, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ev = rc.ev(); assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
assert not ev.DEV_NO_EVIDENCE
START, SPLIT, END = 1793950800, 1794016200, 1794081600
POOL_BPS = 55; SIZE = 0.2; TRAIL = 0.30; STALE = 30; AGE = 300; CROWD_WIN = 600; CROWD_MAX = 10
tok, gaps, outages, meta = ev.load(str(replay), START, END); fl = ev.fl

def retained(info, L):
    cum = 0.0
    for r in L:
        if not rc.iscurve(r): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= 15:
            rv = fl(r["recv_ms"]); return rv / 1000 if rv else fl(r["ts"])
    return None

# pass 1: retention times of every launch (knowable at its own retention receipt)
stats1 = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; RET = {}
for m, L in ev.iter_mints(str(replay), tok, stats1):
    r = retained(tok[m], L)
    if r is not None: RET[m] = r
ret_times = sorted(RET.values()); print("PASS1 retained launches", len(RET), "of", len(tok), flush=True)
def crowd(m, t):
    n = bisect.bisect_right(ret_times, t) - bisect.bisect_right(ret_times, t - CROWD_WIN)
    own = RET.get(m); return n - (1 if own is not None and t - CROWD_WIN < own <= t else 0)

def run(m, info, L, ret, enter):
    mod = types.SimpleNamespace(decide=lambda v: enter and v.t == info["created"] + AGE, exit_signal=rc.exit_signal)
    R = {"decision_offsets": [AGE], "on_trade": False, "horizon_s": 7200, "sizes": [SIZE]}
    res, hyp = ev.run_launch(mod, R, m, info, L, gaps, outages, meta, POOL_BPS)
    rec = {"cat": res["cat"], "why": res.get("why"), "entry_t": res.get("entry_t"), "hypothetical": hyp}
    if res.get("entry_t") is not None:
        te = res["entry_t"]; fs, fw = ev.state_at(L, te + ev.LAND_BUY_S, gaps, outages, info["created"], ret)
        rec["fill_state_age_s"] = (te + ev.LAND_BUY_S - fl(fs["ts"])) if fs else None
    if res["cat"] == "scored":
        s = res["sizes"][str(SIZE)]; rec.update(net_sol=s["net_sol"], ret=s["ret"], exit=s["exit"], fill_venue=s["fill_venue"], exit_venue=s["exit_venue"])
        if s["exit"] == "horizon": ts_ = te + 7200
        else:  # re-derive the trigger time exactly as run_launch does (identical to f006p2 run_s2.py)
            RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
            tokq = ev.buy(fs, SIZE, POOL_BPS); hi = -1e9; ts_ = None
            for j in range(bisect.bisect_right(RT, te + ev.LAND_BUY_S), len(RO)):
                r = RO[j]; tr = RT[j]
                if tr >= te + 7200: break
                if not ev.state_ok(r): continue
                x = (ev.sell(r, tokq, POOL_BPS) - ev.FIXED_FEE_SOL) / SIZE; hi = max(hi, x)
                if hi > 0 and x <= hi * (1 - TRAIL): ts_ = tr + ev.LAND_SELL_S; break
        ss, sw = ev.state_at(L, ts_, gaps, outages, info["created"], ret) if ts_ else (None, "n/a")
        rec["exit_state_age_s"] = (ts_ - fl(ss["ts"])) if ss else None
        # R4 staleness post-check (as f006p2 S2 / CL-L001): landing state older than 30 s => fill unavailable / exit uncertain
        if rec["fill_state_age_s"] is None or rec["fill_state_age_s"] > STALE: rec["cat"] = "unknown"; rec["why"] = "fill: state older than 30 s"
        elif rec["exit_state_age_s"] is None or rec["exit_state_age_s"] > STALE: rec["cat"] = "unknown"; rec["why"] = "exit: state older than 30 s"
    return rec

stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; audit = collections.Counter(); rows = []
for m, L in ev.iter_mints(str(replay), tok, stats):
    info = tok[m]; ret = RET.get(m)
    if ret is None: audit["not_retained"] += 1; continue
    if any(s < info["created"] + 7200 and e > info["created"] for s, e in outages): audit["outage_excluded"] += 1; continue
    half = "early" if info["created"] < SPLIT else "late"; audit["eligible_" + half] += 1
    t = info["created"] + AGE
    RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
    k = bisect.bisect_right(RT, t); v = types.SimpleNamespace(t=t, created=info["created"], trades=ev.Prefix(RO, k))
    f = rc.features(v) if t >= ret else None
    E = bool(f is not None and rc.eligible(f)); c10 = crowd(m, t)
    rec = run(m, info, L, ret, E); rec.update(mint=m, half=half, created=info["created"], eligible_E=E, crowd10=c10, cand=bool(E and c10 <= CROWD_MAX)); rows.append(rec)
assert stats["non_contiguous"] == 0
keys = ["mint", "half", "created", "eligible_E", "crowd10", "cand", "cat", "why", "entry_t", "fill_state_age_s", "exit_state_age_s", "net_sol", "ret", "exit", "fill_venue", "exit_venue", "hypothetical"]
with open(out / "ledger_l003.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=keys, extrasaction="ignore"); w.writeheader(); w.writerows(rows)

def block(rs):
    att = [r for r in rs if r["eligible_E"]]; sc = [r for r in att if r["cat"] == "scored"]
    if not att: return {"attempted": 0}
    v = sorted(r["net_sol"] for r in sc); rets = [r["ret"] for r in sc]
    b = {"attempted": len(att), "filled": sum(1 for r in att if r["cat"] == "scored" or str(r["why"]).startswith("exit")), "fill_unavailable": sum(1 for r in att if r["cat"] != "scored" and not str(r["why"]).startswith("exit")), "uncertain_exits": sum(1 for r in att if r["cat"] != "scored" and str(r["why"]).startswith("exit")),
         "cats": dict(collections.Counter(r["cat"] for r in att)), "whys": dict(collections.Counter(str(r["why"]) for r in att if r["cat"] != "scored")),
         "resolved": len(sc), "unknown": len(att) - len(sc), "unknown_share": (len(att) - len(sc)) / len(att), "total_sol": math.fsum(v)}
    if sc: b.update(mean_ret=statistics.mean(rets), median_ret=statistics.median(rets), win_rate=sum(x > 0 for x in v) / len(v), share_loss_gt50=sum(x < -0.5 * SIZE for x in v) / len(v),
                    without_best1=math.fsum(v[:-1]), without_best3=math.fsum(v[:-3]) if len(v) > 3 else None, best=v[-3:])
    return b
E_rows = [r for r in rows if r["eligible_E"]]
res = {"scenario": "R4 (eval-1.1 run_launch unchanged at pool 55 bps + 30-s staleness post-check on fill and exit landing states, as f006p2 S2)", "denominator_audit": dict(audit), "pass1_retained_launches": len(RET), "crowd_window_s": CROWD_WIN, "crowd_max": CROWD_MAX,
       "crowd10_in_E": {"n": len(E_rows), "min": min(r["crowd10"] for r in E_rows), "median": statistics.median(r["crowd10"] for r in E_rows), "max": max(r["crowd10"] for r in E_rows),
                        "quartiles": statistics.quantiles([r["crowd10"] for r in E_rows], n=4)},
       "control_E": {"all": block(E_rows), "early": block([r for r in E_rows if r["half"] == "early"]), "late": block([r for r in E_rows if r["half"] == "late"])},
       "candidate_crowd_le10": {"all": block([r for r in E_rows if r["cand"]]), "early": block([r for r in E_rows if r["cand"] and r["half"] == "early"]), "late": block([r for r in E_rows if r["cand"] and r["half"] == "late"])},
       "complement_crowd_gt10": {"all": block([r for r in E_rows if not r["cand"]]), "early": block([r for r in E_rows if not r["cand"] and r["half"] == "early"]), "late": block([r for r in E_rows if not r["cand"] and r["half"] == "late"])}}
res["paired_view_R11"] = "candidate trades are a fixed subset of the control's trades with identical execution; on the candidate's resolved launches the control's total/mean/median equal the candidate's (see candidate_crowd_le10); the informative comparison is candidate vs complement, each on its own resolved set"
qs = res["crowd10_in_E"]["quartiles"]
def qlab(c): return "Q1" if c <= qs[0] else "Q2" if c <= qs[1] else "Q3" if c <= qs[2] else "Q4"
res["post_hoc_quartiles"] = {q: block([r for r in E_rows if qlab(r["crowd10"]) == q]) for q in ("Q1", "Q2", "Q3", "Q4")}
res["post_hoc_quartile_bounds"] = qs
json.dump(res, open(out / "results_l003.json", "w"), indent=2); print(json.dumps(res, indent=1))
