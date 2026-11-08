"""Round 2 loader: reads the all-coins export, dedups by full fingerprint, builds per-mint numpy arrays in event order."""
import pandas as pd, numpy as np, glob, pickle, sys, time
D='/home/claude/data_r2/'; W='/home/claude/r2/'
use=['row_id','mint','sig','slot','ts','wallet','is_buy','sol','tokens','recv_ms','vsol','vtok','venue','quote_mint','base_dec','quote_dec']
WSOL='So11111111111111111111111111111111111111112'
parts=sorted(glob.glob(D+'trades_part_*.csv.gz')); t0=time.time()
out={}; dups=0; total=0
tok=pd.read_csv(D+'tokens_window.csv.gz'); tok=tok.set_index('mint')
for p in parts:
    d=pd.read_csv(p,usecols=use,dtype={'venue':str,'quote_mint':str,'base_dec':str,'quote_dec':str,'wallet':str,'sig':str},low_memory=False)
    total+=len(d)
    before=len(d); d=d.drop_duplicates(subset=['mint','sig','wallet','is_buy','sol','tokens','venue','vsol','vtok']); dups+=before-len(d)
    d['venue']=d.venue.fillna('curve'); d['pool']=(d.venue!='curve').astype(np.int8)
    d['evid']=((d.quote_mint==WSOL)&(d.base_dec=='6')&(d.quote_dec=='9')).astype(np.int8)
    d=d.sort_values(['mint','slot','row_id'])   # export is already slot, ev_idx, rowid within mint; keep rowid tiebreak
    for m,g in d.groupby('mint',sort=False):
        a=dict(ts=g.ts.values.astype(np.int64), recv=g.recv_ms.values.astype(float), q=g.vsol.values.astype(float), b=g.vtok.values.astype(float),
               pool=g.pool.values, evid=g.evid.values, buy=g.is_buy.values.astype(np.int8), sol=g.sol.values.astype(float), tokens=g.tokens.values.astype(float),
               wallet=g.wallet.values.astype(object), slot=g.slot.values.astype(np.int64))
        if m in out:  # mint split across parts: concatenate then re-sort by (slot,row order)
            o=out[m]; a={k:np.concatenate([o[k],a[k]]) for k in a}
        out[m]=a
    print(p,len(d),time.time()-t0,flush=True)
for m,a in out.items():
    a['create']=int(tok.create_ts.loc[m]); a['tier']=int(tok.tier.loc[m]) if 'tier' in tok.columns else 0
pickle.dump(out,open(W+'mints_r2.pkl','wb'),protocol=4)
print('mints',len(out),'rows',total,'dups',dups)
print(tok.columns.tolist()); print(tok.describe().T)
