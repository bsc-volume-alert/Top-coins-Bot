# Per-position results of the original replay run (imports replay.py UNCHANGED; writes one row per coin × exit × size × pricing).
import runpy,sys,io,contextlib,csv,gzip,math
S,OUT=sys.argv[1],sys.argv[2]
w=csv.writer(gzip.open(OUT,'wt'))
w.writerow(['pricing','size_sol','mint','label','create_ts','decision_ts','landing_ts','mc5_usd','band','exit','status','why_unavailable','entry_venue','stale_entry','tags','exit_ts','ret_primary','ret_scenario_b','net_sol_primary','cross_ts'])
for pp in ('trade','reserve'):
  sys.argv=['x',S+'/cohort.json',S+'/cohort_trades.pkl.gz',S+'/gaps1,'+S+'/k100trades',S+'/dump_tmp_'+pp,pp]
  with contextlib.redirect_stdout(io.StringIO()): g=runpy.run_path('/home/claude/top-coins-bot/reports/analysis/100k/replay_9nov/replay.py')
  COH,run,band,score,BN=g['COH'],g['run'],g['band'],g['score'],g['BN']
  for size in (0.2,0.02):
    for r in COH:
      res=run(r,size); bi=band(r['mc5'])
      for e,x in res.items():
        a,b=score(x,size) if x['status']!='UNAVAILABLE' else (None,None)
        w.writerow([pp,size,r['mint'],r['label'],r['create_ts'],r['decision_ts'],math.floor(r['decision_ts']+1),r['mc5'],BN[bi] if bi is not None else '',e,x['status'],x.get('why',''),x.get('entry_venue',''),x.get('stale_entry',''),';'.join(x.get('tags',[])),x.get('exit_ts',''),a,b,(a*size if a is not None else ''),r['cross_ts'] or ''])
print('done')
