"""C019: causal feature counts ONLY. Never imports trade ledgers or outcomes."""
import pathlib,sys,os,csv,gzip,json,hashlib,importlib.util,collections,statistics,math,bisect
sys.dont_write_bytecode=True
r=pathlib.Path(__file__).parent;cache=r.parent/'c001-20261110T211226Z';c18=r.parent/'c018-lab-20261113T211100Z';pkg=r.parent/'entry-package-7nov'
os.environ['F006P2_EVAL']=str(cache/'evaluate.py');os.environ['F006P2_TOKENS']=str(cache/'data/tokens_window.csv.gz')
sp=importlib.util.spec_from_file_location('rc',r/'rules_common.py');rc=importlib.util.module_from_spec(sp);sp.loader.exec_module(rc);ev=rc.ev();fl=ev.fl
assert hashlib.sha256((cache/'evaluate.py').read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86'
assert hashlib.sha256((r/'rules_common.py').read_bytes()).hexdigest()=='f94d800b397f497aa511653ff2b9e67b0e266a7640bbe35997a97f4ebe204d74'
checks=[]
for line in (cache/'data/SHA256SUMS.txt').read_text().splitlines():
 h,n=line.split(maxsplit=1);got=hashlib.sha256((cache/'data'/n).read_bytes()).hexdigest();assert got==h;checks.append({'path':n,'sha256':got})
with (r.parent/'c014-lab-20261112T211254Z/quote_features.csv').open() as f:
 rd=csv.DictReader(f);assert not {'net_sol','ret','status','sell_t'}&set(rd.fieldnames);L003={z['mint'] for z in rd}
assert len(L003)==296
expected={}
for p in sorted(c18.glob('creator_features_*.csv')):
 with p.open() as f:
  rd=csv.DictReader(f);assert not {'net_sol','ret','status','sell_t'}&set(rd.fieldnames)
  for z in rd:expected[z['mint']]=z['cell']
assert len(expected)==679
tok,gaps,outages,meta=ev.load(str(cache/'replay'),1793950800,1794081600)
stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};records=[];queries={};audit=collections.Counter()
def result(z,n,known,stat=None,signal=None,reason=None,no=False):
 z[n+'_known']=known;z[n+'_stat']=stat;z[n+'_signal']=signal if known else None;z[n+'_reason']=reason;z[n+'_no_opportunity']=no
def curve(z):return z['venue'] in ('','curve')
def price(z):
 if not curve(z) or not ev.state_ok(z):return None
 return float(z['vsol'])/float(z['vtok'])
for m,L in ev.iter_mints(str(cache/'replay'),tok,stats):
 info=tok[m];created=info['created'];cum=0;ret=None
 for a in L:
  if not curve(a):continue
  if a['is_buy']=='1':cum+=fl(a['sol']) or 0
  if info['tier']>=1 or cum>=15:ret=(fl(a['recv_ms']) or fl(a['ts'])*1000)/1000;break
 if ret is None:continue
 if any(s<created+7200 and e>created for s,e in outages):continue
 audit['denominator']+=1;t=created+300
 RO=sorted(L,key=lambda a:((fl(a['recv_ms']) or fl(a['ts'])*1000),int(a['slot']),int(a['row_id'])));RT=[(fl(a['recv_ms']) or fl(a['ts'])*1000)/1000 for a in RO];k=bisect.bisect_right(RT,t)
 v=type('View',(),{'t':t,'created':created,'trades':ev.Prefix(RO,k)})();f=rc.features(v) if ret<=t else None
 isE=bool(rc.eligible(f))
 if not isE and m not in L003:continue
 if isE:assert m in expected and expected[m]==rc.cell_of(f)
 z={'mint':m,'half':'early' if created<1794016200 else 'late','cell':rc.cell_of(f) if f is not None else 'unknown','E':isE,'L003':m in L003,'created':created,'E_decision_t':t};records.append(z)
 known=[a for a in L if fl(a['recv_ms']) is not None and float(a['recv_ms'])/1000<=t];known.sort(key=lambda a:(float(a['recv_ms']),int(a['slot']),int(a['row_id'])))
 missing=any(curve(a) and fl(a['recv_ms']) is None and (fl(a['ts']) or math.inf)<=t for a in L)
 gross=0;R=None
 for a in known:
  if curve(a) and a['is_buy']=='1':gross+=fl(a['sol']) or 0
  if gross>=15:R=float(a['recv_ms'])/1000;break
 z['gross_retention_receipt_t']=R;z['potential_prefix_missing_receipt']=missing
 # N1: received follow-through at R+10.
 d=R+10 if R is not None else None;z['N1_decision_t']=d
 if missing or d is None or d>t:result(z,'N1',False,reason='missing prefix receipt' if missing else 'no gross retention by E' if d is None else 'R+10 later than E')
 else:
  K=[a for a in known if float(a['recv_ms'])/1000<=d and curve(a)];first={}
  for a in K:first.setdefault(a['wallet'],float(a['recv_ms'])/1000)
  initiators=[a for a in K if R<=float(a['recv_ms'])/1000<=d and a['is_buy']=='1' and (fl(a['sol']) or 0)>=2];mx=0
  for a in initiators:
   rt=float(a['recv_ms'])/1000;followers={b['wallet'] for b in K if b['is_buy']=='1' and (fl(b['sol']) or 0)>=.1 and rt<float(b['recv_ms'])/1000<=d and first[b['wallet']]>rt and b['wallet']!=a['wallet']};mx=max(mx,len(followers))
  result(z,'N1',True,mx,mx>=3,no=not initiators);z['N1_initiators']=len(initiators)
 # N3: largest recorded first-slot buyer, first80%-sell event+5s.
 K=[a for a in known if curve(a)];slot=min((int(a['slot']) for a in K),default=None);F=[a for a in K if int(a['slot'])==slot];tot=collections.defaultdict(float)
 for a in F:
  if a['is_buy']=='1':tot[a['wallet']]+=fl(a['sol']) or 0
 if missing or not tot:result(z,'N3',False,reason='missing prefix receipt' if missing else 'no initial buyer')
 else:
  w=sorted(tot,key=lambda w:(-tot[w],w))[0];bought=sold=0.;sales=[];event=None
  for i,a in enumerate(K):
   if a['wallet']!=w:continue
   tk=fl(a['tokens']) or 0
   if a['is_buy']=='1':bought+=tk
   else:
    sold+=tk;sales.append((i,a))
    if bought>0 and sold>=.8*bought:event=(i,a,bought,sold);break
  if event is None:result(z,'N3',True,signal=False,reason='no80pct event by E',no=True)
  else:
   i,a,bought,sold=event;rt=float(a['recv_ms'])/1000;d=rt+5;z['N3_decision_t']=d;z['N3_sales_at_event']=len(sales)
   if d>t:result(z,'N3',False,reason='event+5 later than E')
   elif len(sales)<2:result(z,'N3',False,reason='fewer2sales')
   elif sold>bought+1e-6:result(z,'N3',False,reason='negative observed inventory')
   elif any(float(b['recv_ms'])/1000>rt for b in F):result(z,'N3',False,reason='initial cohort not yet known at event')
   elif any(not curve(b) and float(b['recv_ms'])/1000<=d for b in known):result(z,'N3',False,reason='migration before absorption decision')
   else:
    def impact(item):
     j,b=item
     if j==0 or not price(K[j-1]) or not price(b) or (fl(b['sol']) or 0)<=0:return None
     return (price(K[j-1])-price(b))/price(K[j-1])/float(b['sol'])
    firstimpact=impact(sales[0]);lastimpact=impact(sales[-1])
    if firstimpact is None or lastimpact is None or firstimpact<=0 or lastimpact<0:result(z,'N3',False,reason='nonpositive/invalid impact evidence')
    else:
     ratio=lastimpact/firstimpact;before=float(K[i-1]['vsol']);recovered=any(rt<float(b['recv_ms'])/1000<=d and price(b) and float(b['vsol'])>=before for b in K)
     result(z,'N3',True,ratio,ratio<=.5 and recovered);z['N3_reserve_recovered']=recovered
 # N4 FIFO age and N5cross-mint query clocks.
 d=R+60 if R is not None else None;z['N4_decision_t']=d;z['N5_decision_t']=d
 if missing or d is None or d>t:
  reason='missing prefix receipt' if missing else 'no gross retention by E' if d is None else 'R+60 later than E'
  result(z,'N4',False,reason=reason);result(z,'N5',False,reason=reason);continue
 P=[a for a in known if float(a['recv_ms'])/1000<=d]
 early={a['wallet'] for a in P if curve(a) and a['is_buy']=='1' and float(a['recv_ms'])/1000<=created+60};queries[m]=(d,early)
 lots=collections.defaultdict(collections.deque);bad=None
 for a in P:
  if not curve(a):bad='pool inventory outside curve-only decoder scope';break
  q=fl(a['tokens']);rt=float(a['recv_ms'])/1000
  if q is None or q<0:bad='invalid tokens';break
  if a['is_buy']=='1':lots[a['wallet']].append([rt,q])
  else:
   ll=lots[a['wallet']]
   while q>1e-6 and ll:
    used=min(q,ll[0][1]);q-=used;ll[0][1]-=used
    if ll[0][1]<=1e-6:ll.popleft()
   if q>1e-6:bad='oversell: transfers or missing inventory';break
 total=sum(q for ll in lots.values() for rt,q in ll);fresh=sum(q for ll in lots.values() for rt,q in ll if d-10<rt<=d)
 if bad or total<=0:result(z,'N4',False,reason=bad or 'no observed inventory')
 else:result(z,'N4',True,fresh/total,fresh/total>=.75)
 if len(early)<3:result(z,'N5',True,0,False,reason='fewer3earlywallets',no=True)
 else:result(z,'N5',False,reason='pending cross-mint prefix query')
assert sum(z['E'] for z in records)==679 and len(records)==680 and sum(z['L003'] for z in records)==296 and audit['denominator']==3638 and stats['non_contiguous']==0
# Recorded cross-mint sells only; exact receipt cutoff applied per query.
wallets=set().union(*(ws for d,ws in queries.values()));history=collections.defaultdict(list);st={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};missing_sale_receipts=0
for m,L in ev.iter_mints(str(cache/'replay'),tok,st):
 for a in L:
  if a['wallet'] not in wallets or a['is_buy']=='1':continue
  if fl(a['recv_ms']) is None:missing_sale_receipts+=1;continue
  ok=curve(a) or (a.get('quote_mint')==ev.WSOL and a.get('base_dec')=='6' and a.get('quote_dec')=='9')
  history[a['wallet']].append((float(a['recv_ms'])/1000,m,fl(a['sol']) or 0,ok))
for w in history:history[w].sort()
for z in records:
 if z.get('N5_reason')!='pending cross-mint prefix query':continue
 m=z['mint'];d,ws=queries[m];n=0;unknownpool=0
 for w in ws:
  H=history[w];lo=bisect.bisect_right(H,(d-5,'\uffff',math.inf,True));hi=bisect.bisect_right(H,(d,'\uffff',math.inf,True));observed=[a for a in H[lo:hi] if a[1]!=m];unknownpool+=sum(not a[3] for a in observed);n+=sum(a[2] for a in observed if a[3])>=1
 z['N5_unproven_pool_rows']=unknownpool
 if unknownpool:result(z,'N5',False,reason='unproven pool quote in relevant liquidation prefix')
 else:result(z,'N5',True,n,n>=3)
# Structural proof inputs: read headers only, never crossing or FX values/outcomes.
schemas={}
for p in [cache/'data/trades_part_001.csv.gz',pkg/'current/sol_usd.csv.gz',pkg/'snapshot3/sol_usd.csv.gz',pkg/'current/coverage_crossings.csv.gz']:
 with gzip.open(p,'rt') as f:schemas[str(p.relative_to(r.parent))]=next(csv.reader(f))
for z in records:
 result(z,'N2',False,reason='no complete non-trade LP/reserve-movement and exact initial pool-state ledger')
 result(z,'N6',False,reason='SOL/USD ts/usd has no receipt clock; no complete causal universe crossing/supply evidence')
def quart(a):
 a=sorted(a);return {'n':len(a),'min':a[0] if a else None,'q1':a[int((len(a)-1)*.25)] if a else None,'median':statistics.median(a) if a else None,'q3':a[int((len(a)-1)*.75)] if a else None,'max':a[-1] if a else None}
def summarize(rr,n):
 known=[z for z in rr if z[n+'_known']];signal=sum(z[n+'_signal'] is True for z in known);veto=len(known)-signal if n in ('N1','N3') else signal;share=veto/len(known) if known else None
 return {'nominal_population':len(rr),'feature_known':len(known),'feature_unknown':len(rr)-len(known),'unknown_share':(len(rr)-len(known))/len(rr) if rr else None,'signal_count':signal,'proposed_veto_count':veto,'veto_share_nominal':veto/len(rr) if rr else None,'veto_share_defined':share,'known_no_opportunity':sum(z[n+'_no_opportunity'] for z in known),'statistic_quartiles':quart([z[n+'_stat'] for z in known if z[n+'_stat'] is not None]),'unknown_reasons':dict(collections.Counter(z[n+'_reason'] for z in rr if not z[n+'_known'])),'R54_shape_only':'NOT DEFINABLE here' if n in ('N2','N6') else 'no defined observations' if share is None else 'unlikely to bind' if share<.05 or share>.95 else 'inside5–95% on defined subset; held only'}
out={}
for n in ['N1','N2','N3','N4','N5','N6']:
 out[n]={}
 for pop,rr in [('E679',[z for z in records if z['E']]),('L003_296',[z for z in records if z['L003']])]:
  out[n][pop]={'all':summarize(rr,n),'by_half':{h:summarize([z for z in rr if z['half']==h],n) for h in ['early','late']},'by_cell':{h:summarize([z for z in rr if z['cell']==h],n) for h in ['A','B','C']}}
report={'counts_only':True,'outcomes_read':False,'financial_specs_scored':0,'population_E':679,'population_L003':296,'feature_union':680,'L003_in_E':sum(z['L003'] and z['E'] for z in records),'L003_outside_E':sum(z['L003'] and not z['E'] for z in records),'proposals':out,'schema_evidence':schemas,'raw_files_verified':len(checks),'stats':{k:v for k,v in stats.items() if k!='_done'},'cross_mint_scan_stats':{k:v for k,v in st.items() if k!='_done'},'missing_receipt_sales_in_observed_wallet_history':missing_sale_receipts,'scope':['Future E-selection relative to early proposal times; diagnostic shape,not causal trading population','Binding here does not predict binding or profitability on released window','N4 is newFIFOageproxy,not F006verifiedbalances','No P&L,ledger,paired figure or strategy verdict computed']}
(r/'COUNTS.json').write_text(json.dumps(report,indent=2)+'\n');(r/'input_checksums.json').write_text(json.dumps(checks,indent=2)+'\n')
with (r/'feature_records.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=sorted(set().union(*(z.keys() for z in records))));w.writeheader();w.writerows(records)
print(json.dumps({n:out[n]['E679']['all'] for n in out},indent=2),flush=True)
