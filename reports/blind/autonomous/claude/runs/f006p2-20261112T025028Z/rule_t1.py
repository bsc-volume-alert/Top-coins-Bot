"""Rule file for the frozen eval-1.1 (decide/exit_signal/RULE). Spec: F006-T1-held-inventory. See PROTOCOL.md."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
RULE = {"name": "F006-T1-held-inventory", "decision_offsets": [300], "on_trade": False, "horizon_s": 7200, "sizes": [0.2]}
def decide(v):
    if v.t != v.created + 300: return False
    f = rc.features(v)
    return bool(rc.eligible(f) and (rc.cond_t1(f)))
def exit_signal(p): return rc.exit_signal(p)
