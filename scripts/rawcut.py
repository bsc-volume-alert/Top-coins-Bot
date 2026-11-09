# Copy the RAW export rows (unchanged lines, all columns) of the replay cohort's mints out of the two immutable trade exports.
import subprocess,gzip,io,json,sys,csv
REPO='/home/claude/top-coins-bot'; want={r['mint'] for r in json.load(open(sys.argv[1]))['rows']}; OUT=sys.argv[2]
LIM=75_000_000
for br,commit in (('entry-all-20261107t2210','e6783312'),('entry-all-20261108t2002','05f47f12')):
  files=sorted(x for x in subprocess.run(['git','-C',REPO,'ls-tree','--name-only','origin/'+br],capture_output=True,text=True).stdout.split() if x.startswith('trades_part_'))
  part=0; w=None; raw=None; hdr=None; rows=0
  def new():
    global part,w,raw
    if w: w.close(); raw.close()
    part+=1; raw=open(f"{OUT}/trades_{br}_cohort_{part:03d}.csv.gz",'wb'); w=gzip.GzipFile(fileobj=raw,mode='wb',compresslevel=9); w.write(hdr)
  for fn in files:
    p=subprocess.Popen(['git','-C',REPO,'show',f'origin/{br}:{fn}'],stdout=subprocess.PIPE)
    g=gzip.GzipFile(fileobj=p.stdout); h=g.readline()
    if hdr is None: hdr=h; new()
    mi=hdr.decode().split(',').index('mint')
    for line in g:
      # mint is column 2; sig/wallet contain no commas; fast split on first 3 commas
      if line.split(b',',3)[1].decode() in want:
        w.write(line); rows+=1
        if raw.tell()>LIM: new()
    p.wait()
  w.close(); raw.close(); print(br,commit,'rows',rows,'parts',part,flush=True)
