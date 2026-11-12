"""Export record-level ledgers and independently verify their counts and sums."""
import pathlib,csv,json,math,hashlib
p=pathlib.Path(__file__).parent;data=json.loads((p/'trade_ledger.json').read_text());expected=json.loads((p/'lab_results.json').read_text())['results'];outputs=[]
columns=['variant','mint','half','status','why','decision_t','fill_t','fill_row_id','fill_venue','trigger_t','trigger_reason','sell_t','exit_row_id','exit_venue','net_sol','ret','recent_buyers_60s','material_net_buyers_60s','inflow_persistence_receipt','gross_received_curve_sol','negative_trade_balance_wallets']
for variant,rows in data.items():
 restored=[]
 for i in range(0,len(rows),100):
  name=f'ledger_{variant}_{i//100+1:03d}.csv';f=p/name;outputs.append(name)
  with f.open('w',newline='') as out:
   w=csv.DictWriter(out,fieldnames=columns);w.writeheader()
   for r in rows[i:i+100]:w.writerow({k:({**r,**r['features']}).get(k,'') for k in columns})
  with f.open() as src:restored.extend(csv.DictReader(src))
 assert len(restored)==len(rows)
 for half in ['early','late','all']:
  rr=[r for r in restored if half=='all' or r['half']==half];e=expected[variant][half];sc=[float(r['net_sol']) for r in rr if r['status']=='scored'];assert len(rr)==e['attempted'];assert len(sc)==e['scored'];assert math.isclose(math.fsum(sc),e['total_observed_net_sol'],abs_tol=1e-12)
  for r in rr:
   if r['fill_t']:
    assert float(r['sell_t'])>=float(r['fill_t'])
    assert float(r['sell_t'])<=float(r['decision_t'])+7200
  if half=='all':
   x=sorted(sc);assert math.isclose(math.fsum(x[:-3]),e['without_best3_sol'],abs_tol=1e-12)
report={'ledger_files':outputs,'all_record_counts_and_sums_match':True,'landing_and_horizon_invariants':True,'candidate_any_negative_trade_balance_wallets':sum(r['features']['negative_trade_balance_wallets']>0 for r in data['L003']),'variants_tested':2,'rule_retuned_after_outcomes':False}
(p/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
