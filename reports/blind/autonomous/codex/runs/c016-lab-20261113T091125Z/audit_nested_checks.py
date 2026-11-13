"""Inspect nested checks for actual knowledge timestamps, without treating age as an epoch."""
import pathlib,gzip,csv,json,collections,math
r=pathlib.Path(__file__).parent;p=r.parent/'entry-package-7nov';report={}
for folder in ['snapshot3','current']:
 ct=collections.Counter();keys=collections.Counter();ages=[];positive_fd_zero=set()
 with gzip.open(p/folder/'fd_watch.csv.gz','rt') as f:
  for row in csv.DictReader(f):
   try:q=json.loads(row['checks']);ct['parsed_json']+=1
   except Exception:ct['parse_errors']+=1;continue
   if not isinstance(q,list):ct['not_list']+=1;continue
   ct['empty_list_rows' if not q else 'nonempty_list_rows']+=1
   for z in q:
    if not isinstance(z,dict):ct['non_object_items']+=1;continue
    ct['check_objects']+=1;keys.update(z.keys())
    if 'dev_buy' in z:
     ct['with_dev_buy']+=1
     if isinstance(z['dev_buy'],(int,float)) and z['dev_buy']>0:
      ct['positive_dev_buy']+=1
      if float(row['dev_buy_sol'])==0:positive_fd_zero.add(row['mint'])
    if isinstance(z.get('at'),(int,float)):ages.append(z['at'])
 report[folder]={'counts':dict(ct),'nested_key_counts':dict(keys),'nominal_at_range':[min(ages),max(ages)] if ages else None,'rows_with_positive_check_dev_buy_and_zero_top_level_dev_buy_sol':len(positive_fd_zero),'explicit_knowledge_or_write_timestamp_keys':{k:keys[k] for k in ['checked_ts','observed_ts','recv_ms','dev_buy_ts','dev_buy_known_at','dev_buy_written_at'] if keys[k]}}
report['interpretation']='Nested checks are JSON arrays. dev_buy and nominal relative at exist, but no actual receipt/checked timestamp or dev_buy_sol write time. A checkpoint dev_buy is not automatically the same semantic field as top-level dev_buy_sol. Do not convert created_ts+at into a first-write or knowledge timestamp.'
(r/'nested_checks_audit.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
