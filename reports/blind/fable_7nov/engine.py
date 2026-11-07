"""Replay engine mapping onto the 7 Nov brief's evaluation steps.
Decisions use recv_ms (receipt); execution uses block time ts with landing delays.
"""
import numpy as np, pandas as pd, pickle, os
W='/home/claude/work/'
FEE_CURVE=0.0095+0.0030     # protocol + creator (brief)
FEE_POOL=0.0020+0.0005+0.0030  # LP + protocol + coin-creator
FIXED=0.0015                 # SOL per round trip
VTOK_COMPLETE=2.799e14       # virtual token reserve when real reserves hit 0 (1.073e15-793.1e12)
VSOL_MAX=1.15e11             # curve maximum virtual SOL (115 SOL)
BUY_LAND=1000; SELL_LAND=700
POOL_FROM=1794000660  # 2026-11-06 19:31 UTC: pool trades kept for retained launches from here

def build(trades_pkl=W+'trades_clean.pkl', out=W+'mints_arr.pkl'):
    t=pd.read_pickle(trades_pkl)
    q=np.where(t.venue=='pumpswap', t.pool_quote_raw.fillna(t.vsol), t.vsol).astype(float)
    b=np.where(t.venue=='pumpswap', t.pool_base_raw.fillna(t.vtok), t.vtok).astype(float)
    t['q']=q; t['b']=b; t['ispool']=(t.venue=='pumpswap').astype(np.int8)
    t['recv']=t.recv_ms.values
    D={}
    for m,d in t.groupby('mint',sort=False):
        D[m]=dict(ts=d.ts.values.astype(np.int64), recv=d.recv.values.astype(float), q=d.q.values, b=d.b.values,
                  pool=d.ispool.values, buy=d.is_buy.values.astype(np.int8), sol=d.sol.values.astype(float),
                  wallet=d.wallet.values, create=int(d.create_ts.iloc[0]), slot=d.slot.values.astype(np.int64),
                  price=d.price_sol.values.astype(float))
    pickle.dump(D,open(out,'wb'))
    return D

def load_gaps():
    g=pd.read_csv('/home/claude/top-coins-bot/feed_gaps_all.csv.gz')
    g=g[~g.event.str.startswith('pool')]  # curve feed; pool feed gaps handled separately
    gaps=[]; cur=None
    for _,r in g.sort_values('ts').iterrows():
        if r.event in ('closed','idle','error') and cur is None: cur=r.ts
        if r.event=='open' and cur is not None: gaps.append((cur,r.ts)); cur=None
    if cur is not None: gaps.append((cur, 4e9))
    # known outages from manifest (UTC)
    man=[('2026-11-06 20:40','2026-11-06 20:42'),('2026-11-06 20:57','2026-11-06 21:06'),('2026-11-06 23:33','2026-11-06 23:35'),('2026-11-07 00:06','2026-11-07 00:08'),('2026-11-07 00:26:30','2026-11-07 00:27:30')]
    for a,bb in man: gaps.append((pd.Timestamp(a).timestamp(),pd.Timestamp(bb).timestamp()))
    return sorted(gaps)

GAPS=None
def in_gap(t0,t1):
    global GAPS
    if GAPS is None: GAPS=load_gaps()
    for a,b in GAPS:
        if a<t1 and b>t0: return True
    return False

def state_at(d, t_ms):
    """index of last trade with block time ts*1000 <= t_ms (events already ordered slot,ev_idx,row_id); -1 if none"""
    i=np.searchsorted(d['ts']*1000, t_ms, side='right')-1
    return i

def fee_for(pool): return FEE_POOL if pool else FEE_CURVE

def buy(d,i,stake):
    """buy on state i; returns tokens_raw or None if unavailable"""
    if i<0: return None
    q,b,pool=d['q'][i],d['b'][i],d['pool'][i]
    if not(q>0 and b>0): return None
    if not pool:
        if b<=VTOK_COMPLETE or q>VSOL_MAX: return None  # curve complete / invalid: cannot buy on curve
    lam=stake*1e9*(1-fee_for(pool))
    tok=b*lam/(q+lam)
    if not pool and (b-tok)<VTOK_COMPLETE: return None
    return tok

def sell_value(d,i,tok):
    q,b,pool=d['q'][i],d['b'][i],d['pool'][i]
    if not(q>0 and b>0): return None
    if not pool and b<=VTOK_COMPLETE: return None  # curve complete, no pool state yet: unsellable
    lam=q*tok/(b+tok)*(1-fee_for(pool))
    return lam/1e9

def replay(d, t_ms, stake=0.2, trail=0.40, horizon=7200, tp=None, exit_mode='trail', fixed_hold=None, cov_check=True, trail_pool=None):
    """Enter at decision time t_ms (recv-based). Returns dict with net sol r, category.
    exit_mode: 'trail' (trail from running high on marked price, kept through migration; trail_pool overrides trail once on pool),
               'time' (sell at t+fixed_hold s)."""
    create=d['create']
    land=t_ms+BUY_LAND
    i0=state_at(d,land)
    out=dict(t=t_ms, cat='c', r=np.nan, reason='')
    if cov_check and in_gap(t_ms/1000, land/1000+1): out['reason']='gap@fill'; return out
    if i0>=0 and d['pool'][i0] and create<POOL_FROM: out['reason']='pool-precapture'; return out
    tok=buy(d,i0,stake)
    if tok is None: out['reason']='fill-unavailable'; return out
    p0=d['q'][i0]/d['b'][i0]
    ts=d['ts']; recv=d['recv']; q=d['q']; b=d['b']; n=len(ts)
    horizon_ms=t_ms+horizon*1000
    trig_ms=None; why='horizon'
    if exit_mode=='time':
        trig_ms=t_ms+fixed_hold*1000; why='time'; sell_at=trig_ms+SELL_LAND
    else:
        rr=recv[i0+1:]
        if np.isnan(rr).any(): out['reason']='no-recv'; return out
        k=np.searchsorted(rr, horizon_ms, side='right')  # rr is not guaranteed sorted; approximate with mask
        mask=rr<=horizon_ms
        idx=np.nonzero(mask)[0]
        if len(idx):
            x=(q[i0+1:][idx]/b[i0+1:][idx])/p0
            hi=np.maximum.accumulate(np.maximum(x,1.0))
            if trail_pool is not None:
                tr=np.where(d['pool'][i0+1:][idx]==1, trail_pool, trail)
            else: tr=trail
            cond=x<=hi*(1-tr)
            if tp is not None: cond=cond|(x>=tp)
            hit=np.nonzero(cond)[0]
            if len(hit):
                j=idx[hit[0]]; trig_ms=rr[j]; why='tp' if (tp is not None and x[hit[0]]>=tp) else 'trail'
                out['hi']=float(hi[hit[0]])
            else: out['hi']=float(hi[-1])
        else: out['hi']=1.0
        if trig_ms is None: sell_at=horizon_ms
        else: sell_at=trig_ms+SELL_LAND
    i1=state_at(d,sell_at)
    if cov_check and in_gap((trig_ms or horizon_ms)/1000, sell_at/1000+1): out['reason']='gap@exit'; return out
    if i1>=0 and d['pool'][i1] and create<POOL_FROM: out['reason']='pool-precapture'; return out
    if i1>=0 and (not d['pool'][i1]) and d['b'][i1]<=VTOK_COMPLETE and create<POOL_FROM: out['reason']='pool-precapture'; return out
    v=sell_value(d,i1,tok)
    if v is None: out['reason']='exit-unavailable'; return out
    if cov_check and (not d['pool'][i1]) and sell_at/1000 > create+125*60: out['reason']='beyond-capture'; return out
    net=v-stake-FIXED
    out.update(cat='a', r=net/stake, net=net, why=why, hold=(sell_at-t_ms)/1000, exit_x=(q[i1]/b[i1])/p0, i0=i0, i1=i1, tokens=tok, fill_x=p0)
    return out

def feats(d, t_ms):
    """features from trades received by t_ms (recv_ms<=t_ms)."""
    recv=d['recv']; ok=recv<=t_ms
    if np.isnan(recv).any(): return None
    k=ok.sum()
    if k==0: return dict(n=0)
    sol=d['sol'][:k]; buy=d['buy'][:k]; w=d['wallet'][:k]; ts=d['ts'][:k]; q=d['q'][:k]; b=d['b'][:k]; pool=d['pool'][:k]
    # NB: ok may not be a prefix if recv out of order; use mask instead
    m=ok
    sol=d['sol'][m]; buy=d['buy'][m]; w=d['wallet'][m]; ts=d['ts'][m]; q=d['q'][m]; b=d['b'][m]; pool=d['pool'][m]; rc=recv[m]
    gross=sol[buy==1].sum(); sells=sol[buy==0].sum()
    px=q/b; px_now=px[-1]; px_hi=px.max()
    bw=pd.Series(sol[buy==1]).groupby(w[buy==1]).sum()
    sw=pd.Series(sol[buy==0]).groupby(w[buy==0]).sum()
    hold=(bw-sw.reindex(bw.index).fillna(0))
    nbuyers=len(bw); holding=(hold>0.05*bw).sum()
    top=bw.sort_values(ascending=False)
    age=t_ms/1000-d['create']
    # last 10 s / 20 s net by receipt time
    recent=(rc>t_ms-10000)
    net10=(sol[recent&(buy==1)].sum()-sol[recent&(buy==0)].sum())
    recent20=(rc>t_ms-20000)
    net20=(sol[recent20&(buy==1)].sum()-sol[recent20&(buy==0)].sum())
    first_slot=d['slot'][m][0]; same_slot=(d['slot'][m]==first_slot)&(buy==1)
    cum=np.cumsum(np.where(buy==1,sol,0.0)); ret_idx=np.searchsorted(cum,15.0)
    ret_age=(rc[ret_idx]/1000-d['create']) if ret_idx<len(cum) else np.nan
    return dict(n=int(m.sum()), gross=gross, sells=sells, net=gross-sells, nbuy=int((buy==1).sum()), nsell=int((buy==0).sum()),
        nbuyers=nbuyers, holding=int(holding), mc_sol=px_now*1e6,  # px lamports/raw-token -> SOL/token = px*1e-3; x 1e9 supply
        px=px_now, px_hi=px_hi, dd=px_now/px_hi, top1=top.iloc[0] if len(top) else 0, top3=top.iloc[:3].sum() if len(top) else 0,
        bundle_sol=sol[same_slot].sum(), nbundle=int(same_slot.sum()), net10=net10, net20=net20, age=age, ret_age=ret_age,
        pool=int(pool[-1]), sellers=len(sw), maxbuy=sol[buy==1].max() if gross>0 else 0, nsell_wallets=len(sw),
        last_recv_lag=(t_ms-rc.max())/1000)
