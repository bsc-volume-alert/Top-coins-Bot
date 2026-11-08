"""Event-triggered entries (on_trade style): decision at the receipt of the first trade (after retention, within 2 h, within 600 s of creation) meeting a condition."""
import sys; sys.path.insert(0,'/home/claude/r2')
import pickle, numpy as np, pandas as pd, engine_r2 as E, time
U=pickle.load(open('/home/claude/r2/U.pkl','rb'))
G0=pd.read_pickle('/home/claude/r2/grid_r2.pkl'); r0=G0[G0.dec=='r0']; inst=set(r0[(r0.mc_sol>=380)|(r0.gross>=80)].mint)
tok=pd.read_csv('/home/claude/data_r2/tokens_window.csv.gz').set_index('mint')
SPLIT=pd.Timestamp('2026-11-07 03:22').timestamp()
EXITS={'tr20':dict(trail=0.20),'tr30':dict(trail=0.30),'tp13tr20':dict(tp=1.3,trail=0.20),'tp15tr30':dict(tp=1.5,trail=0.30),'h30':dict(horizon=30),'h60':dict(horizon=60),'h300':dict(horizon=300)}
MAXAGE=600
def scan(d, cond):
    """cond(i, state) -> bool evaluated at each received trade i (receipt order) after retention. state carries running aggregates."""
    ra=d['retained_at']; c=d['create']; RO=d['RO']; RT=d['RT']
    st=dict(gross=0.0,sells=0.0,hi=0.0,buyers=set(),nbuy=0,nsell=0,big_sell_t=None,big_sell_px=None,lo_since_sell=None,last_px=None,buyers_t=[])
    for k in range(len(RO)):
        i=RO[k]; t=RT[k]
        if d['pool'][i]: break
        sol=d['sol'][i]; px=d['px'][i]; isb=d['buy'][i]==1
        if isb: st['gross']+=sol; st['nbuy']+=1; st['buyers'].add(d['wallet'][i]); st['buyers_t'].append(t)
        else:
            st['sells']+=sol; st['nsell']+=1
            if sol>=1.0 and (st['big_sell_t'] is None or t-st['big_sell_t']>30): st['big_sell_t']=t; st['big_sell_px']=st['last_px']; st['lo_since_sell']=px
        if st['big_sell_t'] is not None: st['lo_since_sell']=min(st['lo_since_sell'],px)
        st['hi']=max(st['hi'],px); st['last_px']=px
        if t<ra or t-c>MAXAGE: continue
        if cond(d,i,t,sol,isb,px,st): return t
    return None
CONDS={
 'big_buy_newhigh': lambda d,i,t,sol,isb,px,st: isb and sol>=2.0 and px>=st['hi'] and t>d['retained_at'],
 'big_buy3_newhigh': lambda d,i,t,sol,isb,px,st: isb and sol>=3.0 and px>=st['hi'] and t>d['retained_at'],
 'newhigh_after30s': lambda d,i,t,sol,isb,px,st: isb and px>=st['hi'] and t-d['create']>=30 and t>d['retained_at'],
 'absorbed_sell': lambda d,i,t,sol,isb,px,st: isb and st['big_sell_t'] is not None and t-st['big_sell_t']<=20 and st['big_sell_px'] and px>=st['big_sell_px']*0.98 and st['lo_since_sell']<st['big_sell_px']*0.97,
 'buyers20_in30s': lambda d,i,t,sol,isb,px,st: isb and len(st['buyers'])>=20 and sum(1 for x in st['buyers_t'] if x>t-30)>=10,
 'buyers15_fast': lambda d,i,t,sol,isb,px,st: isb and len(st['buyers'])>=15 and t-d['create']<=20,
 'net_gt25': lambda d,i,t,sol,isb,px,st: isb and (st['gross']-st['sells'])>=25,
 'net_gt40': lambda d,i,t,sol,isb,px,st: isb and (st['gross']-st['sells'])>=40,
 'gross30_sells_lt10pct': lambda d,i,t,sol,isb,px,st: isb and st['gross']>=30 and st['sells']<=0.1*st['gross'],
 'dip35_rebuy': lambda d,i,t,sol,isb,px,st: isb and sol>=0.5 and px<=0.65*st['hi'] and st['hi']>0 and (st['gross']-st['sells'])>=10,
}
rows=[]; t0=time.time()
for n,(m,d) in enumerate(U.items()):
    if m in inst: continue
    for cn,cond in CONDS.items():
        t=scan(d,cond)
        if t is None: continue
        f=E.feats(d,t); f.update(mint=m,cond=cn,t=t,create=d['create'],half='H1' if d['create']<SPLIT else 'H2')
        for en,kw in EXITS.items():
            o=E.replay(d,t,**kw); f['r_'+en]=o['r']; f['cat_'+en]=o['cat']
        rows.append(f)
    if n%500==0: print(n,round(time.time()-t0),flush=True)
R=pd.DataFrame(rows); R.to_pickle('/home/claude/r2/events_r2.pkl')
for cn in CONDS:
    for h in ['H1','H2']:
        x=R[(R.cond==cn)&(R.half==h)]; line=f'{cn:24s} {h} n={len(x):4d} '
        for e in EXITS:
            a=x[x['cat_'+e]=='scored']['r_'+e]; line+=f'|{e} {a.mean():+.3f}/{(a>0).mean():.2f}/{len(a)} '
        print(line)
