import pathlib,urllib.request,json,hashlib
root=pathlib.Path(__file__).parent;src=root/'claude_source';src.mkdir(exist_ok=True)
commit='7a9cd6a98680b660d15b952079b7f367d3ad180f';base='https://raw.githubusercontent.com/bsc-volume-alert/Top-coins-Bot/'+commit+'/reports/blind/autonomous/claude/runs/f006-20261111T185410Z/'
manifest=urllib.request.urlopen(base+'ARTIFACT_SHA256SUMS.txt').read();(src/'ARTIFACT_SHA256SUMS.txt').write_bytes(manifest)
checks={n.removeprefix('./'):sha for sha,n in (l.split(maxsplit=1) for l in manifest.decode().splitlines())};out=[]
for n in ['build_features.py','analyze.py','build_summary.json','results.json','features_labels.csv.gz','matched/matched_sustained2x_300s.csv.gz','PROTOCOL.md','README.md']:
 b=urllib.request.urlopen(base+n).read();got=hashlib.sha256(b).hexdigest();assert got==checks[n],n;p=src/n;p.parent.mkdir(exist_ok=True,parents=True);p.write_bytes(b);out.append({'path':n,'sha256':got,'ok':True})
(root/'claude_source_checksums.json').write_text(json.dumps({'commit':commit,'files':out},indent=2));print('CLAUDE_ARTIFACT_CHECKSUMS',len(out),'PASS',flush=True)
p=json.load(urllib.request.urlopen('https://api.github.com/repos/bsc-volume-alert/Top-coins-Bot/git/commits/47ac802f25258cd4f5a8b110935e50785fc29daf'));(root/'parent.json').write_text(json.dumps(p));print('TREE',p['tree']['sha'],flush=True)
