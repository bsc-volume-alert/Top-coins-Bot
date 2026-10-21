// Resolve fomo handles to wallets from trades read off the app (screenshots): one line per trade in fomo/finds.txt,
//   label | coin | side | usd | ago | asof
// e.g.  Rowdy | pill | buy | 9995.5 | 17h | 2026-10-21T17:25+01:00
// Runs on the box (deploy hook when finds.txt changes) against the local fomo API; a single clean match (within 2%, one wallet)
// is added to the watch list with the label. Results go to /root/tracker/data/fomo_finds.json (pushed to the data branch).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const PORT = Number(process.env.FOMO_PORT || 8789), base = `http://127.0.0.1:${PORT}`;
const OUT = process.env.FOMO_FINDS_OUT || "/root/tracker/data/fomo_finds.json";
const lines = readFileSync(new URL("../finds.txt", import.meta.url), "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { runs: [] };
const done = new Set(prev.runs.flatMap((r) => r.results.filter((x) => x.added || x.skip).map((x) => x.line)));
const run = { at: new Date().toISOString(), results: [] };
for (const line of lines) {
  if (done.has(line)) continue;
  const [label, coin, side, usd, ago, asof] = line.split("|").map((x) => x.trim());
  const at = asof ? Math.floor(Date.parse(asof) / 1000) : null;
  const r = { line, label, coin, side, usd, ago };
  try {
    const j = await (await fetch(`${base}/api/find`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ coin, usd: Number(usd), ago, side: side || "any", at }) })).json();
    if (!j.ok) { r.error = j.error; run.results.push(r); continue; }
    let s; for (let i = 0; i < 100; i++) { await new Promise((x) => setTimeout(x, 3000)); s = await (await fetch(`${base}/api/find?id=${j.id}`)).json(); if (s.state !== "running") break; }
    r.note = s.note; r.credits = s.credits; r.scanned = s.scanned; r.chains = s.chains; r.candidates = (s.candidates || []).slice(0, 5);
    const good = r.candidates.filter((c) => c.off <= 2), wallets = new Set(good.map((c) => c.wallet));
    if (wallets.size === 1) { const w = good[0].wallet; const a = await (await fetch(`${base}/api/wallets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "add", wallet: w, label }) })).json(); r.added = a.ok ? w : null; r.addErr = a.ok ? null : a.error; }
    else if (/not a Solana coin|no coin called/.test(s.note || "")) r.skip = true;
    else r.ambiguous = wallets.size;
  } catch (e) { r.error = e.message; }
  run.results.push(r); console.log(JSON.stringify(r));
}
prev.runs.push(run); if (prev.runs.length > 30) prev.runs = prev.runs.slice(-30);
writeFileSync(OUT, JSON.stringify(prev, null, 1));
