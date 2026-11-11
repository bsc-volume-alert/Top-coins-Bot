import sys, os, csv, collections, math
sys.argv=['x','A','B_tr.pkl.gz','../inv/pkg','x']
exec(open('research.py').read().split("if __name__ == '__main__':")[0])
O='gemini'; os.makedirs(O,exist_ok=True)
WA,WB=build_A(),build_B()
EX=[('TRAIL',.15,None),('TRAIL',.25,None),('TRAIL',.40,None),('TP_TRAIL',.25,2.0),('TIME',900,None),('TIME',3600,None)]
def coins(W,per,f):
    w=None; n=0
    for r in W.COH:
        if per=='B' and not r['in_trades']: continue
        T=r['decision_ts']; ft=W.features(r,T) or {}
        tr=W.TR.get(r['mint'],[]); c=r['create_ts']
        # outcome-only path facts (NOT known at the decision): max/min multiple of the 5-min price within 2 h
        p0=[x for x in tr if x[3]<=T]; base=p0[-1][8] if p0 else None
        later=[x[8] for x in tr if T<x[3]<=T+7200]
        row=dict(period=per,mint=r['mint'],create_utc=c,decision_utc=round(T,1),mc5_usd=round(r['mc5']),
                 venue_at_5m=ft.get('venue_at_T'),instant_graduation=ft.get('instant'),graduated_normally_before_5m=ft.get('graduated_normally'),
                 price_vs_peak_5m=round(ft['vs_peak'],3) if ft.get('vs_peak') else None,buys_last2m=ft.get('buys_2m'),buys_prev3m_per2m=round(ft['buys_prev3m_per2m'],1) if ft.get('buys_prev3m_per2m') is not None else None,
                 net_sol_last2m=round(ft['net_sol_2m'],2) if ft.get('net_sol_2m') is not None else None,net_sol_last5m=round(ft['net_sol_5m'],2) if ft.get('net_sol_5m') is not None else None,
                 OUTCOME_max_x_2h=round(max(later)/base,3) if later and base else None,OUTCOME_min_x_2h=round(min(later)/base,3) if later and base else None)
        for e in EX:
            s=W.sim(r['mint'],T,e); k=EX_NAME(e)
            row[f'SIM_{k}_status']=s['status']; row[f'SIM_{k}_ret']=round(s['ret'],4) if 'ret' in s else None
        if w is None: w=csv.DictWriter(f,fieldnames=list(row)); w.writeheader()
        w.writerow(row); n+=1
    return n
with open(f'{O}/coins_5min.csv','w',newline='') as f: print('coins',coins(WA,'A',f)+0, end=' '); 
with open(f'{O}/coins_5min.csv','a',newline='') as f:
    class _W: pass
    import io
    buf=io.StringIO(); nB=coins(WB,'B',buf); f.write(buf.getvalue().split('\n',1)[1]); print('B',nB)
# 1-minute bars, creation → +2 h, market cap in USD (from trade prices × SOL/USD), flows in SOL
with open(f'{O}/bars_1min.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['period','mint','minute_since_create','open_mc','high_mc','low_mc','close_mc','buy_sol','sell_sol','trades','venue_last'])
    n=0
    for W,per in ((WA,'A'),(WB,'B')):
        for r in W.COH:
            if per=='B' and not r['in_trades']: continue
            c=r['create_ts']; B=collections.OrderedDict()
            for x in W.TR.get(r['mint'],[]):
                mi=(x[3]-c)//60
                if mi<0 or mi>=120: continue
                mc=x[8]*1e9*W.usd(x[3]); b=B.get(mi)
                if b is None: B[mi]=b=[mc,mc,mc,mc,0.0,0.0,0,x[4]]
                b[1]=max(b[1],mc); b[2]=min(b[2],mc); b[3]=mc; b[4 if x[5] else 5]+=x[6]; b[6]+=1; b[7]=x[4]
            for mi,b in B.items(): w.writerow([per,r['mint'],mi]+[round(v) for v in b[:4]]+[round(b[4],3),round(b[5],3),b[6],b[7]]); n+=1
    print('bars',n)
