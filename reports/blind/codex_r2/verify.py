#!/usr/bin/env python3
"""Differentially verify selected Phase A outputs against frozen run_launch."""
import argparse, importlib.util, json, math, pathlib, types
import explore

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--evaluator',required=True);ap.add_argument('--out',required=True)
    a=ap.parse_args();out=pathlib.Path(a.out)
    spec=importlib.util.spec_from_file_location('ev',a.evaluator);ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
    selection=json.loads((out/'early_selection.json').read_text())['winner'];age,pred,hold=selection['spec']
    mod=types.SimpleNamespace(decide=lambda v:explore.features(list(v.trades),v.t,ev)[pred],exit_signal=lambda p:False)
    R={'decision_offsets':[age],'on_trade':False,'horizon_s':hold,'sizes':list(explore.SIZES)}
    tok,gaps,outages,meta=ev.load(str(out/'replay'),explore.START,explore.END)
    entries=json.loads((out/'selected_entries.json').read_text());expected={r['mint']:r for rr in entries.values() for r in rr}
    stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};checked=0
    for m,L in ev.iter_mints(str(out/'replay'),tok,stats):
        if m not in expected:continue
        r=expected[m]
        for fee in (30,125):
            actual,hyp=ev.run_launch(mod,R,m,tok[m],L,gaps,outages,meta,fee)
            assert actual['cat']==r['cat'],(m,actual,r)
            if actual['cat']=='scored':
                for s in explore.SIZES:
                    assert math.isclose(actual['sizes'][str(s)]['net_sol'],r['by_fee'][str(fee)][str(s)],rel_tol=1e-12,abs_tol=1e-12)
            assert hyp==r['hypothetical'],m
        checked+=1
    assert checked==len(expected),(checked,len(expected))
    result={'checked_launches':checked,'fee_scenarios':2,'all_categories_and_net_values_match':True}
    (out/'verification.json').write_text(json.dumps(result,indent=2));print(result)

if __name__=='__main__':main()
