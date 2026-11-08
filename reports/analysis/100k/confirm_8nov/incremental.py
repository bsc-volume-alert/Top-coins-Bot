# Incremental value test: 5-min current cap alone vs cap + persistence + 60-s sell share. Same coins/exclusions as the strict cohort.
import runpy,sys,collections,math
import numpy as np
sys.argv=['x',sys.argv[1]]
g=runpy.run_path('/home/claude/top-coins-bot/reports/analysis/100k/confirm_8nov/confirm.py')
meta,cx,coh,label,cpv,f,ven=g['meta'],g['cx'],g['coh'],g['label'],g['cpv'],g['f'],g['ven']
FR=1794048300
nonsol={m for m in coh if any('/' in k for k in ven.get(m,{}))}
S=[m for m in coh if int(meta[m]['create_ts'])>FR and m not in nonsol]
lab=collections.Counter(label(m,300) for m in S)
print("STRICT COHORT labels at 5 min:",dict(lab))
rows=[]
for m in S:
  l=label(m,300)
  if l not in('POS','NOCROSS_OBS'): continue
  a=cpv(m,60); b=cpv(m,300)
  if not a or not b or not f(a['mc']) or not f(b['mc']): continue
  bb,ss=f(a['buys5m']) or 0,f(a['sells5m']) or 0
  if bb+ss==0: continue
  rows.append((int(meta[m]['create_ts']),math.log(f(b['mc'])),1.0 if f(b['mc'])>=f(a['mc']) else 0.0,ss/(bb+ss),1.0 if l=='POS' else 0.0))
rows.sort(); A=np.array(rows); t,lc,held,sell,y=A.T
print(f"modelled coins {len(y)}, POS {int(y.sum())} (NOCROSS_OBS = 'no crossing observed', coverage unverified)")
def fit(X,y,l2=1e-3):
  X=np.c_[np.ones(len(X)),X]; w=np.zeros(X.shape[1])
  for _ in range(50):
    p=1/(1+np.exp(-X@w)); H=X.T@(X*(p*(1-p))[:,None])+l2*np.eye(len(w)); gr=X.T@(p-y)+l2*w; w-=np.linalg.solve(H,gr)
  return w
def pred(w,X): return 1/(1+np.exp(-(np.c_[np.ones(len(X)),X]@w)))
def auc(p,y):
  o=np.argsort(p); r=np.empty(len(p)); r[o]=np.arange(1,len(p)+1); n1=y.sum(); n0=len(y)-n1; return (r[y==1].sum()-n1*(n1+1)/2)/(n1*n0)
def ll(p,y): p=np.clip(p,1e-6,1-1e-6); return -np.mean(y*np.log(p)+(1-y)*np.log(1-p))
h=len(y)//2
M={'cap only':[lc],'cap+held':[lc,held],'cap+sell':[lc,sell],'cap+held+sell':[lc,held,sell]}
print("Time split: fit on first half (earlier launches), score on second half. Lower log-loss / higher AUC = better.")
for nm,cols in M.items():
  X=np.c_[tuple(cols)]; w=fit(X[:h],y[:h]); p=pred(w,X[h:])
  print(f"  {nm:15s} test AUC {auc(p,y[h:]):.3f}  log-loss {ll(p,y[h:]):.4f}  coefs {np.round(w[1:],2).tolist()}  (train POS {int(y[:h].sum())}, test POS {int(y[h:].sum())})")
# full-sample likelihood ratio test of adding held+sell
X0=np.c_[lc]; X1=np.c_[lc,held,sell]; w0=fit(X0,y,0); w1=fit(X1,y,0)
LR=2*len(y)*(ll(pred(w0,X0),y)-ll(pred(w1,X1),y)); print(f"Full-sample likelihood-ratio test, adding held+sell to cap: LR {LR:.2f} on 2 df (5% critical value 5.99); coefs {np.round(w1[1:],2).tolist()}")
# bootstrap AUC difference on test half
rng=np.random.default_rng(20261108); Xa=np.c_[lc]; Xb=np.c_[lc,held,sell]; wa=fit(Xa[:h],y[:h]); wb=fit(Xb[:h],y[:h]); pa=pred(wa,Xa[h:]); pb=pred(wb,Xb[h:]); yt=y[h:]; D=[]
for _ in range(2000):
  i=rng.integers(0,len(yt),len(yt))
  if yt[i].sum()==0: continue
  D.append(auc(pb[i],yt[i])-auc(pa[i],yt[i]))
print(f"Test-half AUC gain from adding held+sell: {np.mean(D):+.3f}, 95% bootstrap [{np.percentile(D,2.5):+.3f}, {np.percentile(D,97.5):+.3f}]")
