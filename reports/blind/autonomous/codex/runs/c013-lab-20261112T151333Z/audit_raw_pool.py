import pathlib,json,gzip,csv,math
r=pathlib.Path(__file__).parent;c=r.parent/'c001-20261110T211226Z/data';b=json.loads((r/'best_trade_audit.json').read_text());wanted={x['row_id'] for x in b['selected_rows'].values()};found={};count=0
for p in sorted(c.glob('trades_part_*.csv.gz')):
 with gzip.open(p,'rt',newline='') as f:
  for z in csv.DictReader(f):
   if z['mint']==b['mint'] and z['row_id'] in wanted:
    found[z['row_id']]={k:z.get(k) for k in ['row_id','sig','slot','ts','recv_ms','vsol','vtok','pool','ev_idx','base_raw','quote_raw','pool_base_raw','pool_quote_raw','base_mint','quote_mint','base_dec','quote_dec','dec_ver','px_adj']};count+=1
assert set(found)==wanted
ps=b['selected_rows']['partial_row_id'];ss=b['selected_rows']['exit_row_id'];ratio=float(ss['vsol'])*float(ss['vtok'])/(float(ps['vsol'])*float(ps['vtok']))
out={'mint':b['mint'],'raw_selected_rows':found,'duplicate_row_matches':count,'pool_reserve_product_exit_over_partial':ratio,'interpretation':'Product changes can reflect liquidity changes, fees, decoding or state semantics; saved LP-account evidence is insufficient to assign cause. Exact quote/decimal evidence does not prove reserve correctness. Do not suppress winner or certify it as live executable.'}
(r/'raw_pool_evidence.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
