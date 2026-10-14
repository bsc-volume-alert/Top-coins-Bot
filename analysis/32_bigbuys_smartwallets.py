import pandas as pd, numpy as np
pd.set_option('display.width',250); pd.set_option('display.max_rows',200)
w=pd.read_pickle('data/wide.pkl'); bb=pd.read_csv('data/big_buys.csv'); wb=pd.read_csv('data/wallet_buys.csv'); tok=pd.read_csv('data/tokens.csv')
cps=[60,300,900,1800,3600,7200]
print("big buys:",len(bb)," venues:",bb.venue.value_counts().to_dict()); print(bb[['age_s','sol','mc','balance_sol']].describe().round(1).T)
# first big buy per token within 5 min on curve → forward from cp300 (entry at 5m)
b5=bb[(bb.age_s<=300)].sort_values('age_s').groupby('mint').first()
d=w[w.mc_300.notna()&w.mc_7200.notna()].copy()
d['fp']=d[[f'mc_{c}' for c in cps if c>300]].max(axis=1)/d.mc_300; d['end']=d.mc_7200/d.mc_300; d['h1']=d.mc_3600/d.mc_300
d=d.join(b5[['sol','balance_sol','age_s']].rename(columns={'sol':'bb_sol','balance_sol':'bb_bal','age_s':'bb_age'}))
d['hasbb']=d.bb_sol.notna()
print("\nENTRY +5m by big-buy presence (<=5m):"); print(d.groupby('hasbb').agg(n=('fp','size'),p2=('fp',lambda s:(s>=2).mean()),p3=('fp',lambda s:(s>=3).mean()),mean_h1=('h1','mean'),mean_end=('end','mean'),grad=('graduated_7200','mean')).round(3))
x=d[d.hasbb]
for col,bins in [('bb_sol',[0,3,5,10,20,1000]),('bb_bal',[-1,0,5,20,100,1000,1e9]),('bb_age',[-1,2,10,30,60,300])]:
    x['_b']=pd.cut(x[col],bins); print(f"-- {col}"); print(x.groupby('_b',observed=True).agg(n=('fp','size'),p2=('fp',lambda s:(s>=2).mean()),p3=('fp',lambda s:(s>=3).mean()),mean_h1=('h1','mean'),mean_end=('end','mean'),grad=('graduated_7200','mean')).round(3))
# whale (balance>=100 SOL) buying >=5 SOL within 60s → forward from cp60
wh=bb[(bb.balance_sol>=100)&(bb.sol>=5)&(bb.age_s<=60)].mint.unique()
d6=w[w.mc_60.notna()&w.mc_7200.notna()].copy(); d6['fp']=d6[[f'mc_{c}' for c in cps if c>60]].max(axis=1)/d6.mc_60; d6['end']=d6.mc_7200/d6.mc_60
d6['whale']=d6.index.isin(wh); print("\nENTRY +60s, whale (bal>=100 SOL, buy>=5 SOL in first 60s):"); print(d6.groupby('whale').agg(n=('fp','size'),p2=('fp',lambda s:(s>=2).mean()),p3=('fp',lambda s:(s>=3).mean()),mean_end=('end','mean'),grad=('graduated_7200','mean')).round(3))
# smart wallets: build wallet quality sequentially (prior 5x rate using tokens.peak_mc_usd/entry_mc), presence within 60s → forward from cp60
pk=tok.set_index('mint').peak_mc_usd; wb['m']=wb.mint.map(pk)/wb.entry_mc; wb['t']=pd.to_datetime(wb.buy_utc); wb=wb.sort_values('t')
wb['hit5']=(wb.m>=5).astype(int); wb['pn']=wb.groupby('wallet').cumcount(); wb['ph']=wb.groupby('wallet').hit5.transform(lambda s:s.shift().fillna(0).cumsum())
wb['smart']=(wb.pn>=4)&(wb.ph/wb.pn.replace(0,np.nan)>=0.5)&(wb.is_cluster==0)&(wb.age_s>0)
sm=wb[(wb.age_s<=60)].groupby('mint').smart.sum()
d6['smart']=d6.index.map(sm).fillna(0)
print("\nENTRY +60s by # smart wallets (>=4 prior buys, >=50% 5x, non-cluster) in first 60s:"); print(d6.assign(b=pd.cut(d6.smart,[-1,0,1,2,100])).groupby('b',observed=True).agg(n=('fp','size'),p2=('fp',lambda s:(s>=2).mean()),p3=('fp',lambda s:(s>=3).mean()),mean_end=('end','mean'),grad=('graduated_7200','mean')).round(3))
