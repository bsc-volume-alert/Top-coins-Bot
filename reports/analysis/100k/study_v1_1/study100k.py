# $100K backward study v1.1 — 7 Nov 2026 10:20 UK (corrections after Codex's reproduction 10:14: on-time check on EVERY checkpoint incl. 5/15 min and the multiples; 4x added; multiples limited to the 2-h window; NEG renamed NOCROSS_OBS; per-case table of the positives). v1 (reports/analysis/100k). Specification: owner/Codex 10:01 UK. Development data only; nothing here is a rule.
# Inputs (dir given as argv[1]): coverage_mints / coverage_crossings / sol_usd / runner_registry (export a3d7db4f), token_life_*, tracker_tokens_*, fd_watch_* (exports c36821d3,
# b971fcdf, 7add56e0, a3d7db4f). Outcome window: launches created 6 Nov 09:23 → 7 Nov 07:23 UTC (= UK) — the coverage export's 24 h, mature for 2 h.
import csv,glob,sys,collections,math,statistics as st,json,time
D=sys.argv[1]; OUT=[]; P=lambda *a: OUT.append(' '.join(str(x) for x in a))
def f(x):
  try: return float(x)
  except: return None
def wil(k,n,z=1.96):
  if not n: return (float('nan'),)*2
  p=k/n; d=1+z*z/n; c=(p+z*z/(2*n))/d; h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d; return (100*max(0,c-h),100*(c+h))
rd=lambda fn: csv.DictReader(open(fn))
cm=list(rd(f'{D}/coverage_mints.csv')); cx={r['mint']:r for r in rd(f'{D}/coverage_crossings.csv')}
CUT=int(cm[0]['export_cutoff_ts']); usd_hi=max(f(r['usd']) for r in rd(f'{D}/sol_usd.csv'))
meta={}; ven=collections.defaultdict(dict)
for r in cm:
  meta[r['mint']]=r
  if r['venue']: ven[r['mint']][r['venue']]=r
life=collections.defaultdict(dict)
for fn in sorted(glob.glob(f'{D}/token_life_*.csv')):
  for r in rd(fn): life[r['mint']][int(r['cp'])]=r
tok={}; fw={}
for fn in sorted(glob.glob(f'{D}/tracker_tokens_*.csv')):
  for r in rd(fn): tok[r['mint']]=r
for fn in sorted(glob.glob(f'{D}/fd_watch_*.csv')):
  for r in rd(fn): fw[r['mint']]=r
reg={r['mint']:r for r in rd(f'{D}/runner_registry.csv')}
OUTAGES=[(1793997600,1793997720),(1793998620,1793999160),(1794007980,1794008100),(1794009960,1794010080),(1794011190,1794011250)]
T_END=CUT-7200
pop=[m for m in meta if int(meta[m]['create_ts'])<=T_END]
P(f"POPULATION: launches created {time.strftime('%d %b %H:%M',time.gmtime(min(int(meta[m]['create_ts']) for m in pop)))} → {time.strftime('%d %b %H:%M',time.gmtime(T_END))} UTC (= UK), 2-h window complete: {len(pop)}")
# ---------- labels per decision time
CURVE_MAX_PX=(30*1.073e9/(1.073e9-793.1e6))/(1.073e9-793.1e6)
def suspect(m):
  x=cx.get(m)
  if not x: return False
  if x['suspect_jump']=='1': return True
  if x['venue']=='curve' and meta[m]['graduated'] not in('1','true'): return True
  # v1.1: standard pump.fun curve (30 SOL / 1.073B virtual start, 793.1M tokens sold at completion) tops out at ~4.11e-7 SOL per token
  # (≈ $37K at SOL $90, matching the observed completion level). A curve print above 1.1× that cannot be a standard-curve price → decode/curve-variant suspect.
  # Constants are the documented launch parameters, NOT yet read from on-chain config (README follow-up).
  if x['venue']=='curve' and (f(x['price_sol']) or 0)>CURVE_MAX_PX*1.1: return True   # curve print ≥ $100K without observed migration: suspect (not established error)
  return False
def label(m,dec_s,win_s=7200):
  c=int(meta[m]['create_ts']); x=cx.get(m)
  if x and suspect(m): return 'SUSPECT'
  if x:
    t=int(x['ts'])
    if t<=c+dec_s: return 'ALREADY'
    if t<=c+win_s: return 'POS'
  if m in reg and reg[m]['reached_mc'] in('1','true'): return 'DETECTED_ONLY'
  v=ven.get(m)
  if not v: return 'UNKNOWN_NOT_RETAINED'
  if meta[m]['graduated'] in('1','true') and not any('pumpswap' in k for k in v): return 'UNKNOWN_NO_POOL'
  if any(a<c+win_s and b>c for a,b in OUTAGES): return 'UNKNOWN_OUTAGE'
  mx=max((f(r['max_price_sol']) or 0) for r in v.values())
  if mx*1e9*usd_hi>=100000: return 'UNKNOWN_NEAR'
  return 'NOCROSS_OBS'   # = no crossing observed; coverage unverified (retained, no listed outage, max < $100K at the window's highest SOL/USD, 1e9 supply assumed)
P("\nLABELS AT EACH DECISION TIME (2-h outcome; NOCROSS_OBS = 'no crossing observed — coverage unverified', NOT a confirmed failure):")
for d in (60,300,900):
  c=collections.Counter(label(m,d) for m in pop); P(f"  decision {d:>3d} s: "+', '.join(f"{k} {v}" for k,v in c.most_common()))
for w,nm in ((1800,'30 min'),(3600,'1 h')):
  c=collections.Counter(label(m,60,w) for m in pop if int(meta[m]['create_ts'])<=CUT-w); P(f"  {nm} window, decision 60 s: POS {c['POS']} NOCROSS_OBS {c['NOCROSS_OBS']} ALREADY {c['ALREADY']} (24-h window: not adequately observed — coverage export holds 24 h of launches, outcomes after the export cutoff unseen)")
# ---------- features
def cpv(m,cp):
  r=life.get(m,{}).get(cp)
  if not r: return None
  c=int(meta[m]['create_ts']); ts=f(r['ts'])
  if ts is None or (r['src']!='exact' and ts-(c+cp)>15): return None
  return r
FEATS=['buys','sells','sell_share','buyers','buyers_total','mc','vol','holders','top10']
def fv(m,cp):
  r=cpv(m,cp)
  if not r: return None
  b,s=f(r['buys5m']) or 0,f(r['sells5m']) or 0
  return dict(buys=b,sells=s,sell_share=s/(b+s) if b+s else None,buyers=f(r['buyers5m']),buyers_total=f(r['buyers_total']),mc=f(r['mc']),vol=f(r['vol5m_usd']),holders=f(r['holders']),top10=f(r['top10_pct']))
STATIC=['bundle_pct','bundle_sol','bundle_wallets','dev_buy_sol','funder_sol','name_1h','name_24h']
def sv(m):
  t=tok.get(m,{}); w=fw.get(m,{})
  return dict(bundle_pct=f(t.get('bundle_pct')),bundle_sol=f(t.get('bundle_sol')),bundle_wallets=f(t.get('bundle_wallets')),dev_buy_sol=f(t.get('dev_buy_sol')),funder_sol=f(w.get('funder_sol')),name_1h=f(w.get('name_1h')),name_24h=f(w.get('name_24h')))
SPLIT=1793923200+86400  # 7 Nov 00:00 UTC
P("\nFIELD COVERAGE among POS+NOCROSS_OBS launches at decision 60 s (on-time or exact checkpoint):")
pn=[m for m in pop if label(m,60) in('POS','NOCROSS_OBS')]
for cp in (15,30,60,90,120):
  have=[m for m in pn if fv(m,cp)]; P(f"  {cp:>3d} s checkpoint valid: {len(have)}/{len(pn)} | holders field filled: {sum(1 for m in have if fv(m,cp)['holders'] is not None)} | top10 filled: {sum(1 for m in have if fv(m,cp)['top10'] is not None)}")
s0=collections.Counter(k for m in pn for k,v in sv(m).items() if v is not None); P('  static fields filled:',dict(s0),'of',len(pn))
P("  social links / image / replies: EMPTY for every launch (pump.fun API 403) — narrative cannot be assessed beyond name repetition.")
# ---------- feature table: for each decision cp, label POS vs NEG among launches not already above $100K
P("\nFEATURE TABLE — POS vs NOCROSS_OBS (2-h outcome; coins already ≥ $100K at the decision excluded). Thresholds fixed on DEV (created before 7 Nov 00:00 UTC) as the DEV 80th and 90th percentile; TEST = 7 Nov 00:00 → 07:23 UTC.")
P("  cp  feature        thr(dev)   DEV: n_sel pos rate% [95%] recall% FA/pos | TEST: n_sel pos rate% [95%] recall% FA/pos | base dev%/test%")
tried=[]
for cp in (15,30,60,90,120):
  rows=[(m,label(m,cp),fv(m,cp),sv(m)) for m in pop]
  rows=[(m,l,x,s) for m,l,x,s in rows if l in('POS','NOCROSS_OBS') and x]
  dev=[r for r in rows if int(meta[r[0]]['create_ts'])<SPLIT]; tst=[r for r in rows if int(meta[r[0]]['create_ts'])>=SPLIT]
  if not dev or not tst: continue
  bd=100*sum(r[1]=='POS' for r in dev)/len(dev); bt=100*sum(r[1]=='POS' for r in tst)/len(tst)
  for k in FEATS+STATIC:
    get=(lambda r,k=k: r[2].get(k)) if k in FEATS else (lambda r,k=k: r[3].get(k))
    vals=sorted(get(r) for r in dev if get(r) is not None)
    if len(vals)<200: continue
    for q in (0.8,0.9):
      thr=vals[int(q*len(vals))]; tried.append((cp,k,q,thr))
      def ev(S):
        sel=[r for r in S if get(r) is not None and get(r)>=thr]; pos=sum(r[1]=='POS' for r in sel); P_=sum(r[1]=='POS' for r in S)
        lo,hi=wil(pos,len(sel)); return len(sel),pos,(100*pos/len(sel) if sel else 0),lo,hi,(100*pos/P_ if P_ else 0),((len(sel)-pos)/pos if pos else float('inf'))
      a=ev(dev); b=ev(tst)
      if q==0.8 or k in('buys','sell_share','buyers','mc'):
        P(f"  {cp:>3d} {k:13s} ≥{thr:<9.4g} {a[0]:5d} {a[1]:3d} {a[2]:5.1f} [{a[3]:4.1f}-{a[4]:4.1f}] {a[5]:5.0f} {a[6]:5.0f} | {b[0]:5d} {b[1]:3d} {b[2]:5.1f} [{b[3]:4.1f}-{b[4]:4.1f}] {b[5]:5.0f} {b[6]:5.0f} | {bd:.2f}/{bt:.2f}")
P(f"\nTHRESHOLDS TRIED: {len(tried)} (every feature × checkpoint at the DEV 80th and 90th percentile; listed in thresholds_tried.json). With this many comparisons, roughly 1 in 20 ‘significant-looking’ differences is expected by chance.")
json.dump([dict(cp=a,feature=b,quantile=c,threshold=d) for a,b,c,d in tried],open(f'{D}/thresholds_tried.json','w'),indent=0)
# ---------- continuation at 5 and 15 minutes
P("\nCONTINUATION — decision at 5 min and 15 min; coins already ≥ $100K by then excluded; feature = market cap at the decision ÷ market cap at 60 s (both on-time).")
for d in (300,900):
  R=[]
  for m in pop:
    l=label(m,d)
    if l not in('POS','NOCROSS_OBS'): continue
    a=cpv(m,60); b=cpv(m,d)
    if not a or not b or not f(a['mc']) or not f(b['mc']): continue
    R.append((l,f(b['mc'])/f(a['mc']),int(meta[m]['create_ts'])<SPLIT))
  for lab,cond in (('held (≥1.0× the 60-s cap)',lambda r:r[1]>=1),('fell (<1.0×)',lambda r:r[1]<1)):
    for h,hn in ((True,'DEV'),(False,'TEST')):
      S=[r for r in R if r[2]==h and cond(r)]; k=sum(r[0]=='POS' for r in S); lo,hi=wil(k,len(S))
      P(f"  {d//60:>2d} min {lab:26s} {hn:4s}: {len(S):5d} coins, {k:3d} reached $100K later ({100*k/max(1,len(S)):.1f}% [{lo:.1f}-{hi:.1f}])")
# ---------- subsequent multiples from 60-s reference (checkpoint resolution: a LOWER BOUND on path highs; no costs)
P("\nSUBSEQUENT MULTIPLES from the 60-s market cap (max over later ON-TIME checkpoints 5/15/30/60/120 min, all inside the 2-h window — a lower bound on the true path high; checkpoints, not trades; no costs; NOT trading results):")
for grp in ('POS','NOCROSS_OBS'):
  M=[]
  for m in pop:
    if label(m,60)!=grp: continue
    a=cpv(m,60)
    if not a or not f(a['mc']): continue
    later=[f(cpv(m,cp)['mc']) for cp in (300,900,1800,3600,7200) if cpv(m,cp) and f(cpv(m,cp)['mc'])]  # v1.1: on-time checkpoints only (all ≤ 2 h)
    if later: M.append(max(later)/f(a['mc']))
  if M: P(f"  {grp}: n {len(M)} | ≥2× {100*sum(x>=2 for x in M)/len(M):.0f}% · ≥3× {100*sum(x>=3 for x in M)/len(M):.0f}% · ≥4× {100*sum(x>=4 for x in M)/len(M):.0f}% · ≥5× {100*sum(x>=5 for x in M)/len(M):.0f}% · ≥10× {100*sum(x>=10 for x in M)/len(M):.0f}% · median {st.median(M):.2f}×")
P("  POS uses the crossing as part of its own path (it reached $100K), so its multiples are partly by construction.")
P("\nAFTER-COST TRADING on identical entries: NOT DEFENSIBLE from these inputs — trade-level paths with reserves exist only for coins a book entered (trading study, chain_fill) and for the crossing trade itself here. Missing evidence: trade-level price paths after each decision for every POS/NOCROSS_OBS coin (now prospectively collected for pool trades by tracker 0.19.8/0.19.9; curve trades only for retained launches).")
# shared operators
cr=collections.Counter(tok.get(m,{}).get('creator') for m in pop if label(m,60)=='POS'); fu=collections.Counter(fw.get(m,{}).get('funder') for m in pop if label(m,60)=='POS' and fw.get(m,{}).get('funder'))
P(f"\nSHARED OPERATORS among POS (decision 60 s): creators with >1 POS: {sum(1 for k,v in cr.items() if k and v>1)} ; funders with >1 POS: {sum(1 for k,v in fu.items() if v>1)} (funder = attributed source; not proof of common control)")
P('\nPOSITIVE CASES (decision 60 s), one row each: mint · created UTC · crossing UTC (min after creation) · venue · mc at crossing · SOL/USD age s · previous trade (s before, venue) · trades ≥ $100K · migrated flag · pool rows in coverage')
for m in sorted([m for m in pop if label(m,60)=='POS'], key=lambda m:int(meta[m]['create_ts'])):
  x=cx[m]; c=int(meta[m]['create_ts']); t=int(x['ts']); pv=int(x['prev_ts']) if x['prev_ts'] else None
  P(f"  {m} · {time.strftime('%d %H:%M:%S',time.gmtime(c))} · {time.strftime('%d %H:%M:%S',time.gmtime(t))} ({(t-c)/60:.1f}) · {x['venue']} · ${f(x['mc_usd']):,.0f} · {x['sol_usd_age_s']} · {'-' if pv is None else t-pv} {x['prev_venue']} · {x['n_trades_ge_100k']} · {meta[m]['graduated']} · {'pool' if any('pumpswap' in k for k in ven.get(m,{})) else 'no pool rows'}")
# ---------- v1.1: qualify the NOCROSS_OBS cohort with the coverage evidence available
neg=[m for m in pop if label(m,60)=='NOCROSS_OBS']
def q(xs,ps=(50,90,99)):
  xs=sorted(xs); return ' / '.join(f"p{p} {xs[min(len(xs)-1,int(len(xs)*p/100))]:,.0f}" for p in ps) if xs else '-'
grad=sum(meta[m]['graduated'] in('1','true') for m in neg)
mxs=[max((f(r['max_price_sol']) or 0) for r in ven[m].values())*1e9*usd_hi for m in neg]
gaps=[max((f(r['max_gap_s']) or 0) for r in ven[m].values()) for m in neg]
span=[max((f(r['last_ts']) or 0) for r in ven[m].values())-int(meta[m]['create_ts']) for m in neg]
ntr=[sum(int(r['n_trades'] or 0) for r in ven[m].values()) for m in neg]
P(f"\nNOCROSS_OBS QUALIFICATION (decision 60 s, n {len(neg)}): what the coverage export can and cannot say about these 'no crossing observed' coins")
P(f"  migrated flag set: {grad} (all with pool rows — migrated-without-pool coins are UNKNOWN_NO_POOL)")
P(f"  highest observed market cap ($, at the window's highest SOL/USD): {q(mxs)}; ≥ $50K: {sum(x>=50000 for x in mxs)}; ≥ $75K: {sum(x>=75000 for x in mxs)}")
P(f"  trades recorded per coin: {q(ntr)}; longest gap between recorded trades (s): {q(gaps)}; gap > 300 s: {sum(g>300 for g in gaps)}; gap > 1800 s: {sum(g>1800 for g in gaps)}")
P(f"  last recorded trade, s after creation: {q(span)}; last trade within 10 min of creation: {sum(s<600 for s in span)} (consistent with a coin that died — or with collection stopping; this export cannot tell which)")
P("  NOT verifiable from these inputs: whether curve collection ran continuously for each coin (no per-coin subscription log), and whether any trade was missed between recorded trades. Hence 'coverage unverified'.")

open(f'{D}/study100k_out.txt','w').write('\n'.join(OUT)); print('\n'.join(OUT))
