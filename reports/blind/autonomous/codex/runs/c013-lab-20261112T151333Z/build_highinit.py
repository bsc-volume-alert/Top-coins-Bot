from pathlib import Path
r=Path(__file__).parent;s=(r.parent/'c010-lab-20261111T211258Z/lab.py').read_text();assert s.count('high=ev.sell(fs,tokens,55)-.0015')==1;s=s.replace('high=ev.sell(fs,tokens,55)-.0015','high=-1e9')
for a,b in [('trade_checksums.json','highinit_checksums.json'),('lab_results.json','highinit_results.json'),('trade_ledger.json','highinit_ledger.json')]:s=s.replace("root/'"+a+"'","root/'"+b+"'")
assert s==(r/'highinit_diagnostic.py').read_text()
print('DIAGNOSTIC_SOURCE_TRANSFORMATION_IDENTICAL')
