import runpy,sys,statistics as st,collections
S='/tmp/claude-0/-home-claude/b095fca5-f260-503e-ace1-32c9da5e522a/scratchpad'
sys.argv=['x',S+'/cohort.json',S+'/cohort_trades.pkl.gz',S+'/gaps1,'+S+'/k100trades',S+'/audit_tmp','trade']
import io,contextlib
with contextlib.redirect_stdout(io.StringIO()): g=runpy.run_path('/home/claude/top-coins-bot/reports/analysis/100k/replay_9nov/replay.py')
COH,run,band,TR,state_at,spot,buy=g['COH'],g['run'],g['band'],g['TR'],g['state_at'],g['spot'],g['buy']
import math
rows=[r for r in COH if band(r['mc5'])==5]
V=collections.Counter(); out=[]
for r in rows:
  x=run(r,0.2)['T25']
  if x['status']!='FILLED': continue
  tr=TR[r['mint']]; tsl=[y[3] for y in tr]; land=math.floor(r['decision_ts']+1); _,s0=state_at(tr,tsl,land)
  V[s0[4]]+=1
  out.append((x['ret'],r['mint'][:8],r['label'],s0[4],round(spot(s0)*1e9*90),round(r['mc5']),int(land-r['create_ts']),int(x['exit_ts']-land),x['tags']))
print('entry venue',V)
for o in sorted(out,key=lambda o:-o[0])[:6]+sorted(out,key=lambda o:o[0])[:4]: print('ret %+.2f'%o[0],o[1:])
# sanity: compare entry spot mc (at SOL$90) vs token_life 5-min mc
d=[o[4]/o[5] for o in out if o[5]]; print('entry spot mc / 5-min mc: median %.2f p10 %.2f p90 %.2f'%(st.median(d),st.quantiles(d,n=10)[0],st.quantiles(d,n=10)[-1]))
# detail one trade path
r=[r for r in rows if r['mint'].startswith(sorted(out,key=lambda o:-o[0])[0][1])][0]
tr=TR[r['mint']]; land=math.floor(r['decision_ts']+1)
print('create',r['create_ts'],'land',land); 
for y in [y for y in tr if land-10<=y[3]<=land+120][:12]: print(y[3]-land,y[4],'buy' if y[5] else 'sell',round(y[6],3),'%.3e'%y[8],y[13])
print('\n--- 30-50K T25 and neighbours by time half / by entry venue / all bands >= $20K')
mid=sorted(r['decision_ts'] for r in COH)[len(COH)//2]
for e in ('T25','T40','TP2','H2T40'):
  for lab,sel in (('30-50K',lambda r:band(r['mc5'])==5),('20-50K',lambda r:band(r['mc5']) in (4,5)),('20-100K',lambda r:band(r['mc5']) in (4,5,6))):
    A=[];B=[];cur=[];pool=[]
    for r in COH:
      if not sel(r): continue
      x=run(r,0.2)[e]
      if x['status']=='UNAVAILABLE': continue
      v=x['ret'] if x['status']=='FILLED' else -1.0075
      (A if r['decision_ts']<mid else B).append(v); (cur if x.get('entry_venue')=='curve' else pool).append(v)
    f=lambda L:'n%3d %+6.1f%%'%(len(L),100*st.mean(L)) if L else 'n0'
    print(f"{e:6s} {lab:8s} early {f(A)} | late {f(B)} | curve-entry {f(cur)} | pool-entry {f(pool)}")
