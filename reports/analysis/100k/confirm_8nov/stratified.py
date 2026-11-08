import runpy,sys,collections,math
sys.argv=['x',sys.argv[1]]
g=runpy.run_path('/home/claude/top-coins-bot/reports/analysis/100k/confirm_8nov/confirm.py')
meta,cx,coh,label,cpv,f,ven=g['meta'],g['cx'],g['coh'],g['label'],g['cpv'],g['f'],g['ven']
FR=1794048300
nonsol={m for m in coh if any('/' in k for k in ven.get(m,{}))}
S=[m for m in coh if int(meta[m]['create_ts'])>FR and m not in nonsol]
BANDS=[0,3e3,5e3,7.5e3,10e3,15e3,20e3,30e3,50e3,100e3]
def band(x): 
  for i in range(len(BANDS)-1):
    if BANDS[i]<=x<BANDS[i+1]: return i
  return None
def mh(rows):  # rows: (stratum, exposed, pos)
  T=collections.defaultdict(lambda:[0,0,0,0]) # a exp+pos, b exp-neg, c unexp-pos, d unexp-neg
  for s,e,p in rows: T[s][(0 if e else 2)+(0 if p else 1)]+=1
  num=sum(a*d/(a+b+c+d) for a,b,c,d in T.values()); den=sum(b*c/(a+b+c+d) for a,b,c,d in T.values())
  return T,(num/den if den else float('inf'))
print("H-hold5 stratified by 5-min cap band")
R=[]
for m in S:
  l=label(m,300)
  if l not in('POS','NOCROSS_OBS'): continue
  a=cpv(m,60); b=cpv(m,300)
  if not a or not b or not f(a['mc']) or not f(b['mc']): continue
  bd=band(f(b['mc']))
  if bd is None: continue
  R.append((bd,f(b['mc'])>=f(a['mc']),l=='POS'))
T,orr=mh(R)
for k in sorted(T): a,b_,c,d=T[k]; print(f"  ${BANDS[k]/1e3:g}-{BANDS[k+1]/1e3:g}K: held {a}/{a+b_} ({100*a/max(1,a+b_):.1f}%)  fell {c}/{c+d} ({100*c/max(1,c+d):.1f}%)")
print(f"  Mantel-Haenszel OR held vs fell, cap-adjusted: {orr:.2f}")
# crude OR
a=sum(1 for r in R if r[1] and r[2]); b_=sum(1 for r in R if r[1] and not r[2]); c=sum(1 for r in R if not r[1] and r[2]); d=sum(1 for r in R if not r[1] and not r[2]); print(f"  crude OR {a*d/(b_*c):.2f}")
print("H-sell stratified by 60-s cap band")
R=[]
for m in S:
  l=label(m,60)
  if l not in('POS','NOCROSS_OBS'): continue
  r=cpv(m,60)
  if not r or not f(r['mc']): continue
  bb,ss=f(r['buys5m']) or 0,f(r['sells5m']) or 0
  if bb+ss==0: continue
  bd=band(f(r['mc']))
  if bd is None: continue
  R.append((bd,ss/(bb+ss)>=0.5,l=='POS'))
T,orr=mh(R)
for k in sorted(T): a,b_,c,d=T[k]; print(f"  ${BANDS[k]/1e3:g}-{BANDS[k+1]/1e3:g}K: sell>=.5 {a}/{a+b_}  sell<.5 {c}/{c+d} ({100*c/max(1,c+d):.1f}%)")
print(f"  MH OR sell>=0.5 vs <0.5, cap-adjusted: {orr:.2f}")
# does cap at 5 min alone predict? rate by band all coins
print("5-min cap alone (held+fell):")
