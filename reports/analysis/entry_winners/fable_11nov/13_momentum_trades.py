#!/usr/bin/env python3
"""Buy-on-the-run study on trade data (entered-mint population, launches 6 Nov 07:40 -> 8 Nov 15:00 UTC).
Entry triggers are evaluated on the trade path; the buy lands on the first trade >= trigger + 1 s (price x 1.015: 1% fee + impact);
exits land on the first trade >= signal + 1 s (price x 0.985). Horizon 2 h after entry. Unresolved (no trade after signal) valued at
the last price x 0.985 and flagged. Output: out/momentum_out.txt, out/momentum_entries.csv
"""
import duckdb, pandas as pd, numpy as np, sys
PQ = 'out/trades/trades_entered_dedup.parquet'
con = duckdb.connect(); con.execute("PRAGMA threads=2; PRAGMA memory_limit='3GB'")
mints = [r[0] for r in con.execute(f"select distinct mint from '{PQ}'").fetchall()]
LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else len(mints)
mints = mints[:LIMIT]
H = 7200
rows = []

def path_after(p, i0):
    return p.iloc[i0:]

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

B = 80
for b in range(0, len(mints), B):
    chunk = mints[b:b + B]
    df = con.execute(f"select mint, ts, slot, ev_idx, row_id, price_sol, is_buy, sol, wallet, venue from '{PQ}' where mint in ({','.join(repr(m) for m in chunk)}) and price_sol > 0 order by mint, slot, ev_idx nulls first, row_id").df()
    for m, p in df.groupby('mint', sort=False):
        p = p[~((p.venue == 'curve') & (p.price_sol > 4.2e-7))].reset_index(drop=True)  # impossible curve prints = decode errors
        # drop single-print jumps >10x or <0.1x against the previous retained trade (decode errors, study_v1_1 rule)
        keep = np.ones(len(p), bool); last = None
        for i, v in enumerate(p.price_sol.values):
            if last is not None and (v > 10 * last or v < 0.1 * last): keep[i] = False
            else: last = v
        p = p[keep].reset_index(drop=True)
        if len(p) < 20: continue
        t0 = p.ts.iloc[0]; ts = p.ts.values; px = p.price_sol.values
        if len(p) < 20 or ts[-1] - t0 < 600: continue
        i60 = np.searchsorted(ts, t0 + 60, side='right') - 1
        if i60 < 0: continue
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
    print(f'{b + B}/{len(mints)} mints, {len(rows)} entries', flush=True)

e = pd.DataFrame(rows); e.to_csv('out/momentum_entries.csv', index=False)
out = open('out/momentum_out.txt', 'w')
def P(*a): print(*a); print(*a, file=out)
pols = ['trail30', 'trail50', 'tp1.5_stop50', 'tp2.0_stop50', 'tp3.0_stop50', 't300', 't900', 't3600']
P('Population: %d mints with trades; entries per trigger:' % len(mints)); P(e.trigger.value_counts().to_string())
for name, g in e.groupby('trigger'):
    P(f'\n=== {name}: n={len(g)}  trigger time median {g.t_trig.median():.0f} s  run at entry median {g.run_at_entry.median():.2f}x  peak>=2x {100*(g.peak>=2).mean():.1f}%  peak>=5x {100*(g.peak>=5).mean():.1f}%  trough<=0.5 {100*(g.trough<=0.5).mean():.1f}%')
    for pol in pols:
        v = g[pol] - 1; unres = g[pol + '_kind'].str.contains('unresolved').mean()
        P(f'  {pol:13s} mean {v.mean():+.3f} (cap5x {(g[pol].clip(upper=5)-1).mean():+.3f})  median {v.median():+.3f}  SOL@0.2 {0.2*v.sum():+.2f}  win% {100*(v>0).mean():4.1f}  severe% {100*(v<=-0.4).mean():4.1f}  unresolved% {100*unres:4.1f}')
out.close()
