import sys
sys.argv=['x','A','B_tr.pkl.gz','../inv/pkg','x']
exec(open('c1_v2.py').read().rsplit("if __name__ == '__main__':", 1)[0])
import collections
WA,WB=build_A(),build_B()
TLA,TLB,CKB=tl300(os.path.join(A_DIR,'k100_token_life.csv.gz')),tl300(os.path.join(PKG,'token_life.csv.gz')),clock300(os.path.join(PKG,'token_cp_clock.csv.gz'))
DECB={r['mint']:r for r in csv.DictReader(gzip.open(os.path.join(PKG,'decisions_kpaper.csv.gz'),'rt'))}
def r3(W,m,c):
    tr=W.TR.get(m,[]); p60=[x[8] for x in tr if x[3]<=c+60]
    if not p60: return 'no p60'
    p=p60[-1]
    for x in tr:
        if x[3]<c+60 or x[4]!='curve': continue
        if x[3]>c+900: break
        if x[8]>=3*p and x[8]<=4.2e-7: return 'R3C before 5 min' if x[3]<c+300 else 'R3C 5–15 min'
    return 'no R3C trigger'
for W,lab in ((WA,'A'),(WB,'B')):
    cnt=collections.Counter()
    rows=[(r,r['decision_ts'],'trade') for r in W.COH if 15e3<=r['mc5']<100e3] if lab=='A' else [(dict(mint=m,create_ts=int(d['create_ts']),mc5=float(d['mc5'])),float(d['avail_ts']),d['src'] or 'trade') for m,d in DECB.items() if d['create_ts'] and int(d['create_ts'])>=1794260923 and d['status'] in ('entered','out of band') and d['mc5'] and 15e3<=float(d['mc5'])<100e3 and m in W.TR]
    for r,T,src in rows:
        v,_=venue_evidence(W,r['mint'],T,CKB.get(r['mint']) if lab=='B' else None,(TLB if lab=='B' else TLA).get(r['mint']),src)
        if v!='curve': continue
        cnt[r3(W,r['mint'],r['create_ts'])]+=1
    print(lab,dict(cnt))
