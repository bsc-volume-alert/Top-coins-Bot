"""C016 saved-field provenance only: no outcome or trading analysis."""
import pathlib,csv,gzip,json,hashlib,collections,decimal,datetime,math
r=pathlib.Path(__file__).parent;pkg=r.parent/'entry-package-7nov';allroot=r.parent/'c001-20261110T211226Z/data';D=decimal.Decimal
checks=[]
def verify(p,manifest):
 want={n.removeprefix('./'):h for h,n in (l.split(maxsplit=1) for l in manifest.read_text().splitlines())};got=hashlib.sha256(p.read_bytes()).hexdigest();assert got==want[p.name];checks.append({'path':str(p.relative_to(r.parent)),'sha256':got,'matches_manifest':True})
for p,man in [(pkg/'snapshot3/fd_watch.csv.gz',pkg/'snapshot3/SHA256SUMS.txt'),(pkg/'current/fd_watch.csv.gz',pkg/'current/SHA256SUMS.txt'),(allroot/'tokens_window.csv.gz',allroot/'SHA256SUMS.txt')]:verify(p,man)
(r/'input_checksums.json').write_text(json.dumps(checks,indent=2))
def val(s):
 if s is None or str(s).strip().lower() in {'','null','none','nan','\\n'}:return None
 try:
  x=D(str(s).strip());return x if x.is_finite() else None
 except decimal.InvalidOperation:return None

def load(p,created_col):
 out={};dup=[]
 with gzip.open(p,'rt',newline='') as f:
  reader=csv.DictReader(f);fields=reader.fieldnames
  for row in reader:
   m=row['mint']
   if m in out:dup.append(m)
   out[m]={k:row.get(k,'') for k in set(['dev_buy_sol',created_col,'lookup_status']+[z for z in fields if z.endswith('_ts')])}
 if dup:(r/'duplicate_mints.json').write_text(json.dumps({'file':str(p),'count':len(dup),'mints':dup[:20]}));raise ValueError('Ambiguous duplicate mint keys')
 return out,fields
s,sf=load(pkg/'snapshot3/fd_watch.csv.gz','created_ts');c,cf=load(pkg/'current/fd_watch.csv.gz','created_ts');t,tf=load(allroot/'tokens_window.csv.gz','create_ts')
common=sorted(s.keys()&c.keys());changes=[];count=collections.Counter();small_changes=0;timestamp_cochanges=collections.Counter()
for m in common:
 a=val(s[m]['dev_buy_sol']);b=val(c[m]['dev_buy_sol']);cat='both_missing' if a is None and b is None else 'empty_to_populated' if a is None else 'populated_to_empty' if b is None else 'unchanged_numeric' if a==b else 'changed_numeric';count[cat]+=1
 if a is not None and b is not None and a==b and s[m]['dev_buy_sol']!=c[m]['dev_buy_sol']:count['formatting_only_within_unchanged']+=1
 if cat in ['changed_numeric','empty_to_populated','populated_to_empty']:
  z={'mint':m,'category':cat,'dev_buy_snapshot3':s[m]['dev_buy_sol'],'dev_buy_current':c[m]['dev_buy_sol'],'created_ts_snapshot3':s[m]['created_ts'],'created_ts_current':c[m]['created_ts'],'delta_sol':str(b-a) if a is not None and b is not None else None,'in_allowlisted_window_census':m in t}
  if a is not None and b is not None and abs(b-a)<D('0.000000001'):small_changes+=1
  for f in ['scanned_ts','trace_ts','screened_ts','meta_ts']:
   z[f+'_snapshot3']=s[m][f];z[f+'_current']=c[m][f]
   if cat=='changed_numeric':timestamp_cochanges[f+'_changed']+=s[m][f]!=c[m][f];timestamp_cochanges[f+'_unchanged']+=s[m][f]==c[m][f]
  changes.append(z)
for k in ['both_missing','empty_to_populated','populated_to_empty','unchanged_numeric','changed_numeric','formatting_only_within_unchanged']:count.setdefault(k,0)

def pop(d):return {'rows':len(d),'dev_buy_populated':sum(val(z['dev_buy_sol']) is not None for z in d.values()),'dev_buy_zero':sum(val(z['dev_buy_sol'])==0 for z in d.values()),'dev_buy_positive':sum(val(z['dev_buy_sol']) is not None and val(z['dev_buy_sol'])>0 for z in d.values()),'missing_or_nonfinite':sum(val(z['dev_buy_sol']) is None for z in d.values())}

def tscoverage(d,fields):return {f:{'finite':sum(val(z.get(f)) is not None for z in d.values()),'positive':sum(val(z.get(f)) is not None and val(z.get(f))>0 for z in d.values())} for f in fields if f.endswith('_ts')}

def join(a,b):
 mm=sorted(a.keys()&b.keys());ct=collections.Counter()
 for m in mm:
  aa=val(a[m]['dev_buy_sol']);bb=val(b[m]['dev_buy_sol']);ct['both_populated_equal' if aa is not None and bb is not None and aa==bb else 'both_populated_different' if aa is not None and bb is not None else 'one_or_both_missing']+=1
 return {'common_mints':len(mm),'counts':dict(ct)}
readtimes={'snapshot3':'2026-11-07T11:54:21Z','current':'2026-11-07T14:53:26Z'}
cutcheck={}
for name,d in [('snapshot3',s),('current',c)]:
 cut=D(str(datetime.datetime.fromisoformat(readtimes[name].replace('Z','+00:00')).timestamp()));cutcheck[name]={'created_after_reported_read_cutoff':sum(val(z['created_ts']) is not None and val(z['created_ts'])>cut for z in d.values()),'trace_after_reported_read_cutoff':sum(val(z['trace_ts']) is not None and val(z['trace_ts'])>cut for z in d.values())}

def canonical_hash(d,mm):return hashlib.sha256(''.join(m+'\t'+(str(val(d[m]['dev_buy_sol']).normalize()) if val(d[m]['dev_buy_sol']) is not None else '<MISSING>')+'\n' for m in sorted(mm)).encode()).hexdigest()
report={'task':'C016','definitions_commit':'8ca5b1eeff8f9ed1bf378cf7cfbbee8740166568','dataset_commits':{'watch_snapshots':'0e3be03c71949e069a7a31b5951f332bb563f68f','window_census':'e67833121f1da0dc992c28fa26c5236a855c151a'},'snapshot_read_cutoffs_from_INDEX':readtimes,'population':{'snapshot3':pop(s),'current':pop(c),'window_census':pop(t)},'paired_watch':{'common_mints':len(common),'snapshot3_only':len(s.keys()-c.keys()),'current_only':len(c.keys()-s.keys()),'counts':dict(count),'numeric_changes_lt1e_9':small_changes,'changed_mints_in_window_census':sum(z['in_allowlisted_window_census'] for z in changes),'timestamp_cochanges_on_numeric_revisions':dict(timestamp_cochanges)},'window_joins':{'snapshot3_vs_window':join(s,t),'current_vs_window':join(c,t),'watch_common_also_in_window':len(set(common)&t.keys())},'schema':{'snapshot3':sf,'current':cf,'window_census':tf},'timestamp_coverage':{'snapshot3':tscoverage(s,sf),'current':tscoverage(c,cf)},'field_specific_availability_timestamp_found':False,'first_populated_minus_creation_distribution':None,'write_time_status':'UNAVAILABLE: no documented dev_buy_sol-specific write/knowledge timestamp in the permitted files; lookup/trace/screen/metadata times cannot be substituted.','read_cutoff_consistency':cutcheck,'comparison_fingerprints_sha256':{'common_mint_ids':hashlib.sha256(('\n'.join(common)+'\n').encode()).hexdigest(),'snapshot3_common_dev_values':canonical_hash(s,common),'current_common_dev_values':canonical_hash(c,common)},'limitations':['Zero is syntactically populated, not a verified no-purchase observation; cross-table semantics remain unresolved','Two saved reads do not prove creation-time availability even if equal','Differences between reads establish instability, not the exact first-write time or cause','Token census comparisons span different read times/populations; no performance outcomes used','No tracker source or additional branch read; no causal feature certified from generic row timestamps']}
(r/'provenance_results.json').write_text(json.dumps(report,indent=2))
keys=sorted(set().union(*(z.keys() for z in changes))) if changes else ['mint','category','dev_buy_snapshot3','dev_buy_current']
# All revisions if any; empty file with header is affirmative zero-change evidence.
if not changes:
 with (r/'dev_buy_changes_001.csv').open('w',newline='') as f:csv.DictWriter(f,fieldnames=keys).writeheader()
for i in range(0,len(changes),100):
 with (r/f'dev_buy_changes_{i//100+1:03d}.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(changes[i:i+100])
print(json.dumps(report,indent=2),flush=True)
