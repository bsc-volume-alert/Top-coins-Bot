"""C012 counts/exposure; independent L004 baseline and paired checks. No rule search."""
import pathlib,json,csv,gzip,collections,statistics,math,importlib.util,hashlib,random
r=pathlib.Path(__file__).parent;c=r.parent/'c001-20261110T211226Z';old=r.parent/'c009-20261111T181843Z';prior=r.parent/'c010-lab-20261111T211258Z'
spec=importlib.util.spec_from_file_location('ev',c/'evaluate.py');ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
_,gaps,outages,_=ev.load(str(c/'replay'),1793950800,1794081600)
strict=json.loads((r/'strict_records.json').read_text());tol=json.loads((r/'tol30_records.json').read_text());original=json.loads((old/'records.json').read_text())
assert strict==original,'STRICT_REPRODUCTION_FAILED'
assert len(strict)==len(tol)
for a,b in zip(strict,tol):
 assert {k:v for k,v in a.items() if k!='label'}=={k:v for k,v in b.items() if k!='label'},'TOLERANCE_LEAKED_INTO_EXECUTION'
ss=json.loads((r/'strict_results.json').read_text());orig=json.loads((old/'results.json').read_text());assert ss==orig
assert hashlib.sha256((prior/'claude_source/features_labels.csv.gz').read_bytes()).hexdigest()=='0744d6589e169ea74e24cb36f6e0dcd6b7b10283278bd5b628d30a8f95685f05'
with gzip.open(prior/'claude_source/features_labels.csv.gz','rt') as f:features=list(csv.DictReader(f))
assert len(features)==10914
sm={(x['mint'],x['age']):x for x in strict};tm={(x['mint'],x['age']):x for x in tol}
exposure=[];report={'task':'C012','protocol_commit':'f044ea960fad409a943db06989a1d8b0f888288f','original_records_identical':True,'original_results_identical':True,'strict_tol30_execution_records_identical':True,'common_denominator':3638,'by_age':{},'main_gaps':gaps['main'],'short_main_gaps':[z for z in gaps['main'] if z[1]-z[0]<30],'claude_source_commit':'7a9cd6a98680b660d15b952079b7f367d3ad180f','peer_review_commit':'c1cf6d39b942de76771d79ba403856a1526db0df','limitations':['tol30 is an operational sensitivity, not ground truth; R21','C009 path-density requirement unchanged; dropping it would be a new label specification','Price1h F006 labels are published exploratory outputs, not newly certified truth','Short-gap-exposed negatives bound possible errors; do not count them as observed errors','Sustained multiple labels are separate from >=100K outcomes']}
for age in [300,900,1800]:
 af=[x for x in features if int(x['age_s'])==age];d={}
 for name,rows in [('net2h_strict',strict),('net2h_tol30',tol)]:
  ar=[x for x in rows if x['age']==age];counts=collections.Counter(x['label'] for x in ar);counts.setdefault('captured_path_nonrunner',0);counts.setdefault('observed_sustained2x',0);counts['outside_c009_eligible_state']=3638-len(ar)
  pairs=json.loads((r/(('strict' if name.endswith('strict') else 'tol30')+'_matched_pairs.json')).read_text());d[name]={'labels_within_state_cohort':dict(counts),'unknown_on_common_denominator':counts['unknown']+counts['outside_c009_eligible_state'],'matched_pairs':sum(x['age']==age for x in pairs)}
 for lab in ['label2x','label2x_tol30']:
  d['price1h_'+('strict' if lab=='label2x' else 'tol30')]=dict(collections.Counter(x.get(lab) or 'unknown' for x in af))
 ct=collections.Counter();cttol=collections.Counter()
 for f in af:
  key=(f['mint'],age);ct[(f.get('label2x') or 'unknown',sm.get(key,{}).get('label','outside_c009_eligible_state'))]+=1
  cttol[(f.get('label2x_tol30') or 'unknown',tm.get(key,{}).get('label','outside_c009_eligible_state'))]+=1
  if f.get('label2x_tol30')=='nonrunner':
   start=float(f['created'])+age;gg=[(s,e) for s,e in gaps['main'] if e-s<30 and s<start+3600 and e>start]
   exposure.append({'mint':f['mint'],'age':age,'half':f['half'],'decision_t':start,'horizon_end_t':start+3600,'strict_price1h_label':f['label2x'],'tol30_price1h_label':f['label2x_tol30'],'short_main_gap_exposed':bool(gg),'short_main_gap_count':len(gg),'short_main_gap_seconds_overlap':math.fsum(max(0,min(e,start+3600)-max(s,start)) for s,e in gg),'short_gap_intervals':json.dumps(gg,separators=(',',':'))})
 ex=[x for x in exposure if x['age']==age];d['tol30_negative_short_gap_exposure']={h:{'negative_count':sum(h=='all' or x['half']==h for x in ex),'any_short_gap':sum(x['short_main_gap_exposed'] and (h=='all' or x['half']==h) for x in ex)} for h in ['early','late','all']}
 d['strict_price1h_vs_net2h_cross_table']=[{'price1h':a,'net2h':b,'count':v} for (a,b),v in sorted(ct.items())];d['tol30_price1h_vs_net2h_cross_table']=[{'price1h':a,'net2h':b,'count':v} for (a,b),v in sorted(cttol.items())]
 report['by_age'][str(age)]=d
(r/'label_comparison.json').write_text(json.dumps(report,indent=2))
# Publish all short-gap negative flags in manageable UTF8 CSV batches.
def export(rows,prefix,size=100):
 keys=sorted(set().union(*(set(x) for x in rows))) if rows else []
 for i in range(0,len(rows),size):
  with (r/f'{prefix}_{i//size+1:03d}.csv').open('w',newline='') as f:
   w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(rows[i:i+size])
export(exposure,'negative_gap_exposure',150)
# Compact all-label ledger allows inspection without a large JSON payload.
export([{'mint':f['mint'],'age':int(f['age_s']),'half':f['half'],'price1h_strict':f.get('label2x') or 'unknown','price1h_tol30':f.get('label2x_tol30') or 'unknown','net2h_strict':sm.get((f['mint'],int(f['age_s'])),{}).get('label','outside_c009_eligible_state'),'net2h_tol30':tm.get((f['mint'],int(f['age_s'])),{}).get('label','outside_c009_eligible_state')} for f in features],'label_ledger',150)
tr=json.loads((r/'trade_ledger.json').read_text());prev=json.loads((prior/'trade_ledger.json').read_text())['L003'];base=tr['BASELINE'];assert len(base)==len(prev)==296
bym={x['mint']:x for x in base};compared=0
for p in prev:
 b=bym[p['mint']]
 for k,v in p.items():
  if k=='variant':continue
  assert b[k]==v,(p['mint'],k,b[k],v)
  compared+=1
z={'baseline_reproduced':True,'baseline_fields_compared':compared,'baseline_attempts':len(base),'new_specifications':1,'total_specs_with_locked_control':2,'paired':{},'trigger_counts':{},'source_knowledge_ids':['K004','K006','K010','K012'],'baseline_result_commit':'59d657b75b8378273b1e1a239ce2c0fe2e4be2b5','limitations':['Paired set is selected by joint outcome availability; not representative by assumption','Independent positions, unlimited capital; no portfolio cash constraint','Observed totals exclude unresolved outcomes','Previously examined development data; no fresh validation']}
def metric(rows):
 x=sorted(q['net_sol'] for q in rows);return {'n':len(x),'total_net_sol':math.fsum(x),'mean_net_sol':statistics.mean(x) if x else None,'median_net_sol':statistics.median(x) if x else None,'win_rate':sum(v>0 for v in x)/len(x) if x else None,'without_best1':math.fsum(x[:-1]),'without_best3':math.fsum(x[:-3])}
a={x['mint']:x for x in tr['L004']};pairs=[]
for h in ['early','late','all']:
 keys=[m for m,b in bym.items() if (h=='all' or b['half']==h) and b['status']==a[m]['status']=='scored'];bb=[bym[m] for m in keys];aa=[a[m] for m in keys];diff=[a[m]['net_sol']-bym[m]['net_sol'] for m in keys]
 blocks=collections.defaultdict(float)
 for m in keys:blocks[int(bym[m]['created']//10800)]+=a[m]['net_sol']-bym[m]['net_sol']
 rng=random.Random(12012);v=list(blocks.values());boot=sorted(sum(rng.choice(v) for _ in v) for _ in range(5000)) if v else []
 z['paired'][h]={'both_resolved':len(keys),'baseline_resolved':sum(x['status']=='scored' and (h=='all' or x['half']==h) for x in base),'candidate_resolved':sum(x['status']=='scored' and (h=='all' or x['half']==h) for x in a.values()),'baseline':metric(bb),'candidate':metric(aa),'candidate_minus_baseline_total_sol':math.fsum(diff),'delta_median_sol':statistics.median(diff) if diff else None,'improved':sum(x>0 for x in diff),'worse':sum(x<0 for x in diff),'equal':sum(x==0 for x in diff),'exploratory_3h_block_bootstrap_delta_total_95pct':[boot[125],boot[4874]] if boot else None,'creation_blocks':len(v)}
 if h=='all':pairs=[{'mint':m,'half':bym[m]['half'],'baseline_net_sol':bym[m]['net_sol'],'candidate_net_sol':a[m]['net_sol'],'delta_sol':a[m]['net_sol']-bym[m]['net_sol'],'baseline_sell_t':bym[m]['sell_t'],'candidate_sell_t':a[m]['sell_t'],'candidate_reason':a[m]['trigger_reason']} for m in keys]
for arm,rows in tr.items():z['trigger_counts'][arm]=dict(collections.Counter(x.get('trigger_reason','fill_unavailable') for x in rows));export([{**q,'features':json.dumps(q['features'],sort_keys=True)} for q in rows],'trade_'+arm.lower(),50)
export(pairs,'paired_trade',100)
z['availability_cross_table']=[{'baseline':u,'candidate':v,'count':n} for (u,v),n in sorted(collections.Counter((bym[m]['status'],a[m]['status']) for m in a).items())]
(r/'paired_comparison.json').write_text(json.dumps(z,indent=2));print(json.dumps({'label_comparison':report,'paired':z},indent=2))
