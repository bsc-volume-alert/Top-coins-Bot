import sys; sys.path.insert(0,'/home/claude/work')
import pandas as pd, numpy as np, pickle, engine as E
D=pickle.load(open("mints_arr.pkl","rb"))
print('mints',len(D))
pos=pd.concat([pd.read_csv('/home/claude/top-coins-bot/current/fd_positions.csv.gz'),pd.read_csv('/home/claude/top-coins-bot/snapshot3/fd_positions.csv.gz'),
 pd.read_csv('/home/claude/top-coins-bot/snapshot3/agedout_snap6nov1823_fd_positions.csv.gz'),pd.read_csv('/home/claude/top-coins-bot/snapshot3/agedout_snap7nov0853_fd_positions.csv.gz')],ignore_index=True)
pos=pos.drop_duplicates(subset=['vol_id'])
print(len(pos), pos.status.value_counts().to_dict())
pos=pos[pos.status=='closed']
rows=[]
for _,p in pos.iterrows():
    d=D.get(p.mint)
    if d is None: continue
    curve=1 if '"complete":0' in str(p.reserves_at_check) else 0
    trail=0.40 if curve else 0.25
    o=E.replay(d, float(p.ms_decision), trail=trail)
    rows.append(dict(vol_id=p.vol_id,book=p.book,mint=p.mint,ts=p.ts_decision,bot_r=p.r_frac_020,my_r=o['r'],cat=o['cat'],reason=o['reason'],why=o.get('why'),bot_exit=p.exit_reason,curve=curve))
R=pd.DataFrame(rows)
print(R.cat.value_counts(), R.reason.value_counts())
a=R[R.cat=='a']
print('n',len(a),'bot mean',a.bot_r.mean(),'my mean',a.my_r.mean(),'corr',a[['bot_r','my_r']].corr().iloc[0,1])
print('abs diff quantiles',(a.bot_r-a.my_r).abs().describe(percentiles=[.5,.9,.99]))
print(a.groupby('book')[['bot_r','my_r']].mean().join(a.groupby('book').size().rename('n')))
bad=a[(a.bot_r-a.my_r).abs()>0.3]
print(bad[['book','mint','bot_r','my_r','why','bot_exit','curve']].head(20))
R.to_pickle('replay_vs_bot.pkl')
