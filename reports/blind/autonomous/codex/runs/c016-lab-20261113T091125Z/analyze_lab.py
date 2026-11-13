"""L008 fixed lag-veto verification and R11/R63 accounting; no parameter search."""
import pathlib,json,csv,statistics,math,collections
r=pathlib.Path(__file__).parent;x=json.loads((r/'trade_ledger.json').read_text());old={z['mint']:z for z in json.loads((r.parent/'c010-lab-20261111T211258Z/trade_ledger.json').read_text())['L003']};B={z['mint']:z for z in x['BASELINE']};A={z['mint']:z for z in x['L008']};V={z['mint']:z for z in x['VETOED']};assert len(B)==296 and set(B)==set(old) and set(A)|set(V)==set(B) and not set(A)&set(V)
fields=0
for m,q in old.items():
 for k,v in q.items():
  if k=='variant':continue
  assert B[m][k]==v,(m,k);fields+=1
for m,q in A.items():assert {k:v for k,v in q.items() if k!='variant'}=={k:v for k,v in B[m].items() if k!='variant'}
pre=json.loads((r/'PRECHECK.json').read_text());assert pre['chosen']=='H1' and pre['prechecks_attempted'][0]['removed']==len(V)==51 and len(A)==245
paired={};group={};pairs=[]
for h in ['early','late','all']:
 aa=[q for q in A.values() if q['status']=='scored' and (h=='all' or q['half']==h)];vv=[q for q in V.values() if q['status']=='scored' and (h=='all' or q['half']==h)];vals=[q['net_sol'] for q in aa];removed=[q['net_sol'] for q in vv]
 mm=[q['mint'] for q in aa if B[q['mint']]['status']=='scored'];z=math.fsum(A[m]['net_sol'] for m in mm);zz=math.fsum(B[m]['net_sol'] for m in mm)
 paired[h]={'both_resolved':len(mm),'candidate_total_sol':z,'baseline_on_same_mints_sol':zz,'difference_sol':z-zz,'candidate_mean_sol':statistics.mean(vals) if vals else None,'candidate_median_sol':statistics.median(vals) if vals else None,'all_shared_records_identical':True,'candidate_only_resolved':sum(q['status']=='scored' and B[q['mint']]['status']!='scored' for q in A.values() if h=='all' or q['half']==h),'control_only_resolved':sum(q['status']=='scored' and q['mint'] not in A for q in B.values() if h=='all' or q['half']==h),'R63_missing_baseline_sentence':'The true baseline exit on candidate-only resolved launches would be unknown; last usable marks do not identify its sign. Here there are zero candidate-only resolved launches.'}
 group[h]={'kept_resolved':len(vals),'removed_resolved':len(removed),'kept_mean_net_sol':statistics.mean(vals) if vals else None,'removed_mean_net_sol':statistics.mean(removed) if removed else None,'kept_minus_removed_mean_sol':statistics.mean(vals)-statistics.mean(removed) if vals and removed else None,'comparison_has_30_resolved_each':len(vals)>=30 and len(removed)>=30,'uncertainty':'INCONCLUSIVE if either side has fewer30resolved; no inferential claim or bootstrap rescue','unknown_kept':sum(q['status']!='scored' and (h=='all' or q['half']==h) for q in A.values()),'unknown_removed':sum(q['status']!='scored' and (h=='all' or q['half']==h) for q in V.values())}
 if h=='all':pairs=[{'mint':m,'half':A[m]['half'],'candidate_net_sol':A[m]['net_sol'],'baseline_net_sol':B[m]['net_sol'],'difference_sol':A[m]['net_sol']-B[m]['net_sol']} for m in mm]
report={'experiment':'CDEX-L008','definitions_commit':'8ca5b1eeff8f9ed1bf378cf7cfbbee8740166568','binding_counts_published_before_score_commit':'fc5119749dac79a800853abd4eab034f64e5138b','baseline_fields_reproduced':fields,'baseline_attempts':296,'chosen_hypothesis':'H1','hypotheses_proposed':3,'prechecks_run':1,'prechecks_not_run':['H2','H3'],'thresholds_tried':1,'new_scored_candidates':1,'total_specs_with_baseline':2,'candidate_attempts':len(A),'removed':len(V),'removed_share':len(V)/296,'paired':paired,'group_comparison':group,'verdict':'inconclusive: removed side only27resolved; negative retained point-total and predicted direction not observed','limits':['Recorded receipt-minus-event lag includes second-granularity timestamp effects, not pure transport delay','All trade outcomes on shared entries identical; an entry veto does not improve its shared trade returns','Unknown removed baseline outcomes are not known losses/zero returns','Existing exploratory control; no fresh confirmation','No threshold lowering or fallback selection after outcomes']}
(r/'filter_verification.json').write_text(json.dumps(report,indent=2))
def export(rr,prefix,n=50):
 for i in range(0,len(rr),n):
  vv=rr[i:i+n]
  with (r/f'{prefix}_{i//n+1:03d}.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=sorted(set().union(*(z.keys() for z in vv))));w.writeheader();w.writerows(vv)
for name,rr in x.items():export([{**q,'features':json.dumps(q['features'],sort_keys=True),'lag_feature':json.dumps(q['lag_feature'],sort_keys=True)} for q in rr],'trade_'+name.lower())
export(pairs,'paired_filter',100)
ex={}
for name,rr in x.items():
 ex[name]={}
 for h in ['early','late','all']:
  z=[q for q in rr if q['status']!='fill_unavailable' and (h=='all' or q['half']==h)];events=sorted([(q['fill_t'],.2) for q in z]+[(q['sell_t'],-.2) for q in z]);active=peak=0.
  for _,v in events:active+=v;peak=max(peak,active)
  ex[name][h]={'filled_positions':len(z),'modeled_peak_stake_sol':peak,'modeled_stake_seconds':math.fsum((q['sell_t']-q['fill_t'])*.2 for q in z),'median_modeled_hold_sec':statistics.median(q['sell_t']-q['fill_t'] for q in z) if z else None,'limits':'Independent unlimited capital; unresolved positions may remain open longer.'}
(r/'exposure.json').write_text(json.dumps(ex,indent=2));print(json.dumps(report,indent=2))
