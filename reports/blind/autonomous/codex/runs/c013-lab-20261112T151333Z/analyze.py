"""C013 independent ledger reconciliation and L005 paired analysis; no search."""
import pathlib,json,csv,gzip,collections,statistics,math,hashlib,random
r=pathlib.Path(__file__).parent;prior=r.parent/'c010-lab-20261111T211258Z';src=r/'claude_source';built=r/'claude_rebuilt'
repro={}
for compressed,plain in [('ledger.csv.gz','ledger.csv'),('features_at_300s.csv.gz','features_at_300s.csv')]:
 original=gzip.decompress((src/compressed).read_bytes());actual=(built/plain).read_bytes();assert original==actual,(compressed,'not_identical');rr=list(csv.DictReader(actual.decode().splitlines()));repro[plain]={'decompressed_bytes_identical':True,'rows':len(rr),'fields_compared':sum(len(x) for x in rr),'sha256':hashlib.sha256(actual).hexdigest()}
expected=json.loads((src/'results_s2.json').read_text());actual=json.loads((built/'results_s2.json').read_text());assert expected==actual
repro['results_json_identical']=True
old=json.loads((prior/'trade_ledger.json').read_text());own={x['mint']:x for x in old['CONTROL']};high=json.loads((r/'highinit_ledger.json').read_text());hi={x['mint']:x for x in high['CONTROL']}
with gzip.open(src/'features_at_300s.csv.gz','rt') as f:features=list(csv.DictReader(f))
E={x['mint'] for x in features if x['eligible_E']=='True'};R={m for m,x in own.items() if x['features']['recent_buyers_60s']>=5};assert len(E)==679 and E<=set(own)
with gzip.open(src/'ledger.csv.gz','rt') as f:raw=[x for x in csv.DictReader(f) if x['spec']=='control' and x['eligible_E']=='True']
def peer(x):
 q=dict(x);q['created']=float(x['created']);q['entry_t']=float(x['entry_t']) if x['entry_t'] else None
 if x['cat']=='unknown' and x['why'].startswith('fill'):st='fill_unavailable'
 elif x['fill_state_age_s'] and float(x['fill_state_age_s'])>30:st='fill_unavailable'
 elif x['cat']=='scored' and x['exit_state_age_s'] and float(x['exit_state_age_s'])<=30:st='scored'
 else:st='exit_uncertain'
 q['status']=st;q['why_original']=x['why'];q['why']=('stale fill>30s' if st=='fill_unavailable' and x['cat']=='scored' else 'stale exit>30s' if st=='exit_uncertain' and x['cat']=='scored' else x['why'])
 if st=='scored':q['net_sol']=float(x['net_sol']);q['sell_t']=float(x['t_sell'])
 return q
claude={x['mint']:peer(x) for x in raw};assert set(claude)==E

def summ(rows):
 cc=collections.Counter(x['status'] for x in rows);x=sorted(x['net_sol'] for x in rows if x['status']=='scored');hh={x['half'] for x in rows};den=1593 if hh=={'early'} else 2045 if hh=={'late'} else 3638
 return {'attempted':len(rows),'filled_valid_state':len(rows)-cc['fill_unavailable'],'fill_unavailable':cc['fill_unavailable'],'resolved':cc['scored'],'uncertain_exits':cc['exit_uncertain'],'unknown_total':len(rows)-cc['scored'],'observed_total_net_sol':math.fsum(x),'mean_net_sol':statistics.mean(x) if x else None,'median_net_sol':statistics.median(x) if x else None,'mean_return':statistics.mean(x)/.2 if x else None,'median_return':statistics.median(x)/.2 if x else None,'win_rate':sum(v>0 for v in x)/len(x) if x else None,'share_loss_gt50':sum(v<-.1 for v in x)/len(x) if x else None,'without_best1_sol':math.fsum(x[:-1]),'without_best3_sol':math.fsum(x[:-3]),'eligible_launch_denominator':den,'observed_net_per_eligible_launch':math.fsum(x)/den,'unknown_reasons':dict(collections.Counter(y['why'] for y in rows if y['status']!='scored'))}
def halves(mapping,keys):return {h:summ([mapping[m] for m in keys if h=='all' or mapping[m]['half']==h]) for h in ['early','late','all']}
def paired(A,B,keys):
 out={}
 for h in ['early','late','all']:
  mm=[m for m in keys if (h=='all' or A[m]['half']==h) and A[m]['status']==B[m]['status']=='scored'];a=[A[m] for m in mm];b=[B[m] for m in mm];dd=[A[m]['net_sol']-B[m]['net_sol'] for m in mm]
  out[h]={'both_resolved':len(mm),'A':summ(a),'B':summ(b),'A_minus_B_net_sol':math.fsum(dd),'identical_net':sum(abs(v)<1e-12 for v in dd),'different_net':sum(abs(v)>=1e-12 for v in dd),'A_higher':sum(v>1e-12 for v in dd),'A_lower':sum(v<-1e-12 for v in dd),'delta_median_sol':statistics.median(dd) if dd else None}
 return out
ledger=[]
for m in sorted(E):
 a=own[m];b=claude[m];h=hi[m];z={'mint':m,'half':a['half'],'codex_status':a['status'],'codex_reason':a['why'],'claude_status':b['status'],'claude_reason':b['why'],'claude_raw_category':b['cat'],'claude_fill_state_age_s':b['fill_state_age_s'],'claude_exit_state_age_s':b['exit_state_age_s'],'codex_net_sol':a.get('net_sol'),'claude_net_sol':b.get('net_sol') if b['status']=='scored' else None,'codex_sell_t':a.get('sell_t'),'claude_sell_t':b.get('sell_t'),'codex_highinit_firstreceipt_status':h['status'],'codex_highinit_firstreceipt_reason':h['why'],'codex_highinit_firstreceipt_sell_t':h.get('sell_t'),'codex_highinit_firstreceipt_net_sol':h.get('net_sol'),'receipt_recent_buyers':a['features']['recent_buyers_60s']}
 if a['status']==b['status']=='scored':z['net_difference_sol']=a['net_sol']-b['net_sol'];z['exit_time_difference_sec']=a['sell_t']-b['sell_t']
 ledger.append(z)
flags=[m for m in E if own[m]['status']=='fill_unavailable' and own[m]['why']=='completed curve cannot accept buy']
report={'task':'C013','protocol_commit':'6e9db558fd1feb1745d4bd9be97c1ceb50c8166a','input_codex_commit':'5024b9ef640b6e198c24851e1fc5f632001e525e','input_claude_commit':'fc6b05aa75162444776a93035b34a7ad24c77395','reproduction':repro,'denominator':3638,'E_count':len(E),'E_missing_from_codex':sorted(E-set(own)),'receipt_floor_count':len(R),'event_only':sorted(E-R),'receipt_only':sorted(R-E),'codex_restricted_E':halves(own,E),'codex_receipt_floor':halves(own,R),'claude_E':halves(claude,E),'paired_codex_minus_claude':paired(own,claude,E),'highinit_only_diagnostic':{'E':halves(hi,E),'paired_vs_original_codex':paired(hi,own,E),'paired_vs_claude':paired(hi,claude,E),'changed_E_records':sum(any(own[m].get(k)!=hi[m].get(k) for k in ['status','net_sol','trigger_t','sell_t']) for m in E)},'status_cross_table':[{'codex':a,'claude':b,'count':n} for (a,b),n in sorted(collections.Counter((own[m]['status'],claude[m]['status']) for m in E).items())],'completed_curve_buy_flags':{'count':len(flags),'claude_statuses':dict(collections.Counter(claude[m]['status'] for m in flags)),'claude_observed_net_contribution':math.fsum(claude[m]['net_sol'] for m in flags if claude[m]['status']=='scored'),'mints':sorted(flags)},'interpretation_limits':['Different execution screens are not an entry-strategy improvement','Scored peer marks across a logged during-hold gap are scenario outputs, not newly known true exits','No original evaluator, rule or ledger repaired retrospectively','Event-time and receipt-time windows are causally knowable but different features','Unknown outcomes stay separate; no complete-market profitability claim']}
report['nonpaired_reasons']={'claude_scored_codex_uncertain':dict(collections.Counter(own[m]['why'] for m in E if claude[m]['status']=='scored' and own[m]['status']=='exit_uncertain')),'codex_scored_claude_uncertain':dict(collections.Counter(claude[m]['why'] for m in E if own[m]['status']=='scored' and claude[m]['status']=='exit_uncertain')),'highinit_remaining_status_cross_table':[{'codex_highinit':a,'claude':b,'count':n} for (a,b),n in sorted(collections.Counter((hi[m]['status'],claude[m]['status']) for m in E).items())]}
(r/'control_reconciliation.json').write_text(json.dumps(report,indent=2))
# One fixed partial-profit strategy plus its locked original baseline.
tr=json.loads((r/'trade_ledger.json').read_text());A={x['mint']:x for x in tr['L005']};B={x['mint']:x for x in tr['BASELINE']};previous={x['mint']:x for x in old['L003']};assert set(A)==set(B)==set(previous) and len(A)==296
fields=0
for m,p in previous.items():
 for k,v in p.items():
  if k=='variant':continue
  assert B[m][k]==v,(m,k,B[m][k],v);fields+=1
no_partial=[m for m in A if not A[m].get('partial_done') and not A[m].get('partial_failure')]
assert all(A[m]['status']==B[m]['status'] and A[m].get('net_sol')==B[m].get('net_sol') and A[m].get('sell_t')==B[m].get('sell_t') for m in no_partial)
z={'experiment':'CDEX-L005','new_strategy_specs':1,'total_specs_with_baseline':2,'baseline_fields_identical':fields,'baseline_attempts_identical':296,'unchanged_no_partial_records':len(no_partial),'candidate':halves(A,set(A)),'baseline':halves(B,set(B)),'paired_candidate_minus_baseline':paired(A,B,set(A)),'partial':{'modeled_sells_landed':sum(x.get('partial_done',False) for x in A.values()),'unavailable_partial_attempts':sum(bool(x.get('partial_failure')) for x in A.values()),'resolved_partial_positions':sum(x.get('partial_done',False) and x['status']=='scored' for x in A.values()),'additional_fee_per_partial_position_sol':.00075,'unresolved_partial_positions':sum(x.get('partial_done',False) and x['status']!='scored' for x in A.values()),'modeled_partial_cash_on_unresolved_positions_sol':math.fsum(x.get('partial_proceeds_after_protocol_fee_sol') or 0. for x in A.values() if x.get('partial_done') and x['status']!='scored'),'all_modeled_additional_sell_fees_sol':sum(x.get('additional_fixed_cost_sol',0.) for x in A.values()),'resolved_additional_fixed_fees_sol':sum(x.get('additional_fixed_cost_sol',0.) for x in A.values() if x['status']=='scored')},'availability_cross_table':[{'candidate':a,'baseline':b,'count':n} for (a,b),n in sorted(collections.Counter((A[m]['status'],B[m]['status']) for m in A).items())],'uncertainty':{},'assumptions':['Independent positions and unlimited capital; own historical price impact does not persist','Extra sell costs0.00075SOL assumed, not live measured','Paired availability-selected set; same previously explored development data; no fresh confirmation','Partial cash receipts are modeled outcomes, not proof of live fills']}
for h in ['early','late','all']:
 keys=[m for m in A if A[m]['status']==B[m]['status']=='scored' and (h=='all' or A[m]['half']==h)];blocks=collections.defaultdict(float)
 for m in keys:blocks[int(A[m]['created']//10800)]+=A[m]['net_sol']-B[m]['net_sol']
 rng=random.Random(13013);v=list(blocks.values());boots=sorted(sum(rng.choice(v) for _ in v) for _ in range(5000)) if v else []
 z['uncertainty'][h]={'creation_3h_blocks':len(v),'exploratory_paired_delta_total_95pct':[boots[125],boots[4874]] if boots else None}
(r/'partial_comparison.json').write_text(json.dumps(z,indent=2))
def export(rows,name,size=100):
 keys=sorted(set().union(*(set(x) for x in rows))) if rows else []
 for i in range(0,len(rows),size):
  with (r/f'{name}_{i//size+1:03d}.csv').open('w',newline='') as f:
   w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(rows[i:i+size])
export(ledger,'control_ledger')
export([x for x in ledger if x['codex_status']!=x['claude_status'] or abs(x.get('net_difference_sol',0))>1e-12],'control_disagreements')
for arm,rows in tr.items():export([{**x,'features':json.dumps(x['features'],sort_keys=True)} for x in rows],'trade_'+arm.lower(),50)
export([{'mint':m,'half':A[m]['half'],'candidate_net_sol':A[m]['net_sol'],'baseline_net_sol':B[m]['net_sol'],'delta_sol':A[m]['net_sol']-B[m]['net_sol'],'partial_done':A[m]['partial_done'],'partial_landing_t':A[m]['partial_landing_t'],'partial_proceeds_sol':A[m]['partial_proceeds_after_protocol_fee_sol'],'additional_fixed_cost_sol':A[m]['additional_fixed_cost_sol']} for m in sorted(A) if A[m]['status']==B[m]['status']=='scored'],'paired_partial')
print(json.dumps({'C013':report,'L005':z},indent=2))
