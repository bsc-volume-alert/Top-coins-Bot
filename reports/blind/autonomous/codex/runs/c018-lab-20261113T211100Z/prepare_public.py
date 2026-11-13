"""Only public immutable GitHub metadata/approved peer raw-development ledger."""
import urllib.request,pathlib,json,hashlib
r=pathlib.Path(__file__).parent
u='https://api.github.com/repos/bsc-volume-alert/Top-coins-Bot/git/commits/02dc18bb26e5c79eee84c01a530f2099bc2227ba'
p=json.load(urllib.request.urlopen(u,timeout=30));(r/'parent.json').write_text(json.dumps(p));print('PARENT_TREE',p['tree']['sha'],flush=True)
u='https://raw.githubusercontent.com/bsc-volume-alert/Top-coins-Bot/a27c504dfe240fecf132123bcfc5c18cb2dd4091/reports/blind/autonomous/claude/runs/f014-20261113T185102Z/ledger.csv.gz'
b=urllib.request.urlopen(u,timeout=60).read();assert hashlib.sha256(b).hexdigest()=='93588088e038981a5555610a65eda4bbafe2d28fb407b9ef6f835235e7243e82';(r/'peer_f014/ledger.csv.gz').write_bytes(b);print('PEER_LEDGER_SHA256_OK',len(b),flush=True)
