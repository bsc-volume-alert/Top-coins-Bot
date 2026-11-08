#!/usr/bin/env python3
"""Phase A: fixed 72-rule early search; one unchanged late check. No test data."""
import argparse, bisect, collections, csv, datetime as dt, gzip, hashlib
import importlib.util, itertools, json, pathlib
import numpy as np

START, SPLIT, END = (1793950800, 1794016200, 1794081600)
AGES, HOLDS, SIZES = (15, 30, 60, 120), (15, 60, 300), (.2, .02)
GRID = list(itertools.product(AGES, range(6), HOLDS))
EXPECTED = 'f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86'

def features(rows, t, ev):
    known = [r for r in rows if ev.fl(r['recv_ms']) is not None and float(r['recv_ms']) <= t*1000]
    known.sort(key=lambda r: (float(r['recv_ms']), int(r['slot']), int(r['row_id'])))
    if not known or known[-1]['venue'] not in ('', 'curve') or not ev.state_ok(known[-1]):
        return [False]*6
    curve = [r for r in known if r['venue'] in ('', 'curve')]
    buys = collections.defaultdict(float)
    net = recent = prior = 0.; wallets = set()
    for r in curve:
        s = ev.fl(r['sol']) or 0.; sign = 1 if r['is_buy']=='1' else -1
        net += sign*s; age = t-float(r['recv_ms'])/1000
        if r['is_buy']=='1': buys[r['wallet']] += s
        if age < 15:
            recent += sign*s
            if sign == 1: wallets.add(r['wallet'])
        elif age < 30: prior += sign*s
    gross = sum(buys.values()); b = len(buys)
    if gross < 15: return [False]*6
    broad = net >= 10 and b >= 20
    return [True, broad, recent >= 3 and len(wallets) >= 5,
            recent <= -3 and net >= 10,
            broad and max(buys.values())/gross <= .15,
            recent >= 3 and recent >= 1.5*prior and b >= 20]

def read(path):
    with gzip.open(path, 'rt', newline='') as f: return list(csv.DictReader(f))

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--data', required=True)
    ap.add_argument('--evaluator', required=True); ap.add_argument('--out', required=True)
    a=ap.parse_args(); data=pathlib.Path(a.data); out=pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    ep=pathlib.Path(a.evaluator)
    assert hashlib.sha256(ep.read_bytes()).hexdigest()==EXPECTED
    spec=importlib.util.spec_from_file_location('frozen_eval',ep); ev=importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
    assert not ev.DEV_NO_EVIDENCE
    for x in (START,SPLIT,END): print(dt.datetime.fromtimestamp(x,dt.timezone.utc).isoformat(),flush=True)
    # Non-mutating adapter for the export's filenames; original data stays unchanged.
    replay=out/'replay'; replay.mkdir(exist_ok=True)
    for p in data.glob('trades_part_*.csv.gz'):
        q=replay/p.name
        if not q.exists():q.symlink_to(p.resolve())
    for src,dst in [('tokens_window.csv.gz','tokens.csv.gz'),('feed_gaps_all.csv.gz','feed_gaps.csv.gz')]:
        q=replay/dst
        if not q.exists():q.symlink_to((data/src).resolve())
    outage_text=''
    for day,a0,b0 in [('06','20:40','20:42'),('06','20:57','21:06'),('06','23:33','23:35'),
                     ('07','00:06','00:08'),('07','00:26:30','00:27:30'),('06','21:40','21:45')]:
        times=[dt.datetime.fromisoformat('2026-11-'+day+'T'+s+'+00:00').timestamp() for s in (a0,b0)]
        outage_text+=f'{times[0]} {times[1]} documented_tracker_outage\n'
    (replay/'outages.txt').write_text(outage_text)
    tok,gaps,outages,meta=ev.load(str(replay),START,END)
    cov={r['mint']:r for r in read(data/'coverage_per_mint.csv.gz')}
    stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()}
    early=[[] for _ in GRID]; audit=collections.Counter(); universe={'early':0,'late':0}
    def process(m,info,L,indices):
        c=info['created']; cum=0.;ret=None
        for r in L:
            if r['venue'] not in ('curve',''): continue
            if r['is_buy']=='1':cum+=ev.fl(r['sol']) or 0.
            if info['tier']>=1 or cum>=15:
                rv=ev.fl(r['recv_ms']);ret=rv/1000 if rv else ev.fl(r['ts']);break
        assert ret is not None
        hyp=any(ev.fl(r['recv_ms']) is None for r in L)
        contradiction=any(float(L[j]['ts'])<float(L[j-1]['ts']) for j in range(1,len(L)))
        pre=sum(float(r['ts'])<=ret for r in L)
        f={age:features(L,c+age,ev) for age in AGES}
        states={}; ans={}
        for idx in indices:
            age,pred,hold=GRID[idx];t=c+age
            r={'mint':m,'created':c,'cat':'abstain','hypothetical':hyp}
            # Same pre-buffer guard as frozen run_launch (even before decide).
            if pre>ev.PRE_BUFFER:r.update(cat='unknown',why='pre-promotion buffer exceeded')
            elif t>=ret and f[age][pred]:
                r.update(cat='scored',entry_t=t,exit_t=t+hold,by_fee={})
                for time in (t+1,t+hold):
                    if time not in states:states[time]=ev.state_at(L,time,gaps,outages,c,ret)
                fs,fw=states[t+1];ss,sw=states[t+hold]
                if fs is None or ss is None:r.update(cat='unknown',why=('fill: '+fw if fs is None else 'exit: '+sw))
                else:
                    for fee in (30,125):
                        r['by_fee'][str(fee)]={str(s):ev.sell(ss,ev.buy(fs,s,fee),fee)-s-ev.FIXED_FEE_SOL for s in SIZES}
                    r.update(fill_venue=fs['venue'] or 'curve',exit_venue=ss['venue'] or 'curve')
            r['contradiction']=contradiction
            r['reconciliation_mismatch']=cov[m]['reconciled']!='1'
            ans[idx]=r
        return ans
    # Store only late launch paths; no late rule outcomes until early selection.
    latepath=out/'late_paths.jsonl'
    with latepath.open('w') as sink:
        for m,L in ev.iter_mints(str(replay),tok,stats):
            info=tok[m];c=info['created'];cum=0.;ret=info['tier']>=1
            audit['unique_rows']+=len(L)
            audit['missing_receipt_rows']+=sum(ev.fl(r['recv_ms']) is None for r in L)
            audit['contradictory_mints']+=any(float(L[j]['ts'])<float(L[j-1]['ts']) for j in range(1,len(L)))
            for r in L:
                if r['venue'] in ('curve','') and r['is_buy']=='1':cum+=ev.fl(r['sol']) or 0.
                if cum>=15:ret=True;break
            if not ret:audit['not_retained_streams']+=1;continue
            if any(s<c+7200 and e>c for s,e in outages):audit['outage_excluded']+=1;continue
            half='early' if c<SPLIT else 'late';universe[half]+=1
            if half=='early':
                ans=process(m,info,L,range(len(GRID)))
                for i,r in ans.items():early[i].append(r)
            else:sink.write(json.dumps([m,info,L])+'\n')
            if sum(universe.values())%500==0:print('processed',universe,flush=True)
    assert stats['non_contiguous']==0, 'Noncontiguous exports require regrouping, not silent split evaluation.'
    def quick(rr,fee=30):
        good=[r for r in rr if r['cat']=='scored'];unk=sum(r['cat']=='unknown' for r in rr)
        attempted=len(good)+unk
        lows=[sum(r['by_fee'][str(fee)][str(s)] for r in good)-unk*(s+.0015) for s in SIZES]
        return {'attempted':attempted,'scored':len(good),'unknown':unk,
                'unknown_share':unk/attempted if attempted else 0.,'lower_totals':lows,
                'rank':min(v/s for v,s in zip(lows,SIZES))}
    board=[dict(id=i,spec=GRID[i],**quick(rr)) for i,rr in enumerate(early)]
    eligible=[r for r in board if r['attempted']>=30 and r['unknown_share']<=.1]
    fallback=False
    if not eligible:eligible=[r for r in board if r['attempted']>=30];fallback=True
    winner=max(eligible,key=lambda r:(r['rank'],-r['id']));idx=winner['id']
    (out/'early_selection.json').write_text(json.dumps({'winner':winner,'fallback':fallback,'leaderboard':sorted(board,key=lambda r:-r['rank'])},indent=2))
    print('EARLY SELECTION',winner,flush=True)
    late=[]
    with latepath.open() as f:
        for line in f:
            m,info,L=json.loads(line);late.append(process(m,info,L,[idx])[idx])
    def bootstrap(vals):
        rng=np.random.default_rng(20261108);vals=np.array(vals);n=len(vals);means=[]
        for _ in range(100):means.extend(rng.choice(vals,(100,n),replace=True).mean(axis=1).tolist())
        return np.quantile(means,[.025,.975,.05,.05/72]).tolist()
    def summarize(rr,fee,size):
        good=[r for r in rr if r['cat']=='scored'];unk=[r for r in rr if r['cat']=='unknown']
        x=np.array([r['by_fee'][str(fee)][str(size)] for r in good]);N=len(rr)
        point=[r['by_fee'][str(fee)][str(size)] if r['cat']=='scored' else 0. for r in rr]
        lower=[v if r['cat']!='unknown' else -size-.0015 for r,v in zip(rr,point)]
        events=[]
        for r in rr:
            if 'entry_t' in r:events.extend([(r['entry_t']+1,1),(r['exit_t'],-1)])
        active=peak=0
        for _,d in sorted(events):active+=d;peak=max(peak,active)
        known=[r for r in good if not r['hypothetical']];strict_unk=[r for r in rr if r['cat']=='unknown' or (r['cat']=='scored' and (r['hypothetical'] or r['contradiction']))]
        strict_net=sum(r['by_fee'][str(fee)][str(size)] for r in good if not r['hypothetical'] and not r['contradiction'])
        outv=dict(N=N,scored=len(good),abstain=N-len(good)-len(unk),unknown=len(unk),
                  unknown_reasons=dict(collections.Counter(r.get('why') for r in unk)),
                  unknown_share=len(unk)/(len(good)+len(unk)) if good or unk else 0,
                  net_sol=float(x.sum()),lower_total_sol=sum(lower),point_per_launch=sum(point)/N,
                  lower_per_launch=sum(lower)/N,point_bootstrap=bootstrap(point),lower_bootstrap=bootstrap(lower),
                  peak_attempted_positions=peak,peak_stake_sol=peak*size,
                  stake_sol_hours=sum((r['exit_t']-r['entry_t']-1)*size/3600 for r in rr if 'entry_t' in r),
                  hypothetical_scored=len(good)-len(known),contradictory_attempts=sum(r['contradiction'] for r in rr if r['cat']!='abstain'),
                  strict_unknown=len(strict_unk),strict_lower_total_sol=strict_net-len(strict_unk)*(size+.0015),
                  reconciliation_attempts=sum(r['reconciliation_mismatch'] for r in rr if r['cat']!='abstain'))
        if len(x):outv.update(mean_return=float(x.mean()/size),median_return=float(np.median(x)/size),win_rate=float((x>0).mean()),
                             loss_ge50=float((x<=-.5*size).mean()),worst_return=float(x.min()/size),
                             without_best_net_sol=float(x.sum()-x.max()),mean_return_bootstrap=bootstrap(x/size),
                             pool_exit_scored=sum(r['exit_venue']!='curve' for r in good))
        return outv
    report={'search_count':len(GRID),'winner':winner,'fallback':fallback,'universe':universe,'audit':dict(audit),
            'stream_stats':{k:v for k,v in stats.items() if k!='_done'},'by_half':{}}
    for half,rr in [('early',early[idx]),('late',late)]:
        report['by_half'][half]={str(fee):{str(s):summarize(rr,fee,s) for s in SIZES} for fee in (30,125)}
    # Run verify.py separately to compare every selected launch with the evaluator.
    (out/'selected_entries.json').write_text(json.dumps({'early':early[idx],'late':late}))
    (out/'results.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2),flush=True)

if __name__=='__main__':main()
