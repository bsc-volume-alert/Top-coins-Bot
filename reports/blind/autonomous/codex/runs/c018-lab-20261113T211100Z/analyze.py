"""Normalized C018 R4 accounting, independent record comparisons and uncertainty."""
import pathlib,json,csv,gzip,math,statistics,collections,random,hashlib
r=pathlib.Path(__file__).parent;rows=json.loads((r/'trade_ledger.json').read_text());E=[z for z in rows if z['spec']=='control' and z['eligible_E']];A=[z for z in rows if z['spec']=='candidate' and z['kept']];V=[z for z in E if z['veto']]
assert len(E)==679 and len(A)==605 and len(V)==74
def norm(z):
 if z['cat']=='abstain':return 'abstain'
 if (z.get('fill_state_age_s') or 0)>30:return 'unavailable_fill'
 if z['cat']=='unknown':return 'uncertain_exit' if (z.get('why') or '').startswith('exit') else 'unavailable_fill'
 if (z.get('exit_state_age_s') or 0)>30:return 'uncertain_exit'
 return 'resolved'
def vals(rr):return [z['net_sol'] for z in rr if norm(z)=='resolved']
def summary(rr,den=3638):
 c=collections.Counter(norm(z) for z in rr);x=sorted(vals(rr));res=[z for z in rr if norm(z)=='resolved'];attempted=sum(c.values())-c['abstain'];events=[]
 for z in rr:
  if norm(z) in ('resolved','uncertain_exit'):
   start=z['entry_t']+1;end=z.get('t_sell') or z['entry_t']+7200;events.extend([(start,1),(end,-1)])
 active=peak=0
 for _,d in sorted(events):active+=d;peak=max(peak,active)
 return {'attempted':attempted,'filled_after_30s_screen':c['resolved']+c['uncertain_exit'],'unavailable_fill':c['unavailable_fill'],'uncertain_exits':c['uncertain_exit'],'resolved':c['resolved'],'unknown_total':c['unavailable_fill']+c['uncertain_exit'],'total_net_sol_resolved':math.fsum(x),'net_sol_per_eligible_launch_observed':math.fsum(x)/den,'eligible_denominator':den,'mean_sol':statistics.mean(x) if x else None,'median_sol':statistics.median(x) if x else None,'mean_ROI':statistics.mean(x)/.2 if x else None,'median_ROI':statistics.median(x)/.2 if x else None,'win_rate':sum(v>0 for v in x)/len(x) if x else None,'loss_gt50_share':sum(v<-.1 for v in x)/len(x) if x else None,'without_best1_sol':math.fsum(x[:-1]) if x else None,'without_best3_sol':math.fsum(x[:-3]) if len(x)>3 else None,'worst_sol':x[0] if x else None,'severe_loss_count':sum(v<-.1 for v in x),'raw_frozen_scored':sum(z['cat']=='scored' for z in rr),'raw_frozen_total_sol':math.fsum(z['net_sol'] for z in rr if z['cat']=='scored'),'stale_fill_reclassified':sum(z['cat']=='scored' and (z.get('fill_state_age_s') or 0)>30 for z in rr),'stale_exit_reclassified':sum(z['cat']=='scored' and (z.get('fill_state_age_s') or 0)<=30 and (z.get('exit_state_age_s') or 0)>30 for z in rr),'median_resolved_hold_s':statistics.median(z['hold_s'] for z in res) if res else None,'peak_modeled_stake_SOL':peak*.2,'modeled_stake_seconds':math.fsum(max(0,(z.get('t_sell') or z['entry_t']+7200)-(z['entry_t']+1))*.2 for z in rr if norm(z) in ('resolved','uncertain_exit')),'unknown_why':dict(collections.Counter(('stale fill >30s' if (z.get('fill_state_age_s') or 0)>30 else 'stale exit >30s' if z['cat']=='scored' else z.get('why')) for z in rr if norm(z) in ('unavailable_fill','uncertain_exit')))}
def difference(a,b,seed=20261113):
 x,y=vals(a),vals(b);ok=len(x)>=30 and len(y)>=30
 def ci(x,y):
  rng=random.Random(seed);ds=sorted(math.fsum(rng.choices(x,k=len(x)))/len(x)-math.fsum(rng.choices(y,k=len(y)))/len(y) for _ in range(10000));return [ds[250],ds[9750]]
 return {'kept_resolved':len(x),'removed_resolved':len(y),'has_30_each':ok,'mean_kept_minus_removed_sol':statistics.mean(x)-statistics.mean(y) if x and y else None,'mean_difference_iid95':ci(x,y) if ok else None,'deep_loss_share_kept_minus_removed':sum(v<-.1 for v in x)/len(x)-sum(v<-.1 for v in y)/len(y) if x and y else None,'deep_loss_difference_iid95':ci([float(v<-.1) for v in x],[float(v<-.1) for v in y]) if ok else None,'uncertainty':'Exploratory iid95 intervals; no independence across time/operators, no multiple-search-adjusted confirmation; <30 each -> inconclusive'}
summaries={};groups={'control':E,'candidate':A,'removed':V}
for name,rr in groups.items():
 summaries[name]={'all':summary(rr),'by_half':{h:summary([z for z in rr if z['half']==h],1593 if h=='early' else 2045) for h in ['early','late']},'by_cell':{h:summary([z for z in rr if z['cell']==h]) for h in ['A','B','C']}}
base={z['mint']:z for z in E};candidate={z['mint']:z for z in A};paired=[m for m,z in candidate.items() if norm(z)==norm(base[m])=='resolved']
for m in candidate:
 assert {k:v for k,v in candidate[m].items() if k not in ('spec',)}=={k:v for k,v in base[m].items() if k not in ('spec',)},m
pair={'both_resolved':len(paired),'candidate_sol':math.fsum(candidate[m]['net_sol'] for m in paired),'baseline_same_mints_sol':math.fsum(base[m]['net_sol'] for m in paired),'difference_sol':0.0,'candidate_only_resolved':0,'control_only_resolved':sum(norm(z)=='resolved' and m not in candidate for m,z in base.items()),'all_kept_records_identical':True,'R63':'True baseline exit on candidate-only launches would be unknown; last usable marks do not identify its sign. Candidate-only count is zero here.'}
# Independent original peer control record comparison (not a report-as-reproduction).
with gzip.open(r/'peer_f014/ledger.csv.gz','rt') as f:peer={z['mint']:z for z in csv.DictReader(f) if z['spec']=='control'}
allctrl={z['mint']:z for z in rows if z['spec']=='control'};assert set(peer)==set(allctrl)
compared=0
for m,z in allctrl.items():
 p=peer[m]
 for k in ['cat','why','cell','entry_t','entry_age_s','fill_state_age_s','trigger_t','t_sell','hold_s','exit_state_age_s','net_sol','ret','exit','exit_kind','fill_venue','exit_venue']:
  a=z.get(k);b=p.get(k)
  if a is None:assert b in ('',None),(m,k,a,b)
  elif isinstance(a,(float,int)):assert b not in ('',None) and abs(float(a)-float(b))<=1e-12,(m,k,a,b)
  else:assert str(a)==b,(m,k,a,b)
  compared+=1
 assert str(z['eligible_E'])==p['eligible_E']
assert summaries['control']['all']['resolved']==419 and abs(summaries['control']['all']['total_net_sol_resolved']+10.011571773352646)<1e-12
comparison=difference(A,V)
pt= comparison['mean_difference_iid95'];ls=comparison['deep_loss_difference_iid95']
verdict='inconclusive'
if comparison['has_30_each']:
 if pt[0]>0 and ls[1]<0:verdict='promising'
 elif comparison['mean_kept_minus_removed_sol']>0 and comparison['deep_loss_share_kept_minus_removed']<0 and (pt[0]>0 or ls[1]<0):verdict='weak'
 elif comparison['mean_kept_minus_removed_sol']<=0 and comparison['deep_loss_share_kept_minus_removed']>=0:verdict='failed'
o={'experiment':'CDEX-L010','threshold_SOL':5,'direction':'skip >=5SOL','new_candidates':1,'specs_with_baseline':2,'prechecks':1,'variants_tried':1,'data_commit':'e67833121f1da0dc992c28fa26c5236a855c151a','definitions_commit':'64158505d3ac4e081598ea55d97234b6a376ad8d','count_published_commit':'58430ca2bac1c9c3c3382445c8f97d79beb5936d','protocol_count_commit':'02dc18bb26e5c79eee84c01a530f2099bc2227ba','summaries':summaries,'paired_R11':pair,'kept_removed_difference':comparison,'by_half_difference':{h:difference([z for z in A if z['half']==h],[z for z in V if z['half']==h]) for h in ['early','late']},'by_cell_difference':{h:difference([z for z in A if z['cell']==h],[z for z in V if z['cell']==h]) for h in ['A','B','C']},'peer_control_records':len(peer),'peer_control_fields_equal':compared,'peer_control_eligibility_flags_equal':len(peer),'peer_commit':'a27c504dfe240fecf132123bcfc5c18cb2dd4091','verdict':verdict,'scope':'Not profitable on resolved outcomes; full total unknown; benefit exploratory and support limits explicit','portfolio':'Independent fixed-size positions,unlimited capital,no persistent own impact; exposure of unknowns may last longer than modeled horizon','s1_window_failure':'First S1 invocation wrong dates,terminated/excluded; corrected exact registered window only','unavailable_outcomes_are_not_losses_or_zero':True}
o['scenario']={'stake_SOL':.2,'curve_fee_bps':125,'pool_fee_bps':55,'fixed_cost_SOL':.0015,'buy_delay_s':1,'sell_delay_s':.7,'max_hold_s':7200,'max_landing_state_age_s':30,'trail_fraction_net_proceeds':.30,'partial_sales':False,'initial_high':'first valid received post-fill state; original E control'}
o['profitability_verdict']='No profitable rule supported; resolved total negative in both halves and all cells; full unknown-outcome total unavailable'
(r/'results.json').write_text(json.dumps(o,indent=2)+'\n')
for name,rr in groups.items():
 with (r/('trades_'+name+'.csv')).open('w',newline='') as f:
  keys=sorted(set().union(*(z.keys() for z in rr)));w=csv.DictWriter(f,fieldnames=['normalized_status']+keys);w.writeheader();w.writerows({'normalized_status':norm(z),**z} for z in rr)
print(json.dumps({'all':{name:summaries[name]['all'] for name in groups},'comparison':comparison,'paired':pair,'peer_fields_equal':compared,'verdict':verdict},indent=2),flush=True)
