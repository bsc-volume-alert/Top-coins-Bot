#!/usr/bin/env python3
"""Codex check: replay the run entries through the reserve-based engine (04_replay.py): 0.2 SOL bought against the curve /
pool reserves at trigger+1 s, sold into the reserves at each policy's exit (LAND_S=1), pool offset c from the pool's own swaps.
Keys: R3 / R5 / GRAD triggers from books14_entries.csv; BASE60 (entry at 60 s) from momentum_entries.csv.
Output: out/replay_runs.csv, out/replay_runs_out.txt"""
import importlib.util, pandas as pd, numpy as np, time
spec = importlib.util.spec_from_file_location('rep', '04_replay.py'); rep = importlib.util.module_from_spec(spec); spec.loader.exec_module(rep)
b = pd.read_csv('out/books14_entries.csv'); m = pd.read_csv('out/momentum_entries.csv')
keys = pd.concat([b[b.trigger.isin(['R3', 'R5', 'GRAD'])][['mint', 'trigger', 't0', 't_trig', 'in_pool']],
                  m[m.trigger == 'BASE60'][['mint', 'trigger', 't_trig']].assign(t0=np.nan, in_pool=False)], ignore_index=True)
# t0 for BASE60 keys: first trade ts (same definition as 13/14)
first = rep.duckdb.connect().execute(f"select mint, min(ts) t0 from read_parquet('{rep.PQ}') group by 1").df().set_index('mint').t0
keys['t0'] = keys.t0.fillna(keys.mint.map(first)); keys['dec_ts'] = (keys.t0 + keys.t_trig).astype(int)
allm = sorted(keys.mint.unique()); out = []; t_start = time.time()
for b0 in range(0, len(allm), 60):
    df = rep.load_batch(allm[b0:b0 + 60])
    for mint, g_idx in df.groupby('mint', sort=False).indices.items():
        S = rep.build_states(df.iloc[g_idx])
        for _, k in keys[keys.mint == mint].iterrows():
            r = dict(mint=mint, trigger=k.trigger, in_pool=k.in_pool, dec_ts=int(k.dec_ts), t_trig=k.t_trig)
            try: r.update(rep.replay_key(S, int(k.dec_ts)))
            except Exception as e: r['fill_status'] = f'error: {e!r}'
            out.append(r)
    print(b0 + 60, '/', len(allm), round(time.time() - t_start), 's', flush=True)
R = pd.DataFrame(out); R.to_csv('out/replay_runs.csv', index=False)
o = open('out/replay_runs_out.txt', 'w')
def P(*a): print(*a); print(*a, file=o)
P('fill status by trigger:'); P(pd.crosstab(R.trigger, R.fill_status).to_string())
F = R[R.fill_status == 'filled'].copy()
P('\nReserve-based results, 0.2 SOL, LAND_S=1 (closed = sale on a state <= 600 s old; stale/unresolved reported separately, worst case = 0)')
for pol in ['T30', 'T25', 'T50', 'H300', 'H600', 'TP1.5_T40', 'SL50_TP2.0', 'HALF2.0_T40', 'TVENUE']:
    for trig in ['BASE60', 'R3', 'R5', 'GRAD']:
        for sub, mask in [('all', F.trigger == trig), ('on curve', (F.trigger == trig) & (F.fill_venue == 'curve')), ('in pool', (F.trigger == trig) & (F.fill_venue == 'pool'))]:
            g = F[mask]
            if len(g) == 0 or (trig in ('BASE60', 'GRAD') and sub != 'all'): continue
            r = g[pol]; st = g[pol + '_st'].astype(str); closed = st == 'closed'; v = r[closed]
            worst = pd.concat([v, pd.Series(-1.0, index=r[~closed].index)])
            P(f'  {pol:11s} {trig:6s} {sub:8s} n={len(g):4d} closed={closed.sum():4d}  mean {v.mean():+.3f}  cap5x {v.clip(upper=4).mean():+.3f}  median {v.median():+.3f}  SOL@0.2 {0.2*v.sum():+.2f}  severe% {100*(v<=-0.4).mean():4.1f}  win% {100*(v>0).mean():4.1f}  | stale/unresolved {(~closed).sum():3d}  worst-case mean {worst.mean():+.3f}')
P('\nfill price impact (x_land = immediate round trip after costs):'); P(F.groupby('trigger').x_land.describe()[['count', 'mean', '50%', 'min']].round(3).to_string())
o.close()
