# Four-group comparison + selling-hypothesis test on snapshot 3 (entry-snap-7nov-1154 @ e05e07da). Read-only. 7 Nov 2026 UK.
# Run: python3 -I groups.py <snapshot dir (unzipped)> <extra token_life dir (study100k inputs)>
import csv,sys,json,glob,collections,calendar,time,random,statistics as st
csv.field_size_limit(10**9); D=sys.argv[1]; TL=sys.argv[2]
U=lambda s:calendar.timegm(time.strptime(s,'%Y-%m-%d %H:%M:%S'))
F3=U('2026-11-06 20:00:00'); CUT=U('2026-11-07 11:54:21'); MAT=CUT-7200; SPLIT=U('2026-11-07 00:00:00')
P=print
def f(x):
  try: return float(x)
  except: return None
# ---- cohort: prospective independent 0.02, mature, earliest filled entry per mint
pos=[r for r in csv.DictReader(open(D+'/fd_positions.csv')) if r['status']=='closed' and r['i02_status']=='closed' and f(r['i02_r_frac']) is not None
     and F3<=f(r['ts_decision'])<=MAT]
allpos=pos
first={}
for r in sorted(pos,key=lambda r:(f(r['ts_decision']),r['vol_id'])): first.setdefault(r['mint'],r)
co=list(first.values())
P(f"COHORT: prospective independent-0.02 positions decided {time.strftime('%d %b %H:%M',time.gmtime(F3))} → {time.strftime('%d %b %H:%M',time.gmtime(MAT))} UTC (2-h mature), closed under both methods: {len(pos)} positions, {len(co)} mints (earliest filled entry per mint, vol_id tie-break).")
# ---- decision-time metrics from fd_watch.checks
W={}
for r in csv.DictReader(open(D+'/fd_watch.csv')):
  if r['checks'] in('','[]'): continue
  try: W[r['mint']]=({c['at']:c for c in json.loads(r['checks']) if 'net' in c}, r)
  except Exception: pass
def feats(p):
  w=W.get(p['mint'])
  if not w: return None
  ch,wr=w; age=f(p['decision_age_s']) or 60
  at=min(ch,key=lambda a:abs(a-age)) if ch else None
  if at is None or abs(at-age)>20: return None
  c=ch[at]; t=(c['buys']+c['sells']) or None; ts=(c['buySol']+c['sellSol']) or None
  x={'at':at,'sell_share_n':c['sells']/t if t else None,'sell_share_sol':c['sellSol']/ts if ts else None,'net':c['net'],'mcSol':c['mcSol'],'buyers':c['buyers'],
     'exited_frac':c['exited']/c['buyers'] if c['buyers'] else None,'holding_frac':c['holding']/c['buyers'] if c['buyers'] else None,'top10_pct':c['top10_pct'],'top1_pct':c['top1_pct'],
     'dev_sold_pct':c['dev_sold_pct'],'big':c['big'],'early_sol':c['early_sol'],'farm_sol_pct':c.get('farm_sol_pct'),'bundle_sold_pct':c.get('bundle_sold_pct'),
     'bundle_pct':f(wr['bundle_pct']),'funder_sol':f(wr['funder_sol']),'curve':1 if c['venue']=='pump.fun curve' else 0}
  c60=ch.get(60)
  if c60 and at>60:
    x['d_net']=c['net']-c60['net']; x['d_buyers']=c['buyers']-c60['buyers']; x['d_sells']=c['sells']-c60['sells']
    x['new_buyer_share']=(c['buyers']-c60['buyers'])/c['buyers'] if c['buyers'] else None
  return x
for p in co: p['_f']=feats(p)
P(f"  decision-check metrics found for {sum(p['_f'] is not None for p in co)} of {len(co)} mints")
# ---- post-exit path from token_life (union of exports)
life=collections.defaultdict(dict)
for fn in sorted(glob.glob(TL+'/token_life_*.csv'))+[D+'/token_life.csv']:
  for r in csv.DictReader(open(fn)):
    m=f(r['mc']); t=f(r['ts'])
    if m and t: life[r['mint']][int(r['cp'])]=(t,m)
def after_exit_max(p):
  L=life.get(p['mint']); ex=f(p['i02_exit_ts']) or f(p['ts_exit'])
  if not L or not ex: return None,None
  v=[(m,cp) for cp,(t,m) in L.items() if t>ex+5 and cp<=86400]
  return (max(v) if v else (None,None))
def mult(p):
  em=(f(p['fill_px_usd']) or 0)*1e9
  m,cp=after_exit_max(p)
  return (m/em if (m and em) else None), cp
# ---- groups
def grp(p):
  r=f(p['i02_r_frac']); hi=f(p['hi_x']) or 0
  if r>0: return 'G3 profited'
  if hi>=2: return 'G2 reached 2x+, still lost'
  if hi>=1.3: return 'G1b rose 1.3-2x, lost'
  return 'G1 little rise (<1.3x), lost'
G=collections.defaultdict(list)
for p in co: G[grp(p)].append(p)
def boot(v,n=2000,seed=7):
  rnd=random.Random(seed); m=[st.mean(rnd.choices(v,k=len(v))) for _ in range(n)]; m.sort(); return m[int(.025*n)],m[int(.975*n)]
P("\nFOUR GROUPS (independent 0.02 return; hi = the 0.2 position's recorded running high while held — not the coin's lifetime peak)")
for g in sorted(G):
  v=[f(p['i02_r_frac']) for p in G[g]]
  am=[mult(p)[0] for p in G[g]]; amv=[x for x in am if x]
  P(f"  {g:30s} mints {len(v):4d} ({100*len(v)/len(co):4.1f}%) · mean r {100*st.mean(v):+6.1f}% · median {100*st.median(v):+6.1f}% · sum of r {sum(v):+6.1f} stakes"
    f" · after-exit path known {len(amv)} · after-exit ≥2× entry {sum(x>=2 for x in amv)} · ≥3× {sum(x>=3 for x in amv)}")
tot=sum(f(p['i02_r_frac']) for p in co); P(f"  ALL {len(co)} mints: sum of r {tot:+.1f} stakes; mean {100*tot/len(co):+.1f}%")
P("  Loss budget: share of all losses (sum of negative r) by group:")
neg=sum(min(0,f(p['i02_r_frac'])) for p in co)
for g in sorted(G): P(f"    {g:30s} {100*sum(min(0,f(p['i02_r_frac'])) for p in G[g])/neg:5.1f}%")
# G2 detail: where the giveback happened
P("\nG2 DETAIL — reached ≥2× while held but the independent exit was ≤ 0 (each row: book · hi · i02 exit multiple · exit reason · minutes held · after-exit max ÷ entry (checkpoint)):")
for p in sorted(G['G2 reached 2x+, still lost'],key=lambda p:-f(p['hi_x'])):
  held=((f(p['i02_exit_ts']) or 0)-f(p['ts_decision']))/60; am,cp=mult(p)
  P(f"    {p['mint'][:8]}… {p['book']:6s} hi {f(p['hi_x']):5.2f} · i02 exit {f(p['i02_exit_x']) or 0:4.2f} · {p['i02_exit_reason']:6s} · held {held:5.1f} min · after-exit {('%.2f×'%am) if am else 'unknown'}{(' @cp'+str(cp)) if cp else ''} · hi02 {p.get('hi02_x')}")
# ---- feature comparison across groups (descriptive; DEV/TEST)
FE=['sell_share_n','sell_share_sol','net','mcSol','buyers','exited_frac','holding_frac','top10_pct','top1_pct','dev_sold_pct','big','early_sol','farm_sol_pct','bundle_pct','funder_sol','curve','d_net','d_buyers','d_sells','new_buyer_share']
P("\nFEATURES AT THE DECISION CHECK by group (median; n with value). Exploratory — no thresholds chosen here.")
P("  "+'feature'.ljust(16)+''.join(g[:10].ljust(18) for g in sorted(G)))
for k in FE:
  row=[]
  for g in sorted(G):
    v=[p['_f'][k] for p in G[g] if p['_f'] and p['_f'].get(k) is not None]
    row.append((f"{st.median(v):.3g} (n{len(v)})" if v else '-').ljust(18))
  P("  "+k.ljust(16)+''.join(row))
# Spearman rho of each feature with r, DEV vs TEST, BH across features
def rank(a):
  o=sorted(range(len(a)),key=lambda i:a[i]); r=[0]*len(a); i=0
  while i<len(a):
    j=i
    while j+1<len(a) and a[o[j+1]]==a[o[i]]: j+=1
    for k in range(i,j+1): r[o[k]]=(i+j)/2
    i=j+1
  return r
def rho(x,y):
  if len(x)<8: return None
  rx,ry=rank(x),rank(y); mx,my=st.mean(rx),st.mean(ry)
  num=sum((a-mx)*(b-my) for a,b in zip(rx,ry)); den=(sum((a-mx)**2 for a in rx)*sum((b-my)**2 for b in ry))**.5
  return num/den if den else None
P("\nRANK CORRELATION with independent return, DEV (decided before 7 Nov 00:00) vs TEST (after). Same sign + |rho| ≥ 0.1 in both = 'repeats'; otherwise not. 20 features → expect ~1 chance repeat.")
for k in FE:
  out=[]
  for lab,sel in (('DEV',lambda p:f(p['ts_decision'])<SPLIT),('TEST',lambda p:f(p['ts_decision'])>=SPLIT)):
    pr=[(p['_f'][k],f(p['i02_r_frac'])) for p in co if sel(p) and p['_f'] and p['_f'].get(k) is not None]
    rr=rho([a for a,b in pr],[b for a,b in pr]); out.append((rr,len(pr)))
  rep=all(r is not None and abs(r)>=0.1 for r,_ in out) and out[0][0]*out[1][0]>0
  P(f"  {k:16s} DEV rho {out[0][0] if out[0][0] is None else round(out[0][0],3)!s:>7} (n{out[0][1]}) · TEST rho {out[1][0] if out[1][0] is None else round(out[1][0],3)!s:>7} (n{out[1][1]}) {'REPEATS' if rep else ''}")
# ---- C: selling hypothesis (frozen threshold 0.50 by trade count, from the $100K study; NOT tuned here)
P("\nC — SELL SHARE ≥ 0.50 (sells ÷ all trades at the decision check; threshold frozen in reports/analysis/100k/study_v1_1/HYPOTHESES_FROZEN.md, not tuned here). Trading outcome = independent 0.02 return, earliest entry per mint.")
for lab,sel in (('DEV',lambda p:f(p['ts_decision'])<SPLIT),('TEST',lambda p:f(p['ts_decision'])>=SPLIT),('ALL',lambda p:True)):
  for side,cond in (('≥0.50',lambda x:x>=0.5),('<0.50',lambda x:x<0.5)):
    v=[f(p['i02_r_frac']) for p in co if sel(p) and p['_f'] and p['_f']['sell_share_n'] is not None and cond(p['_f']['sell_share_n'])]
    if v: lo,hi=boot(v); P(f"  {lab:4s} {side}: mints {len(v):4d} · mean {100*st.mean(v):+6.1f}% [{100*lo:+.1f}, {100*hi:+.1f}] · median {100*st.median(v):+6.1f}% · win {100*sum(x>0 for x in v)/len(v):3.0f}% · ≥2× hi {sum(1 for p in co if sel(p) and p['_f'] and p['_f']['sell_share_n'] is not None and cond(p['_f']['sell_share_n']) and (f(p['hi_x']) or 0)>=2)}")
P("\n  Per book (all positions, not first-per-mint): mean independent r with vs without the ≥0.50 coins")
for b in ('BL','E60','E90','E90C','BL27','A1'):
  rows=[p for p in allpos if p['book']==b]
  for p in rows:
    if '_f' not in p: p['_f']=feats(p)
  k=[f(p['i02_r_frac']) for p in rows if p['_f'] and p['_f']['sell_share_n'] is not None and p['_f']['sell_share_n']<0.5]
  d=[f(p['i02_r_frac']) for p in rows if p['_f'] and p['_f']['sell_share_n'] is not None and p['_f']['sell_share_n']>=0.5]
  a=[f(p['i02_r_frac']) for p in rows]
  if a: P(f"    {b:5s} all {len(a):4d} mean {100*st.mean(a):+6.1f}% | kept (<0.50) {len(k):4d} mean {100*st.mean(k) if k else float('nan'):+6.1f}% | removed (≥0.50) {len(d):3d} mean {100*st.mean(d) if d else float('nan'):+6.1f}%")
