import pathlib,types,tempfile,contextlib,io,json,subprocess,hashlib
root=pathlib.Path(__file__).parent;p=root/'blind-eval-1.1/reports/blind/eval'
h=types.ModuleType('h');h.__file__=str(p/'test_evaluate.py');exec((p/'test_evaluate.py').read_text().split('# 1. basic:')[0],h.__dict__)
out={}
for v in ['blind-eval-1.0','blind-eval-1.1']:
 d=root/v/'reports/blind/eval';r=subprocess.run(['python','-I','test_evaluate.py'],cwd=d,capture_output=True,text=True);(root/(v+'-tests.log')).write_text(r.stdout+r.stderr);out[v]={'exit_code':r.returncode,'summary':r.stdout.splitlines()[-1],'sha256':hashlib.sha256((d/'evaluate.py').read_bytes()).hexdigest()}
with tempfile.TemporaryDirectory() as d:
 h.write(d,[h.curve_trade(i,'A',h.T0+i*10,5) for i in range(80)],[('A',h.T0,0),('MISSING',h.T0,1)])
 with contextlib.redirect_stdout(io.StringIO()):r=h.run(d,[h.rule(d,h.BUY60_HOLD)])
 out['retained_census_mint_without_rows']={'launches':r['launches_in_window'],'N_common':r['N_common'],'unknown':r['rules']['t']['by_size']['0.2']['unknown']}
with tempfile.TemporaryDirectory() as d:
 h.write(d,[h.curve_trade(i,'B',h.T0+i*10,0.1) for i in range(80)],[('B',h.T0,1)])
 text=h.BUY60_HOLD.replace('return True','return v.t < v.created + 5').replace('[60]','[1]')
 with contextlib.redirect_stdout(io.StringIO()):r=h.run(d,[h.rule(d,text)])
 out['tier_flag_no_finalisation_time']={'entry_at_age_1s_scored':r['rules']['t']['by_size']['0.2']['scored'],'note':'Finalisation time is neither loaded nor checked; tier alone admits entry.'}
# Intercept state valuation times, leaving the frozen source intact.
mod=types.SimpleNamespace(decide=lambda v:True,exit_signal=lambda p:False)
row={k:str(v) for k,v in h.curve_trade(1,'C',h.T0,20).items()};orig=h.ev.state_at;times=[]
def capture(*args):times.append(args[1]);return orig(*args)
h.ev.state_at=capture
r,_=h.ev.run_launch(mod,{'decision_offsets':[1],'horizon_s':300,'sizes':[0.2]},'C',{'created':h.T0,'tier':0},[row],{'main':[],'pool':[]},[],{},30)
h.ev.state_at=orig
out['fixed_hold_exit']={'landing_age_seconds':[t-h.T0 for t in times],'written_MIG300_exit_age_for_decision_at_1s':301.7,'actual_exit_age':times[-1]-h.T0}
(root/'blocker-reproductions.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
