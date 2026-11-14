# ad-hoc check (counts only): N1 tie sensitivity and N5 window-boundary sensitivity on the 679 E launches
import sys,os,csv,bisect,collections,math,importlib.util
spec=importlib.util.spec_from_file_location("ev",os.environ["F006P2_EVAL"]);ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev);fl=ev.fl
replay=sys.argv[1];rec={r["mint"]:r for r in csv.DictReader(open(sys.argv[2]))}
tok,gaps,outages,meta=ev.load(replay,1793950800,1794081600)
rcv=lambda r:(fl(r["recv_ms"])/1000 if fl(r["recv_ms"]) is not None else None)
cur=lambda r:r["venue"] in ("","curve")
st={"mints_streamed":0,"duplicates_removed":0,"non_contiguous":0,"_done":set()}
tie_changes=0;tie_cands=0;n1known=0;boundary=0;n5pend={}
for m,L in ev.iter_mints(replay,tok,st):
    if m not in rec or rec[m]["E"]!="True": continue
    r=rec[m]; t=float(r["E_decision_t"])
    if r["N1_known"]=="True":
        n1known+=1;D=float(r["N1_decision_t"]);R=float(r["gross_retention_receipt_t"])
        KD=sorted([a for a in L if cur(a) and rcv(a) is not None and rcv(a)<=D],key=lambda a:(rcv(a),int(a["slot"]),int(a["row_id"])))
        first={}
        for a in KD: first.setdefault(a["wallet"],rcv(a))
        inits=[a for a in KD if a["is_buy"]=="1" and (fl(a["sol"]) or 0)>=2 and R<=rcv(a)<=D]
        strict=0;loose=0;cand=0
        for a in inits:
            ta=rcv(a);fs=set();fl_=set()
            for b in KD:
                if b["is_buy"]!="1" or (fl(b["sol"]) or 0)<.1 or b["wallet"]==a["wallet"] or not (ta<rcv(b)<=D): continue
                if first[b["wallet"]]>ta: fs.add(b["wallet"])
                if first[b["wallet"]]>=ta: fl_.add(b["wallet"])
                if first[b["wallet"]]==ta: cand+=1
            strict=max(strict,len(fs));loose=max(loose,len(fl_))
        if cand: tie_cands+=1
        if (strict>=3)!=(loose>=3): tie_changes+=1
    if r["N5_known"]=="True" and r["N5_decision_t"]!="": n5pend[m]=float(r["N5_decision_t"])
want=set()
for m,L in ev.iter_mints(replay,tok,{"mints_streamed":0,"duplicates_removed":0,"non_contiguous":0,"_done":set()}):
    if m in n5pend:
        D=n5pend[m]
        for a in L:
            if cur(a) and a["is_buy"]=="1" and rcv(a) is not None and rcv(a)<=tok[m]["created"]+60: want.add((m,a["wallet"]))
wal={w for _,w in want};Ds=n5pend
hits=0
for m,L in ev.iter_mints(replay,tok,{"mints_streamed":0,"duplicates_removed":0,"non_contiguous":0,"_done":set()}):
    for a in L:
        if a["is_buy"]=="1" or a["wallet"] not in wal or rcv(a) is None: continue
        for mm,D in Ds.items():
            if mm!=m and (mm,a["wallet"]) in want and (abs(rcv(a)-(D-5))<1e-9 or abs(rcv(a)-D)<1e-9): hits+=1
print({"N1_known_E":n1known,"E_with_a_tie_candidate":tie_cands,"E_whose_N1_signal_changes_if_ties_counted":tie_changes,"N5_sells_exactly_on_window_boundary":hits})
