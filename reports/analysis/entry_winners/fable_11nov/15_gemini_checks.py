#!/usr/bin/env python3
"""Gemini check 1: SMART-CLUSTER test entries with a 30% trail (and overlap with R3-on-curve).
   Gemini check 2: zero-buy sellers counted BEFORE the trigger second, on R3 / R3-on-curve, severe vs winners.
Reuses books14_entries.csv for the entry times. Output: out/gemini_checks_out.txt"""
import duckdb, pandas as pd, numpy as np, collections
from importlib import util
spec = util.spec_from_file_location('b14', '14_books_backtest.py')
PQ = 'out/trades/trades_entered_dedup.parquet'; H = 7200; HAIRCUT = 0.03
e = pd.read_csv('out/books14_entries.csv')
con = duckdb.connect(); con.execute("PRAGMA threads=2; PRAGMA memory_limit='3GB'")
out = open('out/gemini_checks_out.txt', 'w')
def P(*a): print(*a); print(*a, file=out)

def clean(p):
    p = p[~((p.venue == 'curve') & (p.price_sol > 4.2e-7))].reset_index(drop=True)
    keep = np.ones(len(p), bool); last = None
    for i, v in enumerate(p.price_sol.values):
        if last is not None and (v > 10 * last or v < 0.1 * last): keep[i] = False
        else: last = v
    return p[keep].reset_index(drop=True)

def trail30(seg, entry_px):
    ts = seg.ts.values; x = seg.price_sol.values / entry_px; hi = x[0]; n = len(x)
    for j in range(n):
        hi = max(hi, x[j])
        if x[j] <= hi * 0.7:
            k = np.searchsorted(ts, ts[j] + 1, side='left')
            return (x[-1] * 0.985, 'unresolved') if k >= n else (x[k] * 0.985, 'trail')
    return (x[-1] * 0.985, 'horizon')

def zb_before(p, j):
    bal = collections.defaultdict(float); zb = 0; zbtok = 0
    for w, b, t in zip(p.wallet.values[:j + 1], p.is_buy.values[:j + 1], p.tokens.values[:j + 1]):
        if b == 1: bal[w] += t
        else:
            if bal[w] < t * 0.5: zb += 1; zbtok += t
            bal[w] -= t
    return zb, zbtok / 1e9

need = e[e.trigger.isin(['SMART', 'R3'])]
res = []
for m, g in need.groupby('mint'):
    p = con.execute(f"select ts, slot, ev_idx, row_id, price_sol, is_buy, tokens, wallet, venue from '{PQ}' where mint = '{m}' and price_sol > 0 order by slot, ev_idx nulls first, row_id").df()
    p = clean(p); t0 = p.ts.iloc[0]; ts = p.ts.values; px = p.price_sol.values
    for _, r in g.iterrows():
        j = np.searchsorted(ts, t0 + r.t_trig, side='left')
        if j >= len(p): continue
        k = np.searchsorted(ts, ts[j] + 1, side='left')
        if k >= len(p): continue
        entry_px = px[k] * 1.015; seg = p.iloc[k:]; seg = seg[seg.ts <= ts[k] + H]
        if len(seg) < 2: continue
        mult, kind = trail30(seg, entry_px); zb, zbtok = zb_before(p, j)
        tsg = seg.ts.values; xs = seg.price_sol.values / entry_px
        holds = {}
        for T in (300, 900, 3600, 7200):
            q = np.searchsorted(tsg, tsg[0] + T, side='left'); holds[f't{T}'] = (xs[q] if q < len(xs) else xs[-1]) * 0.985 - 1 - HAIRCUT
        res.append(dict(**holds, mint=m, trigger=r.trigger, in_pool=r.in_pool, trail30_r=mult - 1 - HAIRCUT, kind=kind, zb_before=zb, zbtok_before=zbtok, mfe=r.mfe, orig_trail30=r.get('trail30', np.nan)))
d = pd.DataFrame(res); d.to_csv('out/gemini_checks_entries.csv', index=False)
s = d[d.trigger == 'SMART']
P('== Check 1: SMART-CLUSTER test-half entries, 30%% trail (haircut %.0f%%) ==' % (100 * HAIRCUT))
P('  n=%d  mean %+.3f  cap5x %+.3f  median %+.3f  SOL@0.2 %+.2f  win%% %.0f  severe%% %.0f  reach2x %.0f%%  reach5x %.0f%%' % (
    len(s), s.trail30_r.mean(), s.trail30_r.clip(upper=4).mean(), s.trail30_r.median(), 0.2 * s.trail30_r.sum(), 100 * (s.trail30_r > 0).mean(), 100 * (s.trail30_r <= -0.4).mean(), 100 * (s.mfe >= 2).mean(), 100 * (s.mfe >= 5).mean()))
P('  plain holds: ' + '  '.join(f'{T}: mean {s[T].mean():+.3f} win% {100*(s[T]>0).mean():.0f}' for T in ('t300','t900','t3600','t7200')))
P('  per coin r: ' + ' '.join(f'{v:+.2f}' for v in sorted(s.trail30_r.values)))
r3c = set(e[(e.trigger == 'R3') & (e.in_pool == False)].mint); P('  SMART test entries that also triggered R3-on-curve: %d of %d' % (s.mint.isin(r3c).sum(), len(s)))
r3 = d[d.trigger == 'R3'].copy(); r3['sev'] = r3.trail30_r <= -0.4; r3['win'] = r3.trail30_r > 0
P('\n== Check 2: zero-buy sellers BEFORE the R3 trigger ==')
for lab, g in [('R3 all', r3), ('R3 on curve', r3[r3.in_pool == False]), ('R3 in pool', r3[r3.in_pool == True])]:
    P(f'  {lab:12s} n={len(g):3d}  median zb before trigger: severe {g[g.sev].zb_before.median():.0f} (n={g.sev.sum()}) | winners {g[g.win].zb_before.median():.0f} | 5x runners {g[g.mfe >= 5].zb_before.median():.0f} (n={(g.mfe >= 5).sum()})   zb token share: severe {g[g.sev].zbtok_before.median():.3f} | winners {g[g.win].zbtok_before.median():.3f}')
for thr in (0, 5, 20, 50):
    g = r3[(r3.in_pool == False) & (r3.zb_before <= thr)]
    if len(g): P(f'  R3 on curve & zero-buy sellers <= {thr:2d}: n={len(g):3d} mean {g.trail30_r.mean():+.3f} cap5x {g.trail30_r.clip(upper=4).mean():+.3f} severe% {100*g.sev.mean():.0f} win% {100*g.win.mean():.0f} 5x% {100*(g.mfe>=5).mean():.0f}')
out.close()
