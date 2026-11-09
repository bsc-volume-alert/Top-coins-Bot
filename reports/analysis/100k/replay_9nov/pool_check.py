import pickle,gzip,statistics as st,collections,sys
T=pickle.load(gzip.open('/tmp/claude-0/-home-claude/b095fca5-f260-503e-ace1-32c9da5e522a/scratchpad/cohort_trades.pkl.gz'))
# tuple: (slot, ev_idx, row_id, ts, venue, is_buy, sol, tokens, price_sol, vsol, vtok, pq_raw, pb_raw, px_adj)
dq_ratio=[];cp_ratio=[];px_ratio=[];dqs_ratio=[];n_pairs=0;pre=0;post=0
for m,tr in T.items():
  P=[x for x in tr if x[4]=='pumpswap' and x[11] and x[12]]
  for a,b in zip(P,P[1:]):
    if b[0]!=a[0] and b[0]-a[0]>3: continue   # only adjacent-ish slots to limit missing-trade gaps
    Qa,Ba=a[11]/1e9,a[12]/1e6; Qb,Bb=b[11]/1e9,b[12]/1e6
    base=a[7]; q=a[6]
    n_pairs+=1
    # pre-trade interpretation: Bb == Ba -/+ base
    exp_pre = Ba-base if a[5] else Ba+base
    if abs(Bb-exp_pre)<=max(1e-6*Ba,1): pre+=1
    else: continue
    dQ=Qb-Qa
    if a[5]: dq_ratio.append(dQ/q); cp_ratio.append(base/(Ba*q/(Qa+q)))
    else: dqs_ratio.append(-dQ/q)
    px_ratio.append(a[8]/(Qa/Ba))
print('pairs',n_pairs,'matching pre-trade base reserves',pre)
f=lambda v:'n %d median %.4f p10 %.4f p90 %.4f'%(len(v),st.median(v),st.quantiles(v,n=10)[0],st.quantiles(v,n=10)[-1])
print('BUY: (Q_next - Q) / quote_amount_in :',f(dq_ratio))
print('SELL: (Q - Q_next) / quote_amount_out:',f(dqs_ratio))
print('BUY: base_out / constant-product(pre Q,B, quote_amount_in):',f(cp_ratio))
print('price_sol / (Q/B) on these rows:',f(px_ratio))
# implied effective quote reserve Q' from each swap (constant product on pre-trade B), vs recorded Q
qb=[];qs=[];kd=[]; by_mint={}
for m,tr in T.items():
  P=[x for x in tr if x[4]=='pumpswap' and x[11] and x[12]]
  rs=[]
  for a in P:
    Q,B=a[11]/1e9,a[12]/1e6; b=a[7]; q=a[6]
    if b<=0 or q<=0.01: continue
    if a[5]: Qe=B*q/b-q; qb.append(Qe/Q)
    else: Qe=q*(B+b)/b; qs.append(Qe/Q)
    rs.append((Qe-Q))
  if len(rs)>30: by_mint[m]=st.median(rs)
print("BUY implied Q'/Q:",f(qb)); print("SELL implied Q'/Q:",f(qs))
v=list(by_mint.values()); print("per-mint median (Q'-Q) in SOL:",f(v))
# stability of the offset c within each pool: first 50 vs last 50 swaps, and spread
stab=[];spread=[]
for m,tr in T.items():
  P=[x for x in tr if x[4]=='pumpswap' and x[11] and x[12] and x[6]>0.05 and x[7]>0]
  if len(P)<200: continue
  cs=[]
  for a in P:
    Q,B=a[11]/1e9,a[12]/1e6; b=a[7]; q=a[6]
    cs.append((B*q/b-q-Q) if a[5] else (q*(B+b)/b-Q))
  stab.append(st.median(cs[-50:])-st.median(cs[:50])); qs=st.quantiles(cs,n=10); spread.append(qs[-1]-qs[0])
print('pools with >=200 swaps',len(stab)); print('change in c, last50 - first50 (SOL):',f(stab)); print('p90-p10 spread of c within pool (SOL):',f(spread))
