// reconcile.mjs — compares the package (positions.csv) with the bot's own published report rows (pub-state.json, same cutoff).
import fs from "node:fs";
const [PKG, RAW] = process.argv.slice(2);
const st = JSON.parse(fs.readFileSync(RAW + "/pub-state.json", "utf8"));
const L = fs.readFileSync(PKG + "/positions.csv", "utf8").trim().split("\n"), h = L[0].split(","), ix = (k) => h.indexOf(k);
// positions.csv has no quoted commas before the columns used here except symbol; parse properly
const parse = (l) => { const o = []; let c = "", q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"') { if (l[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; } else if (ch === '"') q = true; else if (ch === ",") { o.push(c); c = ""; } else c += ch; } o.push(c); return o; };
const mine = new Map();
for (const l of L.slice(1)) { const r = parse(l), book = r[ix("book")], fam = r[ix("rule_family")]; if (book !== fam) continue; if (+r[ix("rebuy")]) continue; const k = `${fam}|${r[ix("age_group")]}|${+r[ix("stop_pct")] / 100}|${r[ix("exit_policy")]}`, o = mine.get(k) || mine.set(k, { entries: 0, filled: 0, closed: 0, net: 0, open: 0, est: 0 }).get(k);
  o.entries++; if (r[ix("entry_status")] !== "filled") continue; o.filled++; if (r[ix("row_status")] === "closed") { if (+r[ix("estimated_exit")]) o.est++; else { o.closed++; o.net += +r[ix("net_sol")]; } } else o.open++; }
console.log("state at", st.at, "rows", st.rows.length, "keys", Object.keys(st.rows[0]).join(" ").slice(0, 400));
let same = 0, diff = 0, sumA = 0, sumB = 0; const bad = [];
for (const r of st.rows) { const k = `${r.family}|${r.ag}|${r.stop}|${r.policy}`, m = mine.get(k) || { entries: 0, filled: 0, closed: 0, net: 0, open: 0, est: 0 }; const net = r.net_sol ?? r.net ?? 0; sumA += net; sumB += m.net;
  if (r.entries === m.entries && r.closed === m.closed && Math.abs(net - m.net) < 0.002) same++; else { diff++; if (bad.length < 12) bad.push(`${k}: bot entries ${r.entries} closed ${r.closed} net ${net} | package entries ${m.entries} closed ${m.closed} net ${m.net.toFixed(4)}`); } }
console.log("rows identical:", same, "different:", diff, "| bot total", sumA.toFixed(3), "package total", sumB.toFixed(3)); console.log(bad.join("\n"));
