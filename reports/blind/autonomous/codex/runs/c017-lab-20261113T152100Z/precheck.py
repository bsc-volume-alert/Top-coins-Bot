"""C017 count-only H2 -> conditional H3. No outcome ledger is opened."""
import pathlib,csv,json,hashlib,importlib.util,statistics,math,gzip,collections,bisect
r=pathlib.Path(__file__).parent;c=r.parent/'c001-20261110T211226Z'
qp=r.parent/'c014-lab-20261112T211254Z/quote_features.csv'
assert hashlib.sha256(qp.read_bytes()).hexdigest()=='648e35d155b034d919c5bd8d9b77ba2dc78c7ab08e7a25fe04bf7ad9c3cb8d5d'
with qp.open() as f:
 rr=csv.DictReader(f);assert not {'net_sol','ret','status','sell_t'}&set(rr.fieldnames);targets={z['mint']:float(z['decision_t']) for z in rr}
assert len(targets)==296
sp=importlib.util.spec_from_file_location('ev',c/'evaluate.py');ev=importlib.util.module_from_spec(sp);sp.loader.exec_module(ev)
assert hashlib.sha256((c/'evaluate.py').read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86'
tok,gaps,outages,meta=ev.load(str(c/'replay'),1793950800,1794081600)
features={}
for m,t in targets.items():
 ends=[e for s,e in gaps['main'] if e<=t and 0<=t-e<=180]
 features[m]={'mint':m,'decision_t':t,'half':'early' if tok[m]['created']<1794016200 else 'late','H2_available':True,'H2_veto':bool(ends),'H2_latest_reopen_t':max(ends) if ends else None}
checks=[];chosen=None
def check(h):
 global chosen
 n=sum(not z[h+'_available'] for z in features.values());v=sum(z.get(h+'_veto') is True for z in features.values());ok=n==0 and .05<=v/296<=.95
 a={'hypothesis':h,'control_attempts':296,'feature_unknown':n,'removed':v,'retained':296-v-n,'removed_share':v/296,'eligible_for_scoring':ok,'verdict':'TESTABLE' if ok else 'NOT TESTABLE; not scored','halves':{k:{'control':sum(z['half']==k for z in features.values()),'removed':sum(z['half']==k and z.get(h+'_veto') is True for z in features.values())} for k in ['early','late']}};checks.append(a)
 if ok:chosen=h
check('H2')
# Lag descriptive comparison is count-only; load only the prior feature CSV.
with (r.parent/'c016-lab-20261113T091125Z/precheck_features.csv').open() as f:
 for z in csv.DictReader(f):
  features[z['mint']]['H1_median_recorded_lag_s']=float(z['H1_median_recorded_lag_s']);features[z['mint']]['H1_veto']=z['H1_veto']=='True'
def dist(a):
 a=sorted(a)
 return {'n':len(a),'min':a[0] if a else None,'p25':a[int((len(a)-1)*.25)] if a else None,'median':statistics.median(a) if a else None,'p75':a[int((len(a)-1)*.75)] if a else None,'max':a[-1] if a else None}
lag_comparison={h:dist([z['H1_median_recorded_lag_s'] for z in features.values() if z[h+'_veto']]) for h in ['H1','H2']}
stats=None
if chosen is None:
 with gzip.open(c/'data/tokens_window.csv.gz','rt') as f:creators={z['mint']:z['creator'] for z in csv.DictReader(f)}
 recent={};stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()}
 for m,L in ev.iter_mints(str(c/'replay'),{m:tok[m] for m in targets},stats):
  t=targets[m];recent[m]={z['wallet'] for z in L if z['venue'] in ('','curve') and z['is_buy']=='1' and ev.fl(z['recv_ms']) is not None and t-60<float(z['recv_ms'])/1000<=t and z['wallet']!=creators.get(m)}
 assert len(recent)==296
 wallets=set().union(*recent.values());history=collections.defaultdict(list)
 stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()}
 for m,L in ev.iter_mints(str(c/'replay'),tok,stats):
  for z in L:
   if z['is_buy']=='1' and z['wallet'] in wallets and ev.fl(z['recv_ms']) is not None:history[z['wallet']].append((float(z['recv_ms'])/1000,m))
 for w in history:history[w].sort()
 for m,z in features.items():
  t=z['decision_t'];n=0
  for w in recent[m]:
   h=history[w];lo=bisect.bisect_right(h,(t-300,'\uffff'));hi=bisect.bisect_right(h,(t,'\uffff'));n+=len({a for rt,a in h[lo:hi] if a!=m})>=3
  ok=bool(recent[m]);z.update(H3_available=ok,H3_veto=n/len(recent[m])>=.5 if ok else None,H3_serial_buyers=n,H3_recent_noncreator_buyers=len(recent[m]),H3_share=n/len(recent[m]) if ok else None)
 check('H3')
if stats is not None:stats.pop('_done',None)
report={'definitions_commit':'287655f847978017e2272b5a21e15251547f963a','counts_only':True,'returns_or_exit_ledgers_read':False,'prechecks_attempted':checks,'chosen':chosen,'lag_comparison':lag_comparison,'H1_H2_removed_overlap':sum(z['H1_veto'] and z['H2_veto'] for z in features.values()),'logged_main_gap_count':len(gaps['main']),'dedup_stats_H3_full_scan':stats,'not_run':['H3'] if chosen=='H2' else [],'new_thresholds_tried':0,'unchanged_registered_thresholds_checked':len(checks),'limits':['Reopen log time used as knowledge-time proxy; gap log completeness unknown','H3 covers only tracked mints; missing history is not genuinely fresh wallets','Same explored development records; no fresh validation']}
(r/'PRECHECK.json').write_text(json.dumps(report,indent=2)+'\n');(r/'precheck_features.json').write_text(json.dumps(features))
with (r/'precheck_features.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=sorted(set().union(*(z.keys() for z in features.values()))));w.writeheader();w.writerows(features.values())
print(json.dumps(report,indent=2),flush=True)
