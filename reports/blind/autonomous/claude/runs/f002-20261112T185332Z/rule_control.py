"""Rule file for the frozen eval-1.1 (decide/exit_signal/RULE). CL-L006-CONTROL = eligibility E (identical to F006P2/F009/F010 CONTROL)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
RULE = {"name": "CL-L006-CONTROL", "decision_offsets": [300], "on_trade": False, "horizon_s": 7200, "sizes": [0.2]}
def decide(v):
    if v.t != v.created + 300: return False
    return bool(rc.eligible(rc.features(v)))
def exit_signal(p): return rc.exit_signal(p)
