"""C015 pre-obstruction quotes versus L004 exits. No missing exit is imputed."""
import pathlib,json,csv,hashlib,importlib.util,collections,bisect,statistics,math
r=pathlib.Path(__file__).parent;c=r.parent/'c001-20261110T211226Z';lp=r.parent/'c012-lab-20261112T091226Z/trade_ledger.json';spec=importlib.util.spec_from_file_location('ev',c/'evaluate.py');ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
assert hashlib.sha256((c/'evaluate.py').read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86' and not ev.DEV_NO_EVIDENCE
checks=[]
for line in (c/'data/SHA256SUMS.txt').read_text().splitlines():
 want,name=line.split(maxsplit=1);got=hashlib.file_digest((c/'data'/name).open('rb'),'sha256').hexdigest();assert got==want;checks.append({'path':name,'sha256':got,'ok':True})
(r/'audit_checksums.json').write_text(json.dumps(checks,indent=2))
x=json.loads(lp.read_text());base={z['mint']:z for z in x['BASELINE']};candidate={z['mint']:z for z in x['L004']};selected={m for m in candidate if candidate[m]['status']=='scored' and base[m]['status']=='exit_uncertain'};assert len(selected)==22
peer=json.loads((r/'peer_source/codex_l004_only_in_claude.json').read_text());pm={z['mint']:z for z in peer['mints']};assert len(pm)==5 and set(pm)<=selected
tok,gaps,outages,meta=ev.load(str(c/'replay'),1793950800,1794081600);stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};rows=[];gaprows=[];peer_rows=[]
for m,L in ev.iter_mints(str(c/'replay'),{m:tok[m] for m in selected},stats):
 b=base[m];a=candidate[m];fill=b['fill_t'];exit_t=b['sell_t'];byid={z['row_id']:z for z in L};fs=byid[b['fill_row_id']];qty=ev.buy(fs,.2,55);assert qty==b['tokens']==a['tokens'];ss=byid[a['exit_row_id']];new_net=ev.sell(ss,qty,55)-.2-.0015;assert new_net==a['net_sol']
 RO=sorted(L,key=lambda z:(float(z['recv_ms']),int(z['slot']),int(z['row_id'])));hold=[z for z in RO if fill<float(z['recv_ms'])/1000<=exit_t];pool_seen=fs['venue'] not in ('','curve') or any(z['venue'] not in ('','curve') and ev.state_ok(z) for z in hold)
 relevant=[]
 for kind,gg in [('main',gaps['main']),('pool',gaps['pool'] if pool_seen else []),('outage',outages)]:
  for start,end in gg:
   if start<exit_t and end>fill:
    relevant.append({'mint':m,'kind':kind,'start':start,'end':end,'starts_before_fill':start<fill});gaprows.append(relevant[-1])
 obstacles=[(z['start'],'logged '+z['kind']+' gap') for z in relevant]
 invalid=[z for z in hold if not ev.state_ok(z)]
 if invalid:obstacles.append((float(invalid[0]['recv_ms'])/1000,'invalid received state'))
 ts=[float(z['ts']) for z in L];idx=bisect.bisect_right(ts,exit_t)-1;landing=L[idx] if idx>=0 else None
 if landing and exit_t-float(landing['ts'])>30:obstacles.append((float(landing['ts'])+30,'final stale-state tail'))
 if not obstacles:obstacles.append((exit_t,'invalid/unavailable landing without earlier received obstruction'))
 cutoff,kind=min(obstacles,key=lambda v:(v[0],v[1]));cutoff=min(cutoff,exit_t)
 validmarks=[]
 # Initial fill-state mark is allowed only if that state was causally received by the cutoff.
 ft=max(fill,float(fs['recv_ms'])/1000)
 if ft<=cutoff and ft-float(fs['ts'])<=30 and ev.state_ok(fs):validmarks.append((ft,ev.sell(fs,qty,55)-.0015,fs,'initial fill-state mark'))
 for z in hold:
  tr=float(z['recv_ms'])/1000
  if tr<=cutoff and ev.state_ok(z) and tr-float(z['ts'])<=30:validmarks.append((tr,ev.sell(z,qty,55)-.0015,z,'received post-fill mark'))
 mark=max(validmarks,key=lambda v:(v[0],int(v[2]['slot']),int(v[2]['row_id']))) if validmarks else None
 gfirst=min(relevant,key=lambda z:(z['start'],z['kind'])) if relevant else None
 rec={'mint':m,'half':b['half'],'baseline_reason':b['why'],'fill_t':fill,'fill_row_id':fs['row_id'],'tokens':qty,'baseline_modeled_trigger_t':b['trigger_t'],'baseline_modeled_exit_t':exit_t,'baseline_exit_row_id':b['exit_row_id'],'obstruction_t':cutoff,'obstruction_kind':kind,'logged_gap_count':len(relevant),'first_logged_gap_start':gfirst['start'] if gfirst else None,'first_logged_gap_end':gfirst['end'] if gfirst else None,'first_logged_gap_kind':gfirst['kind'] if gfirst else None,'last_mark_available':mark is not None,'last_mark_t':mark[0] if mark else None,'last_mark_row_id':mark[2]['row_id'] if mark else None,'last_mark_event_t':float(mark[2]['ts']) if mark else None,'last_mark_origin':mark[3] if mark else None,'last_mark_proceeds_sol':mark[1] if mark else None,'last_mark_pnl_sol':mark[1]-.2 if mark else None,'mark_age_at_obstruction_s':cutoff-float(mark[2]['ts']) if mark else None,'l004_trigger_t':a['trigger_t'],'l004_exit_t':a['sell_t'],'l004_exit_row_id':ss['row_id'],'l004_proceeds_sol':ev.sell(ss,qty,55)-.0015,'l004_net_sol':new_net,'l004_arithmetic_reproduced':True,'true_baseline_exit_net_sol':None,'in_peer_five':m in pm}
 if mark:rec['last_mark_minus_l004_exit_sol']=mark[1]-rec['l004_proceeds_sol']
 rows.append(rec)
 if m in pm:
  z=pm[m];pt=b['decision_t']+z['claude_control_hold_s'];j=bisect.bisect_right(ts,pt)-1;ps=L[j];pv=ev.sell(ps,qty,55)-.2-.0015;age=pt-float(ps['ts'])
  assert abs(pv-z['claude_control_net_sol'])<1e-12,(m,pv,z['claude_control_net_sol']);assert abs(age-z['claude_control_exit_state_age_s'])<1e-8;assert new_net==z['codex_l004_net_sol']
  peer_rows.append({'mint':m,'peer_modeled_exit_t':pt,'peer_exit_row_id':ps['row_id'],'peer_scenario_net_sol':pv,'peer_reported_net_sol':z['claude_control_net_sol'],'peer_arithmetic_reproduced':True,'l004_net_sol':new_net,'pre_obstruction_mark_pnl_sol':rec['last_mark_pnl_sol'],'first_gap_start':rec['first_logged_gap_start'],'first_gap_end':rec['first_logged_gap_end'],'true_baseline_exit_known':False})
assert len(rows)==22 and len(peer_rows)==5 and stats['non_contiguous']==0

def summary(rr):
 marked=[z for z in rr if z['last_mark_available']];d=[z['last_mark_minus_l004_exit_sol'] for z in marked]
 return {'positions':len(rr),'l004_exit_arithmetic_reproduced':sum(z['l004_arithmetic_reproduced'] for z in rr),'available_pre_obstruction_marks':len(marked),'unavailable_marks':len(rr)-len(marked),'marks_above_l004_exit':sum(z>1e-12 for z in d),'marks_below_l004_exit':sum(z<-1e-12 for z in d),'equal':sum(abs(z)<=1e-12 for z in d),'last_mark_proceeds_sum_sol':math.fsum(z['last_mark_proceeds_sol'] for z in marked),'last_mark_pnl_sum_sol':math.fsum(z['last_mark_pnl_sol'] for z in marked),'l004_proceeds_sum_on_marked_sol':math.fsum(z['l004_proceeds_sol'] for z in marked),'l004_net_sum_on_marked_sol':math.fsum(z['l004_net_sol'] for z in marked),'mark_minus_l004_proxy_total_sol':math.fsum(d),'l004_total_net_sol':math.fsum(z['l004_net_sol'] for z in rr),'baseline_reason_counts':dict(collections.Counter(z['baseline_reason'] for z in rr)),'obstruction_kind_counts':dict(collections.Counter(z['obstruction_kind'] for z in rr)),'true_baseline_outcomes_unavailable':len(rr)}
report={'task':'C015','protocol_commit':'88c7c23db92541bd9f566238f8899bcda8d56f9f','data_commit':'e67833121f1da0dc992c28fa26c5236a855c151a','source_c012_results_commit':'5024b9ef640b6e198c24851e1fc5f632001e525e','source_c012_local_ledger_sha256':hashlib.sha256(lp.read_bytes()).hexdigest(),'peer_source_commit':'fc6b05aa75162444776a93035b34a7ad24c77395','summary':{h:summary([z for z in rows if h=='all' or z['half']==h]) for h in ['early','late','all']},'peer_five':{'pre_mark_comparison':summary([z for z in rows if z['in_peer_five']]),'reported_scenario_arithmetic_reproduced':5,'peer_scenario_net_sum_sol':math.fsum(z['peer_scenario_net_sol'] for z in peer_rows),'l004_net_sum_sol':math.fsum(z['l004_net_sol'] for z in peer_rows),'peer_scenario_minus_l004_sol':math.fsum(z['peer_scenario_net_sol']-z['l004_net_sol'] for z in peer_rows)},'limitations':['Pre-obstruction quotes are marks, not actual missing exit proceeds or statistical bounds','Direction/size of actual paired-selection bias is unidentified','All22true baseline exits stay unknown; no zero/mark imputation','Peer5post-gap scenario arithmetic verified only, not a new whole-evaluator reproduction or real fill proof','Snapshot retention/capture/decoder uncertainty and independent nonpersistent own-impact assumptions remain','Counts are selected on outcome availability; not a full-population causal effect']}
(r/'marks_audit.json').write_text(json.dumps(report,indent=2));(r/'mark_records.json').write_text(json.dumps(rows,indent=2))
for name,rr in [('marks_ledger',sorted(rows,key=lambda z:z['mint'])),('all_gap_intervals',gaprows),('peer_five_marks',peer_rows)]:
 for i in range(0,len(rr),20):
  vv=rr[i:i+20]
  with (r/f'{name}_{i//20+1:03d}.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=sorted(set().union(*(z.keys() for z in vv))));w.writeheader();w.writerows(vv)
print(json.dumps(report,indent=2))
