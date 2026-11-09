# v1 vs v2 per position for the shortlist band, and win/loss diagnosis with features usable BEFORE entry (no look-ahead) vs explanations after.
import csv,gzip,sys,statistics as st,collections,math,pickle,json
S=sys.argv[1]
v1={(r['mint'],r['exit']):float(r['ret_primary']) for r in csv.reader(gzip.open(S+'/pkg/outputs/positions.csv.gz','rt')) and csv.DictReader(gzip.open(S+'/pkg/outputs/positions.csv.gz','rt')) if r['pricing']=='trade' and r['size_sol']=='0.2' and r['status']!='UNAVAILABLE'}
v2={}; V2=list(csv.DictReader(gzip.open(S+'/replay_v2_positions.csv.gz','rt')))
for r in V2:
  if r['size_sol']=='0.2' and r['status']!='UNAVAILABLE': v2[(r['mint'],r['exit'])]=(float(r['ret_zero_remainder']),r['entry_venue'],float(r['mc5_usd']),r['label'])
print("=== 30-50K T25: v1 → v2 by entry venue")
g=collections.defaultdict(lambda:[[],[]])
for (m,e),(r2,ven,mc,lab) in v2.items():
  if e=='T25' and 30e3<=mc<50e3 and (m,e) in v1: g[ven][0].append(v1[(m,e)]); g[ven][1].append(r2)
for ven,(a,b) in g.items(): print(f"  {ven:9s} n {len(a)} v1 mean {100*st.mean(a):+.1f}%  v2 mean {100*st.mean(b):+.1f}%  change {100*(st.mean(b)-st.mean(a)):+.1f} pts")
ch=sorted(((v2[k][0]-v1[k],k[0][:8],v2[k][1],round(100*v1[k]),round(100*v2[k][0])) for k in v2 if k[1]=='T25' and 30e3<=v2[k][2]<50e3 and k in v1))
print("  largest drops:",[c[1:] for c in ch[:5]])
# features before entry
T=pickle.load(gzip.open(S+'/cohort_trades.pkl.gz')); C={r['mint']:r for r in json.load(open(S+'/cohort.json'))['rows']}
def feats(m):
  r=C[m]; d=r['decision_ts']; tr=T[m]
  w=[x for x in tr if d-60<x[3]<=d]; buy=sum(x[6] for x in w if x[5]); sell=sum(x[6] for x in w if not x[5])
  pool=[x for x in tr if x[4]=='pumpswap' and x[3]<=d]; mig=(d-pool[0][3])/60 if pool else None
  return dict(net60=buy-sell, sellshare=sell/(buy+sell) if buy+sell else None, ntr60=len(w), mins_since_pool=mig)
print("\n=== 30-40K band, T25 (v2): winners vs losers — features known BEFORE entry")
rows=[(m,v[0]) for (m,e),v in v2.items() if e=='T25' and 30e3<=v[2]<40e3]
W=[feats(m) for m,r in rows if r>0]; L=[feats(m) for m,r in rows if r<=0]
for k in ('net60','sellshare','ntr60','mins_since_pool'):
  f=lambda G:[g[k] for g in G if g[k] is not None]
  a,b=f(W),f(L); print(f"  {k:16s} winners n{len(a)} median {st.median(a) if a else float('nan'):.2f} | losers n{len(b)} median {st.median(b) if b else float('nan'):.2f}")
print("  entry venue: winners",collections.Counter(v2[(m,'T25')][1] for m,r in rows if r>0),"losers",collections.Counter(v2[(m,'T25')][1] for m,r in rows if r<=0))
print("\n=== Extreme-winner audit: 10-15K band, T25/T40 with and without 693RVZyu (The Year 2021)")
for e in ('T25','T40'):
  a=[v[0] for (m,ee),v in v2.items() if ee==e and 10e3<=v[2]<15e3]; b=[v[0] for (m,ee),v in v2.items() if ee==e and 10e3<=v[2]<15e3 and not m.startswith('693RVZyu')]
  top=max(((v[0],m[:8]) for (m,ee),v in v2.items() if ee==e and 10e3<=v[2]<15e3))
  print(f"  {e}: with n{len(a)} mean {100*st.mean(a):+.1f}% | without 693RVZyu n{len(b)} mean {100*st.mean(b):+.1f}% | best coin {top[1]} {100*top[0]:+.0f}%")
