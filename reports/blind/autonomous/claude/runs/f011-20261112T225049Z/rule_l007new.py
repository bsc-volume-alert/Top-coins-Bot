"""Rule file for the frozen eval-1.1. Spec: CL-L007 = eligibility E entries whose trimmed, case-folded name AND symbol are both new within the
window (no earlier census launch used either). Exit = the control's 30 % trail. See PROTOCOL.md (Idea lab)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc, reuse
RULE = {"name": "CL-L007-NEWNAME", "decision_offsets": [300], "on_trade": False, "horizon_s": 7200, "sizes": [0.2]}
def decide(v):
    if v.t != v.created + 300: return False
    f = rc.features(v)
    return bool(rc.eligible(f) and reuse.is_new(v.trades[len(v.trades) - 1]["mint"]))
def exit_signal(p): return rc.exit_signal(p)
