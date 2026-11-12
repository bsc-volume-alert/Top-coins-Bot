"""Counterexamples to the claim that a short gap cannot affect sustained labels."""
import pathlib,json
p=pathlib.Path(__file__).parent
# F006's specified label: two above-threshold observations separated by>=30s,
# with no intervening observed below-threshold trade.
def event(rows):
 start=None
 for t,price in rows:
  if price>=2:
   if start is None:start=t
   elif t>=start+30:return True
  else:start=None
 return False
cases=[{'name':'missed_confirming_trade','full':[(1,2.1),(29,2.1),(31,2.1),(36,1.9)],'gap':[30,35]}, {'name':'missed_intervening_dip','full':[(1,2.1),(29,2.1),(31,1.9),(36,2.1)],'gap':[30,35]}]
for c in cases:
 c['observed']=[r for r in c['full'] if not c['gap'][0]<=r[0]<c['gap'][1]];c['full_label_event']=event(c['full']);c['observed_label_event']=event(c['observed']);c['gap_duration']=c['gap'][1]-c['gap'][0];assert c['full_label_event']!=c['observed_label_event'];assert c['gap_duration']<30
(p/'coverage_counterexamples.json').write_text(json.dumps({'synthetic':True,'cases':cases,'conclusion':'tol30 is an operational assumption/sensitivity, not a proof that labels cannot be wrong; even strict source positives are observed events, not guaranteed continuous paths','market_prevalence_measured':False},indent=2));print(json.dumps(cases,indent=2))
