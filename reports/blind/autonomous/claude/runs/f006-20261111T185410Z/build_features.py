#!/usr/bin/env python3
"""F006 part 1 — build knowable-at-time buyer/ownership features and future-only outcome labels at matched ages.
Usage: python3 -I build_features.py --data <entry-all dir> --solusd <sol_usd.csv.gz> --eval <dir with evaluate.py> --out <dir>
Frozen eval-1.1 evaluate.py is imported unchanged (load, iter_mints, state_ok, state_at, gap_overlap, fl, constants)."""
import argparse, bisect, calendar, collections, csv, gzip, hashlib, importlib.util, json, math, os, sys, time
import numpy as np

AGES = (300, 900, 1800)
HORIZON = 3600
SPLIT = calendar.timegm(time.strptime("2026-11-07 01:50:00", "%Y-%m-%d %H:%M:%S"))
T0 = calendar.timegm(time.strptime("2026-11-06 07:40:00", "%Y-%m-%d %H:%M:%S"))
T1 = calendar.timegm(time.strptime("2026-11-07 20:00:00", "%Y-%m-%d %H:%M:%S"))
OUTAGES = [("06", "20:40", "20:42"), ("06", "20:57", "21:06"), ("06", "23:33", "23:35"), ("07", "00:06", "00:08"), ("07", "00:26:30", "00:27:30"), ("06", "21:40", "21:45")]
FEATURES = ["n_buyers", "n_buys", "n_sells", "buy_sol_total", "median_buy_sol", "p90_buy_sol", "share_buy_sol_ge_1sol",
            "first_time_buyer_share", "repeat_buyer_share", "net_inflow_last_60s", "net_inflow_last_300s", "inflow_persistence", "buyers_last_60s",
            "early_buyer_sold_share", "creator_bought_sol", "creator_sold_share", "top10_holder_share", "hhi", "n_net_holders",
            "same_creator_repeat_share", "tape_recurring_share", "sells_to_buys_ratio"]

def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--data", required=True); ap.add_argument("--solusd", required=True); ap.add_argument("--eval", required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    spec = importlib.util.spec_from_file_location("ev", os.path.join(a.eval, "evaluate.py")); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
    checks = {"evaluate.py": sha(os.path.join(a.eval, "evaluate.py"))}
    for line in open(os.path.join(a.data, "SHA256SUMS.txt")):
        want, name = line.split(); got = sha(os.path.join(a.data, name)); assert want == got, name; checks[name] = got
    checks["sol_usd.csv.gz"] = sha(a.solusd)
    # replay dir with the evaluator's expected file names
    rp = os.path.join(a.out, "replay"); os.makedirs(rp, exist_ok=True)
    for src, dst in (("tokens_window.csv.gz", "tokens.csv.gz"), ("feed_gaps_all.csv.gz", "feed_gaps.csv.gz")):
        q = os.path.join(rp, dst)
        if not os.path.exists(q): os.symlink(os.path.abspath(os.path.join(a.data, src)), q)
    for i in range(1, 13):
        q = os.path.join(rp, f"trades_part_{i:03d}.csv.gz")
        if not os.path.exists(q): os.symlink(os.path.abspath(os.path.join(a.data, f"trades_part_{i:03d}.csv.gz")), q)
    with open(os.path.join(rp, "outages.txt"), "w") as f:
        for day, s, e in OUTAGES:
            ts = [calendar.timegm(time.strptime(f"2026-11-{day} {x}", "%Y-%m-%d %H:%M" if x.count(":") == 1 else "%Y-%m-%d %H:%M:%S")) for x in (s, e)]
            f.write(f"{ts[0]} {ts[1]} published_development_outage_assumption\n")
    tok, gaps, outages, meta = ev.load(rp, T0, T1)
    gaps_tol = {"main": [(s_, e_) for s_, e_ in gaps["main"] if e_ - s_ >= 30], "pool": gaps["pool"]}
    creator, peak_mc, graduated = {}, {}, {}
    for r in csv.DictReader(ev.opn(os.path.join(a.data, "tokens_window.csv.gz"))):
        creator[r["mint"]] = r["creator"]; peak_mc[r["mint"]] = ev.fl(r["peak_mc_usd"]); graduated[r["mint"]] = r["graduated"]
    su_t, su_v = [], []
    for r in csv.DictReader(ev.opn(a.solusd)): su_t.append(float(r["ts"])); su_v.append(float(r["usd"]))
    def usd(ts):
        i = bisect.bisect_right(su_t, ts) - 1
        return su_v[max(i, 0)]
    # ------------------------------------------------------------ pass 1: stream all mints once, keep compact arrays
    wfirst = collections.defaultdict(dict); rows = []; labstat = collections.Counter(); pending = []
    stats = {"mints_streamed": 0, "duplicates_removed": 0, "non_contiguous": 0, "_done": set()}
    audit = collections.Counter(); mints = {}
    def per_mint(m, d, L, wallets):
        created, ra = d["created"], d["retained_at"]; cr = creator.get(m, "")
        half = "early" if created < SPLIT else "late"
        for A in AGES:
            t = created + A; rec = {"mint": m, "age_s": A, "half": half, "created": created, "retained_at": ra, "creator": cr, "no_recv_rows": d["no_recv"]}
            if ra > t: labstat[(A, "not_retained_by_age")] += 1; rec["status"] = "not_retained_by_age"; rows.append(rec); continue
            kn = (d["recv"] <= t)   # knowable rows (NaN recv -> False)
            idx = np.where(kn)[0]
            if len(idx) == 0: labstat[(A, "no_knowable_rows")] += 1; rec["status"] = "no_knowable_rows"; rows.append(rec); continue
            ts, isb, sol, tk, w = d["ts"][idx], d["isbuy"][idx], d["sol"][idx], d["tk"][idx], [wallets[i] for i in idx]
            buys = isb; sells = ~isb
            buyers = sorted(set(w[i] for i in range(len(w)) if buys[i]))
            bsol = sol[buys]
            rec["n_buyers"] = len(buyers); rec["n_buys"] = int(buys.sum()); rec["n_sells"] = int(sells.sum()); rec["buy_sol_total"] = float(bsol.sum())
            rec["median_buy_sol"] = float(np.median(bsol)) if len(bsol) else 0.0; rec["p90_buy_sol"] = float(np.percentile(bsol, 90)) if len(bsol) else 0.0
            rec["share_buy_sol_ge_1sol"] = float(bsol[bsol >= 1.0].sum() / bsol.sum()) if bsol.sum() > 0 else 0.0
            rec["sells_to_buys_ratio"] = float(sol[sells].sum() / bsol.sum()) if bsol.sum() > 0 else 0.0
            pending.append((rec, buyers, t, created, cr, m))
            net = np.where(buys, sol, -sol)
            rec["net_inflow_last_60s"] = float(net[ts > t - 60].sum()); rec["net_inflow_last_300s"] = float(net[ts > t - 300].sum())
            nbk = max(int(math.ceil(A / 60)), 1); bk = np.minimum(((ts - created) // 60).astype(int), nbk - 1); bk = np.maximum(bk, 0)
            bsum = np.bincount(bk, weights=net, minlength=nbk); rec["inflow_persistence"] = float((bsum > 0).mean())
            rec["buyers_last_60s"] = len(set(w[i] for i in range(len(w)) if buys[i] and ts[i] > t - 60))
            # inventory: trade-derived net holdings
            bought, sold, firstbuy = collections.defaultdict(float), collections.defaultdict(float), {}
            for i in range(len(w)):
                if buys[i]:
                    bought[w[i]] += tk[i]
                    if w[i] not in firstbuy: firstbuy[w[i]] = ts[i]
                else: sold[w[i]] += tk[i]
            early = [x for x, f in firstbuy.items() if f <= created + 60]
            eb = sum(bought[x] for x in early); es = sum(sold[x] for x in early)
            rec["early_buyer_sold_share"] = min(es / eb, 1.0) if eb > 0 else float("nan"); rec["n_early_buyers"] = len(early)
            rec["creator_bought_sol"] = float(sum(sol[i] for i in range(len(w)) if buys[i] and w[i] == cr))
            rec["creator_sold_share"] = min(sold[cr] / bought[cr], 1.0) if bought[cr] > 0 else float("nan")
            hold = np.array(sorted((max(bought[x] - sold[x], 0.0) for x in set(list(bought) + list(sold))), reverse=True))
            tot = hold.sum()
            rec["top10_holder_share"] = float(hold[:10].sum() / tot) if tot > 0 else float("nan"); rec["hhi"] = float(((hold / tot) ** 2).sum()) if tot > 0 else float("nan")
            rec["n_net_holders"] = int((hold > 0).sum())
            # ---------------- outcome (future used only as label)
            st, why = ev.state_at(L, t, gaps, outages, created, ra)
            if st is None: rec["status"] = "no_state_at_t:" + why; rec["label2x"] = rec["label100k"] = "unknown"; labstat[(A, "unknown_no_state")] += 1; rows.append(rec); continue
            P = (ev.fl(st["vsol"]) / 1e9) / (ev.fl(st["vtok"]) / 1e6); rec["price_at_t"] = P; rec["mcap_usd_at_t"] = P * 1e9 * usd(t); rec["venue_at_t"] = st["venue"] or "curve"
            fut = np.where((d["ts"] > t) & (d["ts"] <= t + HORIZON))[0]
            fp, fts, fok = d["price"][fut], d["ts"][fut], d["ok"][fut]
            valid = fok & ~np.isnan(fp)
            # sustained 2x
            s2 = False; start = None
            for i in range(len(fut)):
                if not valid[i]: continue
                if fp[i] >= 2 * P:
                    if start is None: start = fts[i]
                    elif fts[i] >= start + 30: s2 = True; break
                else: start = None
            mcs = fp[valid] * 1e9 * np.array([usd(x) for x in fts[valid]]) if valid.any() else np.array([])
            c100 = bool(rec["mcap_usd_at_t"] < 1e5 and len(mcs) and mcs.max() >= 1e5)
            rec["max_multiple_1h"] = float(np.nanmax(fp[valid]) / P) if valid.any() else float("nan"); rec["n_future_trades_1h"] = int(len(fut)); rec["n_future_valid_1h"] = int(valid.sum())
            rec["already_ge_100k_at_t"] = bool(rec["mcap_usd_at_t"] >= 1e5)
            # coverage for a negative label
            pool_seen = bool(d["pool"][fut].any()) or (st["venue"] not in ("curve", ""))
            curve_done = bool(valid.any() and (fp[valid] >= 0.98 * ev.CURVE_MAX_PX).any()) or pool_seen
            cov_ok = not ev.gap_overlap(gaps, outages, t, t + HORIZON, "pumpswap" if pool_seen else "curve") and (t + HORIZON <= ra + ev.RETAIN_MIN * 60)
            if curve_done:
                cov_ok = cov_ok and ((created >= ev.POOL_ALL_FROM) or (created >= ev.POOL_RET_FROM and t + HORIZON <= ra + ev.RETAIN_MIN * 60))
            # SENSITIVITY variant (added after the strict registered rule produced 2,044 unknowns at 5 min, see README): ignore main-feed gaps
            # shorter than 30 s. A sustained-2x episode needs >= 30 s of trades above 2x, so a gap < 30 s cannot hide one; for cross100k the same
            # tolerance is applied but a single crossing trade could in principle fall inside a short gap, so that variant is weaker.
            cov_tol = not ev.gap_overlap(gaps_tol, outages, t, t + HORIZON, "pumpswap" if pool_seen else "curve") and (t + HORIZON <= ra + ev.RETAIN_MIN * 60)
            if curve_done:
                cov_tol = cov_tol and ((created >= ev.POOL_ALL_FROM) or (created >= ev.POOL_RET_FROM and t + HORIZON <= ra + ev.RETAIN_MIN * 60))
            rec["curve_done_in_window"] = curve_done; rec["coverage_ok"] = cov_ok; rec["coverage_ok_tol30"] = cov_tol
            rec["label2x"] = "runner" if s2 else ("nonrunner" if cov_ok else "unknown")
            rec["label100k"] = "already" if rec["already_ge_100k_at_t"] else ("runner" if c100 else ("nonrunner" if cov_ok else "unknown"))
            rec["label2x_tol30"] = "runner" if s2 else ("nonrunner" if cov_tol else "unknown")
            rec["label100k_tol30"] = "already" if rec["already_ge_100k_at_t"] else ("runner" if c100 else ("nonrunner" if cov_tol else "unknown"))
            labstat[(A, "2x_tol30:" + rec["label2x_tol30"])] += 1; labstat[(A, "100k_tol30:" + rec["label100k_tol30"])] += 1
            rec["peak_mc_usd_census"] = peak_mc.get(m); rec["graduated_census"] = graduated.get(m); rec["status"] = "ok"
            labstat[(A, "2x:" + rec["label2x"])] += 1; labstat[(A, "100k:" + rec["label100k"])] += 1
            rows.append(rec)
    print("pass1 start", time.strftime("%H:%M:%S"), flush=True)
    for m, L in ev.iter_mints(rp, tok, stats):
        info = tok[m]; created = info["created"]
        cum, retained_at, no_recv = 0.0, None, 0
        for r in L:
            if r["venue"] not in ("curve", ""): continue
            if r["is_buy"] == "1": cum += ev.fl(r["sol"]) or 0
            if info["tier"] >= 1 or cum >= ev.RETAIN_SOL:
                rv = ev.fl(r["recv_ms"]); retained_at = rv / 1000 if rv else ev.fl(r["ts"]); break
        if retained_at is None: audit["never_retained"] += 1; continue
        if any(s < created + 7200 and e > created for s, e in outages): audit["outage_excluded"] += 1; continue
        n = len(L)
        ts = np.array([ev.fl(r["ts"]) for r in L]); recv = np.array([(ev.fl(r["recv_ms"]) or np.nan) for r in L]) / 1000.0
        no_recv = int(np.isnan(recv).sum())
        isbuy = np.array([r["is_buy"] == "1" for r in L]); sol = np.array([ev.fl(r["sol"]) or 0.0 for r in L]); tk = np.array([ev.fl(r["tokens"]) or 0.0 for r in L])
        ok = np.array([ev.state_ok(r) for r in L]); vs = np.array([ev.fl(r["vsol"]) or np.nan for r in L]); vt = np.array([ev.fl(r["vtok"]) or np.nan for r in L])
        price = np.where(ok, (vs / 1e9) / (vt / 1e6), np.nan)
        pool = np.array([bool(r["venue"]) and r["venue"] != "curve" for r in L])
        wallets = [r["wallet"] for r in L]
        d = dict(created=created, retained_at=retained_at, ts=ts, recv=recv, isbuy=isbuy, sol=sol, tk=tk, ok=ok, price=price, pool=pool, no_recv=no_recv, tier=info["tier"])
        for i in range(n):
            if isbuy[i] and not np.isnan(recv[i]):
                w = wallets[i]; prev = wfirst[w].get(m)
                if prev is None or recv[i] < prev: wfirst[w][m] = recv[i]
        mints[m] = dict(created=created)
        per_mint(m, d, L, wallets)
        audit["eligible"] += 1
        if audit["eligible"] % 500 == 0: print("pass1", audit["eligible"], time.strftime("%H:%M:%S"), flush=True)
    print("pass1 done", dict(audit), {k: v for k, v in stats.items() if k != "_done"}, flush=True)
    # ------------------------------------------------------------ cross-mint wallet history (first buy per (wallet, mint), receipt time)
    whist = {}  # wallet -> (sorted first-buy times array, mint list aligned, created array aligned)
    for w, dd in wfirst.items():
        items = sorted(dd.items(), key=lambda kv: kv[1]); whist[w] = (np.array([v for _, v in items]), [k for k, _ in items], np.array([mints[k]["created"] for k, _ in items]))
    creator_mints = collections.defaultdict(list)
    for m, d in mints.items(): creator_mints[creator.get(m, "")].append((d["created"], m))
    print("wallet history built", len(whist), "wallets", time.strftime("%H:%M:%S"), flush=True)
    # ------------------------------------------------------------ pass 2: cross-mint wallet-history features (knowable at t)
    for rec, buyers, t, created, cr, m in pending:
        ft = rep = scr = trc = 0
        cmints = set(mm for (c, mm) in creator_mints.get(cr, []) if c < created)
        for b in buyers:
            tt, ml, cc = whist[b]; k = bisect.bisect_right(tt, t)
            others = [j for j in range(k) if ml[j] != m]
            if not others: ft += 1
            if sum(1 for j in others if tt[j] >= t - 86400) >= 5: rep += 1
            if sum(1 for j in others if created - 3600 <= cc[j] < created) >= 2: trc += 1
            if cmints and any(ml[j] in cmints for j in others): scr += 1
        nb = max(len(buyers), 1)
        rec["first_time_buyer_share"] = ft / nb; rec["repeat_buyer_share"] = rep / nb; rec["tape_recurring_share"] = trc / nb
        rec["same_creator_repeat_share"] = (scr / nb) if cmints else float("nan"); rec["creator_prior_launches_in_tape"] = len(cmints)
    cols = sorted(set(k for r in rows for k in r))
    with gzip.open(os.path.join(a.out, "features_labels.csv.gz"), "wt", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=cols); wr.writeheader(); wr.writerows(rows)
    out = {"checks": checks, "audit": dict(audit), "stream_stats": {k: v for k, v in stats.items() if k != "_done"}, "launches_in_window": len(tok),
           "label_counts": {f"{k[0]}|{k[1]}": v for k, v in sorted(labstat.items())}, "ages": AGES, "horizon_s": HORIZON, "split": SPLIT, "features": FEATURES, "sol_usd_rows": len(su_t), "sol_usd_range": [su_t[0], su_t[-1]]}
    json.dump(out, open(os.path.join(a.out, "build_summary.json"), "w"), indent=1); print(json.dumps(out, indent=1))

if __name__ == "__main__": main()
