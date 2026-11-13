"""Descriptive dev-buy field disagreements across tables; no trade outcomes used."""
import pathlib,gzip,csv,decimal,json,collections,statistics,math,hashlib
r=pathlib.Path(__file__).parent;p=r.parent/'entry-package-7nov';D=decimal.Decimal
with gzip.open(p/'snapshot3/fd_watch.csv.gz','rt') as f:s={z['mint']:{k:z[k] for k in ['dev_buy_sol','created_ts']} for z in csv.DictReader(f)}
with gzip.open(p/'current/fd_watch.csv.gz','rt') as f:c={z['mint']:{k:z[k] for k in ['dev_buy_sol','created_ts','checks']} for z in csv.DictReader(f)}
with gzip.open(r.parent/'c001-20261110T211226Z/data/tokens_window.csv.gz','rt') as f:t={z['mint']:{k:z[k] for k in ['dev_buy_sol','create_ts']} for z in csv.DictReader(f)}
rows=[];kinds=collections.Counter();deltas=[]
for m in sorted(c.keys()&t.keys()):
 a=D(c[m]['dev_buy_sol']);b=D(t[m]['dev_buy_sol'])
 if a==b:continue
 kinds[('watch_zero' if a==0 else 'watch_positive')+' / '+('census_zero' if b==0 else 'census_positive')]+=1;deltas.append(abs(b-a));rows.append({'mint':m,'snapshot3_present':m in s,'snapshot3_dev_buy_sol':s[m]['dev_buy_sol'] if m in s else None,'current_dev_buy_sol':str(a),'window_census_dev_buy_sol':str(b),'current_created_ts':c[m]['created_ts'],'census_create_ts':t[m]['create_ts']})
vals=sorted(deltas)
def decimal_quant(q):return str(vals[min(len(vals)-1,int((len(vals)-1)*q))]) if vals else None
report={'task':'C016 cross-table provenance context','comparison':'current fd_watch versus later window tokens census','overlap':len(c.keys()&t.keys()),'different_numeric_values':len(rows),'disagreement_kinds':dict(kinds),'absolute_difference_sol':{'min':str(vals[0]) if vals else None,'median':str(statistics.median(vals)) if vals else None,'p95':decimal_quant(.95),'max':str(vals[-1]) if vals else None,'gt1e_6':sum(z>D('0.000001') for z in vals),'lt1e_9':sum(z<D('0.000000001') for z in vals)},'differences_also_in_snapshot3':sum(z['snapshot3_present'] for z in rows),'checks_column_inventory':{'representation':'JSON arrays, not integer counts','nested_inspection':'nested_checks_audit.json','actual_dev_buy_sol_write_time_available':False},'meaning':'All differing current-watch values are numerically zero while the census is positive. Zero is syntactically populated, NOT a verified no-buy observation. Field definitions/update pathways may differ; these tables alone cannot distinguish later revision from different semantics.','first_write_delay_distribution':None,'field_write_time_unavailable':True}
(r/'cross_table_audit.json').write_text(json.dumps(report,indent=2))
for i in range(0,len(rows),250):
 vv=rows[i:i+250]
 with (r/f'cross_table_differences_{i//250+1:03d}.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=list(vv[0]));w.writeheader();w.writerows(vv)
print(json.dumps(report,indent=2))
