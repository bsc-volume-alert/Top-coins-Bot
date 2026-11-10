"""Reproduce already-published ID34 only; no new search or hidden outcomes."""
import pathlib,sys,json,types,hashlib,math,collections,statistics,datetime as dt
root=pathlib.Path(__file__).parent;sys.path.insert(0,str(root))
import evaluate as ev
import explore
assert hashlib.sha256((root/'evaluate.py').read_bytes()).hexdigest()==explore.EXPECTED
assert not ev.DEV_NO_EVIDENCE
replay=root/'replay';replay.mkdir(exist_ok=True)
for p in (root/'data').glob('trades_part_*.csv.gz'):
 q=replay/p.name
 if not q.exists():q.symlink_to(p.resolve())
for src,dst in [('tokens_window.csv.gz','tokens.csv.gz'),('feed_gaps_all.csv.gz','feed_gaps.csv.gz')]:
 q=replay/dst
 if not q.exists():q.symlink_to((root/'data'/src).resolve())
# Six development outages exactly as published Codex adapter. Approximate bounds
# are an assumption, not evidence of exact outage duration.
intervals=[('06','20:40','20:42'),('06','20:57','21:06'),('06','23:33','23:35'),('07','00:06','00:08'),('07','00:26:30','00:27:30'),('06','21:40','21:45')]
text=''
for day,a,b in intervals:
 ts=[dt.datetime.fromisoformat('2026-11-'+day+'T'+t+'+00:00').timestamp() for t in (a,b)]
 text+=f'{ts[0]} {ts[1]} published_development_outage_assumption\n'
(replay/'outages.txt').write_text(text)
tok,gaps,outages,meta=ev.load(str(replay),explore.START,explore.END)
expected=json.loads((root/'expected_entries.json').read_text());lookup={r['mint']:r for rr in expected.values() for r in rr}
mod=types.SimpleNamespace(decide=lambda v:explore.features(list(v.trades),v.t,ev)[5],exit_signal=lambda p:False)
R={'name':'published_ID34','decision_offsets':[30],'on_trade':False,'horizon_s':60,'sizes':[.2,.02]}
stats={'mints_streamed':0,'duplicates_removed':0,'non_contiguous':0,'_done':set()};audit=collections.Counter();results={'early':[],'late':[]};checked=set();mismatches=[]
for m,L in ev.iter_mints(str(replay),tok,stats):
 info=tok[m];cum=0.;ret=info['tier']>=1
 for r in L:
  if r['venue'] in ('curve','') and r['is_buy']=='1':cum+=ev.fl(r['sol']) or 0.
  if cum>=15:ret=True;break
 if not ret:audit['not_retained_streams']+=1;continue
 if any(s<info['created']+7200 and e>info['created'] for s,e in outages):audit['outage_excluded']+=1;continue
 half='early' if info['created']<explore.SPLIT else 'late'
 if m not in lookup:mismatches.append({'mint':m,'error':'unexpected denominator mint'});continue
 prior=lookup[m];record={'mint':m,'half':half,'fees':{}}
 for fee in (30,125):
  r,hyp=ev.run_launch(mod,R,m,info,L,gaps,outages,meta,fee)
  if r['cat']!=prior['cat'] or hyp!=prior['hypothetical']:mismatches.append({'mint':m,'error':'category/hypothetical differs','actual':r['cat'],'expected':prior['cat']})
  if r['cat']=='scored':
   for size in (.2,.02):
    got=r['sizes'][str(size)]['net_sol'];want=prior['by_fee'][str(fee)][str(size)]
    if not math.isclose(got,want,rel_tol=1e-12,abs_tol=1e-12):mismatches.append({'mint':m,'fee':fee,'size':size,'actual':got,'expected':want})
  record['fees'][str(fee)]=r
 results[half].append(record);checked.add(m)
 if len(checked)%500==0:print('CHECKED',len(checked),flush=True)
assert stats['non_contiguous']==0,stats
missing=set(lookup)-checked
summary={}
for half,rr in results.items():
 summary[half]={}
 for fee in (30,125):
  for size in (.2,.02):
   cat=collections.Counter(r['fees'][str(fee)]['cat'] for r in rr);good=[r['fees'][str(fee)]['sizes'][str(size)]['net_sol'] for r in rr if r['fees'][str(fee)]['cat']=='scored'];total=math.fsum(good);N=len(rr);unknown=cat['unknown']
   summary[half][f'fee{fee}_size{size}']={'N':N,**dict(cat),'net_sol':total,'lower_total_sol':total-unknown*(size+.0015),'net_sol_per_eligible_launch':total/N,'mean_return':statistics.mean(good)/size,'median_return':statistics.median(good)/size,'win_rate':sum(x>0 for x in good)/len(good),'loss_ge50':sum(x<=-.5*size for x in good)/len(good),'without_best_net_sol':total-max(good),'worst_return':min(good)/size}
out={'task':'C001','research':'Reproduce published ID34, not new discovery','spec':R,'data_commit':'e67833121f1da0dc992c28fa26c5236a855c151a','evaluator_commit':'be9b5459e2f7670946d9ca012f875b77aaaf5d5b','checked_launches':len(checked),'expected_launches':len(lookup),'fee_scenarios':2,'sizes':[.2,.02],'mismatches':mismatches,'missing_mints':sorted(missing),'all_categories_and_values_match':not mismatches and not missing,'audit':dict(audit),'stream_stats':{k:v for k,v in stats.items() if k!='_done'},'summary':summary,'limitations':['Published strategy and validation outcomes were already known; no fresh confirmation','Frozen evaluator limitations and outage assumptions retained','No bootstrap or exposure recomputation; these are not newly verified here','No live execution evidence or profitability claim','No protected evaluation outcomes read']}
(root/'reproduction.json').write_text(json.dumps(out,indent=2));(root/'actual_ledger.json').write_text(json.dumps(results));print(json.dumps(out,indent=2),flush=True)
assert out['all_categories_and_values_match']
