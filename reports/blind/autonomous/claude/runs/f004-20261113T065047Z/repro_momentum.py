"""f004 step 1 — the 11 Nov study's trade-path simulation (analysis-fable-11nov @ cc20a2c, reports/analysis/entry_winners/fable_11nov/
13_momentum_trades.py, sha 2b4d4faf…) re-run with ITS OWN LOGIC, UNCHANGED, on the raw allowlisted trades (entry-all @ e678331) of every
launch created in the allowlisted window. The study read a parquet of deduplicated trades of 2,127 book-entered mints (not published); here the
trades are streamed by the frozen evaluator's iter_mints (dedup by full fingerprint, event order slot / ev_idx nulls-first / row_id — the
same ORDER BY the study used) and handed to the study's per-mint body, copied verbatim (chain time `ts`, not receipt time; its decode
filters; its >= 20 trades / >= 600 s tape screen; its 1.5 % flat cost; unresolved valued at the last price x 0.985).
The study's exits() function and the trigger block are copied character for character except for the duckdb/chunk plumbing.
Usage: F006P2_EVAL=<evaluate.py> python3 -I repro_momentum.py <replay dir> <out dir>"""
import sys, os, json, importlib.util, pathlib, collections, csv
import numpy as np, pandas as pd
replay, out = sys.argv[1], pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location("ev_frozen", os.environ["F006P2_EVAL"]); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
START, END = 1793950800, 1794081600
tok, gaps, outages, meta = ev.load(replay, START, END)
ev.KEEP = ev.KEEP + ("price_sol",)   # the frozen file is unchanged; its streaming reader is asked to keep the export's price_sol column (the study's price)
H = 7200
rows = []

# ---------------- copied verbatim from 13_momentum_trades.py ----------------
def exits(seg, entry_px, t_entry):
    """seg: trades from the landed entry onwards (within horizon). returns dict of policy -> (multiple after costs, kind)"""
    ts = seg.ts.values; px = seg.price_sol.values
    res = {}
    n = len(ts)
    def land(j):  # first index with ts >= ts[j]+1
        k = np.searchsorted(ts, ts[j] + 1, side='left')
        if k >= n: return None
        return k
    def fin(j, kind):
        k = land(j)
        if k is None: return (px[-1] / entry_px * 0.985, kind + '/unresolved')
        return (px[k] / entry_px * 0.985, kind)
    # trails
    for tr in (0.3, 0.5):
        hi = px[0]; out = None
        for j in range(n):
            if px[j] > hi: hi = px[j]
            if px[j] <= hi * (1 - tr): out = fin(j, 'trail'); break
        res[f'trail{int(tr*100)}'] = out if out else (px[-1] / entry_px * 0.985, 'horizon')
    # take-profit with hard stop
    for tp in (1.5, 2.0, 3.0):
        out = None
        for j in range(n):
            if px[j] >= entry_px * tp: out = fin(j, 'tp'); break
            if px[j] <= entry_px * 0.5: out = fin(j, 'stop'); break
        res[f'tp{tp}_stop50'] = out if out else (px[-1] / entry_px * 0.985, 'horizon')
    # time stops
    for T in (300, 900, 3600):
        k = np.searchsorted(ts, t_entry + T, side='left')
        res[f't{T}'] = (px[k] / entry_px * 0.985, 'time') if k < n else (px[-1] / entry_px * 0.985, 'time/unresolved')
    res['peak'] = (px.max() / entry_px, 'peak'); res['trough'] = (px.min() / entry_px, 'trough')
    return res

def study_body(m, p):
    """The study's per-mint block, verbatim (p: DataFrame ts, price_sol, is_buy, venue in event order, price_sol > 0 already applied)."""
    p = p[~((p.venue == 'curve') & (p.price_sol > 4.2e-7))].reset_index(drop=True)  # impossible curve prints = decode errors
    # drop single-print jumps >10x or <0.1x against the previous retained trade (decode errors, study_v1_1 rule)
    keep = np.ones(len(p), bool); last = None
    for i, v in enumerate(p.price_sol.values):
        if last is not None and (v > 10 * last or v < 0.1 * last): keep[i] = False
        else: last = v
    p = p[keep].reset_index(drop=True)
    if len(p) < 20: return 'lt20'
    t0 = p.ts.iloc[0]; ts = p.ts.values; px = p.price_sol.values
    if len(p) < 20 or ts[-1] - t0 < 600: return 'lt600'
    i60 = np.searchsorted(ts, t0 + 60, side='right') - 1
    if i60 < 0: return 'no60'
    p60 = px[i60]
    # buyers per 30-s window (distinct wallets buying) — rolling via cumulative sets is costly; approximate with buys count
    is_buy = p.is_buy.values == 1
    trig = {}
    # RUN2 / RUN3: first trade with px >= k*p60, 60 s < t <= 900 s
    for k, name in ((2, 'RUN2'), (3, 'RUN3'), (5, 'RUN5')):
        idx = np.where((px >= k * p60) & (ts > t0 + 60) & (ts <= t0 + 900))[0]
        trig[name] = idx[0] if len(idx) else None
    # RUN2_HOLD60: price stayed >= 2*p60 for 60 s after first crossing
    if trig['RUN2'] is not None:
        j = trig['RUN2']; tcross = ts[j]; w = (ts >= tcross) & (ts <= tcross + 60)
        if w.sum() >= 5 and px[w].min() >= 2 * p60 and ts[w].max() >= tcross + 50:
            trig['RUN2_HOLD60'] = np.where(ts > tcross + 60)[0][0] if (ts > tcross + 60).any() else None
        else: trig['RUN2_HOLD60'] = None
    else: trig['RUN2_HOLD60'] = None
    # BURST: px >= 1.5 x price 30 s earlier with >= 15 buys in those 30 s, 60 < t <= 1800
    trig['BURST'] = None
    for j in range(len(p)):
        t = ts[j]
        if t <= t0 + 60 or t > t0 + 1800: continue
        k0 = np.searchsorted(ts, t - 30, side='left')
        if k0 >= j: continue
        if px[j] >= 1.5 * px[k0] and is_buy[k0:j].sum() >= 15: trig['BURST'] = j; break
    # GRAD: first pool trade
    pool = np.where(p.venue.values == 'pumpswap')[0]
    trig['GRAD'] = pool[0] if len(pool) and ts[pool[0]] - t0 <= 3600 else None
    # ATH breakout after 120 s: new high above all prior prices with >= 20 buys in last 60 s
    trig['ATH120'] = None; hi = 0
    for j in range(len(p)):
        if px[j] > hi:
            hi = px[j]
            if ts[j] > t0 + 120 and ts[j] <= t0 + 1800:
                k0 = np.searchsorted(ts, ts[j] - 60, side='left')
                if is_buy[k0:j].sum() >= 20: trig['ATH120'] = j; break
    # BASE: entry at 60 s (what the books do), for comparison on the same coins
    trig['BASE60'] = i60
    for name, j in trig.items():
        if j is None: continue
        k = np.searchsorted(ts, ts[j] + 1, side='left')
        if k >= len(p): continue
        entry_px = px[k] * 1.015; t_entry = ts[k]
        seg = p.iloc[k:]; seg = seg[seg.ts <= t_entry + H]
        if len(seg) < 2: continue
        r = exits(seg, entry_px, t_entry)
        row = dict(mint=m, trigger=name, t_trig=ts[j] - t0, run_at_entry=px[k] / p60, p60=p60, entry_px=entry_px, trades_after=len(seg))
        for key, (mult, kind) in r.items(): row[key] = mult; row[key + '_kind'] = kind
        rows.append(row)
    return 'ok'
# ---------------- end of verbatim block ----------------

stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; screen = collections.Counter(); n = 0
for m, L in ev.iter_mints(replay, tok, stats):
    p = pd.DataFrame({"ts": [float(r["ts"]) for r in L], "price_sol": [ev.fl(r["price_sol"]) or 0.0 for r in L], "is_buy": [int(r["is_buy"]) for r in L], "venue": [r["venue"] for r in L]})
    p = p[p.price_sol > 0].reset_index(drop=True)
    screen[study_body(m, p)] += 1; n += 1
    if n % 500 == 0: print(n, dict(screen), len(rows), flush=True)
assert stats["non_contiguous"] == 0
e = pd.DataFrame(rows); e.to_csv(out / "repro_entries_all_window.csv", index=False)
json.dump({"mints_with_trades_in_window": n, "study_screen": dict(screen), "entries_per_trigger": e.trigger.value_counts().to_dict(), "stream_stats": {k: v for k, v in stats.items() if k != "_done"}}, open(out / "repro_screen.json", "w"), indent=2)
print(json.dumps({"mints": n, "screen": dict(screen)}, indent=1))
