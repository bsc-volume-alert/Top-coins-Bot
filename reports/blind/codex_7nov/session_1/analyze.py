import csv,gzip,json,itertools,collections,datetime,pathlib,math
import numpy as np
P=pathlib.Path('/workspace/entry-package-7nov'); O=pathlib.Path('/workspace/session_1')
def read(f):
    with gzip.open(P/f,'rt') as h: yield from csv.DictReader(h)
cov={r['mint']:r for r in read('coverage_per_mint.csv.gz')}
creation=sorted(int(r['create_ts']) for r in cov.values())
split=creation[len(creation)//2] # Set before reading outcomes: chronological median of complete candidate census.
counts=collections.Counter(); mintstats=[]; results=[]
gaprows=list(read('feed_gaps_all.csv.gz')); gaps=[]; opened={}
for r in gaprows:
    ev=r['event']; family='pool' if ev.startswith('pool-') else 'curve'; ev=ev.removeprefix('pool-'); t=int(r['ts'])
    if ev in ('idle','closed') and family not in opened: opened[family]=t
    if ev=='open' and family in opened: gaps.append((opened.pop(family),t,family))
for family,t in opened.items():gaps.append((t,10**12,family))
# Known outages are exclusion intervals, not evidence of complete capture elsewhere.
def stamp(s):return int(datetime.datetime.fromisoformat(s).replace(tzinfo=datetime.timezone.utc).timestamp())
for a,b in [('2026-11-06T20:40','2026-11-06T20:42'),('2026-11-06T20:57','2026-11-06T21:06'),('2026-11-06T23:33','2026-11-06T23:35'),('2026-11-07T00:06','2026-11-07T00:08'),('2026-11-07T00:26:30','2026-11-07T00:27:30'),('2026-11-06T21:40','2026-11-06T21:45')]:gaps.append((stamp(a),stamp(b),'all'))
for f in sorted(P.glob('trades_part_*.csv.gz')):
  with gzip.open(f,'rt') as h:
   for mint,group in itertools.groupby(csv.DictReader(h),lambda r:r['mint']):
    rows=list(group); counts['raw_rows']+=len(rows); seen=set(); unique=[]
    for r in rows:
     fingerprint=tuple(r[k] for k in ('mint','sig','wallet','is_buy','sol','tokens','venue','vsol','vtok','pool_base_raw','pool_quote_raw'))
     if fingerprint in seen:counts['duplicate_rows']+=1;continue
     seen.add(fingerprint);unique.append(r)
     counts['unique_rows']+=1
     if not r['recv_ms']: counts['missing_receipt_rows']+=1
     if not r['vsol'] or not r['vtok']:counts['missing_reserves_rows']+=1
     if r['venue']=='pumpswap':counts['pool_rows']+=1
    rows=sorted(unique,key=lambda r:(int(r['slot']),int(r['ev_idx']) if r['ev_idx'] else -1,int(r['row_id'])))
    c=int(cov[mint]['create_ts']); half='earlier' if c<split else 'later'; decision=c+60; horizon=c+120
    gross=0; retain=None; missing=False; prebuffer=0
    # Receipt ordering is needed for real operational gross-volume eligibility.
    for r in sorted(rows,key=lambda r:float(r['recv_ms']) if r['recv_ms'] else float('inf')):
     if not r['recv_ms']:missing=True;continue
     if int(r['recv_ms'])>decision*1000:continue
     prebuffer+=1
     if r['is_buy']=='1':gross+=float(r['sol'])
     if gross>=15 and retain is None:retain=int(r['recv_ms'])/1000
    eligible=retain is not None
    stats={'mint':mint,'half':half,'create_ts':c,'rows':len(rows),'gross_known_60':gross,'eligible':eligible,'missing_any_receipt':missing,'prebuffer_60':prebuffer}
    mintstats.append(stats)
    if not eligible:continue
    res={'mint':mint,'half':half,'create_ts':c,'decision':decision,'horizon':horizon,'status':'unknown'}
    def state(t):
     rs=[r for r in rows if int(r['ts'])<=t]
     return rs[-1] if rs else None
    b=state(decision+1); s=state(horizon)
    reasons=[]
    if any(a<=horizon and z>=c for a,z,_ in gaps):reasons.append('logged_gap_or_outage')
    if any(int(rows[i]['ts'])<int(rows[i-1]['ts']) for i in range(1,len(rows))):reasons.append('time_order_contradiction')
    if prebuffer>12000:reasons.append('buffer_limit')
    for label,r in [('buy',b),('sell',s)]:
     if r is None:reasons.append(label+'_no_state');continue
     if r['venue']=='pumpswap':reasons.append(label+'_pool_unvalidated');continue
     if not r['vsol'] or not r['vtok']:reasons.append(label+'_no_reserves');continue
     q=float(r['vsol'])/1e9; v=float(r['vtok'])/1e6
     if q<=0 or v<=0 or q/v>4.11e-7:reasons.append(label+'_invalid_reserves')
    if not reasons:
     qb=float(b['vsol'])/1e9;vb=float(b['vtok'])/1e6;qs=float(s['vsol'])/1e9;vs=float(s['vtok'])/1e6
     for stake in (.2,.02):
      tokens=vb*(stake*.9875)/(qb+stake*.9875)
      proceeds=qs*tokens/(vs+tokens)*.9875
      res['net_'+str(stake)]=proceeds-stake-.0015
     res['status']='diagnostic_only'
    res['reasons']=reasons;results.append(res)
summary={'split_ts':split,'split_utc':datetime.datetime.fromtimestamp(split,datetime.timezone.utc).isoformat(),'coverage_mints':len(cov),'coverage_no_rows':sum(int(r['rows_exported'])==0 for r in cov.values()),'reconciliation_mismatch':sum(r['reconciled']!='1' for r in cov.values()),'counts':dict(counts),'gaps':gaps,'halves':{}}
rng=np.random.default_rng(20261108)
for half in ('earlier','later'):
 rs=[r for r in results if r['half']==half]; good=[r for r in rs if r['status']=='diagnostic_only']; n=sum(1 for r in cov.values() if ('earlier' if int(r['create_ts'])<split else 'later')==half)
 out={'selected_mints':n,'attempted':len(rs),'diagnostic_scored':len(good),'diagnostic_unknown':len(rs)-len(good),'unknown_reasons':dict(collections.Counter(x for r in rs for x in r['reasons']))}
 events=[]
 for r in rs:events.extend([(r['decision']+1,1),(r['horizon'],-1)])
 active=peak=0
 for t,d in sorted(events):active+=d;peak=max(peak,active)
 out['attempted_peak_concurrent']=peak
 out['mints_missing_any_receipt']=sum(r['half']==half and r['missing_any_receipt'] for r in mintstats)
 for size in (.2,.02):
  x=np.array([r['net_'+str(size)] for r in good]);returns=x/size
  if len(x):
   boot=np.array([rng.choice(returns,len(returns),replace=True).mean() for _ in range(10000)])
   # Unknowns cost full stake + fixed fee; selected-population denominator only.
   worst=np.r_[x,np.repeat(-size-.0015,len(rs)-len(good)),np.zeros(n-len(rs))]
   lb=np.array([rng.choice(worst,n,replace=True).mean() for _ in range(10000)])
   out[str(size)]={'net_sol':float(x.sum()),'mean_return':float(returns.mean()),'median_return':float(np.median(returns)),'win_rate':float((x>0).mean()),'mean_return_ci95':np.quantile(boot,[.025,.975]).tolist(),'net_without_best':float(x.sum()-x.max()),'loss_ge50_rate':float((returns<=-.5).mean()),'selected_lower_bound_per_launch':float(worst.mean()),'selected_lower_bound_one_sided95':float(np.quantile(lb,.05))}
 out['strict_validated_scored']=0;out['strict_unknown']=len(rs);summary['halves'][half]=out
(O/'summary.json').write_text(json.dumps(summary,indent=2))
(O/'diagnostic_entries.json').write_text(json.dumps(results,indent=2))
(O/'mint_audit.json').write_text(json.dumps(mintstats,indent=2))
print(json.dumps(summary,indent=2))
