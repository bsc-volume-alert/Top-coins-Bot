"""Public immutable GitHub metadata and count-only feature file; no outcomes."""
import pathlib,urllib.request,json,hashlib
r=pathlib.Path(__file__).parent
u='https://api.github.com/repos/bsc-volume-alert/Top-coins-Bot/git/commits/91cc5de93d6c7e1984824a44006227cb095e68c1'
x=json.load(urllib.request.urlopen(u,timeout=30));(r/'parent.json').write_text(json.dumps(x));print('TREE',x['tree']['sha'],flush=True)
u='https://raw.githubusercontent.com/bsc-volume-alert/Top-coins-Bot/253604de64fc9b2b43effa44b245f1323c4f4201/reports/blind/autonomous/claude/runs/f016-20261114T025106Z/f016_features.csv.gz'
b=urllib.request.urlopen(u,timeout=60).read();assert hashlib.sha256(b).hexdigest()=='3f13ab7f68cdc292df677a2f9dcae8c4c7c7215c878c451007aa4329ce515020';(r/'peer_f016/f016_features.csv.gz').write_bytes(b);print('FEATURE_SHA_OK',len(b),flush=True)
