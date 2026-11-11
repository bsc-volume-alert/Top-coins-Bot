"""C003: descriptive coverage audit of approved package; no predictive search."""
import pathlib,csv,gzip,json,hashlib,collections,datetime as dt
root=pathlib.Path(__file__).parent;pkg=root.parent/'entry-package-7nov';allcoins=root.parent/'c001-20261110T211226Z/data'
def read(p):
 with gzip.open(p,'rt',newline='') as f:yield from csv.DictReader(f)
def num(x):
 try:return float(x)
 except (ValueError,TypeError):return None
def utc(v):return dt.datetime.fromtimestamp(v,dt.timezone.utc).isoformat() if v else None
files={};summary={}
for folder in ['snapshot3','current']:
 wanted=['tracker_tokens.csv.gz','token_life.csv.gz','early_checkpoints.csv.gz','runner_registry.csv.gz','registry_coverage.csv.gz','sol_usd.csv.gz','coverage_mints.csv.gz','coverage_crossings.csv.gz']
 checks={line.split(maxsplit=1)[1]:line.split(maxsplit=1)[0] for line in (pkg/folder/'SHA256SUMS.txt').read_text().splitlines()}
 census={r['mint']:r for r in read(pkg/folder/'tracker_tokens.csv.gz')};cs=[num(r['create_ts']) for r in census.values()];cs=[x for x in cs if x is not None]
 s={'census_unique_mints':len(census),'create_min_utc':utc(min(cs)),'create_max_utc':utc(max(cs))};lifemints=set();cp=collections.Counter();src=collections.Counter();obs_missing=0;delay=[];dup=set();duplicates=0;holders=top10=0;cross=collections.Counter();mature=collections.defaultdict(set);outside=0;maxobs=0
 for name in wanted:
  path=pkg/folder/name;got=hashlib.file_digest(path.open('rb'),'sha256').hexdigest();assert got==checks[name],str(path)
  count=0;populated=collections.Counter();columns=[];times=collections.defaultdict(list)
  for r in read(path):
   count+=1;columns=list(r)
   for k,v in r.items():
    if v!='':populated[k]+=1
   for k in ['create_ts','ts','obs_ts','snapshot_ts','first_detect_ts','export_cutoff_ts','sol_usd_age_s']:
    if k in r and num(r[k]) is not None:times[k].append(num(r[k]))
   if name=='token_life.csv.gz':
    mint=r['mint'];lifemints.add(mint);cp[r['cp']]+=1;src[r['src']]+=1;key=(mint,r['cp']);duplicates+=key in dup;dup.add(key)
    obs=num(r['obs_ts']);t=num(r['ts']);obs_missing+=obs is None
    if obs is not None:maxobs=max(maxobs,obs)
    if obs is not None and t is not None:delay.append(obs-t)
    holders+=r['holders']!='';top10+=r['top10_pct']!=''
    if mint not in census:outside+=1
    for h in [1800,3600,7200,86400]:
     if num(r['cp']) is not None and num(r['cp'])>=h:mature[str(h)].add(mint)
   if name=='coverage_crossings.csv.gz':
    cross['rows']+=1;cross['suspect_jump']+=r['suspect_jump']=='1';cross['missing_fx']+=num(r['sol_usd']) is None;cross['fx_age_gt60s']+=(num(r['sol_usd_age_s']) or 0)>60
  files[folder+'/'+name]={'rows':count,'columns':columns,'populated_counts':dict(populated),'sha256':got,'ranges':{k:{'min':min(v),'max':max(v),'min_utc':utc(min(v)) if k.endswith('ts') else None,'max_utc':utc(max(v)) if k.endswith('ts') else None} for k,v in times.items()}}
 s['life']={'unique_mints':len(lifemints),'census_mints_without_life':len(set(census)-lifemints),'rows_for_mints_outside_export_census':outside,'checkpoint_counts':dict(cp),'source_counts':dict(src),'missing_obs_ts':obs_missing,'duplicate_mint_cp':duplicates,'obs_minus_ts_s':{'min':min(delay),'max':max(delay),'positive':sum(x>0 for x in delay),'negative':sum(x<0 for x in delay)},'holders_populated_rows':holders,'top10_populated_rows':top10,'mints_with_checkpoint_at_least_horizon':{k:len(v) for k,v in mature.items()},'latest_obs_utc':utc(maxobs)}
 early={}
 for age in [15,30,60,90,120]:
  cc=collections.Counter();lags=[]
  for row in read(pkg/folder/'early_checkpoints.csv.gz'):
   cc['rows']+=1;obs=num(row.get('obs'+str(age)));cut=num(row.get('cutoff'+str(age)));mc=num(row.get('mc'+str(age)))
   cc['mc_present']+=mc is not None;cc['obs_present']+=obs is not None
   cc['source_'+row.get('cp'+str(age),'')]+=1
   if obs is not None and cut is not None:lags.append(obs-cut)
  early[str(age)]={'counts':dict(cc),'obs_minus_cutoff_s':{'min':min(lags) if lags else None,'max':max(lags) if lags else None,'late_positive':sum(x>0 for x in lags),'before_cutoff':sum(x<0 for x in lags)}}
 s['early_checkpoints']=early
 s['crossings']=dict(cross);summary[folder]=s
# The all-universe census is the cleanest available denominator anchor, not proof of capture.
allchecks={line.split(maxsplit=1)[1]:line.split(maxsplit=1)[0] for line in (allcoins/'SHA256SUMS.txt').read_text().splitlines()}
for name in ['tokens_window.csv.gz','coverage_per_mint.csv.gz']:
 assert hashlib.file_digest((allcoins/name).open('rb'),'sha256').hexdigest()==allchecks[name]
census=list(read(allcoins/'tokens_window.csv.gz'));cov=list(read(allcoins/'coverage_per_mint.csv.gz'))
summary['allcoins']={'census_rows':len(census),'census_unique':len({r['mint'] for r in census}),'coverage_rows':len(cov),'coverage_columns':list(cov[0]),'zero_rows_exported':sum((num(r.get('rows_exported')) or 0)==0 for r in cov),'nonzero_rows_exported':sum((num(r.get('rows_exported')) or 0)>0 for r in cov),'create_min_utc':utc(min(float(r['create_ts']) for r in census)),'create_max_utc':utc(max(float(r['create_ts']) for r in census))}
(root/'coverage.json').write_text(json.dumps({'task':'C003','package_commit':'0e3be03c71949e069a7a31b5951f332bb563f68f','allcoins_commit':'e67833121f1da0dc992c28fa26c5236a855c151a','summary':summary,'files':files,'limitations':['Descriptive coverage only; no predictor, ROI or hidden outcomes','Checkpoint availability is not complete path coverage','obs_ts need not be actual receipt/knowledge timestamp','Registry is outcome-selected; never use it alone as denominator','No first-crossing or negative outcome certified by checkpoint-only absence']},indent=2));print(json.dumps(summary,indent=2))
