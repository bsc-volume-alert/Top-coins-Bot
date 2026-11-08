from pathlib import Path
import pandas as pd, numpy as np, json, hashlib
P=Path('/workspace/entry-package-7nov'); O=Path('/workspace/session_3')
cov=pd.read_csv(P/'coverage_per_mint.csv.gz'); cs=cov.set_index('mint').create_ts.to_dict(); split=(cov.create_ts.min()+cov.create_ts.max())/2
fg=pd.read_csv(P/'feed_gaps_all.csv.gz'); gaps=[]; start=None
for r in fg.itertuples():
 if r.event in ['closed','idle'] and start is None:start=r.ts
 if r.event=='open' and start is not None:gaps.append((start,r.ts));start=None
if start is not None:gaps.append((start,float('inf')))
for a,b in [('2026-11-06 20:40','2026-11-06 20:42'),('2026-11-06 20:57','2026-11-06 21:06'),('2026-11-06 23:33','2026-11-06 23:35'),('2026-11-07 00:06','2026-11-07 00:08'),('2026-11-07 00:26:30','2026-11-07 00:27:30')]:gaps.append((pd.Timestamp(a,tz='UTC').timestamp(),pd.Timestamp(b,tz='UTC').timestamp()))
results=[]; audits=[]
cols=['row_id','mint','sig','slot','ev_idx','ts','recv_ms','wallet','is_buy','sol','tokens','vsol','vtok','venue']
def process(d):
 m=d.mint.iloc[0]; creation=cs[m]; t=creation+60; end=creation+120
 n=len(d); d=d.drop_duplicates(['mint','sig','wallet','is_buy','sol','tokens','venue','vsol','vtok']).sort_values(['slot','ev_idx','row_id'],na_position='first')
 audits.append(dict(mint=m,rows=n,dupes=n-len(d),missing_recv=int(d.recv_ms.isna().sum()),missing_reserves=int((d.vsol.isna()|d.vtok.isna()).sum()),contradictory_time=int((d.ts.diff()<0).sum()),rows_pre60=int((d.ts<=t).sum()),received_pre60=int((d.recv_ms<=t*1000).sum())))
 for mode in ['receipt','event']:
  h=d[(d.recv_ms<=t*1000) if mode=='receipt' else (d.ts<=t)]
  gross=h.loc[h.is_buy==1,'sol'].sum(); net=gross-h.loc[h.is_buy==0,'sol'].sum(); buyers=h.loc[h.is_buy==1,'wallet'].nunique()
  z=dict(mint=m,create_ts=creation,half='early' if creation<split else 'late',mode=mode,gross=gross,net=net,buyers=buyers,attempt=False,status='abstain')
  if gross<15 or net<10 or buyers<20 or len(h)==0 or h.iloc[-1].venue not in ['curve',np.nan] and pd.notna(h.iloc[-1].venue):results.append(z);continue
  z['attempt']=True
  # No asserted completeness: following values are conditional event-state diagnostics only.
  state=d[d.ts<=t+1]
  migrations=d[(d.venue=='pumpswap') & ((d.recv_ms<=end*1000) if mode=='receipt' else (d.ts<=end))]
  exit_at=end if migrations.empty else min(end, (migrations.recv_ms.min()/1000 if mode=='receipt' else migrations.ts.min())+.7)
  exitstate=d[d.ts<=exit_at]
  reason=None
  if (d.ts.diff()<0).any():reason='contradictory_event_time'
  elif state.empty or exitstate.empty:reason='missing_state'
  else:
   a=state.iloc[-1];b=exitstate.iloc[-1]
   if a.venue=='pumpswap' or b.venue=='pumpswap':reason='pool_config_unvalidated'
   elif any(pd.isna(v) or v<=0 for v in [a.vsol,a.vtok,b.vsol,b.vtok]):reason='invalid_reserves'
   elif a.vsol/a.vtok/1000>4.11e-7 or b.vsol/b.vtok/1000>4.11e-7:reason='curve_max_failed'
   elif any(x<=exit_at and y>=t for x,y in gaps):reason='logged_gap'
   elif end>creation+125*60:reason='retention'
   elif d.ts.max()<end:reason='right_censored_or_quiet'
  if reason:z['status']=reason
  else:
   z['status']='conditional_diagnostic'
   for stake in [.2,.02]:
    x=a.vsol/1e9;y=a.vtok/1e6;xx=b.vsol/1e9;yy=b.vtok/1e6
    tokens=y*stake*.9875/(x+stake*.9875);out=xx*tokens/(yy+tokens)*.9875
    z['r_'+str(stake)]=(out-stake-.0015)/stake
  results.append(z)
carry=pd.DataFrame()
for f in sorted(P.glob('trades_part_*.csv.gz')):
 for c in pd.read_csv(f,usecols=cols,chunksize=100000,low_memory=False):
  c=pd.concat([carry,c],ignore_index=True); last=c.mint.iloc[-1];carry=c[c.mint==last].copy()
  for _,d in c[c.mint!=last].groupby('mint',sort=False):process(d)
if len(carry):process(carry)
a=pd.DataFrame(audits);r=pd.DataFrame(results);a.to_csv(O/'audit.csv',index=False);r.to_csv(O/'candidate.csv',index=False)
rng=np.random.default_rng(20261108); metrics=[]
for (mode,half),g in r.groupby(['mode','half']):
 v=dict(mode=mode,half=half,n=len(g),attempts=int(g.attempt.sum()),statuses=g.status.value_counts().to_dict())
 for stake in [.2,.02]:
  rr=g.get('r_'+str(stake),pd.Series(dtype=float)).dropna().to_numpy(); key=str(stake)
  if len(rr):
   boots=np.array([rng.choice(rr,len(rr),replace=True).mean() for _ in range(10000)])
   v[key]=dict(n=len(rr),mean=float(rr.mean()),median=float(np.median(rr)),win=float((rr>0).mean()),worst50=float((rr<=-.5).mean()),without_best=float((rr.sum()-rr.max())/(len(rr)-1)) if len(rr)>1 else None,ci95=np.quantile(boots,[.025,.975]).tolist(),total_net_sol=float(rr.sum()*stake))
 metrics.append(v)
out=dict(commit='0e3be03c71949e069a7a31b5951f332bb563f68f',split=split,split_utc=str(pd.Timestamp(split,unit='s',tz='UTC')),min_create=int(cov.create_ts.min()),max_create=int(cov.create_ts.max()),mints=len(cov),audited_mints=len(a),raw_rows=int(a.rows.sum()),duplicates=int(a.dupes.sum()),missing_recv=int(a.missing_recv.sum()),missing_reserves=int(a.missing_reserves.sum()),mints_contradiction=int((a.contradictory_time>0).sum()),metrics=metrics)
(O/'results.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
