"""Rule file for the frozen eval-1.1. Spec: CL-L011 no-sell RUN2 = the F004-RUN2 trigger, entered only if ZERO curve sell rows were received in
(created + 60 s, trigger receipt]; otherwise skip the launch. See PROTOCOL.md."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_f013 as rf
RULE = {"name": "CL-L011-RUN2C", "decision_offsets": [], "on_trade": True, "horizon_s": 7200, "sizes": [0.2]}
def decide(v): return rf.run2c_decide(v)
def exit_signal(p): return rf.exit_signal(p)
