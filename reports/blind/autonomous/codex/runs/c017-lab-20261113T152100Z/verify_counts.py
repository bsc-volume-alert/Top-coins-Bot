"""Independent raw-event H2 parser; H3 feature arithmetic; never load outcomes."""
import pathlib,csv,gzip,json,statistics,hashlib,collections,math
r=pathlib.Path(__file__).parent;c=r.parent/'c001-20261110T211226Z'
with (r/'precheck_features.csv').open() as f:F=list(csv.DictReader(f))
assert len(F)==296
intervals=[];opened=None
with gzip.open(c/'data/feed_gaps_all.csv.gz','rt') as f:
 for z in csv.DictReader(f):
  if z['event'].startswith('pool-'):continue
  t=float(z['ts']);e=z['event']
  if e in {'closed','error','idle'} and opened is None:opened=t
  elif e in {'open','subscribed'} and opened is not None:intervals.append((opened,t));opened=None
if opened is not None:intervals.append((opened,math.inf))
records=[];independent_veto=[]
for z in F:
 t=float(z['decision_t']);matched=[(s,e) for s,e in intervals if e<=t and t-e<=180]
 veto=bool(matched);assert veto==(z['H2_veto']=='True')
 if veto:
  independent_veto.append(z['mint']);s,e=max(matched,key=lambda a:a[1]);assert e<=t and 0<=t-e<=180
  records.append({'mint':z['mint'],'half':z['half'],'decision_t':t,'gap_start':s,'known_reopen_t':e,'seconds_since_reopen':t-e,'H1_veto':z['H1_veto'],'median_recorded_lag_s':z['H1_median_recorded_lag_s']})
assert len(independent_veto)==10
def q(a):
 a=sorted(a);return {'n':len(a),'min':a[0] if a else None,'p25':a[int((len(a)-1)*.25)] if a else None,'median':statistics.median(a) if a else None,'p75':a[int((len(a)-1)*.75)] if a else None,'max':a[-1] if a else None}
for z in F:
 n=int(z['H3_serial_buyers']);d=int(z['H3_recent_noncreator_buyers']);assert d>0 and n<=d and float(z['H3_share'])==n/d and (z['H3_veto']=='True')==(n/d>=.5)
checks=[]
for line in (c/'data/SHA256SUMS.txt').read_text().splitlines():
 want,p=line.split(maxsplit=1);got=hashlib.sha256((c/'data'/p).read_bytes()).hexdigest();assert got==want;checks.append({'path':p,'sha256':got,'matches_manifest':True})
peer=r/'peer_f013';a=json.loads((peer/'precheck_f013.json').read_text());b=json.loads((peer/'precheck_rebuilt.json').read_text());assert a==b
out={'counts_only':True,'source_input_commit':'e67833121f1da0dc992c28fa26c5236a855c151a','main_intervals_independently_parsed':len(intervals),'H2_independent_vetoes':len(independent_veto),'H2_all_296_flags_equal':True,'H2_age_since_reopen_s':q([v['seconds_since_reopen'] for v in records]),'H2_distinct_reopenings':len({v['known_reopen_t'] for v in records}),'H3_feature_arithmetic_equal_296':True,'H3_share_distribution':q([float(z['H3_share']) for z in F]),'H3_serial_buyer_count_distribution':q([int(z['H3_serial_buyers']) for z in F]),'H3_recent_buyer_count_distribution':q([int(z['H3_recent_noncreator_buyers']) for z in F]),'H3_share_halves':{h:q([float(z['H3_share']) for z in F if z['half']==h]) for h in ['early','late']},'F013_precheck_raw_reproduction_exact':True,'peer_commit':'69b0b54ff7c457fa0d063caf3e236bf027c56bc1','data_files_verified':len(checks),'field_lag_is_not_pure_network_latency':True,'financial_outcomes_computed':False,'candidate_only_resolved':'not computed; neither rule scored','limits':['H3 arithmetic audit is not an independent second full raw reconstruction','Logged reopen time not separately timestamped delivery','Whole-market wallet reuse and actual funder identity unavailable']}
(r/'count_verification.json').write_text(json.dumps(out,indent=2)+'\n');(r/'input_checksums.json').write_text(json.dumps(checks,indent=2)+'\n')
with (r/'H2_reconnect_records.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(records[0]));w.writeheader();w.writerows(records)
print(json.dumps(out,indent=2))
