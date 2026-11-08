#!/usr/bin/env python3
"""Read raw evidence rows and replay four named graduation examples, unchanged eval."""
import argparse,collections,csv,gzip,importlib.util,json,pathlib,types

def main():
 p=argparse.ArgumentParser();p.add_argument('--data',required=True);p.add_argument('--out',required=True);p.add_argument('--evaluator',required=True);a=p.parse_args()
 data=pathlib.Path(a.data);out=pathlib.Path(a.out);spec=importlib.util.spec_from_file_location('ev',a.evaluator);ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
 targets=['5kdsd8zW37T2rK47gULpPLLCY181iKCuT8wZrChhpump','LLzYn4ZZ4anByo4Xud8jMvE7y9zCf2APwRsTCZcpump','fBidsBVNH6HdAba7pD6dqSoxmU2jAT7z3YuCUVzpump','dEJEFGBeTyMBrKZ25VeEFaQymTgSLj7zuqPGnLkpump']
 cov={r['mint']:r for r in csv.DictReader(gzip.open(data/'coverage_per_mint.csv.gz','rt'))}
 parts=collections.defaultdict(list)
 for m in targets:parts[cov[m]['part']].append(m)
 tok,gaps,outages,meta=ev.load(str(out/'replay'),1793950800,1794081600);M={m:[] for m in targets}
 for part,mints in parts.items():
  for r in csv.DictReader(gzip.open(data/part,'rt')):
   if r['mint'] in mints:M[r['mint']].append(r)
 mod=types.SimpleNamespace(decide=lambda v:True,exit_signal=lambda p:False);report={}
 for m,L in M.items():
  seen=set();unique=[]
  for r in L:
   fp=tuple(r[k] for k in ['mint','sig','wallet','is_buy','sol','tokens','venue','vsol','vtok'])
   if fp not in seen:seen.add(fp);unique.append(r)
  L=sorted(unique,key=lambda r:(int(r['slot']),int(r['ev_idx']) if r['ev_idx'] else -1,int(r['row_id'])))
  v={}
  for h in (30,7200):
   R={'decision_offsets':[],'on_trade':True,'horizon_s':h,'sizes':[.2,.02]};r,_=ev.run_launch(mod,R,m,tok[m],L,gaps,outages,meta,30);v['frozen_h'+str(h)]=r
  t=v['frozen_h30']['entry_t'];b,_=ev.state_at(L,t+1,gaps,outages,tok[m]['created'],t);s,_=ev.state_at(L,t+30,gaps,outages,tok[m]['created'],t)
  v.update(first_curve=L[0],entry_state=b,exit30_state=s,last_state=L[-1],base_mints=sorted(set(r['base_mint'] for r in L if r['venue']=='pumpswap')),pool_accounts=sorted(set(r['pool'] for r in L if r['venue']=='pumpswap')))
  if b:
   token=ev.buy(b,.2,30);v['unchecked_last_state_return']=(ev.sell(L[-1],token,30)-.2015)/.2
   v['max_unchecked_return_on_any_valid_state']=max((ev.sell(r,token,30)-.2015)/.2 for r in L if ev.state_ok(r))
  v['gaps_between_last_state_and_two_hour_landing']={k:[(a,b) for a,b in gg if a<t+7200 and b>float(L[-1]['ts'])] for k,gg in gaps.items()}
  report[m]=v
 (out/'artifact_checks.json').write_text(json.dumps(report,indent=2));print(json.dumps({m:{k:v for k,v in z.items() if k.startswith('frozen')} for m,z in report.items()},indent=2))

if __name__=='__main__':main()
