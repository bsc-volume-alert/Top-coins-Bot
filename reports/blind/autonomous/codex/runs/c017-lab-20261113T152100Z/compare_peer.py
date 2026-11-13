"""Verify fetched source SHA256 and executed peer count JSONs, no profits."""
import pathlib,json,hashlib
r=pathlib.Path(__file__).parent;p=r/'peer_f013'
expected={'precheck_f013.py':'01df48c9d60a8f1f5c50eadabfc6e251de39b21aaf19250d483b23a0ca8404b3','precheck_f013.json':'b8e71eabe322b2488105a52eb3a6ad59786cd5b875b3f0d658cf21a9e5fc6f8c','descriptive_f013.py':'9e5c86c15485b525e784df52b2666a57a09d06a696845b3edb96b191c7378a1b','descriptive_f013.json':'c9b3527ce18f9f02c9c8601feb39f511b632c6eacd5fd42bba9cac7fd4f36ac0','rules_f013.py':'3ac8bca89ecfe68a5f164b3b2f39edf49f48eae1f71e727077edea96179b6d23','rule_run2.py':'961e71e7e92c42e50e6f776e188f74505680d8ff629ec5415f58c3d9d34ac0f7'}
for n,h in expected.items():assert hashlib.sha256((p/n).read_bytes()).hexdigest()==h,n
def leaves(x):
 if isinstance(x,dict):return sum(leaves(v) for v in x.values())
 if isinstance(x,list):return sum(leaves(v) for v in x)
 return 1
comparisons={}
for original,replay in [('precheck_f013.json','precheck_rebuilt.json'),('descriptive_f013.json','descriptive_rebuilt.json')]:
 a=json.loads((p/original).read_text());b=json.loads((p/replay).read_text());assert a==b;comparisons[original]={'leaf_fields_equal':leaves(a),'byte_equal':(p/original).read_bytes()==(p/replay).read_bytes(),'JSON_exact':True}
out={'source_commit':'69b0b54ff7c457fa0d063caf3e236bf027c56bc1','source_checksums_verified':expected,'executed_source_unchanged':True,'comparison':comparisons,'scope':'F013 raw count-only precheck and descriptive, not trading outcomes or whole F012','counts':{'control':568,'kept':18,'removed':550,'removed_share':550/568,'early_control':231,'early_kept':4,'late_control':337,'late_kept':14},'verdict':'NOT TESTABLE under R54, agrees; RUN2 family remains closed','limits':['Zero received sells cannot establish no off-tape selling','First-sell time in positive-sell group is pre-trigger; zero-sell future-first-sell values are not used in decisions','No general inference that all absence conditions select inactivity']}
(r/'peer_verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
