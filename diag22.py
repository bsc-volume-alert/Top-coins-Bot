import sys
sys.argv=['x','A','B_tr.pkl.gz','../inv/pkg','diag']
exec(open('c1_v2.py').read().rsplit("if __name__ == '__main__':",1)[0])
old=World.sim
exec(open('sim22.py').read())
new=World.sim
import statistics as st
WB=build_B(); DECB={r['mint']:r for r in csv.DictReader(gzip.open(os.path.join(PKG,'decisions_kpaper.csv.gz'),'rt'))}
d=[];moved=0;n=0;gaps=[]
for m,r in DECB.items():
    if not r['create_ts'] or int(r['create_ts'])<1794260923 or r['status'] not in('entered','out of band') or not r['mc5'] or not(15e3<=float(r['mc5'])<100e3) or m not in WB.TR: continue
    T=float(r['avail_ts']); a=old(WB,m,T,('TRAIL',.25,None)); b=new(WB,m,T,('TRAIL',.25,None))
    if 'ret' not in a or 'ret' not in b: continue
    n+=1; d.append(b['ret']-a['ret'])
    # swaps between trigger and landing
    tr=WB.TR[m]; 
    if a.get('exit_ts') and b.get('exit_ts'): gaps.append(b['exit_ts']-a['exit_ts'])
print('positions',n,'mean change in return %.2f pts'%(100*st.mean(d)),'median %.2f'%(100*st.median(d)),'worse>1pt',sum(x<-.01 for x in d),'better>1pt',sum(x>.01 for x in d))
print('exit time shift s: mean %.2f'%st.mean(gaps), 'nonzero',sum(1 for g in gaps if g))
# how many swaps typically fall in slot+1..+2 after a trigger-like random swap
import random;c=[]
for m in list(WB.TR)[:300]:
    tr=WB.TR[m]
    for i in range(0,len(tr),50):
        s0=tr[i][0]; c.append(sum(1 for x in tr[i+1:i+40] if s0< x[0]<=s0+2))
print('swaps landing in the next 2 slots after a swap: mean %.2f, share with >=1: %.0f%%'%(st.mean(c),100*sum(x>0 for x in c)/len(c)))
