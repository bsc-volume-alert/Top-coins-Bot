# Reconciliation for the Entry Features & Winners snapshot (7 Nov 2026). Run: python3 -I reconcile.py <dir with unzipped CSVs> [<prev 6 Nov 18:23 dir>] [<prev 7 Nov 08:53 dir>]
import csv,sys,json,collections,time,calendar
U=lambda x:calendar.timegm(time.strptime(x,'%Y-%m-%d %H:%M'))
csv.field_size_limit(10**9)
D=sys.argv[1]; PREV=sys.argv[2] if len(sys.argv)>2 else None; PREV9=sys.argv[3] if len(sys.argv)>3 else None
T=lambda t:time.strftime('%d %b %H:%M:%S',time.gmtime(int(float(t))))
def rd(p):
  try: return list(csv.DictReader(open(p,newline='')))
  except FileNotFoundError: return None
P=print; C=collections.Counter
SNAP2=calendar.timegm(time.strptime('2026-11-06 18:23:11','%Y-%m-%d %H:%M:%S'))  # 2026-11-06 18:23:11 UTC (previous frozen snapshot 2)
assert time.strftime('%Y-%m-%d %H:%M:%S',time.gmtime(SNAP2))=='2026-11-06 18:23:11'
tt=rd(D+'/tracker_tokens.csv'); fw=rd(D+'/fd_watch.csv'); dec=rd(D+'/fd_decisions.csv'); pos=rd(D+'/fd_positions.csv')
cf=rd(D+'/chain_fill.csv'); vp=rd(D+'/vol_paper.csv'); led=rd(D+'/fd_ledger.csv'); tb=rd(D+'/trades_books.csv'); tl=rd(D+'/token_life.csv'); ec=rd(D+'/early_checkpoints.csv'); rr=rd(D+'/runner_registry.csv')
def rng(rows,k): v=[int(float(r[k])) for r in rows if r.get(k) not in (None,'')]; return f"{T(min(v))} → {T(max(v))} UTC" if v else '-'
P("RECONCILIATION — Entry Features & Winners snapshot (launcher-data d15ddf2a, exported 2026-11-07 11:54:21 UTC = UK)\n")
P("1. FILE WINDOWS (retention differs per file — a mint missing from one file is NOT an absent event)")
for n,rows,k in (('tracker_tokens (census)',tt,'create_ts'),('fd_watch (launcher record)',fw,'created_ts'),('fd_decisions',dec,'ts'),('fd_positions (decision time)',pos,'ts_decision'),('chain_fill (entry)',cf,'entry_ts'),('vol_paper (entry)',vp,'entry_ts'),('fd_ledger (created)',led,'created_ts'),('token_life (checkpoint ts)',tl,'ts'),('early_checkpoints (created)',ec,'create_ts'),('trades_books (trade ts)',tb,'ts'),('runner_registry (created)',rr,'create_ts')):
  P(f"  {n:32s} rows {len(rows):>9,}  {rng(rows,k)}")
P("\n2. POPULATION")
mints_tt={r['mint'] for r in tt}; P(f"  distinct launches in census: {len(mints_tt):,}")
chk=[r for r in fw if r['checks'] not in ('','[]')]; ent=[r for r in fw if r['entered']]
P(f"  fd_watch launches {len(fw):,} · with ≥1 check {len(chk):,} · entered by ≥1 book {len(ent):,} · funding pass (pre=1) {sum(r['pre']=='1' for r in fw):,} · pre_nb=1 {sum(r['pre_nb']=='1' for r in fw):,} · screened {sum(r['screened']=='1' for r in fw):,}")
P(f"  fd_watch lookup_status: {dict(C(r['lookup_status'] or '(empty)' for r in fw).most_common())}")
P(f"  fd_watch launches not in census window: {len({r['mint'] for r in fw}-mints_tt):,} (census holds 48 h; fd_watch ~36 h — differing windows, not missing launches)")
P("\n3. DECISIONS vs POSITIONS vs UNIQUE COINS")
P(f"  fd_decisions rows {len(dec):,} · distinct (mint, check) {len({(r['mint'],r['at']) for r in dec}):,} · distinct mints {len({r['mint'] for r in dec}):,} · passed=1 rows {sum(r['passed']=='1' for r in dec):,}")
P(f"  decision reasons (top): {dict(C(r['reason'].split(':')[0] for r in dec).most_common(10))}")
P(f"  decision timing: {dict(C(r['timing'] for r in dec))} · epoch: {dict(C(r['epoch'] for r in dec))}")
P(f"  fd_positions {len(pos):,} · distinct mints {len({r['mint'] for r in pos}):,} · distinct same_decision_key {len({r['same_decision_key'] for r in pos}):,}")
P(f"  status: {dict(C(r['status'] for r in pos))} · i02_status: {dict(C(r['i02_status'] for r in pos))}")
P(f"  chain_fill rows {len(cf):,} (done {sum(r['done']=='1' for r in cf):,}) · s_fail_kind: {dict(C(r['s_fail_kind'] or '(none)' for r in cf).most_common(6))}")
P(f"  vol_paper rows {len(vp):,} · by strat family: {len({r['strat'] for r in vp})} strats")
P("\n4. BY BOOK (fd_positions): positions · unique mints · closed · open · skipped-dump · timing ontime/late · h4 epoch1/epoch2 · mean r_frac_020 closed · mean i02_r_frac closed")
bb=collections.defaultdict(list)
for r in pos: bb[r['book']].append(r)
def mean(v): v=[float(x) for x in v if x not in ('',None)]; return f"{sum(v)/len(v):+.3f}" if v else '   -  '
for b,rows in sorted(bb.items(),key=lambda x:-len(x[1])):
  c=C(r['status'] for r in rows); tm=C(r['timing'] for r in rows); ep=C(r['h4_epoch'] for r in rows)
  cl=[r for r in rows if r['status']=='closed']
  P(f"  {b:8s} {len(rows):>5} · {len({r['mint'] for r in rows}):>4} · {c['closed']:>5} · {c['open']:>3} · {c['skipped-dump']:>3} · {tm['ontime']:>4}/{tm['late']:<4} · {ep['h4-epoch1']:>4}/{ep['h4-epoch2']:<4} · {mean(r['r_frac_020'] for r in cl)} · {mean(r['i02_r_frac'] for r in cl)}")
P("  (r means are per position, unweighted, overlapping books share coins — descriptive only; NOT independent results)")
P("\n5. MEASUREMENT EPOCHS (by decision time; boundaries from the deploy log — see MANIFEST)")
F3=U('2026-11-06 20:00'); EP=[('before fill-3 (0.9.34, 6 Nov 20:00 UTC)',0,F3),('fill-3 → concurrent checks (0.9.35, 20:31)',F3,U('2026-11-06 20:31')),('concurrent → per-check deadline (0.9.47, 7 Nov 04:31)',U('2026-11-06 20:31'),U('2026-11-07 04:31')),('0.9.47 onward',U('2026-11-07 04:31'),9e9)]
for n,a,b in EP:
  rows=[r for r in pos if a<=int(float(r['ts_decision']))<b]; P(f"  {n:52s} positions {len(rows):>5} · mints {len({r['mint'] for r in rows}):>4}")
P("  NOTE: rule_ver in fd_positions is the version at EXPORT (all 0.9.50), not at decision; use ts_decision against the deploy log. fill_mv = 'fill-2' on every row; the i02_* (fill-3) columns on rows decided before 6 Nov 20:00 UTC were computed by code that did not exist at the decision → treat as RECONSTRUCTED, not contemporaneous.")
pre3=[r for r in pos if int(float(r['ts_decision']))<F3 and r['i02_r_frac'] not in('',None)]
P(f"  positions decided before fill-3 that nevertheless carry an i02_r_frac: {len(pre3):,}")
P("\n6. NEW SINCE THE PREVIOUS SNAPSHOT (6 Nov 18:23:11 UTC)")
P(f"  census launches created after it: {sum(int(r['create_ts'])>SNAP2 for r in tt):,} · fd_watch: {sum(int(r['created_ts'] or 0)>SNAP2 for r in fw):,} · positions decided after it: {sum(int(float(r['ts_decision']))>SNAP2 for r in pos):,} (mints {len({r['mint'] for r in pos if int(float(r['ts_decision']))>SNAP2}):,})")
for lab,PD in (('6 Nov 18:23:11 snapshot',PREV),('7 Nov 08:53:05 snapshot',PREV9)):
  if not PD: continue
  pp=rd(PD+'/fd_positions.csv'); pc=rd(PD+'/chain_fill.csv'); pdd=rd(PD+'/fd_decisions.csv')
  if pp is None: continue
  key=lambda r:(r['vol_id'],r['book'])
  now={key(r) for r in pos}; old={key(r) for r in pp}
  P(f"  vs {lab}: positions then {len(old):,} · still present {len(old&now):,} · NO LONGER IN CURRENT EXPORT {len(old-now):,} (aged out of the 24-h window — retained only in that snapshot) · new {len(now-old):,}")
  om={r['mint'] for r in pp}; P(f"     mints then {len(om):,} · mints no longer present {len(om-{r['mint'] for r in pos}):,}")
  if pc is not None:
    oc={r['vol_id'] for r in pc}; nc={r['vol_id'] for r in cf}; P(f"     chain_fill then {len(oc):,} · no longer present {len(oc-nc):,}")
  if pdd is not None:
    od={(r['mint'],r['at'],r['rule']) for r in pdd}; nd={(r['mint'],r['at'],r['rule']) for r in dec}; P(f"     fd_decisions then {len(od):,} · no longer present {len(od-nd):,}")
  # changed values on positions present in both (closed then vs now)
  pm={key(r):r for r in pp}; ch=sum(1 for r in pos if key(r) in pm and pm[key(r)]['status']=='closed' and r['status']=='closed' and pm[key(r)]['r_frac_020']!=r['r_frac_020'])
  P(f"     positions closed in both with a DIFFERENT r_frac_020 now: {ch}")
P("\n7. TRADE HISTORIES (trades_books.csv)")
tbm=collections.defaultdict(lambda:[9e18,0,0,C()])
for r in tb:
  t=int(float(r['ts'])); x=tbm[r['mint']]; x[0]=min(x[0],t); x[1]=max(x[1],t); x[2]+=1; x[3][r['venue']]+=1
pm_=collections.defaultdict(int)
for r in pos: pm_[r['mint']]=max(pm_[r['mint']],int(float(r['ts_decision'])))
cut=calendar.timegm(time.strptime('2026-11-07 11:54:21','%Y-%m-%d %H:%M:%S'))
win=[m for m,t in pm_.items() if t>=cut-4*3600]
P(f"  mints with a stream {len(tbm):,} · rows {len(tb):,} · venues {dict(sum((x[3] for x in tbm.values()),C()))}")
P(f"  entered mints (fd_positions) {len(pm_):,} · decided in the last 4 h {len(win):,} · of those WITH a stream {sum(m in tbm for m in win):,} · older entered mints with a stream {sum(m in tbm for m in pm_ if m not in win):,}")
sp=sorted((x[1]-x[0])/60 for x in tbm.values()); P(f"  stream span per mint (min): median {sp[len(sp)//2]:.0f}, max {sp[-1]:.0f} (tracker retains trades ~125 min after launch; pool trades 24 h after creation from 0.19.8)")
P("  Pool evidence columns of tracker 0.19.9 (pool, ev_idx, raw amounts, decimals, dec_ver) are NOT in this export's trades_books — see MANIFEST 'Not included'.")
