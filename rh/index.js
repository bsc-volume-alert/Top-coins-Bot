// Robinhood Chain tracker (pm2 app "tracker-rh") — STAGE 0: probe.
// Proves the Telegram bot, the nodes and the feed, and measures the chain before any strategy is built:
//  • follows the Pons contracts, the Pons curves/tokens they create, and the Uniswap v4 PoolManager
//  • names every event it sees (Blockscout ABI, then the public signature database)
//  • counts events per minute, v4 swaps, new pools and how many of them are Pons graduations
//  • every 10 min samples the whole chain to list the busiest contracts (that is how we find LONG)
//  • works out what the same feed would cost on Alchemy's free tier
// No trading, no strategies yet — those land on top once the event layouts are confirmed.
import { C } from "./config.js";
import { rpc, NODES, hex, testNodes, testWs, alchemy, usingBackup } from "./rpc.js";
import { tg, TOKEN, CHAT, saveChat, esc, fmt } from "./telegram.js";

const v = C.VERSION;
const KNOWN = { ...C.PONS, [C.V4_POOL_MANAGER]: "Uniswap v4 PoolManager", [C.WETH]: "WETH", [C.USDG]: "USDG" };
const T = C.TOPIC;
console.log(`rh-tracker ${v} starting`);
if (TOKEN) { try { await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`, { signal: AbortSignal.timeout(8000) }); } catch {} }

// ---------- event names ----------
const sigName = new Map([[T.V4_SWAP, "Swap(v4)"], [T.V4_INIT, "Initialize(v4)"], [T.V4_LIQ, "ModifyLiquidity(v4)"], [T.TRANSFER, "Transfer"], [T.V3_SWAP, "Swap(v3)"]]);
const sigFull = new Map(); // topic0 → full signature text, from the ABI, for building the decoders next
const pendingSig = new Set();
async function loadAbi(addr) { // verified contracts on Blockscout publish their ABI
  try {
    const j = await (await fetch(`${C.EXPLORER}/api/v2/smart-contracts/${addr}`, { signal: AbortSignal.timeout(10000) })).json();
    const { keccak256 } = await import("./keccak.js");
    let n = 0;
    for (const e of j.abi || []) if (e.type === "event") {
      const full = `${e.name}(${e.inputs.map((i) => i.type).join(",")})`, t0 = keccak256(full);
      sigName.set(t0, e.name); sigFull.set(t0, `${e.name}(${e.inputs.map((i) => `${i.type}${i.indexed ? " indexed" : ""} ${i.name}`).join(", ")})`); n++;
    }
    return n;
  } catch { return 0; }
}
async function lookupSigs() { // unknown topic0s → public signature database
  const ask = [...pendingSig].filter((t) => !sigName.has(t)).slice(0, 20); if (!ask.length) return;
  try {
    const j = await (await fetch(`https://api.openchain.xyz/signature-database/v1/lookup?event=${ask.join(",")}&filter=true`, { signal: AbortSignal.timeout(10000) })).json();
    for (const t of ask) { const hit = j?.result?.event?.[t]?.[0]?.name; sigName.set(t, hit ? hit.replace(/\(.*$/, "") : t.slice(0, 10) + "…"); if (hit) sigFull.set(t, hit); pendingSig.delete(t); }
  } catch {}
}
const name = (t) => { if (!sigName.has(t)) pendingSig.add(t); return sigName.get(t) || t.slice(0, 10) + "…"; };

// ---------- stats ----------
const st = { started: Date.now(), polls: 0, pollErr: 0, logs: 0, lagBlocks: 0, last: 0,
  byGroup: { pons: {}, curves: {}, v4: {} }, swaps: 0, inits: 0, ponsInits: 0, ethInits: 0, curves: 0,
  minute: [], swapPools: new Map() };
const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
const curves = new Map(); // address → first seen (newest CURVES_MAX followed)
setInterval(() => { const cut = Date.now() - 600_000; for (const [p, ts] of st.swapPools) if (ts < cut) st.swapPools.delete(p); }, 60_000);

const word = (data, i) => data.slice(2 + i * 64, 2 + (i + 1) * 64);
const asAddr = (w) => (/^0{24}[0-9a-f]{40}$/.test(w) && !/^0{8}/.test(w.slice(24)) ? "0x" + w.slice(24) : null); // small numbers are not addresses
function handle(l) {
  const a = l.address.toLowerCase(), t0 = l.topics[0];
  st.logs++;
  if (a === C.V4_POOL_MANAGER) {
    bump(st.byGroup.v4, name(t0));
    if (t0 === T.V4_SWAP) { st.swaps++; st.swapPools.set(l.topics[1], Date.now()); }
    if (t0 === T.V4_INIT) { // topics: id, currency0, currency1 · data: fee, tickSpacing, hooks, sqrtPriceX96, tick
      st.inits++; const hooks = asAddr(word(l.data, 2)); if (hooks === C.PONS_HOOK) st.ponsInits++;
      if (/^0x0{64}$/.test(l.topics[2])) st.ethInits++; // currency0 = native ETH
    }
    return;
  }
  if (C.PONS[a]) {
    bump(st.byGroup.pons, `${C.PONS[a].replace("Pons ", "")}: ${name(t0)}`);
    if (a === C.PONS_FACTORY) { // any address mentioned in a factory event is a candidate curve/token to follow
      for (const w of [...l.topics.slice(1), ...Array.from({ length: (l.data.length - 2) / 64 }, (_, i) => word(l.data, i))]) {
        const x = asAddr(w.replace(/^0x/, "")); if (x && !KNOWN[x] && !curves.has(x)) { curves.set(x, Date.now()); st.curves++; }
      }
      while (curves.size > C.CURVES_MAX) curves.delete(curves.keys().next().value);
    }
    return;
  }
  if (curves.has(a)) bump(st.byGroup.curves, name(t0));
}

// ---------- feed: address-filtered getLogs, gap-free ----------
let from = 0;
async function poll() {
  try {
    const head = parseInt(await rpc("eth_blockNumber", []), 16);
    if (!from) from = head - 20;
    st.lagBlocks = head - from;
    while (from <= head) {
      const to = Math.min(from + C.MAX_RANGE - 1, head);
      const fixed = [...Object.keys(C.PONS), C.V4_POOL_MANAGER];
      const logs = await rpc("eth_getLogs", [{ address: fixed, fromBlock: hex(from), toBlock: hex(to) }]);
      let curveLogs = [];
      if (curves.size) curveLogs = await rpc("eth_getLogs", [{ address: [...curves.keys()], fromBlock: hex(from), toBlock: hex(to) }]);
      const all = [...logs, ...curveLogs];
      for (const l of all) handle(l);
      st.minute.push({ ts: Date.now(), n: all.length });
      from = to + 1; st.last = Date.now();
    }
    st.polls++;
  } catch (e) { st.pollErr++; if (st.pollErr % 20 === 1) console.error("[poll]", e.message); }
  setTimeout(poll, C.POLL_MS);
}
setInterval(() => { const cut = Date.now() - 600_000; while (st.minute.length && st.minute[0].ts < cut) st.minute.shift(); }, 30_000);

// ---------- whole-chain sample: busiest contracts ----------
const busy = { at: 0, blocks: 0, secs: 0, logs: 0, top: [], err: "" };
const labels = new Map();
async function label(a) {
  if (KNOWN[a]) return KNOWN[a];
  if (labels.has(a)) return labels.get(a);
  let s = "?";
  try { const j = await (await fetch(`${C.EXPLORER}/api/v2/addresses/${a}`, { signal: AbortSignal.timeout(8000) })).json(); s = j.name || j.token?.name || (j.is_contract ? "contract (unverified)" : "?"); } catch {}
  labels.set(a, s); return s;
}
async function sample() {
  try {
    const head = parseInt(await rpc("eth_blockNumber", [], { backupOk: false }), 16);
    const logs = await rpc("eth_getLogs", [{ fromBlock: hex(head - C.SAMPLE_BLOCKS), toBlock: hex(head) }], { backupOk: false });
    const [b0, b1] = await Promise.all([head - C.SAMPLE_BLOCKS, head].map((b) => rpc("eth_getBlockByNumber", [hex(b), false], { backupOk: false })));
    busy.secs = parseInt(b1.timestamp, 16) - parseInt(b0.timestamp, 16); busy.blocks = C.SAMPLE_BLOCKS; busy.logs = logs.length; busy.at = Date.now(); busy.err = "";
    const by = new Map();
    for (const l of logs) { if (l.topics[0] === T.TRANSFER) continue; const a = l.address.toLowerCase(); const o = by.get(a) || { n: 0, ev: {} }; o.n++; bump(o.ev, l.topics[0]); by.set(a, o); }
    busy.top = [...by.entries()].sort((x, y) => y[1].n - x[1].n).slice(0, 8);
    for (const [a, o] of busy.top) { o.label = await label(a); o.main = name(Object.entries(o.ev).sort((x, y) => y[1] - x[1])[0][0]); }
  } catch (e) { busy.err = e.message.slice(0, 80); }
}

// ---------- reports ----------
const ago = (ms) => { const s = Math.floor(ms / 1000); return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${(s / 3600).toFixed(1)}h`; };
const perMin = () => { const span = Math.max(1, Math.min(10, (Date.now() - st.started) / 60000)); return st.minute.reduce((a, x) => a + x.n, 0) / span; };
const top = (o, k = 6) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k).map(([e, c]) => `${esc(e)} ${c}`).join(" · ") || "none yet";
function costLine() {
  // if Alchemy carried the whole feed: 2 getLogs + 1 blockNumber per poll
  const pollsDay = 86400_000 / C.POLL_MS, cuDay = pollsDay * (60 * (curves.size ? 2 : 1) + 10);
  return `If Alchemy carried this feed: ≈${fmt(cuDay)} CU/day ≈ ${fmt(cuDay * 30)}/month (free tier 30M) → ${cuDay * 30 < 30e6 ? "fits ✅" : "too much on its own ❌ — public node stays primary"}`;
}
function status() {
  const nodes = NODES.map((n) => `${n.name}${n.backup ? " (backup)" : ""}: ok ${n.ok} · refused ${n.r429} · errors ${n.err}${n.ms ? ` · ${n.ms}ms` : ""}${n.lastErr ? ` · last: ${esc(n.lastErr)}` : ""}`).join("\n");
  const b = busy.at ? `<b>Busiest contracts</b> (whole chain, ${busy.blocks} blocks ≈ ${busy.secs}s, ${busy.logs} events, transfers excluded, ${ago(Date.now() - busy.at)} ago):\n` +
    busy.top.map(([a, o]) => `• ${esc(o.label)} — ${o.n} · mostly ${esc(o.main)}\n  <code>${a}</code>`).join("\n") : busy.err ? `Whole-chain sample failed: ${esc(busy.err)}` : "Whole-chain sample: first one in ~2 min";
  return `🟢 <b>Robinhood ${v}</b> · stage 0 probe · up ${ago(process.uptime() * 1000)}\n` +
    `Feed: ${st.polls} polls · ${st.logs} events · ${perMin().toFixed(0)}/min · lag ${st.lagBlocks} blocks · last ${st.last ? ago(Date.now() - st.last) + " ago" : "never"}${st.pollErr ? ` · failed polls ${st.pollErr}` : ""}${usingBackup() ? " · ⚠️ on Alchemy backup" : ""}\n` +
    `<b>Uniswap v4</b>: swaps ${st.swaps} · active pools (10m) ${st.swapPools.size} · new pools ${st.inits} (Pons ${st.ponsInits}, ETH-paired ${st.ethInits})\n` +
    `<b>Pons</b>: ${top(st.byGroup.pons, 8)}\n` +
    `<b>Pons curves/tokens</b> (${curves.size} followed): ${top(st.byGroup.curves)}\n` +
    `${b}\n<b>Nodes</b>\n${nodes}\nAlchemy used today ≈${fmt(alchemy.cu)} CU${alchemy.capHit ? ` · daily cap hit ${alchemy.capHit}×` : ""}\n${costLine()}`;
}
function sigsText() {
  const seen = new Set([...Object.keys(st.byGroup.pons), ...Object.keys(st.byGroup.curves)].map((k) => k.replace(/^.*: /, "")));
  const rows = [...sigFull.entries()].filter(([t]) => seen.has(sigName.get(t))).map(([t, f]) => `• ${esc(f)}\n  <code>${t}</code>`);
  return `🧾 <b>Event layouts seen on Pons</b>\n${rows.join("\n") || "none decoded yet — wait a few minutes"}`;
}

// ---------- Telegram commands ----------
const HELP = "Commands: /status · /nodes (re-test nodes + WebSocket) · /events (Pons event layouts) · /sample (busiest contracts now)";
let offset = 0;
async function commands() {
  for (;;) {
    try {
      const j = await (await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=25&offset=${offset}&allowed_updates=["message"]`, { signal: AbortSignal.timeout(35000) })).json();
      for (const u of j.result || []) {
        offset = u.update_id + 1; const m = u.message; if (!m?.text) continue;
        if (m.migrate_to_chat_id && String(m.chat?.id) === CHAT()) { saveChat(m.migrate_to_chat_id); continue; }
        if (!CHAT() && /^\/start/.test(m.text) && /group/.test(m.chat?.type || "")) { saveChat(m.chat.id); await tg("🟢 <b>Robinhood tracker linked to this group</b>\n" + HELP); continue; }
        if (String(m.chat?.id) !== CHAT()) continue;
        const cmd = m.text.trim().split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");
        if (cmd === "/status") await tg(status());
        else if (cmd === "/nodes") await tg(await nodesText());
        else if (cmd === "/events") { await lookupSigs(); await tg(sigsText()); }
        else if (cmd === "/sample") { await sample(); await tg(status().split("\n").filter((x, i, a) => i >= a.findIndex((y) => /Busiest|sample/.test(y)) && i < a.findIndex((y) => y.startsWith("<b>Nodes"))).join("\n")); }
        else if (cmd === "/help" || cmd === "/start") await tg(HELP);
      }
    } catch { await new Promise((r) => setTimeout(r, 5000)); }
  }
}
async function nodesText() {
  const rows = await testNodes(), ws = await testWs(15);
  const r = rows.map((x) => x.error ? `❌ ${x.name}: ${esc(x.error)}` : `${x.chain === C.CHAIN_ID ? "✅" : "⚠️ wrong chain " + x.chain} ${x.name}: block ${x.block} · ${x.ms}ms · getLogs ${esc(x.logs)}`).join("\n");
  const w = ws.skipped ? `WebSocket: skipped (${ws.skipped})` : ws.error ? `❌ Alchemy WebSocket: ${esc(ws.error)}` : `${ws.heads ? "✅" : "⚠️"} Alchemy WebSocket: ${ws.heads} new blocks in 15s (${fmt(ws.bytes)} bytes)`;
  return `<b>Node test</b>\n${r}\n${w}`;
}

// ---------- start ----------
const abis = {}; for (const a of Object.keys(C.PONS)) abis[C.PONS[a]] = await loadAbi(a);
const nt = await nodesText();
console.log(nt.replace(/<[^>]+>/g, ""));
poll();
setTimeout(sample, process.env.RH_TEST_NODE ? 3000 : 120_000); setInterval(sample, C.SAMPLE_EVERY_MIN * 60_000);
setInterval(lookupSigs, 60_000);
if (TOKEN) commands();
await tg(`🟢 <b>Robinhood tracker ${v} online</b> — stage 0 probe (no trading yet)\nFollowing Pons + Uniswap v4; measuring events, swaps, graduations and busiest contracts.\nPons ABIs from Blockscout: ${Object.entries(abis).map(([k, n]) => `${k.replace("Pons ", "")} ${n ? n + " events" : "not verified"}`).join(" · ")}\n${nt}\n\nSend /status in ~15 min. ${HELP}`);
setInterval(() => tg(`💓 ${status().split("\n").slice(0, 3).join("\n")}`), C.HEARTBEAT_MIN * 60_000);
setInterval(() => console.log(`[1m] polls=${st.polls} logs=${st.logs} swaps=${st.swaps} inits=${st.inits}/${st.ponsInits} curves=${curves.size} lag=${st.lagBlocks}`), 60_000);
if (process.env.RH_TEST_NODE) setTimeout(async () => { await lookupSigs(); console.log(status().replace(/<[^>]+>/g, "")); console.log(sigsText().replace(/<[^>]+>/g, "")); process.exit(0); }, 9000);
process.on("unhandledRejection", (e) => console.error("[unhandled]", e));
