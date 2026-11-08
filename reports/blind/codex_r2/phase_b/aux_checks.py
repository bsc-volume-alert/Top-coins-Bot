#!/usr/bin/env python3
"""Aggregate raw-replay outputs and show the frozen no-entry/prebuffer edge case."""
import argparse,importlib.util,json,pathlib,types

def main():
 p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--evaluator',required=True);a=p.parse_args();out=pathlib.Path(a.out)
 checked=json.loads((out/'frozen_launches.json').read_text());candidates=json.loads((out/'candidate_launches.json').read_text());summary={}
 for half in ('H1','H2'):
  rr=[x['actual'] for x in checked if x['half']==half];good=[r for r in rr if r['cat']=='scored']
  z={'N':len(rr),'scored':len(good),'unknown':sum(r['cat']=='unknown' for r in rr),'sizes':{}}
  for s in (.2,.02):
   x=[r['sizes'][str(s)]['ret'] for r in good]
   z['sizes'][str(s)]={'mean':sum(x)/len(x),'win':sum(v>0 for v in x)/len(x),
      'without_best_mean':(sum(x)-max(x))/(len(x)-1),'total_net':sum(x)*s,'point':sum(x)*s/len(rr)}
  summary[half]=z
 (out/'unconditional_frozen_summary.json').write_text(json.dumps(summary,indent=2))
 times={r['mint']:r['actual'].get('entry_t') for r in checked};capital={}
 for ex in ('tp12h30','h30'):
  rr=[r for r in candidates if r['off']==0 and r['exit']==ex and r['size']==.2]
  events=[]
  for r in rr:
   t=times[r['mint']]
   if t is not None:events.extend([(t+1,1),(t+(r['hold_s'] if r['cat']=='scored' else 30),-1)])
  n=peak=0
  for _,d in sorted(events):n+=d;peak=max(peak,n)
  capital[ex]={'attempts':len(rr),'per_day':len(rr)*24/(36+1/3),'planned_peak':peak,'peak_stake_0.2':peak*.2,
               'unknown_release_assumption':'30 seconds after decision; actual release unconfirmed'}
 (out/'planned_capital.json').write_text(json.dumps(capital,indent=2))
 spec=importlib.util.spec_from_file_location('ev',a.evaluator);ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
 rows=[dict(row_id=str(i),slot=str(i),ts='101',recv_ms='101200',venue='curve',is_buy='1',sol='1',vsol='40000000000',vtok='800000000000000',ev_idx='',wallet='w',mint='m') for i in range(12001)]
 result,_=ev.run_launch(types.SimpleNamespace(decide=lambda v:False,exit_signal=lambda p:False),{'decision_offsets':[],'on_trade':False,'sizes':[.2,.02]},'m',{'created':100,'tier':0},rows,{'main':[],'pool':[]},[],{},30)
 assert result=={'cat':'unknown','why':'pre-promotion buffer exceeded'}
 (out/'abstain_buffer_counterexample.json').write_text(json.dumps({'synthetic_only':True,'rows':12001,'decide_returns':False,'result':result},indent=2))
 src=json.loads((out/'candidate_frozen_audit.json').read_text());(out/'candidate_frozen_summary.json').write_text(json.dumps({k:v for k,v in src.items() if k!='scored_results'},indent=2))
 print('summaries, planned capital and synthetic counterexample complete')

if __name__=='__main__':main()
