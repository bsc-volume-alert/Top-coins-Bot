#!/usr/bin/env python3
"""Book numbers for the notes in reports/books/*.md.

Usage:  python3 -I reports/books/numbers.py <data_dir> [--write]
  <data_dir> holds abcd.csv, others.csv, launches.csv, executor.json from the `data` branch
  (e.g. git show origin/data:data/abcd.csv > dir/abcd.csv ...).
Without --write it prints every book's block; with --write it replaces the block between
<!-- NUMBERS --> and <!-- /NUMBERS --> in each book's file (the marker pair is added if only
<!-- NUMBERS --> is present).

Method (the same one used in every analysis given to the owner since 20 Oct):
- Real costs. PumpSwap / pool: x/1.02*0.967 - 1 - 0.006 - 0.02, stops (x <= 0.62) -0.05 more.
  Curve (snipers, PG): x*0.97 - 0.02 - 1 - 0.02, stops -0.01 more; floor sells (peak >= 1.5,
  0.62 < x <= 1.32 on x_h5/x_h3) -0.12 more; x capped at 15; lateFix: if the 1-s price
  (fs1_x) is above 1.5x the entry, every x is divided by it.
- The operator's pump-and-dump coins (bundle_wallets=10, bundle_pct 37-41, bundle_sol 22-28,
  dev_buy_sol < 0.2) are left out of every book except S10.
- "Without best" = average with the single best trade removed (is it one lucky coin?).
- SOL figures are at 0.1 SOL a trade with 0.001 SOL a trade fees.
"""
import csv, json, sys, os, re, statistics as st, datetime as dt
from collections import defaultdict

D = sys.argv[1]; WRITE = "--write" in sys.argv
HERE = os.path.dirname(os.path.abspath(__file__))
csv.field_size_limit(10**9)

def f(r, c):
    try: return float(r[c])
    except Exception: return None

def U(day, h, m):  # UTC timestamp, October 2026
    return int(dt.datetime(2026, 10, day, h, m, tzinfo=dt.timezone.utc).timestamp())

def uk(t, fmt="%d %b %H:%M"):
    return dt.datetime.fromtimestamp(int(t) + 3600, dt.timezone.utc).strftime(fmt) + " UK"

A = list(csv.DictReader(open(f"{D}/abcd.csv")))
O = [r for r in csv.DictReader(open(f"{D}/others.csv")) if r.get("invalid") in ("", "0", None)]
ALL = A + O
NOW = max(int(r["entry_ts"]) for r in ALL)
FPM = set()
for r in csv.DictReader(open(f"{D}/launches.csv")):
    try:
        if int(float(r["bundle_wallets"])) == 10 and 37 <= float(r["bundle_pct"]) <= 41 and 22 <= float(r["bundle_sol"]) <= 28 and float(r["dev_buy_sol"] or 0) < 0.2:
            FPM.add(r["mint"])
    except Exception: pass
def fp(r):
    # abcd.csv has no bundle_sol column and launches.csv only covers ~24 h, so for older rows the
    # fingerprint is matched on bundle_wallets, bundle_pct and dev_buy_sol alone (found 21 Oct 00:50 UK:
    # five operator coins - The French Lord, Keyboard Cat, French Piccolo, discat, Etchy Cat - had slipped into AS)
    if r["mint"] in FPM: return True
    bs = f(r, "bundle_sol")
    return (f(r, "bundle_wallets") == 10 and 37 <= (f(r, "bundle_pct") or 0) <= 41 and (f(r, "dev_buy_sol") or 0) < 0.2
            and (bs is None or 22 <= bs <= 28))

def real(x, curve=False):
    x = min(x, 15)
    if x <= 0.05: return -1.0
    if curve: return x * 0.97 - 0.02 - (0.01 if x <= 0.62 else 0) - 1 - 0.02
    v = x / 1.02 * 0.967 - 1 - 0.006 - 0.02
    return v - 0.05 if x <= 0.62 else v

def rv(r, col, curve):
    x = f(r, col)
    if x is None: return None
    late = f(r, "fs1_x") if curve else None
    div = late if (late and late > 1.5) else 1
    x /= div
    pk = (f(r, "peak_mult") or 0) / div
    floor = curve and col in ("x_h5", "x_h3") and pk >= 1.5 and 0.62 < x <= 1.32
    return real(x, curve) - (0.12 if floor else 0)

# ---------- book definitions ----------
soc = lambda r: r.get("has_socials") != "0"
devout = lambda r: f(r, "dev_hold_entry") == 0 and (f(r, "dev_buy_sol") or 0) > 0
big = lambda r: (f(r, "max_share") or 0) * (f(r, "sol60") or 0)
std = lambda r: soc(r) and not devout(r) and 3 <= big(r) < 5
def rows(strategy, passed=True, keep_fp=False):
    return [r for r in ALL if r["strategy"] == strategy and (keep_fp or not fp(r)) and (not passed or r.get("pass") in ("1", None) or strategy not in ("p5e30", "p5e50", "p5w30", "p5e80"))]
def a2(r):  # A2: sold at 60 s if under 0.95, else the runner exit
    t60 = f(r, "t60_x")
    if t60 is not None and t60 < 0.95: return real(t60, False)
    return rv(r, "x_flow4", False)

# name: (file, rows, exit column or function, curve, last change ts or None, executor book or None, note)
B = [
    ("A", rows("p5e30"), "x_flow4", False, None, "runner", "A's passed rows, runner exit"),
    ("B", rows("p5e30"), "x_h5", False, None, "hold5", "A's coins sold at 5 min"),
    ("C", rows("p5w30"), "x_flow4", False, None, "wide", ""),
    ("D", rows("p5e50"), "x_flow4", False, None, "strict", ""),
    ("80", rows("p5e80"), "x_flow4", False, None, None, ""),
    ("E", rows("momentum"), "x_flow4", False, None, None, "abcd momentum rows"),
    ("F", [r for r in rows("p5e30") if (f(r, "bundle_wallets") or 99) <= 3], "x_flow4", False, None, "small", "A with launch bundle <= 3 wallets"),
    ("G", [r for r in rows("p5e30", passed=False) if r.get("pass") != "1" and "wallets" in (r.get("skip_why") or "") and (f(r, "wal60") or 999) <= 500], "x_h5", False, None, "crowd", "A's trigger on coins A skips for 150-500 wallets, 5-min"),
    ("A2", [r for r in rows("p5e30") if int(r["entry_ts"]) >= U(19, 19, 0)], a2, False, None, None, "A sold at 60 s if under 0.95"),
    ("A5", rows("p5c5", False), "x_flow4", False, None, "confirm", ""),
    ("F6", rows("p5c10", False), "x_flow4", False, None, None, ""),
    ("AS", [r for r in rows("p5e30") if std(r)], "x_flow4", False, U(20, 16, 45), None, "A + standard filters"),
    ("DS", [r for r in rows("p5e50") if std(r)], "x_flow4", False, U(20, 16, 45), None, "D + standard filters"),
    ("DC", [r for r in rows("p5e50") if (f(r, "cc_best_mc24h") or 0) >= 72000], "x_flow4", False, U(20, 15, 0), None, "D, copycat of a $72K+ coin"),
    ("H", [r for r in rows("p5e30") if (f(r, "gh_top10") is not None and f(r, "gh_top10") < 0.23)], "x_flow4", False, U(20, 19, 0), None, "A, top-10 holders under 23%"),
    ("GR", rows("grf"), "x_h3", False, U(20, 6, 30), "grad", "graduation book, 3-min exit"),
    ("GR every graduation", [r for r in rows("grad") if (f(r, "age_s") or 0) >= 10], "x_h3", False, None, None, "off-page grad, instant ones left out"),
    ("K", rows("k"), "x_h5", False, None, None, "page headline is x_h2t40, not in the data export; 5-min shown"),
    ("R", rows("rev"), "x_tsl40", False, None, None, ""),
    ("PG", rows("pg"), "x_t2s40", True, None, None, "curve costs"),
] + [(f"S{k[2:]}", rows(k, keep_fp=(k == "sn10")), "x_h5", True, None, ex, "curve costs, 5-min exit")
     for k, ex in (("sn1", "dev"), ("sn2", None), ("sn3", "copy"), ("sn3b", None), ("sn4", "clean"), ("sn4b", None), ("sn5", None), ("sn6", "smart"), ("sn6b", "famous"), ("sn7", None), ("sn7b", "sn7b"), ("sn8", None), ("sn9", "swarm"), ("sn10", "op"), ("sn11", None))]
OFF = ["early", "wave2", "copy", "mom60", "momfast", "mom80", "momentum", "momconf", "momdip", "momre", "gradrec", "gradrun", "revival", "slow", "climber", "secondwave", "confirm", "p6"]

EX = json.load(open(f"{D}/executor.json"))
legs = defaultdict(list)
for t in EX.get("trades", []):
    if t.get("st") == "closed" and t.get("pnl") is not None and t.get("cost"):
        legs[t["book"]].append(t)

def stats(T, col, curve, since=0):
    v = []
    for r in T:
        if int(r["entry_ts"]) < since: continue
        x = col(r) if callable(col) else rv(r, col, curve)
        if x is not None: v.append(x)
    if not v: return None
    srt = sorted(v)
    return dict(n=len(v), mean=st.mean(v), nob=st.mean(srt[:-1]) if len(v) > 1 else v[0], won=sum(a > 0 for a in v) / len(v), stops=sum(a < -0.35 for a in v) / len(v), sol=0.1 * sum(v) - 0.001 * len(v))

def row(label, s):
    if not s: return f"| {label} | 0 | — | — | — | — | — |"
    return f"| {label} | {s['n']} | {100*s['mean']:+.1f}% | {100*s['nob']:+.1f}% | {100*s['won']:.0f}% | {100*s['stops']:.0f}% | {s['sol']:+.2f} |"

def block(name, T, col, curve, chg, exb, note):
    first = min((int(r["entry_ts"]) for r in T), default=None)
    out = [f"_Data to {uk(NOW)}; {note or 'real costs'}. Built by reports/books/numbers.py._", "",
           "| window | trades | avg per trade | without best | won | stopped | SOL at 0.1 |", "|---|---|---|---|---|---|---|"]
    out.append(row(f"all (from {uk(first) if first else '-'})", stats(T, col, curve)))
    if chg:
        out.append(row(f"before the change ({uk(chg)}) — back-test", stats([r for r in T if int(r['entry_ts']) < chg], col, curve)))
        out.append(row("since the change — the real test", stats(T, col, curve, chg)))
    for h in (24, 12, 6):
        out.append(row(f"last {h} h", stats(T, col, curve, NOW - h * 3600)))
    if exb and legs.get(exb):
        L = legs[exb]; by = defaultdict(list)
        for t in L: by[t["mode"]].append(t)
        out.append("")
        for mode, LL in by.items():
            r = [t["pnl"] / t["cost"] for t in LL]; srt = sorted(r)
            out.append(f"Executor book `{exb}` ({mode}, real quotes{' and real money' if mode == 'live' else ''}): {len(LL)} legs, {sum(t['pnl'] for t in LL)/1e9:+.3f} SOL, average {100*st.mean(r):+.1f}% a leg, without best {100*st.mean(srt[:-1]) if len(r) > 1 else 0:+.1f}%, won {100*sum(x > 0 for x in r)/len(r):.0f}%, {uk(min(t['o'] for t in LL))} to {uk(max(t['o'] for t in LL))}.")
    return "\n".join(out)

blocks = {}
for name, T, col, curve, chg, exb, note in B:
    blocks[name] = block(name, T, col, curve, chg, exb, note)
off = []
for k in OFF:
    T = [r for r in O if r["strategy"] == k and not fp(r)]
    col = "x_flow4" if any(r.get("x_flow4") for r in T) else "x_h5"
    if k == "confirm": col = "x_tsl40"
    s_all, s12 = stats(T, col, False), stats(T, col, False, NOW - 43200)
    off.append(f"- **{k}** ({col}): all {s_all['n'] if s_all else 0} at {100*s_all['mean'] if s_all else 0:+.1f}%; last 12 h {s12['n'] if s12 else 0} at {100*s12['mean'] if s12 else 0:+.1f}%")
blocks["OFFPAGE"] = f"_Data to {uk(NOW)}._\n\n" + "\n".join(off)

FILE = {"GR every graduation": "GR"}
merged = defaultdict(list)
for name, b in blocks.items():
    merged[FILE.get(name, name)].append(b if FILE.get(name) is None else f"**{name}**\n\n{b}")
for fn, parts in merged.items():
    text = "\n\n".join(parts)
    path = os.path.join(HERE, f"{fn}.md")
    if not WRITE:
        print(f"===== {fn}\n{text}\n"); continue
    if not os.path.exists(path):
        print("missing", path); continue
    doc = open(path).read()
    new = f"<!-- NUMBERS -->\n{text}\n<!-- /NUMBERS -->"
    if "<!-- /NUMBERS -->" in doc:
        doc = re.sub(r"<!-- NUMBERS -->.*?<!-- /NUMBERS -->", lambda m: new, doc, flags=re.S)
    else:
        doc = doc.replace("<!-- NUMBERS -->", new, 1)
    open(path, "w").write(doc)
    print("updated", fn)
