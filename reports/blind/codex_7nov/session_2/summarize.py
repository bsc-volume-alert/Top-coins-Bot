import json
from pathlib import Path
import numpy as np
O=Path('/workspace/session_2');r=json.loads((O/'signals.json').read_text());out={}
for half in ['early','late']:
 rr=[x for x in r if x['half']==half];ends=[]
 for x in rr:ends.extend([(x['create_ts']+61,1),(x['create_ts']+120,-1)])
 n=peak=0
 for _,d in sorted(ends,key=lambda x:(x[0],x[1])):n+=d;peak=max(peak,n)
 out[half]={'peak_concurrent_shadow_positions':peak,'max_predecision_rows':max(x['rows_predecision'] for x in rr),'sizes':{}}
 for s in [.2,.02]:
  a=np.array([x['pnl_'+str(s)] for x in rr if x['shadow_state_valid']]);rng=np.random.default_rng(20261108);boot=np.array([rng.choice(a,len(a),True).mean() for _ in range(10000)])
  out[half]['sizes'][str(s)]={'valid_pairs':len(a),'net_sol':float(a.sum()),'mean_pnl_sol':float(a.mean()),'median_pnl_sol':float(np.median(a)),'mean_return':float(a.mean()/s),'median_return':float(np.median(a)/s),'win_rate':float((a>0).mean()),'loss_ge_half_rate':float((a<=-.5*s).mean()),'net_without_best_sol':float(a.sum()-a.max()),'mean_return_interval':list(np.quantile(boot/s,[.025,.975]))}
(O/'extra_metrics.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
