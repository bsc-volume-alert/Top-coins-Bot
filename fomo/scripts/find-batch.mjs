// Resolve fomo handles to wallets from trades read off the app (screenshots): one line per trade in fomo/finds.txt,
//   label | coin | side | usd | ago | asof
// e.g.  Rowdy | pill | buy | 9995.5 | 17h | 2026-10-21T17:25+01:00
// Runs on the box in its own process (deploy hook when finds.txt changes) — the search itself is in-process, so a fomo app
// reload cannot lose it; only the final "watch this wallet" goes through the app's API (retried). A single clean match
// (within 2%, one wallet) is added with the label. Results: /root/tracker/data/fomo_finds.json (pushed to the data branch).
import "../src/env.mjs";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { runFind } from "../src/find.mjs";
import { fetchSolOnce } from "../src/price.mjs";
const PORT = Number(process.env.FOMO_PORT || 8789), base = `http://127.0.0.1:${PORT}`;
const OUT = process.env.FOMO_FINDS_OUT || "/root/tracker/data/fomo_finds.json";
await fetchSolOnce();
const lines = readFileSync(new URL("../finds.txt", import.meta.url), "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
let prev = { runs: [] }; try { if (existsSync(OUT)) prev = JSON.parse(readFileSync(OUT, "utf8")); } catch {}
const done = new Set(prev.runs.flatMap((r) => r.results.filter((x) => x.added || x.skip).map((x) => x.line)));
const run = { at: new Date().toISOString(), results: [] };
async function addWallet(wallet, label) { for (let i = 0; i < 6; i++) { try { const a = await (await fetch(`${base}/api/wallets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "add", wallet, label }) })).json(); if (a.ok) return { ok: true }; return { ok: false, error: a.error }; } catch (e) { if (i === 5) return { ok: false, error: e.message }; await new Promise((x) => setTimeout(x, 10000)); } } }
for (const line of lines) {
  if (done.has(line)) continue;
  const [label, coin, side, usd, ago, asof] = line.split("|").map((x) => x.trim());
  const at = asof ? Math.floor(Date.parse(asof) / 1000) : null;
  const r = { line, label, coin, side, usd, ago };
  try {
    const s = await runFind({ coin, usd: Number(usd), ago, side: side || "any", at });
    r.state = s.state; r.note = s.note; r.credits = s.credits; r.scanned = s.scanned; r.inWindow = s.inWindow; r.chains = s.chains; r.candidates = (s.candidates || []).slice(0, 5);
    const good = r.candidates.filter((c) => c.off <= 2), wallets = new Set(good.map((c) => c.wallet));
    if (wallets.size === 1) { const w = good[0].wallet; const a = await addWallet(w, label); r.added = a.ok ? w : null; r.addErr = a.ok ? null : a.error; }
    else if (/not a Solana coin|no coin called/.test(s.note || "")) r.skip = true;
    else r.ambiguous = wallets.size;
  } catch (e) { r.error = e.message; }
  run.results.push(r); console.log(JSON.stringify(r));
  writeFileSync(OUT, JSON.stringify({ runs: [...prev.runs, run].slice(-30) }, null, 1)); // written after every line, so a kill mid-run loses nothing
}
console.log("done", run.results.length, "lines");
process.exit(0);
