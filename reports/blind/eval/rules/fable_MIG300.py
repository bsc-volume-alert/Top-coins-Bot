# Translation of the Claude analyst's frozen rule MIG300 (branch blind-fable-7nov @ 96bda1bf, SUBMISSION_fable_7nov.md §1) into the eval interface.
# Entry: at the receipt of the FIRST PumpSwap trade of a retained mint (within 2 h of creation — enforced by the evaluator).
# Exit: fixed 300-s hold (horizon), no trail/TP. Sizes 0.2 and 0.02 independently. TO BE CONFIRMED BY THE ANALYST before scoring.
RULE = {"name": "fable_MIG300", "decision_offsets": [], "on_trade": True, "horizon_s": 300, "sizes": [0.2, 0.02]}
def decide(view):
    return view.last is not None and view.last["venue"] not in ("curve", "")
def exit_signal(pos):
    return False
