"""Rule file for the frozen eval-1.1. Spec: CL-L010 breadth-conditioned RUN2 = the F004-RUN2 trigger, entered only if >= B (= 10) distinct
non-creator wallets with a curve buy were received between created + 60 s and the trigger receipt; otherwise skip the launch. See PROTOCOL.md."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_f012 as rf
RULE = {"name": "CL-L010-RUN2B", "decision_offsets": [], "on_trade": True, "horizon_s": 7200, "sizes": [0.2]}
def decide(v): return rf.run2b_decide(v)
def exit_signal(p): return rf.exit_signal(p)
