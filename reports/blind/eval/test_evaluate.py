#!/usr/bin/env python3
"""Unit tests for evaluate.py (synthetic data). Run: python3 -I test_evaluate.py"""
import os, sys, json, tempfile, csv, importlib.util, math
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("ev", os.path.join(HERE, "evaluate.py")); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
COLS = "row_id,mint,sig,slot,ts,wallet,is_buy,sol,tokens,price_sol,recv_ms,vsol,vtok,venue,pool,ev_idx,base_raw,quote_raw,pool_base_raw,pool_quote_raw,base_mint,quote_mint,base_dec,quote_dec,dec_ver,px_adj".split(",")
T0 = 1794182400  # 2026-11-08 00:00 UTC
fails = 0
def check(name, cond):
    global fails
    print(("PASS " if cond else "FAIL ") + name); fails += 0 if cond else 1

def curve_trade(i, mint, ts, sol, buy=True, vsol=40e9, vtok=800e12, recv=True, slot=None):
    return {"row_id": i, "mint": mint, "sig": f"s{mint}{i}", "slot": slot or i, "ts": ts, "wallet": f"w{i}", "is_buy": 1 if buy else 0, "sol": sol, "tokens": 1, "price_sol": "",
            "recv_ms": int(ts * 1000 + 300) if recv else "", "vsol": int(vsol), "vtok": int(vtok), "venue": "curve"}
def pool_trade(i, mint, ts, vsol=100e9, vtok=200e12, evidence=True):
    d = {"row_id": i, "mint": mint, "sig": f"p{mint}{i}", "slot": i, "ts": ts, "wallet": f"q{i}", "is_buy": 1, "sol": 1, "tokens": 1, "price_sol": "", "recv_ms": int(ts * 1000 + 300),
         "vsol": int(vsol), "vtok": int(vtok), "venue": "pumpswap"}
    if evidence: d.update({"quote_mint": ev.WSOL, "base_dec": 6, "quote_dec": 9, "dec_ver": "ps-0.19.9", "pool": "P", "ev_idx": 0})
    return d
def write(d, rows, tokens, gaps=(), outages=()):
    with open(os.path.join(d, "trades_part_001.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLS); w.writeheader(); [w.writerow({k: r.get(k, "") for k in COLS}) for r in rows]
    with open(os.path.join(d, "tokens.csv"), "w") as f:
        f.write("mint,create_ts,tier,finalized\n"); [f.write(f"{m},{c},{t},1\n") for m, c, t in tokens]
    with open(os.path.join(d, "feed_gaps.csv"), "w") as f:
        f.write("rowid,ts,event,detail\n"); [f.write(f"{i},{t},{e},x\n") for i, (t, e) in enumerate(gaps)]
    with open(os.path.join(d, "outages.txt"), "w") as f:
        [f.write(f"{a} {b} test\n") for a, b in outages]
def rule(d, body):
    p = os.path.join(d, "rule.py"); open(p, "w").write(body); return p
BUY60_HOLD = '''RULE={"name":"t","decision_offsets":[60],"on_trade":False,"horizon_s":600,"sizes":[0.2]}
def decide(v): return True
def exit_signal(p): return False
'''
def run(d, rules):
    out = os.path.join(d, "r.json"); ev.main(["--data", d, "--rules", *rules, "--out", out]); return json.load(open(out))

# 1. basic: retained by gross buys at t+10, enter at 60, flat price, sell at horizon → loss ≈ fees only
with tempfile.TemporaryDirectory() as d:
    rows = [curve_trade(i, "A", T0 + i * 10, 5.0) for i in range(80)]
    write(d, rows, [("A", T0, 0)]); r = run(d, [rule(d, BUY60_HOLD)])
    s = r["rules"]["t"]["by_size"]["0.2"]
    check("basic scored", s["scored"] == 1 and s["N"] == 1)
    exp = -(0.2 * (1 - 1 / (1 + 0.0125) * (1 - 0.0125)) + 0.0015) / 0.2  # price unchanged in this synthetic state
    check("basic return ≈ fee-only loss", abs(s["mean_ret"] - exp) < 0.01)
# 2. not yet retained at the decision → abstention (retention happens at 300 s: 3 buys of 5 SOL at 100/200/300)
with tempfile.TemporaryDirectory() as d:
    rows = [curve_trade(i, "B", T0 + 100 * (i + 1), 5.0) for i in range(3)] + [curve_trade(10 + i, "B", T0 + 310 + i, 1.0) for i in range(30)]
    write(d, rows, [("B", T0, 0)]); r = run(d, [rule(d, BUY60_HOLD)]); s = r["rules"]["t"]["by_size"]["0.2"]
    check("not retained yet → abstain, still in N", s["abstain"] == 1 and s["N"] == 1)
# 3. capture gap over the fill → unknown, worst-case lower bound
with tempfile.TemporaryDirectory() as d:
    rows = [curve_trade(i, "C", T0 + i * 20, 5.0) for i in range(40)]
    write(d, rows, [("C", T0, 0)], gaps=[(T0 + 55, "closed"), (T0 + 70, "open")]); r = run(d, [rule(d, BUY60_HOLD)]); s = r["rules"]["t"]["by_size"]["0.2"]
    check("gap at fill → unknown", s["unknown"] == 1)
    check("unknown never improves: lower bound = worst case", abs(s["lower_sol_per_launch"] - (-(0.2 + 0.0015))) < 1e-9 and s["point_sol_per_launch"] == 0)
    check("unknown > 10% → not scorable", s["scorable"] is False)
# 4. outage over the launch → excluded from the common denominator
with tempfile.TemporaryDirectory() as d:
    rows = [curve_trade(i, "D", T0 + i * 20, 5.0) for i in range(40)]
    write(d, rows, [("D", T0, 0)], outages=[(T0 + 500, T0 + 600)]); r = run(d, [rule(d, BUY60_HOLD)])
    check("outage → not in N", r["N_common"] == 0)
# 5. duplicates removed by full fingerprint, not by signature alone
with tempfile.TemporaryDirectory() as d:
    rows = [curve_trade(i, "E", T0 + i * 10, 5.0) for i in range(80)]
    dup = dict(rows[5]); dup["row_id"] = 999; same_sig_diff = dict(rows[6]); same_sig_diff["row_id"] = 998; same_sig_diff["sol"] = 2.0
    write(d, rows + [dup, same_sig_diff], [("E", T0, 0)]); r = run(d, [rule(d, BUY60_HOLD)])
    check("exact duplicate removed, same-sig different trade kept", r["duplicates_removed"] == 1)
# 6. price rises 2x after entry, exit trigger at x ≥ 1.5 → sells 0.7 s later on the then-state, positive
with tempfile.TemporaryDirectory() as d:
    rows = [curve_trade(i, "F", T0 + i * 10, 5.0, vsol=40e9, vtok=800e12) for i in range(8)]
    rows += [curve_trade(8 + i, "F", T0 + 80 + i * 10, 1.0, vsol=40e9 * (1 + 0.1 * (i + 1)), vtok=800e12 / (1 + 0.1 * (i + 1))) for i in range(20)]
    write(d, rows, [("F", T0, 0)])
    r = run(d, [rule(d, '''RULE={"name":"t","decision_offsets":[60],"on_trade":False,"horizon_s":3600,"sizes":[0.2,0.02]}
def decide(v): return True
def exit_signal(p): return p.x >= 1.5
''')]); s = r["rules"]["t"]["by_size"]["0.2"]; s2 = r["rules"]["t"]["by_size"]["0.02"]
    check("exit trigger → positive return", s["scored"] == 1 and s["mean_ret"] > 0.4)
    check("0.02 size scored separately (fixed fee weighs more)", s2["mean_ret"] < s["mean_ret"])
# 7. decisions see only RECEIVED trades: a trade with recv after t is invisible at t
with tempfile.TemporaryDirectory() as d:
    rows = [curve_trade(i, "G", T0 + i * 5, 5.0) for i in range(11)]
    late = curve_trade(50, "G", T0 + 58, 5.0); late["recv_ms"] = int((T0 + 65) * 1000)
    rows += [late] + [curve_trade(60 + i, "G", T0 + 70 + i, 1.0) for i in range(30)]
    write(d, rows, [("G", T0, 0)])
    r = run(d, [rule(d, '''RULE={"name":"t","decision_offsets":[60],"on_trade":False,"horizon_s":600,"sizes":[0.2]}
def decide(v): return not any(str(t["row_id"])=="50" for t in v.trades)
def exit_signal(p): return False
''')]); check("unreceived trade invisible at decision", r["rules"]["t"]["by_size"]["0.2"]["scored"] == 1)
# 8. pool state without wSOL/decimals evidence → unknown at exit
with tempfile.TemporaryDirectory() as d:
    rows = [curve_trade(i, "H", T0 + i * 10, 5.0) for i in range(8)] + [pool_trade(100 + i, "H", T0 + 90 + i * 5, evidence=False) for i in range(200)]
    write(d, rows, [("H", T0, 0)]); r = run(d, [rule(d, BUY60_HOLD)])
    check("pool exit without evidence → unknown", r["rules"]["t"]["by_size"]["0.2"]["unknown"] == 1)
# 9. migration: curve entry, pool exit with evidence → scored, exit venue pumpswap
with tempfile.TemporaryDirectory() as d:
    rows = [curve_trade(i, "I", T0 + i * 10, 5.0) for i in range(8)] + [pool_trade(100 + i, "I", T0 + 90 + i * 5) for i in range(200)]
    write(d, rows, [("I", T0, 0)]); r = run(d, [rule(d, BUY60_HOLD)])
    check("migration handled (curve fill, pool exit)", r["rules"]["t"]["by_size"]["0.2"]["scored"] == 1)
# 10. missing recv_ms → flagged as event-time hypothetical
with tempfile.TemporaryDirectory() as d:
    rows = [curve_trade(i, "J", T0 + i * 10, 5.0, recv=(i % 2 == 0)) for i in range(80)]
    write(d, rows, [("J", T0, 0)]); r = run(d, [rule(d, BUY60_HOLD)])
    check("missing recv_ms → hypothetical flag", r["rules"]["t"]["event_time_hypothetical_entries"] == 1)
print("FAILURES:", fails); sys.exit(1 if fails else 0)
