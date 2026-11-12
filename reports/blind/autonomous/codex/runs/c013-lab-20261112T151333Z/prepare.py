import pathlib,urllib.request,hashlib,json
r=pathlib.Path(__file__).parent;s=r/'claude_source';s.mkdir(exist_ok=True)
commit='fc6b05aa75162444776a93035b34a7ad24c77395';base='https://raw.githubusercontent.com/bsc-volume-alert/Top-coins-Bot/'+commit+'/reports/blind/autonomous/claude/runs/f006p2-20261112T025028Z/'
b=urllib.request.urlopen(base+'ARTIFACT_SHA256SUMS.txt').read();(s/'ARTIFACT_SHA256SUMS.txt').write_bytes(b);want={n:sha for sha,n in (l.split(maxsplit=1) for l in b.decode().splitlines())};checks=[]
for n in ['run_s2.py','rules_common.py','features_at_300s.csv.gz','ledger.csv.gz','results_s2.json','README.md']:
 b=urllib.request.urlopen(base+n).read();got=hashlib.sha256(b).hexdigest();assert got==want[n],n;(s/n).write_bytes(b);checks.append({'path':n,'sha256':got,'matches_manifest':True})
(r/'peer_checksums.json').write_text(json.dumps({'commit':commit,'source_run':'f006p2-20261112T025028Z','files':checks,'not_requested_manifest_files':['s1.log','s2.log'],'manifest_defect_already_recorded_by_coordinator':'R18'},indent=2))
p=json.load(urllib.request.urlopen('https://api.github.com/repos/bsc-volume-alert/Top-coins-Bot/git/commits/6e9db558fd1feb1745d4bd9be97c1ceb50c8166a'));(r/'parent.json').write_text(json.dumps(p));print('VERIFIED',len(checks),'TREE',p['tree']['sha'])
