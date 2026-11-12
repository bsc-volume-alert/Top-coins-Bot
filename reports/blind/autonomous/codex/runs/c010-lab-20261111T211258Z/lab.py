"""Owner-requested exploratory scenario; frozen evaluator is imported, never changed."""
import pathlib,csv,gzip,json,hashlib,importlib.util,collections,statistics,bisect,math
root=pathlib.Path(__file__).parent;cache=root.parent/'c001-20261110T211226Z'
spec=importlib.util.spec_from_file_location('ev',cache/'evaluate.py');ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
assert hashlib.sha256((cache/'evaluate.py').read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86';assert not ev.DEV_NO_EVIDENCE
checks=[]
for l in (cache/'data/SHA256SUMS.txt').read_text().splitlines():
 want,n=l.split(maxsplit=1);got=hashlib.file_digest((cache/'data'/n).open('rb'),'sha256').hexdigest();assert got==want;checks.append({'path':n,'sha256':got,'ok':True})
(root/'trade_checksums.json').write_text(json.dumps(checks,indent=2));print('CHECKSUMS',len(checks),'PASS',flush=True)
tok,gaps,outages,meta=ev.load(str(cache/'replay'),1793950800,1794081600);split=1794016200
stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};audit=collections.Counter();records={'L003':[],'CONTROL':[]};N={'early':0,'late':0}
for mint,L in ev.iter_mints(str(cache/'replay'),tok,stats):
 info=tok[mint];created=info['created'];cum=0.;ret=info['tier']>=1
 for r in L:
  if r['venue'] in ('curve','') and r['is_buy']=='1':cum+=ev.fl(r['sol']) or 0.
  if cum>=15:ret=True;break
 if not ret:audit['not_retained_streams']+=1;continue
 if any(s<created+7200 and e>created for s,e in outages):audit['outage_excluded']+=1;continue
 half='early' if created<split else 'late';N[half]+=1;t=created+300
 if any(ev.fl(r['recv_ms']) is None for r in L):audit['unknown_signal_missing_receipt']+=1;continue
 if any(float(L[i]['ts'])<float(L[i-1]['ts']) for i in range(1,len(L))):audit['unknown_signal_time_contradiction']+=1;continue
 RO=sorted(L,key=lambda r:(float(r['recv_ms']),int(r['slot']),int(r['row_id'])));RT=[float(r['recv_ms'])/1000 for r in RO];known=[r for r in RO if float(r['recv_ms'])<=t*1000]
 if not known or known[-1]['venue'] not in ('','curve') or not ev.state_ok(known[-1]):continue
 buys=collections.defaultdict(float);purchased=collections.defaultdict(float);sold=collections.defaultdict(float);first={};early=collections.defaultdict(float);gross=net30=0.;retained=None
 for r in known:
  if r['venue'] not in ('','curve'):continue
  tr=float(r['recv_ms'])/1000;sol=ev.fl(r['sol']) or 0.;tokens=ev.fl(r['tokens']) or 0.;wallet=r['wallet'];buy=r['is_buy']=='1'
  if buy:
   gross+=sol;purchased[wallet]+=tokens;buys[wallet]+=sol;first.setdefault(wallet,tr)
   if tr<=created+10:early[wallet]+=sol
   if retained is None and gross>=15:retained=tr
  else:sold[wallet]+=tokens
  if tr>t-30:net30+=sol if buy else -sol
 if gross<15 or retained is None:continue
 recent_buyers=set();recent_net=collections.defaultdict(float);buckets=[0.]*5
 for r in known:
  if r['venue'] not in ('','curve'):continue
  rt=float(r['recv_ms'])/1000;amount=(ev.fl(r['sol']) or 0.)*(1 if r['is_buy']=='1' else -1);bucket=max(0,min(4,int((rt-created)//60)));buckets[bucket]+=amount
  if rt>t-60:
   recent_net[r['wallet']]+=amount
   if r['is_buy']=='1':recent_buyers.add(r['wallet'])
 material=sum(recent_net[w]>=.1 for w in recent_buyers);persistence=sum(v>0 for v in buckets)/5
 candidate=len(recent_buyers)>=20 and material>=10 and persistence>=.6
 ts=[float(r['ts']) for r in L]
 def state(at,buy=False):
  i=bisect.bisect_right(ts,at)-1
  if i<0:return None,'no recorded state'
  row=L[i]
  if at-float(row['ts'])>30:return None,'state older than 30s'
  if not ev.state_ok(row):return None,'state invalid or pool evidence absent'
  if buy and row['venue'] in ('','curve') and float(row['vtok'])<=279900000000000:return None,'completed curve cannot accept buy'
  if ev.gap_overlap(gaps,outages,float(row['ts']),at,row['venue']):return None,'capture gap before landing'
  if row['venue'] in ('','curve') and at>retained+125*60:return None,'outside curve capture'
  if row['venue'] not in ('','curve') and not ((created>=ev.POOL_ALL_FROM and at<=created+86400) or (created>=ev.POOL_RET_FROM and at<=retained+125*60)):return None,'outside pool capture'
  return row,None
 features={'gross_received_curve_sol':gross,'recent_buyers_60s':len(recent_buyers),'material_net_buyers_60s':material,'inflow_persistence_receipt':persistence,'negative_trade_balance_wallets':sum(sold[w]>purchased[w] for w in sold)}
 base={'mint':mint,'created':created,'half':half,'decision_t':t,'features':features,'variant':'CONTROL'}
 fs,why=state(t+1,True)
 if fs is None:answer={**base,'status':'fill_unavailable','why':why}
 else:
  tokens=ev.buy(fs,.2,55);high=ev.sell(fs,tokens,55)-.0015;trig=t+7199.3;invalid=False;seen_pool=fs['venue'] not in ('','curve');trig_reason='2h';trigger_row=None
  for row,tr in zip(RO,RT):
   if tr<=t+1:continue
   if tr>=t+7199.3:break
   if not ev.state_ok(row):invalid=True;continue
   seen_pool|=row['venue'] not in ('','curve');proceeds=ev.sell(row,tokens,55)-.0015;high=max(high,proceeds)
   if proceeds<=.7*high:trig=tr;trig_reason='30pct_proceeds_trail';trigger_row=row['row_id'];break
  landing=min(trig+.7,t+7200);ss,why=state(landing)
  if why is None and invalid:why='invalid received state during hold'
  if why is None and ev.gap_overlap(gaps,outages,t+1,landing,'pumpswap' if seen_pool else 'curve'):why='capture gap during hold'
  answer={**base,'status':'exit_uncertain' if why else 'scored','why':why,'fill_t':t+1,'fill_row_id':fs['row_id'],'fill_venue':fs['venue'] or 'curve','trigger_t':trig,'trigger_reason':trig_reason,'trigger_row_id':trigger_row,'sell_t':landing,'exit_row_id':ss['row_id'] if ss else None,'exit_venue':ss['venue'] if ss else None,'tokens':tokens,'max_sellable_proceeds_sol':high}
  if why is None:answer.update(net_sol=ev.sell(ss,tokens,55)-.2-.0015,ret=(ev.sell(ss,tokens,55)-.2-.0015)/.2)
 records['CONTROL'].append(answer)
 if candidate:records['L003'].append({**answer,'variant':'L003'})
 if sum(N.values())%500==0:print('PROCESSED',sum(N.values()),'ATTEMPTS',len(records['L003']),len(records['CONTROL']),flush=True)
assert stats['non_contiguous']==0
out={}
for name,rr in records.items():
 out[name]={}
 for half in ['early','late','all']:
  rows=[r for r in rr if half=='all' or r['half']==half];c=collections.Counter(r['status'] for r in rows);x=sorted(r['net_sol'] for r in rows if r['status']=='scored');den=sum(N.values()) if half=='all' else N[half];unc=c['fill_unavailable']+c['exit_uncertain'];events=[]
  for r in rows:
   if r['status']!='fill_unavailable':events.extend([(r['fill_t'],1),(r['sell_t'],-1)])
  active=peak=0
  for _,change in sorted(events):active+=change;peak=max(peak,active)
  out[name][half]={'eligible_denominator':den,'attempted':len(rows),'filled':c['scored']+c['exit_uncertain'],'fill_unavailable':c['fill_unavailable'],'scored':c['scored'],'uncertain_exits':c['exit_uncertain'],'unavailable_total':unc,'total_observed_net_sol':math.fsum(x),'mean_return':statistics.mean(x)/.2 if x else None,'median_return':statistics.median(x)/.2 if x else None,'mean_net_sol':statistics.mean(x) if x else None,'median_net_sol':statistics.median(x) if x else None,'win_rate':sum(v>0 for v in x)/len(x) if x else None,'share_loss_gt50':sum(v<-.1 for v in x)/len(x) if x else None,'without_best1_sol':math.fsum(x[:-1]) if x else None,'without_best3_sol':math.fsum(x[:-3]) if len(x)>3 else None,'observed_net_per_eligible_launch':math.fsum(x)/den,'unknown_zero_scenario_total':math.fsum(x),'unknown_fullstake_scenario_total':math.fsum(x)-unc*.2015,'unknown_reasons':dict(collections.Counter(r['why'] for r in rows if r['status']!='scored')),'peak_attempted_position_stake_sol':peak*.2,'variant_count_total':2}
report={'experiment':'CDEX-L003','protocol_commit':'47ac802f25258cd4f5a8b110935e50785fc29daf','data_commit':'e67833121f1da0dc992c28fa26c5236a855c151a','fee_bps':{'curve':125,'pool':55},'stake':.2,'fixed_cost':.0015,'variant_count':2,'results':out,'denominator':N,'audit':dict(audit),'limitations':['Exploratory previously examined data; not fresh confirmation','Trade-derived purchases/sales omit transfers and common ownership','Invalid in-hold states and gaps make exits uncertain','Thirty-second freshness is an evidence screen, not live-fill proof','Observed profit excludes unresolved outcomes, which are separately counted','No price cap suppresses legitimate winners; pool evidence still inherits decoder assumptions','Frozen evaluator unchanged; separate owner scenario']}
(root/'lab_results.json').write_text(json.dumps(report,indent=2));(root/'trade_ledger.json').write_text(json.dumps(records));print(json.dumps(report,indent=2),flush=True)
