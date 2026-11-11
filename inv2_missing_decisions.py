#!/usr/bin/env python3
"""Investigation 2 — launches old enough for a K decision (created activation … read cutoff − 315 s) that have NO decision record.
Run: python3 inv2_missing_decisions.py <package dir> <stalls_log.txt> <out dir>
Every reason is assigned from evidence of what the system observed (checkpoint rows, process restarts, recording gaps, dated event-loop stalls,
lifecycle rows), never from how the coin later performed. Reasons are applied in the order listed; the first that fits is assigned.
How the clock checkpoint works (tracker src/lifecycle.js, 0.19.10+): a launch enters the in-memory lifecycle map only when the tracker receives a
TRADE for it, and only if it was created after the tracker process started (START_TS). A 1-second timer writes the clock row once, at create+300 s
(+2 s grace), and only while the launch is 300–420 s old. The launcher decides only from a written checkpoint row (token_cp_clock or token_life cp=300)."""
import csv, gzip, sys, os, re, collections, datetime as D
P, STL, O = sys.argv[1], sys.argv[2], sys.argv[3]; os.makedirs(O, exist_ok=True)
op = lambda f: gzip.open(os.path.join(P, f), "rt")
U = lambda s: int(D.datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=D.timezone.utc).timestamp())
iso = lambda t: D.datetime.fromtimestamp(t, D.timezone.utc).strftime("%d %H:%M:%S")
ACT, CUT = 1794260923, 1794344553
# --- evidence: tracker process restarts (stop … process start … feed subscribed). Exact pm2 times where the repair logs give them; otherwise
#     stop = commit/deploy time, start = subscribed − 60 s (ESTIMATED; the observed start→subscribe delay was 55–131 s).
RESTARTS = [  # (label, stop, process_start, subscribed, exact?)
    ("deploy tracker 0.19.10", U("2026-11-09 22:46:25"), U("2026-11-09 22:47:16"), U("2026-11-09 22:48:16"), False),
    ("deploy tracker 0.19.11", U("2026-11-09 22:56:52"), U("2026-11-09 22:57:29"), U("2026-11-09 22:58:29"), False),
    ("deploy tracker 0.19.12", U("2026-11-10 00:24:49"), U("2026-11-10 00:25:23"), U("2026-11-10 00:26:23"), False),
    ("DB move to volume", U("2026-11-10 04:20:00"), U("2026-11-10 04:22:06"), U("2026-11-10 04:23:06"), False),
    ("DB move back", U("2026-11-10 04:57:02"), U("2026-11-10 04:58:49"), U("2026-11-10 04:59:44"), True),
    ("DB repair 1", U("2026-11-10 07:53:05"), U("2026-11-10 07:57:30"), U("2026-11-10 07:59:41"), True),
    ("DB repair 2", U("2026-11-10 08:31:43"), U("2026-11-10 08:33:26"), U("2026-11-10 08:34:29"), True)]
CLOCK_START = U("2026-11-09 22:47:16")  # first process running tracker 0.19.10 (clock checkpoint); earlier launches had only the trade-triggered cp=300
# --- evidence: dated event-loop stalls (pm2 log rotated at 00:00 UTC: tracker-error__2026-11-10 = 9 Nov, __2026-11-11 = 10 Nov)
stalls = []; day = None
for line in open(STL):
    m = re.match(r"FILE \S*tracker-error__(\d{4}-\d\d-\d\d)_", line)
    if m: day = (D.date.fromisoformat(m.group(1)) - D.timedelta(days=1)).isoformat(); continue
    if line.startswith("FILE"): day = None if "tracker-error.log" not in line else "2026-11-11"; continue
    m = re.search(r"\[stall\] (\d\d:\d\d:\d\d)Z event loop blocked ([\d.]+) s", line)
    if m and day in ("2026-11-09", "2026-11-10"):
        end = U(f"{day} {m.group(1)}"); stalls.append((end - float(m.group(2)), end, float(m.group(2))))
cen = {r["mint"]: r for r in csv.DictReader(op("census_tokens.csv.gz"))}
# --- evidence: main-feed outages (closed/error/idle → next subscribed; idle counts from 60 s before it was declared), from feed_gaps
gaps = []; down = None
for r in sorted(csv.DictReader(op("feed_gaps.csv.gz")), key=lambda r: int(r["ts"])):
    e, t = r["event"], int(r["ts"])
    if e.startswith("pool-"): continue
    if e in ("closed", "error", "idle") and down is None: down = t - 60 if e == "idle" else t
    elif e == "subscribed" and down is not None: gaps.append((down, t)); down = None
dec = {r["mint"] for r in csv.DictReader(op("decisions_kpaper.csv.gz"))}
clk = {}
for r in csv.DictReader(op("token_cp_clock.csv.gz")):
    if r["cp"] == "300": clk[r["mint"]] = r
tlcps = collections.defaultdict(set)
for r in csv.DictReader(op("token_life.csv.gz")): tlcps[r["mint"]].add(int(r["cp"]))
win = [m for m, r in cen.items() if ACT <= int(r["create_ts"]) <= CUT - 315]
miss = [m for m in win if m not in dec]
rows = []
for m in miss:
    c = int(cen[m]["create_ts"]); a, b = c + 300, c + 420; cps = tlcps.get(m, set()); z = cen[m]
    reason, ev = None, ""
    if m in clk: reason, ev = "launcher did not read a written clock row", f"clock row status {clk[m]['status']}, processed {iso(int(clk[m]['processed_ts']))}"
    if not reason:
        for lab, stop, st, sub, ex in RESTARTS:
            if stop <= b and a <= sub: reason, ev = "tracker not receiving (restart)", f"{lab}: stopped {iso(stop)}, feed back {iso(sub)}{'' if ex else ' (start estimated)'}"; break
            if c < st <= b: reason, ev = "tracker restart: launch created before the new process started (not tracked by design)", f"{lab}: process start {iso(st)}{'' if ex else ' (estimated)'}"; break
    if not reason and a < CLOCK_START: reason, ev = "before the clock checkpoint existed (trade-triggered cp=300 needs a trade after 300 s)", f"5-min point {iso(a)} < clock start {iso(CLOCK_START)}"
    if not reason:
        for s0, s1, d in stalls:
            if s0 <= a + 2 and s1 >= b: reason, ev = "tracker event loop blocked through the whole 300–420 s window", f"stall {iso(int(s0))}–{iso(int(s1))} ({d:.0f} s)"; break
    if not reason and not cps:
        fg = [f"{iso(g0)}–{iso(g1)}" for g0, g1 in gaps if g0 <= b and g1 >= c]
        reason = "no trade processed by the tracker before 420 s (never entered the lifecycle)"
        ev = ("feed gap during its first 420 s: " + fg[0]) if fg else "feed connected; no trade observed — consistent with nobody trading it, NOT independently verifiable (trades of non-retained launches are not stored)"
    if not reason:
        part = [f"{iso(int(s0))}–{iso(int(s1))}" for s0, s1, d in stalls if s0 <= b and s1 >= a]
        reason = "in the lifecycle (early checkpoints written) but no clock row — partly explained" if part else "in the lifecycle (early checkpoints written) but no clock row — UNEXPLAINED"
        ev = f"early checkpoints {sorted(cps)[:4]}…" + (f"; stall overlapping the window {part[0]}" if part else "")
    rows.append({"mint": m, "create_utc": iso(c), "five_min_point_utc": iso(a), "reason": reason, "evidence": ev, "pump_suffix": int(m.endswith("pump"))})
rows.sort(key=lambda r: r["create_utc"])
with open(os.path.join(O, "inv2_missing.csv"), "w", newline="") as f: w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
cnt = collections.Counter(r["reason"] for r in rows)
out = [f"# Investigation 2 — {len(win)} launches old enough for a decision; {len(win)-len(miss)} decided; {len(miss)} without a decision\n",
       "| reason (first that fits) | launches | share |", "|---|---|---|"] + [f"| {k} | {v} | {100*v/len(miss):.1f}% |" for k, v in cnt.most_common()]
sub = collections.Counter("feed gap in the first 420 s" if r["evidence"].startswith("feed gap") else "feed connected, no trade observed" for r in rows if r["reason"].startswith("no trade processed"))
out += ["", "Split of 'no trade processed before 420 s': " + "; ".join(f"{k}: {v}" for k, v in sub.items()), "",
        "Note: the census 'peak/last market cap' fields cannot show whether a launch traded (24 entered coins and 1,849 out-of-band coins look untraded there), so they are not used as evidence."]
out += ["", f"Dated tracker event-loop stalls of ≥ 10 s on 9–10 Nov found in the logs: {len(stalls)}; ≥ 120 s: {sum(1 for s in stalls if s[2] >= 120)}; total blocked time {sum(s[2] for s in stalls)/3600:.1f} h."]
open(os.path.join(O, "INV2.md"), "w").write("\n".join(out) + "\n"); print("\n".join(out))
