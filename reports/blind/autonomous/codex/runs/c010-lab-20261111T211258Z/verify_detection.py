"""Independent numeric table/rank/matching reproduction of F006's strongest cells."""
import pathlib,json,csv,gzip,math,collections,bisect,hashlib,statistics
import numpy as np
from scipy.stats import mannwhitneyu
p=pathlib.Path(__file__).parent

def rows(path):
 with gzip.open(path,'rt',newline='') as f:return list(csv.DictReader(f))
a=rows(p/'claude_source/features_labels.csv.gz');b=rows(p/'rebuilt/features_labels.csv.gz');ka={(r['mint'],r['age_s']):r for r in a};kb={(r['mint'],r['age_s']):r for r in b};assert set(ka)==set(kb);different=[];fields=0
for key in ka:
 for col,x in ka[key].items():
  y=kb[key][col];fields+=1
  if x==y:continue
  try:
   xx,yy=float(x),float(y)
   if math.isnan(xx) and math.isnan(yy):continue
   if math.isclose(xx,yy,rel_tol=1e-12,abs_tol=1e-12):continue
  except ValueError:pass
  different.append({'mint':key[0],'age':key[1],'field':col,'expected':x,'actual':y})
assert not different,different[:10]
summary=json.loads((p/'rebuilt/build_summary.json').read_text());expected_summary=json.loads((p/'claude_source/build_summary.json').read_text());assert summary==expected_summary
RA=[r for r in b if r['age_s']=='300' and r['status']=='ok'];pos=sorted([r for r in RA if r['label2x']=='runner'],key=lambda r:float(r['created']));neg=[r for r in RA if r['label2x']=='nonrunner'];used=set();matched=[]
for r in pos:
 candidates=[]
 for i,n in enumerate(neg):
  if i in used or n['half']!=r['half'] or abs(float(n['created'])-float(r['created']))>7200:continue
  if math.isnan(float(n['mcap_usd_at_t'])):continue
  distance=abs(math.log(max(float(n['mcap_usd_at_t']),1e-9))-math.log(max(float(r['mcap_usd_at_t']),1e-9)));candidates.append((distance,i))
 take=sorted(candidates)[:5]
 if take:matched.append(r)
 for _,i in take:used.add(i);matched.append(neg[i])
oracle=rows(p/'claude_source/matched/matched_sustained2x_300s.csv.gz');assert [r['mint'] for r in matched]==[r['mint'] for r in oracle]

def auc(pos,neg):
 # Independent sorted-comparison statistic; ties count half.
 neg=sorted(neg);return sum(bisect.bisect_left(neg,x)+.5*(bisect.bisect_right(neg,x)-bisect.bisect_left(neg,x)) for x in pos)/(len(pos)*len(neg))
def bootstrap(pos,neg):
 rs=np.random.RandomState(20261111);vals=[];pos=np.array(pos);neg=np.array(neg)
 for _ in range(2000):
  x=pos[rs.randint(0,len(pos),len(pos))];y=neg[rs.randint(0,len(neg),len(neg))];ys=np.sort(y);vals.append(float((np.searchsorted(ys,x,side='left')+.5*(np.searchsorted(ys,x,side='right')-np.searchsorted(ys,x,side='left'))).sum()/(len(x)*len(y))))
 vals.sort();return [vals[50],vals[1949]]
expected=json.loads((p/'claude_source/results.json').read_text())['ages']['300']['outcomes']['sustained2x']['matched'];out={}
for feature in ['buyers_last_60s','inflow_persistence','n_net_holders','creator_sold_share']:
 pp=[float(r[feature]) for r in matched if r['label2x']=='runner' and r[feature] and math.isfinite(float(r[feature]))];nn=[float(r[feature]) for r in matched if r['label2x']=='nonrunner' and r[feature] and math.isfinite(float(r[feature]))]
 value=auc(pp,nn);ci=bootstrap(pp,nn);want=expected['features'][feature];assert math.isclose(value,want['auc_runner_vs_nonrunner'],abs_tol=1e-12);assert all(math.isclose(x,y,abs_tol=1e-12) for x,y in zip(ci,want['auc_boot95']))
 out[feature]={'auc':value,'bootstrap95':ci,'median_runner':statistics.median(pp),'median_nonrunner':statistics.median(nn),'n_runner':len(pp),'n_nonrunner':len(nn),'mw_p_two_sided':float(mannwhitneyu(pp,nn,alternative='two-sided',method='asymptotic').pvalue)}
report={'claude_commit':'7a9cd6a98680b660d15b952079b7f367d3ad180f','rows_compared':len(a),'fields_compared':fields,'numeric_or_category_mismatches':different,'build_summary_matches':True,'matched_mint_order_matches':True,'matched_runners':sum(r['label2x']=='runner' for r in matched),'matched_nonrunners':sum(r['label2x']=='nonrunner' for r in matched),'features':out,'limits':['Reproduction on the same exploratory data, not independent statistical confirmation','95% bootstrap CI is descriptive; source Bonferroni flag uses Mann-Whitney p, not adjusted bootstrap endpoints','Source labels and matching assumptions remain subject to audit']}
prior=json.loads((p.parent/'c009-20261111T181843Z/records.json').read_text());feasible={r['mint'] for r in prior if r['age']==300 and r['trade_status']!='fill_unavailable'}
fm=[r for r in matched if r['mint'] in feasible];sensitivity={}
for f in ['buyers_last_60s','inflow_persistence','n_net_holders','creator_sold_share']:
 x=[float(r[f]) for r in fm if r['label2x']=='runner' and r[f] and math.isfinite(float(r[f]))];y=[float(r[f]) for r in fm if r['label2x']=='nonrunner' and r[f] and math.isfinite(float(r[f]))]
 sensitivity[f]={'n_runner':len(x),'n_nonrunner':len(y),'auc':auc(x,y) if x and y else None}
report['fixed_matched_subset_with_C009_owner_scenario_fill']={'note':'Feasibility-stratum diagnostic, not an entry feature or a rematched validation; C009 requirements differ from F006','features':sensitivity}
(p/'detection_verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
