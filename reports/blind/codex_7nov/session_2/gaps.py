import csv,gzip,json,datetime
from pathlib import Path
P=Path('/workspace/entry-package-7nov');O=Path('/workspace/session_2')
rr=json.loads((O/'signals.json').read_text());g=list(csv.DictReader(gzip.open(P/'feed_gaps_all.csv.gz','rt')));intervals=[];start=None
for x in g:
 if x['event'] in ['closed','idle'] and start is None:start=int(x['ts'])
 elif x['event']=='open' and start is not None:intervals.append((start,int(x['ts'])));start=None
if start is not None:intervals.append((start,float('inf')))
def unix(s):return int(datetime.datetime.fromisoformat(s+'+00:00').timestamp())
for day,a,b in [('06','20:40:00','20:42:00'),('06','20:57:00','21:06:00'),('06','23:33:00','23:35:00'),('07','00:06:00','00:08:00'),('07','00:26:30','00:27:30'),('06','21:40:00','21:45:00')]:intervals.append((unix('2026-11-'+day+'T'+a),unix('2026-11-'+day+'T'+b)))
co={r['mint']:r for r in csv.DictReader(gzip.open(P/'coverage_per_mint.csv.gz','rt'))};out={}
for half in ['early','late']:
 r=[x for x in rr if x['half']==half]
 overlap=lambda x:any(a<=x['create_ts']+120 and b>=x['create_ts'] for a,b in intervals)
 out[half]={'signals_overlapping_logged_close_idle_or_documented_outage':sum(overlap(x) for x in r),'signals_with_reconciliation_mismatch':sum(co[x['mint']]['reconciled']!='1' for x in r),'signals_before_first_feed_open_log':sum(x['create_ts']<int(g[0]['ts']) for x in r)}
(O/'gap_audit.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
