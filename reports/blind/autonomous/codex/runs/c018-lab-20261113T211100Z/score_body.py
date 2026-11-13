# Appended to unchanged F014 retained()/run_eval() functions by make_run.py.
from decimal import Decimal
with (out/'creator_features.csv').open() as fh:PC={z['mint']:z for z in csv.DictReader(fh)}
gate=json.loads((out/'PRECHECK.json').read_text());assert gate['testable_R54'] and gate['threshold_SOL']==5 and gate['feature_unknown']==0
stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};audit=collections.Counter();rows=[]
for m,L in ev.iter_mints(str(replay),tok,stats):
 info=tok[m];ret=retained(info,L)
 if ret is None:audit['not_retained']+=1;continue
 if any(s<info['created']+HORIZON and e>info['created'] for s,e in outages):audit['outage_excluded']+=1;continue
 half='early' if info['created']<SPLIT else 'late';audit['eligible_'+half]+=1;t=info['created']+AGE
 RO=sorted(L,key=lambda z:((fl(z['recv_ms']) or fl(z['ts'])*1000),int(z['slot']),int(z['row_id'])));RT=[(fl(z['recv_ms']) or fl(z['ts'])*1000)/1000 for z in RO];k=bisect.bisect_right(RT,t)
 v=types.SimpleNamespace(t=t,created=info['created'],trades=ev.Prefix(RO,k));f=rc.features(v) if t>=ret else None;E=bool(f is not None and rc.eligible(f));size=None;veto=False
 if E:
  p=PC[m];assert p['feature_known']=='True' and p['cell']==rc.cell_of(f)
  knowncurve=[z for z in RO[:k] if rc.iscurve(z)];slot=min(int(z['slot']) for z in knowncurve);cr=rc.creator_of(m)
  size=sum((Decimal(z['sol']) for z in knowncurve if int(z['slot'])==slot and z['wallet']==cr and z['is_buy']=='1'),Decimal(0));assert size==Decimal(p['creator_buy_sol']) and slot==int(p['first_slot']);veto=size>=Decimal(5);assert veto==(p['veto']=='True')
 kept=E and not veto
 ctrl=run_eval(m,info,L,ret,E);cand=run_eval(m,info,L,ret,kept)
 if kept:assert ctrl==cand,(m,'candidate/control execution drift')
 for name,z,entered in [('control',ctrl,E),('candidate',cand,kept)]:
  z.update(spec=name,mint=m,half=half,created=info['created'],tier=info['tier'],eligible_E=E,kept=entered,cell=rc.cell_of(f) if E else None,creator_buy_sol=str(size) if size is not None else None,veto=veto if E else None);rows.append(z)
 if (audit['eligible_early']+audit['eligible_late'])%500==0:print('PROCESSED',dict(audit),flush=True)
assert stats['non_contiguous']==0
(out/'trade_ledger.json').write_text(json.dumps(rows));keys=sorted(set().union(*(z.keys() for z in rows)))
with (out/'ledger.csv').open('w',newline='') as fh:w=csv.DictWriter(fh,fieldnames=keys);w.writeheader();w.writerows(rows)
(out/'score_audit.json').write_text(json.dumps({'audit':dict(audit),'stats':{k:v for k,v in stats.items() if k!='_done'},'all_kept_control_results_identical':True,'features_recomputed_causally_equal':True},indent=2)+'\n')
