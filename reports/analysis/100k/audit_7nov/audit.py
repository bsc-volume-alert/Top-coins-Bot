# $100K coverage audit, 7 Nov 2026 — reports/analysis/100k. Inputs: launcher-data export (COMMIT file). UK = UTC.
import csv,sys,json,collections,statistics as st,time
A=sys.argv[1]
def f(x):
  try: return float(x)
  except: return None
def rd(n): return list(csv.DictReader(open(f'{A}/{n}.csv')))
cm=rd('coverage_mints'); cx={r['mint']:r for r in rd('coverage_crossings')}
reg={r['mint']:r for r in rd('runner_registry')}
cut=int(cm[0]['export_cutoff_ts']); P=[]; p=lambda *a: P.append(' '.join(str(x) for x in a))
mints=collections.defaultdict(dict); meta={}
for r in cm:
  meta[r['mint']]=r
  if r['venue']: mints[r['mint']][r['venue']]=r
T0=min(int(r['create_ts']) for r in cm); 
p(f"Window: launches created {time.strftime('%d %b %H:%M',time.gmtime(T0))} → {time.strftime('%d %b %H:%M',time.gmtime(cut))} UTC (=UK); export a3d7db4f")
p(f"Launches: {len(meta)} | with kept trades (retained): {sum(1 for m in meta if mints[m])} | no kept trades (not retained): {sum(1 for m in meta if not mints[m])}")
gr=[m for m in meta if meta[m]['graduated'] in('1','true')]
p(f"Migrated per tracker: {len(gr)} | of which retained: {sum(1 for m in gr if mints[m])} | with pool trades recorded: {sum(1 for m in gr if 'pumpswap' in ''.join(mints[m]))}")
# tracker capture outages (tracker process down or restarting), UTC
OUT=[(1793997600-0,1793997600+120),(1793998620,1793999160),(1794007980,1794008100),(1794009960,1794010080),(1794011190,1794011250)]  # 21:20-21:22 crash, 21:37-21:46 resize, 23:33 crash, 00:06 pm2, 00:26 deploy
# ---- crossings
X=list(cx.values())
p(f"\nRecorded $100K crossings in the export: {len(X)}")
p('  by venue of the crossing trade:',dict(collections.Counter(r['venue'] for r in X)))
p('  suspect price jump (>10x vs previous trade):',sum(r['suspect_jump']=='1' for r in X))
ages=sorted(f(r['sol_usd_age_s']) for r in X if f(r['sol_usd_age_s']) is not None); p(f"  SOL/USD sample age at crossing: median {ages[len(ages)//2]:.0f} s, max {ages[-1]:.0f} s, over 300 s: {sum(1 for a in ages if a>300)}")
single=sum(1 for r in X if r['n_trades_ge_100k']=='1'); p(f"  only ONE trade ever at ≥$100K (a single print): {single}")
# curve crossings plausibility: compare with the coin's curve max and migration
cc=[r for r in X if r['venue']=='curve']; p(f"  curve-venue crossings: {len(cc)} (pump.fun curve completes near ~$35–45K at this SOL/USD — a curve print ≥ $100K needs checking)")
mcs=sorted(f(r['mc_usd']) for r in X); p(f"  crossing market caps: median ${st.median(mcs):,.0f}, max ${mcs[-1]:,.0f}, over $10M: {sum(1 for m in mcs if m>1e7)}")
# timing relative to creation
d=[(int(r['ts'])-int(meta[r['mint']]['create_ts'])) for r in X if r['mint'] in meta]
p(f"  crossing time after creation: ≤30 min {sum(1 for x in d if x<=1800)}, ≤2 h {sum(1 for x in d if x<=7200)}, later {sum(1 for x in d if x>7200)}, before 60 s {sum(1 for x in d if x<=60)}")
# ---- registry vs verified, coin by coin (same window)
R=[m for m,r in reg.items() if m in meta and r['reached_mc'] in('1','true')]
both=[m for m in R if m in cx]; regonly=[m for m in R if m not in cx]; veronly=[m for m in cx if m in meta and m not in R]
p(f"\nRegistry '≥$100K detected' launches in the window: {len(R)} | also verified here: {len(both)} | registry only: {len(regonly)} | verified but not in registry: {len(veronly)}")
why=collections.Counter()
for m in regonly:
  if not mints[m]: why['not retained (no kept trades)']+=1
  elif meta[m]['graduated'] in('1','true') and not any('pumpswap' in v for v in mints[m]): why['migrated, no pool trades recorded']+=1
  else: why['retained, max observed < $100K at SOL/USD of the time']+=1
p('  registry-only explained by:',dict(why))
bad=[m for m in regonly if f(reg[m]['peak_24h_usd']) and f(reg[m]['peak_24h_usd'])>5e7]; p('  of which registry peak > $50M (decode error):',len(bad))
# ---- primary outcome categories, 2-h window, mature cohort only
mature=[m for m in meta if int(meta[m]['create_ts'])+7200<=cut]
cat=collections.Counter(); hi_usd=max(f(r['usd']) for r in rd('sol_usd'))
for m in mature:
  c=int(meta[m]['create_ts'])
  x=cx.get(m)
  if x and int(x['ts'])<=c+7200: cat['VERIFIED within 2 h' + (' (suspect jump)' if x['suspect_jump']=='1' else '')]+=1; continue
  if m in R and not (x and int(x['ts'])<=c+7200): cat['DETECTED only (registry)']+=1; continue
  v=mints[m]
  if not v: cat['UNKNOWN — not retained']+=1; continue
  if meta[m]['graduated'] in('1','true') and not any('pumpswap' in k for k in v): cat['UNKNOWN — migrated, no pool trades']+=1; continue
  if any(a<c+7200 and b>c for a,b in OUT): cat['UNKNOWN — tracker outage inside window']+=1; continue
  mx=max((f(r['max_price_sol']) or 0) for r in v.values())
  if mx*1e9*hi_usd<100000: cat['NEVER CROSSED (retained, covered, max < $100K even at the window\'s highest SOL/USD)']+=1
  else: cat['UNKNOWN — max near $100K but no verified crossing']+=1
p(f"\nPRIMARY OUTCOME, 2-h window, mature launches (created ≥ 2 h before the export cutoff): {len(mature)}")
for k,v in cat.most_common(): p(f"  {v:6d}  {k}")
p("\nLimits: 'retained' = the tracker kept trades (15-SOL screen or bundle tier-1); pool trades only since tracker 0.19.6 (6 Nov ~20:00 UK); 'never crossed' assumes no unlogged capture gap — feed_gaps.csv lists reconnects, the listed tracker outages are excluded, quiet stretches remain inactivity-or-gap. Crossing time = first OBSERVED trade ≥ $100K; the previous trade bounds it only where history between is complete.")
open(f'{A}/audit_out.txt','w').write('\n'.join(P)); print('\n'.join(P))
