import sys; sys.argv=['x','A','B_tr.pkl.gz','../inv/pkg','out_sanity']
exec(open('research.py').read().split("if __name__ == '__main__':")[0])
WA=build_A()
for lo,hi,tr in ((30e3,50e3,.25),(30e3,40e3,.25),(30e3,40e3,.20)):
    ents=[(r,r['decision_ts'],None) for r in WA.COH if lo<=r['mc5']<hi]
    print(lo,hi,tr,fmt(run_cell(WA,ents,('TRAIL',tr,None))))
