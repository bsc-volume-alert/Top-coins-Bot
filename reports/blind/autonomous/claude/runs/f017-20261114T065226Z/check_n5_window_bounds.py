import sys,os,csv,bisect,collections,importlib.util
spec=importlib.util.spec_from_file_location("ev",os.environ["F006P2_EVAL"]);ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev);fl=ev.fl
replay=sys.argv[1];rec={r["mint"]:r for r in csv.DictReader(open(sys.argv[2]))}
tok,_,_,_=ev.load(replay,1793950800,1794081600)
rcv=lambda r:(fl(r["recv_ms"])/1000 if fl(r["recv_ms"]) is not None else None);cur=lambda r:r["venue"] in ("","curve")
pend={m:float(r["N5_decision_t"]) for m,r in rec.items() if r["E"]=="True" and r["N5_known"]=="True" and r["N5_reason"]=="" }
early={};S=collections.defaultdict(list)
for m,L in ev.iter_mints(replay,tok,{"mints_streamed":0,"duplicates_removed":0,"non_contiguous":0,"_done":set()}):
    if m in pend: early[m]={a["wallet"] for a in L if cur(a) and a["is_buy"]=="1" and rcv(a) is not None and rcv(a)<=tok[m]["created"]+60}
wal=set().union(*early.values())
for m,L in ev.iter_mints(replay,tok,{"mints_streamed":0,"duplicates_removed":0,"non_contiguous":0,"_done":set()}):
    for a in L:
        if a["is_buy"]=="1" or a["wallet"] not in wal or rcv(a) is None: continue
        S[a["wallet"]].append((rcv(a),m,fl(a["sol"]) or 0,cur(a) or ev.state_ok(a)))
res=collections.Counter();bnd=[]
for m,D in pend.items():
    for name,lo in (("(D-5,D]",lambda x:D-5<x<=D),("[D-5,D)",lambda x:D-5<=x<D),("[D-5,D]",lambda x:D-5<=x<=D)):
        n=0;unp=0
        for w in early[m]:
            rows=[x for x in S[w] if lo(x[0]) and x[1]!=m];unp+=sum(1 for x in rows if not x[3]);n+=sum(x[2] for x in rows if x[3])>=1
        res[(name,"signal")]+= (n>=3 and unp==0); res[(name,"unknown")]+= (unp>0)
    for w in early[m]:
        for x in S[w]:
            if x[1]!=m and (x[0]==D-5 or x[0]==D): bnd.append((m[:8],w[:8],x[0]-D,x[2],x[3]))
print(dict(res));print("boundary rows:",bnd)
