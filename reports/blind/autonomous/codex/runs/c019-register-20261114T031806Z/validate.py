"""Independent feature-table arithmetic, population and no-outcome audit."""
import pathlib,json,csv,hashlib,collections,gzip
r=pathlib.Path(__file__).parent;x=json.loads((r/'COUNTS.json').read_text())
with (r/'feature_records.csv').open() as f:
 rd=csv.DictReader(f);assert not {'net_sol','ret','status','exit','fill_t','sell_t'}&set(rd.fieldnames);rows=list(rd)
assert len(rows)==680 and len({z['mint'] for z in rows})==680 and sum(z['E']=='True' for z in rows)==679 and sum(z['L003']=='True' for z in rows)==296
old=json.loads((r/'initial_overlap_counts.json').read_text());assert all(old['proposals'][n]['E679']==x['proposals'][n]['E679'] for n in x['proposals'])
audit={}
for n in ['N1','N2','N3','N4','N5','N6']:
 audit[n]={}
 for pop,rr in [('E679',[z for z in rows if z['E']=='True']),('L003_296',[z for z in rows if z['L003']=='True'])]:
  known=[z for z in rr if z[n+'_known']=='True'];signal=sum(z[n+'_signal']=='True' for z in known);veto=len(known)-signal if n in ('N1','N3') else signal;unknown=len(rr)-len(known);q=x['proposals'][n][pop]['all']
  assert q['feature_known']==len(known) and q['feature_unknown']==unknown and q['signal_count']==signal and q['proposed_veto_count']==veto
  assert sum(q['unknown_reasons'].values())==unknown
  for z in known:
   if n in ('N1','N4','N5'):assert float(z[n+'_decision_t'])<=float(z['E_decision_t'])
   if n=='N3' and z['N3_stat']!='':assert float(z['N3_decision_t'])<=float(z['E_decision_t'])
  audit[n][pop]={'population':len(rr),'known':len(known),'unknown':unknown,'signal':signal,'proposed_veto':veto,'possible_veto_share_over_full_population':[veto/len(rr),(veto+unknown)/len(rr)],'note':'Feature-support bounds only; not return/loss bounds. Defined-subset rarity is not proven whole-population rarity when unknowns exist.'}
schemas={};pkg=r.parent/'entry-package-7nov'
for sub in ['current','snapshot3']:
 wanted={name:h for h,name in (s.split(maxsplit=1) for s in (pkg/sub/'SHA256SUMS.txt').read_text().splitlines())}
 for n in ['sol_usd.csv.gz','coverage_crossings.csv.gz']:
  p=pkg/sub/n;got=hashlib.sha256(p.read_bytes()).hexdigest();key=next((k for k in wanted if pathlib.Path(k).name==n),None);assert key is not None and got==wanted[key]
  with gzip.open(p,'rt') as f:header=next(csv.reader(f))
  schemas[sub+'/'+n]={'sha256':got,'manifest_match':True,'header_only_read':True,'columns':header}
out={'counts_only':True,'no_outcome_columns':True,'all_680_records_unique':True,'E679_and_L003296_complete':True,'initial_295_overlap_omission_corrected':True,'all_E_counts_unchanged_after_population_fix':True,'support_bounds':audit,'schema_hash_evidence':schemas,'N2_note':'Some trade raw amounts/reserves and quote/decimal/version fields exist; complete non-trade LP/asset movements and poolinitial-state proof do not. This full reconciliation definition is not supported,not proof that all reserve proxies are impossible.','N6_note':'SOL/USD tables EXIST. ts/usd lacks a separately documented knowledge/receipt clock in inspected evidence; historical coverage and causal supply/FX join for all first pool crossings are uncertified. NOT DEFINABLE means this exact proof requirement,not that no FX observations exist.','runtime_failure':'First local calculation used only295L003overlap; recomputed complete296as protocol required before publication; all679Ecounts identical. No threshold/statistic/outcome change.'}
(r/'SUPPORT_AUDIT.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'E_support':{n:v['E679'] for n,v in audit.items()},'all_E_counts_unchanged':True},indent=2))
