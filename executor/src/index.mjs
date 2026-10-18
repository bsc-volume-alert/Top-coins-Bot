// Executor — the live buy/sell bot. Listens on a local socket for the tracker's Project 5 triggers and exit signals, builds the real pump.fun /
// PumpSwap transactions itself and (shadow) simulates them or (live) signs and sends them through Helius Sender. Own wallet, own book, own pm2 app.
//   node src/index.mjs                      run (mode from EXEC_MODE / the saved override: off | shadow | live)
//   node src/index.mjs selftest <mint>      build + simulate a buy for one coin and print everything
//   node src/index.mjs status               print mode, wallet, balance, open positions, last orders
import { createServer } from "node:net";
import { existsSync, unlinkSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Keypair } from "@solana/web3.js";
import { CFG, EXEC_HOME, lamports, sol } from "./config.mjs";
import { loadKeypair } from "./wallet.mjs";
import bs58 from "bs58";
import { getAccounts, getBalance, buildTx, simulate, send, sendUntilConfirmed, waitConfirm, readFill, blockHeight, signatureStatus, rpcStats } from "./rpc.mjs";
import { ata, parseTokenAccount, ixBudget, ixTip, ixTransfer, PK, PUMP, PUMP_AMM } from "./solana.mjs";
import * as pump from "./pump.mjs";
import * as amm from "./amm.mjs";
import { newOrder, updOrder, openPosition, closePosition, openPositions, positionOf, hasPosition, dayNet, recentOrders, stats, log, pendingBuys, lastSellSig, recentClosed, skipSummary, totals } from "./book.mjs";

const VERSION = "0.1.2";
const nowS = () => Math.floor(Date.now() / 1000);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const short = (m) => (m ? `${m.slice(0, 4)}…${m.slice(-4)}` : "?");

// ---- settings that can be changed from Telegram and survive restarts (mode, stake) ----
const OVR = join(EXEC_HOME, "overrides.json");
const ovr = (() => { try { return JSON.parse(readFileSync(OVR, "utf8")); } catch { return {}; } })();
const S = { mode: ovr.mode || CFG.MODE, stake: ovr.stake || CFG.STAKE_SOL, exit: ovr.exit || CFG.EXIT, strategy: ovr.strategy || CFG.STRATEGY, stoppedDay: null, stopOverrideDay: null, lastTracker: Date.now(), lastFeed: 0, kp: null, pub: null, balance: null, balanceT: 0, buying: 0, lags: [] };
const inflight = new Set();      // mints with a buy in progress (counted against the cap, blocks a second buy of the same coin)
const pendingExit = new Map();   // paper_id -> { rule, mult } : an exit that arrived while the buy was still in flight
const needsSell = new Map();     // paper_id -> { rule, mult, why } : positions that must be sold until they are
const selling = new Set();       // paper_ids with a sell in progress
let housekeepingBusy = false;
const fallbackMin = () => (S.exit === "flow4" ? CFG.FALLBACK_SELL_MIN_FLOW4 : CFG.FALLBACK_SELL_MIN_H5);
const feedLagAvg = () => (S.lags.length ? S.lags.reduce((a, b) => a + b, 0) / S.lags.length : 0);
const saveOvr = () => { try { writeFileSync(OVR, JSON.stringify({ mode: S.mode, stake: S.stake, exit: S.exit, strategy: S.strategy })); } catch {} };

// ---- Telegram (send only; commands arrive through the tracker, which owns the bot's polling) ----
export async function tg(text) {
  if (!CFG.TG_TOKEN || !CFG.TG_CHAT || CFG.SMOKE) { console.log("[tg]", text.replace(/<[^>]+>/g, "")); return; }
  try { await fetch(`https://api.telegram.org/bot${CFG.TG_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ chat_id: CFG.TG_CHAT, text: `🤖 ${text}`, parse_mode: "HTML", disable_web_page_preview: true }) }); } catch (e) { console.error("[tg]", e.message); }
}

// ---- wallet / balance ----
function loadWallet() { try { S.kp = loadKeypair(); S.pub = S.kp?.publicKey || null; } catch (e) { console.error("[wallet]", e.message); S.kp = null; S.pub = null; } return S.kp; }
async function balance(force = false) {
  if (!S.pub) return null; if (!force && Date.now() - S.balanceT < 5000) return S.balance;
  try { S.balance = await getBalance(S.pub); S.balanceT = Date.now(); } catch (e) { console.error("[balance]", e.message); } return S.balance;
}

// ---- venue lookup: where does this coin trade right now? ----
let globalCache = null, cfgCache = null;
async function venueOf(mintStr, waitMs = 6000) {
  const mint = PK(mintStr), curvePk = pump.curveOf(mint);
  const [curveAcc, mintAcc, globalAcc] = await getAccounts([curvePk, mint, pump.GLOBAL]);
  if (globalAcc) globalCache = pump.decodeGlobal(globalAcc.data) || globalCache;
  const tokenProgram = pump.tokenProgramOf(mintAcc?.owner);
  const curve = curveAcc ? pump.decodeCurve(curveAcc.data) : null;
  if (curve && !curve.complete) return { kind: "curve", mint, curve, tokenProgram, global: globalCache, curvePk, solQuoted: curve.solQuoted };
  let poolPk = amm.migratedPoolOf(mint);
  let [poolAcc, cfgAcc] = await getAccounts([poolPk, amm.GLOBAL_CONFIG]);
  if (cfgAcc) cfgCache = amm.decodeGlobalConfig(cfgAcc.data) || cfgCache;
  // at today's SOL price the curve completes at ≈ $40K — right where Project 5 buys — so the trigger often lands in the seconds between
  // the curve filling and pump.fun creating the pool. Wait for it (up to `waitMs`), then try DexScreener's pair address as a last resort.
  const t0 = Date.now(); let waited = 0;
  while (!poolAcc && curve && Date.now() - t0 < waitMs) { await new Promise((r) => setTimeout(r, 400)); waited++; [poolAcc] = await getAccounts([poolPk]); }
  if (!poolAcc && curve) { try { const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintStr}`, { signal: AbortSignal.timeout(2500) }); const j = await r.json();
    const pair = (j.pairs || []).find((p) => p.chainId === "solana" && /pumpswap/i.test(p.dexId || "")); if (pair?.pairAddress) { poolPk = PK(pair.pairAddress); [poolAcc] = await getAccounts([poolPk]); } } catch {} }
  const pool = poolAcc ? amm.decodePool(poolAcc.data) : null;
  if (!pool) return { kind: "none", mint, curve, tokenProgram, reason: curve ? `curve complete, pool not there after ${((Date.now() - t0) / 1000).toFixed(1)} s (migration pending)` : "no bonding curve for this mint" };
  const [baseAcc, quoteAcc] = await getAccounts([pool.baseAcc, pool.quoteAcc]);
  const baseRes = parseTokenAccount(baseAcc?.data)?.amount ?? 0n, quoteRes = parseTokenAccount(quoteAcc?.data)?.amount ?? 0n;
  return { kind: "amm", mint, pool, poolPk, cfg: cfgCache, tokenProgram, baseRes, quoteRes, curve };
}

// ---- building ----
function buyIxs(v, user, spendLamports, slip, kind = "classic") {
  if (v.kind === "curve") {
    const q = pump.quoteBuy(v.curve, v.global, spendLamports), minTokens = (q.tokens * BigInt(Math.round((1 - slip) * 10000))) / 10000n;
    const f = kind === "v3" ? pump.ixBuyV3 : pump.ixBuyClassic;
    return { ixs: f({ user, mint: v.mint, curve: v.curve, global: v.global, tokenProgram: v.tokenProgram, spendLamports, minTokens }), expected: q.tokens, minOut: minTokens, feeBps: q.feeBps, ixKind: kind };
  }
  const q = amm.quoteBuy(v.pool, v.cfg, v.baseRes, v.quoteRes, spendLamports), minBase = (q.base * BigInt(Math.round((1 - slip) * 10000))) / 10000n;
  const f = kind === "amm" ? amm.ixBuy : amm.ixBuyV2;
  return { ixs: f({ user, poolPk: v.poolPk, pool: v.pool, cfg: v.cfg, baseTokenProgram: v.tokenProgram, spendLamports, minBase }), expected: q.base, minOut: minBase, feeBps: q.feeBps, ixKind: kind === "amm" ? "amm" : "amm2" };
}
function sellIxs(v, user, amount, slip, kind = "classic") {
  if (v.kind === "curve") {
    const q = pump.quoteSell(v.curve, v.global, amount), minSol = (q.sol * BigInt(Math.round((1 - slip) * 10000))) / 10000n;
    const f = kind === "v3" ? pump.ixSellV3 : pump.ixSellClassic;
    return { ixs: f({ user, mint: v.mint, curve: v.curve, global: v.global, tokenProgram: v.tokenProgram, amount, minSol }), expected: q.sol, minOut: minSol, ixKind: kind };
  }
  const q = amm.quoteSell(v.pool, v.cfg, v.baseRes, v.quoteRes, amount), minSol = (q.sol * BigInt(Math.round((1 - slip) * 10000))) / 10000n;
  const f = kind === "amm" ? amm.ixSell : amm.ixSellV2;
  return { ixs: f({ user, poolPk: v.poolPk, pool: v.pool, cfg: v.cfg, baseTokenProgram: v.tokenProgram, amount, minSol }), expected: q.sol, minOut: minSol, ixKind: kind === "amm" ? "amm" : "amm2" };
}
const wrap = (user, ixs, tipLamports, cuPrice) => [...ixBudget(CFG.CU_LIMIT, cuPrice), ixTip(user, tipLamports), ...ixs];
// Both pump programs keep a per-wallet "user volume accumulator" that every swap references. A fresh wallet has none, so the first buy on each
// program carries the one-off create instruction in front of it (3012 AccountNotInitialized in shadow otherwise). Remembered once seen on chain.
const uvaSeen = { curve: false, amm: false };
async function userVolPrefix(kind) {
  if (uvaSeen[kind] || !S.pub) return [];
  const [prog, pk, ea] = kind === "curve" ? [PUMP, pump.userVolOf(S.pub), pump.EVENT_AUTHORITY] : [PUMP_AMM, amm.ammUserVolOf(S.pub), amm.AMM_EVENT_AUTHORITY];
  const [acc] = await getAccounts([pk]); if (acc) { uvaSeen[kind] = true; return []; }
  return [amm.ixInitUserVolume(prog, S.pub, pk, ea)];
}
const progErr = (sim) => !sim.ok && !/rpc:/.test(sim.err || "") && !/insufficient (lamports|funds)/i.test(sim.logs.join(" ") + (sim.err || ""));

// ---- the buy ----
async function handleTrigger(m) {
  S.lastTracker = Date.now();
  if (m.strategy !== S.strategy) return;
  const t0 = Date.now(), fromTrig = () => Date.now() - (m.wall0 || t0);
  const skip = (why) => { newOrder({ side: "buy", paper_id: m.id, mint: m.mint, name: m.name, strategy: m.strategy, status: "skipped", skip_reason: why, stake_lamports: lamports(S.stake), from_trigger_ms: fromTrig() }); log("skip", `${m.name} ${why}`); };
  if (m.lagMs != null) { S.lags.push(m.lagMs); if (S.lags.length > 10) S.lags.shift(); }
  if (S.mode === "off") return skip("mode off");
  if (m.pass === false) return skip(`paper skip: ${m.skipWhy || "filter"}`); // the website's P5 filters (launch seen · bundle < 70% · < 150 wallets) — not a trade the book takes
  // feed lag is recorded, not acted on: block timestamps run 2–5 s behind the wall clock on Solana, so the number is a trend, not a delay (shadow 18 Oct: it tripped on a healthy feed). The trigger-age check below is the real guard.
  if (fromTrig() > CFG.TRIGGER_MAX_AGE_MS) return skip(`trigger ${fromTrig()} ms old`);
  if (m.venue && !/pump|pumpswap/i.test(m.venue)) return skip(`venue ${m.venue} not handled yet`);
  if (hasPosition(m.mint)) return skip("already holding");
  const today = new Date().toISOString().slice(0, 10), day = dayNet(S.mode === "live" ? "live" : "shadow");
  if (S.stopOverrideDay !== today && day.n <= -lamports(S.stake) * CFG.DAILY_STOP_STAKES) { if (S.stoppedDay !== today) { S.stoppedDay = today; tg(`⛔ <b>Daily stop</b> — ${sol(day.n).toFixed(3)} SOL today over ${day.c} trades. No more buys until tomorrow (UTC). <code>/live on</code> re-arms it for today.`); } return skip("daily stop"); }
  if (!S.pub) return skip("no wallet yet");
  if (inflight.has(m.mint)) return skip("buy already in flight for this coin");
  const stake = lamports(S.stake);
  // reserve the slot and the coin BEFORE anything awaits, so two triggers in one burst cannot both pass the cap
  S.buying++; inflight.add(m.mint);
  try {
    if (openPositions().length + S.buying > CFG.MAX_OPEN) return skip(`${openPositions().length + S.buying - 1} positions open (cap ${CFG.MAX_OPEN})`);
    const bal = await balance(); if (bal != null && bal < stake + lamports(0.02)) return skip(`balance ${sol(bal).toFixed(3)} SOL below stake + fees`);
    const v = await venueOf(m.mint); const tVenue = Date.now() - t0;
    if (v.kind === "none") return skip(v.reason);
    if (v.kind === "curve" && !v.solQuoted) return skip("curve not SOL-quoted");
    let b = buyIxs(v, S.pub, stake, CFG.SLIP_BUY, v.kind === "amm" ? "amm" : "classic"); const pre = await userVolPrefix(v.kind);
    if (!(b.minOut > 0n)) return skip("quote gave a zero minimum — pool state unreadable");
    const id = newOrder({ side: "buy", paper_id: m.id, mint: m.mint, name: m.name, strategy: m.strategy, venue: v.kind, ix_kind: b.ixKind, stake_lamports: stake, slippage: CFG.SLIP_BUY, quote_out: b.expected, min_out: b.minOut, tip_lamports: lamports(CFG.TIP_SOL), cu_price: CFG.CU_PRICE,
      from_trigger_ms: fromTrig(), detail: { paperPrice: m.price, paperMc: m.mc, lagMs: m.lagMs ?? null, bundle: m.bundle ?? null, wal60: m.wal60 ?? null, feeBps: b.feeBps, tVenueMs: tVenue, curveMcSol: v.curve ? +pump.curveMcSol(v.curve).toFixed(1) : null } });
    let tx = await buildTx(S.pub, wrap(S.pub, [...pre, ...b.ixs], lamports(CFG.TIP_SOL), CFG.CU_PRICE));
    // shadow always simulates; live simulates unless EXEC_SIM_BEFORE_SEND=0. A program refusal on the classic instruction → try the other form once (v3 on the curve, IDL-v2 on the pool)
    let sim = S.mode === "live" && !CFG.SIM_BEFORE_SEND ? { ok: true, err: null, logs: [], units: null, ms: 0, skipped: true } : await simulate(tx);
    if (progErr(sim)) { const altKind = v.kind === "curve" ? "v3" : "amm2"; const b3 = buyIxs(v, S.pub, stake, CFG.SLIP_BUY, altKind); const tx3 = await buildTx(S.pub, wrap(S.pub, [...pre, ...b3.ixs], lamports(CFG.TIP_SOL), CFG.CU_PRICE)); const sim3 = await simulate(tx3);
      updOrder(id, { detail: { firstKind: b.ixKind, firstErr: sim.err, firstLogs: sim.logs.slice(-4) } }); if (sim3.ok || !progErr(sim3)) { b = b3; tx = tx3; sim = sim3; } }
    if (!(b.minOut > 0n)) return skip("quote gave a zero minimum — pool state unreadable");
    updOrder(id, { ix_kind: b.ixKind, quote_out: b.expected, min_out: b.minOut, sim_ok: sim.ok ? 1 : 0, sim_err: sim.err, sim_units: sim.units, sim_ms: sim.ms, status: sim.ok ? "simulated" : "sim-failed" });
    if (!sim.ok) { log("sim-fail", `${m.name} ${b.ixKind}: ${sim.err} | ${sim.logs.slice(-3).join(" | ")}`); return; }
    if (S.mode !== "live") { // shadow: the simulated buy is the fill
      openPosition.run({ paper_id: m.id, mint: m.mint, name: m.name, strategy: m.strategy, mode: "shadow", opened_ts: nowS(), tokens: Number(b.expected), cost_lamports: stake, buy_order: id, venue: v.kind, ix_kind: b.ixKind, paper_entry_price: m.price });
      updOrder(id, { status: "shadow-filled", fill_tokens: Number(b.expected), fill_sol: -stake, from_trigger_ms: fromTrig() }); afterOpen(m.id); return;
    }
    // live: sign; the signature is on record BEFORE the first send, so a buy that lands late (or after a crash) is found by the reconciler and never left unmanaged.
    tx.sign([S.kp]); const sig = bs58.encode(tx.signatures[0]);
    updOrder(id, { sig, status: "sent", detail: { lastValidBlockHeight: tx.lastValidBlockHeight, mint: m.mint, expected: String(b.expected), paperPrice: m.price } });
    // the only retry is re-sending the SAME transaction (a second, different buy could land too → bought twice). Not landed in 18 s → pending; the reconciler watches it until its blockhash expires.
    const c = await sendUntilConfirmed(tx, 18000); updOrder(id, { via: c.via, send_ms: c.ms });
    if (c.status === "failed") { updOrder(id, { status: "failed", sim_err: c.err }); log("buy-fail", `${m.name} failed ${c.err || ""}`); tg(`⚠️ buy failed — ${esc(m.name)} <code>${esc(c.err || "").slice(0, 120)}</code>`); return; }
    if (c.status !== "confirmed") { updOrder(id, { status: "pending" }); log("buy-pending", `${m.name} not landed in 18 s — watching the signature`); tg(`⏳ buy not landed in 18 s — ${esc(m.name)}. No second attempt (by design); if it lands late it is picked up and managed.`); return; }
    await bookBuy(id, sig, m, b, v, stake, c.slot, fromTrig());
  } catch (e) { console.error("[buy]", e); log("buy-error", `${m.name}: ${e.message}`); newOrder({ side: "buy", paper_id: m.id, mint: m.mint, name: m.name, strategy: m.strategy, status: "error", skip_reason: String(e.message).slice(0, 200), stake_lamports: stake, from_trigger_ms: fromTrig() }); }
  finally { S.buying = Math.max(0, S.buying - 1); inflight.delete(m.mint); }
}
/** A confirmed live buy becomes a position (real fill from the chain). Shared by the normal path and the reconciler. */
async function bookBuy(id, sig, m, b, v, stake, slot, fromTrigMs) {
  const fill = await readFill(sig, S.pub, PK(m.mint)).catch(() => null);
  const tokens = fill?.tokenDelta ?? Number(b.expected), spent = fill ? -fill.solDelta : stake;
  openPosition.run({ paper_id: m.id, mint: m.mint, name: m.name, strategy: m.strategy, mode: "live", opened_ts: nowS(), tokens, cost_lamports: spent, buy_order: id, venue: v.kind, ix_kind: b.ixKind, paper_entry_price: m.price });
  updOrder(id, { status: "confirmed", confirm_slot: slot, fill_tokens: tokens, fill_sol: -spent, fee: fill?.fee ?? null, from_trigger_ms: fromTrigMs });
  const livePx = tokens > 0 ? (spent / 1e9) / (tokens / 1e6) : null; // SOL per whole token (6 decimals), same unit as the paper price
  const gap = livePx && m.price ? ((livePx / m.price) - 1) * 100 : null;
  tg(`🟢 <b>BOUGHT</b> ${esc(m.name)} — ${sol(spent).toFixed(4)} SOL incl. fees · ${(fromTrigMs / 1000).toFixed(1)} s after the trigger${gap != null ? ` · ${gap >= 0 ? "+" : ""}${gap.toFixed(1)}% vs paper price` : ""} · ${v.kind}/${b.ixKind}${fill ? "" : " · fill not read yet"}\n<code>${sig}</code>`);
  afterOpen(m.id);
}
/** An exit that arrived while the buy was in flight is acted on the moment the position exists. */
function afterOpen(paperId) { const pe = pendingExit.get(paperId); if (!pe) return; pendingExit.delete(paperId); needsSell.set(paperId, pe); const p = positionOf(paperId); if (p && p.status === "open") sellPosition(p, pe.rule, pe.mult, "exit arrived during the buy").catch(() => {}); }
/** Live buys that did not confirm inside 18 s: landed late → book them; blockhash expired without landing → closed as 'expired'. Runs every housekeeping tick and at startup. */
async function reconcilePending() {
  const rows = pendingBuys(); if (!rows.length) return; let height = null;
  for (const o of rows) {
    try {
      if (!o.sig) { updOrder(o.id, { status: "error", skip_reason: "no signature recorded" }); continue; }
      const st = await signatureStatus(o.sig); let d = {}; try { d = JSON.parse(o.detail || "{}"); } catch {}
      if (st.status === "confirmed") {
        if (positionOf(o.paper_id)?.status) { updOrder(o.id, { status: "confirmed", confirm_slot: st.slot }); continue; }
        const m = { id: o.paper_id, mint: o.mint, name: o.name, strategy: o.strategy, price: d.paperPrice ?? null };
        await bookBuy(o.id, o.sig, m, { expected: BigInt(d.expected || 0), ixKind: o.ix_kind }, { kind: o.venue }, o.stake_lamports, st.slot, o.from_trigger_ms || 0); log("reconciled", `${o.name} landed late — booked`);
      } else if (st.status === "failed") { updOrder(o.id, { status: "failed", sim_err: st.err }); }
      else { height ??= await blockHeight(); if (d.lastValidBlockHeight && height > d.lastValidBlockHeight + 5) { updOrder(o.id, { status: "expired" }); log("expired", `${o.name} never landed`); } }
    } catch (e) { console.error("[reconcile]", e.message); }
  }
}

// ---- the sell ----
const sellTry = new Map(); // paper_id -> last attempt ms (a sell that will not land is retried every 20 s, not every tick)
async function sellPosition(p, rule, paperMult = null, why = null) {
  if (!S.pub) return; const t0 = Date.now(), mint = PK(p.mint);
  if (selling.has(p.paper_id)) return; if (Date.now() - (sellTry.get(p.paper_id) || 0) < 20_000) return; sellTry.set(p.paper_id, Date.now()); selling.add(p.paper_id);
  needsSell.set(p.paper_id, { rule, mult: paperMult, why });
  const done = (sellOrder, proceeds, status = "closed") => { closePosition.run({ paper_id: p.paper_id, sell_order: sellOrder, closed_ts: nowS(), proceeds_lamports: proceeds, pnl_lamports: proceeds - p.cost_lamports, exit_rule: rule, paper_exit_mult: paperMult, status }); needsSell.delete(p.paper_id); };
  try {
    const v = await venueOf(p.mint); if (v.kind === "none") { log("sell-novenue", `${p.name}: ${v.reason}`); return; }
    const isStop = paperMult != null && paperMult < 1, slip = isStop ? CFG.SLIP_STOP : CFG.SLIP_SELL;
    let amount = BigInt(p.tokens || 0);
    if (p.mode === "live") { const [acc] = await getAccounts([ata(S.pub, mint, v.tokenProgram)]); amount = parseTokenAccount(acc?.data)?.amount ?? 0n;
      if (amount === 0n) { // nothing in the wallet: an earlier sell landed after we stopped watching it — read its real proceeds rather than book a total loss
        const prev = lastSellSig(p.paper_id); const f = prev?.sig ? await readFill(prev.sig, S.pub, mint).catch(() => null) : null;
        if (f && f.tokenDelta < 0) { done(prev.id, f.solDelta); updOrder(prev.id, { status: "confirmed", fill_sol: f.solDelta, fill_tokens: f.tokenDelta, fee: f.fee }); log("sell-late", `${p.name}: earlier sell had landed, booked ${sol(f.solDelta).toFixed(4)} SOL`); }
        else { done(null, 0); log("sell-empty", `${p.name}: no tokens in wallet and no sell found — booked as lost`); tg(`⚠️ ${esc(p.name)}: wallet holds none of this coin and no sell of ours landed — booked as a full loss. Check the wallet on Solscan.`); }
        return; } }
    let sIx = sellIxs(v, S.pub, amount, slip, v.kind === "amm" ? (p.ix_kind === "amm" ? "amm" : "amm2") : (p.ix_kind === "v3" ? "v3" : "classic"));
    const id = newOrder({ side: "sell", paper_id: p.paper_id, mint: p.mint, name: p.name, strategy: p.strategy, rule, venue: v.kind, ix_kind: sIx.ixKind, amount_tokens: Number(amount), slippage: slip, quote_out: sIx.expected, min_out: sIx.minOut, tip_lamports: lamports(CFG.TIP_SOL), cu_price: CFG.CU_PRICE, detail: { why, paperMult } });
    if (p.mode !== "live") { // shadow: the quote at this moment is the fill (a sell cannot be simulated without holding the tokens)
      const proceeds = Number(sIx.expected) - lamports(CFG.TIP_SOL) - 10000;
      done(id, proceeds); updOrder(id, { status: "shadow-filled", fill_sol: proceeds, fill_tokens: -Number(amount) }); return;
    }
    let tx = await buildTx(S.pub, wrap(S.pub, sIx.ixs, lamports(CFG.TIP_SOL), CFG.CU_PRICE)); let sim = await simulate(tx);
    if (progErr(sim)) { const altKind = v.kind === "amm" ? (sIx.ixKind === "amm" ? "amm2" : "amm") : (sIx.ixKind === "v3" ? "classic" : "v3"); const alt = sellIxs(v, S.pub, amount, slip, altKind); const tx2 = await buildTx(S.pub, wrap(S.pub, alt.ixs, lamports(CFG.TIP_SOL), CFG.CU_PRICE)); const sim2 = await simulate(tx2); if (sim2.ok) { sIx = alt; tx = tx2; sim = sim2; } }
    updOrder(id, { ix_kind: sIx.ixKind, sim_ok: sim.ok ? 1 : 0, sim_err: sim.err, sim_units: sim.units, sim_ms: sim.ms });
    // a failed simulation on a sell is not a reason to hold a dumping coin: send anyway with the stop slippage
    if (!sim.ok) { log("sell-simfail", `${p.name}: ${sim.err} | ${sim.logs.slice(-3).join(" | ")}`); if (slip < CFG.SLIP_STOP) { sIx = sellIxs(v, S.pub, amount, CFG.SLIP_STOP, sIx.ixKind); tx = await buildTx(S.pub, wrap(S.pub, sIx.ixs, lamports(CFG.TIP_SOL), CFG.CU_PRICE)); } }
    tx.sign([S.kp]); const sigs = [bs58.encode(tx.signatures[0])]; updOrder(id, { sig: sigs[0], status: "sent" });
    let c = await sendUntilConfirmed(tx, 12000); let s = { sig: c.sig, via: c.via }; updOrder(id, { via: c.via, send_ms: c.ms });
    for (let attempt = 0; attempt < 3 && c.status !== "confirmed"; attempt++) { // sells keep trying: fresh quote, wider slippage, bigger tip (a duplicate sell cannot execute twice — the tokens are gone)
      const v2 = await venueOf(p.mint); if (v2.kind === "none") break;
      const r = sellIxs(v2, S.pub, amount, Math.min(0.5, CFG.SLIP_STOP + 0.1 * attempt), sIx.ixKind); const txr = await buildTx(S.pub, wrap(S.pub, r.ixs, lamports(CFG.TIP_RETRY_SOL), CFG.CU_PRICE_RETRY), S.kp);
      const sr = await send(txr); sigs.push(sr.sig); c = await waitConfirm(sr.sig, 15000);
      if (c.status !== "confirmed") for (const old of sigs.slice(0, -1)) { const oc = await signatureStatus(old).catch(() => null); if (oc?.status === "confirmed") { c = oc; sr.sig = old; break; } } // an earlier attempt may have landed meanwhile
      if (c.status === "confirmed") { s = sr; updOrder(id, { sig: sr.sig, via: sr.via, tip_lamports: lamports(CFG.TIP_RETRY_SOL), cu_price: CFG.CU_PRICE_RETRY, slippage: Math.min(0.5, CFG.SLIP_STOP + 0.1 * attempt) }); }
    }
    if (c.status !== "confirmed") { updOrder(id, { status: c.status === "failed" ? "failed" : "timeout", sim_err: c.err, detail: { sigs } }); tg(`🚨 <b>SELL NOT LANDED</b> — ${esc(p.name)} (${rule}) ${c.err ? `<code>${esc(c.err).slice(0, 120)}</code>` : ""}\nStill holding ${Number(amount)} tokens. Retrying every 20 s until it is gone; <code>/live sell ${p.paper_id}</code> forces an attempt now.`); return; }
    const fill = await readFill(s.sig, S.pub, mint).catch(() => null); const proceeds = fill ? fill.solDelta : Number(sIx.expected);
    done(id, proceeds);
    updOrder(id, { status: "confirmed", confirm_slot: c.slot, fill_sol: proceeds, fill_tokens: fill?.tokenDelta ?? -Number(amount), fee: fill?.fee ?? null, send_ms: Date.now() - t0 });
    const pnl = proceeds - p.cost_lamports, mult = p.cost_lamports > 0 ? proceeds / p.cost_lamports : null, day = dayNet("live");
    tg(`${pnl >= 0 ? "✅" : "🔴"} <b>SOLD</b> ${esc(p.name)} (${rule}${paperMult != null ? `, paper ${paperMult.toFixed(2)}x` : ""}) — live <b>${mult ? mult.toFixed(2) + "x" : "?"}</b> · ${pnl >= 0 ? "+" : ""}${sol(pnl).toFixed(4)} SOL · today ${sol(day.n) >= 0 ? "+" : ""}${sol(day.n).toFixed(3)} over ${day.c}\n<code>${s.sig}</code>`);
  } catch (e) { console.error("[sell]", e); log("sell-error", `${p.name}: ${e.message}`); }
  finally { selling.delete(p.paper_id); }
}
async function handleExit(m) {
  S.lastTracker = Date.now();
  if (m.type === "exit" && m.rule !== S.exit) return;
  const rule = m.type === "close" ? `paper-close:${m.reason}` : m.rule, mult = m.mult ?? null;
  const p = positionOf(m.id);
  if (!p) { if (inflight.has(m.mint) || pendingBuys().some((o) => o.paper_id === m.id)) pendingExit.set(m.id, { rule, mult }); return; } // buy still in flight → sell the moment it books
  if (p.status !== "open") return;
  await sellPosition(p, rule, mult);
}

// ---- commands from Telegram (forwarded by the tracker) ----
async function handleCmd(text) {
  const [, sub, arg] = text.trim().split(/\s+/); const bal = await balance(true);
  const status = () => { const ops = openPositions(); const d = dayNet("live"), sd = dayNet("shadow");
    return `executor v${VERSION} · mode <b>${S.mode}</b> · follows ${S.strategy} / exit ${S.exit} · stake ${S.stake} SOL · cap ${CFG.MAX_OPEN}\nwallet ${S.pub ? `<code>${S.pub.toBase58()}</code>` : "none"} · balance ${bal != null ? sol(bal).toFixed(4) : "?"} SOL\nopen ${ops.length}: ${ops.map((p) => `${esc(p.name)} (${p.mode})`).join(", ") || "—"}\ntoday live ${sol(d.n).toFixed(3)} / ${d.c} · shadow ${sol(sd.n).toFixed(3)} / ${sd.c} · rpc errs ${rpcStats.errors} · sender errs ${rpcStats.senderErrors}`; };
  if (!sub) return tg(status());
  if (sub === "off") { S.mode = "off"; saveOvr(); return tg(`mode <b>off</b> — no buys. Open positions are still sold on their exits.`); }
  if (sub === "shadow") { S.mode = "shadow"; saveOvr(); return tg(`mode <b>shadow</b> — building and simulating, signing nothing.`); }
  if (sub === "on" || sub === "live") { if (!S.kp) return tg("no wallet on the box yet"); if (bal == null || bal < lamports(S.stake) + lamports(0.02)) return tg(`balance ${bal != null ? sol(bal).toFixed(4) : "?"} SOL is below one stake + fees — fund the wallet first`); S.mode = "live"; S.stopOverrideDay = new Date().toISOString().slice(0, 10); saveOvr(); return tg(`mode <b>LIVE</b> — ${S.stake} SOL per trade on ${S.strategy}, exit ${S.exit}.`); }
  if (sub === "stake") { const v = Number(arg); if (!(v > 0 && v <= 2)) return tg("usage: /live stake 0.25"); S.stake = v; saveOvr(); return tg(`stake set to <b>${v} SOL</b>`); }
  if (sub === "exit") { if (!["h5", "flow4"].includes(arg)) return tg("usage: /live exit h5 | flow4"); S.exit = arg; saveOvr(); return tg(`exit rule set to <b>${arg}</b>`); }
  if (sub === "strategy") { if (!/^p5[ew]\d+$/.test(arg || "")) return tg("usage: /live strategy p5e30 | p5e50"); S.strategy = arg; saveOvr(); return tg(`following <b>${arg}</b>`); }
  if (sub === "sell") { const ops = openPositions(); const list = arg === "all" ? ops : ops.filter((p) => String(p.paper_id) === arg); if (!list.length) return tg("nothing open by that id"); for (const p of list) await sellPosition(p, "manual", null, "telegram"); return; }
  if (sub === "orders") return tg(recentOrders(8).map((o) => `#${o.id} ${o.side} ${esc(o.name)} ${o.status}${o.skip_reason ? " (" + esc(o.skip_reason) + ")" : ""}${o.sim_err ? " " + esc(String(o.sim_err).slice(0, 60)) : ""}`).join("\n") || "no orders yet");
  if (sub === "withdraw") { // only ever to the configured address — a stolen Telegram session can only send your money to you
    if (!CFG.SWEEP_TO) return tg("no withdrawal address set yet (EXEC_SWEEP_TO in /root/executor/.env)"); if (!S.kp) return tg("no wallet on the box");
    const amt = Number(arg); if (!(amt > 0)) return tg("usage: /live withdraw 0.5");
    if (openPositions().some((p) => p.mode === "live")) return tg("positions are open — withdraw after they close");
    if (bal == null || bal < lamports(amt) + lamports(0.01)) return tg(`balance ${bal != null ? sol(bal).toFixed(4) : "?"} SOL — not enough for ${amt} plus fees`);
    try { const tx = await buildTx(S.pub, [...ixBudget(20_000, CFG.CU_PRICE), ixTransfer(S.pub, PK(CFG.SWEEP_TO), lamports(amt))], S.kp); const c = await sendUntilConfirmed(tx, 30000); log("withdraw", `${amt} SOL → ${CFG.SWEEP_TO} ${c.status} ${c.sig}`);
      return tg(c.status === "confirmed" ? `🏦 sent <b>${amt} SOL</b> to <code>${CFG.SWEEP_TO}</code>\n<code>${c.sig}</code>` : `⚠️ withdrawal ${c.status} — <code>${c.sig}</code> (check Solscan before retrying)`); } catch (e) { return tg(`⚠️ withdrawal failed: ${esc(e.message)}`); } }
  return tg("commands: /live · /live on · /live off · /live shadow · /live stake 0.25 · /live exit h5|flow4 · /live strategy p5e30|p5e50 · /live sell &lt;id|all&gt; · /live orders · /live withdraw 0.5");
}

// ---- socket from the tracker ----
function startSocket(path) {
  try { if (existsSync(path)) unlinkSync(path); } catch {}
  const server = createServer((sock) => {
    let buf = ""; S.lastTracker = Date.now();
    sock.on("data", (d) => { buf += d.toString(); let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue; let m; try { m = JSON.parse(line); } catch { continue; }
      S.lastTracker = Date.now();
      if (m.type === "trigger") handleTrigger(m).catch((e) => console.error("[trigger]", e.message));
      else if (m.type === "exit" || m.type === "close") handleExit(m).catch((e) => console.error("[exit]", e.message));
      else if (m.type === "cmd") handleCmd(m.text || "").catch((e) => console.error("[cmd]", e.message));
      else if (m.type === "ping") { if (m.feed) S.lastFeed = m.feed; try { sock.write(JSON.stringify({ type: "pong", mode: S.mode, open: openPositions().length }) + "\n"); } catch {} } } });
    sock.on("error", () => {});
  });
  server.on("error", (e) => console.error("[socket]", e.message));
  server.listen(path, () => { console.log(`[executor] listening on ${path}`); });
  return server;
}

// ---- periodic: orphan sells, tracker-down safety, status file, sweep ----
let sweptDay = null;
async function housekeeping() {
  if (housekeepingBusy) return; housekeepingBusy = true;
  try {
    await reconcilePending();
    const ops = openPositions(), n = nowS(), trackerSilent = Date.now() - S.lastTracker > 120_000, feedStale = S.lastFeed > 0 && Date.now() - S.lastFeed > 120_000;
    for (const p of ops) {
      const ns = needsSell.get(p.paper_id);
      if (ns) await sellPosition(p, ns.rule, ns.mult, ns.why); // an exit we owe and have not managed to fill yet (20 s cadence inside)
      else if (n - p.opened_ts > fallbackMin() * 60) await sellPosition(p, "fallback-time", null, `no exit signal in ${fallbackMin()} min (${S.exit})`);
      else if (p.mode === "live" && (trackerSilent || feedStale)) await sellPosition(p, "tracker-down", null, trackerSilent ? "no tracker contact for 2 min" : "tracker's price feed silent for 2 min");
    }
    if (S.mode === "live" && CFG.SWEEP_TO && CFG.SWEEP_CEILING_SOL > 0) { const day = new Date().toISOString().slice(0, 10); const bal = await balance(true);
      if (sweptDay !== day && bal != null && bal > lamports(CFG.SWEEP_CEILING_SOL) + lamports(0.05) && !ops.length) { sweptDay = day; const amt = bal - lamports(CFG.SWEEP_CEILING_SOL);
        try { const tx = await buildTx(S.pub, [...ixBudget(20_000, CFG.CU_PRICE), ixTransfer(S.pub, PK(CFG.SWEEP_TO), amt)], S.kp); const s = await send(tx); const c = await waitConfirm(s.sig, 30000); log("sweep", `${sol(amt)} SOL → ${CFG.SWEEP_TO} ${c.status}`); tg(`🏦 swept ${sol(amt).toFixed(3)} SOL to <code>${CFG.SWEEP_TO}</code> (${c.status})`); } catch (e) { log("sweep-error", e.message); } } }
    const bal = S.pub ? await balance() : null;
    const dayStart = Math.floor(Date.now() / 86400000) * 86400, tl = totals("live"), ts = totals("shadow");
    writeFileSync(join(EXEC_HOME, "status.json"), JSON.stringify({ version: VERSION, mode: S.mode, strategy: S.strategy, exit: S.exit, stake: S.stake, wallet: S.pub?.toBase58() || null, balance: bal != null ? sol(bal) : null, sweepTo: CFG.SWEEP_TO || null,
      open: ops.map((p) => ({ id: p.paper_id, name: p.name, mint: p.mint, mode: p.mode, opened_ts: p.opened_ts, cost: sol(p.cost_lamports), tokens: p.tokens })),
      dayLive: dayNet("live"), dayShadow: dayNet("shadow"), totalLive: { n: tl.n, pnl: sol(tl.pnl), win: tl.n ? tl.w / tl.n : null }, totalShadow: { n: ts.n, pnl: sol(ts.pnl), win: ts.n ? ts.w / ts.n : null },
      recent: recentClosed(10), skipsToday: skipSummary(dayStart), stats: stats(), rpc: rpcStats, trackerSeenS: S.lastTracker ? Math.round((Date.now() - S.lastTracker) / 1000) : null, now: nowS() }));
  } catch (e) { console.error("[housekeeping]", e.message); }
  finally { housekeepingBusy = false; }
}

// ---- CLI ----
const cmd = process.argv[2];
if (cmd === "selftest") {
  const mintStr = process.argv[3]; if (!mintStr) { console.log("usage: node src/index.mjs selftest <mint> [stakeSol]"); process.exit(1); }
  loadWallet(); const stakeSol = Number(process.argv[4] || S.stake); const user = S.pub || Keypair.generate().publicKey;
  console.log(`wallet: ${S.pub ? S.pub.toBase58() : "none (simulating with a placeholder payer — expect an insufficient-funds error, the account list is still checked)"}`);
  const v = await venueOf(mintStr); console.log("venue:", v.kind, v.kind === "curve" ? `MC ${pump.curveMcSol(v.curve).toFixed(1)} SOL · complete ${v.curve.complete} · creator ${v.curve.creator.toBase58()} · creatorFeeBps ${v.curve.creatorFeeBps} · acct len ${v.curve.len} · solQuoted ${v.solQuoted}` : v.kind === "amm" ? `pool ${v.poolPk.toBase58()} base ${v.baseRes} quote ${v.quoteRes}` : v.reason);
  const pre = S.pub ? await userVolPrefix(v.kind === "curve" ? "curve" : "amm") : []; console.log(`user volume accumulator (${v.kind === "curve" ? "pump" : "amm"}): ${pre.length ? "missing — create instruction goes in front of the first buy" : "exists"}`);
  if (v.kind !== "none") for (const kind of v.kind === "curve" ? ["classic", "v3"] : ["amm", "amm2"]) {
    const b = buyIxs(v, user, lamports(stakeSol), CFG.SLIP_BUY, kind); const tx = await buildTx(user, wrap(user, [...pre, ...b.ixs], lamports(CFG.TIP_SOL), CFG.CU_PRICE)); const sim = await simulate(tx);
    console.log(`buy ${kind}: expected ${b.expected} tokens (min ${b.minOut}) feeBps ${b.feeBps} · sim ${sim.ok ? "OK" : "FAILED " + sim.err} · units ${sim.units} · ${sim.ms} ms`); if (!sim.ok) console.log("   logs:", sim.logs.slice(-6).join("\n         "));
    if (b.expected > 0n) { const sIx = sellIxs(v, user, b.expected, CFG.SLIP_SELL, kind); console.log(`sell ${kind}: ${b.expected} tokens → ${sol(sIx.expected).toFixed(5)} SOL expected (min ${sol(sIx.minOut).toFixed(5)}) — round trip ${((Number(sIx.expected) / lamports(stakeSol) - 1) * 100).toFixed(2)}% at an unmoved price`);
      // we hold no tokens, so the sell is simulated right behind the buy in one transaction: buy, then sell the minimum the buy guarantees
      const rt = sellIxs(v, user, b.minOut, CFG.SLIP_SELL, kind); const stx = await buildTx(user, wrap(user, [...pre, ...b.ixs, ...rt.ixs], lamports(CFG.TIP_SOL), CFG.CU_PRICE)); const ssim = await simulate(stx);
      console.log(`   buy+sell in one tx: ${ssim.ok ? "OK · units " + ssim.units : "FAILED " + ssim.err + " | " + ssim.logs.slice(-4).join(" | ")}`); }
  }
  console.log("rpc:", rpcStats); process.exit(0);
} else if (cmd === "orders") {
  for (const o of recentOrders(Number(process.argv[3] || 30)).reverse()) console.log(o.id, new Date(o.ts * 1000).toISOString().slice(11, 19), o.side, o.name, "|", o.status, o.skip_reason || "", o.venue || "", o.ix_kind || "", o.sim_ok == null ? "" : "sim " + o.sim_ok, o.sim_err ? String(o.sim_err).slice(0, 100) : "", o.from_trigger_ms != null ? o.from_trigger_ms + "ms" : "", o.quote_out ? "exp " + o.quote_out : "", o.fill_sol != null ? "sol " + (o.fill_sol / 1e9).toFixed(4) : "");
  process.exit(0);
} else if (cmd === "status") {
  loadWallet(); const bal = await balance(true); console.log(JSON.stringify({ mode: S.mode, strategy: S.strategy, exit: S.exit, stake: S.stake, wallet: S.pub?.toBase58() || null, balance: bal != null ? sol(bal) : null, open: openPositions(), lastOrders: recentOrders(10) }, null, 1)); process.exit(0);
} else {
  loadWallet();
  const sockPath = CFG.SMOKE ? join(EXEC_HOME, `smoke-${process.pid}.sock`) : CFG.SOCK;
  startSocket(sockPath);
  setInterval(housekeeping, 10_000); housekeeping();
  console.log(`[executor] v${VERSION} mode ${S.mode} · follows ${S.strategy} / exit ${S.exit} · stake ${S.stake} SOL · wallet ${S.pub ? S.pub.toBase58() : "none"} · rpc ${CFG.RPC_URL.replace(/api-key=.*/, "api-key=…")}`);
  if (CFG.SMOKE) setTimeout(() => { console.log("[smoke] executor alive — ok"); try { unlinkSync(sockPath); } catch {} process.exit(0); }, Number(process.env.EXEC_SMOKE_MS || 15000));
  // (no Telegram on boot — quiet by design; `/live` answers with the status whenever you want it)
  process.on("uncaughtException", (e) => { console.error("[uncaught]", e); log("uncaught", e.stack || e.message); });
  process.on("unhandledRejection", (e) => { console.error("[unhandled]", e); log("unhandled", e?.stack || String(e)); });
}
