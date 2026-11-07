import pickle,sys,statistics as st,time
D=sys.argv[1]; rows=pickle.load(open(D+'/rows.pkl','rb'))
def f(x):
  try: return float(x)
  except: return None
SPLIT=int(time.mktime(time.strptime('2026-11-06 00:00','%Y-%m-%d %H:%M')))-time.timezone
out=[]
for r in rows:
  l=r['L'].get(60); ts=f(l['ts']) if l else None
  if ts is None or ts-(r['c']+60)>15 or l['graduated'] in('1','true'): continue
  b,s=f(l['buys5m']) or 0,f(l['sells5m']) or 0; ss=s/(b+s) if b+s else 1
  if not (b>=99 and ss<0.40): continue
  m0=f(l['mc'])
  if not m0: continue
  mult={cp:(f(r['L'][cp]['mc'])/m0 if cp in r['L'] and f(r['L'][cp]['mc']) else None) for cp in (300,900,1800,3600)}
  out.append(dict(run=r['peak']>=95000 or r['mig'],peakx=r['peak']/m0,train=r['c']<SPLIT,**{f'x{k}':v for k,v in mult.items()}))
for lab,S in (('train',[o for o in out if o['train']]),('test',[o for o in out if not o['train']])):
  print(lab,len(S),'coins')
  for k in ('x300','x900','x1800','x3600'):
    v=[o[k] for o in S if o[k] is not None]
    if v: print(f"  market cap at {k[1:]}s vs at 60s: median {st.median(v):.2f}x, share above 1.0x {100*sum(1 for a in v if a>1)/len(v):.0f}%, share above 2x {100*sum(1 for a in v if a>2)/len(v):.0f}%, n {len(v)}")
  pv=[o['peakx'] for o in S]; print(f"  peak vs 60s: median {st.median(pv):.2f}x, share reaching 2x {100*sum(1 for a in pv if a>=2)/len(pv):.0f}%, 5x {100*sum(1 for a in pv if a>=5)/len(pv):.0f}%")
