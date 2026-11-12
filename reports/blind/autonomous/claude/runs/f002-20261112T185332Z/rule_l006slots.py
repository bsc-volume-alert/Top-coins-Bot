"""Rule file for the frozen eval-1.1. CL-L006 = eligibility E AND the received curve buys with ts > t-60 fall in >= 8 distinct slots."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
RULE = {"name": "CL-L006-SLOTS8", "decision_offsets": [300], "on_trade": False, "horizon_s": 7200, "sizes": [0.2]}
def decide(v):
    if v.t != v.created + 300: return False
    return bool(rc.candidate(rc.features(v)))
def exit_signal(p): return rc.exit_signal(p)
