"""Peer count reproduction, accounting checks and exact scorer-window check."""
import pathlib,json,csv,hashlib,collections,decimal
r=pathlib.Path(__file__).parent
expected={n:h for h,n in (z.split(maxsplit=1) for z in (r/'peer_f014/ARTIFACT_SHA256SUMS.txt').read_text().splitlines())}
for n in ['rules_common.py','rule_control.py','run_f014.py','precheck_f014.py','results.json','ledger.csv.gz']:assert hashlib.sha256((r/'peer_f014'/n).read_bytes()).hexdigest()==expected[n],n
a=json.loads((r/'peer_f014/precheck_expected.json').read_text());b=json.loads((r/'peer_f014/precheck_f014.json').read_text());assert a==b
def leaves(o):
 if isinstance(o,dict):return sum(leaves(v) for v in o.values())
 if isinstance(o,list):return sum(leaves(v) for v in o)
 return 1
x=json.loads((r/'results.json').read_text());s1=json.loads((r/'results_s1.json').read_text());assert s1['window']==['2026-11-06T07:40:00','2026-11-07T20:00:00'] and s1['N_common']==3638
for group in x['summaries'].values():
 for s in [group['all'],*group['by_half'].values(),*group['by_cell'].values()]:
  assert s['attempted']==s['resolved']+s['unavailable_fill']+s['uncertain_exits']
  assert s['filled_after_30s_screen']==s['resolved']+s['uncertain_exits']
  assert sum(s['unknown_why'].values())==s['unknown_total']
c=x['summaries']['control']['all'];a=x['summaries']['candidate']['all'];v=x['summaries']['removed']['all']
for key in ['attempted','resolved','unavailable_fill','uncertain_exits','filled_after_30s_screen']:assert a[key]+v[key]==c[key]
assert abs(a['total_net_sol_resolved']+v['total_net_sol_resolved']-c['total_net_sol_resolved'])<1e-12
with (r/'creator_features.csv').open() as f:F=list(csv.DictReader(f))
for z in F:
 assert z['feature_known']=='True' and int(z['first_slot_missing_receipt'])==int(z['first_slot_late_rows'])==0 and float(z['latest_first_slot_receipt_t'])<=float(z['decision_t'])
 assert (decimal.Decimal(z['creator_buy_sol'])>=5)==(z['veto']=='True')
zero_by_cell=collections.Counter(z['cell'] for z in F if decimal.Decimal(z['creator_buy_sol'])==0)
out={'peer_commit':'a27c504dfe240fecf132123bcfc5c18cb2dd4091','peer_F014_precheck_equal_leaves':leaves(b),'peer_F014_precheck_JSON_exact':True,'peer_source_and_ledger_hashes_verified':6,'control_record_fields_equal':x['peer_control_fields_equal'],'control_record_count':x['peer_control_records'],'all_accounting_invariants':True,'all_679_known_before_decision':True,'zero_first_slot_size_by_F009_cell':dict(zero_by_cell),'normalized_fill_counts':{'control':c['filled_after_30s_screen'],'candidate':a['filled_after_30s_screen']},'corrected_S1_exact_window_verified':True,'no_claim_original_wrong_window_invocation_is_evidence':True,'s1':{name:val['by_size']['0.2'] for name,val in s1['rules'].items()},'s1_bootstrap_note':'Frozen K=2 for this invocation, not cumulative search control; unknown lower scores are artificial penalties, not realized losses','remaining_limits':['>=100K detection was not scored','Receipt evidence proves recorded availability,not complete blockchain history','No fresh test release; no rule retune']}
(r/'validation.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
