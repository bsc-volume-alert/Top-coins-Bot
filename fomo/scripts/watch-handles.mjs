// Adds every wallet in fomo/data/handles.txt to the watcher (deploy hook when the file changes). handle | sol | evm | id
import { readFileSync } from "node:fs";
const PORT = Number(process.env.FOMO_PORT || 8789), base = `http://127.0.0.1:${PORT}`;
const lines = readFileSync(new URL("../data/handles.txt", import.meta.url), "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
for (const line of lines) {
  const [handle, sol, evm, id] = line.split("|").map((x) => x.trim());
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(sol || "")) { console.log("skip", line); continue; }
  for (let i = 0; i < 6; i++) { try { const a = await (await fetch(`${base}/api/wallets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "add", wallet: sol, label: handle, handle }) })).json(); console.log(handle, sol, a.ok ? "watching" : a.error); break; } catch (e) { if (i === 5) console.log(handle, "failed:", e.message); await new Promise((x) => setTimeout(x, 10000)); } }
}
