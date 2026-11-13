"""Verify unchanged baseline, actor-event support and paired comparison; no search."""
import pathlib,json,csv,collections,statistics,math,random
r=pathlib.Path(__file__).parent;x=json.loads((r/'trade_ledger.json').read_text());A={z['mint']:z for z in x['L007']};B={z['mint']:z for z in x['BASELINE']};old={z['mint']:z for z in json.loads((r.parent/'c010-lab-20261111T211258Z/trade_ledger.json').read_text())['L003']};assert set(A)==set(B)==set(old) and len(A)==296
fields=0
for m,p in old.items():
 for k,v in p.items():
  if k=='variant':continue
  assert B[m][k]==v,(m,k,B[m][k],v);fields+=1
fired=[z for z in A.values() if z.get('trigger_reason')=='creator_cash_recovery_sell']
for z in fired:
 q=z['creator_cashflow_at_exit_scan'];assert not q['unknown'] and q['buy_sol']>0 and q['sell_sol']>=q['buy_sol'] and q['buy_tokens']-q['sell_tokens']>0;assert abs(z['sell_t']-z['trigger_t']-.7)<1e-6
paired={};evidence=[]
def metrics(vals):return {'n':len(vals),'total_net_sol':math.fsum(vals),'mean_net_sol':statistics.mean(vals) if vals else None,'median_net_sol':statistics.median(vals) if vals else None}
for h in ['early','late','all']:
 mm=[m for m in A if A[m]['status']==B[m]['status']=='scored' and (h=='all' or A[m]['half']==h)];aa=[A[m]['net_sol'] for m in mm];bb=[B[m]['net_sol'] for m in mm];dd=[a-b for a,b in zip(aa,bb)];blocks=collections.defaultdict(float)
 for m in mm:blocks[int(A[m]['created']//10800)]+=A[m]['net_sol']-B[m]['net_sol']
 rng=random.Random(15015);vv=list(blocks.values());boot=sorted(sum(rng.choice(vv) for _ in vv) for _ in range(5000)) if vv else []
 paired[h]={'both_resolved':len(mm),'candidate':metrics(aa),'baseline':metrics(bb),'delta_total_sol':math.fsum(dd),'improved':sum(v>1e-12 for v in dd),'worse':sum(v<-1e-12 for v in dd),'equal':sum(abs(v)<=1e-12 for v in dd),'exploratory_3h_block_delta_total_95pct':[boot[125],boot[4874]] if boot else None,'blocks':len(vv)}
 if h=='all':evidence=[{'mint':m,'half':A[m]['half'],'candidate_net_sol':A[m]['net_sol'],'baseline_net_sol':B[m]['net_sol'],'difference_sol':A[m]['net_sol']-B[m]['net_sol'],'candidate_trigger_reason':A[m]['trigger_reason'],'candidate_trigger_t':A[m]['trigger_t'],'baseline_trigger_t':B[m]['trigger_t']} for m in mm]
filled=[z for z in A.values() if 'creator_cashflow_at_fill' in z]
def fill_group(q):
 a=q['creator_cashflow_at_fill']
 if a['unknown']:return 'cashflow unknown'
 if a['buy_sol']<=0:return 'no captured creator purchase'
 if a['buy_tokens']-a['sell_tokens']<=0:return 'no positive trade-derived token balance'
 if a['sell_sol']>=a['buy_sol']:return 'recorded purchase SOL already recovered; positive proxy inventory'
 return 'recorded purchase SOL not yet recovered; positive proxy inventory'
out={'experiment':'CDEX-L007','protocol_commit':'88c7c23db92541bd9f566238f8899bcda8d56f9f','new_strategy_specs':1,'total_specs_with_baseline':2,'baseline_fields_identical':fields,'same_entry_attempts':296,'R54_scope':'No entry filter/veto;296entries retained. Trigger support reported, no entry-removal precheck used as an outcome-selection device.','trigger_counts':dict(collections.Counter(z.get('trigger_reason','fill_unavailable') for z in A.values())),'creator_event_actual_exits':len(fired),'creator_event_exit_statuses':dict(collections.Counter(z['status'] for z in fired)),'creator_condition_on_trail_tie':sum(z.get('actor_condition_at_last_row',False) and z.get('trigger_reason')=='30pct_proceeds_trail' for z in A.values()),'cashflow_at_fill_groups':dict(collections.Counter(fill_group(z) for z in filled)),'candidate_actor_history_unknown_count':sum(z.get('creator_cashflow_at_exit_scan',{}).get('unknown',False) for z in A.values()),'paired':paired,'availability_cross_table':[{'candidate':a,'baseline':b,'count':n} for (a,b),n in sorted(collections.Counter((A[m]['status'],B[m]['status']) for m in A).items())],'limitations':['Two event exits cannot establish a population-level mechanism effect','Trade-derived creator cash recovery is not verified cost basis/profit or actual token balance','Existing quote,retention,gap and decoder uncertainty preserved','Previously explored development window; no fresh evaluation or family retune']}
(r/'creator_comparison.json').write_text(json.dumps(out,indent=2))
def export(rows,prefix,n=50):
 for i in range(0,len(rows),n):
  vv=rows[i:i+n]
  with (r/f'{prefix}_{i//n+1:03d}.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=sorted(set().union(*(z.keys() for z in vv))));w.writeheader();w.writerows(vv)
for name,rr in x.items():export([{**z,'features':json.dumps(z['features'],sort_keys=True),'creator_cashflow_at_fill':json.dumps(z.get('creator_cashflow_at_fill'),sort_keys=True),'creator_cashflow_at_exit_scan':json.dumps(z.get('creator_cashflow_at_exit_scan'),sort_keys=True)} for z in rr],'trade_'+name.lower())
export(evidence,'paired_creator',100);export([z for z in evidence if abs(z['difference_sol'])>1e-12],'changed_pairs')
ex={}
for arm,rr in x.items():
 ex[arm]={}
 for h in ['early','late','all']:
  vv=[z for z in rr if z['status']!='fill_unavailable' and (h=='all' or z['half']==h)];events=sorted([(z['fill_t'],.2) for z in vv]+[(z['sell_t'],-.2) for z in vv]);active=peak=0.
  for _,v in events:active+=v;peak=max(peak,active)
  ex[arm][h]={'filled_positions':len(vv),'modeled_peak_stake_sol':peak,'modeled_stake_seconds':math.fsum((z['sell_t']-z['fill_t'])*.2 for z in vv),'median_modeled_hold_seconds':statistics.median(z['sell_t']-z['fill_t'] for z in vv) if vv else None,'limits':'Unlimited independent capital,nonpersistent own impact; unresolved positions may remain open longer.'}
(r/'exposure.json').write_text(json.dumps(ex,indent=2));print(json.dumps(out,indent=2))
