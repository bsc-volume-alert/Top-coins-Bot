# Reproduction script for claude_review_6nov.txt — run against snap_6nov_1830 (gunzip the csv.gz files into one folder A). Python 3, stdlib only.
import csv,collections,calendar,statistics as st,random,json,sys
A=sys.argv[1] if len(sys.argv)>1 else '.'
CUT=calendar.timegm((2026,11,6,14,22,20)); END=calendar.timegm((2026,11,6,18,23,11))
W={r['mint']:r for r in csv.DictReader(open(A+'/fd_watch.csv'))}
P=list(csv.DictReader(open(A+'/fd_positions.csv')))
fwd=[p for p in P if int(p['ts_decision'])>CUT]; mature=[p for p in fwd if int(p['ts_decision'])<=END-7200]
by={}
for p in sorted(mature,key=lambda p:int(p['ts_decision'])):
    if p['tokens_raw'] and p['mint'] not in by: by[p['mint']]=p
closed=[p for p in by.values() if p['status']=='closed' and p['r_frac_02']]; r=[float(p['r_frac_02']) for p in closed]
random.seed(1); ms=sorted(st.mean(random.choices(r,k=len(r))) for _ in range(2000))
print('1a mature forward mints',len(by),'win %.3f mean %.3f median %.3f CI %.3f..%.3f noBest %.3f'%(sum(x>0 for x in r)/len(r),st.mean(r),st.median(r),ms[50],ms[1949],(sum(r)-max(r))/(len(r)-1)))
D=collections.defaultdict(dict)
for d in csv.DictReader(open(A+'/fd_decisions.csv')): D[d['mint']][(d['rule'],int(d['at']))]=d
PM=collections.defaultdict(dict)
for p in P: PM[p['mint']][p['book']]=p
elig=[m for m,x in D.items() if ('E60',60) in x and x[('E60',60)]['reason'] in ('entered','already entered') and m in W and int(W[m]['created_ts'])>CUT and int(W[m]['created_ts'])+60<=END-7200]
bad=[m for m in elig if ('E90',90) in D[m] and int(D[m][('E90',90)]['ts'])<int(D[m][('E60',60)]['ts'])]; no90=[m for m in elig if ('E90',90) not in D[m]]
late=[m for m in elig if int(D[m][('E60',60)]['ts'])-int(W[m]['created_ts'])>75]
print('1b eligible',len(elig),'90-before-60',len(bad),'no-90',len(no90),'2i late-60 (>75 s)',len(late))
for arm in ('E60','E90','E90C'):
    rr=[float(PM[m][arm]['r_frac_02']) for m in elig if arm in PM[m] and PM[m][arm]['tokens_raw'] and PM[m][arm]['status']=='closed' and PM[m][arm]['r_frac_02']]
    print('1c',arm,'fills',len(rr),'per eligible %.3f per fill %.3f'%(sum(rr)/len(elig),st.mean(rr)))
coh=[m for m,x in D.items() if ('BL',60) in x and x[('BL',60)]['reason'] in ('entered','already entered') and m in W and int(W[m]['created_ts'])>CUT and int(W[m]['created_ts'])+60<=END-7200]
books=sorted(set(p['book'] for p in P))
print('1d/2iii common BL cohort',len(coh)); print('book fills abstain perEligible perFill win noBest')
for b in books:
    rr=[float(PM[m][b]['r_frac_02']) for m in coh if b in PM[m] and PM[m][b]['tokens_raw'] and PM[m][b]['status']=='closed' and PM[m][b]['r_frac_02']]
    if not rr: continue
    print('%-8s %3d %3d %+.3f %+.3f %d/%d %+.3f'%(b,len(rr),len(coh)-len(rr),sum(rr)/len(coh),st.mean(rr),sum(x>0 for x in rr),len(rr),((sum(rr)-max(rr))/(len(rr)-1)) if len(rr)>1 else 0))
g=collections.defaultdict(list)
for m,p in by.items():
    if p['status']=='closed' and p['r_frac_02']: g[W.get(m,{}).get('grp') or '-'].append(float(p['r_frac_02']))
for k,v in sorted(g.items(),key=lambda kv:-len(kv[1])): print('1d grp %-16s n %3d mean %+.3f median %+.3f'%(k,len(v),st.mean(v),st.median(v)))
sff='3nPBoqmsNVtQFbaP3dL77UsX6GSKuRuuKeuBi66Jpump'; sp=[p for p in P if p['mint']==sff]
print('1e 7FF positions',len(sp),'r02',sorted(set(p['r_frac_02'] for p in sp))); print('   checks',[(c['at'],c.get('net'),c.get('mcSol'),c.get('dev_sold_pct'),c.get('dev_buy'),c.get('dev_sell')) for c in json.loads(W[sff]['checks'])])
print('   trades_books venues',dict(collections.Counter(r['venue'] for r in csv.DictReader(open(A+'/trades_books.csv')))))
