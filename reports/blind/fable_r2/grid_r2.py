import sys; sys.path.insert(0,'/home/claude/r2')
import pickle, numpy as np, pandas as pd, engine_r2 as E, time
U=pickle.load(open('/home/claude/r2/U.pkl','rb'))
DEC={'r0':('ret',0),'r5':('ret',5),'r10':('ret',10),'r20':('ret',20),'r30':('ret',30),'r60':('ret',60),
     'c30':('cre',30),'c60':('cre',60),'c90':('cre',90),'c120':('cre',120),'c180':('cre',180),'c300':('cre',300)}
EXITS={'tr20':dict(trail=0.20),'tr30':dict(trail=0.30),'tr40':dict(trail=0.40),'tr15':dict(trail=0.15),
       'tp13tr20':dict(tp=1.3,trail=0.20),'tp15tr30':dict(tp=1.5,trail=0.30),'tp2tr40':dict(tp=2.0,trail=0.40),
       'h15':dict(horizon=15),'h30':dict(horizon=30),'h60':dict(horizon=60),'h120':dict(horizon=120),'h300':dict(horizon=300),'h600':dict(horizon=600),'h7200':dict(horizon=7200),
       'st50tr40':dict(stop=0.5,trail=0.40)}
rows=[]; t0=time.time()
for k,(m,d) in enumerate(U.items()):
    ra=d['retained_at']; c=d['create']
    for dn,(base,off) in DEC.items():
        t=(ra if base=='ret' else c)+off
        if t<ra or t>c+7200: continue
        f=E.feats(d,t)
        if f is None: continue
        f.update(mint=m,dec=dn,t=t,create=c)
        for en,kw in EXITS.items():
            o=E.replay(d,t,**kw); f['r_'+en]=o['r']; f['cat_'+en]=o['cat']; f['why_'+en]=o['why']
            if en=='tr30': f['hi_tr30']=o.get('hi',np.nan); f['hold_tr30']=o.get('hold_s',np.nan)
            if en=='h7200': f['hi_h7200']=o.get('hi',np.nan)
        rows.append(f)
    if k%300==0: print(k,round(time.time()-t0),flush=True)
G=pd.DataFrame(rows); G.to_pickle('/home/claude/r2/grid_r2.pkl'); print(G.shape)
