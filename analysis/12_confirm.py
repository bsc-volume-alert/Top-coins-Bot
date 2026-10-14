import pandas as pd, numpy as np
pd.set_option('display.width',250); pd.set_option('display.max_columns',60); pd.set_option('display.max_rows',300)
d=pd.read_csv('data/paper_trades.csv')
c=d[d.strategy=='confirm'].copy()
X=['x_tsl40','x_tsl60','x_half60','x_twophase','x_grad','x_time','x_volstop']
def tab(g):
    r={'n':len(g),'hit2x':round((g.peak_mult>=2).mean(),2),'hit3x':round((g.peak_mult>=3).mean(),2),'grad':round(g.graduated.fillna(0).mean(),2),'med':round(g.peak_mult.median(),2),'avg':round(g.peak_mult.mean(),2),'after':round(g.after_peak_mult.mean(),2)}
    for x in X: v=g[x].dropna(); r[x]=round((v.mean()-1)*100) if len(v) else None
    return pd.Series(r)
print(tab(c))
print(c[['entry_mc','entry_age_s','buyers_entry','bs_ratio_entry','vol5m_usd','bundle_pct','inflow_sol','outside_share']].describe().T)
# join parent early trade to get r5
e=d[d.strategy=='early'].set_index('mint')
c['parent_entry_mc']=c.mint.map(e.entry_mc); c['r5']=c.entry_mc/c.parent_entry_mc
c['parent_mc5']=c.mint.map(e.mc_5m); c['parent_buyers5']=c.mint.map(e.buyers_5m)
for col,bins in [('r5',[0,1,1.5,2,3,100]),('entry_mc',[0,10e3,15e3,20e3,30e3,50e3,1e6]),('buyers_entry',[0,100,150,250,400,1e5]),('bs_ratio_entry',[0,1,1.2,1.5,2,100]),('bundle_pct',[-1,10,20,40,100]),('entry_age_s',[0,240,300,360,480,600,1e5])]:
    c['_b']=pd.cut(c[col],bins); print(f"\n-- {col}"); print(c.groupby('_b',observed=True).apply(tab)[['n','hit2x','hit3x','grad','med','avg','x_tsl40','x_half60','x_time']])
print("\nconfirm exit reasons"); print(c.exit_reason.value_counts(dropna=False))
print("\nconfirm winners"); print(c.sort_values('peak_mult',ascending=False)[['name','entry_mc','entry_age_s','buyers_entry','bs_ratio_entry','r5','peak_mult','after_peak_mult','x_tsl40','x_half60','graduated']].head(12))
# what does the early-trade data say about continuation after 5m? use tokens where early closed and mc_15m exists
e2=d[(d.strategy=='early')&d.mc_15m.notna()&d.mc_5m.notna()].copy(); e2['r5']=e2.mc_5m/e2.entry_mc; e2['r15_5']=e2.mc_15m/e2.mc_5m
e2['_b']=pd.cut(e2.r5,[0,0.5,1,1.5,2,3,100]); print("\nEARLY: 15m/5m continuation by r5"); print(e2.groupby('_b',observed=True).agg(n=('id','size'),med_r15_5=('r15_5','median'),up=('r15_5',lambda s:(s>1).mean().round(2)),up15=('r15_5',lambda s:(s>1.15).mean().round(2)),grad=('graduated',lambda s:s.fillna(0).mean().round(2))))
