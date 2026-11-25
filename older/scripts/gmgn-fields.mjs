// gmgn-fields.mjs — READ-ONLY field test of OUR GMGN key (owner's request, 24–25 Nov 2026). Not part of the bot; nothing imports it.
// What it does: asks GMGN for the 1-hour trending list, then token info + token security for the first three Solana coins, and
// prints only the fields about bundlers / insiders / snipers / top-10 / fees / all-time high / links, with the answer time of each
// call. 7 calls, one every 2.5 s. It changes nothing, writes nothing, and NEVER prints the key or any auth header.
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
const { gcall } = await import(D + "/src/gmgn.mjs");
const RE = /bundl|rat_|insider|snip|top_?10|fee|ath|twitter|link\.|holder_count|creator|dev_|phish|supply|launchpad|open_timestamp|creation/i;
const pick = (o, p = "", out = {}) => { if (o && typeof o === "object" && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) { const n = p ? p + "." + k : k; if (v && typeof v === "object" && !Array.isArray(v)) pick(v, n, out); else if (RE.test(n) && !/key|token$|secret|auth/i.test(k)) out[n] = Array.isArray(v) ? "[list of " + v.length + "]" : v; } return out; };
const call = async (name, path, params) => { for (let i = 1; i <= 3; i++) { await nap(2500); const t = Date.now(); try { const d = await gcall(path, params); console.log("OK  " + name + "  " + (i === 1 ? (Date.now() - t) + " ms" : "(time not shown after a wait)")); return d; } catch (e) { console.log("REFUSED  " + name + "  try " + i + "  " + String(e.message).slice(0, 80) + (i < 3 ? "  (waiting for GMGN to allow the next call)" : "")); } } return null; };
console.log("GMGN field test " + new Date().toISOString() + "  read-only, key never printed");
const rk = await call("trending list", "/v1/market/rank", { chain: "sol", interval: "1h", limit: "20" });
const rows = (rk?.rank || rk?.list || (Array.isArray(rk) ? rk : [])).slice(0, 3);
if (!rows.length) console.log("No trending list came back - nothing more to test.");
for (const c of rows) {
  const a = c.address || c.mint || c.token_address;
  console.log("\n=== " + (c.symbol || "?") + "  " + a + "\n    https://gmgn.ai/sol/token/" + a);
  console.log("list row: " + JSON.stringify(pick(c)));
  const i = await call("token info", "/v1/token/info", { chain: "sol", address: a }); if (i) console.log("info: " + JSON.stringify(pick(i)));
  const s = await call("token security", "/v1/token/security", { chain: "sol", address: a }); if (s) console.log("security: " + JSON.stringify(pick(s)));
}
console.log("\nDone " + new Date().toISOString());
