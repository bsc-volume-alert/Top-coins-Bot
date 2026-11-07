import pandas as pd, numpy as np, glob, sys
D='/home/claude/top-coins-bot/'
parts=sorted(glob.glob(D+'trades_part_00*.csv.gz'))
use=['row_id','mint','sig','slot','ts','wallet','is_buy','sol','tokens','price_sol','recv_ms','vsol','vtok','venue','pool','ev_idx','base_raw','quote_raw','pool_base_raw','pool_quote_raw','quote_mint','base_dec','quote_dec','dec_ver','px_adj']
dfs=[]
for p in parts:
    d=pd.read_csv(p,usecols=use,dtype={'mint':'category','wallet':str,'sig':str,'venue':'category','pool':str,'quote_mint':str,'dec_ver':str},low_memory=False)
    dfs.append(d); print(p,len(d),flush=True)
t=pd.concat(dfs,ignore_index=True)
t['mint']=t['mint'].astype(str)
print(t.dtypes); print(t.describe(include='all').T.head(30))
print('venue counts',t.venue.value_counts(dropna=False))
print('recv_ms null',t.recv_ms.isna().sum(),'of',len(t))
print('ev_idx null',t.ev_idx.isna().sum())
t.to_pickle('/home/claude/work/trades.pkl')
