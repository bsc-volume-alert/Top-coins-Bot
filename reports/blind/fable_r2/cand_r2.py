"""Candidate FTC-R0: first-time creator (no earlier launch by the same creator in the census), enter at the retention trade, time exit."""
import sys; sys.path.insert(0,'/home/claude/r2')
import pandas as pd, numpy as np, pickle, engine_r2 as E
U=pickle.load(open('/home/claude/r2/U.pkl','rb')); G=pd.read_pickle('/home/claude/r2/grid_r2_clean.pkl')
tok=pd.read_csv('/home/claude/data_r2/tokens_window.csv.gz').sort_values('create_ts'); tok['creator_prior']=tok.groupby('creator').cumcount()
CP=tok.set_index('mint').creator_prior
SPLIT=pd.Timestamp('2026-11-07 03:22').timestamp()
r0=G[G.dec=='r0']
cands=[m for m in r0.mint if CP.get(m,99)==0]
print('first-time-creator retained launches',len(cands),'of',len(r0))
EX={'h15':dict(horizon=15),'h20':dict(horizon=20),'h30':dict(horizon=30),'h45':dict(horizon=45),'h60':dict(horizon=60),'tp13tr20':dict(tp=1.3,trail=0.2),'tp12h30':dict(tp=1.2,horizon=30),'tp15h60':dict(tp=1.5,horizon=60)}
def summarize(R,label):
    line=f'{label:12s}'
    for size in [0.2,0.02]:
        for h in ['H1','H2']:
            x=R[(R['size']==size)&(R.half==h)]; a=x[x.cat=='scored'].r; nb=a.drop(a.idxmax()) if len(a)>1 else a
            worst=-(1+0.0015/size); lb=x.r.where(x.cat=='scored',worst)
            rng=np.random.default_rng(20261108); n=len(x); boots=np.array([lb.values[rng.integers(0,n,n)].mean() for _ in range(4000)])
            line+=f' | {size} {h} n={n} unk={(x.cat!="scored").mean():.2f} mean={a.mean():+.3f} med={a.median():+.3f} win={(a>0).mean():.2f} nobest={nb.mean():+.3f} L50={(a<=-0.5).mean():.2f} LB5={np.percentile(boots,5):+.3f}'
    print(line,flush=True)
if __name__=='__main__':
    for dec in [0,5]:
      for en,kw in EX.items():
        rows=[]
        for m in cands:
            d=U[m]; t=d['retained_at']+dec
            for size in [0.2,0.02]:
                o=E.replay(d,t,size=size,**kw); rows.append(dict(mint=m,size=size,half='H1' if d['create']<SPLIT else 'H2',cat=o['cat'],r=o['r'],net=o.get('net',np.nan),t=t,why=o['why']))
        R=pd.DataFrame(rows); summarize(R,f'r{dec} {en}')
        if dec==0 and en=='h30': R.to_pickle('/home/claude/r2/cand_r0h30.pkl')
