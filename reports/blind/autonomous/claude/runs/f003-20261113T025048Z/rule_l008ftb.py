"""Rule file for the frozen eval-1.1. Spec: CL-L008 = eligibility E entries whose first-time-buyer share at 300 s is >= 0.125 (E median, registered
in PROTOCOL.md before scoring). Exit = the control's 30 % trail."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc, ftb
RULE = {"name": "CL-L008-FTB-GE-0.125", "decision_offsets": [300], "on_trade": False, "horizon_s": 7200, "sizes": [0.2]}
def decide(v):
    if v.t != v.created + 300: return False
    f = rc.features(v)
    if not rc.eligible(f): return False
    s = ftb.share(v); return bool(s is not None and s >= ftb.THRESHOLD)
def exit_signal(p): return rc.exit_signal(p)
