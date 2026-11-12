"""Rule file for the frozen eval-1.1. Spec: CL-L005 = eligibility E entries + demand-decay exit (<= 1 distinct curve buyer received in the
last 60 s, held >= 60 s) or 30 % trail or 2 h. See PROTOCOL.md."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
RULE = {"name": "F010-CL-L005-DD", "decision_offsets": [300], "on_trade": False, "horizon_s": 7200, "sizes": [0.2]}
def decide(v):
    if v.t != v.created + 300: return False
    e = bool(rc.eligible(rc.features(v)))
    if e: rc.set_tape(v)
    return e
def exit_signal(p): return rc.exit_signal_dd(p)
