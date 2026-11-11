import sys; sys.argv=['x','A','B_tr.pkl.gz','../inv/pkg','out_robust']
src=open('research.py').read().split("if __name__ == '__main__':")[0]; exec(src)
import statistics as st
WA,WB=build_A(),build_B(); out=[]; P=lambda *a:(out.append(' '.join(map(str,a))),print(*a,flush=True))
cur=lambda lo,hi:(lambda r,f: f is not None and lo<=r['mc5']<hi and f['venue_at_T']=='curve')
T25=('TRAIL',.25,None)
P("ROBUSTNESS — '5-min reading $15–100K and still on the curve', 25% trail (+ TP2×T25)")
for W,lab in ((WA,'A'),(WB,'B')):
    for nm,(lo,hi) in (('15-20K',(15e3,20e3)),('20-30K',(20e3,30e3)),('30K+',(30e3,100e3)),('all',(15e3,100e3))):
        e=entries_5m(W,cur(lo,hi)); P(lab,f"{nm:7s}",'T25',fmt(run_cell(W,e,T25)))
# execution sensitivity: entry 3 s / 10 s later; extra 1% cost per round trip
def cell_delay(W,ents,ex,d,extra=0.0):
    res=[]
    for r,T,f in ents:
        x=W.sim(r['mint'],T+d,ex); x['T']=T
        if 'ret' in x: x['ret']-=extra
        res.append(x)
    return score(res)
pooled=[]
for W,lab in ((WA,'A'),(WB,'B')):
    e=entries_5m(W,cur(15e3,100e3))
    for d,extra in ((0,0),(3,0),(10,0),(0,0.01),(3,0.02)): P(lab,f"delay+{d}s cost+{extra*100:.0f}%",'T25',fmt(cell_delay(W,e,T25,d,extra)))
    for r,T,f in e:
        x=W.sim(r['mint'],T,T25); x['T']=T; x['mint']=r['mint']; x['per']=lab; pooled.append(x)
P("POOLED A+B T25:",fmt(score(pooled)))
fl=sorted([x for x in pooled if x['status']!='UNAVAILABLE'],key=lambda x:-x['ret'])
P("top 8 contributors:",'; '.join(f"{x['per']} {x['mint'][:8]} {100*x['ret']:+.0f}% hi {x.get('hi') and round(x['hi'],1)}" for x in fl[:8]))
P("share of total from top 3: %.0f%%"%(100*sum(x['ret'] for x in fl[:3])/sum(x['ret'] for x in fl)))
un=[x for x in pooled if x['status']=='UNAVAILABLE']; import collections
P("unavailable:",len(un),dict(collections.Counter(x['why'] for x in un)))
open('out_robust.txt','w').write('\n'.join(out)+'\n')
