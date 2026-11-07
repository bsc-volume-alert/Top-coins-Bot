# Entry Features & Winners — evening read, 7 Nov 2026. Prospective independent 0.02 positions (fill-3 era), union of snapshot 3 + latest export.
import csv,sys,json,calendar,time,random,statistics as st,collections
csv.field_size_limit(10**9); D=sys.argv[1]; U=lambda s:calendar.timegm(time.strptime(s,'%Y-%m-%d %H:%M'))
f=lambda x: float(x) if x not in ('',None) else None
rows={}
for fn in ('fd_positions_snap3.csv','fd_positions.csv'):
  for r in csv.DictReader(open(f'{D}/{fn}')): rows[(r['vol_id'],r['book'])]=r   # latest wins
P=list(rows.values()); NOW=int(time.time()); MAT=NOW-7200-600; F3=U('2026-11-06 20:00')
ok=[r for r in P if r['status']=='closed' and r['i02_status']=='closed' and f(r['i02_r_frac']) is not None and F3<=f(r['ts_decision'])<=MAT]
print(f"positions in union {len(P)} · prospective closed (decided 6 Nov 20:00 → {time.strftime('%d %H:%M',time.gmtime(MAT))} UTC, 2-h mature) {len(ok)} · mints {len({r['mint'] for r in ok})}")
def boot(v,n=4000,seed=7):
  rnd=random.Random(seed); m=sorted(st.mean(rnd.choices(v,k=len(v))) for _ in range(n)); return m[int(.025*n)],m[int(.975*n)]
def summ(v,lab):
  if len(v)<3: print(f"  {lab:34s} n {len(v)}"); return
  lo,hi=boot(v); s=sorted(v)
  print(f"  {lab:34s} n {len(v):4d} · mean {100*st.mean(v):+6.1f}% [{100*lo:+.1f},{100*hi:+.1f}] · median {100*st.median(v):+6.1f}% · win {100*sum(x>0 for x in v)/len(v):3.0f}% · ≤−50% {100*sum(x<=-.5 for x in v)/len(v):3.0f}% · w/o best {100*(sum(v)-max(v))/(len(v)-1):+6.1f}%")
first={}
for r in sorted(ok,key=lambda r:(f(r['ts_decision']),r['vol_id'])): first.setdefault(r['mint'],r)
co=list(first.values())
print("\n1. ALL BOOKS, earliest entry per coin (independent 0.02 return, after costs)")
summ([f(r['i02_r_frac']) for r in co],'all coins')
print("   by 6-hour block of decision time (is anything changing?)")
blk=collections.defaultdict(list)
for r in co: blk[time.strftime('%d %H',time.gmtime(int(f(r['ts_decision'])//21600*21600)))].append(f(r['i02_r_frac']))
for k in sorted(blk): summ(blk[k],'  block '+k+':00 UTC')
print("\n2. EACH BOOK (all its positions)")
bb=collections.defaultdict(list)
for r in ok: bb[r['book']].append(f(r['i02_r_frac']))
for b,v in sorted(bb.items(),key=lambda x:-st.mean(x[1])): summ(v,b)
print("\n3. H4 MATCHED: same coins eligible for E60 (E60 vs E90 vs E90C, return per eligible coin; no entry = 0)")
by=collections.defaultdict(dict)
for r in ok: by[r['mint']][r['book']]=f(r['i02_r_frac'])
e60=[m for m in by if 'E60' in by[m]]
for b in ('E60','E90','E90C'):
  v=[by[m].get(b,0.0) for m in e60]; summ(v,f'{b} per eligible coin (n={len(e60)})')
print("\n4. ALREADY ON THE POOL AT THE CHECK vs STILL ON THE CURVE (first entry per coin)")
pool=[f(r['i02_r_frac']) for r in co if '"pool"' in (r['reserves_at_check'] or '')]; cur=[f(r['i02_r_frac']) for r in co if '"pool"' not in (r['reserves_at_check'] or '')]
summ(pool,'bought already on the pool'); summ(cur,'bought on the curve')
print("\n5. WHERE THE LOSSES COME FROM (first entry per coin; hi = high while held)")
G=collections.defaultdict(list)
for r in co:
  x=f(r['i02_r_frac']); hi=f(r['hi_x']) or 0
  G['profited' if x>0 else ('reached 2x+, lost' if hi>=2 else ('rose 1.3-2x, lost' if hi>=1.3 else 'never +30%, lost'))].append(x)
neg=sum(min(0,f(r['i02_r_frac'])) for r in co)
for k in ('never +30%, lost','rose 1.3-2x, lost','reached 2x+, lost','profited'):
  v=G[k]; print(f"  {k:20s} coins {len(v):4d} ({100*len(v)/len(co):4.1f}%) · mean {100*st.mean(v):+6.1f}% · share of all losses {100*sum(min(0,x) for x in v)/neg:5.1f}%")
