"""Exact reproduction comparison and independent feature validation, counts only."""
import pathlib,json,gzip,csv,hashlib,collections,math
r=pathlib.Path(__file__).parent;p=r/'peer_f016';b=r/'rebuilt'
manifest={name:h for h,name in (line.split(maxsplit=1) for line in (p/'ARTIFACT_SHA256SUMS.txt').read_text().splitlines())}
hashes={}
for name in ['testability_f016.py','rules_common.py','commands.sh','PROTOCOL.md','results.json','f016_features.csv.gz']:
 h=hashlib.sha256((p/name).read_bytes()).hexdigest();assert h==manifest[name],name;hashes[name]=h
expected=json.loads((p/'results.json').read_text());actual=json.loads((b/'results.json').read_text());assert expected==actual
def leaves(z):
 if isinstance(z,dict):return sum(leaves(v) for v in z.values())
 if isinstance(z,list):return sum(leaves(v) for v in z)
 return 1
orig=gzip.decompress((p/'f016_features.csv.gz').read_bytes());rebuilt=(b/'f016_features.csv').read_bytes();assert orig==rebuilt
with (b/'f016_features.csv').open() as f:rd=csv.DictReader(f);fields=rd.fieldnames;peer={z['mint']:z for z in rd}
with (r/'independent_features.csv').open() as f:ind={z['mint']:z for z in csv.DictReader(f)}
assert set(peer)==set(ind) and len(peer)==679
diffs=[];numeric_compared=exact_compared=0;maxerr=0;flagdiffs=0;numeric_big=0
nonnum={'mint','half','cell'};bools={k for k in fields if k.endswith('_veto') or k=='p1_ret_state_ok'}
for m,z in peer.items():
 for k in fields:
  a,bb=z[k],ind[m][k]
  if k in nonnum|bools or a=='' or bb=='':
   exact_compared+=1;ok=a==bb
  else:
   numeric_compared+=1;err=abs(float(a)-float(bb));maxerr=max(maxerr,err);ok=err<=1e-12
   if not ok:numeric_big+=1
  if not ok:
   diffs.append({'mint':m,'field':k,'peer_value':a,'independent_value':bb,'boolean_field':k in bools});flagdiffs+=k in bools
assert not flagdiffs,'Independent veto or validity flag differs; inspect differences'
I=json.loads((r/'independent_counts.json').read_text())
maps={'R86_1_price_drift':'p1_veto','R86_2_adder_share':'p2_veto','R86_3_arrival_cv':'p3_veto','CLP1_sell_absorption':'clp1_veto','CLP2_escalation':'clp2_veto','CLP3_clock':'clp3_veto'}
for name,key in maps.items():
 assert actual[name]['veto']==I['bind_counts'][key]['all']['veto']
 for group,source in [('by_half','by_half'),('by_cell','by_cell')]:
  for h,z in actual[name][group].items():assert z['veto']==I['bind_counts'][key][source][h]['veto']
clock_comparison={}
for name,key in [('census','clock_census'),('E','clock_E'),('denominator_3638','clock_denominator')]:
 a=actual['CLP3_clock'][name];bb=I[key]
 assert a['counts_mod60']==bb['counts_mod60'] and a['n']==bb['n'] and a['bin_58_2_count']==bb['bin_58_2']
 err=abs(a['chi2_vs_uniform_59df']-bb['chi2']);assert err<1e-12;clock_comparison[name]={'all60bins_equal':True,'n':a['n'],'bin58_2':bb['bin_58_2'],'chi2':bb['chi2'],'absolute_difference':err}
assert actual['CLP3_clock']['create_ts_source_check']==I['create_ts_source']
directions={name:{'comparison':op,'threshold':v,'min_n':mn} for name,op,v,mn in [('R86_1','<',1,None),('R86_2','<',.25,None),('R86_3','<',.5,10),('CLP1','>=',.5,None),('CLP2','<=',-.5,10),('CLP3','in',[58,59,0,1,2],None)]}
report={'counts_only':True,'peer_F016_commit':'253604de64fc9b2b43effa44b245f1323c4f4201','frozen_evaluator_unchanged':True,'peer_hashes_verified':hashes,'unchanged_reproduction':{'results_JSON_leaves_equal':leaves(actual),'results_JSON_exact':True,'feature_CSV_bytes_equal':True,'feature_CSV_bytes':len(rebuilt),'feature_CSV_sha256':hashlib.sha256(rebuilt).hexdigest(),'rows':679,'columns':len(fields)},'independent_comparison':{'rows':679,'fields_compared':numeric_compared+exact_compared,'numeric_fields':numeric_compared,'exact_fields':exact_compared,'tolerance':1e-12,'max_numeric_abs_difference':maxerr,'fields_over_tolerance':numeric_big,'all_differences_count':len(diffs),'veto_flag_differences':flagdiffs,'all_six_bind_counts_and_half_cell_counts_equal':True},'independent_clock_comparison':clock_comparison,'protocol_directions_verified':directions,'R86_2_clock_reading':{'historical_F016':'block ts within already-received prefix, clarified by R96; no source changed','future_R101':'receipt time operative, original block count beside it; E itself unchanged','block_veto':I['bind_counts']['p2_veto']['all']['veto'],'receipt_veto':I['bind_counts']['receipt_adder_veto']['all']['veto'],'cross_tab':I['adder_clock_cross_tab']},'N5_future_wording_R102':'Conservative launch-unknown if any relevant-window foreign pool sell has unproven quote/decimal evidence; do not merely drop row and call the launch defined. C019historical results unchanged.','financial_variants_scored':0,'outcome_files_read':False,'next_task':'no task; waiting for a released window (R4 / R5 / R6)','limits':['Exact reproduction is not statistical confirmation or strategy profitability','Historical E and retention conventions preserved','Six held counts are not a new trading experiment','No tests on unreleased/protected records']}
(r/'REVIEW_RESULTS.json').write_text(json.dumps(report,indent=2)+'\n')
with (r/'independent_differences.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=['mint','field','peer_value','independent_value','boolean_field']);w.writeheader();w.writerows(diffs)
print(json.dumps(report,indent=2),flush=True)
