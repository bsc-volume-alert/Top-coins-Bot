"""Rule file for the frozen eval-1.1. Spec: CL-L012-RETSPEED = eligibility E entries at created + 300 s, SKIPPED when the launch's retention
(the evaluator's own retained_at, handed to decide() as view.retained_at) came more than T = 60 s after creation. Exit = the control's 30 % trail.
T registered in PROTOCOL.md (commit 934a86e) before any count."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
T = 60.0
RULE = {"name": "CL-L012-RETSPEED-VETO-T60", "decision_offsets": [300], "on_trade": False, "horizon_s": 7200, "sizes": [0.2]}
def decide(v):
    if v.t != v.created + 300: return False
    if v.retained_at - v.created > T: return False
    return bool(rc.eligible(rc.features(v)))
def exit_signal(p): return rc.exit_signal(p)
