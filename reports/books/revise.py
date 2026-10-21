#!/usr/bin/env python3
"""Revision search: for a book, the most profitable revised rule its own data supports - judged honestly.

Usage:  python3 -I reports/books/revise.py <data_dir> <BOOK> [<BOOK> ...]   (or "all")
        Writes reports/books/diag/rev_<BOOK>.md and prints a one-line summary per book.

Search space (everything known at the moment of buying, nothing from after it):
  ENTRY filters: every entry-time column cut at 7 quantiles (>= and <), small categoricals (==), named traits where the
                 columns exist (socials present, first-time creator, original name, serial creator, copy of a $1M+ coin,
                 quiet first minute, launch bundle 2+/5+ wallets, under 156 buyers, young coin), and pairs of the best singles.
  EXITS:         every recorded exit column with 70%+ coverage (the current one included).
  EARLY-EXIT:    on the chosen rule, "sell at 10 s / 30 s / 60 s if below the buy price (or 0.9x), else the exit".
Honesty (a candidate PASSES only if all hold):
  (a) it keeps at least max(12, 10%) of the book's trades and drops at least 5;
  (b) the kept trades beat the dropped trades in ALL THREE thirds of the book's history;
  (c) the kept trades are positive without their best trade, and better than the whole book without its best;
  (d) LUCK: the same whole search is run 20 times on shuffled outcomes (rows keep their features, outcomes are dealt
      at random); luck = in how many of the 20 the best thing found was at least this good. 0-2 of 20 = unlikely to be luck.
Costs, lateFix, floor sells and the operator-coin exclusion come from numbers.py.
"""
import sys, os, random, statistics as st
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = sys.argv[1]; WANT = sys.argv[2:]
sys.argv = [sys.argv[0], DATA]
exec(open(os.path.join(HERE, "numbers.py")).read().split("EX = json.load")[0])
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
       "outside_buyers", "handoffs", "tier", "gi_creation_timestamp", "gi_open_timestamp", "gi_migrated_timestamp", "gw_big_created", "gw_sig_created"}
GMGN = ("gi_", "gm_", "gh_", "gs_", "gw_")

def pct(x): return "—" if x is None or x != x else f"{100*x:+.1f}%"
def nob(v):
    v = v[~np.isnan(v)]
    if len(v) < 2: return float("nan")
    return (v.sum() - v.max()) / (len(v) - 1)

def traits(T):
    out = []
    def col(c): return np.array([f(r, c) if f(r, c) is not None else np.nan for r in T])
    has = lambda c: c in T[0]
    if has("has_socials"):
        s = np.array([r.get("has_socials") for r in T]); out.append(("socials present", s == "1")); out.append(("socials unknown or absent", s != "1"))
    if has("cr_n"): a = col("cr_n"); out.append(("first-time creator (no earlier launch)", a == 0)); out.append(("creator has launched before", a >= 1))
    if has("cr_n24h"): a = col("cr_n24h"); out.append(("not a serial creator (< 20 launches in 24 h)", ~(a >= 20))); out.append(("serial creator (20+ launches in 24 h)", a >= 20))
    if has("cc_n24h"): a = col("cc_n24h"); out.append(("original name (no copy in 24 h)", a == 0)); out.append(("a copycat name", a >= 1))
    if has("cc_best_mc24h"): a = col("cc_best_mc24h"); out.append(("copy of a coin that reached $1M+", a >= 1e6))
    if has("sell60"): a = col("sell60"); out.append(("quiet first minute (selling < 20 SOL)", a < 20))
    if has("bundle_wallets"): a = col("bundle_wallets"); out.append(("launch bundle 2+ wallets", a >= 2)); out.append(("launch bundle 5+ wallets", a >= 5)); out.append(("launch bundle 1 wallet or none", ~(a >= 2)))
    if has("buyers_entry"): a = col("buyers_entry"); out.append(("under 156 buyers", a < 156))
    if has("age_s"): a = col("age_s"); out.append(("under 5 min old", a < 300)); out.append(("5 min old or more", a >= 300))
    if has("dev_buy_sol"): a = col("dev_buy_sol"); out.append(("creator bought under 0.9 SOL", a < 0.9)); out.append(("creator bought 0.9 SOL or more", a >= 0.9))
    if has("dev_hold_entry") and has("dev_buy_sol"):
        h = col("dev_hold_entry"); b = col("dev_buy_sol"); out.append(("creator not sold out", ~((h == 0) & (b > 0))))
    if has("max_share") and has("sol60"):
        big = col("max_share") * col("sol60"); out.append(("biggest buyer 3-5 SOL", (big >= 3) & (big < 5)))
    return [(n, np.nan_to_num(m.astype(float), nan=0).astype(bool)) for n, m in out]

def search(C, Y, VALID, third, minkeep, base_nob):
    """C (ncuts, n) bool; Y/VALID dict exit -> arrays. Returns dict exit -> kn (nan where the cut fails)."""
    Cf = C.astype(float); res = {}
    for e, y in Y.items():
        v = VALID[e]; yv = np.where(v, y, 0.0)
        nk = Cf @ v.astype(float); nd = v.sum() - nk; sk = Cf @ yv
        ok = (nk >= minkeep) & (nd >= 5)
        for t in range(3):
            vt = v & (third == t); yt = np.where(vt, y, 0.0)
            nkt = Cf @ vt.astype(float); ndt = vt.sum() - nkt; skt = Cf @ yt; sdt = yt.sum() - skt
            ok &= (nkt >= 3) & (ndt >= 2) & (skt / np.maximum(nkt, 1) > sdt / np.maximum(ndt, 1))
        mx = np.where(C & v[None, :], y[None, :], -np.inf).max(axis=1)
        kn = (sk - mx) / np.maximum(nk - 1, 1)
        ok &= (kn > 0) & (kn > base_nob[e])
        res[e] = np.where(ok, kn, np.nan)
    return res

def overlay(T, y, curve, pathcol, th):
    out = y.copy()
    for i, r in enumerate(T):
        p = f(r, pathcol)
        if p is None or np.isnan(y[i]): continue
        late = f(r, "fs1_x") if curve else None; div = late if (late and late > 1.5) else 1
        if p / div < th: out[i] = real(p / div, curve)
    return out

def revise(name):
    name0, T0, col, curve, chg, exb, note = BOOKMAP[name]
    cur = col if not callable(col) else "custom"
    T = sorted([r for r in T0 if (col(r) if callable(col) else rv(r, col, curve)) is not None], key=lambda r: int(r["entry_ts"]))
    out = [f"# Revision search — {name}", f"_Data to {uk(NOW)}; {note}; current exit {cur}; {'curve' if curve else 'pool'} costs. Built by reports/books/revise.py._", ""]
    n = len(T)
    if n < 20: out.append(f"Only {n} closed trades — too few to search."); return "\n".join(out), f"{name}: too few ({n})"
    ts = np.array([int(r["entry_ts"]) for r in T]); days = max((NOW - ts[0]) / 86400, 0.25); third = np.array([min(2, i * 3 // n) for i in range(n)])
    # exits
    exits = {}
    if callable(col): exits["custom"] = np.array([col(r) for r in T], dtype=float)
    for c in T[0].keys():
        if c.startswith("x_") and sum(1 for r in T if r.get(c) not in ("", None)) >= 0.7 * n:
            exits[c] = np.array([rv(r, c, curve) if rv(r, c, curve) is not None else np.nan for r in T], dtype=float)
    VALID = {e: ~np.isnan(y) for e, y in exits.items()}
    base = exits[cur]; base_nob = {e: nob(base) for e in exits}  # every exit must beat the CURRENT book without its best
    bmean = np.nanmean(base)
    out += ["## The book now", f"{n} trades, {pct(bmean)} a trade, without best {pct(nob(base))}, {n/days:.1f} trades a day, {(0.1*np.nansum(base)-0.001*n)/days:+.3f} SOL a day at 0.1. Thirds: " + " / ".join(pct(np.nanmean(base[third == t])) for t in range(3)) + ".", ""]
    # exits alone
    rows_e = []
    for e, y in exits.items():
        rows_e.append((nob(y), f"| {e}{' (current)' if e == cur else ''} | {int(VALID[e].sum())} | {pct(np.nanmean(y))} | {pct(nob(y))} | " + " / ".join(pct(np.nanmean(y[third == t])) for t in range(3)) + " |"))
    out += ["## Exits alone (no filter)", "| exit | n | avg | without best | thirds |", "|---|---|---|---|---|"] + [r for _, r in sorted(rows_e, key=lambda a: -a[0] if a[0] == a[0] else 9)] + [""]
    # cuts
    cols = [c for c in T[0].keys() if c not in IDS and not c.startswith(POST) and not (curve and c.startswith(GMGN)) and sum(1 for r in T if f(r, c) is not None) >= max(10, 0.4 * n)]
    labels, masks = [], []
    for c in cols:
        a = np.array([f(r, c) if f(r, c) is not None else np.nan for r in T]); ok = a[~np.isnan(a)]
        if len(ok) < 10 or len(np.unique(ok)) < 2: continue
        u = np.unique(ok); tag = " †" if c.startswith(GMGN) else ""
        if len(u) <= 6:
            for val in u: labels.append(f"{c}{tag} == {val:g}"); masks.append(a == val)
            continue
        for q in (0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85):
            t = float(np.quantile(ok, q)); labels.append(f"{c}{tag} >= {t:.4g}"); masks.append(a >= t); labels.append(f"{c}{tag} < {t:.4g}"); masks.append(a < t)
    for lab, m in traits(T): labels.append("TRAIT " + lab); masks.append(m)
    C = np.array(masks, dtype=bool) if masks else np.zeros((0, n), dtype=bool)
    minkeep = max(12, int(0.10 * n))
    res = search(C, exits, VALID, third, minkeep, base_nob)
    # pairs of the top 8 singles per exit
    pair_labels, pair_masks, pair_ex = [], [], []
    for e in exits:
        kn = res[e]; top = [i for i in np.argsort(np.nan_to_num(kn, nan=-9))[::-1][:8] if not np.isnan(kn[i])]
        for i in range(len(top)):
            for j in range(i + 1, len(top)):
                pair_labels.append(f"{labels[top[i]]} AND {labels[top[j]]}"); pair_masks.append(C[top[i]] & C[top[j]]); pair_ex.append(e)
    pres = {}
    if pair_masks:
        PC = np.array(pair_masks, dtype=bool); pr = search(PC, exits, VALID, third, minkeep, base_nob)
        for idx, e in enumerate(pair_ex): pres[idx] = pr[e][idx]
    # luck: the same search on shuffled outcomes
    rng = np.random.default_rng(7); luck_best = []
    for _ in range(20):
        perm = rng.permutation(n); Ys = {e: y[perm] for e, y in exits.items()}; Vs = {e: v[perm] for e, v in VALID.items()}
        rs = search(C, Ys, Vs, third, minkeep, base_nob); best = max([np.nanmax(k) if not np.all(np.isnan(k)) else -9 for k in rs.values()] + [-9])
        pl, pm, pe = [], [], []
        for e in exits:
            kn = rs[e]; top = [i for i in np.argsort(np.nan_to_num(kn, nan=-9))[::-1][:8] if not np.isnan(kn[i])]
            for i in range(len(top)):
                for j in range(i + 1, len(top)): pm.append(C[top[i]] & C[top[j]]); pe.append(e)
        if pm:
            prs = search(np.array(pm, dtype=bool), Ys, Vs, third, minkeep, base_nob)
            best = max(best, max(prs[e][idx] if not np.isnan(prs[e][idx]) else -9 for idx, e in enumerate(pe)))
        luck_best.append(best)
    luck_best = np.array(luck_best)
    cands = []
    for e in exits:
        for i, kn in enumerate(res[e]):
            if not np.isnan(kn): cands.append(dict(label=labels[i], mask=C[i], exit=e, kn=kn, pair=False))
    for idx, kn in pres.items():
        if not np.isnan(kn): cands.append(dict(label=pair_labels[idx], mask=pair_masks[idx], exit=pair_ex[idx], kn=kn, pair=True))
    for c in cands:
        y = exits[c["exit"]]; m = c["mask"] & VALID[c["exit"]]; kv = y[m]; dv = y[(~c["mask"]) & VALID[c["exit"]]]
        c.update(n=int(m.sum()), avg=kv.mean(), drop=dv.mean(), nd=len(dv), th=[y[m & (third == t)].mean() for t in range(3)], luck=int((luck_best >= c["kn"]).sum()),
                 sol_day=(0.1 * kv.sum() - 0.001 * len(kv)) / days, won=(kv > 0).mean(), last24=(y[m & (ts >= NOW - 86400)].mean() if (m & (ts >= NOW - 86400)).any() else float("nan")), n24=int((m & (ts >= NOW - 86400)).sum()))
    cands.sort(key=lambda c: -c["kn"])
    real_ = [c for c in cands if c["luck"] <= 2]
    out += ["## Search", f"{len(labels)} filters × {len(exits)} exits (+ {len(pair_labels)} pairs). {len(cands)} pass the three-period test; **{len(real_)} are unlikely to be luck** (luck ≤ 2 of 20). Best thing found on shuffled outcomes, 20 runs: " + ", ".join(pct(x) if x > -9 else "none" for x in luck_best) + ".", ""]
    def row(c): return f"| {c['label']} | {c['exit']} | {c['n']} | {pct(c['avg'])} | {pct(c['kn'])} | {100*c['won']:.0f}% | {c['nd']} at {pct(c['drop'])} | {' / '.join(pct(x) for x in c['th'])} | {c['n24']} at {pct(c['last24'])} | {c['sol_day']:+.3f} | {c['luck']} |"
    hdr = ["| rule | exit | kept | avg | without best | won | dropped | thirds | last 24 h | SOL/day at 0.1 | luck |", "|---|---|---|---|---|---|---|---|---|---|---|"]
    seen = set(); top = []
    for c in cands:
        key = (c["label"].split(" AND ")[0].split(" >=")[0].split(" <")[0].split(" ==")[0], c["exit"])
        if key in seen: continue
        seen.add(key); top.append(c)
        if len(top) >= 12: break
    out += ["### Best candidates (one per factor and exit, by profit per trade without the best coin)"] + hdr + [row(c) for c in top] + [""]
    bysol = sorted(real_ or cands, key=lambda c: -c["sol_day"])[:5]
    if bysol: out += ["### Best by SOL a day (among those unlikely to be luck, else all passing)"] + hdr + [row(c) for c in bysol] + [""]
    # the proposal: the best SOL a day among the candidates unlikely to be luck (a rule must pay, not just look good per trade); else the best passing one, flagged
    prop = (sorted(real_, key=lambda c: -c["sol_day"])[0] if real_ else (sorted(cands, key=lambda c: -c["sol_day"])[0] if cands else None))
    if prop is None:
        out += ["## Proposal", "**No revision found.** Nothing beats the current book without its best coin in all three periods.", ""]
        return "\n".join(out), f"{name}: n{n} {pct(bmean)} → NO revision passes"
    tag = "unlikely to be luck" if prop["luck"] <= 2 else f"CAN'T BE TOLD FROM LUCK (luck {prop['luck']}/20)"
    out += ["## Proposal", f"**{prop['label']}**, exit **{prop['exit']}** — {prop['n']} trades at {pct(prop['avg'])} (without best {pct(prop['kn'])}), won {100*prop['won']:.0f}%, thirds {' / '.join(pct(x) for x in prop['th'])}, last 24 h {prop['n24']} at {pct(prop['last24'])}, {prop['n']/days:.1f} trades a day, {prop['sol_day']:+.3f} SOL a day at 0.1 — **{tag}**. Drops {prop['nd']} trades at {pct(prop['drop'])}.", ""]
    # early-exit overlay on the proposal
    y = exits[prop["exit"]]; m = prop["mask"] & VALID[prop["exit"]]
    lines = []
    for pc in ("fs10_x", "t30_x", "t60_x"):
        if sum(1 for r in T if f(r, pc) is not None) < 0.7 * n: continue
        for th in (0.9, 1.0):
            yo = overlay(T, y, curve, pc, th); kv = yo[m]
            lines.append(f"| sell at {pc[:-2]} if < {th} | {pct(kv.mean())} | {pct(nob(kv))} | {' / '.join(pct(yo[m & (third == t)].mean()) for t in range(3))} |")
    if lines: out += ["### Early-exit overlay on the proposal (now: " + pct(prop["avg"]) + ", without best " + pct(prop["kn"]) + ")", "| rule | avg | without best | thirds |", "|---|---|---|---|"] + lines + [""]
    return "\n".join(out), f"{name}: n{n} {pct(bmean)} → {prop['label']} / {prop['exit']}: n{prop['n']} {pct(prop['avg'])} (no-best {pct(prop['kn'])}) luck {prop['luck']} [{'REAL' if prop['luck'] <= 2 else 'luck?'}]"

if __name__ == "__main__":
    names = [b[0] for b in B] if WANT == ["all"] else WANT
    os.makedirs(os.path.join(HERE, "diag"), exist_ok=True); summary = []
    for nm in names:
        if nm not in BOOKMAP: print("unknown book", nm); continue
        txt, line = revise(nm)
        open(os.path.join(HERE, "diag", "rev_" + nm.replace(":", "_") + ".md"), "w").write(txt); print(line, flush=True); summary.append(line)
    open(os.path.join(HERE, "diag", "rev_SUMMARY.txt"), "w").write("\n".join(summary) + "\n")
