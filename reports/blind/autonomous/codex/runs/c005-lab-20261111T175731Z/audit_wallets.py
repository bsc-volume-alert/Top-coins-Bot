"""C005 descriptive provenance audit, not a new wallet classification."""
import pathlib,csv,gzip,json,hashlib,collections
root=pathlib.Path(__file__).parent;pkg=root.parent/'entry-package-7nov';out={}
def num(x):
 try:return float(x)
 except:return None
for folder in ['snapshot3','current']:
 base=pkg/folder;sums={l.split(maxsplit=1)[1]:l.split(maxsplit=1)[0] for l in (base/'SHA256SUMS.txt').read_text().splitlines()};out[folder]={}
 for name in ['creator_trace.csv.gz','buyer_funding.csv.gz','buyer_funding_sum.csv.gz','fd_sniper_stats.csv.gz','snipers.csv.gz','farm_wallets.csv.gz','farm_dumps.csv.gz','operators.csv.gz','operator_coins.csv.gz','fd_watch.csv.gz','fd_early.csv.gz','fd_hgrowth.csv.gz']:
  p=base/name;digest=hashlib.file_digest(p.open('rb'),'sha256').hexdigest();assert digest==sums[name]
  with gzip.open(p,'rt') as f:rows=list(csv.DictReader(f))
  cols=list(rows[0]) if rows else [];pop={c:sum(r[c]!='' for r in rows) for c in cols};times={}
  for k in ['create_ts','created_ts','checked_ts','trace_ts','scanned_ts','ts','updated','first_ts','last_ts','built_ts','dump_ts','meta_ts','funded_ts']:
   vals=[num(r[k]) for r in rows if k in r and num(r[k]) is not None]
   if vals:times[k]={'n':len(vals),'min':min(vals),'max':max(vals)}
  r={'rows':len(rows),'sha256':digest,'columns':cols,'populated':pop,'times':times}
  if name=='fd_watch.csv.gz':
   r['lookup_status']=dict(collections.Counter(x['lookup_status'] for x in rows));r['checks_json_rows']=0;r['checks_rows_invalid_json']=0;keys=collections.Counter();count=0;fields=collections.Counter()
   for x in rows:
    try:checks=json.loads(x['checks']) if x['checks'] else None
    except: r['checks_rows_invalid_json']+=1;continue
    if checks:r['checks_json_rows']+=1
    items=list(checks.items()) if isinstance(checks,dict) else [(str(v.get('at','unknown')),v) for v in checks if isinstance(v,dict)] if isinstance(checks,list) else []
    for age,v in items:
     keys[str(age)]+=1
     if isinstance(v,dict):
      count+=1
      for k,z in v.items():
       if z is not None and z!='':fields[k]+=1
   r['check_age_keys']=dict(keys);r['check_records']=count;r['check_field_populated']=dict(fields)
  out[folder][name]=r
with gzip.open(root.parent/'c001-20261110T211226Z/data/tokens_window.csv.gz','rt') as f:
 census={r['mint']:float(r['create_ts']) for r in csv.DictReader(f)}
availability={}
for name,timecol in [('creator_trace.csv.gz','checked_ts'),('buyer_funding.csv.gz','ts'),('fd_watch.csv.gz','trace_ts')]:
 with gzip.open(pkg/'current'/name,'rt') as f:rows=list(csv.DictReader(f))
 matches=[r for r in rows if r['mint'] in census]
 availability[name]={'matching_census_mints':len({r['mint'] for r in matches}),'matching_rows':len(matches),'census_denominator':len(census),'potential_available_by_10s_mints':len({r['mint'] for r in matches if num(r.get(timecol)) is not None and num(r[timecol])<=census[r['mint']]+10 and (name!='fd_watch.csv.gz' or r['lookup_status']=='ran')}),'potential_available_by_120s_mints':len({r['mint'] for r in matches if num(r.get(timecol)) is not None and num(r[timecol])<=census[r['mint']]+120 and (name!='fd_watch.csv.gz' or r['lookup_status']=='ran')}),'warning':'Timestamp-screened presence only; attribution, overwritten fields and finalisation still need validation'}
(root/'timestamp_availability.json').write_text(json.dumps(availability,indent=2))
(root/'wallet_audit.json').write_text(json.dumps({'package_commit':'0e3be03c71949e069a7a31b5951f332bb563f68f','tables':out,'limitations':['updated timestamps are not first-label timestamps','Funding attribution is heuristic unless trace proof confirms incoming transfer','Trades omit transfers; sold/bought is not verified balance','No classification supplied to the experiment from these export-time lists']},indent=2));print('VERIFIED_TABLES',sum(len(v) for v in out.values()))
for name,r in out['current'].items():print(name,r['rows'],r.get('lookup_status'),r.get('times'))
