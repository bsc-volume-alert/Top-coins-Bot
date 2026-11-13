"""Rule file for the frozen eval-1.1. Spec: CL-L009-CONTROL = enter at the dump event (received usable price <= 50 % of the running high since retention, 60 s < t <= 1800 s). See PROTOCOL.md."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_f004 as rf
RULE = {"name": "CL-L009-CONTROL", "decision_offsets": [], "on_trade": True, "horizon_s": 7200, "sizes": [0.2]}
def decide(v): return rf.dip_control_decide(v)
def exit_signal(p): return rf.exit_signal(p)
