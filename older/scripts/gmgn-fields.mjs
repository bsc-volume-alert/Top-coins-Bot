// gmgn-fields.mjs — READ-ONLY field test of OUR GMGN key (owner's request, 24–25 Nov 2026). Not part of the bot; nothing imports it.
// What it does: takes the three coins the bot bought most recently (from the dashboard's own data file; if that is missing, GMGN's
// 1-hour trending list), asks GMGN for token info + token security for each, and prints only the fields about bundlers / insiders /
// snipers / top-10 / fees / all-time high / links, with the answer time of each call and GMGN's rate-limit headers.
// 6 calls of weight 1. A refused call is retried up to 5 times with growing waits (the bot's own history repair uses the same key).
// It changes nothing, writes nothing, and NEVER prints the key or any auth header.
//   node gmgn-fields.mjs            (run from anywhere on the server; it finds the bot's folder through pm2)
import { readFileSync as r, existsSync as x } from "node:fs";
import { execSync } from "node:child_process";
for (const f of ["/root/older/.env", "/root/tracker/.env"]) if (x(f)) for (const l of r(f, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
let D = process.env.OLDER_CODE || "";
if (!D) try { const s = execSync("pm2 jlist", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); const p = JSON.parse(s.slice(s.indexOf("[{"))).find((q) => q.name === "older"); D = p?.pm2_env?.pm_cwd || ""; } catch { /* fall back to the usual places */ }
D = [D, "/root/older/older", "/root/older"].find((c) => c && x(c + "/src/gmgn.mjs")) || "";
if (!D) { console.log("Could not find the bot's folder (src/gmgn.mjs). Nothing was run."); process.exit(1); }
console.log("bot code folder: " + D);
process.env.GMGN_WPS = "50"; // this script spaces its own calls (2.5 s apart), so the answer times shown are GMGN's own
const nap = (ms) => new Promise((res) => setTimeout(res, ms));
const { gcall, gm } = await import(D + "/src/gmgn.mjs");
const OUT = process.env.OLDER_OUT || "/mnt/volume_1794164707392/older";
const RE = /bundl|rat_|insider|snip|top_?10|fee|ath|twitter|link\.|holder_count|creator|dev_|phish|supply|launchpad|open_timestamp|creation/i;
const pick = (o, p = "", out = {}) => { if (o && typeof o === "object" && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) { const n = p ? p + "." + k : k; if (v && typeof v === "object" && !Array.isArray(v)) pick(v, n, out); else if (RE.test(n) && !/key|token$|secret|auth/i.test(k)) out[n] = Array.isArray(v) ? "[list of " + v.length + "]" : v; } return out; };
const WAIT = [2500, 5000, 10000, 20000, 40000], hdr = () => JSON.stringify(gm.headers);
const call = async (name, path, params) => { for (let i = 1; i <= WAIT.length; i++) { await nap(WAIT[i - 1]); const t = Date.now(); try { const d = await gcall(path, params); console.log("OK  " + name + "  " + (i === 1 ? (Date.now() - t) + " ms" : "(time not shown after a wait)") + "  " + hdr()); return d; } catch (e) { console.log("REFUSED  " + name + "  try " + i + " of " + WAIT.length + "  " + String(e.message).slice(0, 80) + "  " + hdr()); } } return null; };
console.log("GMGN field test " + new Date().toISOString() + "  read-only, key never printed");
let rows = [];
try { const E = JSON.parse(r(OUT + "/pub/entries.json", "utf8")).entries || []; const seen = new Set(); for (let k = E.length - 1; k >= 0 && rows.length < 3; k--) { const e = E[k]; if (e?.mint && !seen.has(e.mint)) { seen.add(e.mint); rows.push({ address: e.mint, symbol: e.sym || "bought " + new Date(e.t * 1000).toISOString().slice(11, 16) + " UTC, $" + Math.round((e.mc || 0) / 1000) + "K" }); } } if (rows.length) console.log("coins: the bot's three most recent buys"); } catch { /* fall back to the trending list */ }
if (!rows.length) { const rk = await call("trending list", "/v1/market/rank", { chain: "sol", interval: "1h", limit: "20" }); rows = (rk?.rank || rk?.list || (Array.isArray(rk) ? rk : [])).slice(0, 3); }
if (!rows.length) console.log("No coins to test - nothing more was asked.");
for (const c of rows) {
  const a = c.address || c.mint || c.token_address;
  console.log("\n=== " + (c.symbol || "?") + "  " + a + "\n    https://gmgn.ai/sol/token/" + a);
  const i = await call("token info", "/v1/token/info", { chain: "sol", address: a }); if (i) console.log("info: " + JSON.stringify(pick(i)));
  const s = await call("token security", "/v1/token/security", { chain: "sol", address: a }); if (s) console.log("security: " + JSON.stringify(pick(s)));
}
console.log("\nDone " + new Date().toISOString());
