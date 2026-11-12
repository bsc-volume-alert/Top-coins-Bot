"""Rule file for the frozen eval-1.1. Spec: L004-SC = eligibility E entries + Codex's early-cohort sell-cluster exit (>= 3 first-minute buyers
selling >= 2 SOL combined within the preceding 2 s of receipt) or 30 % trail or 2 h. See PROTOCOL.md."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
RULE = {"name": "F010-L004-SC", "decision_offsets": [300], "on_trade": False, "horizon_s": 7200, "sizes": [0.2]}
def decide(v):
    if v.t != v.created + 300: return False
    e = bool(rc.eligible(rc.features(v)))
    if e: rc.set_tape(v)
    return e
def exit_signal(p): return rc.exit_signal_sc(p)
