import csv,gzip,json,datetime
from pathlib import Path
from collections import Counter
P=Path('/workspace/entry-package-7nov');O=Path('/workspace/session_2')
co=list(csv.DictReader(gzip.open(P/'coverage_per_mint.csv.gz','rt')));ts=[int(r['create_ts']) for r in co if r['create_ts']];mid=(min(ts)+max(ts))/2
census={}
for name in ['snapshot3/tracker_tokens.csv.gz','current/tracker_tokens.csv.gz']:
 for r in csv.DictReader(gzip.open(P/name,'rt')):census[r['mint']]=r
summ={}
for half in ['early','late']:
 pred=lambda t: (t<mid)==(half=='early') and min(ts)<=t<=max(ts)
 cc=[r for r in census.values() if r['create_ts'] and pred(int(r['create_ts']))]
 ss=[r for r in co if r['create_ts'] and pred(int(r['create_ts']))]
 summ[half]={'census_launches_in_supplement_time_range':len(cc),'selected_supplement_mints':len(ss),'no_trade_mints':sum(int(r['rows_exported'])==0 for r in ss),'reconciliation_mismatch_mints':sum(r['reconciled']!='1' for r in ss)}
summ['time_range']=[datetime.datetime.fromtimestamp(t,datetime.timezone.utc).isoformat() for t in [min(ts),int(mid),max(ts)]]
(O/'coverage_audit.json').write_text(json.dumps(summ,indent=2));print(json.dumps(summ,indent=2))
