"""Execute original C009 strict and ONLY registered main-gap tolerance modification."""
import pathlib,sys,hashlib,json
root=pathlib.Path(__file__).parent
source=root.parent/'c009-20261111T181843Z/autopsy.py'
s=source.read_text()
mode=sys.argv[1];assert mode in ['strict','tol30']
(root/'c009_source.sha256').write_text(hashlib.sha256(source.read_bytes()).hexdigest()+'  ../c009-20261111T181843Z/autopsy.py\n')
s=s.replace("root=pathlib.Path(__file__).parent;", "root=pathlib.Path(__file__).parent;")
if mode=='tol30':
 needle="stats={'mints_streamed'"
 assert needle in s
 s=s.replace(needle,"label_gaps={**gaps,'main':[(s,e) for s,e in gaps['main'] if e-s>=30]}\n"+needle,1)
 # R2 tolerance is for LABELS only. Execution continues to use original gaps.
 for old,new in [
  ("not ev.gap_overlap(gaps,outages,t+1,tr,", "not ev.gap_overlap(label_gaps,outages,t+1,tr,"),
  ("not ev.gap_overlap(gaps,outages,t+1,t+7200,", "not ev.gap_overlap(label_gaps,outages,t+1,t+7200,")]:
  assert s.count(old)==1
  s=s.replace(old,new)
for n in ['checksums.json','results.json','records.json','matched_pairs.json']:
 s=s.replace("root/'"+n+"'","root/'"+mode+'_'+n+"'")
exec(compile(s,str(source),'exec'),{'__file__':str(root/'executed_c009.py'),'__name__':'__main__'})
