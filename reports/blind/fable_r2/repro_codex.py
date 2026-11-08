"""Reproduce Codex Round 2 headline numbers with the Fable engine: universe N per half (Codex outages incl. 21:40-21:45, split 7 Nov 01:50),
and candidate ID 34 (age 30 s, P5, hold 60 s, exit exactly at t+60 with no 0.7 s delay)."""
import sys; sys.path.insert(0,'/home/claude/r2')
import pickle, numpy as np, pandas as pd, engine_r2 as E, calendar, time as _time
def T(s): return calendar.timegm(_time.strptime(s,"%Y-%m-%d %H:%M:%S"))
E.OUTAGES.append((T("2026-11-06 21:40:00"),T("2026-11-06 21:45:00")))
START,SPLIT,END=1793950800,1794016200,1794081600
M=pickle.load(open('/home/claude/r2/mints_r2.pkl','rb'))
U={}
for m,d in M.items():
    E.prep(d)
    if d['retained_at'] is None: continue
    if any(s<d['create']+7200 and e>d['create'] for s,e in E.OUTAGES): continue
    if not (START<=d['create']<END): continue
    U[m]=d
early=[m for m,d in U.items() if d['create']<SPLIT]; late=[m for m,d in U.items() if d['create']>=SPLIT]
print('N early',len(early),'late',len(late),'total',len(U))

def p5(d,t):
    """Codex P5 at decision t: received trades only; last received must be curve & valid; gross curve buys>=15; >=20 buying wallets;
    A=net in (t-15,t] >=3 and A>=1.5*B, B=net in (t-30,t-15]."""
    k=np.searchsorted(d['RT'],t,side='right')
    if k==0: return False
    idx=d['RO'][:k]; rt=d['RT'][:k]
    last=idx[-1]
    if d['pool'][last] or not d['ok'][last]: return False
    cm=d['pool'][idx]==0
    sol=d['sol'][idx][cm]; buy=d['buy'][idx][cm]==1; w=d['wallet'][idx][cm]; age=t-rt[cm]
    sign=np.where(buy,1.0,-1.0)
    gross=sol[buy].sum()
    if gross<15: return False
    b=len(set(w[buy]))
    recent=(sign*sol)[age<15].sum(); prior=(sign*sol)[(age>=15)&(age<30)].sum()
    return recent>=3 and recent>=1.5*prior and b>=20

def run(mints,size):
    rows=[]
    for m in mints:
        d=U[m]; t=d['create']+30
        if t<d['retained_at']: continue
        if not d['pre_ok']: rows.append(dict(mint=m,cat='unknown',r=np.nan)); continue
        if not p5(d,t): continue
        o=E.replay(d,t,size=size,horizon=60)   # horizon exit = sale on state as of t+60 exactly
        rows.append(dict(mint=m,cat=o['cat'],r=o['r'],net=o.get('net',np.nan),why=o['why']))
    return pd.DataFrame(rows)
for half,mints in [('early',early),('late',late)]:
    for size in [0.2,0.02]:
        R=run(mints,size); a=R[R.cat=='scored']
        unk=(R.cat=='unknown').sum(); lower=a.net.sum()-unk*(size+0.0015)
        print(f'{half} {size}: attempts {len(R)} scored {len(a)} unknown {unk} net {a.net.sum():+.6f} lower {lower:+.6f} mean {a.r.mean():+.4%} median {a.r.median():+.4%} win {(a.r>0).mean():.2%} nobest {a.net.sum()-a.net.max():+.6f} worst {a.r.min():+.2%} per-launch point {a.net.sum()/len(mints):+.9f}')
        if size==0.2: R.to_pickle(f'/home/claude/r2/codex34_{half}.pkl')
