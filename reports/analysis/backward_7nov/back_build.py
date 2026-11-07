import csv,glob,sys,collections,time,json
D=sys.argv[1]
def f(x):
  try: return float(x)
  except: return None
life={}
for fn in sorted(glob.glob(D+'/token_life_*.csv')):
  for r in csv.DictReader(open(fn)): life[(r['mint'],int(r['cp']))]=r
tok={}
for fn in sorted(glob.glob(D+'/tracker_tokens_*.csv')):
  for r in csv.DictReader(open(fn)): tok[r['mint']]=r
reg={}
for fn in sorted(glob.glob(D+'/runner_registry_*.csv')):
  for r in csv.DictReader(open(fn)): reg[r['mint']]=r
cps=collections.Counter(cp for _,cp in life); print('life rows',len(life),'cps',sorted(cps.items())[:14])
bym=collections.defaultdict(dict)
for (m,cp),r in life.items(): bym[m][cp]=r
print('tokens',len(tok),'with life',sum(1 for m in tok if m in bym),'registry',len(reg))
ts=[int(r['create_ts']) for r in tok.values() if r['create_ts']]; print('token range',time.strftime('%d %H:%M',time.gmtime(min(ts))),time.strftime('%d %H:%M',time.gmtime(max(ts))))
# coverage of early cps by creation hour
cov=collections.Counter(); tot=collections.Counter()
for m,r in tok.items():
  h=time.strftime('%d %H',time.gmtime(int(r['create_ts']))); tot[h]+=1
  if 60 in bym.get(m,{}): cov[h]+=1
print('60s cp coverage by hour:',[(h,tot[h],cov[h]) for h in sorted(tot)][::4])
# ---- outcomes
END=int(time.mktime(time.strptime('2026-11-07 05:00','%Y-%m-%d %H:%M')))-time.timezone
rows=[]
for m,t in tok.items():
  c=int(t['create_ts'])
  if c>END: continue
  L=bym.get(m,{})
  if 60 not in L: continue
  mcs=[f(r['mc']) for r in L.values() if f(r['mc'])]
  pk=[x for x in [f(t['peak_mc_usd'])]+mcs if x]
  rg=reg.get(m); rp=f(rg['peak_24h_usd']) if rg else None
  bad=rp is not None and rp>5e7
  if rp and not bad: pk.append(rp)
  peak=max(pk) if pk else 0
  mig=(t['graduated'] in('1','true')) or (rg is not None and rg['migrated'] in('1','true')) or any(r['graduated'] in('1','true') for r in L.values())
  rows.append(dict(m=m,c=c,peak=peak,mig=mig,bad=bad,L=L,t=t))
print('labelled coins',len(rows))
b=lambda p:'95k+' if p>=95000 else '60-95k' if p>=60000 else '30-60k' if p>=30000 else '<30k'
print(collections.Counter(b(r['peak']) for r in rows), 'migrated',sum(r['mig'] for r in rows),'runner(95k+ or migrated)',sum(1 for r in rows if r['peak']>=95000 or r['mig']),'bad peaks dropped',sum(r['bad'] for r in rows))
# sanity: life mc vs tracker peak for a sample
s=[(f(r['t']['peak_mc_usd']),max(f(x['mc']) or 0 for x in r['L'].values())) for r in rows if f(r['t']['peak_mc_usd'])][:5]; print('tracker peak vs life max mc',s)
import pickle; pickle.dump(rows,open(D+'/rows.pkl','wb'))
