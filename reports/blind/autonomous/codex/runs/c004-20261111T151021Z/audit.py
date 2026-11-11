"""C004: descriptive latency audit; no orders or return/threshold search."""
import pathlib,csv,gzip,json,hashlib,statistics,collections,datetime as dt
root=pathlib.Path(__file__).parent;pkg=root.parent/'entry-package-7nov'
def read(p):
 with gzip.open(p,'rt',newline='') as f:return list(csv.DictReader(f))
def n(x):
 try:return float(x)
 except (ValueError,TypeError):return None
def stat(v):
 v=sorted(x for x in v if x is not None)
 if not v:return {'n':0}
 def q(p):
  a=(len(v)-1)*p;i=int(a);return v[i]+(v[min(i+1,len(v)-1)]-v[i])*(a-i)
 return {'n':len(v),'min':v[0],'p50':q(.5),'p90':q(.9),'p95':q(.95),'max':v[-1],'negative':sum(x<0 for x in v)}
def delta(rows,a,b,scale=1):return stat([(n(r[a])-n(r[b]))*scale for r in rows if n(r[a]) is not None and n(r[b]) is not None])
report={};check=[];safe_live=[];quote_fingerprints={};live_fingerprints={}
for folder in ['snapshot3','current']:
 tables={};sums={line.split(maxsplit=1)[1]:line.split(maxsplit=1)[0] for line in (pkg/folder/'SHA256SUMS.txt').read_text().splitlines()}
 for name in ['live_trades.csv.gz','fd_quotes.csv.gz','chain_fill.csv.gz','fd_positions.csv.gz','fd_decisions.csv.gz','vol_paper.csv.gz']:
  path=pkg/folder/name;got=hashlib.file_digest(path.open('rb'),'sha256').hexdigest();assert got==sums[name],name
  check.append({'path':folder+'/'+name,'sha256':got,'ok':True});tables[name]=read(path)
 live=tables['live_trades.csv.gz'];confirmed=[r for r in live if r['buy_status']=='confirmed'];failed=[r for r in live if r['buy_status']=='failed'];quotes=tables['fd_quotes.csv.gz'];cf=tables['chain_fill.csv.gz'];pos=tables['fd_positions.csv.gz']
 live_fingerprints[folder]={json.dumps(r,sort_keys=True) for r in live};quote_fingerprints[folder]={json.dumps(r,sort_keys=True) for r in quotes}
 keys=['id','vol_id','mint','entry_ts','buy_ts','buy_sig','buy_status','buy_ms','buy_quote_ms','buy_sim_ms','buy_land_ms','buy_slot','buy_lag_s','sell_ts','sell_sig','sell_status','sell_tries','sell_ms','sell_land_ms','sell_slot','stake_sol']
 if folder=='current':safe_live=[{k:r[k] for k in keys} for r in live]
 live_metrics={k:stat([n(r[k]) for r in confirmed]) for k in ['buy_ms','buy_quote_ms','buy_sim_ms','buy_land_ms','buy_lag_s','sell_ms','sell_land_ms','sell_tries','stake_sol']}
 def countle(field,t):return sum(n(r[field]) is not None and n(r[field])<=t for r in confirmed)
 live_metrics.update({'records':len(live),'unique_mints':len({r['mint'] for r in live}),'buy_status':dict(collections.Counter(r['buy_status'] for r in live)),'sell_status':dict(collections.Counter(r['sell_status'] or 'missing' for r in live)),'successful_buy_ms_le1000':countle('buy_ms',1000),'successful_land_field_ms_le1000':countle('buy_land_ms',1000),'successful_sell_ms_le700':countle('sell_ms',700),'successful_paper_entry_to_blocktime_lag_le1s':countle('buy_lag_s',1),'sell_tries_gt1':sum((n(r['sell_tries']) or 0)>1 for r in confirmed),'failed_records_with_signature':sum(bool(r['buy_sig']) for r in failed),'failed_records_with_land_field':sum(n(r['buy_land_ms']) is not None for r in failed),'buy_lag_equals_buy_ts_minus_entry_ts':sum(n(r['buy_lag_s'])==n(r['buy_ts'])-n(r['entry_ts']) for r in confirmed),'entry_min_utc':dt.datetime.fromtimestamp(min(float(r['entry_ts']) for r in live),dt.timezone.utc).isoformat(),'entry_max_utc':dt.datetime.fromtimestamp(max(float(r['entry_ts']) for r in live),dt.timezone.utc).isoformat(),'remainder_buy_ms_minus_quote_sim_land':stat([float(r['buy_ms'])-float(r['buy_quote_ms'])-float(r['buy_sim_ms'])-float(r['buy_land_ms']) for r in confirmed])})
 uq={}
 for r in cf:
  if r['s_ms_decision']!='':uq.setdefault((r['mint'],r['s_ms_decision']),r)
 up={}
 for r in pos:
  if r['ms_decision']!='':up.setdefault(r['same_decision_key'] or (r['mint'],r['ms_decision']),r)
 sim={}
 for label,rr,a,b,c,d,trigger in [('chain_fill_rows',cf,'s_ms_decision','s_ms_read_check','s_ms_land','s_ms_exit','s_trig_ts'),('chain_fill_unique_mint_decision',list(uq.values()),'s_ms_decision','s_ms_read_check','s_ms_land','s_ms_exit','s_trig_ts'),('position_rows',pos,'ms_decision','ms_reserve_read_check','ms_landing','ms_exit','exit_trigger_ts'),('position_unique_decision',list(up.values()),'ms_decision','ms_reserve_read_check','ms_landing','ms_exit','exit_trigger_ts')]:
  sim[label]={'records':len(rr),'read_minus_decision_ms':delta(rr,b,a),'landing_minus_decision_ms':delta(rr,c,a),'landing_minus_read_ms':delta(rr,c,b),'exit_minus_trigger_ms':stat([n(r[d])-1000*n(r[trigger]) for r in rr if n(r[d]) is not None and n(r[trigger]) is not None])}
 qmetrics={'rows':len(quotes),'unique_mints':len({r['mint'] for r in quotes}),'venue':dict(collections.Counter(r['venue'] for r in quotes)),'entered':dict(collections.Counter(r['entered'] for r in quotes)),'nonempty_error_rows':sum(bool(r['err']) for r in quotes),'q_ms':stat([n(r['q_ms']) for r in quotes]),'q_gap_recorded_fraction':stat([n(r['q_gap']) for r in quotes]),'q_ms_gt1000':sum((n(r['q_ms']) or 0)>1000 for r in quotes),'rows_with_chain_px_q_px':sum((n(r['chain_px']) or 0)>0 and (n(r['q_px']) or 0)>0 for r in quotes),'ts_min_utc':dt.datetime.fromtimestamp(min(float(r['ts']) for r in quotes),dt.timezone.utc).isoformat(),'ts_max_utc':dt.datetime.fromtimestamp(max(float(r['ts']) for r in quotes),dt.timezone.utc).isoformat()}
 cfids={r['vol_id']:r for r in cf};pairs=[(r,cfids[r['vol_id']]) for r in confirmed if r['vol_id'] in cfids]
 linked={'confirmed_live_with_chainfill_same_vol_id':len(pairs),'with_sim_decision_and_land_ms':sum(n(c['s_ms_decision']) is not None and n(c['s_ms_land']) is not None for l,c in pairs),'with_high_resolution_live_send_timestamp':0,'note':'Export has no high-resolution send timestamp; buy_ts is a block-time field, not a retained send timestamp'}
 paper={r['id']:r for r in tables['vol_paper.csv.gz']};pp=[(l,paper[l['vol_id']]) for l in confirmed if l['vol_id'] in paper]
 linked['confirmed_live_with_paper_same_vol_id']=len(pp)
 linked['paper_to_fill_lag_matches_recorded']=sum(n(l['buy_lag_s'])==n(l['buy_ts'])-n(p['entry_ts']) for l,p in pp)
 linked['live_invocation_minus_paper_entry_s']=stat([n(l['entry_ts'])-n(p['entry_ts']) for l,p in pp])
 linked['buy_ts_minus_live_invocation_s']=delta(confirmed,'buy_ts','entry_ts')
 linked['note']='entry_ts in live_trades is live invocation wall time; buy_lag_s is referenced to original paper row time; buy_ts may use blockTime or fallback wall time'
 report[folder]={'live':live_metrics,'simulation':sim,'quote_shadows':qmetrics,'join_audit':linked,'fd_decisions_rows':len(tables['fd_decisions.csv.gz'])}
report['overlap']={'identical_live_records':len(live_fingerprints['snapshot3']&live_fingerprints['current']),'unique_live_records_union':len(live_fingerprints['snapshot3']|live_fingerprints['current']),'identical_quote_rows':len(quote_fingerprints['snapshot3']&quote_fingerprints['current']),'unique_quote_rows_union':len(quote_fingerprints['snapshot3']|quote_fingerprints['current'])}
(root/'checksums.json').write_text(json.dumps(check,indent=2));(root/'live_timing_ledger.json').write_text(json.dumps(safe_live,indent=2));(root/'results.json').write_text(json.dumps({'task':'C004','package_commit':'0e3be03c71949e069a7a31b5951f332bb563f68f','quantiles':'linear interpolation at (N-1)*p','results':report,'limitations':['Successful-only timing distributions are conditional; failed/skipped counts retained','Confirmed polling completion is not exact inclusion time','Simulated reserve-read delays are not observed live latency','No retention-receipt to actual-fill calibration identified','No representative sample for current first-retention signals','No protected outcomes or new transactions']},indent=2));print(json.dumps(report,indent=2))
