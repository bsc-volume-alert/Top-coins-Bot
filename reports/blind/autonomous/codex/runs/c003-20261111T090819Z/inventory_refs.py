"""Metadata only: never fetch protected outcome file contents."""
import urllib.request,json,pathlib,concurrent.futures
root=pathlib.Path(__file__).parent;b=json.loads((root/'branches.json').read_text());base='https://api.github.com/repos/bsc-volume-alert/Top-coins-Bot/'
selected=[r for r in b if any(x in r['name'].lower() for x in ['k100','100k','replay','audit']) or r['name'] in ['research-codex','tracker']]
def inspect(r):
 sha=r['commit']['sha'];d=json.load(urllib.request.urlopen(base+'git/trees/'+sha+'?recursive=1'));c=json.load(urllib.request.urlopen(base+'git/commits/'+sha))
 files=[x for x in d['tree'] if x['type']=='blob'];relevant=[{'path':x['path'],'bytes':x.get('size'),'blob_sha':x['sha']} for x in files if r['name'] not in ['tracker','research-codex'] or any(z in x['path'].lower() for z in ['manifest','sha256','k100','100k','replay','k_book','k-book'])];agents=[x['path'] for x in files if x['path'].endswith('AGENTS.md')]
 return {'branch':r['name'],'commit':sha,'tree':c['tree']['sha'],'committer_time':c['committer']['date'],'tree_truncated':d.get('truncated'),'blob_count':len(files),'relevant_files':relevant,'agents_files':agents,'contents_read':False,'development_use':'initially_allowlisted_only' if r['name']=='research-codex' else 'not_released_for_outcome_analysis'}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:rows=list(ex.map(inspect,selected))
(root/'remote_inventory.json').write_text(json.dumps(rows,indent=2));print(json.dumps([{'branch':x['branch'],'commit':x['commit'],'files':len(x['relevant_files']),'agents':x['agents_files']} for x in rows],indent=2))
