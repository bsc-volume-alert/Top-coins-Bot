#!/usr/bin/env python3
"""Investigation 1 — the $40–50K pool losses (100K1). Run: python3 inv1_pool_losses.py <package dir> <out dir>
Inputs: the frozen package k100-audit-20261110t2102 @ c093afef (read only). Every feature is computed from data at or before the entry
(decision) time, except the outcome columns (r, hi_x, exit…), which are labelled as outcomes. 100K1 holds every entered coin, so it is the
population; 100K2/3 hold the $30–40K subset with identical fills."""
import csv, gzip, json, sys, os, math, statistics as S, collections, datetime as D
P, O = sys.argv[1], sys.argv[2]; os.makedirs(O, exist_ok=True)
op = lambda f: gzip.open(os.path.join(P, f), "rt") if f.endswith(".gz") else open(os.path.join(P, f))
iso = lambda t: D.datetime.fromtimestamp(t, D.timezone.utc).strftime("%d %H:%M:%S") if t else ""
fl = lambda v: float(v) if v not in (None, "") else None
dec = {r["mint"]: r for r in csv.DictReader(op("decisions_kpaper.csv.gz"))}
cen = {r["mint"]: r for r in csv.DictReader(op("census_tokens.csv.gz"))}
fp = [r for r in csv.DictReader(op("launcher_export_fd_positions.csv")) if r["book"] == "K30-50T25"]
cf = {r["vol_id"]: r for r in csv.DictReader(op("positions_chain_fill.csv.gz"))}
tl = {}
for r in csv.DictReader(op("token_life.csv.gz")):
    if r["cp"] == "300": tl[r["mint"]] = r
mints = {r["mint"] for r in fp}
tr = collections.defaultdict(list)
for part in sorted(f for f in os.listdir(P) if f.startswith("trades_part_")):
    for r in csv.DictReader(op(part)):
        if r["mint"] in mints: tr[r["mint"]].append(r)
# v2 (11 Nov, Codex review): DEDUPLICATE — overlapping capture paths store the same swap more than once. Fingerprint = signature, wallet, side, SOL,
# tokens, venue, pool, event index; the first-received copy is kept (lowest recv_ms, then row_id). Raw duplicates are counted per mint.
DUPS = collections.Counter()
for m in list(tr):
    seen, keep = set(), []
    for z in sorted(tr[m], key=lambda r: (int(r["recv_ms"] or 9e18), int(r["row_id"]))):
        fp_ = (z["sig"], z["wallet"], z["is_buy"], z["sol"], z["tokens"], z["venue"], z["pool"], z["ev_idx"])
        if fp_ in seen: DUPS[m] += 1; continue
        seen.add(fp_); keep.append(z)
    tr[m] = keep
for m in tr: tr[m].sort(key=lambda r: (int(r["slot"] or 0), int(r["ev_idx"] or -1) if r["ev_idx"] not in ("", None) else -1, int(r["row_id"])))
def q_sol(js):
    try: return int(json.loads(js)["quote"]) / 1e9
    except Exception: return None
rows = []
for r in fp:
    c = cf.get(r["vol_id"], {}); m = r["mint"]; d = dec.get(m, {}); t0 = int(r["ts_decision"] or c.get("entry_ts") or 0)
    filled = bool(r["tokens_raw"]); venue = c.get("venue") or ""; mc5 = fl(d.get("mc5"))
    x = {"mint": m, "vol_id": r["vol_id"], "band": "40-50K" if mc5 and mc5 >= 40000 else "30-40K", "venue_at_entry": venue if filled else "no-fill", "status": r["status"],
         "decision_utc": iso(t0), "mc5_usd": round(mc5) if mc5 else None, "decision_src": d.get("src"), "clock_price_age_s": d.get("price_age_s"),
         "decision_age_s": int(t0 - int(d["create_ts"])) if d.get("create_ts") else None}
    # liquidity / execution at entry (known at entry)
    x["quote_sol_at_check"] = q_sol(r["reserves_at_check"]); x["fill_over_check"] = fl(r["fill_over_check"]); x["roundtrip_x0"] = fl(r["x0_roundtrip"]); x["gap_dec"] = fl(r["gap_dec"])
    # creation-time facts
    cz = cen.get(m, {}); x["bundle_pct"] = fl(cz.get("bundle_pct")); x["dev_buy_sol"] = fl(cz.get("dev_buy_sol"))
    t5 = tl.get(m, {}); x["top10_pct_cp300"] = t5.get("top10_pct") or None; x["holders_cp300"] = t5.get("holders") or None
    x["buyers_total_cp300"] = t5.get("buyers_total") or None
    # trade-derived pre-entry features (only trades with ts <= decision time)
    # v2: only swaps the tracker had RECEIVED by the decision (recv_ms <= decision ms; rows without recv_ms fall back to ts <= decision)
    msd = int(r["ms_decision"] or t0 * 1000)
    T = [z for z in tr.get(m, []) if z["ts"] and int(z["ts"]) <= t0 and (not z["recv_ms"] or int(z["recv_ms"]) <= msd)]; x["trade_rows_before_entry"] = len(T) if m in tr else None
    x["duplicate_rows_removed"] = DUPS.get(m, 0); x["rows_received_after_decision_excluded"] = sum(1 for z in tr.get(m, []) if z["ts"] and int(z["ts"]) <= t0 and z["recv_ms"] and int(z["recv_ms"]) > msd)
    if T:
        cts = int(d["create_ts"]) if d.get("create_ts") else int(cz.get("create_ts") or 0)
        pool = [z for z in tr[m] if z["venue"] and z["venue"] != "curve"]
        g = int(pool[0]["ts"]) if pool else None
        x["migrated_before_entry"] = int(g is not None and g <= t0); x["secs_since_migration"] = (t0 - g) if g is not None and g <= t0 else None
        x["secs_create_to_migration"] = (g - cts) if g is not None and cts else None
        px = [(int(z["ts"]), fl(z["price_sol"])) for z in T if fl(z["price_sol"])]
        last = px[-1][1] if px else None
        w60 = [z for z in T if int(z["ts"]) > t0 - 60]; w300 = [z for z in T if int(z["ts"]) > t0 - 300]
        def flow(w):
            b = sum(fl(z["sol"]) or 0 for z in w if z["is_buy"] == "1"); s = sum(fl(z["sol"]) or 0 for z in w if z["is_buy"] != "1"); return b, s
        b60, s60 = flow(w60); b300, s300 = flow(w300)
        x.update({"buy_sol_60s": round(b60, 3), "sell_sol_60s": round(s60, 3), "net_sol_60s": round(b60 - s60, 3), "buy_sol_300s": round(b300, 3), "sell_sol_300s": round(s300, 3),
                  "net_sol_300s": round(b300 - s300, 3), "trades_300s": len(w300), "wallets_300s": len({z["wallet"] for z in w300})})
        pk = max(p for _, p in px) if px else None
        x["price_vs_peak_before_entry"] = round(last / pk, 3) if pk else None
        p60 = [p for t, p in px if t <= t0 - 60]; x["price_change_60s"] = round(last / p60[-1] - 1, 3) if p60 and last else None
        lr = [math.log(px[i][1] / px[i - 1][1]) for i in range(1, len(px)) if px[i][0] > t0 - 300 and px[i - 1][1] > 0]
        x["volatility_300s"] = round(S.pstdev(lr), 4) if len(lr) >= 3 else None
        x["largest_sell_share_300s"] = round(max((fl(z["sol"]) or 0 for z in w300 if z["is_buy"] != "1"), default=0) / max(s300, 1e-9), 3) if s300 else 0
    # outcome (NOT known at entry)
    x.update({"OUT_r": fl(r["r_frac_020"]), "OUT_hi_x": fl(r["hi_x"]), "OUT_exit_x": fl(r["exit_x"]), "OUT_exit_trigger_x": fl(r["exit_trigger_x"]), "OUT_exit_reason": r["exit_reason"],
              "OUT_held_s": (int(r["ts_exit"]) - t0) if r["ts_exit"] else None, "OUT_x60": fl(r["x60"]),
              # execution evidence
              "EXE_exit_src": r["exit_src"], "EXE_max_gap_s": fl(c.get("s_max_gap_s")), "EXE_drops": c.get("s_drops"), "EXE_backstops": c.get("s_backstops"),
              "EXE_exit_slip": round(fl(r["exit_x"]) / fl(r["exit_trigger_x"]), 3) if fl(r["exit_x"]) and fl(r["exit_trigger_x"]) else None,
              "EXE_reserve_evidence": int(bool(r["reserves_at_check"]) and bool(r["reserves_at_exit"])), "EXE_trades_retained": len(tr.get(m, []))})
    rows.append(x)
with open(os.path.join(O, "inv1_positions.csv"), "w", newline="") as f:
    keys = list(dict.fromkeys(k for r in rows for k in r)); w = csv.DictWriter(f, fieldnames=keys); w.writeheader(); w.writerows(rows)
out = []; W = out.append
closed = [r for r in rows if r["status"] == "closed" and r["OUT_r"] is not None]
W("# Investigation 1 — 100K1 losses by band × venue at entry\n")
W("| group | n | wins | severe (<−50%) | mean r | median r | net SOL (0.2) |"); W("|---|---|---|---|---|---|---|")
grp = lambda b, v: [r for r in closed if r["band"] == b and r["venue_at_entry"] == v]
for b in ("40-50K", "30-40K"):
    for v in ("pool", "curve"):
        g = grp(b, v)
        if g: W(f"| {b} {v} | {len(g)} | {sum(r['OUT_r'] > 0 for r in g)} | {sum(r['OUT_r'] < -0.5 for r in g)} | {100*S.mean(r['OUT_r'] for r in g):.1f}% | {100*S.median(r['OUT_r'] for r in g):.1f}% | {0.2*sum(r['OUT_r'] for r in g):+.3f} |")
def med(g, k):
    v = [r[k] for r in g if r.get(k) not in (None, "")]; v = [float(a) for a in v]
    return (f"{S.median(v):.3g}" if v else "–") + f" (n={len(v)})"
FEAT = ["mc5_usd", "decision_age_s", "clock_price_age_s", "quote_sol_at_check", "fill_over_check", "roundtrip_x0", "secs_since_migration", "secs_create_to_migration", "bundle_pct", "dev_buy_sol",
        "top10_pct_cp300", "holders_cp300", "buy_sol_300s", "sell_sol_300s", "net_sol_300s", "net_sol_60s", "trades_300s", "wallets_300s", "price_vs_peak_before_entry", "price_change_60s", "volatility_300s", "largest_sell_share_300s",
        "EXE_max_gap_s", "EXE_exit_slip", "OUT_hi_x", "OUT_held_s"]
P40, P30 = grp("40-50K", "pool"), grp("30-40K", "pool"); sev = [r for r in P40 if r["OUT_r"] < -0.5]; ok = [r for r in P40 if r["OUT_r"] >= -0.5]
W("\n## Medians at entry — $40–50K pool (severe vs rest) and $30–40K pool\n"); W("| feature | 40–50K pool severe | 40–50K pool rest | 30–40K pool all |"); W("|---|---|---|---|")
for k in FEAT: W(f"| {k} | {med(sev, k)} | {med(ok, k)} | {med(P30, k)} |")
W("\n## Severe and non-severe $40–50K pool entries (one line each)\n")
W("| mint | decision | mc5 | src | price age | quote SOL | since migration s | net SOL 300s | vs peak | fill/check | exit | r | hi_x | max gap s |"); W("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
for r in sorted(P40, key=lambda r: r["OUT_r"]):
    W(f"| {r['mint'][:8]} | {r['decision_utc']} | {r['mc5_usd']} | {r['decision_src']} | {r['clock_price_age_s'] or ''} | {round(r['quote_sol_at_check'],1) if r['quote_sol_at_check'] else ''} | {r.get('secs_since_migration','')} | {r.get('net_sol_300s','')} | {r.get('price_vs_peak_before_entry','')} | {r['fill_over_check']} | {r['OUT_exit_reason']} | {100*r['OUT_r']:.0f}% | {r['OUT_hi_x']} | {r['EXE_max_gap_s']} |")
# candidate warnings, evaluated on ALL 100K1 closed fills (both bands, both venues) — exploratory, in-sample
def evalw(name, f):
    hit = [r for r in closed if f(r)]; miss = [r for r in closed if not f(r)]; unk = [r for r in closed if f(r) is None]  # unknown (no retained trades) counts as kept
    if not hit: return f"| {name} | 0 | | | | | |"
    return (f"| {name} | {len(hit)} | {sum(r['OUT_r'] < -0.5 for r in hit)} | {sum(r['OUT_r'] > 0 for r in hit)} | {100*S.mean(r['OUT_r'] for r in hit):.1f}% | "
            f"{100*S.mean(r['OUT_r'] for r in miss):.1f}% ({len(miss)}) | {0.2*sum(r['OUT_r'] for r in miss):+.3f} | {sum((r['OUT_hi_x'] or 0) >= 2 for r in hit)} | " + ", ".join(r['mint'][:8] + " %+.0f%%" % (100*r['OUT_r']) for r in hit if r['OUT_r'] > 0) + " |")
G = lambda k, op_, v: (lambda r: None if r.get(k) in (None, "") else op_(float(r[k]), v))
import operator as OP
W("\n## Candidate warnings (in-sample, exploratory — all 100K1 closed fills, n=%d, baseline mean %.1f%%, net %+.3f SOL)\n" % (len(closed), 100*S.mean(r['OUT_r'] for r in closed), 0.2*sum(r['OUT_r'] for r in closed)))
W("| warning (skip the entry if …) | entries hit | severe avoided | winners rejected | mean r of hit | mean r kept (n) | net SOL kept | runners (hi ≥ 2×) rejected | winners rejected (r) |"); W("|---|---|---|---|---|---|---|---|---|")
for name, f in [("band $40–50K AND pool", lambda r: r["band"] == "40-50K" and r["venue_at_entry"] == "pool"), ("instant graduation (create→pool ≤ 5 s)", lambda r: None if r.get("secs_create_to_migration") is None else r["secs_create_to_migration"] <= 5),
                ("instant graduation AND price < 0.8 × pre-entry peak", lambda r: None if r.get("secs_create_to_migration") is None or r.get("price_vs_peak_before_entry") is None else (r["secs_create_to_migration"] <= 5 and r["price_vs_peak_before_entry"] < 0.8)),
                ("pool AND migrated < 300 s before entry", lambda r: r["venue_at_entry"] == "pool" and r.get("secs_since_migration") is not None and r["secs_since_migration"] < 300),
                ("net SOL last 300 s < 0", G("net_sol_300s", OP.lt, 0)), ("net SOL last 60 s < 0", G("net_sol_60s", OP.lt, 0)), ("price < 0.8 × pre-entry peak", G("price_vs_peak_before_entry", OP.lt, 0.8)),
                ("fill/check > 1.05", G("fill_over_check", OP.gt, 1.05)), ("volatility_300s > 0.05", G("volatility_300s", OP.gt, 0.05)), ("quote SOL at check < 40", lambda r: None if r["quote_sol_at_check"] is None else r["quote_sol_at_check"] < 40),
                ("clock price age > 60 s", G("clock_price_age_s", OP.gt, 60)), ("bundle_pct > 20", G("bundle_pct", OP.gt, 20))]:
    W(evalw(name, f))
W("\nCaution: 81 fills, 29 in the $40–50K band; thresholds were chosen by eye on this same sample, so every row above is a hypothesis to test on later coins, not a rule.")
W("\n## Execution check of the severe losses — did the trail fail because of one crash, and is the exit evidenced?\n")
W("| mint | trigger x | exit x | exit/trigger | biggest sell within 5 s before exit (SOL) | its share of pool quote | exit reserves recorded |"); W("|---|---|---|---|---|---|---|")
for r in sorted([r for r in closed if r["OUT_r"] < -0.5], key=lambda r: r["OUT_r"]):
    fr = next(z for z in fp if z["vol_id"] == r["vol_id"]); te = int(fr["ts_exit"] or 0); tt = float(fr["exit_trigger_ts"] or 0)
    S5 = [z for z in tr.get(r["mint"], []) if z["is_buy"] != "1" and z["ts"] and tt - 5 <= int(z["ts"]) <= te]
    big = max(S5, key=lambda z: fl(z["sol"]) or 0) if S5 else None; qs = r["quote_sol_at_check"]
    W(f"| {r['mint'][:8]} | {r['OUT_exit_trigger_x']} | {r['OUT_exit_x']} | {r['EXE_exit_slip']} | {round(fl(big['sol']),1) if big else 'no retained trade'} | {round(fl(big['sol'])/qs,2) if big and qs else ''} | {'yes' if r['EXE_reserve_evidence'] else 'no'} |")
open(os.path.join(O, "INV1.md"), "w").write("\n".join(out) + "\n"); print("\n".join(out))
# --- reserves vs recorded (deduplicated) swaps between entry and exit. A residual is NOT evidence of liquidity removal on its own (missing capture, fees and
#     decoding all produce residuals); a withdrawal needs the withdrawal transaction, which this package does not contain.
out2 = ["\n## Pool SOL between entry and exit: reserves vs recorded swaps, deduplicated (severe losses) — residuals are unexplained, NOT evidence of withdrawal\n", "| mint | pool at check | pool at exit | quote SOL at check | quote SOL at exit | change | net swap SOL in between (buys − sells) | unexplained change |", "|---|---|---|---|---|---|---|---|"]
def pj(js):
    try: return json.loads(js)
    except Exception: return {}
for r in sorted([r for r in closed if r["OUT_r"] < -0.5], key=lambda r: r["OUT_r"]):
    fr = next(z for z in fp if z["vol_id"] == r["vol_id"]); a, b = pj(fr["reserves_at_check"]), pj(fr["reserves_at_exit"])
    if not a.get("pool") or not b.get("pool"): out2.append(f"| {r['mint'][:8]} | {a.get('pool','curve')[:8]} | {b.get('pool','curve')[:8]} | | | | | not a pool at both ends |"); continue
    t1, t2 = int(fr["ts_decision"]), int(fr["ts_exit"]); qa, qb = int(a["quote"]) / 1e9, int(b["quote"]) / 1e9
    Z = [z for z in tr.get(r["mint"], []) if z["ts"] and t1 <= int(z["ts"]) <= t2 and z["venue"] and z["venue"] != "curve" and (not z["pool"] or z["pool"] == a["pool"])]
    net = sum((fl(z["sol"]) or 0) * (1 if z["is_buy"] == "1" else -1) for z in Z) if r["mint"] in tr else None
    out2.append(f"| {r['mint'][:8]} | {a['pool'][:8]} | {b['pool'][:8]} | {qa:.1f} | {qb:.1f} | {qb-qa:+.1f} | {'' if net is None else f'{net:+.1f} ({len(Z)} swaps)'} | {'' if net is None else f'{(qb-qa)-net:+.1f}'} |")
open(os.path.join(O, "INV1.md"), "a").write("\n".join(out2) + "\n"); print("\n".join(out2))
# --- the trigger→exit second: reserves at trigger vs at exit, and the swaps recorded in that window
out3 = ["\n## The trigger-to-exit window (~0.8 s): pool SOL at trigger vs exit, and recorded sells in that window\n", "| mint | quote SOL at trigger | quote SOL at exit | sells recorded trig−1 s … exit+1 s (SOL, count, distinct wallets) | same-slot sells | value at trigger → exit |", "|---|---|---|---|---|---|"]
for r in sorted([r for r in closed if r["OUT_r"] < -0.5], key=lambda r: r["OUT_r"]):
    fr = next(z for z in fp if z["vol_id"] == r["vol_id"]); a, b = pj(fr["reserves_at_trigger"]), pj(fr["reserves_at_exit"])
    tt = float(fr["exit_trigger_ts"] or 0); te = float(fr["ms_exit"] or 0) / 1000
    Z = [z for z in tr.get(r["mint"], []) if z["ts"] and tt - 1 <= int(z["ts"]) <= te + 1 and z["is_buy"] != "1"]
    sl = collections.Counter(z["slot"] for z in Z); top = sl.most_common(1)[0] if sl else None
    qa = int(a["quote"]) / 1e9 if a.get("quote") else None; qb = int(b["quote"]) / 1e9 if b.get("quote") else None
    out3.append(f"| {r['mint'][:8]} | {qa if qa is None else round(qa,1)} | {qb if qb is None else round(qb,1)} | {sum(fl(z['sol']) or 0 for z in Z):.1f} SOL, {len(Z)}, {len({z['wallet'] for z in Z})} wallets | {('max ' + str(top[1]) + ' sells in one slot') if top else '–'} | {r['OUT_exit_trigger_x']} → {r['OUT_exit_x']} |")
open(os.path.join(O, "INV1.md"), "a").write("\n".join(out3) + "\n"); print("\n".join(out3))
