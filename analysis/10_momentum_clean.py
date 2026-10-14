import pandas as pd, numpy as np
pd.set_option('display.width',250); pd.set_option('display.max_columns',60); pd.set_option('display.max_rows',200)
d=pd.read_csv('data/paper_trades.csv')
m=d[(d.strategy=='momentum')&~((d.vol5m_usd==d.bs_ratio_entry)|(d.peak_mult>50))].copy()
print("clean momentum",len(m), m.trigger_kind.value_counts().to_dict())
X=['x_tsl40','x_tsl60','x_tsl80','x_half60','x_twophase','x_ladder','x_volstop','x_time','x_tp','x_m1','x_levels']
def tab(g):
    r={'n':len(g),'hit2x':round((g.peak_mult>=2).mean(),2),'hit3x':round((g.peak_mult>=3).mean(),2),'med_peak':round(g.peak_mult.median(),2),'avg_peak':round(g.peak_mult.mean(),2)}
    for x in X: v=g[x].dropna(); r[x]=round((v.mean()-1)*100) if len(v) else None
    return pd.Series(r)
print(m.groupby('trigger_kind').apply(tab).T)
m['mcb']=pd.cut(m.entry_mc,[0,60e3,100e3,200e3,500e3,1e6,2e6])
print("\nby MC x kind"); print(m.groupby(['trigger_kind','mcb'],observed=True).apply(tab)[['n','hit2x','hit3x','med_peak','avg_peak','x_tsl40','x_half60','x_volstop','x_time']])
m['ageb']=pd.cut(m.age_s/60,[0,10,30,60,180,1440,1e9])
print("\nby age x kind"); print(m.groupby(['trigger_kind','ageb'],observed=True).apply(tab)[['n','hit2x','hit3x','med_peak','avg_peak','x_tsl40','x_half60','x_time']])
m['bsb']=pd.cut(m.bs_ratio_entry,[0,0.8,1,1.2,1.5,100])
print("\nby bs ratio"); print(m.groupby(['bsb'],observed=True).apply(tab)[['n','hit2x','hit3x','med_peak','avg_peak','x_tsl40','x_half60','x_time']])
print("\nvol5m bucket"); m['vb']=pd.cut(m.vol5m_usd,[0,100e3,150e3,200e3,300e3,1e7]); print(m.groupby('vb',observed=True).apply(tab)[['n','hit2x','hit3x','med_peak','avg_peak','x_tsl40','x_half60','x_time']])
print("\nbuyers_entry bucket"); m['bb']=pd.cut(m.buyers_entry,[0,20,40,80,150,1e5]); print(m.groupby('bb',observed=True).apply(tab)[['n','hit2x','hit3x','med_peak','avg_peak','x_tsl40','x_half60','x_time']])
print("\nreentry"); print(m.groupby('reentry_n').apply(tab)[['n','hit2x','med_peak','avg_peak','x_tsl40','x_half60']])
print("\nbundle known?"); m['bk']=m.bundle_pct.notna(); print(m.groupby('bk').apply(tab)[['n','hit2x','hit3x','med_peak','avg_peak','x_tsl40','x_half60']])
print("\ntop clean momentum winners"); print(m.sort_values('peak_mult',ascending=False)[['name','trigger_kind','entry_mc','age_s','vol5m_usd','bs_ratio_entry','buyers_entry','peak_mult','after_peak_mult','x_tsl40','x_half60','x_volstop']].head(15))
