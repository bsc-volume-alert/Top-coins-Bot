"""Lossless feature-table partitions and script-generated evidence metadata."""
import pathlib,csv,json,hashlib
r=pathlib.Path(__file__).parent
with (r/'feature_records.csv').open(newline='') as f:rd=csv.DictReader(f);keys=rd.fieldnames;rows=list(rd)
for i in range(0,len(rows),150):
 with (r/('features_'+str(i//150+1).zfill(2)+'.csv')).open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows(rows[i:i+150])
o={'run':'c019-register-20261114T031806Z','refs':{'tracker':'b3e374df28bcfbe65b8d24b59f9b3bbac563931a','codex':'03ea37256849ec093f29f19ac6c1fe3079d93e89','claude':'253604de64fc9b2b43effa44b245f1323c4f4201','entry_all':'e67833121f1da0dc992c28fa26c5236a855c151a','entry_package':'0e3be03c71949e069a7a31b5951f332bb563f68f','evaluator':'be9b5459e2f7670946d9ca012f875b77aaaf5d5b','rules_common_source':'a27c504dfe240fecf132123bcfc5c18cb2dd4091'},'claim_commit':'97a23c58d14e344f99b090f655239972231f77f6','protocol_commit':'122657ffed04f4df5234ba356b0a6e225e540f8c','counts_code_published_together':True,'new_financial_variants':0,'feature_definitions_considered':6,'actual_raw_feature_calculations':4,'not_definable_proposals':['N2','N6'],'AGENTS_reads':{p:404 for p in ['AGENTS.md','reports/AGENTS.md','reports/blind/AGENTS.md','reports/blind/autonomous/AGENTS.md','reports/blind/autonomous/codex/AGENTS.md']},'outcome_ledger_read_by_analysis':False,'new_paid_chain_model_collection':False,'development_testing_closed':True,'known_E_and_L003_union':680,'memory_is_model_retraining':False}
(r/'source_integrity.json').write_text(json.dumps(o,indent=2)+'\n')
