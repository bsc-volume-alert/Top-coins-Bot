"""Rule file for the frozen eval-1.1. Spec: F004-BASE60 = always-on entry at created + 60 s on a usable curve state (the study's BASE60 comparator). See PROTOCOL.md."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_f004 as rf
RULE = {"name": "F004-BASE60", "decision_offsets": [60], "on_trade": False, "horizon_s": 7200, "sizes": [0.2]}
def decide(v): return rf.base60_decide(v)
def exit_signal(p): return rf.exit_signal(p)
