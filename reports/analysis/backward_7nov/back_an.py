import pickle,sys,time,collections,statistics as st
D=sys.argv[1]; rows=pickle.load(open(D+'/rows.pkl','rb'))
def f(x):
  try: return float(x)
  except: return None
SPLIT=int(time.mktime(time.strptime('2026-11-06 00:00','%Y-%m-%d %H:%M')))-time.timezone
X=[]
late=0
for r in rows:
  l=r['L'][60]; ts=f(l['ts']); 
  if ts is None or ts-(r['c']+60)>15: late+=1; continue
  if l['graduated'] in('1','true'): continue  # already migrated at 60s: instant graduations excluded
  b,s=f(l['buys5m']) or 0,f(l['sells5m']) or 0
  x=dict(mc=f(l['mc']),vol=f(l['vol5m_usd']),buys=b,sells=s,buyers=f(l['buyers5m']),buyers_total=f(l['buyers_total']),holders=f(l['holders']),top10=f(l['top10_pct']),
    sell_share=s/(b+s) if b+s else None,bundle_sol=f(r['t']['bundle_sol']),bundle_pct=f(r['t']['bundle_pct']),bundle_wallets=f(r['t']['bundle_wallets']),dev_buy=f(r['t']['dev_buy_sol']))
  x['run']=1 if (r['peak']>=95000 or r['mig']) else 0; x['near']=1 if 60000<=r['peak']<95000 and not r['mig'] else 0; x['train']=r['c']<SPLIT
  X.append(x)
tr=[x for x in X if x['train']]; te=[x for x in X if not x['train']]
print('usable (on-time 60s cp, not graduated at 60s):',len(X),'late-dropped',late,'| train',len(tr),'runners',sum(x['run'] for x in tr),'| test',len(te),'runners',sum(x['run'] for x in te))
base_tr=sum(x['run'] for x in tr)/len(tr); base_te=sum(x['run'] for x in te)/len(te); print('base rate train %.2f%% test %.2f%%'%(100*base_tr,100*base_te))
feats=['mc','vol','buys','sells','buyers','buyers_total','holders','top10','sell_share','bundle_sol','bundle_pct','bundle_wallets','dev_buy']
res=[]
for k in feats:
  v=sorted(x[k] for x in tr if x[k] is not None)
  if len(v)<1000: print(k,'too few',len(v)); continue
  q=[v[int(len(v)*i/10)] for i in range(1,10)]
  def dec(val): return sum(val>=c for c in q)
  def rate(S,d): g=[x for x in S if x[k] is not None and dec(x[k])==d]; return (sum(x['run'] for x in g)/len(g) if g else 0, len(g))
  rt=[rate(tr,d) for d in range(10)]; re_=[rate(te,d) for d in range(10)]
  top_tr=rt[9][0]/base_tr; top_te=re_[9][0]/base_te
  res.append((k,top_tr,top_te,q[8],[round(100*a,1) for a,_ in re_]))
for k,a,b,c,d in sorted(res,key=lambda x:-x[2]): print(f"{k:14s} top-decile lift train {a:4.1f}x test {b:4.1f}x  (top decile >= {c:.3g})  test runner% by decile {d}")
pickle.dump(X,open(D+'/X.pkl','wb'))
