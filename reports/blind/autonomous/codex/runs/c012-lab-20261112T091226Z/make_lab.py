import pathlib
r=pathlib.Path(__file__).parent;s=(r.parent/'c010-lab-20261111T211258Z/lab.py').read_text()
s=s.replace("records={'L003':[],'CONTROL':[]}","records={'L004':[],'BASELINE':[]}")
# Restrict BOTH arms to locked L003 entries; no all-curve control search.
s=s.replace("candidate=len(recent_buyers)>=20 and material>=10 and persistence>=.6", "candidate=len(recent_buyers)>=20 and material>=10 and persistence>=.6\n if not candidate:continue\n early_cohort={r['wallet'] for r in known if r['venue'] in ('','curve') and r['is_buy']=='1' and float(r['recv_ms'])/1000<=created+60}")
start=s.index(' fs,why=state(t+1,True)');end=s.index(" if sum(N.values())%500",start)
new=''' fs,fill_why=state(t+1,True)
 for arm in ['BASELINE','L004']:
  if fs is None:answer={**base,'variant':arm,'status':'fill_unavailable','why':fill_why}
  else:
   tokens=ev.buy(fs,.2,55);high=ev.sell(fs,tokens,55)-.0015;trig=t+7199.3;invalid=False;seen_pool=fs['venue'] not in ('','curve');trig_reason='2h';trigger_row=None;cluster=collections.deque();trigger_cluster_wallets=None;trigger_cluster_sol=None
   for row,tr in zip(RO,RT):
    if tr<=t+1:continue
    if tr>=t+7199.3:break
    if not ev.state_ok(row):invalid=True;continue
    seen_pool|=row['venue'] not in ('','curve');proceeds=ev.sell(row,tokens,55)-.0015;high=max(high,proceeds)
    while cluster and cluster[0][0]<tr-2:cluster.popleft()
    if row['is_buy']!='1' and row['wallet'] in early_cohort:cluster.append((tr,row['wallet'],ev.fl(row['sol']) or 0.))
    cluster_n=len({z[1] for z in cluster});cluster_sol=math.fsum(z[2] for z in cluster)
    if proceeds<=.7*high:trig=tr;trig_reason='30pct_proceeds_trail';trigger_row=row['row_id'];break
    if arm=='L004' and cluster_n>=3 and cluster_sol>=2:
     trig=tr;trig_reason='early_cohort_sell_cluster';trigger_row=row['row_id'];trigger_cluster_wallets=cluster_n;trigger_cluster_sol=cluster_sol;break
   landing=min(trig+.7,t+7200);ss,why=state(landing)
   if why is None and invalid:why='invalid received state during hold'
   if why is None and ev.gap_overlap(gaps,outages,t+1,landing,'pumpswap' if seen_pool else 'curve'):why='capture gap during hold'
   answer={**base,'variant':arm,'status':'exit_uncertain' if why else 'scored','why':why,'fill_t':t+1,'fill_row_id':fs['row_id'],'fill_venue':fs['venue'] or 'curve','trigger_t':trig,'trigger_reason':trig_reason,'trigger_row_id':trigger_row,'sell_t':landing,'exit_row_id':ss['row_id'] if ss else None,'exit_venue':ss['venue'] if ss else None,'tokens':tokens,'max_sellable_proceeds_sol':high,'early_cohort_n':len(early_cohort),'trigger_cluster_wallets':trigger_cluster_wallets,'trigger_cluster_sol':trigger_cluster_sol}
   if why is None:answer.update(net_sol=ev.sell(ss,tokens,55)-.2-.0015,ret=(ev.sell(ss,tokens,55)-.2-.0015)/.2)
  records[arm].append(answer)
'''
s=s[:start]+new+s[end:]
s=s.replace("len(records['L003']),len(records['CONTROL'])","len(records['L004']),len(records['BASELINE'])")
s=s.replace("'experiment':'CDEX-L003'","'experiment':'CDEX-L004'").replace("47ac802f25258cd4f5a8b110935e50785fc29daf","f044ea960fad409a943db06989a1d8b0f888288f")
(r/'lab.py').write_text(s)
