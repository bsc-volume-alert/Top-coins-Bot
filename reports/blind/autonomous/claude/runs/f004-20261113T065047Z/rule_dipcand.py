"""Rule file for the frozen eval-1.1. Spec: CL-L009 = same dump event, enter only at the first received usable price >= 1.5 x the post-dump trough within 300 s of the dump. See PROTOCOL.md."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_f004 as rf
RULE = {"name": "CL-L009-RECOVER", "decision_offsets": [], "on_trade": True, "horizon_s": 7200, "sizes": [0.2]}
def decide(v): return rf.dip_candidate_decide(v)
def exit_signal(p): return rf.exit_signal(p)
