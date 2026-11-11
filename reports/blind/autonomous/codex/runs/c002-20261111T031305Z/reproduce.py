"""C002: reproduce published pathologies; no new rules or evaluation outcomes."""
import argparse,pathlib,hashlib,json,csv,gzip,importlib.util,types,math
p=argparse.ArgumentParser();p.add_argument('--cache',type=pathlib.Path,default=pathlib.Path(__file__).parent.parent/'c001-20261110T211226Z');a=p.parse_args()
root=pathlib.Path(__file__).parent;cache=a.cache
assert hashlib.sha256((cache/'evaluate.py').read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86'
checks=[]
for line in (cache/'data/SHA256SUMS.txt').read_text().splitlines():
 want,name=line.split(maxsplit=1);f=cache/'data'/name
 got=hashlib.file_digest(f.open('rb'),'sha256').hexdigest();assert got==want,name
 checks.append({'path':name,'sha256':got,'ok':True})
(root/'data_checksums.json').write_text(json.dumps(checks,indent=2));print('CHECKSUMS',len(checks),'PASS',flush=True)
spec=importlib.util.spec_from_file_location('ev',cache/'evaluate.py');ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev);assert not ev.DEV_NO_EVIDENCE
expected=json.loads((root/'expected_artifacts.json').read_text());targets=set(expected)
tok,gaps,outages,meta=ev.load(str(cache/'replay'),1793950800,1794081600)
stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()}
mod=types.SimpleNamespace(decide=lambda v:True,exit_signal=lambda pos:False)
art={};mismatch=[];records={}
for m,L in ev.iter_mints(str(cache/'replay'),{m:tok[m] for m in targets},stats):
 records[m]=L;info=tok[m];rr={};first=L[0]
 for horizon in (30,7200):
  R={'decision_offsets':[],'on_trade':True,'horizon_s':horizon,'sizes':[.2,.02]}
  actual,hyp=ev.run_launch(mod,R,m,info,L,gaps,outages,meta,30)
  want=expected[m]['frozen_h'+str(horizon)];rr['h'+str(horizon)]=actual
  if actual['cat']!=want['cat'] or actual.get('why')!=want.get('why'):mismatch.append([m,horizon,'category/reason'])
  if actual['cat']=='scored':
   for size in (.2,.02):
    for metric in ('net_sol','ret'):
     if not math.isclose(actual['sizes'][str(size)][metric],want['sizes'][str(size)][metric],rel_tol=1e-12,abs_tol=1e-12):mismatch.append([m,horizon,size,metric])
  t=actual.get('entry_t')
  if t is not None:
   fs,fw=ev.state_at(L,t+1,gaps,outages,info['created'],t);ss,sw=ev.state_at(L,t+horizon,gaps,outages,info['created'],t)
   rr['states_h'+str(horizon)]={'fill':fs,'fill_unavailable_reason':fw,'exit':ss,'exit_unavailable_reason':sw,'fill_valid':ev.state_ok(fs) if fs else False,'exit_valid':ev.state_ok(ss) if ss else False}
 rr.update(raw_unique_rows=len(L),first_curve=first,completed_curve_floor=ev.fl(first['vtok'])<=279900000000000,first_curve_buy_sol=ev.fl(first['sol']))
 art[m]=rr;print('REPLAYED',m,flush=True)
assert set(art)==targets and not mismatch,(set(art),mismatch)
(root/'target_rows.json').write_text(json.dumps(records))
# A never-enter rule can be labelled unknown before decide is called.
T=1794182400;calls=[0]
def never(v):calls[0]+=1;return False
nevermod=types.SimpleNamespace(decide=never,exit_signal=lambda p:False)
def synth(n):
 return [{'row_id':str(i+1),'mint':'synthetic','slot':str(i+1),'ts':str(T),'wallet':str(i),'is_buy':'1','sol':'0.001','tokens':'1','recv_ms':str((T+1)*1000),'vsol':'40000000000','vtok':'800000000000000','venue':'curve','ev_idx':'','pool':''} for i in range(n)]
R={'decision_offsets':[1],'on_trade':False,'horizon_s':30,'sizes':[.2,.02]}
buf=[]
for n in (12000,12001):
 calls[0]=0;result,hyp=ev.run_launch(nevermod,R,'synthetic',{'created':T,'tier':1},synth(n),{'main':[],'pool':[]},[],{},30)
 scores={str(s):ev.score([result],s,1,(s+.0015)/s) for s in (.2,.02)}
 buf.append({'rows':n,'decide_calls':calls[0],'result':result,'hypothetical':hyp,'scores':scores})
assert buf[0]['result']['cat']=='abstain' and buf[0]['decide_calls']==1
assert buf[1]['result']=={'cat':'unknown','why':'pre-promotion buffer exceeded'} and buf[1]['decide_calls']==0
# Preserve evidence, including exactly the source references, without repairing evaluator.
report={'task':'C002','development_commit':'e67833121f1da0dc992c28fa26c5236a855c151a','evaluator_commit':'be9b5459e2f7670946d9ca012f875b77aaaf5d5b','reference_commit':'93a9ed57ace4216d42e7b7a90d4967078e7ac9dc','artifact_results_match':not mismatch,'compared_mints':len(art),'comparisons':8,'mismatches':mismatch,'artifacts':art,'buffer_counterexamples':buf,'limitations':['Reproduces evaluator outputs, not executable profits','Pool account units/decoder cause not independently established by chain evidence','No new chain calls or protected test records','Synthetic buffer case demonstrates logic; not measured population prevalence','No evaluator repair or new hypothesis selection']}
(root/'results.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'artifact_results_match':not mismatch,'mints':len(art),'buffer':buf},indent=2),flush=True)
