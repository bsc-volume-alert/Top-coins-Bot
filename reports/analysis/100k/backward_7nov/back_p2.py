import pickle,sys,csv,glob,time,statistics as st,collections
D=sys.argv[1]; rows=pickle.load(open(D+'/rows.pkl','rb'))
def f(x):
  try: return float(x)
  except: return None
fw={}
for fn in sorted(glob.glob(D+'/fd_watch_*.csv')):
  for r in csv.DictReader(open(fn)): fw[r['mint']]=r
SPLIT=int(time.mktime(time.strptime('2026-11-06 00:00','%Y-%m-%d %H:%M')))-time.timezone
X=[]
for r in rows:
  L=r['L']; l=L.get(60); ts=f(l['ts']) if l else None
  if ts is None or ts-(r['c']+60)>15 or l['graduated'] in('1','true'): continue
  def win(maxcp):
    have=[cp for cp in L if 60<cp<=maxcp]
    if not have or max(have)<maxcp: return None   # window not observed to its end -> unknown
    return 1 if any((f(L[cp]['mc']) or 0)>=100000 or L[cp]['graduated'] in('1','true') for cp in have) else 0
  b,s=f(l['buys5m']) or 0,f(l['sells5m']) or 0
  w=fw.get(r['m'],{})
  X.append(dict(train=r['c']<SPLIT,w30=win(1800),w60=win(3600),w120=win(7200),run=1 if (r['peak']>=95000 or r['mig']) else 0,
    buys=b,ss=s/(b+s) if b+s else 1,n1=f(w.get('name_1h')),n24=f(w.get('name_24h')),fsol=f(w.get('funder_sol')),hc=w.get('high_count'),grp=w.get('grp') or '',seen=bool(w),
    m0=f(l['mc']),m5=f(L[300]['mc']) if 300 in L else None,m15=f(L[900]['mc']) if 900 in L else None))
print('coins',len(X))
for k in ('w30','w60','w120','run'):
  v=[x[k] for x in X if x[k] is not None]; print(f"{k}: observed {len(v)} unknown {len(X)-len(v)} reached {sum(v)} ({100*sum(v)/len(v):.2f}%)")
rule=lambda x: x['buys']>=99 and x['ss']<0.40
for k in ('w30','w60','w120'):
  for lab,S in (('train',[x for x in X if x['train']]),('test',[x for x in X if not x['train']])):
    a=[x for x in S if x[k] is not None]; sel=[x for x in a if rule(x)]
    print(f"  {k} {lab}: base {100*sum(x[k] for x in a)/len(a):.2f}% | rule picks {len(sel)} hit {100*sum(x[k] for x in sel)/max(1,len(sel)):.1f}% | catches {100*sum(x[k] for x in sel)/max(1,sum(x[k] for x in a)):.0f}% of them")
# narrative crowding: same-name coins in previous hour, among rule picks
for lab,S in (('train',[x for x in X if x['train'] and rule(x)]),('test',[x for x in X if not x['train'] and rule(x)])):
  for nm,fn in (('no same-name coin in last 1h',lambda x:x['n1']==0),('1-3 same-name in 1h',lambda x:x['n1'] is not None and 1<=x['n1']<=3),('4+ same-name in 1h',lambda x:x['n1'] is not None and x['n1']>=4),('not seen by launcher',lambda x:x['n1'] is None)):
    g=[x for x in S if fn(x)]; print(f"  {lab} rule picks, {nm}: {len(g)} coins, runner {100*sum(x['run'] for x in g)/max(1,len(g)):.1f}%")
# continuation: among rule picks, does the 5-min state separate those that reach 100k within 2h?
P=[x for x in X if rule(x) and x['w120'] is not None and x['m5'] and x['m0']]
for lab,S in (('train',[x for x in P if x['train']]),('test',[x for x in P if not x['train']])):
  up=[x for x in S if x['m5']>=x['m0']]; dn=[x for x in S if x['m5']<x['m0']]
  print(f"  {lab}: picks still at/above 60-s cap at 5 min: {len(up)} -> reach 100K in 2h {100*sum(x['w120'] for x in up)/max(1,len(up)):.0f}% | below: {len(dn)} -> {100*sum(x['w120'] for x in dn)/max(1,len(dn)):.0f}%")
