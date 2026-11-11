"""F001 independent re-derivation (own code, not Codex's) of the headline C003/C004 scoreboard numbers from the raw allowlisted package."""
import gzip,csv,json,statistics,sys,collections,pathlib
pkg=pathlib.Path(sys.argv[1]); out={}
def read(p):
    with gzip.open(p,'rt',newline='') as f: return list(csv.DictReader(f))
def pct(v,p):
    v=sorted(v); a=(len(v)-1)*p; i=int(a); return v[i]+(v[min(i+1,len(v)-1)]-v[i])*(a-i)
# C004
live={}
for snap in ('snapshot3','current'):
    for r in read(pkg/snap/'live_trades.csv.gz'): live[json.dumps(r,sort_keys=True)]=r
rows=list(live.values()); conf=[r for r in rows if r['buy_status']=='confirmed']
bm=[float(r['buy_ms']) for r in conf]; lag=[float(r['buy_lag_s']) for r in conf]
out['c004']={'unique_live_records_union':len(rows),'confirmed':len(conf),'buy_status':dict(collections.Counter(r['buy_status'] for r in rows)),
 'buy_ms_median':statistics.median(bm),'buy_ms_p95_linear':pct(bm,.95),'buy_lag_s_median':statistics.median(lag),'buy_lag_s_p95':pct(lag,.95),
 'stake_sol_all_0.02':all(float(r['stake_sol'])==0.02 for r in conf),'buy_ms_le1000':sum(x<=1000 for x in bm),'lag_le1':sum(x<=1 for x in lag),
 'all_confirmed_have_sell_confirmed':all(r['sell_status']=='confirmed' for r in conf),'sell_tries_gt1':sum(float(r['sell_tries'] or 0)>1 for r in conf)}
q={}
for snap in ('snapshot3','current'):
    for r in read(pkg/snap/'fd_quotes.csv.gz'): q[json.dumps(r,sort_keys=True)]=r
qm=[float(r['q_ms']) for r in q.values()]
out['c004']['quotes_union']=len(q); out['c004']['q_ms_median']=statistics.median(qm); out['c004']['q_ms_p95']=pct(qm,.95); out['c004']['quote_unique_mints']=len({r['mint'] for r in q.values()})
# C003
c3={}
for snap in ('snapshot3','current'):
    census={r['mint'] for r in read(pkg/snap/'tracker_tokens.csv.gz')}
    life=read(pkg/snap/'token_life.csv.gz'); lm={r['mint'] for r in life}
    cross=read(pkg/snap/'coverage_crossings.csv.gz')
    def fl(x):
        try: return float(x)
        except: return None
    c3[snap]={'census_unique_mints':len(census),'life_rows':len(life),'life_mints':len(lm),'census_without_life':len(census-lm),
      'life_missing_obs_ts':sum(r['obs_ts']=='' for r in life),
      'mints_cp_ge_7200':len({r['mint'] for r in life if (fl(r['cp']) or -1)>=7200}),'mints_cp_ge_86400':len({r['mint'] for r in life if (fl(r['cp']) or -1)>=86400}),
      'max_cp':max((fl(r['cp']) or 0) for r in life),
      'crossings_rows':len(cross),'suspect_jump':sum(r['suspect_jump']=='1' for r in cross),'fx_age_gt60':sum((fl(r['sol_usd_age_s']) or 0)>60 for r in cross),'fx_age_max':max((fl(r['sol_usd_age_s']) or 0) for r in cross),
      'registry_rows':len(read(pkg/snap/'runner_registry.csv.gz'))}
out['c003']=c3
json.dump(out,open(sys.argv[2],'w'),indent=2); print(json.dumps(out,indent=2))
