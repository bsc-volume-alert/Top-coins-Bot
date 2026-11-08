RULE = {"name": "r0_h30_all", "decision_offsets": [], "on_trade": True, "horizon_s": 30, "sizes": [0.2, 0.02]}
def decide(view):
    return True
def exit_signal(pos):
    return False
