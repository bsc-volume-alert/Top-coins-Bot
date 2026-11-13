"""CL-L008 first-time-buyer share at t (see prepass_ftb.py / PROTOCOL.md). Reads the cross-mint wallet map (env F003_WALLET_MAP, built by
prepass_ftb.py from the same allowlisted trades) and computes, from the receipt-ordered prefix the evaluator hands to decide() (rows with receipt
<= t only), the share of last-60-s distinct curve buyers with no received curve buy on another tracked mint before t."""
import os, pickle
from rules_common import fl, iscurve
THRESHOLD = 0.125          # registered: E median (PROTOCOL.md); 0.5 = pre-declared secondary descriptive cut
_WM = None
def wm():
    global _WM
    if _WM is None: _WM = pickle.load(open(os.environ["F003_WALLET_MAP"], "rb"))
    return _WM
def share(v):
    L = v.trades; k = len(L)
    if k == 0: return None
    m = L[k - 1]["mint"]; t = v.t; buyers = set()
    for r in L:
        if r["is_buy"] == "1" and iscurve(r) and fl(r["ts"]) > t - 60: buyers.add(r["wallet"])
    if not buyers: return None
    ft = sum(1 for w in buyers if not any(mm != m and tr < t for mm, tr in wm().get(w, [])))
    return ft / len(buyers)
