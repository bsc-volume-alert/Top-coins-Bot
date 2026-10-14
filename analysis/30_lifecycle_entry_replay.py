import pandas as pd, numpy as np
pd.set_option('display.width',250); pd.set_option('display.max_columns',60); pd.set_option('display.max_rows',400)
life=pd.read_csv('data/token_life.csv'); tok=pd.read_csv('data/tokens.csv')
life=life[life.cp<=7200]
w=life.pivot(index='mint',columns='cp',values=['mc','vol5m_usd','buys5m','sells5m','buyers5m','buyers_total','graduated','alive','top10_pct','holders'])
w.columns=[f"{a}_{b}" for a,b in w.columns]
w=w.join(tok.set_index('mint')[['name','bundle_pct','bundle_sol','bundle_wallets','handoffs','tier','factory','has_socials','dev_buy_sol','outside_buyers','creator','peak_mc_usd','launch_utc']])
w['launch']=pd.to_datetime(w.launch_utc)
print("tokens with cp rows:",len(w)); print({c:int(w[f'mc_{c}'].notna().sum()) for c in [60,300,900,1800,3600,7200]})
w.to_pickle('data/wide.pkl')
cps=[60,300,900,1800,3600,7200]
def fwd(df,cp):
    later=[c for c in cps if c>cp]
    e=df[f'mc_{cp}']
    fp=df[[f'mc_{c}' for c in later]].max(axis=1)/e
    # last known price (if token has no later cp because export is recent, exclude)
    end=df[f'mc_{later[-1]}']/e
    h1=df['mc_3600']/e if cp<3600 else None
    return fp,end,h1
for cp in [300,900,1800]:
    d=w[w[f'mc_{cp}'].notna()&w['mc_7200'].notna()].copy()
    d['fp'],d['end'],d['h1']=fwd(d,cp)
    print(f"\n=== ENTRY AT +{cp//60}m: {len(d)} tokens with full 2h path ===")
    print(" all: fwd peak>=2x: %.3f  >=3x: %.3f  median end(2h): %.2f  mean end: %.2f  alive@cp: %.2f" % ((d.fp>=2).mean(),(d.fp>=3).mean(),d.end.median(),d.end.mean(),d[f'alive_{cp}'].mean()))
    a=d[d[f'alive_{cp}']==1]
    print(" alive only: n=%d fwd>=2x %.3f >=3x %.3f median end %.2f mean end %.2f" % (len(a),(a.fp>=2).mean(),(a.fp>=3).mean(),a.end.median(),a.end.mean()))
    a=a.copy(); a['bs']=a[f'buys5m_{cp}']/a[f'sells5m_{cp}'].replace(0,np.nan)
    prev=[c for c in cps if c<cp][-1]; a['grow']=a[f'mc_{cp}']/a[f'mc_{prev}']
    for col,bins in [(f'mc_{cp}',[0,5e3,10e3,20e3,40e3,80e3,1e9]),(f'vol5m_usd_{cp}',[-1,1e3,5e3,10e3,25e3,50e3,1e9]),(f'buyers5m_{cp}',[-1,5,10,20,40,80,1e9]),(f'buyers_total_{cp}',[-1,20,50,100,200,400,1e9]),('bs',[0,0.8,1,1.3,2,100]),('grow',[0,0.7,1,1.3,2,100]),('bundle_pct',[-1,5,20,40,100]),(f'graduated_{cp}',[-1,0,1])]:
        a['_b']=pd.cut(a[col],bins)
        g=a.groupby('_b',observed=True).agg(n=('fp','size'),p2=('fp',lambda s:(s>=2).mean()),p3=('fp',lambda s:(s>=3).mean()),med_end=('end','median'),mean_end=('end','mean'),mean_h1=('h1','mean'))
        print(f" -- {col}"); print(g.round(3).to_string())
