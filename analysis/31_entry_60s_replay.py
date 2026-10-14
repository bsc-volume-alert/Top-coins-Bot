import pandas as pd, numpy as np
pd.set_option('display.width',250); pd.set_option('display.max_columns',60); pd.set_option('display.max_rows',400)
w=pd.read_pickle('data/wide.pkl'); cps=[60,300,900,1800,3600,7200]
d=w[w.mc_60.notna()&w.mc_7200.notna()].copy()
later=[c for c in cps if c>60]; d['fp']=d[[f'mc_{c}' for c in later]].max(axis=1)/d.mc_60; d['end']=d.mc_7200/d.mc_60; d['h1']=d.mc_3600/d.mc_60; d['m5']=d.mc_300/d.mc_60
print("ENTRY AT +60s, n=",len(d)," fwd>=2x %.3f >=3x %.3f  mean end %.2f  mean h1 %.2f  mean m5 %.2f" % ((d.fp>=2).mean(),(d.fp>=3).mean(),d.end.mean(),d.h1.mean(),d.m5.mean()))
d['bs']=d.buys5m_60/d.sells5m_60.replace(0,np.nan)
for col,bins in [('mc_60',[0,4e3,5e3,6e3,8e3,10e3,15e3,25e3,1e9]),('vol5m_usd_60',[-1,500,1e3,2e3,5e3,10e3,25e3,1e9]),('buyers5m_60',[-1,3,6,10,20,40,1e9]),('bs',[0,1,2,4,10,1000]),('bundle_pct',[-1,0.1,5,20,40,60,100]),('bundle_sol',[-1,0.1,2,5,10,20,1000]),('has_socials',[-1,0,1]),('factory',[-1,0,1]),('dev_buy_sol',[-1,0,0.5,1,2,5,100])]:
    d['_b']=pd.cut(d[col],bins)
    g=d.groupby('_b',observed=True).agg(n=('fp','size'),p2=('fp',lambda s:(s>=2).mean()),p3=('fp',lambda s:(s>=3).mean()),p5=('fp',lambda s:(s>=5).mean()),mean_m5=('m5','mean'),mean_h1=('h1','mean'),mean_end=('end','mean'),grad=('graduated_7200','mean'))
    print(f"-- {col}"); print(g.round(3).to_string())
# combos
for name,m in [('mc60>=10K',d.mc_60>=10e3),('mc60>=10K & buyers5m>=20',(d.mc_60>=10e3)&(d.buyers5m_60>=20)),('mc60>=15K & buyers>=40',(d.mc_60>=15e3)&(d.buyers5m_60>=40)),('vol>=5K & bs>=2',(d.vol5m_usd_60>=5e3)&(d.bs>=2)),('mc60 6-10K & buyers>=10',(d.mc_60.between(6e3,10e3))&(d.buyers5m_60>=10))]:
    x=d[m]; print(f"COMBO {name}: n={len(x)} p2={(x.fp>=2).mean():.3f} p3={(x.fp>=3).mean():.3f} mean_m5={x.m5.mean():.2f} mean_h1={x.h1.mean():.2f} mean_end={x.end.mean():.2f} grad={x.graduated_7200.mean():.3f}")
