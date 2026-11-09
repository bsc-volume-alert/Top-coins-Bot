# Confirmation test of the FROZEN $100K hypotheses (HYPOTHESES_FROZEN.md, 7 Nov 10:45 UK) on export k100-20261108t1722.
# Labels / on-time rule / curve-ceiling suspect rule copied from study100k.py v1.1 unchanged. argv[1] = dir with the export's .csv.gz files.
import csv,gzip,sys,collections,math,time,statistics as st
D=sys.argv[1]; OUT=[]; P=lambda *a: (OUT.append(' '.join(str(x) for x in a)))
def f(x):
  try: return float(x)
  except: return None
def wil(k,n,z=1.96):
  if not n: return (float('nan'),)*2
  p=k/n; d=1+z*z/n; c=(p+z*z/(2*n))/d; h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d; return (100*max(0,c-h),100*(c+h))
rd=lambda fn: csv.DictReader(gzip.open(f'{D}/{fn}.csv.gz','rt'))
cm=list(rd('coverage_mints')); cx={r['mint']:r for r in rd('coverage_crossings')}
CUT=int(cm[0]['export_cutoff_ts']); usd_hi=max(f(r['usd']) for r in rd('sol_usd'))
meta={}; ven=collections.defaultdict(dict)
for r in cm:
  meta[r['mint']]=r
  if r['venue']: ven[r['mint']][r['venue']]=r
life=collections.defaultdict(dict)
for r in rd('token_life'): life[r['mint']][int(r['cp'])]=r
COH_FROM=1794045438  # 7 Nov 09:57:18 UTC (tracker 0.19.9)
T_END=CUT-7200
CURVE_MAX_PX=(30*1.073e9/(1.073e9-793.1e6))/(1.073e9-793.1e6)
def suspect(m):
  x=cx.get(m)
  if not x: return False
  if x['suspect_jump']=='1': return True
  if x['venue']=='curve' and meta[m]['graduated'] not in('1','true'): return True
  if x['venue']=='curve' and (f(x['price_sol']) or 0)>CURVE_MAX_PX*1.1: return True
  return False
def label(m,dec_s,win_s=7200):
  c=int(meta[m]['create_ts']); x=cx.get(m)
  if x and suspect(m): return 'SUSPECT'
  if x:
    t=int(x['ts'])
    if t<=c+dec_s: return 'ALREADY'
    if t<=c+win_s: return 'POS'
  v=ven.get(m)
  if not v: return 'UNKNOWN_NOT_RETAINED'
  if meta[m]['graduated'] in('1','true') and not any('pumpswap' in k for k in v): return 'UNKNOWN_NO_POOL'
  mx=max((f(r['max_price_sol']) or 0) for r in v.values())
  if mx*1e9*usd_hi>=100000: return 'UNKNOWN_NEAR'
  return 'NOCROSS_OBS'
def cpv(m,cp):
  r=life.get(m,{}).get(cp)
  if not r: return None
  c=int(meta[m]['create_ts']); ts=f(r['ts'])
  if ts is None or (r['src']!='exact' and ts-(c+cp)>15): return None
  return r
coh=[m for m in meta if COH_FROM<int(meta[m]['create_ts'])<=T_END and ven.get(m)]   # retained (captured trades), 2-h window complete
allc=[m for m in meta if COH_FROM<int(meta[m]['create_ts'])<=T_END]
g=lambda t: time.strftime('%d %b %H:%M:%S',time.gmtime(t))
P(f"CONFIRMATION COHORT: created {g(COH_FROM)} → {g(T_END)} UTC (= UK); launches {len(allc)}; retained (captured trades) {len(coh)}")
for d in (60,300):
  c=collections.Counter(label(m,d) for m in coh); P(f"  labels at decision {d} s: "+', '.join(f'{k} {v}' for k,v in c.most_common()))
npos=sum(label(m,60)=='POS' for m in coh); P(f"  POS at decision 60 s: {npos} (evaluation condition: ≥ 15 POS → {'MET' if npos>=15 else 'NOT MET'})")
def rep(name,S):
  n=len(S); k=sum(S); lo,hi=wil(k,n); return n,k,(100*k/n if n else float('nan')),lo,hi
# H-sell
A=[];B=[]
for m in coh:
  l=label(m,60)
  if l not in('POS','NOCROSS_OBS'): continue
  r=cpv(m,60)
  if not r: continue
  b,s=f(r['buys5m']) or 0,f(r['sells5m']) or 0
  if b+s==0: continue
  (A if s/(b+s)>=0.5 else B).append(l=='POS')
TP=sum(A)+sum(B)
P("\nH-sell (sell share at 60 s ≥ 0.50 = warning sign):")
for nm,S in (('sell share ≥ 0.50',A),('sell share < 0.50',B)):
  n,k,r,lo,hi=rep(nm,S); P(f"  {nm}: n {n}, POS {k}, rate {r:.2f}% [95% {lo:.2f}–{hi:.2f}], recall {100*k/max(1,TP):.0f}%, false alarms per POS {((n-k)/k if k else float('inf')):.0f}")
na,ka,ra,loa,hia=rep('',A); nb,kb,rb,lob,hib=rep('',B)
sup = hia<rb and not (na and ka/na>=1/50)
P(f"  VERDICT H-sell: {'SUPPORTED' if sup else 'NOT SUPPORTED'} (needs ≥0.50 group's upper bound {hia:.2f}% < other group's rate {rb:.2f}%, and < 1 POS per 50 in the ≥0.50 group: {ka}/{na})")
# H-hold5
H=[];F=[]
for m in coh:
  l=label(m,300)
  if l not in('POS','NOCROSS_OBS'): continue
  a=cpv(m,60); b=cpv(m,300)
  if not a or not b or not f(a['mc']) or not f(b['mc']): continue
  (H if f(b['mc'])>=f(a['mc']) else F).append(l=='POS')
TP=sum(H)+sum(F)
P("\nH-hold5 (cap at 5 min ≥ cap at 60 s → more likely to reach $100K within 2 h):")
for nm,S in (('held',H),('fell',F)):
  n,k,r,lo,hi=rep(nm,S); P(f"  {nm}: n {n}, POS {k}, rate {r:.2f}% [95% {lo:.2f}–{hi:.2f}], recall {100*k/max(1,TP):.0f}%, false alarms per POS {((n-k)/k if k else float('inf')):.0f}")
nh,kh,rh,loh,hih=rep('',H); nf,kf,rf,lof,hif=rep('',F)
sup2 = rh>rf and loh>hif
P(f"  VERDICT H-hold5: {'SUPPORTED' if sup2 else 'NOT SUPPORTED'} (held {rh:.2f}% [{loh:.2f}–{hih:.2f}] vs fell {rf:.2f}% [{lof:.2f}–{hif:.2f}]; needs held > fell with non-overlapping intervals)")
# descriptive: positives
P("\nPOSITIVE CASES (decision 60 s): mint · created · minutes to $100K · venue · cap at crossing · sell share 60 s · cap 60 s → 5 min")
for m in sorted([m for m in coh if label(m,60)=='POS'],key=lambda m:int(meta[m]['create_ts'])):
  x=cx[m]; c=int(meta[m]['create_ts']); a=cpv(m,60); b=cpv(m,300)
  ss='-' if not a or (f(a['buys5m']) or 0)+(f(a['sells5m']) or 0)==0 else f"{(f(a['sells5m']) or 0)/((f(a['buys5m']) or 0)+(f(a['sells5m']) or 0)):.2f}"
  P(f"  {m[:8]} · {g(c)} · {(int(x['ts'])-c)/60:.1f} · {x['venue']} · ${f(x['mc_usd']):,.0f} · {ss} · {('$%s'%format(int(f(a['mc'])),',')) if a and f(a['mc']) else '-'} → {('$%s'%format(int(f(b['mc'])),',')) if b and f(b['mc']) else '-'}")
P("\nLIMITS: no outage list for this window (UNKNOWN_OUTAGE label not applied — feed gaps could hide crossings among NOCROSS_OBS); detection only, no trading value.")
open(f'{D}/confirm_out.txt','w').write('\n'.join(OUT)); print('\n'.join(OUT))
