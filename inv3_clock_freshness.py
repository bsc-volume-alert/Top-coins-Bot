#!/usr/bin/env python3
"""Investigation 3 — clock-price freshness. Run: python3 inv3_clock_freshness.py <package dir> <out dir> (needs out/inv1_positions.csv from inv1).
price_age_s = clock cutoff (create+300) − time of the last price the tracker had received. An old price is correct only if the market did not move.
Independent evidence used: for ENTERED coins, the simulator read the live pool/curve reserves within ~1 s of the decision (reserves_at_check) and filled
from reserves 1 s later; fill_over_check = fill price ÷ the 5-min reading's price. With an unchanged market this equals the price impact of our own
0.2 SOL buy (+ fee), which the trade-sourced entries (price age ≈ 0) measure directly. For coins NOT entered there is no independent reserve read:
their old prices can only be classed 'feed connected, no trade received' (consistent with quiet, not verifiable) or 'feed not proven connected'."""
import csv, gzip, sys, os, collections, statistics as S
P, O = sys.argv[1], sys.argv[2]
op = lambda f: gzip.open(os.path.join(P, f), "rt")
pos = [r for r in csv.DictReader(open(os.path.join(O, "inv1_positions.csv"))) if r["venue_at_entry"] in ("curve", "pool")]
fl = lambda v: float(v) if v not in (None, "") else None
out = ["# Investigation 3 — clock-price freshness\n"]
# 1. control: trade-sourced entries (price is the trade that triggered the reading → age ≈ 0)
ctl = {v: [fl(r["fill_over_check"]) for r in pos if r["decision_src"] == "trade" and r["venue_at_entry"] == v and fl(r["fill_over_check"])] for v in ("curve", "pool")}
band = {}
for v, a in ctl.items():
    a = sorted(a); lo, hi = a[int(0.1 * len(a))], a[int(0.9 * len(a)) - 1]; band[v] = (min(lo, 0.995), max(hi, 1.02))
    out.append(f"- Control (trade-sourced entries, {v}, n={len(a)}): fill ÷ reading median {S.median(a):.4f}, 10–90% range {lo:.4f}–{hi:.4f} → 'unchanged' band used: {band[v][0]:.3f}–{band[v][1]:.3f}")
# 2. clock-sourced entries: verified vs not
rows = []
for r in pos:
    if r["decision_src"] != "clock": continue
    f = fl(r["fill_over_check"]); age = fl(r["clock_price_age_s"]); v = r["venue_at_entry"]; lo, hi = band[v]
    young = age is not None and age <= 10
    if f and lo <= f <= hi: cls = "verified unchanged (reserves agree)"
    elif young: cls = "fresh price, market moved before the fill (" + ("down" if f < lo else "up") + ")"
    else: cls = "STALE price — reserves " + ("lower" if f < lo else "higher")
    rows.append({**{k: r[k] for k in ("mint", "band", "venue_at_entry", "decision_utc", "mc5_usd", "clock_price_age_s", "fill_over_check", "status", "OUT_r", "OUT_exit_reason")}, "freshness": cls, "age_bucket": "≤ 10 s" if age is not None and age <= 10 else "> 10 s"})
with open(os.path.join(O, "inv3_clock_entries.csv"), "w", newline="") as fo: w = csv.DictWriter(fo, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
out += ["", "## Clock-sourced entries (all three books share these fills; 100K1 rows)\n", "| price age | entries | verified unchanged | moved/stale: lower | moved/stale: higher | mean r (closed) |", "|---|---|---|---|---|---|"]
for ab in ("≤ 10 s", "> 10 s"):
    g = [r for r in rows if r["age_bucket"] == ab]; c = [fl(r["OUT_r"]) for r in g if r["status"] == "closed" and fl(r["OUT_r"]) is not None]
    out.append(f"| {ab} | {len(g)} | {sum(r['freshness'].startswith('verified') for r in g)} | {sum(('down' in r['freshness'] or 'lower' in r['freshness']) for r in g)} | {sum(('(up' in r['freshness'] or 'higher' in r['freshness']) for r in g)} | {100*S.mean(c):.1f}% (n={len(c)}) |")
st = [r for r in rows if not r["freshness"].startswith("verified")]
out += ["", "Clock entries outside the unchanged band (with their classification): " + ("; ".join(f"{r['mint'][:8]} — {r['freshness']} ({r['band']} {r['venue_at_entry']}, age {r['clock_price_age_s']} s, fill÷reading {r['fill_over_check']}, r {100*fl(r['OUT_r']):+.0f}%)" if r['OUT_r'] else r['mint'][:8] for r in st) if st else "none")]
# 3. every clock reading in the population: how often decisions rested on an old price
clk = [r for r in csv.DictReader(op("token_cp_clock.csv.gz")) if r["cp"] == "300"]
dec = {r["mint"]: r for r in csv.DictReader(op("decisions_kpaper.csv.gz"))}
ok = [r for r in clk if r["status"] == "ok"]
def bucket(a):
    a = fl(a); return "no price" if a is None else ("≤ 10 s" if a <= 10 else "11–60 s" if a <= 60 else "61–180 s" if a <= 180 else "> 180 s")
out += ["", f"## All clock readings with status ok (n={len(ok)}) — price age, and what the decision was\n", "| price age | readings | of which decided from this clock row | in a K band ($30–50K) | feed proven connected (feed_ok=1) |", "|---|---|---|---|---|"]
for b_ in ("≤ 10 s", "11–60 s", "61–180 s", "> 180 s"):
    g = [r for r in ok if bucket(r["price_age_s"]) == b_]
    used = [r for r in g if dec.get(r["mint"], {}).get("src") == "clock"]
    inb = [r for r in used if fl(r["mc"]) and 30000 <= fl(r["mc"]) < 50000]
    out.append(f"| {b_} | {len(g)} | {len(used)} | {len(inb)} | {sum(r['feed_ok'] == '1' for r in g)} |")
nb = [r for r in ok if fl(r["price_age_s"]) and fl(r["price_age_s"]) > 60 and fl(r["mc"]) and 24000 <= fl(r["mc"]) < 62500 and dec.get(r["mint"], {}).get("src") == "clock"]
out += ["", f"- Near-band exposure: {len(nb)} clock decisions had a price older than 60 s and a reading within ±25% of the $30–50K band ($24K–$62.5K); for these, a stale price could have put a coin wrongly in or out of the band. Only the entered ones can be checked against reserves (above); for the rest no independent price exists in the stored data.",
        "- The clock marks a reading 'ok' only when the main feed was connected for the whole interval since the last price (feed_ok); an old price with the feed up means no trade was received — consistent with a quiet market, but trades missed while the tracker's event loop was blocked would look the same (see Investigation 2: 83 blocks ≥ 10 s on 9–10 Nov)."]
open(os.path.join(O, "INV3.md"), "w").write("\n".join(out) + "\n"); print("\n".join(out))
