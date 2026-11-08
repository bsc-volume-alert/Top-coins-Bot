import csv,gzip,json,math
from pathlib import Path
from collections import Counter,defaultdict
import numpy as np
P=Path('/workspace/entry-package-7nov'); O=Path('/workspace/session_2')
coverage={x['mint']:x for x in csv.DictReader(gzip.open(P/'coverage_per_mint.csv.gz','rt'))}
ct=[int(x['create_ts']) for x in coverage.values() if x['create_ts']]; split=(min(ct)+max(ct))/2
counts=Counter(); halves={'early':Counter(),'late':Counter()}; records=[]
def valid(r):
 try:return r['venue']=='curve' and float(r['vsol'])>0 and float(r['vtok'])>0 and 0<float(r['price_sol'])<=4.11e-7
 except:return False
def process(mint,rows):
 c=coverage[mint]; create=int(c['create_ts']) if c['create_ts'] else None
 if create is None:counts['missing_create']+=1;return
 half='early' if create<split else 'late'; h=halves[half];h['selected_mints']+=1
 seen=set(); ded=[]; keys=[]
 for r in rows:
  key=tuple(r[k] for k in ['mint','sig','wallet','is_buy','sol','tokens','venue','vsol','vtok'])
  if key in seen: counts['full_fingerprint_duplicates']+=1;continue
  seen.add(key);ded.append(r)
  keys.append((int(r['slot']),int(r['ev_idx']) if r['ev_idx'] else -1,int(r['row_id'])))
 if keys!=sorted(keys):h['order_contradiction_mints']+=1
 rows=ded
 h['trade_rows']+=len(rows);h['missing_recv_rows']+=sum(not r['recv_ms'] for r in rows)
 h['missing_reserve_rows']+=sum(not r['vsol'] or not r['vtok'] for r in rows)
 h['pool_rows']+=sum(r['venue']=='pumpswap' for r in rows)
 h['assumed_decimal_pool_rows']+=sum(r['venue']=='pumpswap' and r['dec_ver']=='ps-0.19.9' for r in rows)
 h['reconciliation_mismatch_mints']+=int(c['reconciled']!='1')
 if not rows:h['zero_row_mints']+=1
 before=[r for r in rows if float(r['ts'])<=create+60]
 known=[r for r in rows if r['recv_ms'] and float(r['recv_ms'])<=1000*(create+60)]
 def signal(rr):
  gross=sum(float(r['sol']) for r in rr if r['is_buy']=='1');net=sum(float(r['sol'])*(1 if r['is_buy']=='1' else -1) for r in rr)
  return bool(rr) and gross>=15 and net>0 and valid(rr[-1])
 es=signal(before);ks=signal(known)
 h['event_time_signals']+=es;h['receipt_known_signals']+=ks
 h['event_signal_missing_recv_predecision']+=es and any(not r['recv_ms'] for r in before)
 if not es:return
 d={'mint':mint,'half':half,'create_ts':create,'rows_predecision':len(before),'receipt_signal':ks,'missing_predecision_receipts':any(not r['recv_ms'] for r in before)}
 landing=[r for r in rows if float(r['ts'])<=create+61]
 exitrows=[r for r in rows if float(r['ts'])<=create+120]
 en=landing[-1] if landing else {};ex=exitrows[-1] if exitrows else {}
 ok=valid(en) and valid(ex)
 d['shadow_state_valid']=ok; d['exit_venue']=ex.get('venue');d['entry_state_ts']=en.get('ts');d['exit_state_ts']=ex.get('ts')
 h['shadow_valid_curve_pairs']+=ok;h['shadow_unknown_pairs']+=not ok
 for size in [.2,.02]:
  k=str(size)
  if ok:
   v=float(en['vsol']);t=float(en['vtok']); a=size*1e9/1.0125;tokens=t*a/(v+a)
   out=float(ex['vsol'])*tokens/(float(ex['vtok'])+tokens)*.9875/1e9
   d['pnl_'+k]=out-size-.0015
  else:d['pnl_'+k]=-size-.0015
 records.append(d)
for f in sorted(P.glob('trades_part_*.csv.gz')):
 current=None;group=[]
 for r in csv.DictReader(gzip.open(f,'rt')):
  counts['raw_trade_rows']+=1
  if current is not None and r['mint']!=current:process(current,group);group=[]
  current=r['mint'];group.append(r)
 if current is not None:process(current,group)
 print('processed',f.name,flush=True)
# coverage zero-row mints do not occur in stream
seen_mints=set()
for f in sorted(P.glob('trades_part_*.csv.gz')):
 # no reread necessary: coverage determines zero row
 pass
for mint,c in coverage.items():
 if int(c['rows_exported'])==0:process(mint,[])
result={'split_unix':split,'counts':dict(counts),'halves':{k:dict(v) for k,v in halves.items()},'shadow':{}}
for half in ['early','late']:
 rr=[r for r in records if r['half']==half];result['shadow'][half]={}
 for size in [.2,.02]:
  x=np.array([r['pnl_'+str(size)] for r in rr]);sc=np.array([r['pnl_'+str(size)] for r in rr if r['shadow_state_valid']]);rng=np.random.default_rng(20261108)
  means=np.array([rng.choice(x,len(x),replace=True).mean() for _ in range(10000)]) if len(x) else np.array([np.nan])
  result['shadow'][half][str(size)]={'attempts':len(x),'valid_curve_pairs':len(sc),'sum_conservative_pnl':float(x.sum()),'mean_conservative_return':float(x.mean()/size),'median_conservative_return':float(np.median(x)/size),'win_rate':float((x>0).mean()),'mean_return_95pct_interval':list(np.quantile(means/size,[.025,.975])),'without_best_pnl':float(x.sum()-x.max()) if len(x) else None,'loss_ge_50pct_rate':float((x/size<=-.5).mean()),'mean_scored_shadow_return':float(sc.mean()/size) if len(sc) else None}
(O/'results.json').write_text(json.dumps(result,indent=2));(O/'signals.json').write_text(json.dumps(records,indent=2));print(json.dumps(result,indent=2))
