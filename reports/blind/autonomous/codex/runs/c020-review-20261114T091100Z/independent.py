"""Independent raw F016 feature/clock reconstruction; no peer helper functions."""
import pathlib,csv,gzip,json,hashlib,collections,statistics,math,bisect,importlib.util,sys
sys.dont_write_bytecode=True
r=pathlib.Path(__file__).parent;c=r.parent/'c001-20261110T211226Z'
sp=importlib.util.spec_from_file_location('frozen_ev',c/'evaluate.py');ev=importlib.util.module_from_spec(sp);sp.loader.exec_module(ev);assert hashlib.sha256((c/'evaluate.py').read_bytes()).hexdigest()=='f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86'
verified=[]
for line in (c/'data/SHA256SUMS.txt').read_text().splitlines():
 h,n=line.split(maxsplit=1);got=hashlib.sha256((c/'data'/n).read_bytes()).hexdigest();assert h==got;verified.append({'path':n,'sha256':got})
with gzip.open(c/'data/tokens_window.csv.gz','rt') as f:meta={z['mint']:z for z in csv.DictReader(f)}
tok,gaps,outages,_=ev.load(str(c/'replay'),1793950800,1794081600);stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};records=[];denclock=[];source=collections.Counter()
def number(z,k):return ev.fl(z[k])
def curve(z):return z['venue'] in ('','curve')
def receipt(z):return (number(z,'recv_ms') or number(z,'ts')*1000)/1000
def px(z):
 if not z:return None
 a,b=number(z,'vsol'),number(z,'vtok')
 return (a/1e9)/(b/1e6) if a and b and a>0 and b>0 else None
def rank_correlation(xs):
 ranks=[sum(y<x for y in xs)+(sum(y==x for y in xs)+1)/2 for x in xs]
 a=statistics.mean(ranks);b=(len(xs)-1)/2;den=math.sqrt(math.fsum((x-a)**2 for x in ranks)*math.fsum((i-b)**2 for i in range(len(xs))))
 return math.fsum((x-a)*(i-b) for i,x in enumerate(ranks))/den if den else None
for m,L in ev.iter_mints(str(c/'replay'),tok,stats):
 info=tok[m];created=info['created'];total=0;ret=None;retrow=None
 for z in L:
  if not curve(z):continue
  if z['is_buy']=='1':total+=number(z,'sol') or 0
  if info['tier']>=1 or total>=15:ret=receipt(z);retrow=z;break
 if ret is None or any(a<created+7200 and b>created for a,b in outages):continue
 denclock.append(int(created)%60);cs=int(meta[m]['create_slot']);slotrows=[z for z in L if int(z['slot'])==cs]
 if slotrows:
  source['has_creation_slot_row']+=1
  if int(created) in {int(float(z['ts'])) for z in slotrows}:source['create_ts_equals_block_ts']+=1
  elif int(created) in {int(float(z['recv_ms'])//1000) for z in slotrows if number(z,'recv_ms')}:source['create_ts_equals_recv_floor_not_block']+=1
  else:source['create_ts_equals_neither']+=1
 else:source['no_creation_slot_row']+=1
 t=created+300
 P=sorted([z for z in L if receipt(z)<=t],key=lambda z:(receipt(z)*1000,int(z['slot']),int(z['row_id'])))
 if ret>t or not P or not curve(P[-1]) or not ev.state_ok(P[-1]):continue
 buys=[z for z in P if curve(z) and z['is_buy']=='1'];B=[z for z in buys if float(z['ts'])>t-60];W={z['wallet'] for z in B}
 if len(W)<5:continue
 cr=meta[m]['creator'];creator_sold=math.fsum(number(z,'tokens') or 0 for z in P if z['wallet']==cr and z['is_buy']!='1');creator_present=any(z['wallet']==cr for z in P)
 cell='C' if creator_sold>0 else 'B' if creator_present else 'A';half='early' if created<1794016200 else 'late'
 valid=[z for z in P if curve(z) and ev.state_ok(z)];before={z['wallet'] for z in buys if float(z['ts'])<=t-60};cnt=collections.Counter(z['wallet'] for z in B);add=W&before;repeat={w for w,n in cnt.items() if n>=2 and w not in before};share=len(add)/len(W)
 R=[z for z in P if receipt(z)>t-60 and curve(z)];Rb=[z for z in R if z['is_buy']=='1'];buytimes=[receipt(z) for z in Rb];deltas=[b-a for a,b in zip(buytimes,buytimes[1:])];cv=None
 if len(buytimes)>=10:
  mean=math.fsum(deltas)/len(deltas)
  if mean>0:cv=math.sqrt(math.fsum((d-mean)**2 for d in deltas)/len(deltas))/mean
 bs=math.fsum(number(z,'sol') or 0 for z in Rb);ss=math.fsum(number(z,'sol') or 0 for z in R if z['is_buy']!='1');sratio=ss/bs if bs>0 else None
 outside=[number(z,'sol') or 0 for z in buys if z['wallet']!=cr];rho=rank_correlation(outside[-10:]) if len(outside)>=10 else None
 pr=px(retrow) if ev.state_ok(retrow) else None;pt=px(valid[-1]) if valid else None;ratio=pt/pr if pt and pr else None;clock=int(created)%60
 RTrecent={z['wallet'] for z in buys if receipt(z)>t-60};RTbefore={z['wallet'] for z in buys if receipt(z)<=t-60};RTshare=len(RTrecent&RTbefore)/len(RTrecent) if RTrecent else None
 z={'mint':m,'half':half,'cell':cell,'created':created,'tier':info['tier'],'buyers_last_60s':len(W),'p1_price_ratio':ratio,'p1_ret_state_ok':pr is not None,'p1_veto':ratio is not None and ratio<1,'p2_adder_share':share,'p2_n_W':len(W),'p2_n_adders':len(add),'p2_n_repeat_only':len(repeat),'p2_veto':share<.25,'p3_n_buys60':len(buytimes),'p3_cv':cv,'p3_veto':cv is not None and cv<.5,'clp1_buy_sol60':bs,'clp1_sell_sol60':ss,'clp1_n_sells60':sum(z['is_buy']!='1' for z in R),'clp1_s':sratio,'clp1_veto':sratio is not None and sratio>=.5,'clp2_n_outside_buys':len(outside),'clp2_rho':rho,'clp2_veto':rho is not None and rho<=-.5,'clp3_create_mod60':clock,'clp3_veto':clock in {58,59,0,1,2},'receipt_adder_share':RTshare,'receipt_adder_veto':RTshare is not None and RTshare<.25,'receipt_buyers':len(RTrecent)}
 records.append(z)
assert len(records)==679 and len(denclock)==3638 and stats['non_contiguous']==0
def clock(vals):
 c=collections.Counter(vals);n=len(vals);obs=[c.get(i,0) for i in range(60)];expected=n/60
 return {'n':n,'counts_mod60':obs,'chi2':math.fsum((a-expected)**2/expected for a in obs),'bin_58_2':sum(obs[i] for i in [58,59,0,1,2])}
def counts(rr,key):return {'n':len(rr),'veto':sum(z[key] for z in rr)}
bind={key:{'all':counts(records,key),'by_half':{h:counts([z for z in records if z['half']==h],key) for h in ['early','late']},'by_cell':{h:counts([z for z in records if z['cell']==h],key) for h in ['A','B','C']}} for key in ['p1_veto','p2_veto','p3_veto','clp1_veto','clp2_veto','clp3_veto','receipt_adder_veto']}
out={'counts_only':True,'independent_raw_implementation':True,'peer_helpers_imported':False,'population':679,'bind_counts':bind,'clock_census':clock([int(float(z['create_ts']))%60 for z in meta.values()]),'clock_E':clock([z['clp3_create_mod60'] for z in records]),'clock_denominator':clock(denclock),'create_ts_source':dict(source),'adder_clock_cross_tab':dict(collections.Counter(('both' if z['p2_veto'] and z['receipt_adder_veto'] else 'block_only' if z['p2_veto'] else 'receipt_only' if z['receipt_adder_veto'] else 'neither') for z in records)),'stats':{k:v for k,v in stats.items() if k!='_done'}}
(r/'independent_counts.json').write_text(json.dumps(out,indent=2)+'\n');(r/'independent_records.json').write_text(json.dumps(records));(r/'input_checksums.json').write_text(json.dumps(verified,indent=2)+'\n')
with (r/'independent_features.csv').open('w',newline='') as f:w=csv.DictWriter(f,fieldnames=list(records[0]));w.writeheader();w.writerows(records)
print(json.dumps({'counts':{k:v['all'] for k,v in bind.items()},'clock':out['clock_census'],'cross_tab':out['adder_clock_cross_tab']},indent=2))
