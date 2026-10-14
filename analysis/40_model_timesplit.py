import pandas as pd, numpy as np, warnings; warnings.filterwarnings('ignore')
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score
d=pd.read_csv('data/paper_trades.csv'); d=d[(d.invalid!=1)&(d.strategy=='early')].copy(); d['t']=pd.to_datetime(d.entry_utc); d=d.sort_values('t')
F=['entry_mc','entry_age_s','inflow_sol','inflow_wallets','bundle_pct','bundle_sol','handoffs','tier','factory','dev_buy_sol','snipers','creator_prior','creator_best_peak','hour_utc','bs_ratio_entry','buyers_entry','outside_share','cluster_held_pct']
X=d[F].astype(float); y=(d.peak_mult>=2).astype(int)
n=len(d); cut=int(n*0.6); Xtr,ytr,Xte,yte=X.iloc[:cut],y.iloc[:cut],X.iloc[cut:],y.iloc[cut:]
m=HistGradientBoostingClassifier(max_depth=3,learning_rate=0.05,max_iter=200,l2_regularization=1.0).fit(Xtr,ytr)
p=m.predict_proba(Xte)[:,1]; print("test n",len(yte),"base hit2x",round(yte.mean(),3),"AUC",round(roc_auc_score(yte,p),3))
te=d.iloc[cut:].copy(); te['p']=p
for q in [0.5,0.7,0.8,0.9,0.95]:
    thr=np.quantile(p,q); s=te[te.p>=thr]
    miss=s[s.peak_mult<2].x_tsl40.fillna(0.5)
    ev=( (s.peak_mult>=2).mean()*2 + (1-(s.peak_mult>=2).mean())*miss.mean() )*0.9
    print(f" top {int((1-q)*100)}%: n={len(s)} hit2x={(s.peak_mult>=2).mean():.3f} hit3x={(s.peak_mult>=3).mean():.3f} grad={s.graduated.fillna(0).mean():.3f} EV(tp2,tsl40,10%cost)={ev:.3f}")
from sklearn.inspection import permutation_importance
r=permutation_importance(m,Xte,yte,n_repeats=5,random_state=0,scoring='roc_auc')
imp=pd.Series(r.importances_mean,index=F).sort_values(ascending=False); print("\npermutation importance (AUC drop):"); print(imp.round(4).head(10).to_string())
thr=np.quantile(p,0.95); top=te[te.p>=thr]; rest=te[te.p<thr]
print("\nTOP 5% vs REST medians:"); print(pd.DataFrame({'top5':top[F].median(),'rest':rest[F].median()}).round(2).T.to_string())
print("\nTOP5 bundle_pct dist:",top.bundle_pct.describe().round(1).to_dict())
# simple interpretable rule search on full data (train part only) then test
tr=d.iloc[:cut]; 
rules={'buys>=40 & bundle<15':lambda x:(x.buys>=40)&(x.bundle_pct<15),'buys>=40 & bundle<15 & wallets>=15':lambda x:(x.buys>=40)&(x.bundle_pct<15)&(x.inflow_wallets>=15),'buys>=60 & bundle<10':lambda x:(x.buys>=60)&(x.bundle_pct<10),'buys>=40 & sells<=10':lambda x:(x.buys>=40)&(x.sells<=10),'buys>=40 & bundle<15 & cluster_held<5':lambda x:(x.buys>=40)&(x.bundle_pct<15)&(x.cluster_held_pct<5)}
for k,f in rules.items():
    for nm,s in [('train',tr[f(tr)]),('test',te[f(te)])]:
        if not len(s): print(k,nm,'n=0'); continue
        miss=s[s.peak_mult<2].x_tsl40.fillna(0.5); ev=((s.peak_mult>=2).mean()*2+(1-(s.peak_mult>=2).mean())*miss.mean())*0.9
        print(f"{k:45s} {nm}: n={len(s):4d} hit2x={(s.peak_mult>=2).mean():.3f} hit3x={(s.peak_mult>=3).mean():.3f} EV={ev:.3f}")
