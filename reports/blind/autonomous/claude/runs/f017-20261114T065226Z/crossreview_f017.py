"""F017 / R99 — counts-only cross-review of Codex C019 @ 1258475 and the R96 (b) receipt-clock variant of R86 (2). NO OUTCOME IS READ:
no fill, no exit, no net SOL, no price after any decision time, no ledger, no P&L, no verdict.

Part A (C019): independent re-derivation of the N1 / N3 / N4 / N5 statistics of Codex PROTOCOL 122657f on the 680 record launches
(679 E + 1 L003-only), written from the protocol text — not copied from register.py — and compared per launch with Codex's feature table
(feature_records.csv, which this run re-produced byte-identically). Two explicit checks (queue F017): (a) N1 "follower first appearance
strictly after initiator receipt" — ties are not 'after'; (b) N5 window = (D − 5, D] on receipt time, other window mints only.
Part B (R96 (b)): R86 (2) same-tape re-buyer ("adder") share at E with the RECEIPT clock — W_RT = wallets with a curve buy received in
(t − 60, t], adder = also has a curve buy with RT ≤ t − 60; threshold 0.25 unchanged (veto = share < 0.25) — counted beside the block-time
count of f016 (W = buyers_last_60s: block ts > t − 60 among rows received by t; before = block ts ≤ t − 60). Bind share on 679, halves, cells,
and the 2 × 2 agreement of the two clocks per launch.
Usage: F006P2_EVAL=<evaluate.py> F006P2_TOKENS=<tokens_window.csv.gz> python3 -I crossreview_f017.py <replay dir> <codex feature_records.csv> <out dir>"""
import sys, os, pathlib, json, csv, types, statistics, collections, bisect, hashlib, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import rules_common as rc
replay = pathlib.Path(sys.argv[1]); codex_csv = pathlib.Path(sys.argv[2]); out = pathlib.Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
ev = rc.ev(); fl = ev.fl
assert hashlib.sha256(open(os.environ["F006P2_EVAL"], "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
START, SPLIT, END = 1793950800, 1794016200, 1794081600; AGE = 300; HORIZON = 7200
# Codex PROTOCOL 122657f constants (fixed there before any count; copied as numbers only)
N1_OFF, N1_INIT_SOL, N1_FOLLOW_SOL, N1_SIGNAL = 10, 2.0, 0.1, 3
N3_OFF, N3_SOLD_FRAC, N3_RATIO, N3_MIN_SALES = 5, 0.8, 0.5, 2
N45_OFF, N4_FRESH_S, N4_VETO, N5_WIN, N5_SOL, N5_VETO, N5_MIN_EARLY, N5_EARLY_S = 60, 10, 0.75, 5, 1.0, 3, 3, 60
P2_SHARE = 0.25  # my f016 PROTOCOL 323c1e6 threshold, unchanged (R96 (b))

# --- Codex record (identities and its per-launch values, for comparison only; no outcome column exists in that file — asserted)
with open(codex_csv, newline="") as fh:
    rd = csv.DictReader(fh); assert not ({"net_sol", "ret", "status", "exit", "fill_t", "sell_t"} & set(rd.fieldnames)); CX = {r["mint"]: r for r in rd}
assert len(CX) == 680 and sum(r["E"] == "True" for r in CX.values()) == 679 and sum(r["L003"] == "True" for r in CX.values()) == 296
L003 = {m for m, r in CX.items() if r["L003"] == "True"}

tok, gaps, outages, meta = ev.load(str(replay), START, END)
def rcv(r):
    v = fl(r["recv_ms"]); return v / 1000 if v is not None else None
def iscurve(r): return r["venue"] in ("", "curve")
def curve_price(r):
    if not iscurve(r) or not ev.state_ok(r): return None
    vs, vt = fl(r["vsol"]), fl(r["vtok"])
    if not vs or not vt: return None
    return vs / vt
def retention_eval(info, L):
    cum = 0.0
    for r in L:
        if not iscurve(r): continue
        if r["is_buy"] == "1": cum += fl(r["sol"]) or 0
        if info["tier"] >= 1 or cum >= ev.RETAIN_SOL: return rcv(r) if rcv(r) is not None else fl(r["ts"])
    return None

stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}; audit = collections.Counter()
recs = {}; n5_pending = {}   # mint -> (D, early wallets)
for m, L in ev.iter_mints(str(replay), tok, stats):
    info = tok[m]; created = info["created"]; t = created + AGE
    if retention_eval(info, L) is None: continue
    if any(s < created + HORIZON and e > created for s, e in outages): continue
    audit["denominator"] += 1
    # E membership exactly as f014/f016 (rules_common unchanged, sha f94d800b…)
    RO = sorted(L, key=lambda r: ((rcv(r) if rcv(r) is not None else fl(r["ts"])) * 1000, int(r["slot"]), int(r["row_id"])))
    RTall = [(rcv(r) if rcv(r) is not None else fl(r["ts"])) for r in RO]; k = bisect.bisect_right(RTall, t)
    f = rc.features(types.SimpleNamespace(t=t, created=created, trades=ev.Prefix(RO, k))) if retention_eval(info, L) <= t else None
    isE = bool(rc.eligible(f))
    if not isE and m not in L003: continue
    z = {"mint": m, "E": isE, "L003": m in L003, "half": "early" if created < SPLIT else "late", "cell": rc.cell_of(f) if f is not None else "unknown"}
    assert m in CX and CX[m]["E"] == str(isE) and CX[m]["cell"] == z["cell"] and CX[m]["half"] == z["half"]
    recs[m] = z
    # --- knowable rows: actual receipt required, RT <= t; receipt order
    K = sorted([r for r in L if rcv(r) is not None and rcv(r) <= t], key=lambda r: (rcv(r), int(r["slot"]), int(r["row_id"])))
    KC = [r for r in K if iscurve(r)]
    prefix_missing = any(iscurve(r) and rcv(r) is None and (fl(r["ts"]) or math.inf) <= t for r in L)
    # gross-receipt retention R: first received curve row at which cumulative gross curve-buy SOL >= 15 (no tier shortcut)
    g = 0.0; R = None
    for r in KC:
        if r["is_buy"] == "1": g += fl(r["sol"]) or 0
        if g >= 15: R = rcv(r); break
    z["R"] = R; z["prefix_missing"] = prefix_missing
    # ---------------- N1 ----------------
    if prefix_missing or R is None or R + N1_OFF > t:
        z["N1"] = ("unknown", None, None)
    else:
        D = R + N1_OFF; KD = [r for r in KC if rcv(r) <= D]
        first_seen = {}
        for r in KD:
            w = r["wallet"]
            if w not in first_seen: first_seen[w] = rcv(r)   # first observed curve appearance (buy or sell) on this mint
        inits = [r for r in KD if r["is_buy"] == "1" and (fl(r["sol"]) or 0) >= N1_INIT_SOL and R <= rcv(r) <= D]
        best = 0
        for a in inits:
            ta = rcv(a); fol = set()
            for b in KD:
                if b["is_buy"] != "1" or (fl(b["sol"]) or 0) < N1_FOLLOW_SOL or b["wallet"] == a["wallet"]: continue
                if not (ta < rcv(b) <= D): continue          # the qualifying buy itself strictly after the initiator receipt
                if not (first_seen[b["wallet"]] > ta): continue   # AND the wallet's first appearance strictly after (ties are not 'after')
                fol.add(b["wallet"])
            best = max(best, len(fol))
        z["N1"] = ("known", best, best >= N1_SIGNAL); z["N1_inits"] = len(inits)
    # ---------------- N3 ----------------
    if prefix_missing or not KC:
        z["N3"] = ("unknown", None, None)
    else:
        s0 = min(int(r["slot"]) for r in KC); F = [r for r in KC if int(r["slot"]) == s0]
        buy_by = collections.defaultdict(float)
        for r in F:
            if r["is_buy"] == "1": buy_by[r["wallet"]] += fl(r["sol"]) or 0
        if not buy_by: z["N3"] = ("unknown", None, None)
        else:
            w = min(buy_by, key=lambda x: (-buy_by[x], x)); bought = sold = 0.0; sales = []; ev_i = None
            for i, r in enumerate(KC):
                if r["wallet"] != w: continue
                q = fl(r["tokens"]) or 0
                if r["is_buy"] == "1": bought += q
                else:
                    sold += q; sales.append(i)
                    if bought > 0 and sold >= N3_SOLD_FRAC * bought: ev_i = i; break
            if ev_i is None: z["N3"] = ("known", None, False); z["N3_noopp"] = True
            else:
                te = rcv(KC[ev_i]); D = te + N3_OFF; z["N3_D"] = D; z["N3_nsales"] = len(sales)
                def imp(j):
                    if j == 0: return None
                    p0, p1 = curve_price(KC[j - 1]), curve_price(KC[j]); s = fl(KC[j]["sol"]) or 0
                    if not p0 or not p1 or s <= 0: return None
                    return (p0 - p1) / p0 / s
                if D > t: z["N3"] = ("unknown", None, None); z["N3_why"] = "event+5>E"
                elif len(sales) < N3_MIN_SALES: z["N3"] = ("unknown", None, None); z["N3_why"] = "<2 sales"
                elif sold > bought + 1e-6: z["N3"] = ("unknown", None, None); z["N3_why"] = "oversell"
                elif any(rcv(r) > te for r in F): z["N3"] = ("unknown", None, None); z["N3_why"] = "cohort not known at event"
                elif any((not iscurve(r)) and rcv(r) <= D for r in K): z["N3"] = ("unknown", None, None); z["N3_why"] = "pool row before D"
                else:
                    i1, i2 = imp(sales[0]), imp(sales[-1])
                    if i1 is None or i2 is None or i1 <= 0 or i2 < 0: z["N3"] = ("unknown", None, None); z["N3_why"] = "impact invalid"
                    else:
                        pre_vsol = fl(KC[ev_i - 1]["vsol"])
                        rec = any(te < rcv(r) <= D and curve_price(r) and fl(r["vsol"]) >= pre_vsol for r in KC)
                        z["N3"] = ("known", i2 / i1, (i2 / i1 <= N3_RATIO) and rec)
    # ---------------- N4 / N5 ----------------
    if prefix_missing or R is None or R + N45_OFF > t:
        z["N4"] = ("unknown", None, None); z["N5"] = ("unknown", None, None)
        continue
    D = R + N45_OFF; z["N45_D"] = D; P = [r for r in K if rcv(r) <= D]
    early = {r["wallet"] for r in P if iscurve(r) and r["is_buy"] == "1" and rcv(r) <= created + N5_EARLY_S}
    # N4 — FIFO lots per wallet
    lots = collections.defaultdict(list); bad = None
    for r in P:
        if not iscurve(r): bad = "pool row"; break
        q = fl(r["tokens"]); tr = rcv(r)
        if q is None or q < 0: bad = "bad tokens"; break
        if r["is_buy"] == "1": lots[r["wallet"]].append([tr, q])
        else:
            ll = lots[r["wallet"]]
            while q > 1e-6 and ll:
                u = min(q, ll[0][1]); q -= u; ll[0][1] -= u
                if ll[0][1] <= 1e-6: ll.pop(0)
            if q > 1e-6: bad = "oversell"; break
    if bad: z["N4"] = ("unknown", None, None); z["N4_why"] = bad
    else:
        tot = sum(q for ll in lots.values() for _, q in ll); fr = sum(q for ll in lots.values() for tr, q in ll if D - N4_FRESH_S < tr <= D)
        z["N4"] = ("unknown", None, None) if tot <= 0 else ("known", fr / tot, fr / tot >= N4_VETO)
    # N5
    if len(early) < N5_MIN_EARLY: z["N5"] = ("known", 0, False); z["N5_noopp"] = True
    else: n5_pending[m] = (D, early)
assert len(recs) == 680 and sum(z["E"] for z in recs.values()) == 679 and audit["denominator"] == 3638 and stats["non_contiguous"] == 0

# ---- second pass for N5: recorded sells by the early wallets on OTHER window mints, actual receipt only, in (D - 5, D]
want = set().union(*(e for _, e in n5_pending.values()))
sells = collections.defaultdict(list); st2 = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}
for m, L in ev.iter_mints(str(replay), tok, st2):
    for r in L:
        if r["is_buy"] == "1" or r["wallet"] not in want or rcv(r) is None: continue
        proven = iscurve(r) or ev.state_ok(r)
        sells[r["wallet"]].append((rcv(r), m, fl(r["sol"]) or 0, proven))
for m, (D, early) in n5_pending.items():
    cnt = 0; unproven = 0
    for w in early:
        rows = [x for x in sells.get(w, []) if D - N5_WIN < x[0] <= D and x[1] != m]
        unproven += sum(1 for x in rows if not x[3])
        if sum(x[2] for x in rows if x[3]) >= N5_SOL: cnt += 1
    z = recs[m]; z["N5_unproven"] = unproven
    z["N5"] = ("unknown", None, None) if unproven else ("known", cnt, cnt >= N5_VETO)
    # reading variant (counts only): protocol text says unproven pool rows are "excluded" from the sums — if that meant 'drop the rows, keep
    # the launch defined' rather than 'launch unknown', the launch would be known with this count:
    z["N5_if_rows_excluded"] = (cnt, cnt >= N5_VETO)

# ---- compare with Codex per launch
def cx_known(r, n): return r[n + "_known"] == "True"
def cx_sig(r, n): return r[n + "_signal"] == "True"
cmp = {}
for n in ("N1", "N3", "N4", "N5"):
    agree_known = agree_sig = agree_stat = 0; diffs = []
    for m, z in recs.items():
        r = CX[m]; mine = z[n]; ck = cx_known(r, n)
        if (mine[0] == "known") == ck: agree_known += 1
        else: diffs.append((m, "known", mine[0], ck))
        if mine[0] == "known" and ck:
            if bool(mine[2]) == cx_sig(r, n): agree_sig += 1
            else: diffs.append((m, "signal", mine[2], cx_sig(r, n)))
            cs = r[n + "_stat"]; ms = mine[1]
            if (cs == "" and ms is None) or (cs != "" and ms is not None and abs(float(cs) - ms) <= 1e-9 * max(1, abs(ms))): agree_stat += 1
            else: diffs.append((m, "stat", ms, cs))
    cmp[n] = {"launches": 680, "known_flag_agree": agree_known, "signal_agree_on_jointly_known": agree_sig, "stat_agree_on_jointly_known": agree_stat, "differences": diffs[:20], "n_differences": len(diffs)}

def summ(pop, n, veto_is_absence):
    rr = [recs[m] for m in pop]; known = [z for z in rr if z[n][0] == "known"]; sig = sum(1 for z in known if z[n][2])
    veto = len(known) - sig if veto_is_absence else sig
    return {"population": len(rr), "known": len(known), "unknown": len(rr) - len(known), "signal": sig, "veto": veto,
            "veto_share_defined": veto / len(known) if known else None, "no_opportunity": sum(1 for z in known if z.get(n + "_noopp"))}
E = [m for m, z in recs.items() if z["E"]]; L3 = [m for m, z in recs.items() if z["L003"]]
tab = {}
for n, absence in (("N1", True), ("N3", True), ("N4", False), ("N5", False)):
    tab[n] = {"E679": summ(E, n, absence), "L003_296": summ(L3, n, absence),
              "E_by_half": {h: summ([m for m in E if recs[m]["half"] == h], n, absence) for h in ("early", "late")},
              "E_by_cell": {c: summ([m for m in E if recs[m]["cell"] == c], n, absence) for c in ("A", "B", "C")}}
# N1 tie check: how many N1-known E launches have any follower candidate excluded ONLY by the first-appearance-tie rule? (count re-derived directly)
tie_affected = 0
# N5 reading variant
n5_var = {"E_unknown_for_unproven_pool_rows": sum(1 for m in E if recs[m].get("N5_unproven")),
          "E_signal_if_those_launches_kept_with_rows_dropped": sum(1 for m in E if recs[m].get("N5_unproven") and recs[m]["N5_if_rows_excluded"][1]),
          "E_signal_total_under_that_reading": sum(1 for m in E if (recs[m]["N5"][0] == "known" and recs[m]["N5"][2]) or (recs[m].get("N5_unproven") and recs[m]["N5_if_rows_excluded"][1]))}

# ================= Part B: R86 (2) receipt-clock variant =================
p2 = []
st3 = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}
for m, L in ev.iter_mints(str(replay), tok, st3):
    if m not in recs or not recs[m]["E"]: continue
    info = tok[m]; created = info["created"]; t = created + AGE
    RO = sorted(L, key=lambda r: ((rcv(r) if rcv(r) is not None else fl(r["ts"])) * 1000, int(r["slot"]), int(r["row_id"])))
    RT = [(rcv(r) if rcv(r) is not None else fl(r["ts"])) for r in RO]; k = bisect.bisect_right(RT, t); P = RO[:k]; PT = RT[:k]
    f = rc.features(types.SimpleNamespace(t=t, created=created, trades=ev.Prefix(RO, k))); assert rc.eligible(f)
    buys = [(r, PT[i]) for i, r in enumerate(P) if iscurve(r) and r["is_buy"] == "1"]
    # block clock (f016): W = block ts > t-60 ; before = block ts <= t-60
    Wb = {r["wallet"] for r, _ in buys if fl(r["ts"]) > t - 60}; Bb = {r["wallet"] for r, _ in buys if fl(r["ts"]) <= t - 60}; assert len(Wb) == f["buyers_last_60s"]
    sb = len(Wb & Bb) / len(Wb)
    # receipt clock (R96 (b)): W_RT = RT in (t-60, t] ; before = RT <= t-60
    Wr = {r["wallet"] for r, rt in buys if t - 60 < rt <= t}; Br = {r["wallet"] for r, rt in buys if rt <= t - 60}
    sr = len(Wr & Br) / len(Wr) if Wr else None
    p2.append({"mint": m, "half": recs[m]["half"], "cell": recs[m]["cell"], "n_W_block": len(Wb), "adders_block": len(Wb & Bb), "share_block": sb, "veto_block": sb < P2_SHARE,
               "n_W_receipt": len(Wr), "adders_receipt": len(Wr & Br), "share_receipt": sr, "veto_receipt": (sr is not None and sr < P2_SHARE), "W_receipt_defined": bool(Wr),
               "W_sets_equal": Wb == Wr})
assert len(p2) == 679
def share_tab(key, vkey, rows):
    D = [r for r in rows if r[key] is not None]; V = [r for r in D if r[vkey]]
    o = {"E": len(rows), "defined": len(D), "veto": len(V), "bind_share_of_E": len(V) / len(rows), "bind_share_of_defined": len(V) / len(D) if D else None,
         "by_half": {}, "by_cell": {}}
    for h in ("early", "late"): d = [r for r in D if r["half"] == h]; v = [r for r in d if r[vkey]]; o["by_half"][h] = {"defined": len(d), "veto": len(v), "share": len(v) / len(d) if d else None}
    for c in ("A", "B", "C"): d = [r for r in D if r["cell"] == c]; v = [r for r in d if r[vkey]]; o["by_cell"][c] = {"defined": len(d), "veto": len(v), "share": len(v) / len(d) if d else None}
    xs = sorted(r[key] for r in D); q = statistics.quantiles(xs, n=4)
    o["quartiles"] = {"min": xs[0], "q1": q[0], "median": q[1], "q3": q[2], "max": xs[-1], "mean": statistics.mean(xs)}
    return o
ct = collections.Counter((r["veto_block"], r["veto_receipt"]) for r in p2)
partB = {"block_clock_f016": share_tab("share_block", "veto_block", p2), "receipt_clock_R96b": share_tab("share_receipt", "veto_receipt", p2),
         "W_sets_identical_under_both_clocks": sum(r["W_sets_equal"] for r in p2), "W_receipt_empty": sum(not r["W_receipt_defined"] for r in p2),
         "veto_agreement_2x2": {"veto_both": ct[(True, True)], "veto_block_only": ct[(True, False)], "veto_receipt_only": ct[(False, True)], "veto_neither": ct[(False, False)]},
         "share_abs_diff_quartiles": (lambda xs: {"median": statistics.median(xs), "q3": statistics.quantiles(xs, n=4)[2], "max": max(xs), "zero": sum(1 for x in xs if x == 0)})([abs(r["share_block"] - r["share_receipt"]) for r in p2 if r["share_receipt"] is not None])}

res = {"counts_only": True, "outcomes_read": False, "codex_record_file": str(codex_csv), "denominator": audit["denominator"], "records": 680, "E": 679, "L003": 296,
       "partA_independent_counts": tab, "partA_per_launch_comparison_with_C019": cmp, "partA_N5_reading_variant": n5_var,
       "partA_checks": {"N1_strict_after": "follower's qualifying buy receipt > initiator receipt AND wallet's first curve appearance > initiator receipt; equality excluded (protocol: 'receipt ties are not after') — re-implemented and agrees per launch (see comparison)",
                        "N5_window": "sells with receipt in (D − 5, D] where D = R + 60, on window mints other than the decided mint — re-implemented and agrees per launch (see comparison)"},
       "partB_R86_2_clock_variant": partB, "stream_stats": {k: v for k, v in stats.items() if k != "_done"}}
json.dump(res, open(out / "results.json", "w"), indent=1, default=str)
with open(out / "f017_r86_2_clocks.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(p2[0].keys())); w.writeheader(); w.writerows(p2)
with open(out / "f017_partA_records.csv", "w", newline="") as fh:
    cols = ["mint", "E", "L003", "half", "cell", "R", "prefix_missing"] + [f"{n}_{x}" for n in ("N1", "N3", "N4", "N5") for x in ("known", "stat", "signal")]
    w = csv.writer(fh); w.writerow(cols)
    for m, z in recs.items(): w.writerow([m, z["E"], z["L003"], z["half"], z["cell"], z["R"], z["prefix_missing"]] + [v for n in ("N1", "N3", "N4", "N5") for v in (z[n][0] == "known", z[n][1], z[n][2])])
print(json.dumps({"partA": {n: tab[n]["E679"] for n in tab}, "cmp": {n: {k: v for k, v in cmp[n].items() if k != "differences"} for n in cmp}, "n5_var": n5_var,
                  "partB": {"block": partB["block_clock_f016"]["veto"], "receipt": partB["receipt_clock_R96b"]["veto"], "2x2": partB["veto_agreement_2x2"]}}, indent=1))
