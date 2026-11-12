import pathlib
r=pathlib.Path(__file__).parent;s=(r.parent/'c010-lab-20261111T211258Z/lab.py').read_text()
s=s.replace("records={'L003':[],'CONTROL':[]}","records={'L005':[],'BASELINE':[]}")
s=s.replace("candidate=len(recent_buyers)>=20 and material>=10 and persistence>=.6", "candidate=len(recent_buyers)>=20 and material>=10 and persistence>=.6\n if not candidate:continue")
a=s.index(' fs,why=state(t+1,True)');b=s.index(" if sum(N.values())%500",a)
core=''' fs,fill_why=state(t+1,True)
 for arm in ['BASELINE','L005']:
  if fs is None:answer={**base,'variant':arm,'status':'fill_unavailable','why':fill_why}
  else:
   initial_tokens=ev.buy(fs,.2,55);tokens=initial_tokens;high=ev.sell(fs,tokens,55)-.0015;trig=t+7199.3;invalid=False;seen_pool=fs['venue'] not in ('','curve');trig_reason='2h';trigger_row=None;cash=0.;partial_done=False;partial_failure=None;partial_t=None;partial_trigger=None;partial_row=None;partial_proceeds=None;resume_at=t+1
   for row,tr in zip(RO,RT):
    if tr<=t+1:continue
    if tr>=t+7199.3:break
    if not ev.state_ok(row):invalid=True;continue
    seen_pool|=row['venue'] not in ('','curve')
    if tr<=resume_at:continue
    proceeds=ev.sell(row,tokens,55)-.0015;high=max(high,proceeds)
    if proceeds<=.7*high:trig=tr;trig_reason='30pct_proceeds_trail';trigger_row=row['row_id'];break
    if arm=='L005' and not partial_done and proceeds>=.30 and tr+.7<t+7200:
     partial_trigger=tr;partial_t=tr+.7;ps,pwhy=state(partial_t)
     if pwhy:
      partial_failure=pwhy;trig=tr;trig_reason='partial_landing_unavailable';trigger_row=row['row_id'];break
     partial_row=ps['row_id'];partial_proceeds=ev.sell(ps,initial_tokens*.5,55);cash=partial_proceeds;tokens=initial_tokens*.5;partial_done=True;resume_at=partial_t;high=ev.sell(ps,tokens,55)-.0015;seen_pool|=ps['venue'] not in ('','curve')
   landing=min(trig+.7,t+7200);ss,why=state(landing)
   if partial_failure:why='partial sell unavailable: '+partial_failure
   if why is None and invalid:why='invalid received state during hold'
   if why is None and ev.gap_overlap(gaps,outages,t+1,landing,'pumpswap' if seen_pool else 'curve'):why='capture gap during hold'
   answer={**base,'variant':arm,'status':'exit_uncertain' if why else 'scored','why':why,'fill_t':t+1,'fill_row_id':fs['row_id'],'fill_venue':fs['venue'] or 'curve','trigger_t':trig,'trigger_reason':trig_reason,'trigger_row_id':trigger_row,'sell_t':landing,'exit_row_id':ss['row_id'] if ss else None,'exit_venue':ss['venue'] if ss else None,'tokens':initial_tokens,'max_sellable_proceeds_sol':high,'remaining_tokens':tokens,'partial_done':partial_done,'partial_trigger_t':partial_trigger,'partial_landing_t':partial_t,'partial_row_id':partial_row,'partial_proceeds_after_protocol_fee_sol':partial_proceeds,'additional_fixed_cost_sol':.00075 if partial_done else 0.,'partial_failure':partial_failure}
   if why is None:
    net=cash+ev.sell(ss,tokens,55)-.2-.0015-(.00075 if partial_done else 0.);answer.update(net_sol=net,ret=net/.2)
  records[arm].append(answer)
'''
s=s[:a]+core+s[b:];s=s.replace("len(records['L003']),len(records['CONTROL'])","len(records['L005']),len(records['BASELINE'])");s=s.replace("'experiment':'CDEX-L003'","'experiment':'CDEX-L005'").replace('47ac802f25258cd4f5a8b110935e50785fc29daf','6e9db558fd1feb1745d4bd9be97c1ceb50c8166a');(r/'lab.py').write_text(s)
