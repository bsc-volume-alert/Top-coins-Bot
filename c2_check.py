import sys
sys.argv=['x','A','B_tr.pkl.gz','../inv/pkg','out_c2']
exec(open('c1_v2.py').read().rsplit("if __name__ == '__main__':",1)[0])
import collections
WA,WB=build_A(),build_B()
DECB={r['mint']:r for r in csv.DictReader(gzip.open(os.path.join(PKG,'decisions_kpaper.csv.gz'),'rt'))}
out=[];P=lambda *a:(out.append(' '.join(map(str,a))),print(*a,flush=True))
P("C2 check (proposal 11 Nov 14:48): 5-min reading $20,000–39,999 AND net SOL last 2 min ≤ 20 (missing → not eligible); sell half at 2× then 25% trail (+ second fixed fee), 2 h max")
pool=[]
for W,lab in ((WA,'A'),(WB,'B')):
    rec=collections.Counter(); xs=[]; xs25=[]
    if lab=='A': rows=[(r,r['decision_ts']) for r in W.COH]
    else:
        rows=[]
        for m,d in DECB.items():
            if not d['create_ts'] or int(d['create_ts'])<1794260923: continue
            if not d['mc5'] or not (20e3<=float(d['mc5'])<40e3): continue
            rec['decisions in $20–40K'] += 1
            if d['status'] not in ('entered','out of band'): rec['excluded: not live-eligible (late/unusable)']+=1; continue
            rows.append((dict(mint=m,create_ts=int(d['create_ts']),mc5=float(d['mc5'])),float(d['avail_ts'])))
    for r,T in rows:
        if not (20e3<=r['mc5']<40e3): continue
        rec['eligible in $20–40K']+=1
        if r['mint'] not in W.TR: rec['no stored trade history (net buying unknown)']+=1; continue
        f=W.features(r,T)
        if not f: rec['no swap received by the decision (net buying unknown)']+=1; continue
        if f['net_sol_2m']>20: rec['net 2 min > 20 SOL']+=1; continue
        rec['selected']+=1
        x=W.sim(r['mint'],T,('TP_TRAIL',.25,2.0)); x['T']=T; x['mint']=r['mint']; x['per']=lab
        if x['status']=='UNAVAILABLE': rec[f"unpriced ({x['why']})"]+=1; continue
        if (x.get('hi') or 0)>=2.0: x['ret']-=FIXED/SIZE
        rec['priced']+=1; xs.append(x)
        y=W.sim(r['mint'],T,('TRAIL',.25,None)); y['T']=T
        if 'ret' in y: xs25.append(y)
    P(f"\nReconciliation {lab}: "+'; '.join(f"{k} {v}" for k,v in rec.items()))
    for k,v in scenarios(xs).items(): P(f"  {lab} TP2×T25 {k:22s} "+summary(v))
    ci=boot_ci(xs); P(f"  {lab} 95% CI: "+(f"[{100*ci[0]:+.1f}, {100*ci[1]:+.1f}] ({ci[2]} blocks)" if ci else '–'))
    P(f"  {lab} plain T25 for comparison: "+summary([y['ret'] for y in xs25]))
    P(f"  {lab} venue mix: "+str(collections.Counter(x['venue'] for x in xs)))
    pool+=xs
P("\nPOOLED: "); [P(f"  {k:22s} "+summary(v)) for k,v in scenarios(pool).items()]
ci=boot_ci(pool); P("  95% CI: "+(f"[{100*ci[0]:+.1f}, {100*ci[1]:+.1f}]" if ci else '–'))
# real 100K-book fills that match C2 (B, $30–40K overlap): actual recorded results
rp=list(csv.DictReader(open('../inv/pkg/recon_positions.csv')))
fe={}
for x in rp:
    if x['book']=='100K2' and x['status']=='closed' and x['r_0.2']:
        m=x['mint']; d=DECB.get(m)
        if not d: continue
        r=dict(mint=m,create_ts=int(d['create_ts']),mc5=float(d['mc5'])); f=WB.features(r,float(d['avail_ts'])) if m in WB.TR else None
        fe[m]=(float(x['r_0.2']), None if not f else f['net_sol_2m'])
sel=[v for v,n in fe.values() if n is not None and n<=20]; unk=[v for v,n in fe.values() if n is None]
P(f"\nREAL 100K2 paper fills ($30–40K, 25% trail, actual chain fills) that also meet C2's net-buying condition: n={len(sel)} mean {100*st.mean(sel):+.1f}%; net buying unknown (no stored trades): n={len(unk)} mean {100*st.mean(unk) if unk else float('nan'):+.1f}%")
open('out_c2.txt','w').write('\n'.join(out)+'\n')
# same coins: simulator vs real chain fills (100K2, whole-position 25% trail), and the TP2×T25 simulation on them
pairs=[]
for x in rp:
    if x['book']!='100K2' or x['status']!='closed' or not x['r_0.2']: continue
    m=x['mint']; d=DECB.get(m)
    if not d or m not in WB.TR: continue
    T=float(d['avail_ts']); r=dict(mint=m,create_ts=int(d['create_ts']),mc5=float(d['mc5'])); f=WB.features(r,T)
    if not f or f['net_sol_2m']>20: continue
    s=WB.sim(m,T,('TRAIL',.25,None)); h=WB.sim(m,T,('TP_TRAIL',.25,2.0))
    if 'ret' in s and 'ret' in h:
        hr=h['ret']-(FIXED/SIZE if (h.get('hi') or 0)>=2 else 0); pairs.append((float(x['r_0.2']),s['ret'],hr))
P(f"\nSAME COINS (n={len(pairs)}): real chain-fill T25 mean {100*st.mean(p[0] for p in pairs):+.1f}% | simulated T25 {100*st.mean(p[1] for p in pairs):+.1f}% | simulated TP2×T25 {100*st.mean(p[2] for p in pairs):+.1f}% | median real−sim gap {100*st.median(p[0]-p[1] for p in pairs):+.1f} pts")
open('out_c2.txt','w').write('\n'.join(out)+'\n')
