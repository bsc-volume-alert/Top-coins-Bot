import pathlib,json,statistics,collections
r=pathlib.Path(__file__).parent;x=json.loads((r/'trade_ledger.json').read_text());out={}
for arm,rr in x.items():
 out[arm]={}
 for h in ['early','late','all']:
  rows=[z for z in rr if z['status']!='fill_unavailable' and (h=='all' or z['half']==h)];ev=[];stake_seconds=0.
  for z in rows:
   ev.append((z['fill_t'],.2));ev.append((z['sell_t'],-(.1 if z.get('partial_done') else .2)))
   if z.get('partial_done'):ev.append((z['partial_landing_t'],-.1));stake_seconds+=.2*(z['partial_landing_t']-z['fill_t'])+.1*(z['sell_t']-z['partial_landing_t'])
   else:stake_seconds+=.2*(z['sell_t']-z['fill_t'])
  active=peak=0.
  for _,d in sorted(ev):active+=d;peak=max(peak,active)
  out[arm][h]={'modeled_peak_open_initial_stake_sol':peak,'modeled_stake_seconds':stake_seconds,'median_final_hold_sec':statistics.median(z['sell_t']-z['fill_t'] for z in rows),'limits':'Independent positions; partial reserve impact does not persist. Unresolved positions may remain open past modeled exit time.'}
(r/'exposure.json').write_text(json.dumps(out,indent=2))
