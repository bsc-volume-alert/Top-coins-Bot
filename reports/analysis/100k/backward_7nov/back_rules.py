import pickle,sys
X=pickle.load(open(sys.argv[1]+'/X.pkl','rb'))
tr=[x for x in X if x['train']]; te=[x for x in X if not x['train']]
def ev(S,fn):
  sel=[x for x in S if fn(x)]; r=sum(x['run'] for x in sel); R=sum(x['run'] for x in S)
  return len(sel), r, (100*r/len(sel) if sel else 0), (100*r/R if R else 0), ((len(sel)-r)/r if r else float('inf'))
rules={
 'buys>=99 (top 10%)': lambda x: x['buys']>=99,
 'buys>=99 & sell share<0.45': lambda x: x['buys']>=99 and (x['sell_share'] or 1)<0.45,
 'buys>=99 & sell share<0.40': lambda x: x['buys']>=99 and (x['sell_share'] or 1)<0.40,
 'buyers>=35 & sell share<0.45': lambda x: (x['buyers'] or 0)>=35 and (x['sell_share'] or 1)<0.45,
 'buys>=99 & bundle%>=25': lambda x: x['buys']>=99 and (x['bundle_pct'] or 0)>=25,
 'buys>=150 & sell share<0.45': lambda x: x['buys']>=150 and (x['sell_share'] or 1)<0.45,
 'buys>=200': lambda x: x['buys']>=200,
}
print(f"{'rule':34s} | TRAIN: coins  runners  hit%  share-of-runners  failures-per-runner | TEST: same")
for k,fn in rules.items():
  a=ev(tr,fn); b=ev(te,fn)
  print(f"{k:34s} | {a[0]:6d} {a[1]:4d} {a[2]:5.1f}% {a[3]:5.1f}% {a[4]:5.1f} | {b[0]:6d} {b[1]:4d} {b[2]:5.1f}% {b[3]:5.1f}% {b[4]:5.1f}")
# quiet starters: runners with low activity at 60s
R=[x for x in X if x['run']]; q=[x for x in R if x['buys']<40]
print('runners total',len(R),'quiet at 60s (<40 buys):',len(q), '%.0f%%'%(100*len(q)/len(R)))
