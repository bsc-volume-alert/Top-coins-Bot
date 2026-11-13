import pathlib
r=pathlib.Path(__file__).parent;s=(r.parent/'c010-lab-20261111T211258Z/lab.py').read_text();s=s.replace("records={'L003':[],'CONTROL':[]}","records={'L007':[],'BASELINE':[]}")
needle="stats={'mints_streamed'";s=s.replace(needle,"with gzip.open(cache/'data/tokens_window.csv.gz','rt') as fh:creator_map={q['mint']:q.get('creator','') for q in csv.DictReader(fh)}\n"+needle,1)
s=s.replace("candidate=len(recent_buyers)>=20 and material>=10 and persistence>=.6", "candidate=len(recent_buyers)>=20 and material>=10 and persistence>=.6\n if not candidate:continue\n creator=creator_map.get(mint,'')")
a=s.index(' fs,why=state(t+1,True)');b=s.index(" if sum(N.values())%500",a)
core=''' fs,fill_why=state(t+1,True)
 for arm in ['BASELINE','L007']:
  if fs is None:answer={**base,'variant':arm,'status':'fill_unavailable','why':fill_why,'creator':creator}
  else:
   actor={'buy_sol':0.,'sell_sol':0.,'buy_tokens':0.,'sell_tokens':0.,'unknown':not bool(creator),'rows':0}
   def update_actor(q):
    if q['wallet']!=creator:return
    actor['rows']+=1;sval=ev.fl(q['sol']);tval=ev.fl(q['tokens'])
    if not ev.state_ok(q) or sval is None or tval is None:actor['unknown']=True;return
    if q['is_buy']=='1':actor['buy_sol']+=sval;actor['buy_tokens']+=tval
    else:actor['sell_sol']+=sval;actor['sell_tokens']+=tval
   for q,qt in zip(RO,RT):
    if qt>t+1:break
    update_actor(q)
   actor_at_fill=dict(actor);tokens=ev.buy(fs,.2,55);high=ev.sell(fs,tokens,55)-.0015;trig=t+7199.3;invalid=False;seen_pool=fs['venue'] not in ('','curve');trig_reason='2h';trigger_row=None;actor_condition=False
   for row,tr in zip(RO,RT):
    if tr<=t+1:continue
    if tr>=t+7199.3:break
    update_actor(row)
    if not ev.state_ok(row):invalid=True;continue
    seen_pool|=row['venue'] not in ('','curve');proceeds=ev.sell(row,tokens,55)-.0015;high=max(high,proceeds)
    actor_condition=bool(row['wallet']==creator and row['is_buy']!='1' and not actor['unknown'] and actor['buy_sol']>0 and actor['sell_sol']>=actor['buy_sol'] and actor['buy_tokens']-actor['sell_tokens']>0)
    if proceeds<=.7*high:trig=tr;trig_reason='30pct_proceeds_trail';trigger_row=row['row_id'];break
    if arm=='L007' and actor_condition:trig=tr;trig_reason='creator_cash_recovery_sell';trigger_row=row['row_id'];break
   landing=min(trig+.7,t+7200);ss,why=state(landing)
   if why is None and invalid:why='invalid received state during hold'
   if why is None and ev.gap_overlap(gaps,outages,t+1,landing,'pumpswap' if seen_pool else 'curve'):why='capture gap during hold'
   if why is None and arm=='L007' and actor['unknown']:why='creator cashflow history unknown'
   answer={**base,'variant':arm,'status':'exit_uncertain' if why else 'scored','why':why,'fill_t':t+1,'fill_row_id':fs['row_id'],'fill_venue':fs['venue'] or 'curve','trigger_t':trig,'trigger_reason':trig_reason,'trigger_row_id':trigger_row,'sell_t':landing,'exit_row_id':ss['row_id'] if ss else None,'exit_venue':ss['venue'] if ss else None,'tokens':tokens,'max_sellable_proceeds_sol':high,'creator':creator,'creator_cashflow_at_fill':actor_at_fill,'creator_cashflow_at_exit_scan':dict(actor),'actor_condition_at_last_row':actor_condition}
   if why is None:answer.update(net_sol=ev.sell(ss,tokens,55)-.2-.0015,ret=(ev.sell(ss,tokens,55)-.2-.0015)/.2)
  records[arm].append(answer)
'''
s=s[:a]+core+s[b:];s=s.replace("len(records['L003']),len(records['CONTROL'])","len(records['L007']),len(records['BASELINE'])");s=s.replace("'experiment':'CDEX-L003'","'experiment':'CDEX-L007'").replace('47ac802f25258cd4f5a8b110935e50785fc29daf','88c7c23db92541bd9f566238f8899bcda8d56f9f');(r/'lab.py').write_text(s)
