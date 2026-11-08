#!/usr/bin/env python3
"""Phase B: raw-data reproduction of Fable's Phase A; frozen evaluator unchanged."""
import argparse,collections,datetime as dt,hashlib,importlib.util,json,pathlib,types
import numpy as np
import pandas as pd

def main():
 p=argparse.ArgumentParser();p.add_argument('--data',required=True);p.add_argument('--evaluator',required=True)
 p.add_argument('--fable',required=True);p.add_argument('--out',required=True);a=p.parse_args()
 data=pathlib.Path(a.data);out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True)
 spec=importlib.util.spec_from_file_location('ev',a.evaluator);ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
 assert hashlib.sha256(pathlib.Path(a.evaluator).read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86'
 source=(pathlib.Path(a.fable)/'engine_r2.py').read_text()
 source=source.replace("D='/home/claude/data_r2/'",f'D={str(data)+"/"!r}')
 E=types.ModuleType('fable_engine');exec(compile(source,'fable_engine_r2.py','exec'),E.__dict__)
 replay=out/'replay';replay.mkdir(exist_ok=True)
 for f in data.glob('trades_part_*.csv.gz'):
  q=replay/f.name
  if not q.exists():q.symlink_to(f.resolve())
 for src,dst in [('tokens_window.csv.gz','tokens.csv.gz'),('feed_gaps_all.csv.gz','feed_gaps.csv.gz')]:
  q=replay/dst
  if not q.exists():q.symlink_to((data/src).resolve())
 (replay/'outages.txt').write_text(''.join(f'{s} {e} fable_five_outages\n' for s,e in E.OUTAGES))
 start=pd.Timestamp('2026-11-06 07:40',tz='UTC').timestamp();split=pd.Timestamp('2026-11-07 03:22',tz='UTC').timestamp();end=pd.Timestamp('2026-11-07 20:00',tz='UTC').timestamp()
 tok,gaps,outages,meta=ev.load(str(replay),start,end)
 census=pd.read_csv(data/'tokens_window.csv.gz').sort_values('create_ts')
 census['creator_prior']=census.groupby('creator').cumcount();CP=census.set_index('mint').creator_prior.to_dict()
 bymint=census.set_index('mint').to_dict('index')
 creator_times={c:sorted(zip(g.create_ts,g.mint)) for c,g in census.groupby('creator')}
 specs={'tr20':dict(trail=.2),'tr30':dict(trail=.3),'tp13tr20':dict(tp=1.3,trail=.2),'tp15tr30':dict(tp=1.5,trail=.3),
        **{f'h{h}':dict(horizon=h) for h in (15,30,60,120,300,7200)}}
 def arrays(L,info):
  n=len(L)
  f=lambda k:np.array([ev.fl(r[k]) if ev.fl(r[k]) is not None else np.nan for r in L])
  return dict(ts=f('ts').astype(np.int64),recv=f('recv_ms'),q=f('vsol'),b=f('vtok'),
   pool=np.array([r['venue'] not in ('','curve') for r in L],dtype=np.int8),
   evid=np.array([r.get('quote_mint')==ev.WSOL and r.get('base_dec')=='6' and r.get('quote_dec')=='9' for r in L],dtype=np.int8),
   buy=f('is_buy').astype(np.int8),sol=f('sol'),tokens=f('tokens'),wallet=np.array([r['wallet'] for r in L],dtype=object),
   slot=f('slot').astype(np.int64),create=int(info['created']),tier=info['tier'])
 stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};audit=collections.Counter();rows=[];candidate=[];checks=[];art={};borders=[];feature_mismatch=[]
 mod=types.SimpleNamespace(decide=lambda v:True,exit_signal=lambda p:False)
 R={'decision_offsets':[],'on_trade':True,'horizon_s':30,'sizes':[.2,.02]}
 target='5kdsd8zW37T2rK47gULpPLLCY181iKCuT8wZrChhpump'
 for m,L in ev.iter_mints(str(replay),tok,stats):
  info=tok[m];d=E.prep(arrays(sorted(L,key=lambda r:(int(r['slot']),int(r['row_id']))),info))
  if not E.in_universe(d):continue
  half='H1' if info['created']<split else 'H2';audit[half]+=1
  changed=any(int(x['row_id'])!=int(y['row_id']) for x,y in zip(L,sorted(L,key=lambda r:(int(r['slot']),int(r['row_id'])))))
  audit['loader_order_changed_mints']+=changed
  contradiction=bool((np.diff(d['ts'])<0).any());audit['legacy_time_contradictions']+=contradiction
  if info['created']<pd.Timestamp('2026-11-06 21:45',tz='UTC').timestamp() and info['created']+7200>pd.Timestamp('2026-11-06 21:40',tz='UTC').timestamp():borders.append(m)
  t=d['retained_at'];f=E.feats(d,t);instant=f['gross']>=80 or f['mc_sol']>=380;audit['instant_'+half]+=instant
  knowncurve=d['RO'][(d['RT']<=t)&(d['pool'][d['RO']]==0)]
  known_gross=float(d['sol'][knowncurve[d['buy'][knowncurve]==1]].sum())
  audit['retention_known_gross_below15_'+half]+=known_gross<15
  if instant:
   audit['instant_first_trade_buy_ge80']+=bool(d['buy'][0]==1 and d['sol'][0]>=80)
   audit['instant_first_trade_at_floor']+=bool(d['b'][0]<=279900000000000)
   audit['instant_first_trade_in_creation_slot']+=bool(d['slot'][0]==bymint[m]['create_slot'])
  if not instant and CP.get(m,99)==0:
   audit['ftc_known_gross_below15_'+half]+=known_gross<15
   audit['ftc_order_changed']+=changed
   audit['ftc_time_contradiction']+=contradiction
  actual,hyp=ev.run_launch(mod,R,m,info,L,gaps,outages,meta,30)
  checks.append(dict(mint=m,half=half,actual=actual,hyp=hyp))
  own=E.replay(d,t,horizon=30)
  match=actual['cat']==own['cat'] and (actual['cat']!='scored' or abs(actual['sizes']['0.2']['ret']-own['r'])<1e-10)
  audit['engine_frozen_h30_mismatch']+=not match
  for off in (0,5):
   for label,kw in specs.items():
    v=E.replay(d,t+off,**kw)
    rows.append(dict(mint=m,half=half,off=off,exit=label,instant=instant,cat=v['cat'],r=v['r'] if v['cat']=='scored' else None,why=v['why']))
  if not instant and CP.get(m,99)==0:
   before=[(c,mm) for c,mm in creator_times[bymint[m]['creator']] if c<t and mm!=m]
   if before:feature_mismatch.append(dict(mint=m,half=half,created=info['created'],decision=t,other_launches_before_decision=before))
   for off in (0,5):
    for label,kw in [('tp12h30',dict(tp=1.2,horizon=30)),('h30',dict(horizon=30))]:
     for s in (.2,.02):
      v=E.replay(d,t+off,size=s,**kw)
      candidate.append(dict(mint=m,half=half,off=off,exit=label,size=s,cat=v['cat'],r=v['r'] if v['cat']=='scored' else None,net=v['net'] if v['cat']=='scored' else None,why=v['why'],hold_s=v.get('hold_s'),fill_pool=v.get('fill_pool'),exit_pool=v.get('exit_pool')))
  if m==target:
   art={'mint':m,'created':info['created'],'retained_at':t,'retention_features':f,'census':bymint[m],'first_rows':L[:4],
        'engine_h30':own,'engine_h7200':E.replay(d,t,horizon=7200),'frozen_h30':actual}
   for h in (30,7200):
    rr,_=ev.run_launch(mod,dict(R,horizon_s=h),m,info,L,gaps,outages,meta,30)
    art['frozen_h'+str(h)]=rr
   art['h30_entry_state']=ev.state_at(L,t+1,gaps,outages,info['created'],t)[0]
   ss,why=ev.state_at(L,t+30,gaps,outages,info['created'],t);art['h30_exit_state']=ss
  if (audit['H1']+audit['H2'])%500==0:print('processed',audit['H1'],audit['H2'],flush=True)
 def summary(rr,size=.2):
  good=[r for r in rr if r['cat']=='scored'];x=np.array([r['r'] for r in good]);n=len(rr);u=n-len(good)
  v=dict(attempted=n,scored=len(good),unknown=u,unknown_reasons=dict(collections.Counter(r['why'] for r in rr if r['cat']!='scored')))
  if len(x):v.update(mean=float(x.mean()),median=float(np.median(x)),win=float((x>0).mean()),without_best_mean=float((x.sum()-x.max())/(len(x)-1)),net_sol=float(x.sum()*size),without_best_net=float((x.sum()-x.max())*size),loss50=float((x<=-.5).mean()),worst=float(x.min()),lower_total=float(x.sum()*size-u*(size+.0015)))
  return v
 stage={}
 for off in (0,5):
  for scope in ('all','clean'):
   for half in ('H1','H2','combined'):
    stage[f'r{off}_{scope}_{half}']={k:summary([r for r in rows if r['off']==off and r['exit']==k and (scope=='all' or not r['instant']) and (half=='combined' or r['half']==half)]) for k in specs}
 cand={}
 for off in (0,5):
  for ex in ('tp12h30','h30'):
   for half in ('H1','H2'):
    for size in (.2,.02):
     rr=[r for r in candidate if r['off']==off and r['exit']==ex and r['half']==half and r['size']==size]
     v=summary(rr,size);vals=np.array([r['r'] if r['cat']=='scored' else -1-.0015/size for r in rr]);rng=np.random.default_rng(20261108)
     boot=np.array([rng.choice(vals,len(vals),True).mean() for _ in range(4000)])
     v['attempt_conditioned_lb5']=float(np.percentile(boot,5));cand[f'r{off}_{ex}_{half}_{size}']=v
 report={'audit':dict(audit),'resize_border_mints':borders,'stage':stage,'candidate':cand,'feature_mismatch':feature_mismatch,'artifact':art}
 (out/'reproduction.json').write_text(json.dumps(report,indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)))
 encoder=lambda x:x.item() if isinstance(x,np.generic) else str(x)
 (out/'frozen_launches.json').write_text(json.dumps(checks,default=encoder));(out/'candidate_launches.json').write_text(json.dumps(candidate,default=encoder));(out/'stage_launches.json').write_text(json.dumps(rows,default=encoder))
 print(json.dumps({'audit':dict(audit),'resize_borders':len(borders),'feature_mismatch':len(feature_mismatch),'candidate':cand},indent=2,default=encoder),flush=True)

if __name__=='__main__':main()
