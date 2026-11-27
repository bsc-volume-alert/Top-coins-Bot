// next.mjs — run by watch.sh every 30 s. Takes the first line of wallets/requests.txt that has no result yet, collects it,
// and pushes the result to the GitHub branch "wallets-data". One coin at a time. Exits when done (or when nothing is pending).
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, scrub, stats } from "./rpc.mjs";
import { collect, parseRequest } from "./collect.mjs";

const HERE = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = process.env.WALLETS_DATA || "/root/wallets-data";
const git = (...a) => execFileSync("git", ["-C", DATA, ...a], { stdio: ["ignore", "pipe", "pipe"], timeout: 180000 }).toString();
function push(msg) {
  try {
    let hit = ""; try { hit = execFileSync("grep", ["-rIlE", "--exclude-dir=.git", "api-key=[A-Za-z0-9]{6}|helius-rpc", DATA]).toString().trim(); } catch {} // grep exits 1 when clean
    if (hit) { console.log("possible key in data files - NOT pushing:", hit); return false; }
    git("add", "-A"); try { git("commit", "-q", "-m", msg); } catch { return true; }
    try { git("pull", "-q", "--rebase", "origin", "wallets-data"); } catch {}
    git("push", "-q", "origin", "HEAD:wallets-data"); return true;
  } catch (e) { console.log("push failed:", scrub(e.stderr?.toString() || e.message).slice(0, 300)); return false; }
}

const lines = readFileSync(join(HERE, "requests.txt"), "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
const reqs = lines.map(parseRequest).filter((r) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.mint));
const pending = reqs.find((r) => !existsSync(join(DATA, "coins", r.id, "meta.json")));
if (!pending) process.exit(0);

const dir = join(DATA, "coins", pending.id); mkdirSync(dir, { recursive: true });
if (!loadEnv()) { writeFileSync(join(DATA, "status.json"), JSON.stringify({ id: pending.id, stage: "error", error: "no RPC key found in the server settings file (HELIUS_API_KEY or RPC_HTTP)" }, null, 1)); push("wallets: no key"); process.exit(1); }
console.log("collecting", pending.id, pending.label || "");
// status.json is rewritten on every step; it is pushed at the start and then every 90 s by a heartbeat, so a slow or stuck
// step is visible from outside (the heartbeat also shows the last RPC error and how long since the last progress).
let cur = null, lastPush = 0;
const pushStatus = (why) => { if (!cur) return; writeFileSync(join(DATA, "status.json"), JSON.stringify({ ...cur, heartbeat: new Date().toISOString(), rpc_last_err: stats.last_err, rpc_last_err_at: stats.last_err_at, rpc_calls: stats.calls, rpc_retries: stats.retries }, null, 1)); lastPush = Date.now(); push("wallets status " + cur.id.slice(0, 8) + " " + cur.stage + (why ? " " + why : "")); };
const onStatus = (st) => { const first = !cur; cur = st; writeFileSync(join(DATA, "status.json"), JSON.stringify(st, null, 1)); if (first) pushStatus(); };
const beat = setInterval(() => pushStatus("(heartbeat)"), 90000);
try {
  const meta = await collect(pending, dir, { onStatus });
  clearInterval(beat); push(`wallets ${pending.label || pending.id.slice(0, 8)}: ${meta.counts.trades} trades, ${meta.counts.early_buyers} early buyers`);
  clearInterval(beat); console.log("done", pending.id, meta.counts);
} catch (e) {
  clearInterval(beat); const err = scrub(e.stack || e.message).slice(0, 1500); console.log("failed", pending.id, err);
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ id: pending.id, mint: pending.mint, error: err, finished: new Date().toISOString() }, null, 1)); // an error result, so it is not retried forever; re-ask with run=2
  writeFileSync(join(DATA, "status.json"), JSON.stringify({ id: pending.id, stage: "error", error: err }, null, 1));
  push("wallets error " + pending.id.slice(0, 8));
}
