# Fresh-data check (k100-20261109t1144: launches 8 Nov 15:00 → 9 Nov 09:00 UTC, never used for any choice): do the cap-band $100K rates
# and the "still on curve at $20-50K at 5 min" group look the same as in the discovery window? Detection only (no trade rows exported for this window).
import runpy,sys,collections,math
D=sys.argv[1:]
def wil(k,n,z=1.96):
  if not n: return (float('nan'),)*2
  p=k/n; d=1+z*z/n; c=(p+z*z/(2*n))/d; h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d; return (100*max(0,c-h),100*(c+h))
BANDS=[(0,5e3),(5e3,10e3),(10e3,15e3),(15e3,20e3),(20e3,30e3),(30e3,50e3),(50e3,100e3)]; BN=['<5K','5-10K','10-15K','15-20K','20-30K','30-50K','50-100K']
for d,frm in zip(D,(1794048300,1794150000)):
  sys.argv=['x',d]
  import io,contextlib
  with contextlib.redirect_stdout(io.StringIO()): g=runpy.run_path('/home/claude/top-coins-bot/reports/analysis/100k/confirm_8nov/confirm.py')
  meta,coh,label,f,ven,life=g['meta'],g['coh'],g['label'],g['f'],g['ven'],g['life']
  nonsol={m for m in coh if any('/' in k for k in ven.get(m,{}))}
  S=[m for m in coh if int(meta[m]['create_ts'])>frm and m not in nonsol]
  print(f"\n### {d.split('/')[-1]}: cohort {len(S)} retained coins")
  C=collections.defaultdict(lambda:[0,0]); G=collections.defaultdict(lambda:[0,0])
  for m in S:
    l=label(m,300)
    if l not in('POS','NOCROSS_OBS'): continue
    r=life[m].get(300)
    if not r: continue
    c=int(meta[m]['create_ts']); av=f(r.get('obs_ts')) or f(r.get('ts'))
    if av is None or av>c+315 or not f(r['mc']): continue
    mc=f(r['mc']); bi=next((i for i,(a,b) in enumerate(BANDS) if a<=mc<b),None)
    if bi is None: continue
    C[bi][0]+=1; C[bi][1]+=(l=='POS')
    if 20e3<=mc<50e3:
      k='curve' if r.get('graduated') in ('0','',None,'false') else 'pool'; G[k][0]+=1; G[k][1]+=(l=='POS')
  for bi in range(7):
    n,k=C[bi]; lo,hi=wil(k,n); print(f"  5-min cap {BN[bi]:8s}: {k:3d}/{n:5d} reached $100K = {100*k/max(1,n):5.1f}% [{lo:.1f}-{hi:.1f}]")
  for k2,(n,k) in G.items(): lo,hi=wil(k,n); print(f"  $20-50K at 5 min, {k2:5s}: {k}/{n} = {100*k/max(1,n):.1f}% [{lo:.1f}-{hi:.1f}]")
