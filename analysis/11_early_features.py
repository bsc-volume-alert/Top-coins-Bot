import pandas as pd, numpy as np
pd.set_option('display.width',250); pd.set_option('display.max_columns',60); pd.set_option('display.max_rows',300)
d=pd.read_csv('data/paper_trades.csv')
e=d[d.strategy=='early'].copy()
X=['x_tsl40','x_tsl60','x_half60','x_twophase','x_grad','x_time','x_tp']
def tab(g):
    r={'n':len(g),'hit2x':round((g.peak_mult>=2).mean(),2),'hit3x':round((g.peak_mult>=3).mean(),2),'hit5x':round((g.peak_mult>=5).mean(),2),'grad':round(g.graduated.fillna(0).mean(),3),'med':round(g.peak_mult.median(),2),'avg':round(g.peak_mult.mean(),2),'after':round(g.after_peak_mult.mean(),2)}
    for x in X: v=g[x].dropna(); r[x]=round((v.mean()-1)*100) if len(v) else None
    return pd.Series(r)
print("EARLY all"); print(tab(e))
print("graduated:",e.graduated.sum(), "  peak>=10x:",(e.peak_mult>=10).sum(), " after_peak>=10x:",(e.after_peak_mult>=10).sum())
print("\n+5m features (confirmation):")
e['r5']=e.mc_5m/e.entry_mc
for col,bins in [('r5',[0,0.5,0.8,1,1.5,2,3,100]),('buyers_5m',[0,30,60,100,150,250,1e5]),('bundle_pct',[-1,0,10,20,40,60,100]),('bundle_sol',[-1,0,2,5,10,20,1000]),('handoffs',[-1,0,1,3,5,100]),('inflow_sol',[0,10,15,20,30,50,1000]),('inflow_wallets',[0,8,12,20,30,50,1000]),('outside_share',[-0.01,0.5,0.8,0.9,0.95,1.01]),('hour_utc',list(range(0,25,3))),('dev_buy_sol',[-1,0,0.5,1,2,5,100]),('snipers',[-1,0,2,5,10,100]),('creator_prior',[-1,0,1,3,10,1000]),('entry_mc',[0,6e3,8e3,10e3,15e3,20e3,1e6])]:
    if col not in e or e[col].notna().sum()==0: continue
    e['_b']=pd.cut(e[col],bins)
    print(f"\n-- {col} (non-null {e[col].notna().sum()})"); print(e.groupby('_b',observed=True).apply(tab)[['n','hit2x','hit3x','hit5x','grad','med','x_tsl40','x_half60','x_grad']])
for col in ['has_socials','factory','tier','alerted']:
    print(f"\n-- {col}"); print(e.groupby(e[col].fillna(-1)).apply(tab)[['n','hit2x','hit3x','hit5x','grad','med','x_tsl40','x_half60','x_grad']])
# combined gate: r5>=1.5 & buyers_5m>=100
for name,mask in [('r5>=1.5',e.r5>=1.5),('r5>=1.5&buyers5m>=100',(e.r5>=1.5)&(e.buyers_5m>=100)),('r5>=2',e.r5>=2),('r5>=2&buyers>=150',(e.r5>=2)&(e.buyers_5m>=150)),('r5>=1.5&bundle<20',(e.r5>=1.5)&(e.bundle_pct<20)),('r5>=1.5&socials',(e.r5>=1.5)&(e.has_socials==1))]:
    print(f"\nGATE {name}"); print(tab(e[mask]))
