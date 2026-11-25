// new-coin-probe.mjs — READ-ONLY look at what the data providers say about coins that are 3–15 minutes old (owner's request,
// 25 Nov 2026: books that buy a coin at 5 and at 10 minutes old on market cap, holders, volume, fees and top holders).
// Not part of the bot; nothing imports it. It changes nothing and writes nothing. No key or auth header is ever printed.
// Calls: about 20 Jupiter "recent" lists over 6.5 minutes, up to 2 Jupiter token searches, 1 Jupiter quote, up to 2 GMGN token-info readings.
//   node new-coin-probe.mjs
import { readFileSync as r, existsSync as x } from "node:fs";
import { execSync } from "node:child_process";
for (const f of ["/root/older/.env", "/root/tracker/.env"]) if (x(f)) for (const l of r(f, "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
let D = process.env.OLDER_CODE || "";
if (!D) try { const s = execSync("pm2 jlist", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); const p = JSON.parse(s.slice(s.indexOf("[{"))).find((q) => q.name === "older"); D = p?.pm2_env?.pm_cwd || ""; } catch { /* usual places below */ }
D = [D, "/root/older-review/older", "/root/older/older", "/root/older"].find((c) => c && x(c + "/src/gmgn.mjs")) || "";
if (!D) { console.log("Could not find the bot's folder. Nothing was run."); process.exit(1); }
const nap = (ms) => new Promise((res) => setTimeout(res, ms)), now = () => Date.now() / 1000, K = (v) => (v == null ? "?" : v >= 1000 ? "$" + (v / 1000).toFixed(1) + "K" : "$" + Math.round(v));
const JB = process.env.JUP_BASE || "https://api.jup.ag", JH = process.env.JUP_API_KEY ? { "x-api-key": process.env.JUP_API_KEY } : {};
const jget = async (path) => { await nap(2500); const t = Date.now(); const res = await fetch(JB + path, { headers: JH, signal: AbortSignal.timeout(15000) }); const j = await res.json().catch(() => null); return { status: res.status, ms: Date.now() - t, j }; };
console.log("New-coin probe " + new Date().toISOString() + "  read-only  (Jupiter key set: " + (process.env.JUP_API_KEY ? "yes" : "no") + ")");
// 1) the newest coins Jupiter knows — the list only reaches back about a minute (first probe, 25 Nov 16:14 UTC: 30 coins, all
//    under 0.8 min old), so the coins are COLLECTED here for 6.5 minutes, one look every 20 seconds, and then the ones that
//    have turned 5 minutes old are asked about again.
const age = (c) => (c.firstPool?.createdAt ? (now() - Date.parse(c.firstPool.createdAt) / 1000) / 60 : null);
const seen = new Map(), pads = {}; let polls = 0, fails = 0, gaps = 0, prevIds = null, firstKeys = null; const T0 = now(), RUN_S = Number(process.env.PROBE_S || 390);
console.log(`\n1) Collecting new coins for ${Math.round(RUN_S / 60 * 10) / 10} minutes (one look every 20 s). Please leave this running…`);
while (now() - T0 < RUN_S) { try { const a = await jget("/tokens/v2/recent"); const list = Array.isArray(a.j) ? a.j : []; polls++; if (!firstKeys && list[0]) firstKeys = Object.keys(list[0]);
    const ids = new Set(list.map((c) => c.id)); if (prevIds && ![...ids].some((i) => prevIds.has(i))) gaps++; prevIds = ids; // no coin in common with the look before = coins were created in between that this list never showed
    for (const c of list) if (!seen.has(c.id)) { seen.set(c.id, c); pads[c.launchpad || "none"] = (pads[c.launchpad || "none"] || 0) + 1; }
    if (polls % 3 === 0) console.log(`   ${Math.round(now() - T0)} s: ${seen.size} coins seen so far (${list.length} in this look, HTTP ${a.status}, ${a.ms} ms)`); } catch (e) { fails++; }
  await nap(17500); }
const mins = (now() - T0) / 60; console.log(`   ${polls} looks, ${fails} failed, ${seen.size} different coins in ${mins.toFixed(1)} min = ${(seen.size / mins).toFixed(0)} new coins a minute; looks with NO coin in common with the one before (coins missed in between): ${gaps}`);
console.log("   launchpads: " + JSON.stringify(pads)); if (firstKeys) console.log("   fields on a coin: " + firstKeys.join(", "));
// 2) the ones that are now 5 minutes old or more, asked for again in one or two batches (fresh figures)
const young = [...seen.values()].filter((c) => { const a = age(c); return a != null && a >= 5; }); let rows = [];
console.log(`\n2) ${young.length} of them are now 5 minutes old or more (${young.length ? Math.min(...young.map(age)).toFixed(1) + "–" + Math.max(...young.map(age)).toFixed(1) + " min" : "none"})`);
for (let i = 0; i < Math.min(young.length, 200); i += 100) { try { const b = await jget("/tokens/v2/search?query=" + young.slice(i, i + 100).map((c) => c.id).join(",")); if (Array.isArray(b.j)) rows.push(...b.j); console.log(`   token search: HTTP ${b.status}, ${b.ms} ms, ${Array.isArray(b.j) ? b.j.length : 0} of ${Math.min(100, young.length - i)} answered`); } catch (e) { console.log("   token search FAILED: " + String(e.message).slice(0, 100)); } }
const vol5 = (c) => { const s = c.stats5m || {}; return (Number(s.buyVolume) || 0) + (Number(s.sellVolume) || 0); };
const m10 = rows.filter((c) => c.mcap > 10000), h150 = m10.filter((c) => c.holderCount > 150), v30 = h150.filter((c) => vol5(c) >= 30000);
const hk = rows.filter((c) => c.holderCount != null).length, vk = rows.filter((c) => c.stats5m && (c.stats5m.buyVolume != null || c.stats5m.sellVolume != null)).length, tk = rows.filter((c) => c.audit?.topHoldersPercentage != null).length;
console.log(`   of ${rows.length} answered: holder count given for ${hk}, 5-minute volume for ${vk}, top-holders % for ${tk}`);
console.log(`   market cap over $10K: ${m10.length} · and holders over 150: ${h150.length} · and 5-minute volume $30K+: ${v30.length}   (owner's 5-minute rule, before fees and top holders)`);
const mc = rows.map((c) => c.mcap || 0).sort((a, b) => b - a); console.log(`   market caps: highest ${K(mc[0])}, 10th ${K(mc[9])}, median ${K(mc[Math.floor(mc.length / 2)])}; holders: most ${Math.max(0, ...rows.map((c) => c.holderCount || 0))}`);
if (rows[0]) { console.log("   fields on a searched coin: " + Object.keys(rows[0]).join(", ")); if (rows[0].stats5m) console.log("   fields in stats5m: " + Object.keys(rows[0].stats5m).join(", ")); if (rows[0].audit) console.log("   fields in audit: " + Object.keys(rows[0].audit).join(", ")); }
const top = [...rows].sort((a, b) => (b.mcap || 0) - (a.mcap || 0)).slice(0, 12);
for (const c of top) console.log(`   ${String(c.symbol || "?").slice(0, 10).padEnd(10)} ${c.id.slice(0, 6)}… age ${age(c)?.toFixed(1)} min · ${c.launchpad || "?"} · mcap ${K(c.mcap)} · holders ${c.holderCount ?? "?"} · 5-min volume ${K(vol5(c))} · traders ${c.stats5m?.numTraders ?? "?"} · top holders ${c.audit?.topHoldersPercentage != null ? Number(c.audit.topHoldersPercentage).toFixed(1) + "%" : "?"} · curve ${c.bondingCurve != null ? Number(c.bondingCurve).toFixed(0) + "%" : "?"} · fees ${c.fees != null ? Number(c.fees).toFixed(2) : "?"}`);
// 3) can the best one be bought through a quote (0.2 SOL)?
if (top[0]) { try { const q = await jget(`/swap/v2/order?inputMint=So11111111111111111111111111111111111111112&outputMint=${top[0].id}&amount=200000000`); const j = q.j || {}; console.log(`\n3) Quote for 0.2 SOL of ${top[0].symbol || top[0].id.slice(0, 6)}: HTTP ${q.status}, ${q.ms} ms, ` + (Number(j.outAmount) > 0 ? "route " + JSON.stringify((j.routePlan || []).map((p) => p?.swapInfo?.label ?? "?")) + ", price impact " + (j.priceImpactPct ?? j.priceImpact ?? "?") : "NO ROUTE: " + String(j.errorMessage || j.error || "").slice(0, 100))); } catch (e) { console.log("3) quote FAILED: " + String(e.message).slice(0, 100)); } }
// 4) what GMGN says about the best two (fees, top 10, holders, creation time)
try { const { gcall, gm } = await import(D + "/src/gmgn.mjs"); console.log("\n4) GMGN token info (the bot's own key; each reading costs 2 of its 5 units)");
  for (const c of top.slice(0, 2)) { await nap(16000); const t = Date.now(); try { const i = await gcall("/v1/token/info", { chain: "sol", address: c.id }); const s = i?.stat || {};
      console.log(`   ${String(c.symbol || "?").slice(0, 10)} ${c.id.slice(0, 6)}… OK ${Date.now() - t} ms · fees ${i?.total_fee != null ? Number(i.total_fee).toFixed(2) + " SOL" : "?"} · top 10 ${s.top_10_holder_rate != null ? (Number(s.top_10_holder_rate) * 100).toFixed(1) + "%" : "?"} · holders ${i?.holder_count ?? "?"} · created ${i?.creation_timestamp ? ((now() - i.creation_timestamp) / 60).toFixed(1) + " min ago" : "?"} · launchpad ${i?.launchpad ?? "?"} · bundlers ${s.top_bundler_trader_percentage ?? "?"} · insiders ${s.top_rat_trader_percentage ?? "?"} · snipers ${s.top70_sniper_hold_rate ?? "?"}  ${JSON.stringify(gm.headers)}`);
    } catch (e) { console.log(`   ${c.id.slice(0, 6)}… REFUSED/FAILED: ${String(e.message).slice(0, 80)}  ${JSON.stringify(gm.headers)}`); } }
} catch (e) { console.log("4) GMGN step FAILED: " + String(e.message).slice(0, 100)); }
console.log("\nDone " + new Date().toISOString());
