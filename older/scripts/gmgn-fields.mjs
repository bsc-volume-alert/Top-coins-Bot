// gmgn-fields.mjs — READ-ONLY: every field GMGN returns for ONE coin (token info and token security), so the right names can be
// wired into the bot (phishing %, token audit…). Not part of the bot. Changes nothing, writes nothing. No key, header or
// request URL is printed — only the answer's own fields. Cost: 3 units of the bot's GMGN allowance.
//   node gmgn-fields.mjs <coin address>
import { readFileSync as r, existsSync as x } from "node:fs";
import { execSync } from "node:child_process";
const M = (process.argv[2] || "").trim(); if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(M)) { console.log("Give the coin's address: node gmgn-fields.mjs <address>"); process.exit(1); }
for (const f of ["/root/older/.env", "/root/tracker/.env"]) if (x(f)) for (const l of r(f, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
let D = ""; try { const s = execSync("pm2 jlist", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); const p = JSON.parse(s.slice(s.indexOf("[{"))).find((q) => q.name === "older"); D = p?.pm2_env?.pm_cwd || ""; } catch {}
D = [D, "/root/older-review/older", "/root/older/older"].find((c) => c && x(c + "/src/gmgn.mjs")) || ""; if (!D) { console.log("Could not find the bot's folder. Nothing was run."); process.exit(1); }
const { gcall } = await import(D + "/src/gmgn.mjs"); const nap = (ms) => new Promise((res) => setTimeout(res, ms));
const flat = (o, p = "", out = []) => { if (o && typeof o === "object" && !Array.isArray(o)) { for (const [k, v] of Object.entries(o)) flat(v, p ? p + "." + k : k, out); } else out.push([p, Array.isArray(o) ? `[list of ${o.length}]` : typeof o === "string" ? (o.length > 46 ? o.slice(0, 44) + "…" : o) : o]); return out; };
const show = (title, o) => { console.log("\n=== " + title + " ==="); const rows = flat(o); if (!rows.length) return console.log("(empty)"); let line = ""; for (const [k, v] of rows) { const c = k + "=" + JSON.stringify(v); if ((line + "  " + c).length > 150) { console.log(line); line = c; } else line = line ? line + "  " + c : c; } if (line) console.log(line); };
console.log("GMGN fields " + new Date().toISOString() + "  read-only\n" + M);
try { show("token info", await gcall("/v1/token/info", { chain: "sol", address: M })); } catch (e) { console.log("\ntoken info FAILED: " + String(e.message).slice(0, 100)); }
await nap(16000); // let the allowance refill before the second question
try { show("token security", await gcall("/v1/token/security", { chain: "sol", address: M })); } catch (e) { console.log("\ntoken security FAILED: " + String(e.message).slice(0, 100)); }
console.log("\nDone " + new Date().toISOString());
