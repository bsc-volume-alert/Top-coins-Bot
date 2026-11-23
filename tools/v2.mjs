import { readCsv, sum, med } from "./lib.mjs";
const D = process.argv[2], X = readCsv(D + "/exit_comparison_identical_buys.csv"), L = readCsv(D + "/coin_ledger.csv"), P = readCsv(D + "/positions.csv");
const pad = (s, n) => String(s ?? "").padEnd(n).slice(0, n), books = [...new Set(X.map((x) => x.book))];
console.log("IDENTICAL BUYS (all ten rows closed+measured): net SOL by stop — trail | scale(half at 2x)");
for (const b of books) { const r = X.filter((x) => x.book === b), g = (st, p) => r.find((x) => x.stop_pct === st && x.exit_policy === p)?.net_sol; console.log(pad(b, 14), pad(r[0].identical_buys, 4), [20, 25, 30, 40, 60].map((s) => pad(g(s, "trail"), 7)).join(""), "|", [20, 25, 30, 40, 60].map((s) => pad(g(s, "scale"), 7)).join("")); }
// runners: first buys that reached 2x (executable value) within 24 h of the fill — what each row realised on them
console.log("\nRUNNERS (first buys, reached 2x within 24h; measured rows): n | mean ret % at 20t 30t 40t 60t 30s 60s | captured(>=+50%) at 30t / 60t | sold-before-run at 30t");
const pm = new Map(); for (const p of P) pm.set(p.entry_id + "|" + p.rule_family + "|" + p.stop_pct + "|" + p.exit_policy, p);
for (const b of [...new Set(L.map((l) => l.book))]) { const base = L.filter((l) => l.book === b && !l.rebuy && l.stop_pct === 30 && l.exit_policy === "trail" && l.runner_max_x_24h >= 2 && l.financial_outcome !== "open" && !/not filled/.test(l.financial_outcome)); if (!base.length) continue;
  const g = (st, pol) => { const r = base.map((l) => pm.get(l.entry_id + "|" + l.rule_family + "|" + st + "|" + pol)).filter((p) => p && p.row_status === "closed" && !p.estimated_exit); return r.length ? (100 * sum(r.map((p) => p.ret)) / r.length).toFixed(0) + "(" + r.length + ")" : "-"; };
  const cap = (st) => base.map((l) => pm.get(l.entry_id + "|" + l.rule_family + "|" + st + "|trail")).filter((p) => p && p.row_status === "closed" && p.ret >= 0.5).length;
  console.log(pad(b, 14), pad(base.length, 4), [[20, "trail"], [30, "trail"], [40, "trail"], [60, "trail"], [30, "scale"], [60, "scale"]].map(([s, p]) => pad(g(s, p), 9)).join(""), "|", cap(30), "/", cap(60), "|", base.filter((l) => /sold before/.test(l.price_path_class)).length); }
// path classes, default row first buys
console.log("\nPATH CLASSES (30% trail, first buys, measured closed): class n net");
const cls = {}; for (const l of L) if (!l.rebuy && l.stop_pct === 30 && l.exit_policy === "trail" && ["profitable", "losing", "flat"].includes(l.financial_outcome)) { const o = (cls[l.price_path_class] ||= { n: 0, net: 0 }); o.n++; o.net += l.net_sol; }
for (const [k, o] of Object.entries(cls).sort((a, b) => b[1].n - a[1].n)) console.log(" ", pad(k, 50), o.n, o.net.toFixed(2));
const mech = {}; for (const l of L) if (!l.rebuy && l.stop_pct === 30 && l.exit_policy === "trail" && l.financial_outcome === "losing") for (const m of (l.loss_mechanism_labels || "").split("; ")) { const o = (mech[m] ||= { n: 0, net: 0 }); o.n++; o.net += l.net_sol; }
console.log("LOSS LABELS (a row can carry several):"); for (const [k, o] of Object.entries(mech).sort((a, b) => b[1].n - a[1].n)) console.log(" ", pad(k, 62), o.n, o.net.toFixed(2));
