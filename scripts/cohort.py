# Replay cohort per REPLAY_SPEC_v1 §2/§3 + addenda: strict cohort (created after 7 Nov 10:45 UK, retained, no non-SOL venue),
# on-time 5-min observation (availability = obs_ts else ts, <= create+315), label at 300 s not ALREADY/SUSPECT/UNKNOWN_NO_POOL.
import runpy,sys,json
K=sys.argv[1]; OUT=sys.argv[2]
sys.argv=['x',K]
g=runpy.run_path('/home/claude/top-coins-bot/reports/analysis/100k/confirm_8nov/confirm.py')
meta,cx,coh,label,f,ven,life=g['meta'],g['cx'],g['coh'],g['label'],g['f'],g['ven'],g['life']
FR=1794048300
nonsol={m for m in coh if any('/' in k for k in ven.get(m,{}))}
rows=[];late=0;nomc=0;excl={}
for m in coh:
  c=int(meta[m]['create_ts'])
  if c<=FR or m in nonsol: continue
  l=label(m,300)
  if l in('ALREADY','SUSPECT','UNKNOWN_NO_POOL'): excl[l]=excl.get(l,0)+1; continue
  r=life.get(m,{}).get(300)
  if not r: late+=1; continue
  av=f(r.get('obs_ts')) or f(r.get('ts'))
  if av is None or av>c+315: late+=1; continue
  mc=f(r['mc'])
  if not mc: nomc+=1; continue
  x=cx.get(m)
  rows.append(dict(mint=m,create_ts=c,decision_ts=av,mc5=mc,label=l,cross_ts=int(x['ts']) if x and l=='POS' else None,graduated=meta[m]['graduated']))
json.dump(dict(rows=rows,excluded=excl,late=late,no_mc=nomc),open(OUT,'w'))
print('cohort',len(rows),'excluded',excl,'late/no reading',late,'mc missing/0',nomc)
import collections; print(collections.Counter(r['label'] for r in rows))
