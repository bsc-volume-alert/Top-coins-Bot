import json,pathlib,collections
r=pathlib.Path(__file__).parent;x=json.loads((r.parent/'c001-20261110T211226Z/actual_ledger.json').read_text());rows=[q for v in x.values() for q in v];sc=[q for q in rows if q['fees']['30']['cat']=='scored'];assert len(sc)==80
assert all(q['fees']['30']==q['fees']['125'] for q in rows)
vs=collections.Counter((s['fill_venue'],s['exit_venue']) for q in sc for s in q['fees']['30']['sizes'].values());assert vs=={('curve','curve'):160}
(r/'c001_fee_scope_audit.json').write_text(json.dumps({'scored_launches':80,'positions_two_sizes':160,'fill_exit_venue_counts':{'curve/curve':160},'fee_scenario_records_identical_all_launches':True,'source_commit':'e622e625d626c365969321f7aa2634e87c7c858b','meaning':'No pool-fee sensitivity established for ID34'},indent=2))
