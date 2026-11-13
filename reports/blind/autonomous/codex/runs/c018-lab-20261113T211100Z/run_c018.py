"""C018 new >=5SOL creator-size entry veto; original F014 run_eval arithmetic unchanged."""
import sys, os, pathlib, json, csv, types, math, statistics, collections, bisect, hashlib, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),"peer_f014")); import rules_common as rc
replay = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ev = rc.ev(); assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
assert not ev.DEV_NO_EVIDENCE
START, SPLIT, END = 1793950800, 1794016200, 1794081600
POOL_BPS = 55; SIZE = 0.2; TRAIL = 0.30; STALE = 30; AGE = 300; HORIZON = 7200; SEED = 20261113
tok, gaps, outages, meta = ev.load(str(replay), START, END); fl = ev.fl

def retained(info, L):
    """Exactly evaluate.run_launch's retention loop."""
    cum = 0.0
    for r in L:
        if not rc.iscurve(r): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= ev.RETAIN_SOL:
            rv = fl(r["recv_ms"]); return rv / 1000 if rv else fl(r["ts"])
    return None

def run_eval(m, info, L, ret, enter):
    """Through the frozen evaluator's run_launch (as run_f003.py)."""
    mod = types.SimpleNamespace(decide=lambda v: enter and v.t == info["created"] + AGE, exit_signal=rc.exit_signal)
    R = {"decision_offsets": [AGE], "on_trade": False, "horizon_s": HORIZON, "sizes": [SIZE]}
    res, hyp = ev.run_launch(mod, R, m, info, L, gaps, outages, meta, POOL_BPS)
    rec = {"cat": res["cat"], "why": res.get("why"), "entry_t": res.get("entry_t"), "hypothetical": hyp}
    if res.get("entry_t") is not None:
        te = res["entry_t"]; fs, fw = ev.state_at(L, te + ev.LAND_BUY_S, gaps, outages, info["created"], ret)
        rec["fill_state_age_s"] = (te + ev.LAND_BUY_S - fl(fs["ts"])) if fs else None; rec["entry_age_s"] = te - info["created"]
    if res["cat"] == "scored":
        s = res["sizes"][str(SIZE)]; rec.update(net_sol=s["net_sol"], ret=s["ret"], exit=s["exit"], fill_venue=s["fill_venue"], exit_venue=s["exit_venue"], exit_kind=("horizon" if s["exit"] == "horizon" else "trail"))
        if s["exit"] == "horizon": ts_ = te + HORIZON
        else:
            RO = sorted(L, key=lambda r: ((fl(r["recv_ms"]) or fl(r["ts"]) * 1000), int(r["slot"]), int(r["row_id"]))); RT = [(fl(r["recv_ms"]) or fl(r["ts"]) * 1000) / 1000 for r in RO]
            tokq = ev.buy(fs, SIZE, POOL_BPS); hi = -1e9; ts_ = None
            for j in range(bisect.bisect_right(RT, te + ev.LAND_BUY_S), len(RO)):
                r = RO[j]; tr = RT[j]
                if tr >= te + HORIZON: break
                if not ev.state_ok(r): continue
                p = types.SimpleNamespace(t=tr, size=SIZE, entry_t=te, fill_t=te + ev.LAND_BUY_S)
                p.x = (ev.sell(r, tokq, POOL_BPS) - ev.FIXED_FEE_SOL) / SIZE; hi = max(hi, p.x); p.hi = hi; p.seconds_held = tr - te
                if rc.exit_signal(p): ts_ = tr + ev.LAND_SELL_S; rec["trigger_t"] = tr; break
            assert ts_ is not None
        ss, sw = ev.state_at(L, ts_, gaps, outages, info["created"], ret)
        rec["exit_state_age_s"] = (ts_ - fl(ss["ts"])) if ss else None; rec["t_sell"] = ts_; rec["hold_s"] = ts_ - te
    return rec


# Appended to unchanged F014 retained()/run_eval() functions by make_run.py.
from decimal import Decimal
with (out/'creator_features.csv').open() as fh:PC={z['mint']:z for z in csv.DictReader(fh)}
gate=json.loads((out/'PRECHECK.json').read_text());assert gate['testable_R54'] and gate['threshold_SOL']==5 and gate['feature_unknown']==0
stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};audit=collections.Counter();rows=[]
for m,L in ev.iter_mints(str(replay),tok,stats):
 info=tok[m];ret=retained(info,L)
 if ret is None:audit['not_retained']+=1;continue
 if any(s<info['created']+HORIZON and e>info['created'] for s,e in outages):audit['outage_excluded']+=1;continue
 half='early' if info['created']<SPLIT else 'late';audit['eligible_'+half]+=1;t=info['created']+AGE
 RO=sorted(L,key=lambda z:((fl(z['recv_ms']) or fl(z['ts'])*1000),int(z['slot']),int(z['row_id'])));RT=[(fl(z['recv_ms']) or fl(z['ts'])*1000)/1000 for z in RO];k=bisect.bisect_right(RT,t)
 v=types.SimpleNamespace(t=t,created=info['created'],trades=ev.Prefix(RO,k));f=rc.features(v) if t>=ret else None;E=bool(f is not None and rc.eligible(f));size=None;veto=False
 if E:
  p=PC[m];assert p['feature_known']=='True' and p['cell']==rc.cell_of(f)
  knowncurve=[z for z in RO[:k] if rc.iscurve(z)];slot=min(int(z['slot']) for z in knowncurve);cr=rc.creator_of(m)
  size=sum((Decimal(z['sol']) for z in knowncurve if int(z['slot'])==slot and z['wallet']==cr and z['is_buy']=='1'),Decimal(0));assert size==Decimal(p['creator_buy_sol']) and slot==int(p['first_slot']);veto=size>=Decimal(5);assert veto==(p['veto']=='True')
 kept=E and not veto
 ctrl=run_eval(m,info,L,ret,E);cand=run_eval(m,info,L,ret,kept)
 if kept:assert ctrl==cand,(m,'candidate/control execution drift')
 for name,z,entered in [('control',ctrl,E),('candidate',cand,kept)]:
  z.update(spec=name,mint=m,half=half,created=info['created'],tier=info['tier'],eligible_E=E,kept=entered,cell=rc.cell_of(f) if E else None,creator_buy_sol=str(size) if size is not None else None,veto=veto if E else None);rows.append(z)
 if (audit['eligible_early']+audit['eligible_late'])%500==0:print('PROCESSED',dict(audit),flush=True)
assert stats['non_contiguous']==0
(out/'trade_ledger.json').write_text(json.dumps(rows));keys=sorted(set().union(*(z.keys() for z in rows)))
with (out/'ledger.csv').open('w',newline='') as fh:w=csv.DictWriter(fh,fieldnames=keys);w.writeheader();w.writerows(rows)
(out/'score_audit.json').write_text(json.dumps({'audit':dict(audit),'stats':{k:v for k,v in stats.items() if k!='_done'},'all_kept_control_results_identical':True,'features_recomputed_causally_equal':True},indent=2)+'\n')
