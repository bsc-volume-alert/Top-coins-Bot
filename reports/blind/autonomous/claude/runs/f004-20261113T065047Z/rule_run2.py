"""Rule file for the frozen eval-1.1. Spec: F004-RUN2 = enter at the receipt of the first usable trade priced >= 2 x the last received usable price at created + 60 s, 60 s < t <= 900 s. See PROTOCOL.md."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_f004 as rf
RULE = {"name": "F004-RUN2", "decision_offsets": [], "on_trade": True, "horizon_s": 7200, "sizes": [0.2]}
def decide(v): return rf.run_decide(v, 2)
def exit_signal(p): return rf.exit_signal(p)
