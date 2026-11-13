"""Rule file for the frozen eval-1.1. Spec: F003-C1 = eligibility E entries whose creator has NO in-window predecessor that was unretained at this
launch's creation (i.e. skip when the creator's previous in-window launch had not reached the 15-SOL retention screen by create_ts). Exit = the
control's 30 % trail. Registered in PROTOCOL.md before scoring."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc, creator_history as ch
RULE = {"name": "F003-C1-PREVNOTRET-VETO", "decision_offsets": [300], "on_trade": False, "horizon_s": 7200, "sizes": [0.2]}
def decide(v):
    if v.t != v.created + 300: return False
    f = rc.features(v)
    return bool(rc.eligible(f) and not ch.of(v.trades[len(v.trades) - 1]["mint"])["C1_prev_not_retained"])
def exit_signal(p): return rc.exit_signal(p)
