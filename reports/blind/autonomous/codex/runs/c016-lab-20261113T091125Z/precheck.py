"""Fixed-priority R54 count-only precheck. Does not read a trade-return ledger."""
import pathlib,csv,json,gzip,hashlib,importlib.util,collections,statistics,math,bisect
r=pathlib.Path(__file__).parent;c=r.parent/'c001-20261110T211226Z';qp=r.parent/'c014-lab-20261112T211254Z/quote_features.csv'
with qp.open() as f:
 rr=csv.DictReader(f);assert not {'net_sol','ret','status','sell_t'}&set(rr.fieldnames);targets={z['mint']:float(z['decision_t']) for z in rr}
assert len(targets)==296
spec=importlib.util.spec_from_file_location('ev',c/'evaluate.py');ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev);assert not ev.DEV_NO_EVIDENCE
assert hashlib.sha256((c/'evaluate.py').read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86'
tok,gaps,outages,meta=ev.load(str(c/'replay'),1793950800,1794081600);stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};features={};recent={}
with gzip.open(c/'data/tokens_window.csv.gz','rt') as f:creators={z['mint']:z['creator'] for z in csv.DictReader(f)}
for mint,L in ev.iter_mints(str(c/'replay'),{m:tok[m] for m in targets},stats):
 t=targets[mint];known=[z for z in L if ev.fl(z['recv_ms']) is not None and float(z['recv_ms'])/1000<=t];known.sort(key=lambda z:(float(z['recv_ms']),int(z['slot']),int(z['row_id'])));last=known[-10:];lags=[float(z['recv_ms'])/1000-float(z['ts']) for z in last if ev.fl(z['ts']) is not None and math.isfinite(float(z['ts']))]
 ok=len(last)==len(lags)==10 and all(math.isfinite(v) for v in lags);v=statistics.median(lags) if ok else None;features[mint]={'mint':mint,'half':'early' if tok[mint]['created']<1794016200 else 'late','decision_t':t,'H1_available':ok,'H1_median_recorded_lag_s':v,'H1_veto':v>1 if ok else None,'last10_negative_lag_count':sum(v<0 for v in lags),'latest_used_receipt_t':float(last[-1]['recv_ms'])/1000 if last else None}
 recent[mint]={z['wallet'] for z in known if z['venue'] in ('','curve') and z['is_buy']=='1' and float(z['recv_ms'])/1000>t-60 and z['wallet']!=creators.get(mint)}
assert len(features)==296 and stats['non_contiguous']==0
checks=[];chosen=None

def check(name):
 global chosen
 missing=sum(not z[name+'_available'] for z in features.values());removed=sum(z.get(name+'_veto') is True for z in features.values());share=removed/296;eligible=missing==0 and .05<=share<=.95
 z={'hypothesis':name,'control_attempts':296,'feature_unknown':missing,'removed':removed,'removed_share':share,'retained':296-removed-missing,'eligible_for_scoring':eligible,'verdict':'TESTABLE' if eligible else 'NOT TESTABLE; not scored'};checks.append(z)
 if eligible:chosen=name
check('H1')
if chosen is None:
 for mint,z in features.items():
  t=z['decision_t'];known_ends=[e for s,e in gaps['main'] if e<=t and 0<=t-e<=180];z.update(H2_available=True,H2_veto=bool(known_ends),H2_latest_reopen_t=max(known_ends) if known_ends else None)
 check('H2')
if chosen is None:
 # Only if both earlier fixed prechecks fail. Raw known-buy histories, no outcomes.
 wallets=set().union(*recent.values());history=collections.defaultdict(list);st={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()}
 for m,L in ev.iter_mints(str(c/'replay'),tok,st):
  for z in L:
   if z['is_buy']=='1' and z['wallet'] in wallets and ev.fl(z['recv_ms']) is not None:history[z['wallet']].append((float(z['recv_ms'])/1000,m))
 for w in history:history[w].sort()
 for m,z in features.items():
  t=z['decision_t'];n=0
  for w in recent[m]:
   h=history[w];lo=bisect.bisect_right(h,(t-300,'\uffff'));hi=bisect.bisect_right(h,(t,'\uffff'));seen={a for rt,a in h[lo:hi] if a!=m};n+=len(seen)>=3
  ok=bool(recent[m]);z.update(H3_available=ok,H3_veto=n/len(recent[m])>=.5 if ok else None,H3_serial_buyers=n,H3_recent_noncreator_buyers=len(recent[m]))
 check('H3')
report={'protocol_definitions_commit':'8ca5b1eeff8f9ed1bf378cf7cfbbee8740166568','counts_only':True,'returns_or_exit_ledgers_read':False,'control_identity_file':'c014/quote_features.csv','control_identity_file_sha256':hashlib.sha256(qp.read_bytes()).hexdigest(),'prechecks_attempted':checks,'chosen':chosen,'not_run':[h for h in ['H1','H2','H3'] if h not in {z['hypothesis'] for z in checks}],'fixed_priority':'H1 then H2 then H3; stop at first testable','selection_based_on_outcomes':False,'thresholds_changed':False,'limits':['Recorded lag includes event timestamp granularity, not pure network delay','Control already explored; this is not fresh validation','Serial-buyer coverage is only tracked mints; no inferred independence or funding']}
(r/'PRECHECK.json').write_text(json.dumps(report,indent=2));(r/'precheck_features.json').write_text(json.dumps(features));
with (r/'precheck_features.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=sorted(set().union(*(z.keys() for z in features.values()))));w.writeheader();w.writerows(features.values())
print(json.dumps(report,indent=2),flush=True)
