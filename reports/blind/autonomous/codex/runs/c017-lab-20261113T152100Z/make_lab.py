"""Use original L003 execution code with only a preregistered entry veto."""
import pathlib,json
r=pathlib.Path(__file__).parent;p=json.loads((r/'PRECHECK.json').read_text());h=p['chosen']
assert h in ('H2','H3') and next(z for z in p['prechecks_attempted'] if z['hypothesis']==h)['eligible_for_scoring']
s=(r.parent/'c010-lab-20261111T211258Z/lab.py').read_text()
s=s.replace("records={'L003':[],'CONTROL':[]}","records={'L009':[],'BASELINE':[],'VETOED':[]}")
s=s.replace("stats={'mints_streamed'", "pre=json.loads((root/'PRECHECK.json').read_text());chosen=pre['chosen'];assert chosen in ('H2','H3')\nwith (root/'precheck_features.csv').open() as fh:pre_features={q['mint']:q for q in csv.DictReader(fh)}\nstats={'mints_streamed'",1)
s=s.replace("candidate=len(recent_buyers)>=20 and material>=10 and persistence>=.6", "candidate=len(recent_buyers)>=20 and material>=10 and persistence>=.6\n if not candidate:continue\n pf=pre_features[mint];assert t==float(pf['decision_t']) and pf[chosen+'_available']=='True'\n veto=pf[chosen+'_veto']=='True'\n filter_feature={k:v for k,v in pf.items() if k.startswith(chosen+'_')};filter_feature['hypothesis']=chosen")
s=s.replace("records['CONTROL'].append(answer)\n if candidate:records['L003'].append({**answer,'variant':'L003'})", "records['BASELINE'].append({**answer,'variant':'BASELINE','filter_feature':filter_feature})\n if not veto:records['L009'].append({**answer,'variant':'L009','filter_feature':filter_feature})\n else:records['VETOED'].append({**answer,'variant':'VETOED','filter_feature':filter_feature})")
s=s.replace("len(records['L003']),len(records['CONTROL'])","len(records['L009']),len(records['BASELINE'])")
s=s.replace("'experiment':'CDEX-L003'","'experiment':'CDEX-L009'").replace('47ac802f25258cd4f5a8b110935e50785fc29daf',(r/'score_parent.txt').read_text().strip())
(r/'lab.py').write_text(s)
print('Chosen',h,'only entry-filter insertion; original buy/sell arithmetic unchanged')
