import runpy,sys
sys.argv=['x',sys.argv[1]]
g=runpy.run_path('/home/claude/top-coins-bot/reports/analysis/100k/confirm_8nov/confirm.py')
meta,cx,coh,label,cpv,f,wil=g['meta'],g['cx'],g['coh'],g['label'],g['cpv'],g['f'],g['wil']
bad={m for m,x in cx.items() if '/' in x['venue']}
print('\nSENSITIVITY: non-SOL-quoted pool crossings dropped:',len(bad&set(coh)))
for cap_lim in (None,50000,30000):
  H=[];F=[]
  for m in coh:
    if m in bad: continue
    l=label(m,300)
    if l not in('POS','NOCROSS_OBS'): continue
    a=cpv(m,60); b=cpv(m,300)
    if not a or not b or not f(a['mc']) or not f(b['mc']): continue
    if cap_lim and f(b['mc'])>=cap_lim: continue
    (H if f(b['mc'])>=f(a['mc']) else F).append(l=='POS')
  for nm,S in (('held',H),('fell',F)):
    k=sum(S);n=len(S);lo,hi=wil(k,n); print(f"  H-hold5 {'all' if not cap_lim else 'cap at 5 min < $%dK'%(cap_lim//1000)}: {nm} n {n} POS {k} {100*k/max(1,n):.2f}% [{lo:.2f}-{hi:.2f}]")
  A=[];B=[]
for m in coh:
  if m in bad: continue
  l=label(m,60)
  if l not in('POS','NOCROSS_OBS'): continue
  r=cpv(m,60)
  if not r: continue
  b,s=f(r['buys5m']) or 0,f(r['sells5m']) or 0
  if b+s==0: continue
  (A if s/(b+s)>=0.5 else B).append(l=='POS')
for nm,S in (('sell≥0.5',A),('sell<0.5',B)):
  k=sum(S);n=len(S);lo,hi=wil(k,n); print(f"  H-sell no non-SOL pools: {nm} n {n} POS {k} {100*k/max(1,n):.2f}% [{lo:.2f}-{hi:.2f}]")
