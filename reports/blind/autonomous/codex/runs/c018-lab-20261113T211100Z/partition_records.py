"""Partition lossless CSV ledgers to keep GitHub research artifacts reviewable."""
import pathlib,csv
r=pathlib.Path(__file__).parent
for name,size in [('creator_features',200),('trades_control',100),('trades_candidate',100),('trades_removed',100)]:
 with (r/(name+'.csv')).open(newline='') as f:rd=csv.DictReader(f);fields=rd.fieldnames;rows=list(rd)
 for i in range(0,len(rows),size):
  with (r/(name+'_'+str(i//size+1).zfill(2)+'.csv')).open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows[i:i+size])
