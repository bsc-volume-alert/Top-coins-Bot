"""R3C replayed with the DEPLOYED rules (r3paper.mjs R3C-1) on period A (6–8 Nov) data held here, execution model v2.2 (sim22.py).
Clock from creation; p60 = last trade price at or before create+60; trigger = first curve print in (60, 900] s at >= 3x p60, price <= 4.2e-7 and
<= 10x the previous print; trades processed in arrival order; read time = recv_ms rounded up to the next 2-s poll; LATE if read > trigger ts + 5 s;
buy lands 1 s after the read; no fill if the curve is complete by then ('skipped-graduated'); 30% trail on sellable proceeds; sell lands slot+2;
2-h max; fees curve 1.25%, pool 0.55%, fixed 0.0015 SOL. Population: the 2,019-coin period-A cohort (NOT all retained launches — see notes)."""
import sys, math, csv, gzip, statistics as st, collections
sys.argv = ['x', 'A', 'B_tr.pkl.gz', '../inv/pkg', 'r3dep']
exec(open('c1_v2.py').read().rsplit("if __name__ == '__main__':", 1)[0])
exec(open('sim22.py').read())
import pandas as pd
WA = build_A(); rec = collections.Counter(); out = []
for r in WA.COH:
    m, c = r['mint'], r['create_ts']; tr = WA.TR.get(m)
    if not tr: rec['no trades'] += 1; continue
    arr = sorted(tr, key=lambda x: (x[14] or x[3] * 1000, x[0], x[1]))  # arrival order (recv_ms)
    p60 = prev = None; trig = None
    for x in arr:
        px = x[8]
        if not (px and px > 0): continue
        if x[3] <= c + 60: p60 = prev = px; continue
        if p60 is None: break
        if x[3] > c + 900: continue
        ok = px <= 4.2e-7 and (prev is None or px <= 10 * prev); prev = px
        if x[4] == 'curve' and ok and px >= 3 * p60: trig = x; break
    if p60 is None: rec['no print by 60 s'] += 1; continue
    if trig is None: rec['no 3x curve print in 60 s-15 min'] += 1; continue
    recv = (trig[14] or trig[3] * 1000) / 1000; read = math.ceil(recv / 2) * 2
    if read > trig[3] + 5: rec['late (read > trigger + 5 s)'] += 1; continue
    x = WA.sim(m, read, ('TRAIL', .30, None))
    if x['status'] == 'UNAVAILABLE': rec[f"no fill ({'skipped-graduated' if x['why'] == 'curve-complete' else x['why']})"] += 1; continue
    rec['filled'] += 1
    flag = x['status'] == 'UNRESOLVED' or 'QUIET-PRICED' in x.get('tags', set())
    out.append(dict(mint=m, dec_ts=read, ret=x['ret'], status=x['status'], flagged=flag, hi=x.get('hi'), exit_ts=x.get('exit_ts')))
D = pd.DataFrame(out)
O = pd.read_csv('../r3/replay_runs.csv.gz'); O = O[(O.trigger == 'R3') & (O.fill_status == 'filled') & (O.fill_venue == 'curve')]
O['closed'] = O['T30_st'].astype(str) == 'closed'
L = []; P = lambda *a: (L.append(' '.join(map(str, a))), print(*a))
def summ(v, lab):
    v = sorted(v); n = len(v)
    if not n: P(f'{lab}: n=0'); return
    P(f"{lab}: n={n} mean {100*st.mean(v):+.1f}% median {100*st.median(v):+.1f}% win {100*sum(a>0 for a in v)/n:.0f}% severe(<=-50%) {100*sum(a<=-.5 for a in v)/n:.0f}% "
      f"total {0.2*sum(v):+.2f} SOL | top coin {0.2*v[-1]:+.2f} SOL | without top3 {100*st.mean(v[:-3]) if n>3 else float('nan'):+.1f}% | without top5 {100*st.mean(v[:-5]) if n>5 else float('nan'):+.1f}% ({0.2*sum(v[:-5]):+.2f} SOL)")
P('Reconciliation (deployed rules, cohort):'); [P(f'  {k}: {v}') for k, v in rec.items()]
oc = O[O.closed]
summ(list(oc['T30']), 'A) Original R3C reserve replay, all its coins (T30, closed)')
inC = set(r['mint'] for r in WA.COH); ocC = oc[oc.mint.isin(inC)]
summ(list(ocC['T30']), 'B) Original replay, only coins in this cohort')
summ(list(D.ret), 'C) Deployed rules + v2.2 execution, this cohort (modeled)')
summ([(-1 if f else r) for r, f in zip(D.ret, D.flagged)], 'C0) same, flagged exits counted at -100%')
both = set(D.mint) & set(ocC.mint); P(f'Coins in both B and C: {len(both)}; only original: {len(set(ocC.mint)-set(D.mint))}; only deployed: {len(set(D.mint)-set(ocC.mint))}')
for lab, df, col, ts in (('original (A)', oc, 'T30', 'dec_ts'), ('deployed (C)', D, 'ret', 'dec_ts')):
    med = df[ts].median(); h1 = df[df[ts] <= med][col]; h2 = df[df[ts] > med][col]
    P(f'  halves by decision time, {lab}: first n={len(h1)} {100*h1.mean():+.1f}% | second n={len(h2)} {100*h2.mean():+.1f}%')
open('out_r3_deployed.txt', 'w').write('\n'.join(L) + '\n'); D.to_csv('r3_deployed_trades.csv', index=False)
