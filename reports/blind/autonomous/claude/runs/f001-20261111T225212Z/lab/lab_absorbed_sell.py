"""Idea lab CL-L001: 'absorbed sell' entry. Frozen eval-1.1 imported unchanged (run_launch, state_at); owner common
cost scenario per RESEARCH_QUEUE.md R4: 0.2 SOL, buy lands +1 s (LAND_BUY_S), sell +0.7 s (LAND_SELL_S), curve 125 bps (CURVE_FEE_BPS),
pool 55 bps (pool_bps arg), 0.0015 SOL fixed, 30 % trail on sellable net proceeds, 2 h cap, state older than 30 s at landing = unavailable
(post-check, evaluator unchanged). Entry times are computed causally (receipt order, data received <= t only) and passed to decide()."""
import sys,pathlib,importlib.util,json,csv,types,math,statistics,collections,datetime as dt,bisect
cache=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2]); out.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('ev',cache/'evaluate.py');ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
import hashlib;assert hashlib.sha256((cache/'evaluate.py').read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86'
assert not ev.DEV_NO_EVIDENCE
START,SPLIT,END=1793950800,1794016200,1794081600
POOL_BPS=55;SIZE=0.2;TRAIL=0.30;MIN_AGE=60;MAX_AGE=1800;SELL_MIN_SOL=1.0;WIN_LO=10;WIN_HI=30;MIN_NEW_BUYERS=3;STALE=30
replay=cache/'replay'
tok,gaps,outages,meta=ev.load(str(replay),START,END)
fl=ev.fl
def iscurve(r):return r['venue']=='curve' or not r['venue']
def px(r):
    vs,vt=fl(r['vsol']),fl(r['vtok'])
    return (vs/1e9)/(vt/1e6) if vs and vt else None
def retained(info,L):
    cum=0.
    for r in L:
        if not iscurve(r):continue
        if r['is_buy']=='1':cum+=fl(r['sol']) or 0
        if info['tier']>=1 or cum>=15:
            rv=fl(r['recv_ms']);return rv/1000 if rv else fl(r['ts'])
    return None
def scan(info,L,ret):
    """Causal forward pass in receipt order. Returns (t_candidate, t_control, diagnostics)."""
    created=info['created']
    RO=sorted(L,key=lambda r:((fl(r['recv_ms']) or fl(r['ts'])*1000),int(r['slot']),int(r['row_id'])))
    RT=[(fl(r['recv_ms']) or fl(r['ts'])*1000)/1000 for r in RO]
    bigsells=[];tc=None;tctrl=None;nsell=0
    for j,r in enumerate(RO):
        t=RT[j];age=t-created
        if age>MAX_AGE:break
        if iscurve(r) and r['is_buy']!='1' and (fl(r['sol']) or 0)>=SELL_MIN_SOL:
            pb=px(RO[j-1]) if j>0 and iscurve(RO[j-1]) and ev.state_ok(RO[j-1]) else None
            bigsells.append((j,t,pb,r['wallet']));nsell+=1
        if age<MIN_AGE or t<ret:continue
        if not (iscurve(r) and ev.state_ok(r)):continue
        if tctrl is None:tctrl=t
        if tc is None:
            pnow=px(r)
            for (s,ts_,pb,w) in reversed(bigsells):
                if ts_>t-WIN_LO:continue
                if ts_<t-WIN_HI:break
                if pb is None or pnow is None or pnow<pb:continue
                buyers={RO[k]['wallet'] for k in range(s+1,j+1) if iscurve(RO[k]) and RO[k]['is_buy']=='1' and RO[k]['wallet']!=w}
                if len(buyers)>=MIN_NEW_BUYERS:tc=t;break
        if tc is not None and tctrl is not None:break
    return tc,tctrl,{'big_sells_in_window':nsell}
def exit_signal(p):return p.hi>0 and p.x<=p.hi*(1-TRAIL)
def run(name,m,info,L,tstar):
    if tstar is None:return {'cat':'abstain','why':'no entry condition'}
    mod=types.SimpleNamespace(decide=lambda v:v.t>=tstar,exit_signal=exit_signal)
    R={'decision_offsets':[],'on_trade':True,'horizon_s':7200,'sizes':[SIZE]}
    res,hyp=ev.run_launch(mod,R,m,info,L,gaps,outages,meta,POOL_BPS)
    rec={'cat':res['cat'],'why':res.get('why'),'entry_t':res.get('entry_t'),'hypothetical':hyp}
    if res.get('entry_t') is not None:
        te=res['entry_t'];fs,fw=ev.state_at(L,te+ev.LAND_BUY_S,gaps,outages,info['created'],ret_cache[m])
        rec['fill_state_age_s']=(te+ev.LAND_BUY_S-fl(fs['ts'])) if fs else None
        rec['entry_age_s']=te-info['created']
    if res['cat']=='scored':
        s=res['sizes'][str(SIZE)];rec.update(net_sol=s['net_sol'],ret=s['ret'],exit=s['exit'],fill_venue=s['fill_venue'],exit_venue=s['exit_venue'])
        # exit staleness post-check: find t_sell by re-deriving exit state time is not returned; approximate via exit=='horizon' -> te+7200, else unknown trigger time -> we re-scan
        if s['exit']=='horizon':ts_=te+7200
        else:
            # re-derive trigger time exactly as run_launch does
            RO=sorted(L,key=lambda r:((fl(r['recv_ms']) or fl(r['ts'])*1000),int(r['slot']),int(r['row_id'])));RT=[(fl(r['recv_ms']) or fl(r['ts'])*1000)/1000 for r in RO]
            tokq=ev.buy(fs,SIZE,POOL_BPS);hi=-1e9;ts_=None
            for j in range(bisect.bisect_right(RT,te+ev.LAND_BUY_S),len(RO)):
                r=RO[j];tr=RT[j]
                if tr>=te+7200:break
                if not ev.state_ok(r):continue
                x=(ev.sell(r,tokq,POOL_BPS)-ev.FIXED_FEE_SOL)/SIZE;hi=max(hi,x)
                if hi>0 and x<=hi*(1-TRAIL):ts_=tr+ev.LAND_SELL_S;break
        ss,sw=ev.state_at(L,ts_,gaps,outages,info['created'],ret_cache[m]) if ts_ else (None,'n/a')
        rec['exit_state_age_s']=(ts_-fl(ss['ts'])) if ss else None;rec['t_sell']=ts_
    return rec
ret_cache={}
stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};audit=collections.Counter();rows=[]
for m,L in ev.iter_mints(str(replay),tok,stats):
    info=tok[m];ret=retained(info,L)
    if ret is None:audit['not_retained']+=1;continue
    if any(s<info['created']+7200 and e>info['created'] for s,e in outages):audit['outage_excluded']+=1;continue
    ret_cache[m]=ret;half='early' if info['created']<SPLIT else 'late';audit['eligible_'+half]+=1
    tc,tctrl,diag=scan(info,L,ret)
    for name,tstar in (('candidate',tc),('control',tctrl)):
        rec=run(name,m,info,L,tstar);rec.update(spec=name,mint=m,half=half,created=info['created'],**diag);rows.append(rec)
    if sum(audit[k] for k in audit if k.startswith('eligible'))%500==0:print('ELIGIBLE',dict(audit),flush=True)
assert stats['non_contiguous']==0
keys=['spec','mint','half','created','cat','why','entry_t','entry_age_s','fill_state_age_s','t_sell','exit_state_age_s','net_sol','ret','exit','fill_venue','exit_venue','hypothetical','big_sells_in_window']
with open(out/'ledger.csv','w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=keys,extrasaction='ignore');w.writeheader();w.writerows(rows)
def summ(rr):
    att=[r for r in rr if r['cat']!='abstain'];filled=[r for r in att if r['cat']=='scored' or (r['cat']=='unknown' and r['why'].startswith('exit'))]
    unav=[r for r in att if r['cat']=='unknown' and r['why'].startswith('fill')]
    stale_fill=[r for r in filled if (r.get('fill_state_age_s') or 0)>STALE]
    resolved=[r for r in filled if r['cat']=='scored' and r not in stale_fill];uncertain=[r for r in filled if r['cat']=='unknown' and r not in stale_fill]
    stale_exit=[r for r in resolved if (r.get('exit_state_age_s') or 0)>STALE]
    res2=[r for r in resolved if r not in stale_exit]
    def block(rs):
        if not rs:return {'n':0}
        v=sorted(r['net_sol'] for r in rs);rets=[r['ret'] for r in rs]
        return {'n':len(rs),'total_sol':math.fsum(v),'mean_ret':statistics.mean(rets),'median_ret':statistics.median(rets),'win_rate':sum(x>0 for x in v)/len(v),'share_loss_gt50':sum(x< -0.5*SIZE for x in v)/len(v),'without_best1_sol':math.fsum(v[:-1]),'without_best3_sol':math.fsum(v[:-3]),'best3_sol':v[-3:],'worst_sol':v[0],'exit_trigger':sum(r['exit']=='trigger' for r in rs),'exit_horizon':sum(r['exit']=='horizon' for r in rs)}
    return {'attempted':len(att),'filled':len(filled),'unavailable_fill':len(unav),'unavailable_reasons':dict(collections.Counter(r['why'] for r in unav)),'stale_fill_gt30s_marked_unavailable':len(stale_fill),
            'resolved_raw_evaluator':block([r for r in filled if r['cat']=='scored']),'uncertain_exit':len(uncertain),'uncertain_reasons':dict(collections.Counter(r['why'] for r in uncertain)),
            'stale_exit_gt30s_marked_uncertain':len(stale_exit),'resolved_after_staleness':block(res2),
            'by_half':{h:block([r for r in res2 if r['half']==h]) for h in ('early','late')},'entry_age_median':statistics.median([r['entry_age_s'] for r in att if r.get('entry_age_s') is not None]) if att else None}
summary={'spec':{'size':SIZE,'pool_bps':POOL_BPS,'curve_bps':ev.CURVE_FEE_BPS,'fixed':ev.FIXED_FEE_SOL,'land_buy_s':ev.LAND_BUY_S,'land_sell_s':ev.LAND_SELL_S,'trail':TRAIL,'horizon_s':7200,'entry_window_age_s':[MIN_AGE,MAX_AGE],'sell_min_sol':SELL_MIN_SOL,'sell_window_before_t_s':[WIN_LO,WIN_HI],'min_new_buyers':MIN_NEW_BUYERS,'stale_s':STALE},
 'audit':dict(audit),'stream_stats':{k:v for k,v in stats.items() if k!='_done'},'candidate':summ([r for r in rows if r['spec']=='candidate']),'control':summ([r for r in rows if r['spec']=='control'])}
json.dump(summary,open(out/'results.json','w'),indent=2);print(json.dumps(summary,indent=2))
