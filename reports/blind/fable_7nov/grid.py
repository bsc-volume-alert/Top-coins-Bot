import sys; sys.path.insert(0,'/home/claude/work')
import pandas as pd, numpy as np, pickle, engine as E, time
D=pickle.load(open('/home/claude/work/mints_arr.pkl','rb'))
AGES=[30,45,60,90,120,180,300]
EXITS={'bot':dict(trail=0.40,trail_pool=0.25),'tr30':dict(trail=0.30),'tr50':dict(trail=0.50),'tr20':dict(trail=0.20),
       'tp2tr40':dict(trail=0.40,tp=2.0),'tp15tr30':dict(trail=0.30,tp=1.5),
       'h20':dict(exit_mode='time',fixed_hold=20),'h60':dict(exit_mode='time',fixed_hold=60),'h180':dict(exit_mode='time',fixed_hold=180),'h600':dict(exit_mode='time',fixed_hold=600)}
rows=[]; t0=time.time()
for k,(m,d) in enumerate(D.items()):
    if np.isnan(d['recv']).any(): continue   # pre-recv rows: hypothetical only; exclude from development
    create=d['create']
    cum=np.cumsum(np.where(d['buy']==1,d['sol'],0.0))
    ri=np.searchsorted(cum,15.0)
    ret_ms=d['recv'][ri] if ri<len(cum) else np.inf
    for age in AGES:
        t=create*1000+age*1000
        if ret_ms>t:
            rows.append(dict(mint=m,age=age,eligible=0)); continue
        f=E.feats(d,t)
        if f is None or f['n']==0: continue
        f.update(mint=m,age=age,eligible=1,create=create,ret_age=(ret_ms/1000-create))
        for name,kw in EXITS.items():
            o=E.replay(d,t,**kw)
            f['r_'+name]=o['r']; f['cat_'+name]=o['cat']; f['why_'+name]=o.get('why',o['reason']); f['hi_'+name]=o.get('hi',np.nan)
            if name=='bot': f['hold_bot']=o.get('hold',np.nan); f['exitx_bot']=o.get('exit_x',np.nan)
        rows.append(f)
    if k%100==0: print(k,time.time()-t0,flush=True)
G=pd.DataFrame(rows)
G.to_pickle('/home/claude/work/grid.pkl')
print(G.shape); print(G.groupby('age').eligible.mean())
