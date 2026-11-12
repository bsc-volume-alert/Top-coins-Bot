import pathlib,urllib.request,hashlib,json
r=pathlib.Path(__file__).parent;d=r/'peer_source';d.mkdir(exist_ok=True)
sha='c1cf6d39b942de76771d79ba403856a1526db0df';base='https://raw.githubusercontent.com/bsc-volume-alert/Top-coins-Bot/'+sha+'/reports/blind/autonomous/claude/runs/f008-20261112T065028Z/'
man=urllib.request.urlopen(base+'ARTIFACT_SHA256SUMS.txt').read();(d/'ARTIFACT_SHA256SUMS.txt').write_bytes(man);want={n:h for h,n in (z.split(maxsplit=1) for z in man.decode().splitlines())};data=urllib.request.urlopen(base+'claude_only_runners.csv').read();assert hashlib.sha256(data).hexdigest()==want['claude_only_runners.csv'];(d/'claude_only_runners.csv').write_bytes(data)
(r/'peer_integrity.json').write_text(json.dumps({'source_commit':sha,'requested_file':'claude_only_runners.csv','sha256':hashlib.sha256(data).hexdigest(),'matches_manifest':True},indent=2))
p=json.load(urllib.request.urlopen('https://api.github.com/repos/bsc-volume-alert/Top-coins-Bot/git/commits/c17f7f65efbfef247cef33cc329d9cba0751a37a'));(r/'parent.json').write_text(json.dumps(p));print('PEER_HASH_VERIFIED TREE',p['tree']['sha'])
