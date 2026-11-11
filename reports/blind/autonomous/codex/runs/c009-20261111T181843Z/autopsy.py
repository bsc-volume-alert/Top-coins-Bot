"""C009 captured-path autopsy + one preregistered liquidity-stress gate."""
import pathlib,json,csv,hashlib,importlib.util,collections,bisect,statistics,math,datetime as dt
root=pathlib.Path(__file__).parent;cache=root.parent/'c001-20261110T211226Z'
spec=importlib.util.spec_from_file_location('ev',cache/'evaluate.py');ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
assert hashlib.sha256((cache/'evaluate.py').read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86';assert not ev.DEV_NO_EVIDENCE
checks=[]
for line in (cache/'data/SHA256SUMS.txt').read_text().splitlines():
 want,name=line.split(maxsplit=1);actual=hashlib.file_digest((cache/'data'/name).open('rb'),'sha256').hexdigest();assert actual==want;checks.append({'path':name,'sha256':actual,'ok':True})
(root/'checksums.json').write_text(json.dumps(checks,indent=2));print('CHECKSUMS_PASS',len(checks),flush=True)
tok,gaps,outages,meta=ev.load(str(cache/'replay'),1793950800,1794081600)
stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};audit=collections.Counter();records=[];N=0
for mint,L in ev.iter_mints(str(cache/'replay'),tok,stats):
 info=tok[mint];c=info['created'];cum=0.;ret=info['tier']>=1
 for r in L:
  if r['venue'] in ('curve','') and r['is_buy']=='1':cum+=ev.fl(r['sol']) or 0.
  if cum>=15:ret=True;break
 if not ret:continue
 if any(s<c+7200 and e>c for s,e in outages):continue
 N+=1
 if any(ev.fl(r['recv_ms']) is None for r in L) or any(float(L[i]['ts'])<float(L[i-1]['ts']) for i in range(1,len(L))):audit['signal_unknown_mints']+=1;continue
 RO=sorted(L,key=lambda r:(float(r['recv_ms']),int(r['slot']),int(r['row_id'])));RT=[float(r['recv_ms'])/1000 for r in RO];ts=[float(r['ts']) for r in L]
 half='early' if c<1794016200 else 'late';instant=bool(L[0]['venue'] in ('curve','') and float(L[0]['vtok'])<=279900000000000)
 for age in [300,900,1800]:
  t=c+age;known=RO[:bisect.bisect_right(RT,t)]
  if not known:continue
  gross=0.;retained=None
  for r in known:
   if r['venue'] in ('curve','') and r['is_buy']=='1':gross+=ev.fl(r['sol']) or 0.
   if gross>=15 and retained is None:retained=float(r['recv_ms'])/1000
  if retained is None:continue
  last=known[-1]
  if not ev.state_ok(last):audit['invalid_decision_state_age'+str(age)]+=1;continue
  vs=float(last['vsol'])/1e9;vt=float(last['vtok'])/1e6;px=vs/vt
  simulated_tokens=ev.buy(last,.2,55);base_sell=ev.sell(last,simulated_tokens,55);external_tokens=5/px
  stress_row={**last,'vsol':str(vs*vt/(vt+external_tokens)*1e9),'vtok':str((vt+external_tokens)*1e6)}
  stress_ratio=ev.sell(stress_row,simulated_tokens,55)/base_sell;gate=stress_ratio>=.8
  rec={'mint':mint,'age':age,'half':half,'created':c,'decision':t,'decision_venue':last['venue'] or 'curve','quote_reserve_sol':vs,'same_state_roundtrip_loss':1-base_sell/.2,'five_sol_stress_ratio':stress_ratio,'gate_pass':gate,'instant_graduation_flag':instant,'decision_row_id':last['row_id']}
  def state(at,buy=False):
   idx=bisect.bisect_right(ts,at)-1
   if idx<0:return None,'no state'
   r=L[idx];pool=r['venue'] not in ('curve','')
   if at-float(r['ts'])>30:return None,'state older than30s'
   if not ev.state_ok(r):return None,'invalid state or absent pool evidence'
   if buy and not pool and float(r['vtok'])<=279900000000000:return None,'completed curve buy'
   if ev.gap_overlap(gaps,outages,float(r['ts']),at,r['venue']):return None,'capture gap before landing'
   if not pool and at>retained+7500:return None,'outside curve capture'
   if pool and not ((c>=ev.POOL_ALL_FROM and at<=c+86400) or (c>=ev.POOL_RET_FROM and at<=retained+7500)):return None,'outside pool capture'
   return r,None
  fs,why=state(t+1,True)
  if fs is None:records.append({**rec,'trade_status':'fill_unavailable','reason':why,'label':'unknown'});continue
  tokens=ev.buy(fs,.2,55);high=ev.sell(fs,tokens,55)-.0015;trig=None;first_invalid=None;continuous=True;lastobs=t+1;sustain_start=None;label=None;maxproceeds=high;pool_seen=fs['venue'] not in ('curve','');row_at_trigger=None
  # Full future path is outcome evidence; it is never used in gate_pass.
  for r,tr in zip(RO,RT):
   if tr<=t+1:continue
   if tr>t+7200:break
   pool_seen|=r['venue'] not in ('curve','')
   if tr-lastobs>30 or tr-float(r['ts'])>30:continuous=False
   if not ev.state_ok(r):
    continuous=False
    if first_invalid is None:first_invalid=tr
    continue
   proceeds=ev.sell(r,tokens,55)-.0015;maxproceeds=max(maxproceeds,proceeds)
   if continuous and not ev.gap_overlap(gaps,outages,t+1,tr,'pumpswap' if pool_seen else 'curve'):
    if proceeds>=.4:
     if sustain_start is None:sustain_start=tr
     if tr-sustain_start>=30 and label is None:label='observed_sustained2x'
    else:sustain_start=None
   else:continuous=False
   lastobs=tr
   if trig is None:
    high=max(high,proceeds)
    if proceeds<=.7*high and tr<t+7199.3:trig=tr;row_at_trigger=r['row_id']
  endrow,endwhy=state(t+7200)
  if label is None:
   if continuous and t+7200-lastobs<=30 and endrow is not None and not ev.gap_overlap(gaps,outages,t+1,t+7200,'pumpswap' if pool_seen else 'curve'):label='captured_path_nonrunner'
   else:label='unknown'
  trigger=trig if trig is not None else t+7199.3;sell_t=min(trigger+.7,t+7200);ss,why=state(sell_t)
  if why is None and first_invalid is not None and first_invalid<=sell_t:why='invalid state during hold'
  holding_pool=fs['venue'] not in ('curve','') or any(r['venue'] not in ('curve','') for r,tr in zip(RO,RT) if t+1<tr<=sell_t)
  if why is None and ev.gap_overlap(gaps,outages,t+1,sell_t,'pumpswap' if holding_pool else 'curve'):why='capture gap during hold'
  sells=collections.defaultdict(lambda:{'sol':0.,'wallets':set()})
  for r,tr in zip(RO,RT):
   if t+1<tr<=t+7200 and r['is_buy']!='1':
    sells[r['slot']]['sol']+=ev.fl(r['sol']) or 0.;sells[r['slot']]['wallets'].add(r['wallet'])
  drains=[v['sol'] for v in sells.values() if v['sol']>=30 and len(v['wallets'])<=3]
  rec.update(trade_status='exit_uncertain' if why else 'scored',reason=why,fill_row_id=fs['row_id'],fill_t=t+1,fill_venue=fs['venue'] or 'curve',sell_t=sell_t,trigger_row_id=row_at_trigger,exit_row_id=ss['row_id'] if ss else None,exit_venue=ss['venue'] if ss else None,label=label,max_observed_sellable_proceeds_sol=maxproceeds,future_one_slot_drain_count=len(drains),largest_drain_sol=max(drains) if drains else 0.)
  if why is None:rec.update(net_sol=ev.sell(ss,tokens,55)-.2015,ret=(ev.sell(ss,tokens,55)-.2015)/.2)
  records.append(rec)
 if N%500==0:print('MINTS',N,'COHORT_ROWS',len(records),flush=True)
assert stats['non_contiguous']==0
# Exact-age, venue and3h creation-bucket matching. Liquidity is not a matching feature.
pairs=[]
for age in [300,900,1800]:
 bins=collections.defaultdict(lambda:collections.defaultdict(list))
 for r in records:
  if r['age']==age and r['label']!='unknown':bins[(r['decision_venue'],int(r['created']//10800))][r['label']].append(r)
 for key,d in bins.items():
  for a,b in zip(sorted(d['observed_sustained2x'],key=lambda r:r['mint']),sorted(d['captured_path_nonrunner'],key=lambda r:r['mint'])):
   pairs.append({'age':age,'venue':key[0],'time_bucket':key[1],'runner':a['mint'],'nonrunner':b['mint'],'runner_depth_sol':a['quote_reserve_sol'],'nonrunner_depth_sol':b['quote_reserve_sol'],'runner_stress_ratio':a['five_sol_stress_ratio'],'nonrunner_stress_ratio':b['five_sol_stress_ratio'],'runner_drain':a['future_one_slot_drain_count']>0,'nonrunner_drain':b['future_one_slot_drain_count']>0})
def statsrows(rows):
 cc=collections.Counter(r['trade_status'] for r in rows);x=sorted(r['net_sol'] for r in rows if r['trade_status']=='scored')
 return {'attempted':len(rows),'filled':cc['scored']+cc['exit_uncertain'],'fill_unavailable':cc['fill_unavailable'],'scored':cc['scored'],'uncertain_exits':cc['exit_uncertain'],'total_observed_net_sol':math.fsum(x),'mean_return':statistics.mean(x)/.2 if x else None,'median_return':statistics.median(x)/.2 if x else None,'win_rate':sum(v>0 for v in x)/len(x) if x else None,'share_loss_gt50':sum(v<-.1 for v in x)/len(x) if x else None,'without_best1_sol':math.fsum(x[:-1]) if x else None,'without_best3_sol':math.fsum(x[:-3]) if len(x)>3 else None,'unknown_reasons':dict(collections.Counter(r['reason'] for r in rows if r['trade_status']!='scored')),'instant_flag_attempts':sum(r['instant_graduation_flag'] for r in rows),'labels':dict(collections.Counter(r['label'] for r in rows))}
trading={name:{half:statsrows([r for r in records if r['age']==300 and (name=='CONTROL' or r['gate_pass']) and (half=='all' or r['half']==half)]) for half in ['early','late','all']} for name in ['L002','CONTROL']}
autopsy={}
for age in [300,900,1800]:
 rr=[r for r in records if r['age']==age];pp=[p for p in pairs if p['age']==age];autopsy[str(age)]={'cohort':statsrows(rr),'matched_pairs':len(pp),'runner_depth_median':statistics.median(p['runner_depth_sol'] for p in pp) if pp else None,'nonrunner_depth_median':statistics.median(p['nonrunner_depth_sol'] for p in pp) if pp else None,'runner_stress_median':statistics.median(p['runner_stress_ratio'] for p in pp) if pp else None,'nonrunner_stress_median':statistics.median(p['nonrunner_stress_ratio'] for p in pp) if pp else None,'runner_drain_count':sum(p['runner_drain'] for p in pp),'nonrunner_drain_count':sum(p['nonrunner_drain'] for p in pp)}
report={'task':'C009','protocol_commit':'0aa4b4998d296239f5950ec599e3989eefc6f907','data_commit':'e67833121f1da0dc992c28fa26c5236a855c151a','denominator':N,'audit':dict(audit),'trading_specs':2,'trading':trading,'autopsy':autopsy,'limitations':['Exploratory, not fresh confirmation','Captured-path sustained2x target is not a >=$100K target','Operational path completeness assumes30s-spaced observations and logged coverage; no absolute capture proof','Unknown labels never become negative controls','Same-state depth stress is hypothetical, not ownership evidence','Initial instant-graduation flags remain visible; decoder root cause unverified','Ages900/1800 trade results are descriptive autopsy diagnostics, not extra selected candidates']}
(root/'results.json').write_text(json.dumps(report,indent=2));(root/'records.json').write_text(json.dumps(records));(root/'matched_pairs.json').write_text(json.dumps(pairs,indent=2));print(json.dumps(report,indent=2),flush=True)
