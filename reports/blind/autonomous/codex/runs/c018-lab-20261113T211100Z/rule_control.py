"""Unchanged E control and exit; frozen evaluator interface."""
import os,sys
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'peer_f014'));import rules_common as rc
RULE={'name':'C018-CONTROL','decision_offsets':[300],'on_trade':False,'horizon_s':7200,'sizes':[.2]}
def decide(v):return v.t==v.created+300 and bool(rc.eligible(rc.features(v)))
def exit_signal(p):return rc.exit_signal(p)
