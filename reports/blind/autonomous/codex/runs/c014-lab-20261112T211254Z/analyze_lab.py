"""Verify baseline and locked-veto partitions; no alternative thresholds."""
import pathlib,json,csv,collections,statistics,math
r=pathlib.Path(__file__).parent;x=json.loads((r/'trade_ledger.json').read_text());previous={q['mint']:q for q in json.loads((r.parent/'c010-lab-20261111T211258Z/trade_ledger.json').read_text())['L003']};baseline={q['mint']:q for q in x['BASELINE']};candidate={q['mint']:q for q in x['L006']};fields=0
assert len(baseline)==296 and set(baseline)==set(previous)
for m,p in previous.items():
 for k,v in p.items():
  if k=='variant':continue
  assert baseline[m][k]==v,(m,k);fields+=1
for m,q in candidate.items():assert {k:v for k,v in q.items() if k!='variant'}=={k:v for k,v in baseline[m].items() if k!='variant'}
feat=[q['quote_feature'] for q in baseline.values()];ratios=[q['token_quote_ratio_receipt_over_chain'] for q in feat if q['feature_available']];quote={'eligible_l003_decisions':296,'feature_available':sum(z['feature_available'] for z in feat),'feature_unavailable':sum(not z['feature_available'] for z in feat),'vetoed':len(x['VETOED']),'retained':len(candidate),'same_row_id':sum(z['receipt_row_id']==z['chain_row_id'] for z in feat),'quote_ratio_min':min(ratios) if ratios else None,'quote_ratio_median':statistics.median(ratios) if ratios else None,'quote_ratio_max':max(ratios) if ratios else None,'registered_veto_threshold':1.05,'thresholds_tried':1}
paired={}
for h in ['early','late','all']:
 keys=[m for m,q in candidate.items() if q['status']==baseline[m]['status']=='scored' and (h=='all' or q['half']==h)];a=[candidate[m]['net_sol'] for m in keys];b=[baseline[m]['net_sol'] for m in keys]
 paired[h]={'both_resolved':len(keys),'candidate_total_sol':math.fsum(a),'baseline_total_sol':math.fsum(b),'paired_delta_sol':math.fsum(v-w for v,w in zip(a,b)),'candidate_mean_sol':statistics.mean(a) if a else None,'candidate_median_sol':statistics.median(a) if a else None,'baseline_mean_sol':statistics.mean(b) if b else None,'baseline_median_sol':statistics.median(b) if b else None,'all_shared_records_identical':True}
out={'experiment':'CDEX-L006','baseline_fields_reproduced':fields,'new_specs':1,'total_specs_with_locked_baseline':2,'quote_features':quote,'paired':paired,'verdict':'inconclusive: veto removes fewer than30resolved controls; no parameter adjustment','profitability':'candidate retains the losing baseline; full net unknown','limitations':['296selected L003 decisions, not all market decisions or all timestamps','Zero binding vetoes do not show asynchronous quote risk never matters','VETOED and FEATURE_UNAVAILABLE arrays are partitions, not extra strategy specifications','Previously explored development data; no fresh confirmation']}
(r/'lab_verification.json').write_text(json.dumps(out,indent=2))
for name,rows in x.items():
 for i in range(0,len(rows),50):
  rr=[{**q,'features':json.dumps(q['features'],sort_keys=True),'quote_feature':json.dumps(q['quote_feature'],sort_keys=True)} for q in rows[i:i+50]]
  with (r/f'trade_{name.lower()}_{i//50+1:03d}.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=sorted(set().union(*(z.keys() for z in rr))));w.writeheader();w.writerows(rr)
rows=[{'mint':q['mint'],'half':q['half'],**q['quote_feature']} for q in x['BASELINE']]
with (r/'quote_features.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=sorted(set().union(*(z.keys() for z in rows))));w.writeheader();w.writerows(rows)
# Independent-position exposure; unresolved model exits are not actual liquidation guarantees.
exposure={}
for arm in ['L006','BASELINE']:
 exposure[arm]={}
 for h in ['early','late','all']:
  rr=[q for q in x[arm] if q['status']!='fill_unavailable' and (h=='all' or q['half']==h)];events=sorted([(q['fill_t'],.2) for q in rr]+[(q['sell_t'],-.2) for q in rr]);active=peak=0.
  for _,v in events:active+=v;peak=max(peak,active)
  exposure[arm][h]={'filled':len(rr),'modeled_peak_open_stake_sol':peak,'modeled_stake_seconds':math.fsum((q['sell_t']-q['fill_t'])*.2 for q in rr),'median_modeled_hold_sec':statistics.median(q['sell_t']-q['fill_t'] for q in rr) if rr else None,'limits':'Unresolved positions may remain open beyond model exit; unlimited independent capital.'}
(r/'exposure.json').write_text(json.dumps(exposure,indent=2));print(json.dumps(out,indent=2))
