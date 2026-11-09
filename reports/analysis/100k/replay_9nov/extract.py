# Stream both trade exports from git (no local copies), keep cohort mints only, dedup by full fingerprint, save compact per-mint lists.
import subprocess,gzip,csv,io,json,sys,pickle,collections
REPO='/home/claude/top-coins-bot'; coh=json.load(open(sys.argv[1]))['rows']; OUT=sys.argv[2]
want={r['mint'] for r in coh}
T=collections.defaultdict(list); seen=set(); dup=0; n=0
for br in ('entry-all-20261107t2210','entry-all-20261108t2002'):
  files=subprocess.run(['git','-C',REPO,'ls-tree','--name-only','origin/'+br],capture_output=True,text=True).stdout.split()
  for fn in sorted(x for x in files if x.startswith('trades_part_')):
    p=subprocess.Popen(['git','-C',REPO,'show',f'origin/{br}:{fn}'],stdout=subprocess.PIPE)
    for r in csv.DictReader(io.TextIOWrapper(gzip.GzipFile(fileobj=p.stdout))):
      m=r['mint']
      if m not in want: continue
      fp=(m,r['sig'],r['ev_idx'],r['venue'],r['is_buy'],r['sol'],r['tokens'])
      if fp in seen: dup+=1; continue
      seen.add(fp); n+=1
      T[m].append((int(r['slot']),int(r['ev_idx']) if r['ev_idx'] else -1,int(r['row_id']),int(r['ts']),r['venue'],r['is_buy']=='1',float(r['sol']),float(r['tokens']),float(r['price_sol']),
                   float(r['vsol']) if r['vsol'] else None,float(r['vtok']) if r['vtok'] else None,
                   int(r['pool_quote_raw']) if r['pool_quote_raw'] else None,int(r['pool_base_raw']) if r['pool_base_raw'] else None,r['px_adj']))
    p.wait(); print(br,fn,n,dup,flush=True)
for m in T: T[m].sort(key=lambda x:(x[0],x[1],x[2]))
pickle.dump(dict(T),gzip.open(OUT,'wb')); print('mints with trades',len(T),'of',len(want),'rows',n,'dups',dup)
