"""C018 count-only creator first-slot size: no outcomes/return ledger opened."""
import pathlib,csv,json,gzip,hashlib,types,bisect,statistics,collections,sys
from decimal import Decimal
r=pathlib.Path(__file__).parent;c=r.parent/'c001-20261110T211226Z'
sys.path.insert(0,str(r/'peer_f014'));import rules_common as rc
ev=rc.ev();assert hashlib.sha256((c/'evaluate.py').read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86' and not ev.DEV_NO_EVIDENCE
checks=[]
for line in (c/'data/SHA256SUMS.txt').read_text().splitlines():
 h,n=line.split(maxsplit=1);got=hashlib.sha256((c/'data'/n).read_bytes()).hexdigest();assert got==h;checks.append({'path':n,'sha256':got,'ok':True})
(r/'input_checksums.json').write_text(json.dumps(checks,indent=2)+'\n')
with gzip.open(c/'data/tokens_window.csv.gz','rt') as f:census={z['mint']:z for z in csv.DictReader(f)}
tok,gaps,outages,meta=ev.load(str(c/'replay'),1793950800,1794081600);fl=ev.fl
stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};audit=collections.Counter();features=[]
for m,L in ev.iter_mints(str(c/'replay'),tok,stats):
 info=tok[m];cum=0.;ret=None
 for z in L:
  if not rc.iscurve(z):continue
  if z['is_buy']=='1':cum+=fl(z['sol']) or 0
  if info['tier']>=1 or cum>=15:ret=(fl(z['recv_ms']) or fl(z['ts'])*1000)/1000;break
 if ret is None:audit['not_retained']+=1;continue
 if any(s<info['created']+7200 and e>info['created'] for s,e in outages):audit['outage_excluded']+=1;continue
 half='early' if info['created']<1794016200 else 'late';audit[half]+=1;t=info['created']+300
 RO=sorted(L,key=lambda z:((fl(z['recv_ms']) or fl(z['ts'])*1000),int(z['slot']),int(z['row_id'])));RT=[(fl(z['recv_ms']) or fl(z['ts'])*1000)/1000 for z in RO]
 k=bisect.bisect_right(RT,t);v=types.SimpleNamespace(t=t,created=info['created'],trades=ev.Prefix(RO,k));f=rc.features(v) if t>=ret else None
 if not rc.eligible(f):continue
 cr=census[m]['creator'];curve=[z for z in L if rc.iscurve(z)];slot=min(int(z['slot']) for z in curve);first=[z for z in curve if int(z['slot'])==slot]
 missing=sum(fl(z['recv_ms']) is None for z in first);late=sum(fl(z['recv_ms']) is not None and float(z['recv_ms'])/1000>t for z in first);ok=bool(cr) and missing==late==0
 received=[z for z in first if fl(z['recv_ms']) is not None and float(z['recv_ms'])/1000<=t]
 buys=[z for z in received if z['wallet']==cr and z['is_buy']=='1'];size=sum((Decimal(z['sol']) for z in buys),Decimal(0)) if ok else None
 cv=Decimal(census[m]['dev_buy_sol']);different=abs(size-cv)>Decimal('.000001') if ok else None
 features.append({'mint':m,'half':half,'created':info['created'],'decision_t':t,'tier':info['tier'],'retained_at':ret,'cell':rc.cell_of(f),'buyers_last_60s':f['buyers_last_60s'],'first_slot':slot,'first_slot_rows':len(first),'first_slot_missing_receipt':missing,'first_slot_late_rows':late,'latest_first_slot_receipt_t':max((float(z['recv_ms'])/1000 for z in received),default=None),'feature_known':ok,'creator_buy_rows':len(buys),'creator_buy_sol':str(size) if ok else None,'census_dev_buy_sol':str(cv),'tape_census_diff_gt1e6':different,'veto':size>=Decimal(5) if ok else None,'kept':size<Decimal(5) if ok else None})
assert len(features)==679 and audit['early']==1593 and audit['late']==2045 and stats['non_contiguous']==0
unknown=sum(not z['feature_known'] for z in features);removed=sum(z['veto'] is True for z in features);known=len(features)-unknown;share=removed/len(features)
def dist(a):
 a=sorted(a);return {'n':len(a),'min':a[0] if a else None,'p25':a[int((len(a)-1)*.25)] if a else None,'median':statistics.median(a) if a else None,'p75':a[int((len(a)-1)*.75)] if a else None,'p90':a[int((len(a)-1)*.9)] if a else None,'max':a[-1] if a else None}
def count(rr):return {'E':len(rr),'known':sum(z['feature_known'] for z in rr),'removed':sum(z['veto'] is True for z in rr),'kept':sum(z['kept'] is True for z in rr),'unknown':sum(not z['feature_known'] for z in rr)}
o={'counts_only':True,'outcomes_read':False,'threshold_SOL':5,'direction':'skip >=5SOL','control_attempts':679,'feature_unknown':unknown,'removed':removed,'retained':known-removed,'removed_share_of_E':share,'testable_R54':unknown==0 and .05<=share<=.95,'by_half':{h:count([z for z in features if z['half']==h]) for h in ['early','late']},'by_cell':{h:count([z for z in features if z['cell']==h]) for h in ['A','B','C']},'creator_buy_sol_distribution':dist([float(z['creator_buy_sol']) for z in features if z['feature_known']]),'tape_census_differ_gt1e6':sum(z['tape_census_diff_gt1e6'] is True for z in features),'tape_zero':sum(z['creator_buy_sol']=='0' for z in features),'audit':dict(audit),'stream_stats':{k:v for k,v in stats.items() if k!='_done'},'raw_data_commit':'e67833121f1da0dc992c28fa26c5236a855c151a','limits':['First recorded curve slot is not guaranteed complete chain creation slot','Conservative first-slot receipt availability screen only; no future price or tape-length condition','No census field used as creator size input','Only one5SOL threshold; same explored window,not fresh confirmation']}
(r/'PRECHECK.json').write_text(json.dumps(o,indent=2)+'\n')
with (r/'creator_features.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=list(features[0]));w.writeheader();w.writerows(features)
print(json.dumps(o,indent=2),flush=True)
