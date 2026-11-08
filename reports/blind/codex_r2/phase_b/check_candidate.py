#!/usr/bin/env python3
"""Frozen-evaluator FTC-R0 audit, with externally supplied Phase-A candidate set."""
import argparse,collections,importlib.util,json,math,pathlib,types

def main():
 p=argparse.ArgumentParser();p.add_argument('--out',required=True);p.add_argument('--evaluator',required=True);a=p.parse_args();out=pathlib.Path(a.out)
 spec=importlib.util.spec_from_file_location('ev',a.evaluator);ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
 src=json.loads((out/'candidate_launches.json').read_text());members={r['mint'] for r in src if r['off']==0}
 expected={(r['mint'],r['exit'],str(r['size'])):r for r in src if r['off']==0}
 tok,gaps,outages,meta=ev.load(str(out/'replay'),1793950800,1794081600)
 allres={};audit=collections.Counter();states=[]
 for ex in ('tp12h30','h30'):
  for fee in (30,125):allres[(ex,fee,'H1')]=[];allres[(ex,fee,'H2')]=[]
 stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()}
 for m,L in ev.iter_mints(str(out/'replay'),tok,stats):
  if m not in members:continue
  half='H1' if tok[m]['created']<1794021720 else 'H2'
  for ex in ('tp12h30','h30'):
   mod=types.SimpleNamespace(decide=lambda v:True,exit_signal=(lambda pos:pos.x>=1.2) if ex=='tp12h30' else (lambda pos:False))
   R={'decision_offsets':[],'on_trade':True,'horizon_s':30,'sizes':[.2,.02]}
   for fee in (30,125):
    r,h=ev.run_launch(mod,R,m,tok[m],L,gaps,outages,meta,fee)
    allres[(ex,fee,half)].append(dict(mint=m,**r))
    if fee==30:
     for s in (.2,.02):
      want=expected[(m,ex,str(s))]
      if want['cat']!=r['cat'] or (r['cat']=='scored' and not math.isclose(want['net'],r['sizes'][str(s)]['net_sol'],rel_tol=1e-10,abs_tol=1e-10)):audit['engine_frozen_differences']+=1
     if r['cat']=='scored':
      audit[ex+'_'+half+'_pool_fills']+=r['sizes']['0.2']['fill_venue']!='curve'
      audit[ex+'_'+half+'_pool_exits']+=r['sizes']['0.2']['exit_venue']!='curve'
  audit['candidate_mints']+=1
  if audit['candidate_mints']%500==0:print('FTC checked',audit['candidate_mints'],flush=True)
 report={'audit':dict(audit),'summaries':{},'scored_results':{}}
 denominators={'H1':1847,'H2':1846}
 for (ex,fee,half),rr in allres.items():
  key=f'{ex}_{fee}_{half}';report['scored_results'][key]=rr
  padded=rr+[{'cat':'abstain'}]*(denominators[half]-len(rr))
  report['summaries'][key]={str(s):ev.score(padded,s,1,(s+.0015)/s) for s in (.2,.02)}
 (out/'candidate_frozen_audit.json').write_text(json.dumps(report,indent=2));print(json.dumps({'audit':report['audit'],'summaries':report['summaries']},indent=2))

if __name__=='__main__':main()
