// coin-check.mjs — READ-ONLY: what the providers say about ONE coin right now, and whether the bot's new-coin books saw it.
// Not part of the bot; nothing imports it. It changes nothing and writes nothing. No key or auth header is ever printed.
// Calls: 1 Jupiter token search, 1 GMGN token-info reading (2 units of the bot's allowance).
//   node coin-check.mjs <coin address>
import { readFileSync as r, existsSync as x } from "node:fs";
import { execSync } from "node:child_process";
const M = (process.argv[2] || "").trim(); if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(M)) { console.log("Give the coin's address: node coin-check.mjs <address>"); process.exit(1); }
for (const f of ["/root/older/.env", "/root/tracker/.env"]) if (x(f)) for (const l of r(f, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
let D = ""; try { const s = execSync("pm2 jlist", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); const p = JSON.parse(s.slice(s.indexOf("[{"))).find((q) => q.name === "older"); D = p?.pm2_env?.pm_cwd || ""; } catch {}
D = [D, "/root/older-review/older", "/root/older/older"].find((c) => c && x(c + "/src/gmgn.mjs")) || "";
const OUT = process.env.OLDER_OUT || "/mnt/volume_1794164707392/older", RUN = process.argv[3] || "valid11";
const now = () => Date.now() / 1000, K = (v) => (v == null ? "?" : v >= 1000 ? "$" + (v / 1000).toFixed(1) + "K" : "$" + Math.round(v)), HM = (t) => new Date(t * 1000).toISOString().slice(11, 19) + " UK";
const mins = (s) => (s < 7200 ? (s / 60).toFixed(1) + " minutes" : (s / 3600).toFixed(1) + " hours");
console.log("Coin check " + new Date().toISOString() + "  read-only\n" + M);
// 1) Jupiter
let born = null;
try { const res = await fetch((process.env.JUP_BASE || "https://api.jup.ag") + "/tokens/v2/search?query=" + M, { headers: process.env.JUP_API_KEY ? { "x-api-key": process.env.JUP_API_KEY } : {}, signal: AbortSignal.timeout(15000) }); const j = await res.json().catch(() => null), c = (Array.isArray(j) ? j : []).find((y) => y.id === M);
  if (!c) console.log("\n1) Jupiter: HTTP " + res.status + " — it does not know this coin (no record returned)");
  else { born = c.firstPool?.createdAt ? Date.parse(c.firstPool.createdAt) / 1000 : null; const v = (s) => (s ? (Number(s.buyVolume) || 0) + (Number(s.sellVolume) || 0) : null);
    console.log(`\n1) Jupiter: ${c.symbol || "?"} · launchpad ${c.launchpad || "none"} · first pool created ${born ? HM(born) + " (" + mins(now() - born) + " ago)" : "?"}`);
    console.log(`   now: market cap ${K(c.mcap)} · holders ${c.holderCount ?? "?"} · traded last 5 min ${K(v(c.stats5m))}, last hour ${K(v(c.stats1h))} · top holders ${c.audit?.topHoldersPercentage != null ? Number(c.audit.topHoldersPercentage).toFixed(1) + "%" : "?"} · launch curve ${c.bondingCurve != null ? Number(c.bondingCurve).toFixed(0) + "%" : "?"} · token program ${String(c.tokenProgram || "?").slice(0, 8)}`); } } catch (e) { console.log("\n1) Jupiter FAILED: " + String(e.message).slice(0, 100)); }
// 2) GMGN
if (D) try { const { gcall } = await import(D + "/src/gmgn.mjs"); const i = await gcall("/v1/token/info", { chain: "sol", address: M }), s = i?.stat || {}; const ct = Number(i?.creation_timestamp) || null;
  console.log(`\n2) GMGN: created ${ct ? HM(ct) + " (" + mins(now() - ct) + " ago)" : "?"} · fees ${i?.total_fee != null ? Number(i.total_fee).toFixed(2) + " SOL" : "?"} · top 10 ${s.top_10_holder_rate != null ? (Number(s.top_10_holder_rate) * 100).toFixed(1) + "%" : "?"} · holders ${i?.holder_count ?? "?"} · launchpad ${i?.launchpad ?? "?"} · bundlers ${s.top_bundler_trader_percentage ?? "?"} · insiders ${s.top_rat_trader_percentage ?? "?"}`); if (ct && (!born || ct < born)) born = born ?? ct;
} catch (e) { console.log("\n2) GMGN FAILED: " + String(e.message).slice(0, 100)); } else console.log("\n2) GMGN: the bot's folder was not found, not asked");
// 3) what the bot has on it
console.log("\n3) The bot's new-coin records (run " + RUN + ")");
const cf = `${OUT}/newcoins-${RUN}.json`, lf = `${OUT}/newcoins-${RUN}.log.jsonl`; let since = null, logFrom = null;
try { const j = JSON.parse(r(cf, "utf8")); since = j.stats?.since ?? null; const y = (j.young || []).find((c) => c.mint === M);
  console.log(y ? `   on the waiting list now: seen, created ${HM(y.created)}, measured so far: ${Object.keys(y.done || {}).join(", ") || "nothing yet"}` : "   not on the waiting list (coins leave it about 11.5 minutes after creation)");
  console.log("   the bot has been collecting new coins since " + (since ? HM(since) + " on " + new Date(since * 1000).toISOString().slice(0, 10) : "?")); } catch (e) { console.log("   counters file not readable: " + String(e.message).slice(0, 80)); }
try { const L = r(lf, "utf8").split("\n").filter(Boolean); logFrom = L.length ? JSON.parse(L[0]).t : null; const hit = L.filter((l) => l.includes(M)).map((l) => JSON.parse(l));
  console.log(`   measurement log: ${L.length} lines since ${logFrom ? HM(logFrom) : "?"} (only coins over $10K at an age point are logged)`);
  for (const h of hit) console.log(`   ${HM(h.t)} ${h.book}: ${Math.round(h.age_s / 60 * 10) / 10} min old · cap ${K(h.mc)} · holders ${h.holders ?? "?"} · traded ${K(h.vol)} · top holders ${h.top_jup != null ? (h.top_jup * 100).toFixed(1) + "%" : "?"}${h.fees != null ? " · fees " + Number(h.fees).toFixed(2) + " SOL · top 10 " + (h.top10 * 100).toFixed(1) + "%" : ""} → ${h.out}`);
  if (!hit.length) console.log("   this coin is NOT in the log"); } catch (e) { console.log("   no measurement log yet (" + String(e.message).slice(0, 60) + ")"); }
if (born) { const a5 = born + 300, a10 = born + 600; console.log(`\n   its age points: 5 minutes at ${HM(a5)}, 10 minutes at ${HM(a10)}` + (since && born < since - 60 ? "  — it was created BEFORE the bot started collecting new coins" : "") + (logFrom && a10 < logFrom ? "  — both were before the log started, so what was measured then was not kept" : "") + (now() < a5 ? "  — it is not 5 minutes old yet" : "")); }
console.log("\nDone " + new Date().toISOString());
