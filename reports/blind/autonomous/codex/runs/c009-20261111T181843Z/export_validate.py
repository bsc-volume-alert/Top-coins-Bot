import pathlib,json,csv,math,hashlib
p=pathlib.Path(__file__).parent;rows=json.loads((p/'records.json').read_text());outputs=[];keys=['mint','age','half','created','decision','decision_venue','quote_reserve_sol','same_state_roundtrip_loss','five_sol_stress_ratio','gate_pass','instant_graduation_flag','trade_status','reason','label','fill_t','fill_row_id','fill_venue','sell_t','exit_row_id','exit_venue','net_sol','ret','future_one_slot_drain_count','largest_drain_sol']
restored=[]
for i in range(0,len(rows),200):
 name=f'ledger_{i//200+1:03d}.csv';outputs.append(name)
 with (p/name).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=keys,extrasaction='ignore');w.writeheader();w.writerows(rows[i:i+200])
 with (p/name).open() as f:restored.extend(csv.DictReader(f))
assert len(restored)==len(rows)
r=json.loads((p/'results.json').read_text())
for name in ['L002','CONTROL']:
 for half in ['early','late','all']:
  rr=[x for x in restored if x['age']=='300' and (name=='CONTROL' or x['gate_pass']=='True') and (half=='all' or x['half']==half)];expected=r['trading'][name][half];x=sorted(float(x['net_sol']) for x in rr if x['trade_status']=='scored')
  assert len(rr)==expected['attempted'];assert len(x)==expected['scored'];assert math.isclose(math.fsum(x),expected['total_observed_net_sol'],abs_tol=1e-12);assert math.isclose(math.fsum(x[:-3]),expected['without_best3_sol'],abs_tol=1e-12)
for x in restored:
 if x['fill_t']:assert float(x['fill_t'])<=float(x['sell_t'])<=float(x['decision'])+7200
 assert 0<float(x['five_sol_stress_ratio'])<1
assert len(json.loads((p/'matched_pairs.json').read_text()))==0
(p/'validation.json').write_text(json.dumps({'record_count':len(restored),'trade_summary_and_no_best3_roundtrip_match':True,'horizon_invariants':True,'stress_ratios_valid':True,'matching_empty_not_fabricated':True,'files':outputs},indent=2));print('VALIDATED',len(restored),'RECORDS',len(outputs),'FILES')
