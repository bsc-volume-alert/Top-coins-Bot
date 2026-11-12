"""C014: reproduce 53 historical maxima and expose pre-gap observations, never relabel."""
import pathlib,json,csv,gzip,hashlib,importlib.util,bisect,collections,math,statistics
r=pathlib.Path(__file__).parent;c=r.parent/'c001-20261110T211226Z';oldpath=r.parent/'c009-20261111T181843Z/records.json'
s=importlib.util.spec_from_file_location('ev',c/'evaluate.py');ev=importlib.util.module_from_spec(s);s.loader.exec_module(ev)
assert hashlib.sha256((c/'evaluate.py').read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86';assert not ev.DEV_NO_EVIDENCE
checks=[]
for l in (c/'data/SHA256SUMS.txt').read_text().splitlines():
 want,n=l.split(maxsplit=1);got=hashlib.file_digest((c/'data'/n).open('rb'),'sha256').hexdigest();assert got==want;checks.append({'path':n,'sha256':got,'ok':True})
(r/'audit_input_checksums.json').write_text(json.dumps(checks,indent=2))
with (r/'peer_source/claude_only_runners.csv').open(newline='') as f:peer=list(csv.DictReader(f))
assert len(peer)==61
old={z['mint']:z for z in json.loads(oldpath.read_text()) if z['age']==300}
selected={z['mint']:z for z in peer if z['mint'] in old and old[z['mint']]['trade_status']!='fill_unavailable'}
assert len(selected)==53 and all(old[m]['label']=='unknown' for m in selected)
with gzip.open(r.parent/'c010-lab-20261111T211258Z/claude_source/features_labels.csv.gz','rt') as f:cf={z['mint']:z for z in csv.DictReader(f) if int(z['age_s'])==300}
tok,gaps,outages,meta=ev.load(str(c/'replay'),1793950800,1794081600);stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};records=[];observations=[]
for m,L in ev.iter_mints(str(c/'replay'),{m:tok[m] for m in selected},stats):
 z=old[m];t=z['decision'];fill=z['fill_t'];end=t+7200;byid={x['row_id']:x for x in L};fs=byid[z['fill_row_id']];qty=ev.buy(fs,.2,55);RO=sorted(L,key=lambda q:(float(q['recv_ms']),int(q['slot']),int(q['row_id'])));future=[q for q in RO if fill<float(q['recv_ms'])/1000<=end]
 initial=ev.sell(fs,qty,55)-.0015;maxp=initial;maxrow=fs;maxtr=fill;last_raw=last_valid=fill;rawgap=algap=None;firstfail=None;pool_seen=fs['venue'] not in ('','curve');vals=[];sustain_start=None;first_sustain=None
 for q in future:
  tr=float(q['recv_ms'])/1000;ts=float(q['ts']);valid=ev.state_ok(q);pool_seen|=q['venue'] not in ('','curve')
  if rawgap is None and tr-last_raw>30:rawgap=(last_raw,tr)
  last_raw=tr
  gapfail=tr-last_valid>30;stalefail=tr-ts>30;logged=ev.gap_overlap(gaps,outages,fill,tr,'pumpswap' if pool_seen else 'curve')
  if algap is None and gapfail:algap=(last_valid,tr)
  reasons=[]
  if gapfail:reasons.append('valid-observation receipt gap>30s')
  if stalefail:reasons.append('received state event-age>30s')
  if not valid:reasons.append('invalid state or absent pool evidence')
  if logged:reasons.append('logged capture gap/outage before observation')
  if firstfail is None and reasons:firstfail={'t':tr,'row_id':q['row_id'],'reasons':reasons}
  if not valid:continue
  value=ev.sell(q,qty,55)-.0015;vals.append((tr,value,q['row_id']))
  if value>maxp:maxp=value;maxrow=q;maxtr=tr
  if value>=.4:
   if sustain_start is None:sustain_start=tr
   elif tr-sustain_start>=30 and first_sustain is None:first_sustain=tr
  else:sustain_start=None
  last_valid=tr
 assert maxp==z['max_observed_sellable_proceeds_sol'],(m,maxp,z['max_observed_sellable_proceeds_sol'])
 rawcut=rawgap[0] if rawgap else end;alcut=algap[0] if algap else end;failcut=firstfail['t'] if firstfail else end+1
 crossing=next((v for v in vals if v[1]>=.4),None)
 before_raw=[v for v in vals if v[0]<=rawcut];before_alg=[v for v in vals if v[0]<=alcut];before_fail=[v for v in vals if v[0]<failcut]
 drow=byid[z['decision_row_id']];dp=(float(drow['vsol'])/1e9)/(float(drow['vtok'])/1e6);fp=(float(fs['vsol'])/1e9)/(float(fs['vtok'])/1e6);cp=float(cf[m]['price_at_t'])
 rec={'mint':m,'half':z['half'],'decision_t':t,'fill_t':fill,'horizon_end':end,'fill_row_id':fs['row_id'],'decision_row_id':drow['row_id'],'fill_tokens':qty,'original_label':z['label'],'original_trade_status':z['trade_status'],'max_observed_sellable_proceeds_sol':maxp,'stored_max_identical':True,'max_row_id':maxrow['row_id'],'max_received_t':maxtr,'max_state_event_t':float(maxrow['ts']),'max_state_event_age_at_receipt_s':maxtr-float(maxrow['ts']),'first_raw_receipt_gap_start':rawgap[0] if rawgap else None,'first_raw_receipt_gap_end':rawgap[1] if rawgap else None,'first_raw_receipt_gap_duration_s':rawgap[1]-rawgap[0] if rawgap else None,'first_c009_valid_obs_gap_start':algap[0] if algap else None,'first_c009_valid_obs_gap_end':algap[1] if algap else None,'first_original_continuity_failure_t':firstfail['t'] if firstfail else None,'first_original_continuity_failure_reasons':'; '.join(firstfail['reasons']) if firstfail else None,'max_before_raw_gap_sol':max([initial]+[x[1] for x in before_raw]),'max_before_c009_gap_sol':max([initial]+[x[1] for x in before_alg]),'max_before_any_original_continuity_failure_sol':max([initial]+[x[1] for x in before_fail]),'observed_ge2x_anywhere':maxp>=.4,'observed_ge2x_before_raw_gap':any(v[1]>=.4 for v in before_raw),'observed_ge2x_before_c009_gap':any(v[1]>=.4 for v in before_alg),'observed_ge2x_before_any_original_failure':any(v[1]>=.4 for v in before_fail),'first_net2x_received_t':crossing[0] if crossing else None,'first_net2x_row_id':crossing[2] if crossing else None,'first_unfiltered_sustained_net2x_confirmation_t':first_sustain,'unfiltered_sustain_confirmed_before_raw_gap':first_sustain is not None and first_sustain<=rawcut,'unfiltered_sustain_confirmed_before_any_original_failure':first_sustain is not None and first_sustain<failcut,'tail_without_observation_gt30s':end-last_raw>30,'last_future_raw_receipt_t':last_raw,'original_c009_decision_price_sol':dp,'claude_event_decision_price_sol':cp,'fill_state_price_sol':fp,'fill_price_over_codex_decision':fp/dp,'fill_price_over_claude_decision':fp/cp,'claude_reported_max_price_multiple_1h':float(selected[m]['claude_max_multiple_1h'])}
 records.append(rec)
 for name,point in [('first_cross',crossing),('max',(maxtr,maxp,maxrow['row_id']))]:
  if point:observations.append({'mint':m,'event':name,'received_t':point[0],'sellable_proceeds_sol':point[1],'row_id':point[2]})
assert len(records)==53 and stats['non_contiguous']==0

def summary(rows):
 return {'N':len(rows),'maxima_reproduced':sum(x['stored_max_identical'] for x in rows),'ge2x_anywhere':sum(x['observed_ge2x_anywhere'] for x in rows),'never_observed_ge2x':sum(not x['observed_ge2x_anywhere'] for x in rows),'ge2x_before_first_raw_gap_or_no_gap':sum(x['observed_ge2x_before_raw_gap'] for x in rows),'ge2x_before_actual_first_raw_gap':sum(x['observed_ge2x_before_raw_gap'] and x['first_raw_receipt_gap_start'] is not None for x in rows),'ge2x_without_observed_raw_gap':sum(x['observed_ge2x_anywhere'] and x['first_raw_receipt_gap_start'] is None for x in rows),'ge2x_only_after_first_raw_gap':sum(x['observed_ge2x_anywhere'] and not x['observed_ge2x_before_raw_gap'] for x in rows),'ge2x_before_first_c009_gap':sum(x['observed_ge2x_before_c009_gap'] for x in rows),'ge2x_before_any_original_continuity_failure':sum(x['observed_ge2x_before_any_original_failure'] for x in rows),'unfiltered_sustained2x_anywhere':sum(x['first_unfiltered_sustained_net2x_confirmation_t'] is not None for x in rows),'unfiltered_sustain_before_raw_gap':sum(x['unfiltered_sustain_confirmed_before_raw_gap'] for x in rows),'unfiltered_sustain_before_any_original_failure':sum(x['unfiltered_sustain_confirmed_before_any_original_failure'] for x in rows),'with_raw_gap':sum(x['first_raw_receipt_gap_start'] is not None for x in rows),'tail_censored_gt30s':sum(x['tail_without_observation_gt30s'] for x in rows),'median_fill_price_over_claude_decision':statistics.median(x['fill_price_over_claude_decision'] for x in rows),'median_max_sellable_proceeds_sol':statistics.median(x['max_observed_sellable_proceeds_sol'] for x in rows),'first_continuity_failure_reasons':dict(collections.Counter(x['first_original_continuity_failure_reasons'] or 'no observed-prefix failure; check horizon tail' for x in rows))}
out={'task':'C014','protocol_commit':'c17f7f65efbfef247cef33cc329d9cba0751a37a','peer_csv_commit':'c1cf6d39b942de76771d79ba403856a1526db0df','peer_rows':61,'selected_filled_unknown':53,'excluded_unavailable_fills':8,'local_c009_records_sha256':hashlib.sha256(oldpath.read_bytes()).hexdigest(),'data_commit':'e67833121f1da0dc992c28fa26c5236a855c151a','summary':{h:summary([x for x in records if h=='all' or x['half']==h]) for h in ['early','late','all']},'peer_export_missing_max_fields':sum(not z['codex_max_proceeds_sol'] for z in peer if z['mint'] in selected),'peer_text_lt2x_with_missing_max_fields':sum('max_proceeds<2x' in z['codex'] and not z['codex_max_proceeds_sol'] for z in peer if z['mint'] in selected),'limitations':['No labels or returns changed; no >=100K inference','A2x quote is not an executable sale or sustained episode','Unfiltered sustained diagnostic skips invalid states and ignores gaps, so cannot certify persistence','Before-gap uses near-side start of first gap, not the resumed observation','Missing histories remain unknown; no non-runner denominator','Fill+1s, fees, impact and decision-state baselines differ from a price multiple; no isolated causal attribution to fees','Maxima can occur after original evidence continuity failed; receipt/event clocks remain distinct']}
(r/'runner_audit.json').write_text(json.dumps(out,indent=2));(r/'runner_records.json').write_text(json.dumps(records,indent=2))
for name,rows in [('runner_ledger',sorted(records,key=lambda q:q['mint'])),('observation_evidence',observations)]:
 for i in range(0,len(rows),20):
  rr=rows[i:i+20]
  with (r/f'{name}_{i//20+1:03d}.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=sorted(set().union(*(x.keys() for x in rr))));w.writeheader();w.writerows(rr)
print(json.dumps(out,indent=2),flush=True)
