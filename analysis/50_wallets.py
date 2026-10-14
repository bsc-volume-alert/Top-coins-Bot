import pandas as pd, numpy as np
pd.set_option('display.width',250); pd.set_option('display.max_columns',60); pd.set_option('display.max_rows',300)
wb=pd.read_csv('data/wallet_buys.csv'); tok=pd.read_csv('data/tokens.csv'); life=pd.read_csv('data/token_life.csv')
# proxy peak per mint: max(tokens.peak_mc_usd, max life.mc)
lp=life.groupby('mint').mc.max().rename('life_peak')
pk=tok.set_index('mint').peak_mc_usd.to_frame().join(lp,how='outer'); pk['peak']=pk[['peak_mc_usd','life_peak']].max(axis=1)
wb=wb.join(pk.peak,on='mint'); r=wb[wb.peak.notna()&(wb.entry_mc>0)].copy(); r['m']=r.peak/r.entry_mc
print("scorable early buys",len(r),"of",len(wb)," wallets",r.wallet.nunique()," tokens",r.mint.nunique())
print("base rates per buy: 2x",round((r.m>=2).mean(),3)," 3x",round((r.m>=3).mean(),3)," 5x",round((r.m>=5).mean(),3))
H=lambda s:(s>=2).mean()
g=r.groupby('wallet').agg(n=('mint','nunique'),sol=('sol','sum'),cl=('is_cluster','mean'),h2=('m',H),h3=('m',lambda s:(s>=3).mean()),h5=('m',lambda s:(s>=5).mean()),med=('m','median'),age=('age_s','median'),mc=('entry_mc','median'))
print("\nwallet activity distribution:"); print(g.n.value_counts().sort_index().head(12).to_dict(), " max", g.n.max())
print("\nby activity bucket (per-buy hit rates):")
print(r.merge(g[['n']],left_on='wallet',right_index=True).assign(nb=lambda d:pd.cut(d.n,[0,1,2,4,9,19,49,10000])).groupby('nb',observed=True).agg(buys=('mint','size'),wallets=('wallet','nunique'),hit2=('m',lambda s:round(H(s),3)),hit3=('m',lambda s:round((s>=3).mean(),3)),cl=('is_cluster','mean')).round(3))
print("\nTOP 20 wallets (>=5 scorable buys, non-cluster share shown):"); print(g[g.n>=5].sort_values(['h2','n'],ascending=False).head(20).round(2))
# persistence: first vs second half
r['t']=pd.to_datetime(r.buy_utc); mid=r.t.quantile(0.5)
a=r[r.t<mid].groupby('wallet').agg(n1=('mint','size'),h1=('m',H)); b=r[r.t>=mid].groupby('wallet').agg(n2=('mint','size'),h2=('m',H))
j=a.join(b,how='inner'); j=j[(j.n1>=3)&(j.n2>=3)]
print("\nPERSISTENCE (>=3 buys in each half):",len(j),"wallets; corr =",round(j.h1.corr(j.h2),3))
print(j.assign(b1=pd.cut(j.h1,[-0.01,0.2,0.4,0.6,1.01])).groupby('b1',observed=True).agg(wallets=('h2','size'),second_half_hit2=('h2','mean'),buys2=('n2','sum')).round(3))
print("\ncluster vs not:"); print(r.groupby('is_cluster').agg(n=('mint','size'),hit2=('m',H),hit3=('m',lambda s:(s>=3).mean())).round(3))
r['ab']=pd.cut(r.age_s,[-1,0,5,15,30,60,120,1e5]); print("\nby buy age (s):"); print(r.groupby('ab',observed=True).agg(n=('mint','size'),hit2=('m',H),hit3=('m',lambda s:(s>=3).mean())).round(3))
r['sb']=pd.cut(r.sol,[0,0.5,1,2,5,10,1000]); print("\nby buy size:"); print(r.groupby('sb',observed=True).agg(n=('mint','size'),hit2=('m',H),hit3=('m',lambda s:(s>=3).mean())).round(3))
# "smart wallet signal": tokens where >=N wallets with prior h2>=0.5 (n>=3) bought — does it predict?
r=r.sort_values('t'); r['prior_n']=r.groupby('wallet').cumcount(); r['prior_hits']=r.groupby('wallet').apply(lambda d:(d.m>=2).shift().fillna(0).cumsum(),include_groups=False).reset_index(level=0,drop=True)
r['smart']=(r.prior_n>=3)&(r.prior_hits/r.prior_n>=0.5)
sm=r.groupby('mint').agg(smart=('smart','sum'),m=('m','first'),buyers=('wallet','nunique'))
print("\nTOKENS by # of 'smart' early buyers (wallets with >=3 prior buys and >=50% prior 2x):"); print(sm.assign(b=pd.cut(sm.smart,[-1,0,1,2,4,100])).groupby('b',observed=True).agg(tokens=('m','size'),hit2=('m',H),hit3=('m',lambda s:(s>=3).mean()),hit5=('m',lambda s:(s>=5).mean())).round(3))
