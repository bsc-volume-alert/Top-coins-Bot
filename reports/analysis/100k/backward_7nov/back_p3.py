# 7 Nov 09:00 UK — corrected backward study (Codex review 08:55): outcome = first reaches $100K market cap within 2 h (migration reported separately);
# coins already >= $100K at or before the decision time excluded; three entry arms on the SAME 60-s shortlist; counts + Wilson 95% intervals; checkpoint
# market caps only (no executable fills, no costs) — a direction, not P&L. Shortlist rule frozen as found: buys >= 99 and sell transactions / all
# transactions < 0.40 in the first minute (tracker token_life cp=60, buys5m/sells5m counts).
import pickle,sys,time,math,statistics as st,collections
D=sys.argv[1]; rows=pickle.load(open(D+'/rows.pkl','rb'))
def f(x):
  try: return float(x)
  except: return None
def wil(k,n,z=1.96):
  if not n: return (0,0)
  p=k/n; d=1+z*z/n; c=(p+z*z/(2*n))/d; h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d; return (100*(c-h),100*(c+h))
SPLIT=int(time.mktime(time.strptime('2026-11-06 00:00','%Y-%m-%d %H:%M')))-time.timezone
T=100000
cnt=collections.Counter(); arms=collections.defaultdict(list)
for r in rows:
  L=r['L']; l=L.get(60); ts=f(l['ts']) if l else None
  if ts is None: cnt['no 60s cp']+=1; continue
  if ts-(r['c']+60)>15: cnt['60s cp late']+=1; continue
  b,s=f(l['buys5m']) or 0,f(l['sells5m']) or 0; ss=s/(b+s) if b+s else 1
  if not (b>=99 and ss<0.40): continue
  cnt['shortlist']+=1
  m60=f(l['mc'])
  if not m60: cnt['no 60s market cap']+=1; continue
  if l['graduated'] in('1','true') or (m60 or 0)>=T: cnt['already >=100K or migrated at 60s']+=1; continue
  # outcome within 2 h after creation, by checkpoints after the decision
  def reach(after):
    cps=[cp for cp in L if after<cp<=7200]
    if not cps or max(cps)<7200: return None
    return 1 if any((f(L[cp]['mc']) or 0)>=T for cp in cps) else 0
  def ret(entry_mc, after):
    out={}
    for cp in (900,1800,3600,7200):
      if cp>after and cp in L and f(L[cp]['mc']): out[cp]=f(L[cp]['mc'])/entry_mc
    return out
  half='train' if r['c']<SPLIT else 'test'
  # arm A: entry at 60 s
  arms[('A 60s',half)].append(dict(o=reach(60),r=ret(m60,60)))
  # arms B/C need the 5-min checkpoint, below the target at 5 min
  l5=L.get(300); m5=f(l5['mc']) if l5 else None; t5=f(l5['ts']) if l5 else None
  if m5 is None or t5 is None or t5-(r['c']+300)>30: cnt['no on-time 5-min cp']+=1; continue
  if m5>=T or l5['graduated'] in('1','true') or any((f(L[cp]['mc']) or 0)>=T for cp in L if 60<cp<300): cnt['>=100K before 5 min']+=1; continue
  arms[('B 5min all',half)].append(dict(o=reach(300),r=ret(m5,300)))
  if m5>=m60: arms[('C 5min held',half)].append(dict(o=reach(300),r=ret(m5,300)))
print('cohort accounting:',dict(cnt))
print(f"{'arm':14s} {'half':5s} | n  known  reached-100K-in-2h  rate [95% CI] | median mcap multiple from entry at 15m / 30m / 1h / 2h (n)")
for a in ('A 60s','B 5min all','C 5min held'):
  for h in ('train','test'):
    S=arms[(a,h)]; K=[x for x in S if x['o'] is not None]; k=sum(x['o'] for x in K); lo,hi=wil(k,len(K))
    med=[]
    for cp in (900,1800,3600,7200):
      v=[x['r'][cp] for x in S if cp in x['r']]; med.append(f"{st.median(v):.2f}x({len(v)})" if v else '-')
    print(f"{a:14s} {h:5s} | {len(S):4d} {len(K):4d} {k:4d}  {100*k/max(1,len(K)):5.1f}% [{lo:4.1f}-{hi:4.1f}] | {' / '.join(med)}")
