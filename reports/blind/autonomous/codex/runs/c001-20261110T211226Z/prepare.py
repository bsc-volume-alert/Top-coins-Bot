import urllib.request,pathlib,json,hashlib,concurrent.futures
root=pathlib.Path(__file__).parent;data=root/'data';data.mkdir(exist_ok=True)
repo='https://raw.githubusercontent.com/bsc-volume-alert/Top-coins-Bot/'
dev='e67833121f1da0dc992c28fa26c5236a855c151a'
manifest=urllib.request.urlopen(repo+dev+'/SHA256SUMS.txt').read();(data/'SHA256SUMS.txt').write_bytes(manifest)
def get(job):
 want,p=job;o=data/p
 if not o.exists():
  with urllib.request.urlopen(repo+dev+'/'+p,timeout=90) as src,o.open('wb') as dst:
   while b:=src.read(1024*1024):dst.write(b)
 got=hashlib.file_digest(o.open('rb'),'sha256').hexdigest();assert want==got,(p,want,got)
 return {'path':p,'sha256':got,'bytes':o.stat().st_size,'ok':True}
jobs=[line.split(maxsplit=1) for line in manifest.decode().splitlines() if line.strip()]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:checks=list(ex.map(get,jobs))
(root/'data_checksums.json').write_text(json.dumps(checks,indent=2));print('DATA CHECKSUMS',len(checks),'PASS',flush=True)
commit=json.load(urllib.request.urlopen('https://api.github.com/repos/bsc-volume-alert/Top-coins-Bot/commits/93a9ed57'))['sha']
files={'explore.py':(commit,'reports/blind/codex_r2/explore.py'),'expected_entries.json':(commit,'reports/blind/codex_r2/results/selected_entries.json'),'expected_results.json':(commit,'reports/blind/codex_r2/results/results.json'),'evaluate.py':('be9b5459e2f7670946d9ca012f875b77aaaf5d5b','reports/blind/eval/evaluate.py')}
sources={}
for name,(sha,p) in files.items():
 b=urllib.request.urlopen(repo+sha+'/'+p).read();(root/name).write_bytes(b);sources[name]={'commit':sha,'path':p,'sha256':hashlib.sha256(b).hexdigest()}
(root/'sources.json').write_text(json.dumps(sources,indent=2));print('SOURCES',json.dumps(sources),flush=True)
