#!/usr/bin/env python3
"""Per-book diagnosis: the same method used on AS (21 Oct), for any book.

Usage:  python3 -I reports/books/diagnose.py <data_dir> <BOOK> [<BOOK> ...]     (or "all", or OFF:<strategy> for off-page books)
        Writes reports/books/diag/<BOOK>.md and prints it.

What it does, all at real costs (see numbers.py for the cost models, lateFix and the operator-coin exclusion):
1. Size and pace: trades, average, without best, won, stopped, trades a day, SOL a day at 0.1 SOL a trade.
2. Exits: every exit column the book has, scored the same way, with thirds by time and the last 24 h.
3. Winners vs losers: big winners (>= +50%), winners, small losers, stopped (<= -35%) - share, average and the median of key features.
4. The best and worst trades, with their features.
5. Factor search: every column known at the moment of buying, cut at 7 quantiles both ways (and == for small categories).
   STRICT TEST - a cut passes only if the kept trades beat the dropped ones in ALL THREE thirds of the book's history,
   the kept trades are positive without their best trade, and that beats the whole book without its best.
6. Luck check: the same search on the book's results shuffled at random (10 times). Passes found on shuffled data are pure
   chance - so "12 passes, 3 expected by luck" means most are real; "4 passes, 5 expected by luck" means none can be trusted.
7. Pairs of the best single cuts, same strict test.
8. Time blocks: the book in five equal slices of trades.
"""
import sys, os, random, statistics as st
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = sys.argv[1]; WANT = sys.argv[2:]
sys.argv = [sys.argv[0], DATA]
exec(open(os.path.join(HERE, "numbers.py")).read().split("EX = json.load")[0])  # data, cost models, book definitions (B, OFF)

for k in OFF:
    T = [r for r in O if r["strategy"] == k and not fp(r)]
    col = "x_tsl40" if k == "confirm" else ("x_flow4" if any(r.get("x_flow4") for r in T) else "x_h5")
    B.append((f"OFF:{k}", T, col, False, None, None, "off-page tracker book"))
BOOKMAP = {b[0]: b for b in B}

POST = ("x_", "ex_", "after_", "live_", "leg", "fs1_x", "fs2_x", "fs5_x", "fs10_x", "late_px", "peak", "lo_", "hi_", "dd_pre", "t_hit",
        "h60_", "h300_", "h600_", "closed", "exit_reason", "path5s", "gi_ath", "heat_uptime", "invalid", "crashloop", "core")
POST += tuple(f"t{s}_" for s in (10, 20, 30, 40, 50, 60, 120, 180, 300, 600, 900, 1200, 1800))
IDS = {"id", "strategy", "book", "name", "mint", "entry_utc", "entry_ts", "entry_price", "skip_why", "pass", "venue", "gi_name", "gi_symbol",
       "gw_big_tags", "gw_sig_tags", "sn_wallet", "sn_signal", "trigger_kind", "max_wallet", "live_book", "factory_name",
       "outside_buyers", "handoffs", "tier"}  # tokens-table counts that keep updating after the buy (hindsight) - found 21 Oct 02:05 UK: S5 "outside_buyers >= 291" looked like +38% only because it counts later buyers
GMGN = ("gi_", "gm_", "gh_", "gs_", "gw_")  # GMGN snapshot - queued after the buy (gmgn.js), timing not exact: excluded for curve books (bought in the first seconds), marked † elsewhere
KEYF = ["entry_mc", "age_s", "bundle_pct", "bundle_wallets", "dev_buy_sol", "dev_hold_entry", "sol60", "wal60", "sell60", "max_share",
        "holders_entry", "buyers_entry", "top10_entry", "has_socials", "cc_n24h", "snipers_n", "vol5m_usd", "hour_uk", "peak_mult", "fs10_x"]

def pct(x): return "—" if x is None or x != x else f"{100*x:+.1f}%"
def mean(v): return float(np.mean(v)) if len(v) else float("nan")
def nob(v):
    if len(v) < 2: return float("nan")
    return (float(np.sum(v)) - float(np.max(v))) / (len(v) - 1)

def diagnose(name):
    name0, T0, col, curve, chg, exb, note = BOOKMAP[name]
    T = sorted([r for r in T0 if (col(r) if callable(col) else rv(r, col, curve)) is not None], key=lambda r: int(r["entry_ts"]))
    out = [f"# Diagnosis — {name}", f"_Data to {uk(NOW)}; {note}; exit {'custom' if callable(col) else col}; {'curve' if curve else 'pool'} costs. Built by reports/books/diagnose.py._", ""]
    if len(T) < 8:
        out.append(f"Only {len(T)} closed trades — too few to diagnose."); return "\n".join(out)
    V = np.array([(col(r) if callable(col) else rv(r, col, curve)) for r in T], dtype=float)
    n = len(V); ts = np.array([int(r["entry_ts"]) for r in T]); days = max((NOW - ts[0]) / 86400, 0.25)
    third = np.array([min(2, i * 3 // n) for i in range(n)])
    book_nob = nob(V)
    # 1. size and pace
    out += ["## 1. Size and pace", "| trades | avg | without best | median | won | stopped | trades a day | SOL a day at 0.1 | total at 0.1 |", "|---|---|---|---|---|---|---|---|---|",
            f"| {n} | {pct(mean(V))} | {pct(book_nob)} | {pct(float(np.median(V)))} | {100*np.mean(V>0):.0f}% | {100*np.mean(V<-0.35):.0f}% | {n/days:.1f} | {(0.1*V.sum()-0.001*n)/days:+.3f} | {0.1*V.sum()-0.001*n:+.2f} |", ""]
    # 2. exits
    xs = [c for c in T[0].keys() if c.startswith("x_") and sum(1 for r in T if r.get(c) not in ("", None)) >= 0.5 * n]
    out += ["## 2. Exits on the same trades", "| exit | n | avg | without best | won | 1st third | 2nd third | last third | last 24 h |", "|---|---|---|---|---|---|---|---|---|"]
    rows_x = []
    for c in xs:
        pairs = [(i, rv(r, c, curve)) for i, r in enumerate(T)]
        pairs = [(i, x) for i, x in pairs if x is not None]
        if len(pairs) < 8: continue
        vv = np.array([x for _, x in pairs]); th = np.array([third[i] for i, _ in pairs]); tt = np.array([ts[i] for i, _ in pairs])
        rows_x.append((nob(vv), f"| {c}{' (current)' if c == col else ''} | {len(vv)} | {pct(mean(vv))} | {pct(nob(vv))} | {100*np.mean(vv>0):.0f}% | {pct(mean(vv[th==0]))} | {pct(mean(vv[th==1]))} | {pct(mean(vv[th==2]))} | {pct(mean(vv[tt>=NOW-86400]))} |"))
    out += [r for _, r in sorted(rows_x, key=lambda a: -a[0] if a[0] == a[0] else 9)] + [""]
    # 3. groups
    grp = [("big winners (>= +50%)", V >= 0.5), ("winners (0 to +50%)", (V > 0) & (V < 0.5)), ("small losers (-35% to 0)", (V <= 0) & (V > -0.35)), ("stopped (<= -35%)", V <= -0.35)]
    kf = [c for c in KEYF if c in T[0]]
    out += ["## 3. Winners vs losers — share, average and feature medians", "| group | n | share | avg | " + " | ".join(kf) + " |", "|" + "---|" * (4 + len(kf))]
    for g, m in grp:
        idx = np.where(m)[0]
        meds = []
        for c in kf:
            vals = [f(T[i], c) for i in idx if f(T[i], c) is not None]
            meds.append(f"{st.median(vals):.3g}" if vals else "—")
        out.append(f"| {g} | {len(idx)} | {100*len(idx)/n:.0f}% | {pct(mean(V[idx]))} | " + " | ".join(meds) + " |")
    out.append("")
    # 4. best and worst
    order = np.argsort(V)
    def line(i):
        r = T[i]; feats = ", ".join(f"{c} {f(r, c):.3g}" for c in kf if f(r, c) is not None and c not in ("hour_uk",))
        return f"- {uk(r['entry_ts'])} **{r['name'][:28]}** {pct(V[i])} — {feats}"
    out += ["## 4. Best 8 and worst 8 trades"] + [line(i) for i in order[::-1][:8]] + ["", "Worst:"] + [line(i) for i in order[:8]] + [""]
    # 5-6. factor search + luck check
    cols = [c for c in T[0].keys() if c not in IDS and not c.startswith(POST) and not (curve and c.startswith(GMGN)) and "timestamp" not in c and not c.endswith("_created") and sum(1 for r in T if f(r, c) is not None) >= max(10, 0.4 * n)]
    M = {c: np.array([f(r, c) if f(r, c) is not None else np.nan for r in T]) for c in cols}
    minkeep = max(10, int(0.15 * n))
    cuts = []
    for c in cols:
        a = M[c]; ok = a[~np.isnan(a)]
        if len(ok) < 10 or len(np.unique(ok)) < 2: continue
        u = np.unique(ok)
        if len(u) <= 6:
            for val in u: cuts.append((c, "==", float(val), a == val))
            continue
        for q in (0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85):
            t = float(np.quantile(ok, q))
            cuts.append((c, ">=", t, a >= t)); cuts.append((c, "<", t, a < t))
    def strict(mask, vals):
        k = mask & ~np.isnan(mask.astype(float)) if mask.dtype != bool else mask
        nk = int(k.sum())
        if nk < minkeep or nk > n - 5: return None
        for th in range(3):
            kk = vals[k & (third == th)]; dd = vals[(~k) & (third == th)]
            if len(kk) < 3 or len(dd) < 2 or kk.mean() <= dd.mean(): return None
        kv = vals[k]; kn = nob(kv)
        if not (kn > 0 and kn > nob(vals)): return None
        return kn
    passes = []
    for c, op, t, mask in cuts:
        kn = strict(mask, V)
        if kn is not None:
            kv = V[mask]; dv = V[~mask]
            passes.append(dict(c=c, op=op, t=t, mask=mask, kn=kn, n=int(mask.sum()), avg=mean(kv), drop=mean(dv), nd=len(dv),
                               th=[mean(V[mask & (third == i)]) for i in range(3)], sol_day=(0.1 * kv.sum() - 0.001 * len(kv)) / days))
    rng = random.Random(7); luck = []; best_luck = []
    for _ in range(20):
        Vs = V.copy(); rng.shuffle(Vs)
        ks = [strict(mask, Vs) for c, op, t, mask in cuts]; ks = [k for k in ks if k is not None]
        luck.append(len(ks)); best_luck.append(max(ks) if ks else -9)
    passes.sort(key=lambda p: -p["kn"])
    for p in passes: p["luck"] = sum(1 for b in best_luck if b >= p["kn"])
    exp = float(np.mean(luck)); real = [p for p in passes if p["luck"] <= 2]
    out += ["## 5. Factor search (strict test) and luck check",
            f"{len(cuts)} cuts tried on {len(cols)} entry-time columns; {len(passes)} pass the strict test, {exp:.0f} pass on average when the results are shuffled at random (20 runs).",
            f"**Luck check:** for each cut, 'luck' = in how many of 20 shuffled runs the BEST cut was at least this good. 0–2 of 20 = unlikely to be luck; more = could easily be luck. **{len(real)} cut(s) here are unlikely to be luck.** † = GMGN snapshot, taken shortly after the buy (queued) — confirm timing before using it as a filter.",
            "", "| cut | kept | kept avg | kept without best | dropped | 1st / 2nd / last third (kept) | SOL a day at 0.1 (kept) | luck (of 20) |", "|---|---|---|---|---|---|---|---|"]
    seen = set(); top = []
    for p in passes:
        if p["c"] in seen: continue
        seen.add(p["c"]); top.append(p)
        if len(top) >= 15: break
    for p in top:
        out.append(f"| {p['c']}{' †' if p['c'].startswith(GMGN) else ''} {p['op']} {p['t']:.4g} | {p['n']} | {pct(p['avg'])} | {pct(p['kn'])} | {p['nd']} at {pct(p['drop'])} | {' / '.join(pct(x) for x in p['th'])} | {p['sol_day']:+.3f} | {p['luck']} |")
    out.append("")
    # 7. pairs
    pairs = []
    for i in range(min(8, len(top))):
        for j in range(i + 1, min(8, len(top))):
            m = top[i]["mask"] & top[j]["mask"]
            if int(m.sum()) < max(8, int(0.08 * n)): continue
            ok3 = all(len(V[m & (third == th)]) >= 2 and V[m & (third == th)].mean() > V[(~m) & (third == th)].mean() for th in range(3))
            if not ok3: continue
            kv = V[m]
            pairs.append((nob(kv), f"| {top[i]['c']} {top[i]['op']} {top[i]['t']:.4g} AND {top[j]['c']} {top[j]['op']} {top[j]['t']:.4g} | {int(m.sum())} | {pct(mean(kv))} | {pct(nob(kv))} | {' / '.join(pct(mean(V[m & (third == th)])) for th in range(3))} | {(0.1*kv.sum()-0.001*len(kv))/days:+.3f} |"))
    if pairs:
        out += ["## 7. Pairs of the best cuts (all three thirds must beat the rest)", "| pair | kept | avg | without best | thirds | SOL a day at 0.1 |", "|---|---|---|---|---|---|"]
        out += [r for _, r in sorted(pairs, key=lambda a: -a[0])[:6]] + ["", "Pairs are more in-sample than single cuts — treat as ideas for a variant line, not proof.", ""]
    # 8. time blocks
    blocks = np.array_split(np.arange(n), 5)
    out += ["## 8. Five time blocks", " · ".join(f"{uk(ts[b[0]], '%d %H:%M')}–{uk(ts[b[-1]], '%d %H:%M')}: {len(b)} at {pct(mean(V[b]))}" for b in blocks if len(b)), ""]
    return "\n".join(out)

if __name__ == "__main__":
    names = [b[0] for b in B] if WANT == ["all"] else WANT
    os.makedirs(os.path.join(HERE, "diag"), exist_ok=True)
    for nm in names:
        if nm not in BOOKMAP: print("unknown book", nm, "- known:", ", ".join(BOOKMAP)); continue
        txt = diagnose(nm)
        open(os.path.join(HERE, "diag", nm.replace(":", "_") + ".md"), "w").write(txt)
        print(txt); print()
