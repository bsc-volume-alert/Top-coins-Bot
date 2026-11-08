"""Round 2 engine: mirrors eval-1.1 (reports/blind/eval/evaluate.py) conventions, vectorised for search.
Decisions see trades with recv<=t (receipt order). Fill = state as of t+1.0 s, sell = state as of trigger+0.7 s (event order, block time).
"""
import numpy as np, pandas as pd, pickle, calendar, time as _time
W='/home/claude/r2/'; D='/home/claude/data_r2/'
FIXED=0.0015; CURVE_BPS=125; POOL_BPS=30; LAND_BUY=1.0; LAND_SELL=0.7
CURVE_MAX_PX=(30*1.073e9/(1.073e9-793.1e6))/(1.073e9-793.1e6)
RETAIN_SOL=15.0; RETAIN_MIN=125
def _t(s): return calendar.timegm(_time.strptime(s,"%Y-%m-%d %H:%M:%S"))
POOL_ALL_FROM=_t("2026-11-07 09:47:00"); POOL_RET_FROM=_t("2026-11-06 19:31:00")
OUTAGES=[(_t(a),_t(b)) for a,b in [("2026-11-06 20:40:00","2026-11-06 20:42:00"),("2026-11-06 20:57:00","2026-11-06 21:06:00"),("2026-11-06 23:33:00","2026-11-06 23:35:00"),("2026-11-07 00:06:00","2026-11-07 00:08:00"),("2026-11-07 00:26:30","2026-11-07 00:27:30")]]

def load_gaps():
    g=pd.read_csv(D+'feed_gaps_all.csv.gz'); gaps={'main':[],'pool':[]}; openat={'main':None,'pool':None}
    for _,r in g.sort_values('ts').iterrows():
        k='pool' if str(r.event).startswith('pool-') else 'main'; e=str(r.event).replace('pool-',''); t=float(r.ts)
        if e in ('closed','idle','error') and openat[k] is None: openat[k]=t
        elif e in ('open','subscribed') and openat[k] is not None: gaps[k].append((openat[k],t)); openat[k]=None
    for k in openat:
        if openat[k] is not None: gaps[k].append((openat[k],float('inf')))
    return gaps
GAPS=load_gaps()
def gap_overlap(a,b,pool):
    for s,e in OUTAGES:
        if s<b and e>a: return True
    for s,e in GAPS['main']+(GAPS['pool'] if pool else []):
        if s<b and e>a: return True
    return False

def prep(d):
    """add derived arrays: retained_at, receipt order, validity, price"""
    n=len(d['ts'])
    cum=0.0; ret=None; d['no_recv']=bool(np.isnan(d['recv']).any())
    for i in range(n):
        if d['pool'][i]: continue
        if d['buy'][i]==1: cum+=d['sol'][i]
        if d['tier']>=1 or cum>=RETAIN_SOL:
            ret=d['recv'][i]/1000 if not np.isnan(d['recv'][i]) else float(d['ts'][i]); d['ret_idx']=i; break
    d['retained_at']=ret
    rt=np.where(np.isnan(d['recv']), d['ts']*1000.0, d['recv'])/1000.0
    d['RO']=np.lexsort((np.arange(n), d['slot'], rt)); d['RT']=rt[d['RO']]
    vs=d['q']/1e9; vt=d['b']/1e6
    okc=(d['q']>0)&(d['b']>0)&((vs/np.maximum(vt,1e-12))<=CURVE_MAX_PX*1.1)
    okp=(d['q']>0)&(d['b']>0)&(d['evid']==1)
    d['ok']=np.where(d['pool']==1,okp,okc)
    d['px']=vs/np.maximum(vt,1e-12)
    pre=int((d['ts']<=ret).sum()) if ret is not None else 0
    d['pre_ok']=pre<=12000
    d['in_outage']=any(s<d['create']+7200 and e>d['create'] for s,e in OUTAGES)
    return d

def in_universe(d):
    return d['retained_at'] is not None and not d['in_outage']

def state_at(d,t):
    """index of chain state as of t (event order), or (-1, why)"""
    i=np.searchsorted(d['ts'],np.floor(t) if False else t,side='right')-1
    if i<0: return -1,'no state'
    if not d['ok'][i]: return -1,'state invalid'
    pool=bool(d['pool'][i])
    if gap_overlap(float(d['ts'][i]),t,pool): return -1,'capture gap'
    ra=d['retained_at']; c=d['create']
    if not pool and t>ra+RETAIN_MIN*60: return -1,'outside retention'
    if pool and not ((c>=POOL_ALL_FROM and t<=c+86400) or (c>=POOL_RET_FROM and t<=ra+RETAIN_MIN*60)): return -1,'outside pool capture'
    return i,None

def buy_tokens(d,i,sol,pool_bps=POOL_BPS):
    vs=d['q'][i]/1e9; vt=d['b'][i]/1e6
    if d['pool'][i]: f=pool_bps/1e4; net=sol*(1-f)
    else: f=CURVE_BPS/1e4; net=sol/(1+f)
    return vt*net/(vs+net)
def sell_sol(d,i,tok,pool_bps=POOL_BPS):
    vs=d['q'][i]/1e9; vt=d['b'][i]/1e6; f=(pool_bps if d['pool'][i] else CURVE_BPS)/1e4
    return vs*tok/(vt+tok)*(1-f)
def sell_sol_vec(d,idx,tok,pool_bps=POOL_BPS):
    vs=d['q'][idx]/1e9; vt=d['b'][idx]/1e6; f=np.where(d['pool'][idx]==1,pool_bps,CURVE_BPS)/1e4
    return vs*tok/(vt+tok)*(1-f)

def replay(d,t,size=0.2,horizon=7200,trail=None,tp=None,hold=None,trail_after=None,stop=None,pool_bps=POOL_BPS,partial=None):
    """Enter at decision t (s). Exit rules evaluated on x=(sell value - fixed)/size after each RECEIVED trade after the fill, receipt order.
    trail: exit when x<=hi*(1-trail). tp: exit when x>=tp. hold: time exit at t+hold (trigger). stop: exit when x<=stop (hard stop).
    trail_after: (level, trail2) -> use trail2 once hi>=level.  partial: not modelled (one exit per position, like the evaluator).
    Returns dict(cat, r, net, why...)."""
    out=dict(t=t,cat='unknown',r=np.nan,net=np.nan,why='')
    if not d['pre_ok']: out['why']='pre-buffer'; return out
    i0,why=state_at(d,t+LAND_BUY)
    if i0<0: out['why']='fill: '+why; return out
    tok=buy_tokens(d,i0,size,pool_bps)
    RT=d['RT']; RO=d['RO']
    j0=np.searchsorted(RT,t+LAND_BUY,side='right')
    hz=t+min(horizon,7200)
    j1=np.searchsorted(RT,hz,side='left')
    trig=None; reason='horizon'; hi_x=np.nan
    if j1>j0:
        idx=RO[j0:j1]; okm=d['ok'][idx]
        if okm.any():
            idx=idx[okm]; tr=RT[j0:j1][okm]
            x=(sell_sol_vec(d,idx,tok,pool_bps)-FIXED)/size
            hi=np.maximum.accumulate(x)
            cond=np.zeros(len(x),bool)
            if trail is not None:
                trl=np.full(len(x),trail)
                if trail_after is not None: trl=np.where(hi>=trail_after[0],trail_after[1],trl)
                cond|=x<=hi*(1-trl)
            if tp is not None: cond|=x>=tp
            if stop is not None: cond|=x<=stop
            if hold is not None: cond|=tr>=t+hold
            h=np.nonzero(cond)[0]
            if len(h):
                k=h[0]; trig=tr[k]; hi_x=hi[k]
                reason='tp' if (tp is not None and x[k]>=tp) else ('stop' if (stop is not None and x[k]<=stop) else ('hold' if (hold is not None and tr[k]>=t+hold and not (trail is not None and x[k]<=hi[k]*(1-trail))) else 'trail'))
            else: hi_x=hi[-1]
    elif hold is not None and t+hold<hz:
        pass
    if trig is None and hold is not None and t+hold<hz:
        # no received trade after t+hold before horizon: evaluator would hold to horizon (exit_signal is only polled on trades). Mirror that.
        pass
    t_sell=trig+LAND_SELL if trig is not None else hz
    i1,why=state_at(d,t_sell)
    if i1<0: out['why']='exit: '+why; out['entry_ok']=True; return out
    v=sell_sol(d,i1,tok,pool_bps); net=v-size-FIXED
    out.update(cat='scored',r=net/size,net=net,why=reason,hi=hi_x,hold_s=t_sell-t,i0=i0,i1=i1,fill_px=d['px'][i0],exit_px=d['px'][i1],fill_pool=int(d['pool'][i0]),exit_pool=int(d['pool'][i1]))
    return out

def feats(d,t):
    """features from trades received by t (receipt order prefix)."""
    k=np.searchsorted(d['RT'],t,side='right')
    if k==0: return None
    idx=d['RO'][:k]; rt=d['RT'][:k]
    sol=d['sol'][idx]; buy=d['buy'][idx]; w=d['wallet'][idx]; px=d['px'][idx]; pool=d['pool'][idx]; slot=d['slot'][idx]
    isb=buy==1
    gross=sol[isb].sum(); sells=sol[~isb].sum()
    bw=pd.Series(sol[isb]).groupby(w[isb]).sum() if isb.any() else pd.Series(dtype=float)
    sw=pd.Series(sol[~isb]).groupby(w[~isb]).sum() if (~isb).any() else pd.Series(dtype=float)
    hold=bw-sw.reindex(bw.index).fillna(0)
    nbuyers=len(bw); holding=int((hold>0.1*bw).sum()) if nbuyers else 0
    top=bw.sort_values(ascending=False) if nbuyers else bw
    age=t-d['create']; ra=d['retained_at']
    rec10=rt>t-10; rec20=rt>t-20; rec30=rt>t-30
    def net_in(m): return sol[m&isb].sum()-sol[m&~isb].sum()
    first_slot=d['slot'][0]; same=(slot==first_slot)&isb
    # creator/dev buy: first trade if buy
    dev=sol[0] if (isb[0] and len(sol)) else 0.0
    # buyers arriving in last 30 s who are new
    pre30=set(w[~rec30]); new30=len(set(w[rec30&isb])-pre30)
    # sold-out wallets: bought and sold >=90%
    soldout=int((hold<=0.1*bw).sum()) if nbuyers else 0
    px_now=px[-1]; px_hi=px.max(); px_lo=px.min()
    # price 10 s / 30 s ago
    def px_ago(s):
        kk=np.searchsorted(rt,t-s,side='right')
        return px[kk-1] if kk>0 else px[0]
    return dict(n=k,gross=gross,sells=sells,net=gross-sells,nbuy=int(isb.sum()),nsell=int((~isb).sum()),nbuyers=nbuyers,holding=holding,soldout=soldout,
        mc_sol=px_now*1e9,px=px_now,dd=px_now/px_hi,up_from_low=px_now/px_lo,top1=(top.iloc[0] if nbuyers else 0),top3=(top.iloc[:3].sum() if nbuyers else 0),
        bundle_sol=sol[same].sum(),nbundle=int(same.sum()),net10=net_in(rec10),net20=net_in(rec20),net30=net_in(rec30),nbuy30=int((rec30&isb).sum()),nsell30=int((rec30&~isb).sum()),
        new30=new30,age=age,ret_age=(ra-d['create']) if ra else np.nan,since_ret=t-ra if ra else np.nan,dev=dev,maxbuy=(sol[isb].max() if isb.any() else 0),
        sellers=len(sw),pool=int(pool[-1]),mom10=px_now/px_ago(10),mom30=px_now/px_ago(30),last_lag=t-rt[-1],
        sell_ratio=sells/max(gross,1e-9),top1_frac=(top.iloc[0]/max(gross,1e-9) if nbuyers else 0),bundle_frac=sol[same].sum()/max(gross,1e-9),
        tier=d['tier'])

def universe(M):
    U={}
    for m,d in M.items():
        if 'RO' not in d: prep(d)
        if in_universe(d): U[m]=d
    return U
