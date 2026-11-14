#!/usr/bin/env python3
"""Counts-only consistency check (no outcome, no raw data, no network):
1. Codex C020's rebuilt/results.json and peer_f016/results.json (research-codex @ 0aaa210) vs Claude's own
   published f016 results.json (research-claude @ 253604d) — leaf-for-leaf.
2. Codex's published features_01-05.csv reassembled vs Claude's f016_features.csv.gz — byte compare.
3. C020 ARTIFACT_SHA256SUMS.txt verified against the blobs on research-codex @ 0aaa210.
4. C020 independent_counts.json headline counts vs f016 results.json.
Everything is read from git objects of the two research branches; nothing is downloaded."""
import json, subprocess, hashlib, gzip, sys, io
CODEX='0aaa2108f9b56a16fd0234ed2743c1d466a4422a'
CLAUDE='253604de64fc9b2b43effa44b245f1323c4f4201'
CR='reports/blind/autonomous/codex/runs/c020-review-20261114T091100Z/'
FR='reports/blind/autonomous/claude/runs/f016-20261114T025106Z/'
def blob(commit,path):
    return subprocess.run(['git','show',f'{commit}:{path}'],capture_output=True,check=True).stdout
def leaves(o,p=''):
    if isinstance(o,dict):
        for k,v in o.items(): yield from leaves(v,f'{p}/{k}')
    elif isinstance(o,list):
        for i,v in enumerate(o): yield from leaves(v,f'{p}[{i}]')
    else: yield p,o
out={'codex_commit':CODEX,'claude_f016_commit':CLAUDE}
mine=json.loads(blob(CLAUDE,FR+'results.json'))
ml=dict(leaves(mine)); out['f016_results_leaves']=len(ml)
for name in ['rebuilt/results.json','peer_f016/results.json']:
    theirs=dict(leaves(json.loads(blob(CODEX,CR+name))))
    diff=[k for k in set(ml)|set(theirs) if ml.get(k,'<absent>')!=theirs.get(k,'<absent>')]
    out[name]={'leaves':len(theirs),'differences':len(diff),'differing_keys':sorted(diff)[:20]}
# features
mine_csv=gzip.decompress(blob(CLAUDE,FR+'f016_features.csv.gz'))
parts=[blob(CODEX,CR+f'features_0{i}.csv') for i in range(1,6)]
# Codex partitions: header repeated per part? try both
hdr=parts[0].split(b'\n',1)[0]
joined=parts[0]+b''.join(p.split(b'\n',1)[1] if p.startswith(hdr) else p for p in parts[1:])
out['features']={'claude_bytes':len(mine_csv),'claude_sha256':hashlib.sha256(mine_csv).hexdigest(),
 'codex_parts_bytes':[len(p) for p in parts],'codex_joined_bytes':len(joined),
 'byte_identical_after_join':joined==mine_csv,
 'claude_rows':mine_csv.count(b'\n'),'codex_rows':joined.count(b'\n')}
if joined!=mine_csv:
    # compare as row sets (partition may be sorted differently)
    a=set(mine_csv.split(b'\n')[1:]); b=set(joined.split(b'\n')[1:])
    out['features']['same_header']=mine_csv.split(b'\n',1)[0]==hdr
    out['features']['row_set_identical']=a==b
    out['features']['rows_only_claude']=len(a-b); out['features']['rows_only_codex']=len(b-a)
# manifest
man=blob(CODEX,CR+'ARTIFACT_SHA256SUMS.txt').decode().splitlines()
ok=bad=0; badl=[]
for line in man:
    if not line.strip(): continue
    h,_,p=line.partition('  '); p=p.strip().lstrip('./')
    try:
        b=blob(CODEX,CR+p) if not p.startswith('reports/') else blob(CODEX,p)
    except subprocess.CalledProcessError:
        bad+=1; badl.append(p+' (missing)'); continue
    if hashlib.sha256(b).hexdigest()==h: ok+=1
    else: bad+=1; badl.append(p)
out['c020_manifest']={'entries':ok+bad,'verified':ok,'failed':bad,'failed_paths':badl}
# headline counts from Codex independent_counts.json vs f016 results.json
ic=json.loads(blob(CODEX,CR+'independent_counts.json'))
out['codex_independent_counts_keys']=sorted(ic.keys())[:40]
out['codex_independent_counts']=ic
json.dump(out,open(sys.argv[1],'w'),indent=1,default=str)
print(json.dumps({k:v for k,v in out.items() if k not in('codex_independent_counts',)},indent=1,default=str)[:6000])

# ---- part 2: Codex's independent feature table = F016's 27 columns + 3 receipt-clock columns ----
import csv
def rows(b):
    r=list(csv.DictReader(io.StringIO(b.decode().replace('\r\n','\n'))))
    return {x['mint']:x for x in r}
mr=rows(mine_csv); cr=rows(joined)
f016_cols=mine_csv.split(b'\n',1)[0].decode().strip().split(',')
out['features']['claude_line_ending']='CRLF' if b'\r\n' in mine_csv[:300] else 'LF'
out['features']['codex_line_ending']='CRLF' if b'\r\n' in joined[:300] else 'LF'
codex_cols=hdr.decode().strip().split(',')
extra=[c for c in codex_cols if c not in f016_cols]
common_diff=0; cells=0; worst=0.0; mism=[]
for m,x in mr.items():
    y=cr.get(m)
    if y is None: mism.append(m); continue
    for c in f016_cols:
        cells+=1
        a,b=x[c],y[c]
        if a==b: continue
        try:
            fa,fb=float(a),float(b); 
            if fa==fb or abs(fa-fb)<=1e-12*max(1,abs(fa)): worst=max(worst,abs(fa-fb)); continue
        except ValueError: pass
        common_diff+=1; mism.append((m,c,a,b))
out['features_common_columns']={'f016_columns':len(f016_cols),'codex_columns':len(codex_cols),'codex_extra_columns':extra,
 'mints_common':len(set(mr)&set(cr)),'cells_compared':cells,'cell_differences_beyond_1e-12':common_diff,'max_abs_numeric_difference':worst,'examples':mism[:5]}
# ---- part 3: Codex bind_counts (all / half / cell) vs f016 results.json ----
keymap={'p1_veto':'R86_1_price_drift','p2_veto':'R86_2_adder_share','p3_veto':'R86_3_arrival_cv','clp1_veto':'CLP1_sell_absorption','clp2_veto':'CLP2_escalation','clp3_veto':'CLP3_clock'}
bc=ic['bind_counts']; cmp={}
for k,fk in keymap.items():
    mineP=mine[fk]; theirs=bc[k]
    row={'all':(mineP['veto'],theirs['all']['veto'])}
    for h in ('early','late'): row[h]=(mineP['by_half'][h]['veto'],theirs['by_half'][h]['veto'])
    for c in ('A','B','C'): row[c]=(mineP['by_cell'][c]['veto'],theirs['by_cell'][c]['veto'])
    row['all_equal']=all(a==b for a,b in [v for kk,v in row.items() if kk!='all_equal'])
    cmp[k]=row
out['bind_counts_f016_vs_c020']=cmp
out['census_clock']={'f016_counts_mod60_equal':mine['CLP3_clock']['census']['counts_mod60']==ic['clock_census']['counts_mod60'],
 'f016_chi2':mine['CLP3_clock']['census'].get('chi2_vs_uniform'),'c020_chi2':ic['clock_census']['chi2'],'f016_bin':mine['CLP3_clock']['census'].get('bin_58_2') or mine['CLP3_clock']['census'].get('bin'),'c020_bin':ic['clock_census']['bin_58_2']}
# ---- part 4: receipt-clock columns vs Claude f017 ----
F17='1dbf1d12ef0db4f7c8199f858e6a424da9a8d1d6'; FR17='reports/blind/autonomous/claude/runs/f017-20261114T065226Z/'
f17=json.loads(blob(F17,FR17+'results.json'))['partB_R86_2_clock_variant']
rc=bc['receipt_adder_veto']
out['receipt_clock_vs_f017']={'f017_partB_keys':sorted(f17.keys())[:30],'c020_receipt_veto_all':rc['all']['veto'],'c020_receipt_by_half':{h:rc['by_half'][h]['veto'] for h in rc['by_half']},'c020_receipt_by_cell':{c:rc['by_cell'][c]['veto'] for c in rc['by_cell']},'c020_cross_tab':ic['adder_clock_cross_tab']}
f17csv=gzip.decompress(blob(F17,FR17+'f017_r86_2_clocks.csv.gz')); f17r=rows(f17csv)
out['receipt_clock_vs_f017']['f017_clock_csv_columns']=f17csv.split(b'\n',1)[0].decode().split(',')
# per-launch receipt veto flag compare if a comparable column exists
cand=[c for c in out['receipt_clock_vs_f017']['f017_clock_csv_columns'] if 'receipt' in c.lower() or 'rt' in c.lower()]
out['receipt_clock_vs_f017']['f017_candidate_columns']=cand
json.dump(out,open(sys.argv[1],'w'),indent=1,default=str)
print(json.dumps({k:out[k] for k in ['features_common_columns','bind_counts_f016_vs_c020','census_clock','receipt_clock_vs_f017']},indent=1,default=str)[:5000])

# ---- part 5: per-launch receipt-clock flags: Codex C020 (receipt_adder_share / receipt_adder_veto / receipt_buyers) vs Claude f017 (share_receipt / veto_receipt / n_W_receipt) ----
def tb(v): return str(v).strip().lower() in ('true','1')
agree_veto=agree_n=agree_share=0; n=0; dv=[]
for m,y in cr.items():
    z=f17r.get(m)
    if z is None: continue
    n+=1
    if tb(y['receipt_adder_veto'])==tb(z['veto_receipt']): agree_veto+=1
    else: dv.append(m)
    if int(float(y['receipt_buyers']))==int(float(z['n_W_receipt'])): agree_n+=1
    if abs(float(y['receipt_adder_share'])-float(z['share_receipt']))<=1e-12: agree_share+=1
out['receipt_clock_vs_f017'].update({'launches_joined':n,'veto_flag_agree':agree_veto,'veto_flag_differ':len(dv),'n_W_receipt_agree':agree_n,'share_agree_1e-12':agree_share,'differing_mints':dv[:10],
 'f017_receipt_veto_total':sum(tb(z['veto_receipt']) for z in f17r.values()),'c020_receipt_veto_total':sum(tb(y['receipt_adder_veto']) for y in cr.values())})
out['census_clock']['f016_census_keys']=sorted(mine['CLP3_clock']['census'].keys())
out['census_clock']['f016_census_values']={k:v for k,v in mine['CLP3_clock']['census'].items() if k!='counts_mod60'}
json.dump(out,open(sys.argv[1],'w'),indent=1,default=str)
print(json.dumps({k:out['receipt_clock_vs_f017'][k] for k in ['launches_joined','veto_flag_agree','veto_flag_differ','n_W_receipt_agree','share_agree_1e-12','f017_receipt_veto_total','c020_receipt_veto_total']}))
print(json.dumps(out['census_clock']['f016_census_values']))
