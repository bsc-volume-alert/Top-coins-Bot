#!/usr/bin/env python3
"""Blind-test evaluator v1.1 (7 Nov 2026). Scores frozen rules on the hidden period (launches created 8 Nov 00:00 → 10 Nov 00:00 UTC)
exactly as specified in reports/blind/BRIEF_7nov.md. Frozen before 8 Nov 00:00 UTC; any later change = new version + new untouched period.

Usage:  python3 -I evaluate.py --data <dir> --rules <rule.py> [<rule.py> ...] [--from 2026-11-08T00:00:00] [--to 2026-11-10T00:00:00] [--out results.json]
<dir> holds the test-period export (same formats as the development package):
  trades_part_*.csv(.gz)  columns row_id,mint,sig,slot,ts,wallet,is_buy,sol,tokens,price_sol,recv_ms,vsol,vtok,venue,pool,ev_idx,base_raw,quote_raw,
                          pool_base_raw,pool_quote_raw,base_mint,quote_mint,base_dec,quote_dec,dec_ver,px_adj
  tokens.csv(.gz)         mint,create_ts,tier,finalized   (tracker census)
  feed_gaps.csv(.gz)      rowid,ts,event,detail
  outages.txt             one "start_unix end_unix label" per line (tracker restarts / outages; '#' comments)
  fd_watch.csv(.gz)       optional: funding fields; usable only from trace_ts / scanned_ts (lookup_status 'ran')

RULE MODULE INTERFACE (one file per rule):
  RULE = {"name": str, "decision_offsets": [60, ...] or [], "on_trade": bool, "horizon_s": int (≤ 7200), "sizes": [0.2, 0.02]}
  def decide(view) -> bool      # called at created+offset for each offset, and (if on_trade) after each RECEIVED trade, from retention onward;
                                # the first True is the entry decision at view.t
  def exit_signal(pos) -> bool  # called after each RECEIVED trade after the fill (per size, independently); True = exit trigger at pos.t
  view: t, created, retained_at, trades (sequence of dicts received by t, in RECEIPT order; supports len, [i], iteration, slicing), meta (dict), last (latest received trade or None)
  pos:  t, size, entry_t, fill_t, x (sell value now ÷ stake, after fees, on the latest received state), hi (max x so far), venue, migrated (bool),
        trades_since (received trades after the fill), seconds_held
"""
import csv, gzip, glob, json, math, os, random, sys, importlib.util, argparse, calendar, time, io, collections, bisect

VERSION = "eval-1.1"  # 1.1 (7 Nov 16:05 UK, before the test start): O(1) trade views — 1.0 rebuilt the received-trade list on every call (quadratic on busy coins); scoring rules unchanged
FIXED_FEE_SOL = 0.0015            # per round trip (tx + priority), charged once per position
CURVE_FEE_BPS = 95 + 30           # pump.fun curve: protocol 95 + creator 30 bps, per leg (launcher defaults when the global config cannot be read)
POOL_FEE_BPS = 20 + 5 + 5         # PumpSwap: LP 20 + protocol 5 + coin-creator 5 bps, per leg (ASSUMPTION; sensitivity reported at 125)
LAND_BUY_S, LAND_SELL_S = 1.0, 0.7
CURVE_MAX_PX = (30 * 1.073e9 / (1.073e9 - 793.1e6)) / (1.073e9 - 793.1e6)   # SOL per token at curve completion (~4.11e-7)
WSOL = "So11111111111111111111111111111111111111112"
RETAIN_SOL, RETAIN_MIN, PRE_BUFFER = 15.0, 125, 12000
POOL_ALL_FROM = calendar.timegm(time.strptime("2026-11-07 09:47:00", "%Y-%m-%d %H:%M:%S"))

def opn(p): return io.TextIOWrapper(gzip.open(p), newline="") if p.endswith(".gz") else open(p, newline="")
def fl(x):
    try: return float(x)
    except (TypeError, ValueError): return None
def first(d, name):
    for ext in ("", ".gz"):
        p = os.path.join(d, name + ext)
        if os.path.exists(p): return p
    return None

# ---------------------------------------------------------------- loading
def load(d, t_from, t_to):
    tok = {}
    for r in csv.DictReader(opn(first(d, "tokens.csv"))):
        c = fl(r["create_ts"])
        if c is not None and t_from <= c < t_to: tok[r["mint"]] = {"created": c, "tier": int(fl(r.get("tier")) or 0)}
    trades = collections.defaultdict(list); seen = set(); dups = 0
    for p in sorted(glob.glob(os.path.join(d, "trades_part_*.csv*"))):
        for r in csv.DictReader(opn(p)):
            if r["mint"] not in tok: continue
            fp = (r["mint"], r["sig"], r["wallet"], r["is_buy"], r["sol"], r["tokens"], r["venue"], r["vsol"], r["vtok"])  # full fingerprint, never sig alone
            if fp in seen: dups += 1; continue
            seen.add(fp); trades[r["mint"]].append(r)
    for m, L in trades.items():
        L.sort(key=lambda r: (int(r["slot"]), int(fl(r["ev_idx"])) if fl(r["ev_idx"]) is not None else -1, int(r["row_id"])))
    gaps = {"main": [], "pool": []}; openat = {"main": None, "pool": None}
    p = first(d, "feed_gaps.csv")
    if p:
        for r in csv.DictReader(opn(p)):
            k = "pool" if r["event"].startswith("pool-") else "main"; e = r["event"].replace("pool-", ""); t = fl(r["ts"])
            if e in ("closed", "idle", "error") and openat[k] is None: openat[k] = t
            elif e in ("open", "subscribed") and openat[k] is not None: gaps[k].append((openat[k], t)); openat[k] = None
        for k in openat:
            if openat[k] is not None: gaps[k].append((openat[k], float("inf")))
    outages = []
    p = first(d, "outages.txt")
    if p:
        for line in open(p):
            line = line.split("#")[0].split()
            if len(line) >= 2: outages.append((float(line[0]), float(line[1])))
    meta = {}
    p = first(d, "fd_watch.csv")
    if p:
        csv.field_size_limit(10**9)
        for r in csv.DictReader(opn(p)):
            if r["mint"] in tok: meta[r["mint"]] = r
    return tok, trades, gaps, outages, meta, dups

# ---------------------------------------------------------------- state, valuation, validity
def state_ok(r):
    vs, vt = fl(r["vsol"]), fl(r["vtok"])
    if not vs or not vt or vs <= 0 or vt <= 0: return False
    if r["venue"] == "curve" or not r["venue"]:
        return (vs / 1e9) / (vt / 1e6) <= CURVE_MAX_PX * 1.1
    # pool: evidence must confirm a wSOL quote and decimals (tracker 0.19.9+); otherwise unavailable
    return r.get("quote_mint") == WSOL and str(r.get("base_dec")) == "6" and str(r.get("quote_dec")) == "9"

def bps(r, pool_bps): return CURVE_FEE_BPS if (r["venue"] == "curve" or not r["venue"]) else pool_bps
def buy(r, sol, pool_bps):
    vs, vt = fl(r["vsol"]) / 1e9, fl(r["vtok"]) / 1e6; f = bps(r, pool_bps) / 1e4
    net = sol / (1 + f) if (r["venue"] == "curve" or not r["venue"]) else sol * (1 - f)
    return vt * net / (vs + net)
def sell(r, tokens, pool_bps):
    vs, vt = fl(r["vsol"]) / 1e9, fl(r["vtok"]) / 1e6; f = bps(r, pool_bps) / 1e4
    return vs * tokens / (vt + tokens) * (1 - f)

def gap_overlap(gaps, outages, a, b, venue):
    for s, e in outages:
        if s < b and e > a: return True
    for s, e in gaps["main"] + (gaps["pool"] if venue and venue != "curve" else []):
        if s < b and e > a: return True
    return False

def state_at(L, t, gaps, outages, created, retained_at):
    """Chain state as of time t: the last trade (event order) with block time ≤ t, if capture over [that trade, t] is not shown to be broken."""
    best = None
    for r in L:
        if fl(r["ts"]) <= t: best = r
        else: break
    if best is None: return None, "no state"
    if not state_ok(best): return None, "state invalid"
    if gap_overlap(gaps, outages, fl(best["ts"]), t, best["venue"]): return None, "capture gap"
    pool = best["venue"] and best["venue"] != "curve"
    if not pool and t > retained_at + RETAIN_MIN * 60: return None, "outside retention"
    if pool and not (t <= created + 86400 and created >= POOL_ALL_FROM): return None, "outside pool capture"
    return best, None

class V:  # view for decide()
    pass
class Prefix:
    """read-only view of the first k items of a list, without copying"""
    def __init__(self, L, k): self.L, self.k = L, k
    def __len__(self): return self.k
    def __iter__(self): return (self.L[i] for i in range(self.k))
    def __getitem__(self, i):
        if isinstance(i, slice): return [self.L[j] for j in range(*i.indices(self.k))]
        if i < 0: i += self.k
        if not 0 <= i < self.k: raise IndexError(i)
        return self.L[i]

# ---------------------------------------------------------------- one rule on one launch
def run_launch(mod, R, m, info, L, gaps, outages, meta, pool_bps):
    created = info["created"]
    # retention time: receipt of the trade whose cumulative GROSS buys reach 15 SOL (or first trade for bundle tier-1)
    cum, retained_at, no_recv = 0.0, None, False
    for r in L:
        if r["venue"] not in ("curve", ""): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= RETAIN_SOL:
            rv = fl(r["recv_ms"]); retained_at = rv / 1000 if rv else fl(r["ts"]); no_recv |= rv is None; break
    if retained_at is None: return {"cat": "abstain", "why": "never retained"}, no_recv
    pre = sum(1 for r in L if fl(r["ts"]) <= retained_at)
    if pre > PRE_BUFFER: return {"cat": "unknown", "why": "pre-promotion buffer exceeded"}, no_recv
    if any(not fl(r["recv_ms"]) for r in L): no_recv = True
    RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"])))   # receipt order (event time where recv_ms is missing)
    RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
    def view(t):
        v = V(); v.t = t; v.created = created; v.retained_at = retained_at
        k = bisect.bisect_right(RT, t); v.trades = Prefix(RO, k); v.last = RO[k - 1] if k else None
        w = meta.get(m); mt = {"tier": info["tier"]}
        if w and w.get("lookup_status") == "ran" and (fl(w.get("trace_ts")) or fl(w.get("scanned_ts")) or 9e18) <= t:
            mt.update({k: w.get(k) for k in ("funder", "funder_sol", "funded_ts", "funder_launches", "grp", "bundle_pct", "bundle_sol", "dev_buy_sol")})
        v.meta = mt; return v
    times = [created + o for o in R.get("decision_offsets", [])]
    if R.get("on_trade"): times += RT
    t_entry = None
    for t in sorted(set(times)):
        if t < retained_at or t > created + 7200: continue
        if mod.decide(view(t)): t_entry = t; break
    if t_entry is None: return {"cat": "abstain", "why": "rule did not enter"}, no_recv
    out = {"cat": "scored", "entry_t": t_entry, "sizes": {}}
    for size in R.get("sizes", [0.2]):
        fs, why = state_at(L, t_entry + LAND_BUY_S, gaps, outages, created, retained_at)
        if fs is None: return {"cat": "unknown", "why": "fill: " + why, "entry_t": t_entry}, no_recv
        tok = buy(fs, size, pool_bps); fill_venue = fs["venue"] or "curve"
        hi, trig = -1e9, None; horizon = t_entry + min(R.get("horizon_s", 7200), 7200)
        for j in range(bisect.bisect_right(RT, t_entry + LAND_BUY_S), len(RO)):
            r = RO[j]; tr = RT[j]
            if tr >= horizon: break
            if not state_ok(r): continue
            p = V(); p.t = tr; p.size = size; p.entry_t = t_entry; p.fill_t = t_entry + LAND_BUY_S
            p.x = (sell(r, tok, pool_bps) - FIXED_FEE_SOL) / size; hi = max(hi, p.x); p.hi = hi
            p.venue = r["venue"] or "curve"; p.migrated = fill_venue == "curve" and p.venue != "curve"; p.seconds_held = tr - t_entry
            p.trades_since = None
            if mod.exit_signal(p): trig = tr; break
        t_sell = trig + LAND_SELL_S if trig is not None else horizon
        ss, why = state_at(L, t_sell, gaps, outages, created, retained_at)
        if ss is None: return {"cat": "unknown", "why": "exit: " + why, "entry_t": t_entry}, no_recv
        net = sell(ss, tok, pool_bps) - size - FIXED_FEE_SOL
        out["sizes"][str(size)] = {"net_sol": net, "ret": net / size, "exit": "trigger" if trig is not None else "horizon", "fill_venue": fill_venue, "exit_venue": ss["venue"] or "curve"}
    return out, no_recv

# ---------------------------------------------------------------- scoring
def lcb(vals, level, n=10000, seed=20261108):
    rnd = random.Random(seed); N = len(vals); s = []
    for _ in range(n): s.append(sum(vals[rnd.randrange(N)] for _ in range(N)) / N)
    s.sort(); return s[max(0, int(math.floor((1 - level) * n)) - 1)], s
def score(results, size, K, worst):
    N = len(results); pts, lows = [], []
    for r in results:
        if r["cat"] == "scored": v = r["sizes"][str(size)]["net_sol"]; pts.append(v); lows.append(v)
        elif r["cat"] == "unknown": pts.append(0.0); lows.append(-worst * size)
        else: pts.append(0.0); lows.append(0.0)
    c = collections.Counter(r["cat"] for r in results); att = c["scored"] + c["unknown"]
    sc = [r["sizes"][str(size)]["ret"] for r in results if r["cat"] == "scored"]
    o = {"N": N, "scored": c["scored"], "abstain": c["abstain"], "unknown": c["unknown"],
         "point_sol_per_launch": sum(pts) / N if N else None, "lower_sol_per_launch": sum(lows) / N if N else None,
         "total_net_sol_scored": sum(pts), "unknown_share_of_attempts": (c["unknown"] / att) if att else 0,
         "mean_ret": (sum(sc) / len(sc)) if sc else None, "median_ret": (sorted(sc)[len(sc) // 2]) if sc else None,
         "win_rate": (sum(x > 0 for x in sc) / len(sc)) if sc else None, "share_loss_ge_50": (sum(x <= -0.5 for x in sc) / len(sc)) if sc else None}
    if sc: o["mean_ret_without_best"] = (sum(sc) - max(sc)) / (len(sc) - 1) if len(sc) > 1 else None
    o["scorable"] = o["unknown_share_of_attempts"] <= 0.10
    if N:
        lo, _ = lcb(lows, 1 - 0.05 / K); o["bonferroni_lcb_lower"] = lo
        o["supported"] = bool(o["scorable"] and lo > 0)
    return o

def main(argv=None):
    ap = argparse.ArgumentParser(); ap.add_argument("--data", required=True); ap.add_argument("--rules", nargs="+", required=True)
    ap.add_argument("--from", dest="t0", default="2026-11-08T00:00:00"); ap.add_argument("--to", dest="t1", default="2026-11-10T00:00:00"); ap.add_argument("--out", default="results.json")
    a = ap.parse_args(argv)
    t0 = calendar.timegm(time.strptime(a.t0, "%Y-%m-%dT%H:%M:%S")); t1 = calendar.timegm(time.strptime(a.t1, "%Y-%m-%dT%H:%M:%S"))
    tok, trades, gaps, outages, meta, dups = load(a.data, t0, t1)
    # common denominator: launches created in the window, retained at any point, and not inside a tracker outage over [created, created+2h]
    universe = []
    for m, info in tok.items():
        L = trades.get(m, [])
        if not L: continue
        cum, ret = 0.0, info["tier"] >= 1
        for r in L:
            if r["venue"] in ("curve", "") and r["is_buy"] == "1": cum += fl(r["sol"]) or 0
            if cum >= RETAIN_SOL: ret = True; break
        if ret and not any(s < info["created"] + 7200 and e > info["created"] for s, e in outages): universe.append(m)
    K = len(a.rules); report = {"version": VERSION, "window": [a.t0, a.t1], "launches_in_window": len(tok), "N_common": len(universe), "duplicates_removed": dups,
                                "assumptions": {"curve_fee_bps": CURVE_FEE_BPS, "pool_fee_bps": POOL_FEE_BPS, "fixed_fee_sol": FIXED_FEE_SOL, "land_buy_s": LAND_BUY_S, "land_sell_s": LAND_SELL_S}, "rules": {}}
    for path in a.rules:
        spec = importlib.util.spec_from_file_location("rule_" + os.path.basename(path).replace(".", "_"), path); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        R = mod.RULE; res, hyp = [], 0
        for m in universe:
            r, h = run_launch(mod, R, m, tok[m], trades[m], gaps, outages, meta, POOL_FEE_BPS); res.append(r); hyp += h and r["cat"] != "abstain"
        sens = []
        for m in universe:
            r, _ = run_launch(mod, R, m, tok[m], trades[m], gaps, outages, meta, 125); sens.append(r)
        report["rules"][R["name"]] = {"file": path, "spec": R, "event_time_hypothetical_entries": hyp,
            "by_size": {str(s): score(res, s, K, (s + FIXED_FEE_SOL) / s) for s in R.get("sizes", [0.2])},
            "pool_fee_125bps_sensitivity": {str(s): score(sens, s, K, (s + FIXED_FEE_SOL) / s) for s in R.get("sizes", [0.2])}}
    json.dump(report, open(a.out, "w"), indent=1, default=str); print(json.dumps(report, indent=1, default=str)[:4000])

if __name__ == "__main__": main()
