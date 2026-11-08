import runpy,sys,collections
sys.argv=['x',sys.argv[1]]
g=runpy.run_path('/home/claude/top-coins-bot/reports/analysis/100k/confirm_8nov/confirm.py')
meta,cx,coh,label,cpv,f,ven,wil,life=g['meta'],g['cx'],g['coh'],g['label'],g['cpv'],g['f'],g['ven'],g['wil'],g['life']
bad={m for m,x in cx.items() if '/' in x['venue']}
nonsol={m for m in coh if any('/' in k for k in ven.get(m,{}))}
print("\n### CHECK 2 attrition")
c=collections.Counter(label(m,60) for m in coh); print(' at 60 s, excluded labels:',{k:v for k,v in c.items() if k not in('POS','NOCROSS_OBS')}, 'kept',c['POS']+c['NOCROSS_OBS'])
E=[m for m in coh if label(m,300) in('POS','NOCROSS_OBS')]
why=collections.Counter(); posdrop=0; dropped=[]
for m in E:
  a=cpv(m,60); b=cpv(m,300)
  if a and b and f(a['mc']) and f(b['mc']): continue
  r60=life[m].get(60); r300=life[m].get(300)
  w=('60s ' + ('none' if not r60 else 'late' if not a else 'mc0')) + ' / ' + ('5m ' + ('none' if not r300 else 'late' if not b else 'mc0'))
  why[w]+=1; dropped.append(m); posdrop+= label(m,300)=='POS'
print(' hold5 eligible',len(E),'dropped',len(dropped),'POS among dropped',posdrop, dict(why.most_common(8)))
# alive flag at 300 for dropped
al=collections.Counter((life[m].get(300) or {}).get('alive','none') for m in dropped); print(' alive flag at 5m among dropped:',dict(al))
print(' worst case: all dropped counted as FELL -> fell', f"{13+posdrop}/{1543+len(dropped)} = {100*(13+posdrop)/(1543+len(dropped)):.2f}%", 'CI', ['%.2f'%x for x in wil(13+posdrop,1543+len(dropped))])
print(' worst case: all dropped counted as HELD -> held', f"{36+posdrop}/{514+len(dropped)} = {100*(36+posdrop)/(514+len(dropped)):.2f}%", 'CI', ['%.2f'%x for x in wil(36+posdrop,514+len(dropped))])
print("\n### CHECK 3 non-SOL-quoted pools in cohort (any coin with such a pool row):",len(nonsol),'of which POS/NOCROSS at 300:',sum(label(m,300) in('POS','NOCROSS_OBS') for m in nonsol))
print("\n### CHECK 4 strict cohort: created after freeze 7 Nov 10:45 UK, non-SOL pools excluded")
FR=1794045438+(10*3600+45*60)-(9*3600+57*60+18)
S=[m for m in coh if int(meta[m]['create_ts'])>FR and m not in nonsol]
A=[];B=[];H=[];F=[]
for m in S:
  l=label(m,60)
  if l in('POS','NOCROSS_OBS'):
    r=cpv(m,60)
    if r:
      b_,s_=f(r['buys5m']) or 0,f(r['sells5m']) or 0
      if b_+s_: (A if s_/(b_+s_)>=0.5 else B).append(l=='POS')
  l=label(m,300)
  if l in('POS','NOCROSS_OBS'):
    a=cpv(m,60); b=cpv(m,300)
    if a and b and f(a['mc']) and f(b['mc']): (H if f(b['mc'])>=f(a['mc']) else F).append(l=='POS')
for nm,X in (('sell>=0.5',A),('sell<0.5',B),('held',H),('fell',F)):
  k=sum(X);n=len(X);lo,hi=wil(k,n); print(f"  {nm}: {k}/{n} = {100*k/n:.2f}% [{lo:.2f}-{hi:.2f}]")
print('  POS at 60s in strict cohort:',sum(label(m,60)=='POS' for m in S),' coins',len(S))
