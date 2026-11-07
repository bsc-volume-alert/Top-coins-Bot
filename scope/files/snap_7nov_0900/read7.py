# 7 Nov 09:00 UK forward read — per scope/files/forward_plan_6nov.txt. Development read, not a verdict.
import csv,json,sys,random,statistics as st,collections,time
R=sys.argv[1]; FWD=1793974940; ENTRY_END=1794034800
def f(x):
  try: return float(x)
  except: return None
def rd(n): return list(csv.DictReader(open(f'{R}/{n}.csv')))
vp={r['id']:r for r in rd('vol_paper')}
cf=rd('chain_fill')
fw={}
for r in rd('fd_watch_prev')+rd('fd_watch'): fw[r['mint']]=r
dec=rd('fd_decisions')
reg={r['mint']:r for r in rd('runner_registry')}
out=[]; P=lambda *a: out.append(' '.join(str(x) for x in a))
# ---- eligible = BL bar passed at the 60-s check, forward set
bl60=collections.defaultdict(list)
for d in dec:
  if d['rule']=='BL' and d['at']=='60': bl60[d['mint']].append(d)
elig=set(); unk=set()
for m,ds in bl60.items():
  c=f(ds[0]['created_ts']) or 0
  if c<=FWD: continue
  if min(int(x['ts']) for x in ds)>ENTRY_END: continue
  rs={x['reason'] for x in ds}; ps={x['passed'] for x in ds}
  if '1' in ps or any(r in ('entered','no price','failed') for r in rs): elig.add(m)
  elif any(r.startswith('data unavailable') or r.startswith('price unavailable') for r in rs): unk.add(m)
P('ELIGIBLE (BL bar at 60 s, created after 14:22:20 UTC, decided by 07:00 UK):',len(elig),'| eligibility unknown (data/price unavailable at 60 s):',len(unk))
# ---- positions by book on forward set, entries by 07:00
pos=collections.defaultdict(dict)
for r in cf:
  v=vp.get(r['vol_id']); 
  if not v: continue
  b=v['strat']; m=r['mint']; e=int(r['entry_ts'])
  if e>ENTRY_END: continue
  w=fw.get(m); c=f(w['created_ts']) if w else f(v.get('created_ts'))
  if not c or c<=FWD: continue
  st_='open'
  if r['s_exit_reason']=='skipped-dump': st_='skipped'
  elif r['s_fail_kind'] or (r['s_err'] and not r['s_tokens']): st_='fail'
  elif r['done']=='1' and f(r['s_r02']) is not None: st_='done'
  pos[b][m]=dict(st=st_,r=f(r['s_r02']),e=e,x=f(r['s_exit_ts']),hi=f(r['s_hi02']) or f(r['s_hi']),trig=f(r['s_trig_x']),ex=f(r['s_exit_x02']) or f(r['s_exit_x']),rt=r['s_res_trig'],re=r['s_res_exit'])
books=sorted(pos)
def boot(vals,n=3000,seed=1):
  random.seed(seed); M=[]
  for _ in range(n): s=[random.choice(vals) for _ in vals]; M.append(sum(s)/len(s))
  M.sort(); return M[int(.025*n)],M[int(.975*n)]
P('\nO1 PER ELIGIBLE LAUNCH (common denominator; r per 0.02 SOL position after the 0.0015 fee) and O2 PER FILLED TRADE')
P('book | eligible-mints entered | done skipped fail open | O1 mean r per eligible [best..worst band for fails] | O2 n mean median win% severe% | without best mint')
o1={}
for b in books:
  E=[m for m in elig if m in pos[b]]
  cnt=collections.Counter(pos[b][m]['st'] for m in E)
  rs={m:pos[b][m]['r'] for m in E if pos[b][m]['st']=='done'}
  per={m:(rs.get(m,0.0)) for m in elig}
  best=sum(per.values())/len(elig); worst=(sum(per.values())+cnt['fail']*(-1.075))/len(elig)
  o1[b]=per
  v=list(rs.values())
  if v:
    bm=max(rs,key=rs.get); nb=[x for m,x in rs.items() if m!=bm]
    P(f"{b:8s} | {len(E):4d} | {cnt['done']:4d} {cnt['skipped']:3d} {cnt['fail']:3d} {cnt['open']:3d} | {100*best:6.1f}% [{100*best:.1f}..{100*worst:.1f}] | {len(v):4d} {100*st.mean(v):6.1f}% {100*st.median(v):6.1f}% {100*sum(1 for x in v if x>0)/len(v):3.0f}% {100*sum(1 for x in v if x<=-0.5)/len(v):3.0f}% | {100*st.mean(nb) if nb else 0:6.1f}%")
  else: P(f"{b:8s} | {len(E):4d} | no completed trades on eligible mints")
# ---- H1 BL vs FDL paired by mint over eligible
def paired(a,b_,seed=2):
  ms=list(elig); random.seed(seed); D=[]
  for _ in range(3000):
    s=[random.choice(ms) for _ in ms]; D.append(sum(o1[a][m]-o1[b_][m] for m in s)/len(s))
  D.sort(); return sum(o1[a][m]-o1[b_][m] for m in ms)/len(ms),D[75],D[2925]
if 'BL' in o1 and 'FDL' in o1:
  d,lo,hi=paired('BL','FDL'); P(f"\nH1 BL − FDL, O1 per eligible launch, paired by mint (n={len(elig)}): {100*d:+.1f} points [95% {100*lo:+.1f}, {100*hi:+.1f}]")
# ---- H4 arms paired
for a,b_ in (('E90','E60'),('E90C','E60'),('E90C','E90')):
  if a in o1 and b_ in o1:
    d,lo,hi=paired(a,b_,7); P(f"H4 {a} − {b_}, O1 paired by mint (n={len(elig)}): {100*d:+.1f} points [95% {100*lo:+.1f}, {100*hi:+.1f}]")
# ---- H2 high-count among BL fills
if 'BL' in pos:
  g=collections.defaultdict(list)
  for m,p in pos['BL'].items():
    if p['st']=='done': g['high-count' if (fw.get(m,{}).get('grp') or '')=='high-count' else 'rest'].append((m,p['r']))
  for k,v in g.items():
    rr=[x for _,x in v]
    if rr:
      bm=max(v,key=lambda t:t[1])[0]; nb=[x for m,x in v if m!=bm]
      P(f"H2 BL fills, group {k}: n {len(rr)} mean {100*st.mean(rr):.1f}% median {100*st.median(rr):.1f}% | without best mint {100*st.mean(nb) if nb else 0:.1f}%")
  P('   grp values seen:',collections.Counter((fw.get(m,{}).get('grp') or '') for m in pos['BL']).most_common(6))
# ---- H3 2x-then-lost
c=0; gap=0; ex=[]
for b in books:
  for m,p in pos[b].items():
    if p['st']=='done' and (p['hi'] or 0)>=2 and p['r']<=0:
      c+=1
      if p['trig'] and p['ex'] and p['ex']/p['trig']<0.5: gap+=1; ex.append((b,m[:8],round(p['hi'],2),round(p['trig'],3),round(p['ex'],3)))
P(f"\nH3 completed trades that reached ≥2× then closed ≤0: {c} (rows across books); landing valuation < 50% of trigger valuation: {gap} — recorded gap only. Examples (book, mint, high, trigger x, exit x): {ex[:6]}")
# ---- O3 runner coverage (registry, forward window)
run=[r for r in reg.values() if r['create_ts'] and FWD<int(r['create_ts'])<=ENTRY_END-7200]
mig={r['mint'] for r in run if r['migrated'] in('1','true')}; mc={r['mint'] for r in run if r['reached_mc'] in('1','true')}
dm=collections.defaultdict(set)
for d in dec: dm[d['mint']].add((d['rule'],d['passed']))
P(f"\nO3 registry runners created 14:22 UTC 6 Nov → 05:00 UK 7 Nov: {len(run)} (migrated {len(mig)}, ≥$100K detected {len(mc)}; detected, not verified; 41-style >$50M decode errors not removed here)")
for b in ('BL','E60','FDL','FD','FDU120'):
  ch=sum(1 for r in run if any(x[0]==b for x in dm.get(r['mint'],()))); fl=sum(1 for r in run if r['mint'] in pos.get(b,{}))
  P(f"   {b}: checked {ch}, filled {fl} ({100*fl/max(1,len(run)):.0f}% of runners); of ≥$100K: filled {sum(1 for m in mc if m in pos.get(b,{}))}/{len(mc)}")
# ---- O4 exposure
P('\nO4 exposure at 0.02 SOL a position (max / mean concurrently open over the window):')
for b in ('BL','BL27','E60','E90','A1','FDL','FDU120'):
  if b not in pos: continue
  ev=[]
  for p in pos[b].values():
    if p['e']: ev.append((p['e'],1)); ev.append((p['x'] or ENTRY_END+7200,-1))
  ev.sort(); cur=0; mx=0; area=0; last=None
  for t,d in ev:
    if last is not None: area+=cur*(t-last)
    cur+=d; mx=max(mx,cur); last=t
  span=max(1,ev[-1][0]-ev[0][0]) if ev else 1
  P(f"   {b}: max {mx} open ({mx*0.02:.2f} SOL), mean {area/span:.1f}")
# ---- timing quality
P('\nTIMING QUALITY (forward decisions):')
for at in ('60','90','120'):
  D=[d for d in dec if d['at']==at and (f(d['created_ts']) or 0)>FWD and int(d['ts'])<=ENTRY_END]
  ages=sorted(int(d['decision_age_s']) for d in D if d['decision_age_s'])
  ot=sum(1 for d in D if d['timing']=='ontime')
  if ages: P(f"   {at}s: decisions {len(D)}, on time {100*ot/len(D):.0f}%, decision age median {ages[len(ages)//2]} s, p90 {ages[int(.9*len(ages))]} s")
s=json.load(open(f'{R}/status.json')); fd=s['fd']
P(f"   status at {time.strftime('%H:%M',time.gmtime(s['at']))} UK: launcher {s['ver']}, stalls since last restart {fd.get('stalls') or 0}, check timeouts {fd.get('checkTimeouts') or 0}, incomplete fetches {fd.get('incomplete') or 0}")
# ---- missed-runner ledger: runners entered by old FD-family books but by none of the new BL/E books
old={'FD','FDB','FDL','FD35','FDF','FDH','FDHF','FDX','FD120','FDU','FDU90','FDU120','FDLU','FDLU90','FDLU120','FDLUX','A1'}; new={'BL','BL27','E60','E90','E90C'}
led=[]
for r in run:
  m=r['mint']; ob=[b for b in old if m in pos.get(b,{})]; nb=[b for b in new if m in pos.get(b,{})]
  if ob and not nb:
    why=collections.Counter(d['reason'][:45] for d in dec if d['mint']==m and d['rule']=='BL')
    best=max((pos[b][m]['r'] for b in ob if pos[b][m]['r'] is not None),default=None)
    led.append((r['name'][:18],m[:8],'mig' if m in mig else '','≥100K' if m in mc else '',','.join(sorted(ob))[:40],why.most_common(2),None if best is None else round(100*best)))
P(f"\nMISSED-RUNNER LEDGER (forward runners the old books entered and none of BL/BL27/E60/E90/E90C did): {len(led)}")
for x in led: P('  ',x)
open(f'{R}/read7_out.txt','w').write('\n'.join(out)); print('\n'.join(out))
