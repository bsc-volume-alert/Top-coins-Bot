#!/usr/bin/env python3
"""Frozen scorer on selected development results; K=72 search sensitivity only."""
import argparse, importlib.util, json, pathlib

def main():
    p=argparse.ArgumentParser();p.add_argument('--evaluator',required=True);p.add_argument('--out',required=True);a=p.parse_args()
    spec=importlib.util.spec_from_file_location('ev',a.evaluator);ev=importlib.util.module_from_spec(spec);spec.loader.exec_module(ev)
    out=pathlib.Path(a.out);entries=json.loads((out/'selected_entries.json').read_text());report={}
    for half,rr in entries.items():
        report[half]={}
        for fee in (30,125):
            converted=[]
            for r in rr:
                z={'cat':r['cat']}
                if r['cat']=='scored':z['sizes']={str(s):{'net_sol':r['by_fee'][str(fee)][str(s)],'ret':r['by_fee'][str(fee)][str(s)]/s} for s in (.2,.02)}
                converted.append(z)
            report[half][str(fee)]={str(s):ev.score(converted,s,72,(s+.0015)/s) for s in (.2,.02)}
    (out/'frozen_score_development.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

if __name__=='__main__':main()
