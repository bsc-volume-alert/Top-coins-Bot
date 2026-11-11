"""C011: existing attention and history coverage inventory, no outcome search."""
import pathlib,csv,gzip,json,hashlib,collections,datetime as dt
root=pathlib.Path(__file__).parent;pkg=root.parent/'entry-package-7nov';data=root.parent/'c001-20261110T211226Z/data'
def read(p):
 with gzip.open(p,'rt',newline='') as f:yield from csv.DictReader(f)
def num(x):
 try:return float(x)
 except:return None
posts={}
for folder in ['snapshot3','current']:
 p=pkg/folder/'posts.csv.gz';want={l.split(maxsplit=1)[1]:l.split(maxsplit=1)[0] for l in (pkg/folder/'SHA256SUMS.txt').read_text().splitlines()}['posts.csv.gz'];got=hashlib.file_digest(p.open('rb'),'sha256').hexdigest();assert got==want
 rows=list(read(p));times={}
 for k in ['created_ms','recv_ms','ctx_ms']:
  vals=[num(r[k]) for r in rows if num(r[k]) is not None];times[k]={'populated':len(vals),'min':min(vals) if vals else None,'max':max(vals) if vals else None}
 posts[folder]={'rows':len(rows),'unique_users':len({r['user'] for r in rows}),'kinds':dict(collections.Counter(r['kind'] for r in rows)),'columns':list(rows[0]) if rows else [],'times':times,'sha256':got,'texts_inspected_for_signal':False,'complete_launch_token_linkage_available':False}
census={r['mint']:float(r['create_ts']) for r in read(data/'tokens_window.csv.gz')};mints={};rows=collections.Counter();receipts=collections.Counter();evidence=collections.Counter()
for p in sorted(data.glob('trades_part_*.csv.gz')):
 for r in read(p):
  m=r['mint'];v=r['venue'] or 'curve';rows[v]+=1;receipts[v]+=num(r['recv_ms']) is not None
  if v!='curve':evidence[v]+=bool(r.get('quote_mint')) and bool(r.get('base_dec')) and bool(r.get('quote_dec'))
  t=num(r['ts'])
  if t is None or m not in census:continue
  key=(m,v)
  if key not in mints:mints[key]=[t,t,0]
  mints[key][0]=min(mints[key][0],t);mints[key][1]=max(mints[key][1],t);mints[key][2]+=1
summary={}
for venue in rows:
 mm={m:v for (m,k),v in mints.items() if k==venue};summary[venue]={'raw_rows_including_duplicates':rows[venue],'rows_with_recv':receipts[venue],'rows_with_quote_decimal_fields':evidence[venue],'mints':len(mm),'mints_observed_at_age_ge_seconds':{str(age):sum(v[1]-census[m]>=age for m,v in mm.items()) for age in [7200,14400,43200,86400]},'max_observed_age_s':max(v[1]-census[m] for m,v in mm.items()) if mm else None,'max_first_to_last_span_s':max(v[1]-v[0] for v in mm.values()) if mm else None}
report={'task':'C011','posts':posts,'histories':summary,'limits':['Counts are raw, duplicates included, no performance/label inference','One late observation does not certify continuous capture or a horizon outcome','Post publication and receipt/context timestamps have different meanings; absent receipt makes causal attention features unavailable','No trending history or all-launch attention census established','No protected outcome files or new social/blockchain calls']}
(root/'attention_history_inventory.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
