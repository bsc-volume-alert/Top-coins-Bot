import pandas as pd, numpy as np
pd.set_option('display.width',250)
d=pd.read_csv('data/paper_trades.csv'); d=d[(d.invalid!=1)]
e=d[(d.strategy=='early')].copy()
print("all early",len(e),"closed",e.closed.sum(),"open",(e.closed==0).sum())
o=e[e.closed==0]; print("open: peak>=2 %.3f, x_tsl40 set %.3f, x_tsl60 set %.3f, median peak %.2f" % ((o.peak_mult>=2).mean(), o.x_tsl40.notna().mean(), o.x_tsl60.notna().mean(), o.peak_mult.median()))
print("open entry age range:", pd.to_datetime(o.entry_utc).min(), pd.to_datetime(o.entry_utc).max())
# open trades older than 6h should have closed on 'time' -> frozen (no trades). how many?
o=o.copy(); o['age_h']=(pd.Timestamp('2026-10-14 07:59')-pd.to_datetime(o.entry_utc)).dt.total_seconds()/3600
print("open older than 6h (frozen/dead):",(o.age_h>6).sum()," of",len(o))
def ev(g,thr,cost,dead=0.5):
    hit=(g.peak_mult>=thr)
    miss=g[~hit].x_tsl40.fillna(dead)  # tsl40 not hit yet on a dead token: assume we'd dump at ~half
    return (hit.mean()*thr + (1-hit.mean())*miss.mean())*(1-cost)
print("\nALL early trades, dead-miss assumed 0.5x, by cost:")
for cost in [0.05,0.10,0.15]:
    print(f" cost {cost}: ", {thr: round(ev(e,thr,cost),3) for thr in [1.3,1.5,2,3]})
print(" P(peak>=thr) all:",{thr: round((e.peak_mult>=thr).mean(),3) for thr in [1.3,1.5,2,3]})
segs={'entry<6K':e.entry_mc<6e3,'entry<5K':e.entry_mc<5e3,'entry 5-6K':e.entry_mc.between(5e3,6e3),'entry 6-10K':e.entry_mc.between(6e3,10e3),'entry>10K':e.entry_mc>10e3,'entry<6K & tier0':(e.entry_mc<6e3)&(e.tier==0),'entry<6K & bundle<20':(e.entry_mc<6e3)&(e.bundle_pct<20),'entry<6K & wallets>=12':(e.entry_mc<6e3)&(e.inflow_wallets>=12),'entry<6K & age<=10s':(e.entry_mc<6e3)&(e.entry_age_s<=10),'entry<6K & hour0-6':(e.entry_mc<6e3)&(e.hour_utc.between(0,6))}
rows=[]
for k,m in segs.items():
    g=e[m]
    rows.append({'seg':k,'n':len(g),'p1.5':round((g.peak_mult>=1.5).mean(),3),'p2':round((g.peak_mult>=2).mean(),3),'p3':round((g.peak_mult>=3).mean(),3),'ev1.5@10%':round(ev(g,1.5,0.10),3),'ev2@10%':round(ev(g,2,0.10),3),'ev3@10%':round(ev(g,3,0.10),3),'ev2@15%':round(ev(g,2,0.15),3),'grad':round(g.graduated.fillna(0).mean(),3)})
print(pd.DataFrame(rows).set_index('seg').to_string())
# entry_mc vs time: did <6K entries cluster in certain hours? (regime check)
e['blk']=pd.to_datetime(e.entry_utc).dt.floor('3h')
print("\nentry<6K by 3h block: n, p2, ev2@10%"); print(e[e.entry_mc<6e3].groupby('blk').apply(lambda g:pd.Series({'n':len(g),'p2':round((g.peak_mult>=2).mean(),2),'ev2':round(ev(g,2,0.10),2)})).to_string())
# why is entry<6K better? inspect inflow composition
print("\nentry<6K vs 6-10K feature medians:"); print(e.assign(lo=e.entry_mc<6e3).groupby('lo')[['entry_age_s','inflow_sol','inflow_wallets','bundle_pct','bundle_sol','dev_buy_sol','snipers','outside_share']].median().round(2))
