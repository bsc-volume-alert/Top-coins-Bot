import pathlib
r=pathlib.Path(__file__).parent;s=(r.parent/'c010-lab-20261111T211258Z/lab.py').read_text()
s=s.replace("records={'L003':[],'CONTROL':[]}","records={'L006':[],'BASELINE':[],'VETOED':[],'FEATURE_UNAVAILABLE':[]}")
needle="candidate=len(recent_buyers)>=20 and material>=10 and persistence>=.6"
s=s.replace(needle,needle+'''
 if not candidate:continue
 qa=known[-1];qb=max(known,key=lambda z:(int(z['slot']),int(ev.fl(z['ev_idx'])) if ev.fl(z['ev_idx']) is not None else -1,int(z['row_id'])))
 feature_available=ev.state_ok(qa) and ev.state_ok(qb)
 ratio=ev.buy(qa,.2,55)/ev.buy(qb,.2,55) if feature_available else None
 veto=ratio>=1.05 if feature_available else None
 quote_feature={'feature_available':feature_available,'veto':veto,'token_quote_ratio_receipt_over_chain':ratio,'receipt_row_id':qa['row_id'],'chain_row_id':qb['row_id'],'receipt_row_slot':qa['slot'],'chain_row_slot':qb['slot'],'receipt_row_recv_ms':qa['recv_ms'],'chain_row_recv_ms':qb['recv_ms'],'receipt_state_ts':qa['ts'],'chain_state_ts':qb['ts'],'receipt_venue':qa['venue'],'chain_venue':qb['venue'],'decision_t':t}
 assert float(qa['recv_ms'])<=t*1000 and float(qb['recv_ms'])<=t*1000
''')
s=s.replace("records['CONTROL'].append(answer)\n if candidate:records['L003'].append({**answer,'variant':'L003'})", "records['BASELINE'].append({**answer,'variant':'BASELINE','quote_feature':quote_feature})\n if not feature_available:records['FEATURE_UNAVAILABLE'].append({**answer,'variant':'FEATURE_UNAVAILABLE','quote_feature':quote_feature})\n elif veto:records['VETOED'].append({**answer,'variant':'VETOED','quote_feature':quote_feature})\n else:records['L006'].append({**answer,'variant':'L006','quote_feature':quote_feature})")
s=s.replace("len(records['L003']),len(records['CONTROL'])","len(records['L006']),len(records['BASELINE'])");s=s.replace("'experiment':'CDEX-L003'","'experiment':'CDEX-L006'").replace('47ac802f25258cd4f5a8b110935e50785fc29daf','c17f7f65efbfef247cef33cc329d9cba0751a37a');(r/'lab.py').write_text(s)
