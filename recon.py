#!/usr/bin/env python3
"""recon.py — reconciliations for the k100-audit package (run: python3 recon.py <package dir>). Reads only package files; writes recon_*.csv + RECON.md.
r values are the launcher's own (fd_positions: r_frac_020 = 0.2 SOL position, i02_r_frac = independent 0.02 SOL position; r = exit multiple − 1 − fees).
Net SOL = stake × r. Nothing here re-simulates fills; Codex's independent calculation should start from trades_part_* and the reserves in positions_chain_fill."""
import csv, gzip, sys, os, collections, statistics as S, datetime as D
P = sys.argv[1] if len(sys.argv) > 1 else "."
op = lambda f: gzip.open(os.path.join(P, f), "rt") if f.endswith(".gz") else open(os.path.join(P, f))
BOOKS = {"K30-50T25": "100K1", "K30-40T25": "100K2", "K30-40T20": "100K3"}
iso = lambda t: D.datetime.fromtimestamp(int(float(t)), D.timezone.utc).strftime("%Y-%m-%d %H:%M:%S") if t not in (None, "") else ""
fl = lambda v: float(v) if v not in (None, "") else None
dec = {r["mint"]: r for r in csv.DictReader(op("decisions_kpaper.csv.gz"))}
vp = list(csv.DictReader(op("positions_vol_paper.csv.gz")))
cf = {r["vol_id"]: r for r in csv.DictReader(op("positions_chain_fill.csv.gz"))}
fp = [r for r in csv.DictReader(op("launcher_export_fd_positions.csv")) if r["book"] in BOOKS]
fpi = {r["vol_id"]: r for r in fp}
cov = {r["mint"]: r for r in csv.DictReader(op("trade_coverage_per_mint.csv.gz"))}
out = []; W = lambda s="": out.append(s)
def wcsv(name, rows):
    if not rows: open(os.path.join(P, name), "w").write("(no rows)\n"); return
    with open(os.path.join(P, name), "w", newline="") as f: w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)

W("# Reconciliations — 100K books (recon.py)"); W()
# 1 decisions → outcome categories
cat = collections.Counter(r["status"] for r in dec.values()); W(f"## 1. Decisions → outcome category ({len(dec)} decisions, one per coin)"); W()
W("| status | coins |"); W("|---|---|"); [W(f"| {k} | {v} |") for k, v in cat.most_common()]; W()
src = collections.Counter((r["src"] or "(blank: before src column)", r["status"] == "entered") for r in dec.values())
W("By reading source (src) and entered: " + "; ".join(f"{k[0]}{' entered' if k[1] else ''} = {v}" for k, v in sorted(src.items()))); W()
# 2 unique coins vs positions, shared entries
ent = {m for m, r in dec.items() if r["status"] == "entered"}; pos_m = collections.defaultdict(list)
for r in vp: pos_m[r["mint"]].append(r)
W("## 2. Unique coins vs book positions"); W()
W(f"- Decisions 'entered': {len(ent)} coins. Distinct mints with positions: {len(pos_m)}. Positions: {len(vp)} (" + ", ".join(f"{BOOKS[b]} {sum(1 for r in vp if r['strat']==b)}" for b in BOOKS) + ").")
miss = sorted(ent - set(pos_m)); extra = sorted(set(pos_m) - ent)
W(f"- Entered without a position: {len(miss)} {miss[:10]}. Positions without an 'entered' decision: {len(extra)} {extra[:10]}.")
bad_books = [m for m in pos_m if m in dec and set((dec[m]["books"] or "").split(",")) != {r["strat"] for r in pos_m[m]}]
W(f"- Decision 'books' field ≠ the books holding positions: {len(bad_books)} {bad_books[:10]}.")
combo = collections.Counter(",".join(sorted(BOOKS[r["strat"]] for r in v)) for v in pos_m.values())
W("- Book combinations per coin: " + "; ".join(f"{k} = {v}" for k, v in combo.most_common()) + ".")
shared = []
for m, v in pos_m.items():
    fills = [cf.get(r["id"], {}) for r in v]; toks = {f.get("s_tokens") for f in fills}; ts = {f.get("entry_ts") for f in fills}; t02 = {f.get("s_tokens02") for f in fills}
    shared.append({"mint": m, "books": ",".join(BOOKS[r["strat"]] for r in v), "positions": len(v), "same_tokens_0.2": int(len(toks) == 1), "same_tokens_0.02": int(len(t02) == 1), "same_entry_ts": int(len(ts) == 1), "tokens_0.2": "|".join(sorted(str(x) for x in toks)), "entry_ts": "|".join(sorted(str(x) for x in ts))})
ns = [s for s in shared if not (s["same_tokens_0.2"] and s["same_tokens_0.02"] and s["same_entry_ts"])]
W(f"- Shared-entry identity (same entry time and identical token amounts for every book holding the coin): {len(shared) - len(ns)} of {len(shared)} coins; exceptions: {[s['mint'] for s in ns][:10]}. Detail: recon_shared_entries.csv."); W()
wcsv("recon_shared_entries.csv", shared)
# 3 per-position net SOL → book totals
rows = []
for r in vp:
    f = fpi.get(r["id"], {}); c = cf.get(r["id"], {}); m = r["mint"]
    r020, r02 = fl(f.get("r_frac_020")), fl(f.get("i02_r_frac")); st = f.get("status") or ("closed" if c.get("done") == "1" else "open")
    rows.append({"vol_id": r["id"], "book": BOOKS[r["strat"]], "strat": r["strat"], "mint": m, "mc5": dec.get(m, {}).get("mc5"), "band": "40-50K" if fl(dec.get(m, {}).get("mc5")) and fl(dec[m]["mc5"]) >= 40000 else "30-40K",
        "decision_src": dec.get(m, {}).get("src"), "entry_utc": iso(c.get("entry_ts") or r["entry_ts"]), "status": st, "exit_reason": f.get("exit_reason") or c.get("s_exit_reason"), "exit_utc": iso(f.get("ts_exit") or c.get("s_exit_ts")),
        "hi_x": f.get("hi_x"), "exit_x": f.get("exit_x"), "r_0.2": r020, "net_sol_0.2": round(0.2 * r020, 6) if r020 is not None else None,
        "i02_exit_reason": f.get("i02_exit_reason"), "i02_exit_x": f.get("i02_exit_x"), "r_0.02": r02, "net_sol_0.02": round(0.02 * r02, 6) if r02 is not None else None,
        "trade_rows_retained": cov.get(m, {}).get("rows_exported"), "last_trade_utc": iso(cov.get(m, {}).get("last_trade_ts"))})
wcsv("recon_positions.csv", rows)
W("## 3. Per-position net SOL → book totals (closed positions; open listed separately)"); W()
W("| book | positions | closed | open | wins (0.2) | mean r 0.2 | median r 0.2 | net SOL 0.2 | net SOL 0.02 (independent) |"); W("|---|---|---|---|---|---|---|---|---|")
for b in BOOKS.values():
    x = [r for r in rows if r["book"] == b]; c = [r for r in x if r["status"] == "closed" and r["r_0.2"] is not None]; c2 = [r for r in x if r["status"] == "closed" and r["r_0.02"] is not None]
    W(f"| {b} | {len(x)} | {len(c)} | {len(x) - len(c)} | {sum(1 for r in c if r['r_0.2'] > 0)} | {100 * S.mean(r['r_0.2'] for r in c):.1f}% | {100 * S.median(r['r_0.2'] for r in c):.1f}% | {sum(r['net_sol_0.2'] for r in c):+.4f} | {sum(r['net_sol_0.02'] for r in c2):+.4f} |" if c else f"| {b} | {len(x)} | 0 | | | | | | |")
W(); W("Sum check: the net SOL column of recon_positions.csv, summed per book over closed rows, equals the table above (same rows, no rounding beyond 6 dp).")
# 4 unresolved / stress
op_ = [r for r in rows if r["status"] != "closed" or r["r_0.2"] is None]
W(); W(f"## 4. Unresolved positions and stress ({len(op_)} positions not closed at read)"); W()
for b in BOOKS.values():
    c = sum(r["net_sol_0.2"] for r in rows if r["book"] == b and r["status"] == "closed" and r["r_0.2"] is not None); n = sum(1 for r in op_ if r["book"] == b)
    W(f"- {b}: closed net {c:+.4f} SOL; {n} open → if all open exit at r = 0: {c:+.4f}; at −50%: {c - 0.1 * n:+.4f}; at −100% (worst case): {c - 0.2 * n:+.4f} SOL.")
# 5 severe losses, paired exits, 40-50K entries
sev = sorted([r for r in rows if r["r_0.2"] is not None and r["r_0.2"] < -0.5], key=lambda r: r["r_0.2"]); wcsv("recon_severe_losses.csv", sev)
W(); W(f"## 5. Severe losses (r 0.2 < −50%): {len(sev)} positions on {len({r['mint'] for r in sev})} coins — recon_severe_losses.csv"); W()
for b in BOOKS.values(): W(f"- {b}: {sum(1 for r in sev if r['book']==b)} positions, {sum(r['net_sol_0.2'] for r in sev if r['book']==b):+.4f} SOL")
pair = []
for m, v in pos_m.items():
    a = {r["strat"]: r for r in rows if r["mint"] == m}
    if "K30-40T25" in a and "K30-40T20" in a: x, y = a["K30-40T25"], a["K30-40T20"]; pair.append({"mint": m, "exit_x_25": x["exit_x"], "exit_x_20": y["exit_x"], "r_25": x["r_0.2"], "r_20": y["r_0.2"], "diff_r_20_minus_25": round(y["r_0.2"] - x["r_0.2"], 6) if x["r_0.2"] is not None and y["r_0.2"] is not None else None, "exit_utc_25": x["exit_utc"], "exit_utc_20": y["exit_utc"]})
wcsv("recon_paired_20_25.csv", pair); pd = [p["diff_r_20_minus_25"] for p in pair if p["diff_r_20_minus_25"] is not None]
W(); W(f"## 6. Paired 20% vs 25% trail exits (same coin, same fill): {len(pair)} coins — recon_paired_20_25.csv"); W()
if pd: W(f"- 20% better: {sum(1 for d in pd if d > 1e-9)}, 25% better: {sum(1 for d in pd if d < -1e-9)}, equal: {sum(1 for d in pd if abs(d) <= 1e-9)}; mean difference (20% − 25%) {100 * S.mean(pd):+.1f} pts of stake.")
x45 = [r for r in rows if r["book"] == "100K1" and r["band"] == "40-50K"]; wcsv("recon_100K1_40_50K.csv", x45); c45 = [r for r in x45 if r["status"] == "closed" and r["r_0.2"] is not None]
c34 = [r for r in rows if r["book"] == "100K1" and r["band"] == "30-40K" and r["status"] == "closed" and r["r_0.2"] is not None]
W(); W(f"## 7. The additional $40–50K entries (100K1 only): {len(x45)} positions — recon_100K1_40_50K.csv"); W()
for lab, c in (("$40–50K", c45), ("$30–40K (same book)", c34)):
    if c: W(f"- {lab}: {len(c)} closed, wins {sum(1 for r in c if r['r_0.2'] > 0)}, severe {sum(1 for r in c if r['r_0.2'] < -0.5)}, mean r {100 * S.mean(r['r_0.2'] for r in c):.1f}%, net {sum(r['net_sol_0.2'] for r in c):+.4f} SOL")
# 8 evidence coverage of entered coins
z = [r for r in rows if r["trade_rows_retained"] in ("0", None, "")]; zm = sorted({r["mint"] for r in z})
W(); W("## 8. Evidence coverage of entered coins"); W()
W(f"- Entered coins with NO retained trade history in the tracker database: {len(zm)} of {len(pos_m)} (decision source: " + ", ".join(f"{k or 'blank'} {v}" for k, v in collections.Counter(dec[m]['src'] for m in zm).items()) + "). Their positions were simulated from live reserve reads (positions_chain_fill), but the curve/pool trade history needed to re-check them independently was not stored — the tracker keeps trades only for launches it retains (15-SOL screen / bundle tier-1) plus 24 h of pool trades. These coins: " + ", ".join(zm) + ".")
W("- MISSING EVIDENCE (explicit): trade histories for the coins above; pump_buyers; decision-time holder concentration for coins without token_life holders/top10 values; any data inside the recording gaps listed in MANIFEST.md.")
open(os.path.join(P, "RECON.md"), "w").write("\n".join(out) + "\n"); print("\n".join(out))
