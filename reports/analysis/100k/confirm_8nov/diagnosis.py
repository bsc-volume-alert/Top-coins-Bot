import runpy,sys,statistics as st,collections
sys.argv=['x',sys.argv[1]]
g=runpy.run_path('/home/claude/top-coins-bot/reports/analysis/100k/confirm_8nov/confirm.py')
meta,cx,coh,allc,label,cpv,f,ven=g['meta'],g['cx'],g['coh'],g['allc'],g['label'],g['cpv'],g['f'],g['ven']
import io,contextlib
bad={m for m,x in cx.items() if '/' in x['venue']}
print("\n=== A. crossings among ALL cohort launches (incl. not retained)")
cr=[m for m in allc if m in cx and m not in bad]
c=collections.Counter(('retained' if ven.get(m) else 'not retained', label(m,60)) for m in cr); print(c)
print("=== B. ALREADY at 60s: venue of crossing / suspect_jump / minutes")
al=[m for m in coh if label(m,60)=='ALREADY']
print(collections.Counter(cx[m]['venue'] for m in al).most_common(5), 'graduated', sum(meta[m]['graduated'] in('1','true') for m in al))
print('secs to cross', st.quantiles([int(cx[m]['ts'])-int(meta[m]['create_ts']) for m in al],n=4))
print("=== C. POS timing (min to $100K)", st.quantiles([(int(cx[m]['ts'])-int(meta[m]['create_ts']))/60 for m in coh if label(m,60)=='POS'],n=4))
print("=== D. checkpoint trade test: BUY at 5-min cap if held (5m>=60s), coins not already >=$100K; exit at fixed checkpoint. Gross, no costs, cap-based")
FEE=0.025+0.0015/0.2   # ~1.25% each way pool/curve + fixed fee on 0.2 SOL ≈ 3.25% round trip (no slippage)
for cond,nm in ((lambda a,b: b>=a,'held'),(lambda a,b: b<a,'fell'),(lambda a,b: True,'all')):
  R=collections.defaultdict(list)
  for m in coh:
    if m in bad or label(m,300) not in('POS','NOCROSS_OBS'): continue
    a=cpv(m,60); b=cpv(m,300)
    if not a or not b or not f(a['mc']) or not f(b['mc']): continue
    if not cond(f(a['mc']),f(b['mc'])): continue
    e=f(b['mc'])
    for cp in (900,1800,3600,7200):
      x=cpv(m,cp); v=f(x['mc']) if x and f(x['mc']) is not None else None
      if v is None:  # missing checkpoint: treat as dead coin? record separately
        R[cp,'miss'].append(1); continue
      R[cp].append(v/e-1)
  for cp in (900,1800,3600,7200):
    r=R[cp]; 
    if not r: continue
    s=sorted(r); nb=s[:-1]
    print(f"  {nm:5s} exit {cp//60:>3d}m: n {len(r)} missing {len(R[cp,'miss'])} mean {100*st.mean(r):+.1f}% median {100*st.median(r):+.1f}% win {100*sum(x>0 for x in r)/len(r):.0f}% mean-no-best {100*st.mean(nb):+.1f}% after~3.3%cost {100*(st.mean(r)-FEE):+.1f}%")
print("=== E. held + 60s cap band: rate & 30m mean return")
for lo,hi in ((0,5e3),(5e3,10e3),(10e3,20e3),(20e3,40e3),(40e3,1e9)):
  S=[];Rt=[]
  for m in coh:
    if m in bad or label(m,300) not in('POS','NOCROSS_OBS'): continue
    a=cpv(m,60); b=cpv(m,300)
    if not a or not b or not f(a['mc']) or not f(b['mc']) or f(b['mc'])<f(a['mc']): continue
    if not lo<=f(b['mc'])<hi: continue
    S.append(label(m,300)=='POS'); x=cpv(m,1800)
    if x and f(x['mc']): Rt.append(f(x['mc'])/f(b['mc'])-1)
  if S: print(f"  5-min cap ${lo/1e3:.0f}K-{hi/1e3:.0f}K: n {len(S)} POS {sum(S)} {100*sum(S)/len(S):.1f}% | 30m mean {100*st.mean(Rt) if Rt else 0:+.0f}% median {100*st.median(Rt) if Rt else 0:+.0f}% n{len(Rt)}")
