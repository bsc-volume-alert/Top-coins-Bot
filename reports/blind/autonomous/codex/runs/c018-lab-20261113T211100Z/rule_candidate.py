"""Single preregistered tape-derived creator first-slot size >=5 SOL veto."""
import os,sys
from decimal import Decimal
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'peer_f014'));import rules_common as rc
RULE={'name':'C018-L010','decision_offsets':[300],'on_trade':False,'horizon_s':7200,'sizes':[.2]}
def decide(v):
 if v.t!=v.created+300 or not rc.eligible(rc.features(v)):return False
 L=[z for z in v.trades if rc.iscurve(z)]
 if not L:return False
 slot=min(int(z['slot']) for z in L);cr=rc.creator_of(L[0]['mint'])
 if not cr:return False
 first=[z for z in L if int(z['slot'])==slot]
 if any(rc.fl(z['recv_ms']) is None or float(z['recv_ms'])/1000>v.t for z in first):return False
 size=sum((Decimal(z['sol']) for z in first if z['wallet']==cr and z['is_buy']=='1'),Decimal(0))
 return size<Decimal(5)
def exit_signal(p):return rc.exit_signal(p)
