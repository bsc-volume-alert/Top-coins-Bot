#!/usr/bin/env python3
"""Verify source hashes, census reconciliation and Round 1 verbatim provenance."""
import argparse, csv, gzip, hashlib, json, pathlib, subprocess

def main():
    p=argparse.ArgumentParser();p.add_argument('--data',required=True)
    p.add_argument('--round1-repo',required=True);p.add_argument('--out',required=True);a=p.parse_args()
    data=pathlib.Path(a.data);out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True)
    for line in (data/'SHA256SUMS.txt').read_text().splitlines():
        digest,name=line.split(maxsplit=1)
        assert hashlib.sha256((data/name.lstrip('*')).read_bytes()).hexdigest()==digest,name
    def rows(name):
        with gzip.open(data/name,'rt') as f:return list(csv.DictReader(f))
    census=rows('tokens_window.csv.gz');co={r['mint']:r for r in rows('coverage_per_mint.csv.gz')}
    report={'census_launches':len(census),'with_trades':sum(int(r['rows_exported'])>0 for r in co.values()),
            'raw_rows':sum(int(r['rows_exported']) for r in co.values()),'halves':{}}
    for half in ('early','late'):
        rr=[r for r in census if (int(r['create_ts'])<1794016200)==(half=='early')]
        report['halves'][half]={'census':len(rr),'with_rows':sum(int(co[r['mint']]['rows_exported'])>0 for r in rr),
                'zero_row_tier1_or_higher':sum(int(r['tier'] or 0)>=1 and int(co[r['mint']]['rows_exported'])==0 for r in rr),
                'reconciliation_mismatches':sum(co[r['mint']]['reconciled']!='1' for r in rr)}
    blob=subprocess.check_output(['git','-C',a.round1_repo,'show','b06fa89f3baa637231b431edea5d171966112afa:reports/blind/CODEX_FROZEN_7nov_2026.md'])
    digest=hashlib.sha256(blob).hexdigest()
    assert digest=='642e8c80bea386784b8d5a01157a1a05d0db3a8ad21d6c993fe04a676bd91a35'
    (out/'ROUND1_VERBATIM.md').write_bytes(blob);report['round1_sha256']=digest
    (out/'census_audit.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

if __name__=='__main__':main()
