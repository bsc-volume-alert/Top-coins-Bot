#!/usr/bin/env python3
"""F006 part 1 — compare knowable-at-time features between runners and matched non-runners at the same age.
Usage: python3 -I analyze.py --features <features_labels.csv.gz> --summary <build_summary.json> --out <dir>
No threshold/rule search. Statistics only: medians, AUC (Mann-Whitney), bootstrap CI, Bonferroni-flagged hypotheses."""
import argparse, csv, gzip, json, math, os, random
import numpy as np
from scipy.stats import mannwhitneyu

FEATURES = ["n_buyers", "n_buys", "n_sells", "buy_sol_total", "median_buy_sol", "p90_buy_sol", "share_buy_sol_ge_1sol",
            "first_time_buyer_share", "repeat_buyer_share", "net_inflow_last_60s", "net_inflow_last_300s", "inflow_persistence", "buyers_last_60s",
            "early_buyer_sold_share", "creator_bought_sol", "creator_sold_share", "top10_holder_share", "hhi", "n_net_holders",
            "same_creator_repeat_share", "tape_recurring_share", "sells_to_buys_ratio"]
OUTCOMES = {"sustained2x": "label2x", "cross100k": "label100k", "sustained2x_tol30": "label2x_tol30", "cross100k_tol30": "label100k_tol30"}
AGES = (300, 900, 1800)
NTESTS = len(FEATURES) * len(AGES) * 2   # registered: 22 features x 3 ages x 2 outcomes = 132; tol30 variants use the same per-test alpha
ALPHA = 0.05 / NTESTS
RNG = random.Random(20261111)

def fnum(x):
    try:
        v = float(x); return v
    except (TypeError, ValueError): return float("nan")

def auc(pos, neg):
    pos, neg = np.asarray(pos, float), np.asarray(neg, float)
    if len(pos) == 0 or len(neg) == 0: return float("nan")
    u = mannwhitneyu(pos, neg, alternative="two-sided", method="asymptotic")
    return float(u.statistic / (len(pos) * len(neg))), float(u.pvalue)

def boot_auc(pos, neg, n=2000):
    pos, neg = np.asarray(pos, float), np.asarray(neg, float); rs = np.random.RandomState(20261111); vals = []
    for _ in range(n):
        p = pos[rs.randint(0, len(pos), len(pos))]; q = neg[rs.randint(0, len(neg), len(neg))]
        # fast AUC via ranks
        allv = np.concatenate([p, q]); r = np.argsort(np.argsort(allv, kind="mergesort")).astype(float)
        # tie-aware ranks
        order = np.argsort(allv, kind="mergesort"); sv = allv[order]; ranks = np.empty(len(allv)); i = 0
        while i < len(sv):
            j = i
            while j + 1 < len(sv) and sv[j + 1] == sv[i]: j += 1
            ranks[order[i:j + 1]] = (i + j) / 2 + 1; i = j + 1
        vals.append((ranks[:len(p)].sum() - len(p) * (len(p) + 1) / 2) / (len(p) * len(q)))
    vals.sort(); return vals[int(0.025 * n)], vals[int(0.975 * n) - 1]

def med(v):
    v = [x for x in v if not math.isnan(x)]; return (float(np.median(v)) if v else None), len(v)

def compare(rows, lab, tag):
    """rows: list of dict records with labels already set under key lab (runner/nonrunner/unknown)."""
    out = {}
    pos_rows = [r for r in rows if r[lab] == "runner"]; neg_rows = [r for r in rows if r[lab] == "nonrunner"]; unk_rows = [r for r in rows if r[lab] == "unknown"]
    out["n_runner"], out["n_nonrunner"], out["n_unknown"] = len(pos_rows), len(neg_rows), len(unk_rows)
    out["n_runner_by_half"] = {h: sum(1 for r in pos_rows if r["half"] == h) for h in ("early", "late")}
    out["n_nonrunner_by_half"] = {h: sum(1 for r in neg_rows if r["half"] == h) for h in ("early", "late")}
    out["features"] = {}
    for f in FEATURES:
        pos = [fnum(r.get(f)) for r in pos_rows]; neg = [fnum(r.get(f)) for r in neg_rows]; unk = [fnum(r.get(f)) for r in unk_rows]
        pm, pn = med(pos); nm, nn = med(neg); um, un = med(unk)
        pv = [x for x in pos if not math.isnan(x)]; nv = [x for x in neg if not math.isnan(x)]
        rec = {"median_runner": pm, "median_nonrunner": nm, "median_unknown": um, "n_runner_nonnan": pn, "n_nonrunner_nonnan": nn, "n_unknown_nonnan": un}
        if len(pv) >= 3 and len(nv) >= 3:
            a, p = auc(pv, nv); lo, hi = boot_auc(pv, nv)
            rec.update({"auc_runner_vs_nonrunner": a, "mw_p_two_sided": p, "auc_boot95": [lo, hi], "flagged_bonferroni": bool(p < ALPHA)})
            for h in ("early", "late"):
                ph = [fnum(r.get(f)) for r in pos_rows if r["half"] == h]; nh = [fnum(r.get(f)) for r in neg_rows if r["half"] == h]
                ph = [x for x in ph if not math.isnan(x)]; nh = [x for x in nh if not math.isnan(x)]
                rec["auc_" + h] = auc(ph, nh)[0] if len(ph) >= 3 and len(nh) >= 3 else None
        out["features"][f] = rec
    return out

def match(rows, lab):
    """each runner -> up to 5 non-runners, same half, |created diff| <= 7200 s, nearest |log mcap at t|, without replacement."""
    pos = sorted([r for r in rows if r[lab] == "runner"], key=lambda r: r["created"]); neg = [r for r in rows if r[lab] == "nonrunner"]
    used = set(); matched = []; nmatch = []
    for p in pos:
        cands = [(abs(math.log(max(fnum(q["mcap_usd_at_t"]), 1e-9)) - math.log(max(fnum(p["mcap_usd_at_t"]), 1e-9))), i) for i, q in enumerate(neg)
                 if i not in used and q["half"] == p["half"] and abs(q["created"] - p["created"]) <= 7200 and not math.isnan(fnum(q["mcap_usd_at_t"]))]
        cands.sort(); take = [i for _, i in cands[:5]]
        for i in take: used.add(i)
        nmatch.append(len(take))
        if take: matched.append(p); matched.extend(neg[i] for i in take)
    return matched, nmatch

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--features", required=True); ap.add_argument("--summary", required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    rows = list(csv.DictReader(gzip.open(a.features, "rt")))
    for r in rows:
        r["created"] = fnum(r["created"]); r["age_s"] = int(r["age_s"])
    summary = json.load(open(a.summary))
    res = {"n_tests_bonferroni": NTESTS, "alpha_per_test": ALPHA, "build_summary": summary, "ages": {}}
    for A in AGES:
        RA = [r for r in rows if r["age_s"] == A]
        block = {"records": len(RA), "status_counts": {}, "outcomes": {}}
        for r in RA: block["status_counts"][r["status"]] = block["status_counts"].get(r["status"], 0) + 1
        ok = [r for r in RA if r["status"] == "ok"]
        # census cross-check (current values, outcome-only)
        cc = {"label100k_runner_with_census_peak_ge_100k": 0, "label100k_runner_total": 0, "label100k_nonrunner_with_census_peak_ge_100k": 0, "label100k_nonrunner_total": 0,
              "label2x_runner_with_census_graduated": 0, "label2x_nonrunner_with_census_graduated": 0, "codex_c009_sustained2x_observations": {300: 56, 900: 21, 1800: 9}[A]}
        for r in ok:
            pk = fnum(r.get("peak_mc_usd_census")); g = r.get("graduated_census") == "1"
            if r["label100k"] == "runner": cc["label100k_runner_total"] += 1; cc["label100k_runner_with_census_peak_ge_100k"] += int(pk >= 1e5)
            if r["label100k"] == "nonrunner": cc["label100k_nonrunner_total"] += 1; cc["label100k_nonrunner_with_census_peak_ge_100k"] += int(pk >= 1e5)
            if r["label2x"] == "runner": cc["label2x_runner_with_census_graduated"] += int(g)
            if r["label2x"] == "nonrunner": cc["label2x_nonrunner_with_census_graduated"] += int(g)
        block["census_cross_check"] = cc
        block["unknown_reasons"] = {}
        for r in ok:
            if r["label2x"] == "unknown":
                k = ("curve_done_no_pool_coverage" if r["curve_done_in_window"] == "True" else "gap_or_outside_capture"); block["unknown_reasons"][k] = block["unknown_reasons"].get(k, 0) + 1
        mm = [fnum(r["max_multiple_1h"]) for r in ok if r["label2x"] in ("runner", "nonrunner") and not math.isnan(fnum(r["max_multiple_1h"]))]
        block["max_multiple_1h_labelled"] = {"n": len(mm), "median": float(np.median(mm)) if mm else None, "p90": float(np.percentile(mm, 90)) if mm else None, "max": max(mm) if mm else None}
        for oname, lab in OUTCOMES.items():
            o = {"full": compare(ok, lab, "full")}
            matched, nmatch = match(ok, lab)
            o["matched"] = compare(matched, lab, "matched"); o["matched"]["runners_with_0_matches"] = sum(1 for x in nmatch if x == 0); o["matched"]["matches_per_runner_mean"] = (sum(nmatch) / len(nmatch)) if nmatch else None
            o["already_above_100k_at_t"] = sum(1 for r in ok if r[lab] == "already")
            block["outcomes"][oname] = o
            with gzip.open(os.path.join(a.out, f"matched_{oname}_{A}s.csv.gz"), "wt", newline="") as f:
                w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(matched)
        res["ages"][str(A)] = block
    # flagged list
    flags = []
    for A, block in res["ages"].items():
        for oname, o in block["outcomes"].items():
            for kind in ("full", "matched"):
                for f, rec in o[kind]["features"].items():
                    if rec.get("flagged_bonferroni"): flags.append({"age_s": int(A), "outcome": oname, "set": kind, "feature": f, "auc": rec["auc_runner_vs_nonrunner"], "ci95": rec["auc_boot95"], "p": rec["mw_p_two_sided"], "auc_early": rec.get("auc_early"), "auc_late": rec.get("auc_late"), "median_runner": rec["median_runner"], "median_nonrunner": rec["median_nonrunner"], "n_runner": o[kind]["n_runner"], "n_nonrunner": o[kind]["n_nonrunner"]})
    res["flagged_hypotheses"] = flags; res["n_flagged"] = len(flags)
    json.dump(res, open(os.path.join(a.out, "results.json"), "w"), indent=1, default=str)
    print(json.dumps({"n_flagged": len(flags), "flags": flags}, indent=1, default=str))

if __name__ == "__main__": main()
