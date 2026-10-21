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
import { getAccounts, getBalance, buildTx, simulate, send, sendUntilConfirmed, waitConfirm, readFill, blockHeight, signatureStatus, rpcStats, onAccount, offAccount } from "./rpc.mjs";
import { ata, parseTokenAccount, ixBudget, ixTip, ixTransfer, PK, PUMP, PUMP_AMM, TOKEN, WSOL } from "./solana.mjs";
import * as pump from "./pump.mjs";
import * as amm from "./amm.mjs";
import { db, newOrder, updOrder, openPosition, closePosition, openPositions, positionOf, positionsOf, hasPosition, dayNet, net24, londonDayStart, recentOrders, stats, log, pendingBuys, lastSellSig, recentClosed, skipSummary, totals } from "./book.mjs";

const VERSION = "0.4.16"; // v0.4.8 (owner go 21 Oct 13:50 UK): book BL (bundle launch, S8 fires, 40% trail from the peak); A5 and S10 off; AS stake back to 0.1 // books: each is (paper strategy, exit) — a trigger is bought once per switched-on book that follows its strategy, each leg sold on its own rule
const EXIT_NAMES = { h5: "B", flow4: "A", h3: "GR", tsl40: "BL" };
// wide = P5 Wide's EXTRA coins only (the $100K–$250K triggers, strategy p5w30): the rest of the paper Wide book is the Runner's coins, already traded by the runner book.
// strict = the 50 SOL trigger (p5e50): its own paper trade on a coin the runner may already hold, bought later and higher — a separate leg, a separate test.
// v0.3.4 (owner, 19 Oct 13:48 UK, on the 13:28 study's recommendation): F = A's trigger only when the launch bundle was ≤ 3 wallets (the study's F1: 33 trades
// +18.4% vs 67 at −9.0%); G = A's trigger on the coins the website skips for 150–500 wallets (26 trades said +13% to +36%). Both runner exit, both start in shadow.
// A book's `take(m)` says whether it wants a trigger; the website's pass flag is one input among others, so G can take what the page skips.
const passOk = (m) => m.pass !== false;
const BOOKS = { runner: { name: "A", strategy: "p5e30", exit: "flow4", take: passOk, rule: "30 SOL bought in 60 s, MC under $100K · runner exit" }, hold5: { name: "B", strategy: "p5e30", exit: "h5", take: passOk, rule: "30 SOL bought in 60 s, MC under $100K · hold-5 exit" },
  wide: { name: "C", strategy: "p5w30", exit: "flow4", take: passOk, rule: "same trigger and skips as A, MC $100K–$250K · runner exit" }, strict: { name: "D", strategy: "p5e50", exit: "flow4", take: passOk, rule: "50 SOL bought in 60 s, MC under $100K · runner exit" },
  small: { name: "F", strategy: "p5e30", exit: "flow4", take: (m) => passOk(m) && m.bundleWallets != null && m.bundleWallets <= 3, rule: "A's trigger and skips, only when the launch bundle was 3 wallets or fewer (the 13:28 study's F1) · runner exit" },
  crowd: { name: "G", strategy: "p5e30", exit: "h5", take: (m) => /wallets/.test(String(m.skipWhy || "")) && m.wal60 != null && m.wal60 <= 500, rule: "A's trigger on the coins the page skips for 150–500 wallets in the trigger minute · sold at 5 min (from 19 Oct 20:00 UK; the runner exit lost 0.38 SOL on 19 shadow trades, the 5-min sale was +20% on 36 paper)" },
  swarm: { name: "S9", strategy: "sn9", exit: "h5", take: () => true, rule: "Project S book S9: 20+ outside wallets each ≥ 0.3 SOL in a launch's first 60 s, bundle under 20% — bought at +60 s on the bonding curve, sold at 5 min (B's rule). The 15:40 launch study: 102 in 24 h, +46% mean / +11% median at 5 min, 54% winners" },
  dev: { name: "S1", strategy: "sn1", exit: "h5", take: () => true, rule: "Project S book S1: a creator with a record (≤ 30 launches, 2+ graduated or one over $100K, ≥ 10% of them) — bought on the first trade after the create block, sold at 5 min (B's rule)" },
  smart: { name: "S6", strategy: "sn6", exit: "flow4", take: () => true, rule: "Project S book S6: a GMGN smart wallet buys ≥ 0.2 SOL within 60 s — bought on that trade · runner exit (the one positive paper line at 15:19 UK: +14.7% avg on 42)" },
  copy: { name: "S3", strategy: "sn3", exit: "h5", take: () => true, rule: "Project S book S3: the same name as a coin that peaked ≥ $300K in the last 24 h — bought on the first trade after the create block, sold at 5 min (B's rule)" },
  clean: { name: "S4", strategy: "sn4", exit: "h5", take: () => true, rule: "Project S book S4: clean launch (bundle < 5%, dev 0.2–3 SOL, 10+ outside buyers and 5+ SOL within 15 s) — bought on that trade, sold at 5 min (B's rule). The one sniper book positive under every exit on the 17:05 data (+9.5% on 13 replayed)" },
  confirm: { name: "A5", strategy: "p5c5", exit: "flow4", take: passOk, rule: "A5: A's trigger, then wait 5 s and buy only if the price is still ≥ 1.02x the trigger price · runner exit (the 19:48 analysis: +4.4% a trade at real costs on 51 coins vs A's −1.7%; stops 25% vs 40%)" },
  op: { name: "S10", strategy: "sn10", exit: "h5", take: () => true, rule: "S10: one operator's launch fingerprint (10 bundle wallets, 37–41% of supply, 22–28 SOL, dev < 0.2 SOL; 14 of 14 went past $200K) — bought on the first outside trade, sold at 5 min. Shadow answers whether the launch price can be bought" },
  famous: { name: "S6b", strategy: "sn6b", exit: "h5", take: () => true, rule: "S6b: a smart wallet with 1,000+ GMGN followers buys in a launch's first 60 s — bought at our feed's price once the follower count is known, sold at 5 min. Shadow measures the real buy price on famous wallets' coins (S6's was 13% above paper)" },
  sn7b: { name: "S7b", strategy: "sn7b", exit: "h5", take: () => true, rule: "S7b: GMGN smart-money feed buy by a wallet with under 100 GMGN followers - bought at our feed price once the follower count is known, sold at 5 min. Shadow asks whether that price is buyable (paper, corrected: about -2% a trade on 31)" },
  grad: { name: "GR", strategy: "grf", exit: "h3", take: () => true, rule: "GR (revised 21 Oct 09:47 UK): thin graduations - under 156 buyers, graduated 10-185 s after launch - bought on the new pool; sold if the price 10 s after the buy is below the buy price, else at 3 min (floor 1.3x once 1.5x is seen, stop below 0.6x). A live book that loses over its last 20 live legs goes back to shadow by itself." },
  asoc: { name: "AS", strategy: "p5e30", exit: "flow4", take: (m) => passOk(m) && m.asStd === true, rule: "AS: A's trigger with the owner's standard filters - socials not known to be missing, the creator has not bought and sold out, the biggest buyer in the trigger minute put in 3-5 SOL · runner exit. The best paper book (+11.5% a trade on 78 to 21 Oct 00:59 UK); shadow measures its real fills before any money goes in" },
  gr2: { name: "GR2", strategy: "grf", exit: "tsl40", take: (m) => m.gr2 === true, rule: "GR2 (owner go 21 Oct 16:44 UK): GR's rule (thin graduation, under 156 buyers, 10-185 s) only when the coin was a bundle launch (70-80% of the supply over 4-10 wallets) - bought on the new pool, sold 40% below the running peak (max 6 h). Back-test 57 at +47.8% a trade (without top 3 +25.3%, 46% won); GR's other coins made nothing in the last day and a half. Shadow measures the trail's real fills" },
  bl: { name: "BL", strategy: "sn8", exit: "tsl40", take: (m) => m.bl === true, rule: "BL (owner go 21 Oct 13:50 UK): a launch whose bundle bought 70-80% of the supply over 4-10 wallets, first trade at $25K+ MC - bought on S8's first trade after +4 s; sold 40% below the running peak (max 6 h). Back-test 101 trades +32.9% a trade on paper, luck 0; shadow measures whether the curve price is buyable" } }; // v0.4.8 BL (owner go 21 Oct 13:50 UK) // v0.4.5 AS (owner, 21 Oct 01:19 UK) // v0.4.2 GR · v0.4.1 · v0.4.0 (owner, 19 Oct 19:56 UK) · v0.3.9 (owner, 19 Oct 17:11 UK): S3 and S4 into shadow; S1, S6, S9 back to paper // v0.3.7 (owner, 19 Oct 15:57 UK): S1 and S6 in shadow too // v0.3.6 (owner, 19 Oct 15:48 UK: "every new analysis, straight onto shadow") // one letter per book, the same as the website: A runner · B hold-5 · C wide (runner exit) · D strict (runner exit)
const BOOK_IDS = Object.keys(BOOKS);
const nowS = () => Math.floor(Date.now() / 1000);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const short = (m) => (m ? `${m.slice(0, 4)}…${m.slice(-4)}` : "?");

// ---- settings that can be changed from Telegram and survive restarts (mode, stake) ----
const OVR = join(EXEC_HOME, "overrides.json");
const ovr = (() => { try { return JSON.parse(readFileSync(OVR, "utf8")); } catch { return {}; } })();
const S = { mode: ovr.mode || CFG.MODE, stake: ovr.stake || CFG.STAKE_SOL, exit: ovr.exit || CFG.EXIT, strategy: ovr.strategy || CFG.STRATEGY, stoppedDay: null, stopOverrideDay: null, lastTracker: Date.now(), lastFeed: 0, kp: null, pub: null, balance: null, balanceT: 0, buying: { runner: 0, hold5: 0, wide: 0, strict: 0, small: 0, crowd: 0, swarm: 0, dev: 0, smart: 0, copy: 0, clean: 0, confirm: 0, op: 0, famous: 0, grad: 0, sn7b: 0, asoc: 0, bl: 0, gr2: 0 }, lags: [] };
// v0.2.1: each book has its own switch and stake (owner's controls on the wallet box) · v0.3.0: books are named and tied to a strategy
// v0.3.3: each book has its own MODE — off | shadow | live — so A can trade for real while C and D are simulated. The wallet-wide mode is derived from the books.
const MODES = ["off", "shadow", "live"];
S.books = (() => { const b = ovr.books || {}; const legacyMode = (on) => (!on ? "off" : S.mode === "live" ? "live" : S.mode === "shadow" ? "shadow" : "off");
  if (b.runner && b.hold5) { const out = {}; for (const k of BOOK_IDS) { const x = b[k] || (k === "small" || k === "crowd" || k === "swarm" || k === "dev" || k === "smart" || k === "copy" || k === "clean" || k === "confirm" || k === "op" || k === "famous" || k === "grad" || k === "gr2" || k === "sn7b" || k === "asoc" || k === "bl" ? { mode: "shadow", stake: k === "asoc" ? 0.1 : 0.05 } : { on: false, stake: 0.01 }); out[k] = { mode: MODES.includes(x.mode) ? x.mode : legacyMode(!!x.on), stake: x.stake || 0.01 }; } return out; } // v0.3.4: F and G start in shadow at 0.05
  // migrate the v0.2 shape ({flow4, h5}) or the single-exit setting; Wide and Strict start off at 0.01
  const f = b.flow4 || { on: S.exit === "both" || S.exit === "flow4", stake: S.stake }, h = b.h5 || { on: S.exit === "both" || S.exit === "h5", stake: S.stake };
  return { runner: { mode: legacyMode(!!f.on), stake: f.stake }, hold5: { mode: legacyMode(!!h.on), stake: h.stake }, wide: { mode: "off", stake: 0.01 }, strict: { mode: "off", stake: 0.01 }, small: { mode: "shadow", stake: 0.05 }, crowd: { mode: "shadow", stake: 0.05 }, swarm: { mode: "shadow", stake: 0.05 }, dev: { mode: "shadow", stake: 0.05 }, smart: { mode: "shadow", stake: 0.05 }, copy: { mode: "shadow", stake: 0.05 }, clean: { mode: "shadow", stake: 0.05 }, confirm: { mode: "shadow", stake: 0.05 }, op: { mode: "shadow", stake: 0.05 }, famous: { mode: "shadow", stake: 0.05 } }; })();
if (!ovr.m041) { if (S.books.famous) S.books.famous.mode = "shadow"; ovr.m041 = true; S.mig039 = true; } // v0.4.1 one-time: S6b in shadow
if (!ovr.m040) { for (const k of ["confirm", "op"]) if (S.books[k]) S.books[k].mode = "shadow"; ovr.m040 = true; S.mig039 = true; } // v0.4.0 one-time: A5 and S10 in shadow at 0.05
if (!ovr.m039) { for (const k of ["dev", "smart", "swarm"]) if (S.books[k]) S.books[k].mode = "off"; for (const k of ["copy", "clean"]) if (S.books[k]) S.books[k].mode = "shadow"; ovr.m039 = true; S.mig039 = true; } // v0.3.9 one-time: S1/S6/S9 back to paper, S3/S4 shadow (owner, 19 Oct 17:11 UK)
if (!ovr.m042) { for (const k of ["small", "crowd", "copy", "famous"]) if (S.books[k]) S.books[k].mode = "off"; for (const k of ["grad", "sn7b"]) { if (!S.books[k]) S.books[k] = { mode: "shadow", stake: 0.05 }; else S.books[k].mode = "shadow"; } ovr.m042 = true; S.mig039 = true; } // v0.4.2 one-time: F, G, S3, S6b back to paper (losing at real prices); GR and S7b into shadow (owner, 20 Oct)
if (!ovr.m045) { if (S.books.clean) S.books.clean.mode = "off"; ovr.m045 = true; S.mig039 = true; } // v0.4.7 one-time: S4 (clean) shadow off - the rule is being replaced; 217 real-quote legs -1.085 SOL (owner, 21 Oct 10:25 UK)
if (!ovr.m044) { if (!S.books.asoc) S.books.asoc = { mode: "shadow", stake: 0.1 }; else { S.books.asoc.mode = "shadow"; S.books.asoc.stake = 0.1; } ovr.m044 = true; S.mig039 = true; } // v0.4.5 one-time: AS into shadow at 0.1 SOL (owner, 21 Oct 01:19 UK)
if (!ovr.m043) { if (S.books.sn7b) S.books.sn7b.mode = "off"; ovr.m043 = true; S.mig039 = true; } // v0.4.3 one-time: S7b back to paper (41 shadow legs -0.553 SOL, win 20%; owner, 20 Oct 15:29 UK)
if (!ovr.m048) { S.books.gr2 = { ...(S.books.gr2 || {}), mode: "shadow", stake: 0.25 }; ovr.m048 = true; S.mig039 = true; } // v0.4.9b: m047 left the loader default of 0.05 in place when the book already existed; GR2 shadow is 0.25 like GR
if (!ovr.m047) { if (!S.books.gr2) S.books.gr2 = { mode: "shadow", stake: 0.25 }; else S.books.gr2.mode = "shadow"; ovr.m047 = true; S.mig039 = true; } // v0.4.9 one-time (owner go 21 Oct 16:44 UK): GR2 into shadow at 0.25 beside GR
if (!ovr.m046) { if (!S.books.bl) S.books.bl = { mode: "shadow", stake: 0.05 }; else S.books.bl.mode = "shadow"; for (const k of ["confirm", "op"]) if (S.books[k]) S.books[k].mode = "off"; if (S.books.asoc) S.books.asoc.stake = 0.1; ovr.m046 = true; S.mig039 = true; } // v0.4.8 one-time (owner go 21 Oct 13:50 UK): BL into shadow at 0.05; A5 and S10 off; AS back to 0.1 SOL (the 0.5 quoting was unintended)
const modeOf = (book) => S.books[book]?.mode || "off";
const booksOn = () => BOOK_IDS.filter((k) => modeOf(k) !== "off");
const booksLive = () => BOOK_IDS.filter((k) => modeOf(k) === "live");
const syncMode = () => { S.mode = booksLive().length ? "live" : booksOn().length ? "shadow" : "off"; }; // the wallet-wide word, for the page badge and old commands
syncMode();
const exitsActive = () => [...new Set(booksOn().map((k) => BOOKS[k].exit))]; // the exit rules any switched-on book uses
const stakeOf = (book) => Number(S.books[book]?.stake || S.stake);
const bookKey = (word) => ({ gr2: "gr2", bl: "bl", tsl40: "bl", as: "asoc", asoc: "asoc", gr: "grad", grad: "grad", s7b: "sn7b", sn7b: "sn7b", a: "runner", runner: "runner", flow4: "runner", b: "hold5", "hold-5": "hold5", hold5: "hold5", h5: "hold5", c: "wide", wide: "wide", d: "strict", strict: "strict", f: "small", small: "small", g: "crowd", crowd: "crowd", s9: "swarm", swarm: "swarm", s1: "dev", dev: "dev", s6: "smart", smart: "smart", s3: "copy", copy: "copy", s4: "clean", clean: "clean", a5: "confirm", confirm: "confirm", s10: "op", op: "op", s6b: "famous", famous: "famous" }[String(word || "").toLowerCase()] || null);
const STAKE_CHOICES = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1];
const syncExitWord = () => { const r = modeOf("runner") !== "off", h = modeOf("hold5") !== "off"; S.exit = r && h ? "both" : r ? "flow4" : h ? "h5" : "off"; syncMode(); };
const legKey = (paperId, exit) => `${paperId}:${exit}`;
const inflight = new Set();      // "mint:book" legs with a buy in progress (a book never buys the same coin twice at once; two books may buy it side by side)
const inflightKey = (mint, book) => `${mint}:${book}`, buyInFlight = (mint) => BOOK_IDS.some((b) => inflight.has(inflightKey(mint, b)));
const pendingExit = new Map();   // legKey -> { rule, mult } : an exit that arrived while the buy was still in flight
const needsSell = new Map();     // legKey -> { rule, mult, why } : legs that must be sold until they are
const sellFails = new Map();     // v0.4.15: legKey -> consecutive failed sell attempts; after 3 the retry cadence drops from 20 s to 10 min (each failed on-chain attempt still pays ~0.004 SOL in fees)
const selling = new Set();       // legKeys with a sell in progress
let housekeepingBusy = false;
const fallbackMin = (exit) => (exit === "flow4" || exit === "tsl40" ? CFG.FALLBACK_SELL_MIN_FLOW4 : exit === "h3" ? 5 : CFG.FALLBACK_SELL_MIN_H5); // v0.4.8: a BL trail leg may hold up to 6 h, so it gets the runner's fallback // v0.4.2: GR sells at 3 min - by 5 regardless
const feedLagAvg = () => (S.lags.length ? S.lags.reduce((a, b) => a + b, 0) / S.lags.length : 0);
const saveOvr = () => { try { writeFileSync(OVR, JSON.stringify({ mode: S.mode, stake: S.stake, exit: S.exit, strategy: S.strategy, books: S.books, m039: true, m040: true, m041: true, m042: true, m043: true, m044: true, m045: true, m046: true, m047: true, m048: true })); } catch {} };
if (S.mig039) { syncMode(); saveOvr(); }

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
  // v0.4.11 (owner go 21 Oct 18:21 UK: "reduce the transaction time"): ONE round trip for curve, mint, global, the migrated pool, its config and both reserve accounts (the pool's token accounts are
  // its ATAs for mint and WSOL) instead of three in sequence; a second read only when the pool is not the migrated one or its accounts differ. Live GR buys were 1.5 s from trigger to fill with ~1.0 s of preparation.
  const mint = PK(mintStr), curvePk = pump.curveOf(mint), poolPk0 = amm.migratedPoolOf(mint), guessBase = ata(poolPk0, mint, TOKEN), guessQuote = ata(poolPk0, WSOL, TOKEN);
  let [curveAcc, mintAcc, globalAcc, poolAcc, cfgAcc, baseAcc, quoteAcc] = await getAccounts([curvePk, mint, pump.GLOBAL, poolPk0, amm.GLOBAL_CONFIG, guessBase, guessQuote]);
  if (globalAcc) globalCache = pump.decodeGlobal(globalAcc.data) || globalCache;
  const tokenProgram = pump.tokenProgramOf(mintAcc?.owner);
  const curve = curveAcc ? pump.decodeCurve(curveAcc.data) : null;
  if (curve && !curve.complete) return { kind: "curve", mint, curve, tokenProgram, global: globalCache, curvePk, solQuoted: curve.solQuoted };
  let poolPk = poolPk0;
  if (cfgAcc) cfgCache = amm.decodeGlobalConfig(cfgAcc.data) || cfgCache;
  // at today's SOL price the curve completes at ≈ $40K — right where Project 5 buys — so the trigger often lands in the seconds between
  // the curve filling and pump.fun creating the pool. Wait for it (up to `waitMs`), then try DexScreener's pair address as a last resort.
  const t0 = Date.now(); let waited = 0;
  while (!poolAcc && curve && Date.now() - t0 < waitMs) { await new Promise((r) => setTimeout(r, 250)); waited++; [poolAcc, baseAcc, quoteAcc] = await getAccounts([poolPk, guessBase, guessQuote]); }
  if (!poolAcc && curve) { try { const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintStr}`, { signal: AbortSignal.timeout(2500) }); const j = await r.json();
    const pair = (j.pairs || []).find((p) => p.chainId === "solana" && /pumpswap/i.test(p.dexId || "")); if (pair?.pairAddress) { poolPk = PK(pair.pairAddress); [poolAcc] = await getAccounts([poolPk]); baseAcc = quoteAcc = null; } } catch {} }
  const pool = poolAcc ? amm.decodePool(poolAcc.data) : null;
  if (!pool) return { kind: "none", mint, curve, tokenProgram, reason: curve ? `curve complete, pool not there after ${((Date.now() - t0) / 1000).toFixed(1)} s (migration pending)` : "no bonding curve for this mint" };
  if (!baseAcc || !quoteAcc || !pool.baseAcc.equals(guessBase) || !pool.quoteAcc.equals(guessQuote)) [baseAcc, quoteAcc] = await getAccounts([pool.baseAcc, pool.quoteAcc]);
  const baseRes = parseTokenAccount(baseAcc?.data)?.amount ?? 0n, quoteRes = parseTokenAccount(quoteAcc?.data)?.amount ?? 0n;
  return { kind: "amm", mint, pool, poolPk, cfg: cfgCache, tokenProgram, baseRes, quoteRes, curve, waited };
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
function sellIxs(v, user, amount, slip, kind = "classic", close = true) { // close=false when another leg still holds this coin (closing a non-empty token account fails the whole transaction)
  if (v.kind === "curve") {
    const q = pump.quoteSell(v.curve, v.global, amount), minSol = (q.sol * BigInt(Math.round((1 - slip) * 10000))) / 10000n;
    const f = kind === "v3" ? pump.ixSellV3 : pump.ixSellClassic;
    return { ixs: f({ user, mint: v.mint, curve: v.curve, global: v.global, tokenProgram: v.tokenProgram, amount, minSol, close }), expected: q.sol, minOut: minSol, ixKind: kind };
  }
  const q = amm.quoteSell(v.pool, v.cfg, v.baseRes, v.quoteRes, amount), minSol = (q.sol * BigInt(Math.round((1 - slip) * 10000))) / 10000n;
  const f = kind === "amm" ? amm.ixSell : amm.ixSellV2;
  return { ixs: f({ user, poolPk: v.poolPk, pool: v.pool, cfg: v.cfg, baseTokenProgram: v.tokenProgram, amount, minSol, close }), expected: q.sol, minOut: minSol, ixKind: kind === "amm" ? "amm" : "amm2" };
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
  if (!BOOK_IDS.some((k) => BOOKS[k].strategy === m.strategy)) return; // not a strategy any book follows
  if (/^sn\d+b?$/.test(m.strategy) && !BOOK_IDS.some((k) => BOOKS[k].strategy === m.strategy && modeOf(k) !== "off" && BOOKS[k].take(m))) return; // v0.4.8: + take — every S8 fire now arrives and only the BL ones are wanted; the rest are not skip rows // v0.3.9: a sniper book on paper — the tracker still sends its triggers; nothing to record here
  const t0 = Date.now(), fromTrig = () => Date.now() - (m.wall0 || t0);
  const skip = (why, book = null) => { newOrder({ side: "buy", paper_id: m.id, exit: book ? BOOKS[book].exit : null, book, mint: m.mint, name: m.name, strategy: m.strategy, status: "skipped", skip_reason: why, stake_lamports: lamports(book ? stakeOf(book) : S.stake), from_trigger_ms: fromTrig() }); log("skip", `${m.name}${book ? " [" + BOOKS[book].name + "]" : ""} ${why}`); };
  if (m.lagMs != null) { S.lags.push(m.lagMs); if (S.lags.length > 10) S.lags.shift(); }
  if (!booksOn().length) return skip("every book is off");
  if (m.lagMs != null && m.lagMs > CFG.FEED_BACKLOG_MS) return skip(`feed ${(m.lagMs / 1000).toFixed(0)} s behind (tracker catching up)`); // v0.1.3: a 33 s lag after a tracker restart put a paper buy on a stale price (peeled potato, 18 Oct)
  if (!BOOK_IDS.some((k) => BOOKS[k].strategy === m.strategy && modeOf(k) !== "off" && BOOKS[k].take(m))) return skip(m.pass === false ? `paper skip: ${m.skipWhy || "filter"}` : "no switched-on book takes it"); // v0.3.4: each book decides (A–D take the page's passes; F needs a small bundle; G takes the 150–500-wallet skips)
  // feed lag is recorded, not acted on: block timestamps run 2–5 s behind the wall clock on Solana, so the number is a trend, not a delay (shadow 18 Oct: it tripped on a healthy feed). The trigger-age check below is the real guard.
  if (fromTrig() > CFG.TRIGGER_MAX_AGE_MS) return skip(`trigger ${fromTrig()} ms old`);
  if (m.venue && !/pump|pumpswap/i.test(m.venue)) return skip(`venue ${m.venue} not handled yet`);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }), day = dayNet("live"); // UK day, like the box; the stop counts every live book together and only stops live legs — shadow legs carry on
  const stopStake = Math.max(...booksLive().map(stakeOf), 0.01); // the brake scales with the biggest live stake in play
  const stopped = booksLive().length > 0 && S.stopOverrideDay !== today && day.n <= -lamports(stopStake) * CFG.DAILY_STOP_STAKES;
  if (stopped && S.stoppedDay !== today) { S.stoppedDay = today; tg(`⛔ <b>Daily stop</b> — ${sol(day.n).toFixed(3)} SOL today over ${day.c} live trades. No more live buys until tomorrow (shadow books carry on). <code>/live on</code> re-arms it for today.`); }
  if (!S.pub) return skip("no wallet yet");
  const candidates = BOOK_IDS.filter((k) => BOOKS[k].strategy === m.strategy);
  if (!candidates.some((k) => modeOf(k) !== "off")) return skip(`no book switched on for ${m.strategy}`);
  // which books take this coin? reserve their slots BEFORE anything awaits, so two triggers in one burst cannot both pass the cap
  const legs = [];
  for (const book of candidates) {
    if (modeOf(book) === "off" || !BOOKS[book].take(m)) continue;
    if (stopped && modeOf(book) === "live") { skip("daily stop", book); continue; }
    if (inflight.has(inflightKey(m.mint, book))) { skip("buy already in flight for this coin", book); continue; }
    if (hasPosition(m.mint, book)) { skip("already holding", book); continue; }
    { const other = legs.find((b) => BOOKS[b].exit === BOOKS[book].exit) || (positionOf(m.id, BOOKS[book].exit) ? "held" : null); if (other) { skip(`this coin's ${BOOKS[book].exit} slot is already taken by ${other === "held" ? "another book" : BOOKS[other].name} (one position per trade and exit)`, book); continue; } } // v0.4.0: positions are keyed (paper id, exit) — A and F both sell on the runner, so with both on, the second would overwrite the first
    if (openPositions(book).length + S.buying[book] >= CFG.MAX_OPEN) { skip(`${openPositions(book).length + S.buying[book]} positions open (cap ${CFG.MAX_OPEN} per book)`, book); continue; }
    legs.push(book); S.buying[book]++; inflight.add(inflightKey(m.mint, book));
  }
  if (!legs.length) return;
  try {
    const liveLegs = legs.filter((b) => modeOf(b) === "live"), need = liveLegs.reduce((a, x) => a + lamports(stakeOf(x)), 0); // shadow legs spend nothing (the simulation only needs the wallet to hold the stake)
    const [bal, v] = await Promise.all([balance(), venueOf(m.mint)]); const tVenue = Date.now() - t0; // v0.4.11: balance and venue read together, not one after the other
    if (need > 0 && bal != null && bal < need + lamports(0.02)) { for (const book of legs) skip(`balance ${sol(bal).toFixed(3)} SOL below ${sol(need).toFixed(2)} (the ${liveLegs.length > 1 ? liveLegs.length + " live books' stakes" : "live stake"}) + fees`, book); return; }
    if (v.kind === "none") { for (const book of legs) skip(v.reason, book); return; }
    if (v.kind === "curve" && !v.solQuoted) { for (const book of legs) skip("curve not SOL-quoted", book); return; }
    const pre = await userVolPrefix(v.kind);
    // one transaction per leg, built and sent together. Each book's tip differs by a lamport so the signatures differ (an identical message would be the same transaction).
    await Promise.all(legs.map((book, i) => buyLeg(m, book, i, v, lamports(stakeOf(book)), pre, tVenue, fromTrig).catch((e) => { console.error("[buy]", e); log("buy-error", `${m.name} [${BOOKS[book].name}]: ${e.message}`); newOrder({ side: "buy", paper_id: m.id, exit: BOOKS[book].exit, book, mint: m.mint, name: m.name, strategy: m.strategy, status: "error", skip_reason: String(e.message).slice(0, 200), stake_lamports: lamports(stakeOf(book)), from_trigger_ms: fromTrig() }); })));
  } finally { for (const book of legs) { S.buying[book] = Math.max(0, S.buying[book] - 1); inflight.delete(inflightKey(m.mint, book)); } }
}
async function buyLeg(m, book, legIndex, v, stake, pre, tVenue, fromTrig, retried = false) {
  const exit = BOOKS[book].exit, tip = lamports(CFG.TIP_SOL) + BOOK_IDS.indexOf(book), tag = BOOKS[book].name, mode = modeOf(book); // this leg's own mode: shadow legs simulate, live legs sign and send // the tip differs by book (1 lamport each) so two books' buys of one coin are never the same transaction — even at the same stake, from different triggers
  let b = buyIxs(v, S.pub, stake, CFG.SLIP_BUY, v.kind === "amm" ? "amm" : "v3"); // curve: v3 first (simulated clean on a mayhem coin, 18 Oct); pool: classic first
  if (!(b.minOut > 0n)) { newOrder({ side: "buy", paper_id: m.id, exit, book, mint: m.mint, name: m.name, strategy: m.strategy, status: "skipped", skip_reason: "quote gave a zero minimum — pool state unreadable", stake_lamports: stake, from_trigger_ms: fromTrig() }); return; }
  const id = newOrder({ side: "buy", paper_id: m.id, exit, book, mint: m.mint, name: m.name, strategy: m.strategy, venue: v.kind, ix_kind: b.ixKind, stake_lamports: stake, slippage: CFG.SLIP_BUY, quote_out: b.expected, min_out: b.minOut, tip_lamports: tip, cu_price: CFG.CU_PRICE,
    from_trigger_ms: fromTrig(), detail: { paperPrice: m.price, paperMc: m.mc, lagMs: m.lagMs ?? null, bundle: m.bundle ?? null, wal60: m.wal60 ?? null, feeBps: b.feeBps, tVenueMs: tVenue, curveMcSol: v.curve ? +pump.curveMcSol(v.curve).toFixed(1) : null } });
  let tx = await buildTx(S.pub, wrap(S.pub, [...pre, ...b.ixs], tip, CFG.CU_PRICE));
  // shadow always simulates; live simulates unless EXEC_SIM_BEFORE_SEND=0. A program refusal on the classic instruction → try the other form once (v3 on the curve, IDL-v2 on the pool)
  const myAta = ata(S.pub, v.mint, v.tokenProgram); // watched through the simulation: its post-state balance is the fill the chain would really give (our quote can be off — reserves and fees change under us)
  let sim = mode === "live" && !CFG.SIM_BEFORE_SEND ? { ok: true, err: null, logs: [], units: null, ms: 0, skipped: true, post: [] } : await simulate(tx, [myAta]);
  if (progErr(sim)) { const altKind = v.kind === "curve" ? "classic" : "amm2"; const b3 = buyIxs(v, S.pub, stake, CFG.SLIP_BUY, altKind); const tx3 = await buildTx(S.pub, wrap(S.pub, [...pre, ...b3.ixs], tip, CFG.CU_PRICE)); const sim3 = await simulate(tx3, [myAta]);
    updOrder(id, { detail: { firstKind: b.ixKind, firstErr: sim.err, firstLogs: sim.logs.slice(-4) } }); if (sim3.ok || !progErr(sim3)) { b = b3; tx = tx3; sim = sim3; } }
  updOrder(id, { ix_kind: b.ixKind, quote_out: b.expected, min_out: b.minOut, sim_ok: sim.ok ? 1 : 0, sim_err: sim.err, sim_units: sim.units, sim_ms: sim.ms, status: sim.ok ? "simulated" : "sim-failed" });
  if (!sim.ok) { log("sim-fail", `${m.name} [${tag}] ${b.ixKind}: ${sim.err} | ${sim.logs.slice(-3).join(" | ")}`);
    // v0.4.6 (owner go 21 Oct 09:40 UK): a graduation bought before its new pool exists fails with AccountNotInitialized (8 GR misses by 21 Oct) - wait 1.5 s, read the pool again, try once more
    if (!retried && book === "grad" && /AccountNotInitialized|3012/.test(JSON.stringify(sim.err ?? "") + " " + sim.logs.join(" "))) { await new Promise((r) => setTimeout(r, 1500)); const v2 = await venueOf(m.mint).catch(() => ({ kind: "none" })); if (v2.kind !== "none") { log("retry", `${m.name} [${tag}] pool not ready - retried after 1.5 s`); return buyLeg(m, book, legIndex, v2, stake, await userVolPrefix(v2.kind), tVenue, fromTrig, true); } }
    return; }
  if (mode !== "live") { // shadow: the chain's simulated fill is the fill (falls back to our quote if the post-state was not returned)
    const simTok = parseTokenAccount(sim.post?.[0])?.amount ?? null; const got = simTok != null && simTok > 0n ? simTok : b.expected; const off = simTok != null && simTok > 0n ? Number(simTok) / Number(b.expected) - 1 : null;
    if (off != null && Math.abs(off) > 0.05) log("quote-off", `${m.name} ${b.ixKind}: our quote ${b.expected} vs chain ${simTok} (${(off * 100).toFixed(1)}%)`);
    const costAll = stake + tip + 5000; // the buy's tip and network fee count against the trade, as the sell's already do
    openPosition.run({ paper_id: m.id, exit, book, mint: m.mint, name: m.name, strategy: m.strategy, mode: "shadow", opened_ts: nowS(), tokens: Number(got), cost_lamports: costAll, buy_order: id, venue: v.kind, ix_kind: b.ixKind, paper_entry_price: m.price });
    updOrder(id, { status: "shadow-filled", fill_tokens: Number(got), fill_sol: -costAll, from_trigger_ms: fromTrig(), detail: { paperPrice: m.price, paperMc: m.mc, lagMs: m.lagMs ?? null, bundle: m.bundle ?? null, wal60: m.wal60 ?? null, feeBps: b.feeBps, tVenueMs: tVenue, quoteTokens: Number(b.expected), simTokens: simTok == null ? null : Number(simTok), quoteOff: off } }); afterOpen(m.id, exit); return;
  }
  // live: sign; the signature is on record BEFORE the first send, so a buy that lands late (or after a crash) is found by the reconciler and never left unmanaged.
  tx.sign([S.kp]); const sig = bs58.encode(tx.signatures[0]);
  updOrder(id, { sig, status: "sent", detail: { lastValidBlockHeight: tx.lastValidBlockHeight, mint: m.mint, expected: String(b.expected), paperPrice: m.price } });
  // the only retry is re-sending the SAME transaction (a second, different buy could land too → bought twice). Not landed in 18 s → pending; the reconciler watches it until its blockhash expires.
  const c = await sendUntilConfirmed(tx, 18000); updOrder(id, { via: c.via, send_ms: c.ms });
  if (c.status === "failed") { updOrder(id, { status: "failed", sim_err: c.err }); log("buy-fail", `${m.name} [${tag}] failed ${c.err || ""}`); tg(`⚠️ buy failed — ${esc(m.name)} [${tag}] <code>${esc(c.err || "").slice(0, 120)}</code>`); return; }
  if (c.status !== "confirmed") { updOrder(id, { status: "pending" }); log("buy-pending", `${m.name} [${tag}] not landed in 18 s — watching the signature`); tg(`⏳ buy not landed in 18 s — ${esc(m.name)} [${tag}]. No second attempt (by design); if it lands late it is picked up and managed.`); return; }
  await bookBuy(id, book, sig, m, b, v, stake, c.slot, fromTrig());
}
/** A confirmed live buy becomes a position (real fill from the chain). Shared by the normal path and the reconciler. */
async function bookBuy(id, book, sig, m, b, v, stake, slot, fromTrigMs) {
  const exit = BOOKS[book].exit;
  const fill = await readFill(sig, S.pub, PK(m.mint)).catch(() => null);
  // several legs land in the same slot: each leg's fill is read from its own transaction, so the tokens it bought are its own
  const tokens = fill?.tokenDelta ?? Number(b.expected), spent = fill ? -fill.solDelta : stake;
  openPosition.run({ paper_id: m.id, exit, book, mint: m.mint, name: m.name, strategy: m.strategy, mode: "live", opened_ts: nowS(), tokens, cost_lamports: spent, buy_order: id, venue: v.kind, ix_kind: b.ixKind, paper_entry_price: m.price });
  updOrder(id, { status: "confirmed", confirm_slot: slot, fill_tokens: tokens, fill_sol: -spent, fee: fill?.fee ?? null, from_trigger_ms: fromTrigMs });
  const livePx = tokens > 0 ? (spent / 1e9) / (tokens / 1e6) : null; // SOL per whole token (6 decimals), same unit as the paper price
  const gap = livePx && m.price ? ((livePx / m.price) - 1) * 100 : null;
  tg(`🟢 <b>BOUGHT</b> ${esc(m.name)} [${BOOKS[book].name}] — ${sol(spent).toFixed(4)} SOL incl. fees · ${(fromTrigMs / 1000).toFixed(1)} s after the trigger${gap != null ? ` · ${gap >= 0 ? "+" : ""}${gap.toFixed(1)}% vs paper price` : ""} · ${v.kind}/${b.ixKind}${fill ? "" : " · fill not read yet"}\n<code>${sig}</code>`);
  try { const q = positionOf(m.id, exit); if (q) await watchPosition(q, v); } catch (e) { log("watch-error", `${m.name}: ${e.message}`); } // v0.4.12 local stops
  afterOpen(m.id, exit);
}
/** An exit that arrived while the buy was in flight is acted on the moment the position exists. */
function afterOpen(paperId, exit) { const k = legKey(paperId, exit), pe = pendingExit.get(k); if (!pe) return; pendingExit.delete(k); needsSell.set(k, pe); const p = positionOf(paperId, exit); if (p && p.status === "open") sellPosition(p, pe.rule, pe.mult, pe.why || "exit arrived during the buy").catch(() => {}); }
/** Live buys that did not confirm inside 18 s: landed late → book them; blockhash expired without landing → closed as 'expired'. Runs every housekeeping tick and at startup. */
async function reconcilePending() {
  const rows = pendingBuys(); if (!rows.length) return; let height = null;
  for (const o of rows) {
    try {
      if (!o.sig) { updOrder(o.id, { status: "error", skip_reason: "no signature recorded" }); continue; }
      const st = await signatureStatus(o.sig); let d = {}; try { d = JSON.parse(o.detail || "{}"); } catch {}
      if (st.status === "confirmed") {
        const book = o.book || (o.exit === "flow4" ? "runner" : "hold5"), exit = BOOKS[book].exit;
        if (positionOf(o.paper_id, exit)?.status) { updOrder(o.id, { status: "confirmed", confirm_slot: st.slot }); continue; }
        const m = { id: o.paper_id, mint: o.mint, name: o.name, strategy: o.strategy, price: d.paperPrice ?? null };
        await bookBuy(o.id, book, o.sig, m, { expected: BigInt(d.expected || 0), ixKind: o.ix_kind }, { kind: o.venue }, o.stake_lamports, st.slot, o.from_trigger_ms || 0); log("reconciled", `${o.name} landed late — booked`);
      } else if (st.status === "failed") { updOrder(o.id, { status: "failed", sim_err: st.err }); }
      else { height ??= await blockHeight(); if (d.lastValidBlockHeight && height > d.lastValidBlockHeight + 5) { updOrder(o.id, { status: "expired" }); log("expired", `${o.name} never landed`); } }
    } catch (e) { console.error("[reconcile]", e.message); }
  }
}

// ---- the sell ----
const sellTry = new Map(); // legKey -> last attempt ms (a sell that will not land is retried every 20 s, not every tick)
// ---- v0.4.12 local stops (owner, 21 Oct 18:27 UK: "we need a faster way to buy and sell") ----
// Every live h3 / tsl40 leg is watched on-chain by the executor itself: the bonding curve account (curve coins) or the pool's two reserve accounts (PumpSwap),
// pushed at 'processed' commitment. The stop fires here the moment the price crosses it - no tracker lag, no message hop. h3 legs (GR): stop at 0.6x the entry
// price, as the rule says; tsl40 legs (BL, GR2): 40% below the running peak, entry counting as the first peak. Profit exits (floor, 3-min, time) still come from the tracker.
const LOCAL_STOP_EXITS = new Set(["h3", "tsl40"]), watching = new Map(); // legKey -> { subs, entry, peak, px, fired, base, quote }
const spotCurve = (c) => (c && Number(c.vTok) > 0 ? Number(c.vSol) / Number(c.vTok) : null), spotPool = (q, b) => (b > 0 ? q / b : null);
function unwatch(k) { const w = watching.get(k); if (!w) return; watching.delete(k); for (const id of w.subs) offAccount(id); }
async function watchPosition(p, v) {
  const k = legKey(p.paper_id, p.exit); if (watching.has(k) || p.mode !== "live" || !LOCAL_STOP_EXITS.has(p.exit) || !v || v.kind === "none") return;
  if ((v.kind === "curve" && !v.curvePk) || (v.kind === "amm" && !v.pool)) { v = await venueOf(p.mint).catch(() => null); if (!v || v.kind === "none" || (v.kind === "amm" && !v.pool)) return; } // the reconciler passes a bare venue; read the real one
  const w = { subs: [], entry: null, peak: null, px: null, fired: false, base: Number(v.baseRes || 0), quote: Number(v.quoteRes || 0), kind: v.kind, t0: Date.now(), ticks: 0 };
  const check = (px, slot) => { if (!(px > 0) || w.fired) return; w.px = px; w.ticks++; if (w.entry == null) w.entry = px; if (w.peak == null || px > w.peak) w.peak = px;
    const level = p.exit === "h3" ? 0.6 * w.entry : 0.6 * w.peak; if (px <= level) { w.fired = true; const mult = px / w.entry; log("stop-local", `${p.name} [${BOOKS[p.book]?.name || p.exit}] ${mult.toFixed(3)}x of entry (peak ${(w.peak / w.entry).toFixed(2)}x) after ${((Date.now() - w.t0) / 1000).toFixed(1)} s, ${w.ticks} ticks, slot ${slot ?? "?"}`);
      const q = positionOf(p.paper_id, p.exit); if (q && q.status === "open") sellPosition(q, "stop-local", mult, "stop").catch((e) => log("stop-local-error", `${p.name}: ${e.message}`)); } };
  if (v.kind === "curve") { w.entry = spotCurve(v.curve); w.peak = w.entry; w.subs.push(onAccount(v.curvePk, (data, slot) => { const c = pump.decodeCurve(data); if (c) check(spotCurve(c), slot); })); }
  else { w.entry = spotPool(w.quote, w.base); w.peak = w.entry;
    w.subs.push(onAccount(v.pool.baseAcc, (data, slot) => { const a = parseTokenAccount(data)?.amount; if (a != null) { w.base = Number(a); check(spotPool(w.quote, w.base), slot); } }));
    w.subs.push(onAccount(v.pool.quoteAcc, (data, slot) => { const a = parseTokenAccount(data)?.amount; if (a != null) { w.quote = Number(a); check(spotPool(w.quote, w.base), slot); } })); }
  watching.set(k, w);
}
async function sellPosition(p, rule, paperMult = null, why = null) {
  if (!S.pub) return; const t0 = Date.now(), mint = PK(p.mint), k = legKey(p.paper_id, p.exit), tag = BOOKS[p.book]?.name || EXIT_NAMES[p.exit] || p.exit;
  if (selling.has(k)) return; if (Date.now() - (sellTry.get(k) || 0) < 20_000) return; sellTry.set(k, Date.now()); selling.add(k);
  needsSell.set(k, { rule, mult: paperMult, why });
  const done = (sellOrder, proceeds, status = "closed") => { unwatch(k); sellFails.delete(k); closePosition.run({ paper_id: p.paper_id, exit: p.exit, sell_order: sellOrder, closed_ts: nowS(), proceeds_lamports: proceeds, pnl_lamports: proceeds - p.cost_lamports, exit_rule: rule, paper_exit_mult: paperMult, status }); needsSell.delete(k); };
  try {
    const v = await venueOf(p.mint); if (v.kind === "none") { log("sell-novenue", `${p.name}: ${v.reason}`); return; }
    const isStop = paperMult != null && paperMult < 1, slip = isStop ? CFG.SLIP_STOP : CFG.SLIP_SELL;
    const urgent = isStop || why === "10s", sTip = lamports(urgent ? CFG.TIP_RETRY_SOL : CFG.TIP_SOL), sCu = urgent ? CFG.CU_PRICE_RETRY : CFG.CU_PRICE; // v0.4.11: a stop sells into a dump - pay the retry-grade tip and priority fee on the FIRST attempt (live stops filled 22% under paper at 0.8-5.7 s to land)
    // the other book may still hold this coin: sell only this leg's tokens and leave the token account open for it
    const otherLegHolds = openPositions().some((q) => q.mode === p.mode && q.mint === p.mint && !(q.paper_id === p.paper_id && q.exit === p.exit)); // v0.3.3: only legs of the same mode count — a shadow leg holds no real tokens, so a live sell next to it still closes the account (and the rent comes back)
    let amount = BigInt(p.tokens || 0);
    if (p.mode === "live") { const [acc] = await getAccounts([ata(S.pub, mint, v.tokenProgram)]); const held = parseTokenAccount(acc?.data)?.amount ?? 0n; amount = otherLegHolds ? (held < amount ? held : amount) : held;
      if (amount === 0n) { // nothing in the wallet: an earlier sell landed after we stopped watching it — read its real proceeds rather than book a total loss
        const prev = lastSellSig(p.paper_id, p.exit); const f = prev?.sig ? await readFill(prev.sig, S.pub, mint).catch(() => null) : null;
        if (f && f.tokenDelta < 0) { done(prev.id, f.solDelta); updOrder(prev.id, { status: "confirmed", fill_sol: f.solDelta, fill_tokens: f.tokenDelta, fee: f.fee }); log("sell-late", `${p.name} [${tag}]: earlier sell had landed, booked ${sol(f.solDelta).toFixed(4)} SOL`); }
        else { done(null, 0); log("sell-empty", `${p.name} [${tag}]: no tokens in wallet and no sell found — booked as lost`); tg(`⚠️ ${esc(p.name)} [${tag}]: wallet holds none of this coin and no sell of ours landed — booked as a full loss. Check the wallet on Solscan.`); }
        return; } }
    const ixKind = v.kind === "amm" ? "amm" : (p.ix_kind === "v3" ? "v3" : "classic"), closeAta = !otherLegHolds; // v0.4.16: a pool sale always starts from the classic AMM form - the v2 form fails 6027; a coin bought on the curve (ix_kind v3) that graduated while held used to be sent v2 (Catzo, 21 Oct 22:48 UK)
    let sIx = sellIxs(v, S.pub, amount, slip, ixKind, closeAta);
    const id = newOrder({ side: "sell", paper_id: p.paper_id, exit: p.exit, book: p.book, mint: p.mint, name: p.name, strategy: p.strategy, rule, venue: v.kind, ix_kind: sIx.ixKind, amount_tokens: Number(amount), slippage: slip, quote_out: sIx.expected, min_out: sIx.minOut, tip_lamports: sTip, cu_price: sCu, detail: { why, paperMult, closeAta, urgent } });
    if (p.mode !== "live") { // shadow: the quote at this moment is the fill (a sell cannot be simulated without holding the tokens)
      const proceeds = Number(sIx.expected) - lamports(CFG.TIP_SOL) - 10000;
      done(id, proceeds); updOrder(id, { status: "shadow-filled", fill_sol: proceeds, fill_tokens: -Number(amount) }); return;
    }
    let tx = await buildTx(S.pub, wrap(S.pub, sIx.ixs, sTip, sCu)); let sim = await simulate(tx); // v0.4.15: every sell simulates again (v0.4.12 had skipped it for urgent sells; a sell that fails on-chain still pays its fees, and a retry loop of those burnt ~0.5 SOL on Catzo, 21 Oct 22:48-23:20 UK)
    if (progErr(sim)) { const altKind = v.kind === "amm" ? (sIx.ixKind === "amm" ? "amm2" : "amm") : (sIx.ixKind === "v3" ? "classic" : "v3"); const alt = sellIxs(v, S.pub, amount, slip, altKind, closeAta); const tx2 = await buildTx(S.pub, wrap(S.pub, alt.ixs, sTip, sCu)); const sim2 = await simulate(tx2); if (sim2.ok) { sIx = alt; tx = tx2; sim = sim2; } }
    updOrder(id, { ix_kind: sIx.ixKind, sim_ok: sim.ok ? 1 : 0, sim_err: sim.err, sim_units: sim.units, sim_ms: sim.ms });
    // a failed simulation on a sell is not a reason to hold a dumping coin: send anyway with the stop slippage
    if (!sim.ok) { log("sell-simfail", `${p.name} [${tag}]: ${sim.err} | ${sim.logs.slice(-3).join(" | ")}`);
      if (progErr(sim) && !/TooLittleSolReceived|6003|slippage/i.test(JSON.stringify(sim.err ?? "") + sim.logs.join(" "))) { // v0.4.15: a program refusal that is not slippage will fail on-chain too - don't pay to find out; count it and back off
        const f = (sellFails.get(k) || 0) + 1; sellFails.set(k, f); updOrder(id, { status: "sim-failed", sim_err: sim.err, detail: { why, paperMult, closeAta, urgent, logs: sim.logs.slice(-6), fails: f } });
        if (f === 1 || f === 3 || f % 20 === 0) tg(`⚠️ ${esc(p.name)} [${tag}]: the sale is refused by the program (${esc(String(sim.err)).slice(0, 80)}) - attempt ${f}; not sent, no fee paid. Retrying ${f >= 3 ? "every 10 min" : "in 20 s"}; <code>/live sell ${p.paper_id} ${p.exit}</code> forces one.`);
        if (f >= 3) sellTry.set(k, Date.now() + 580_000); return; }
      if (slip < CFG.SLIP_STOP) { sIx = sellIxs(v, S.pub, amount, CFG.SLIP_STOP, sIx.ixKind, closeAta); tx = await buildTx(S.pub, wrap(S.pub, sIx.ixs, sTip, sCu)); } }
    tx.sign([S.kp]); const sigs = [bs58.encode(tx.signatures[0])]; updOrder(id, { sig: sigs[0], status: "sent" });
    let c = await sendUntilConfirmed(tx, 12000); let s = { sig: c.sig, via: c.via }; updOrder(id, { via: c.via, send_ms: c.ms });
    for (let attempt = 0; attempt < 3 && c.status !== "confirmed"; attempt++) { // sells keep trying: fresh quote, wider slippage, bigger tip (a duplicate sell cannot execute twice — the tokens are gone)
      const v2 = await venueOf(p.mint); if (v2.kind === "none") break;
      const r = sellIxs(v2, S.pub, amount, Math.min(0.5, CFG.SLIP_STOP + 0.1 * attempt), sIx.ixKind, closeAta); const txr = await buildTx(S.pub, wrap(S.pub, r.ixs, lamports(CFG.TIP_RETRY_SOL), CFG.CU_PRICE_RETRY), S.kp);
      const sr = await send(txr); sigs.push(sr.sig); c = await waitConfirm(sr.sig, 15000);
      if (c.status !== "confirmed") for (const old of sigs.slice(0, -1)) { const oc = await signatureStatus(old).catch(() => null); if (oc?.status === "confirmed") { c = oc; sr.sig = old; break; } } // an earlier attempt may have landed meanwhile
      if (c.status === "confirmed") { s = sr; updOrder(id, { sig: sr.sig, via: sr.via, tip_lamports: lamports(CFG.TIP_RETRY_SOL), cu_price: CFG.CU_PRICE_RETRY, slippage: Math.min(0.5, CFG.SLIP_STOP + 0.1 * attempt) }); }
    }
    if (c.status !== "confirmed") { const f = (sellFails.get(k) || 0) + 1; sellFails.set(k, f); if (f >= 3) sellTry.set(k, Date.now() + 580_000); updOrder(id, { status: c.status === "failed" ? "failed" : "timeout", sim_err: c.err, detail: { sigs, fails: f } }); if (f === 1 || f === 3 || f % 20 === 0) tg(`🚨 <b>SELL NOT LANDED</b> — ${esc(p.name)} [${tag}] (${rule}) ${c.err ? `<code>${esc(c.err).slice(0, 120)}</code>` : ""}\nStill holding ${Number(amount)} tokens. Retrying every 20 s until it is gone; <code>/live sell ${p.paper_id} ${p.exit}</code> forces an attempt now.`); return; }
    const fill = await readFill(s.sig, S.pub, mint).catch(() => null); const proceeds = fill ? fill.solDelta : Number(sIx.expected);
    done(id, proceeds);
    updOrder(id, { status: "confirmed", confirm_slot: c.slot, fill_sol: proceeds, fill_tokens: fill?.tokenDelta ?? -Number(amount), fee: fill?.fee ?? null, send_ms: Date.now() - t0 });
    const pnl = proceeds - p.cost_lamports, mult = p.cost_lamports > 0 ? proceeds / p.cost_lamports : null, day = dayNet("live", p.book);
    tg(`${pnl >= 0 ? "✅" : "🔴"} <b>SOLD</b> ${esc(p.name)} [${tag}] (${rule}${why && !/^(telegram|owner|close:)|exit arrived/.test(why) ? "/" + why : ""}${paperMult != null ? `, paper ${paperMult.toFixed(2)}x` : ""}) — live <b>${mult ? mult.toFixed(2) + "x" : "?"}</b> · ${pnl >= 0 ? "+" : ""}${sol(pnl).toFixed(4)} SOL · ${tag} today ${sol(day.n) >= 0 ? "+" : ""}${sol(day.n).toFixed(3)} over ${day.c}\n<code>${s.sig}</code>`);
  } catch (e) { console.error("[sell]", e); log("sell-error", `${p.name} [${tag}]: ${e.message}`); }
  finally { selling.delete(k); }
}
async function handleExit(m) {
  S.lastTracker = Date.now();
  if (m.type === "exit" && !["h5", "flow4", "h3", "tsl40"].includes(m.rule)) return; // v0.4.8 + tsl40 (BL's trail)
  const rule = m.type === "close" ? `paper-close:${m.reason}` : m.rule, mult = m.mult ?? null, why = m.type === "close" ? `close:${m.reason || "?"}` : (m.why || null); // why = which part of the rule fired (stop / floor / time / trail / fade / cap), or the paper close's reason
  // every leg that exists is managed, whether or not its book is switched on right now (the switch only governs new buys): a paper close takes all legs, an exit signal its own book's leg
  const legs = m.type === "close" ? ["flow4", "h5", "h3", "tsl40"] : [m.rule];
  for (const exit of legs) {
    const p = positionOf(m.id, exit);
    if (!p) { if (buyInFlight(m.mint) || pendingBuys().some((o) => o.paper_id === m.id && (o.exit || "h5") === exit)) pendingExit.set(legKey(m.id, exit), { rule, mult, why, ts: Date.now() }); continue; } // buy still in flight → sell the moment it books
    if (p.status !== "open") continue;
    await sellPosition(p, rule, mult, why);
  }
}

// ---- commands from Telegram (forwarded by the tracker) ----
async function handleCmd(text) {
  const [, sub, arg, arg2] = text.trim().split(/\s+/); const bal = await balance(true);
  const status = () => { const ops = openPositions(); const d = dayNet("live"), sd = dayNet("shadow");
    const books = booksOn().map((x) => { const dd = dayNet("live", x); return `${BOOKS[x].name} ${sol(dd.n) >= 0 ? "+" : ""}${sol(dd.n).toFixed(3)} / ${dd.c}`; }).join(" · ");
    return `executor v${VERSION} · books: ${BOOK_IDS.map((k) => `${BOOKS[k].name} <b>${modeOf(k).toUpperCase()}</b> @ ${stakeOf(k)} SOL`).join(" · ")} · cap ${CFG.MAX_OPEN} per book\nwallet ${S.pub ? `<code>${S.pub.toBase58()}</code>` : "none"} · balance ${bal != null ? sol(bal).toFixed(4) : "?"} SOL\nopen ${ops.length}: ${ops.map((p) => `${esc(p.name)} [${BOOKS[p.book]?.name || p.exit}${p.mode !== "live" ? ", " + p.mode : ""}]`).join(", ") || "—"}\ntoday live ${sol(d.n).toFixed(3)} / ${d.c} (${books || "no book on"}) · shadow ${sol(sd.n).toFixed(3)} / ${sd.c} · rpc errs ${rpcStats.errors} · sender errs ${rpcStats.senderErrors}`; };
  if (!sub) return tg(status());
  const booksLine = () => BOOK_IDS.map((k) => `${BOOKS[k].name} ${modeOf(k) === "off" ? "off" : modeOf(k).toUpperCase() + " @ " + stakeOf(k) + " SOL"}`).join(", ");
  // wallet-wide presets: off = every book off · shadow = every book that is on → shadow · on/live = every book that is on → live
  if (sub === "off") { for (const k of BOOK_IDS) S.books[k].mode = "off"; syncExitWord(); saveOvr(); return tg(`every book <b>off</b> — no buys. Open positions are still sold on their exits.`); }
  if (sub === "shadow") { for (const k of booksOn()) S.books[k].mode = "shadow"; syncExitWord(); saveOvr(); return tg(`every switched-on book is now <b>shadow</b> — building and simulating, signing nothing. ${booksLine()}`); }
  if (sub === "on" || sub === "live") { if (!S.kp) return tg("no wallet on the box yet"); const need = booksOn().reduce((a, x) => a + lamports(stakeOf(x)), 0); if (bal == null || bal < need + lamports(0.02)) return tg(`balance ${bal != null ? sol(bal).toFixed(4) : "?"} SOL is below one stake per switched-on book + fees — fund the wallet first`); for (const k of booksOn()) S.books[k].mode = "live"; syncExitWord(); S.stopOverrideDay = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }); saveOvr(); return tg(`every switched-on book is now <b>LIVE</b> — ${booksLine()}.`); }
  if (sub === "stake") { // /live stake 0.25 (both books) · /live stake runner 0.25
    const k = bookKey(arg), v = Number(k ? arg2 : arg); if (!(v > 0 && v <= 2)) return tg("usage: /live stake 0.25 · /live stake a 0.25 · /live stake c 0.01");
    if (k) { S.books[k].stake = v; } else { S.stake = v; for (const b of BOOK_IDS) S.books[b].stake = v; } saveOvr(); return tg(`stake: ${BOOK_IDS.map((b) => `${BOOKS[b].name} <b>${stakeOf(b)} SOL</b>`).join(" · ")}`); }
  if (sub === "book") { // /live book a|b|c|d|f|g off|shadow|live  ("on" = live if any book is live, else shadow)
    const k = bookKey(arg); const want = arg2 === "on" ? (booksLive().length ? "live" : "shadow") : arg2 === "paper" ? "off" : arg2; // v0.3.8: "paper" = off for the executor (the tracker's paper book always runs) if (!k || !MODES.includes(want)) return tg("usage: /live book a|b|c|d|f|g off|shadow|live");
    if (want === "live") { if (!S.kp) return tg("no wallet on the box yet"); if (bal == null || bal < lamports(stakeOf(k)) + lamports(0.02)) return tg(`balance ${bal != null ? sol(bal).toFixed(4) : "?"} SOL is below ${BOOKS[k].name}'s stake + fees — fund the wallet first`); S.stopOverrideDay = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }); }
    S.books[k].mode = want; syncExitWord(); saveOvr();
    return tg(`${BOOKS[k].name} <b>${want.toUpperCase()}</b>${want === "off" ? " — no new buys for it; anything it holds still sells on its rule" : want === "shadow" ? ` at ${stakeOf(k)} SOL — simulated, nothing spent` : ` at ${stakeOf(k)} SOL — real money from the next trigger`}. Books now: ${booksLine()}.`); }
  if (sub === "strategy") return tg(`each book follows its own paper strategy now: ${BOOK_IDS.map((k) => `${BOOKS[k].name} = ${BOOKS[k].strategy}/${BOOKS[k].exit}`).join(" · ")}`);
  if (sub === "sell") { const ops = openPositions(), bk = bookKey(arg2); const list = arg === "all" ? ops : ops.filter((p) => String(p.paper_id) === arg && (!arg2 || p.exit === arg2 || (bk && p.book === bk))); if (!list.length) return tg("nothing open by that id"); for (const p of list) await sellPosition(p, "manual", null, "owner"); return; }
  if (sub === "orders") return tg(recentOrders(8).map((o) => `#${o.id} ${o.side} ${esc(o.name)} ${o.status}${o.skip_reason ? " (" + esc(o.skip_reason) + ")" : ""}${o.sim_err ? " " + esc(String(o.sim_err).slice(0, 60)) : ""}`).join("\n") || "no orders yet");
  if (sub === "withdraw") { // only ever to the configured address — a stolen Telegram session can only send your money to you
    if (!CFG.SWEEP_TO) return tg("no withdrawal address set yet (EXEC_SWEEP_TO in /root/executor/.env)"); if (!S.kp) return tg("no wallet on the box");
    const amt = Number(arg); if (!(amt > 0)) return tg("usage: /live withdraw 0.5");
    if (openPositions().some((p) => p.mode === "live")) return tg("positions are open — withdraw after they close");
    if (bal == null || bal < lamports(amt) + lamports(0.01)) return tg(`balance ${bal != null ? sol(bal).toFixed(4) : "?"} SOL — not enough for ${amt} plus fees`);
    try { const tx = await buildTx(S.pub, [...ixBudget(20_000, CFG.CU_PRICE), ixTransfer(S.pub, PK(CFG.SWEEP_TO), lamports(amt))], S.kp); const c = await sendUntilConfirmed(tx, 30000); log("withdraw", `${amt} SOL → ${CFG.SWEEP_TO} ${c.status} ${c.sig}`);
      return tg(c.status === "confirmed" ? `🏦 sent <b>${amt} SOL</b> to <code>${CFG.SWEEP_TO}</code>\n<code>${c.sig}</code>` : `⚠️ withdrawal ${c.status} — <code>${c.sig}</code> (check Solscan before retrying)`); } catch (e) { return tg(`⚠️ withdrawal failed: ${esc(e.message)}`); } }
  return tg("commands: /live · /live book a|b|c|d|f|g off|shadow|live · /live on (every switched-on book live) · /live shadow (every switched-on book shadow) · /live off (all off) · /live stake 0.25 · /live stake c 0.01 · /live sell &lt;id|all&gt; [a|b|c|d] · /live orders · /live withdraw 0.5");
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
      else if (m.type === "cmd") handleCmd(m.text || "").then(() => housekeeping()).catch((e) => console.error("[cmd]", e.message)); // status.json refreshed right after a command, so the page shows the change
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
    // v0.4.6 guard (owner go 21 Oct 09:40 UK): a live GR whose last 20 live legs are net negative goes back to shadow by itself and raises an alarm (counted from the last guard trip, so switching it back on starts a fresh count)
    // v0.4.10 (owner, 21 Oct 17:50 UK): the guard watches every live book, not only GR
    for (const k of BOOK_IDS) { if (modeOf(k) !== "live") continue; const since = S.books[k].guardTs || 0; const r = db.prepare(`SELECT pnl_lamports FROM positions WHERE status='closed' AND book=? AND mode='live' AND opened_ts>? ORDER BY closed_ts DESC LIMIT 20`).all(k, since); const net = r.reduce((a, x) => a + (x.pnl_lamports || 0), 0); if (r.length >= 20 && net < 0) { S.books[k].mode = "shadow"; S.books[k].guardTs = nowS(); saveOvr(); log("guard", `${BOOKS[k].name} back to shadow: last 20 live legs ${(net / 1e9).toFixed(3)} SOL`); tg(`🛑 ${BOOKS[k].name} switched back to SHADOW - its last 20 live trades lost ${(net / 1e9).toFixed(3)} SOL. Switch it on again from the page when you want.`); } }
    for (const q of openPositions()) { const kk = legKey(q.paper_id, q.exit); if (q.mode === "live" && LOCAL_STOP_EXITS.has(q.exit) && !watching.has(kk) && !selling.has(kk)) { try { await watchPosition(q, await venueOf(q.mint)); } catch (e) { log("watch-error", `${q.name}: ${e.message}`); } } } // v0.4.12: after a restart, watch every open live leg again
    for (const [k, pe] of pendingExit) if (Date.now() - (pe.ts || 0) > 600_000) pendingExit.delete(k); // an exit noted for a buy that never booked
    const ops = openPositions(), n = nowS(), trackerSilent = Date.now() - S.lastTracker > 120_000, feedStale = S.lastFeed > 0 && Date.now() - S.lastFeed > 120_000;
    for (const p of ops) {
      const ns = needsSell.get(legKey(p.paper_id, p.exit));
      if (ns) await sellPosition(p, ns.rule, ns.mult, ns.why); // an exit we owe and have not managed to fill yet (20 s cadence inside)
      else if (n - p.opened_ts > fallbackMin(p.exit) * 60) await sellPosition(p, "fallback-time", null, `no exit signal in ${fallbackMin(p.exit)} min (${p.exit})`);
      else if (p.mode === "live" && (trackerSilent || feedStale)) await sellPosition(p, "tracker-down", null, trackerSilent ? "no tracker contact for 2 min" : "tracker's price feed silent for 2 min");
    }
    if (booksLive().length && CFG.SWEEP_TO && CFG.SWEEP_CEILING_SOL > 0) { const day = new Date().toISOString().slice(0, 10); const bal = await balance(true);
      if (sweptDay !== day && bal != null && bal > lamports(CFG.SWEEP_CEILING_SOL) + lamports(0.05) && !ops.length) { sweptDay = day; const amt = bal - lamports(CFG.SWEEP_CEILING_SOL);
        try { const tx = await buildTx(S.pub, [...ixBudget(20_000, CFG.CU_PRICE), ixTransfer(S.pub, PK(CFG.SWEEP_TO), amt)], S.kp); const s = await send(tx); const c = await waitConfirm(s.sig, 30000); log("sweep", `${sol(amt)} SOL → ${CFG.SWEEP_TO} ${c.status}`); tg(`🏦 swept ${sol(amt).toFixed(3)} SOL to <code>${CFG.SWEEP_TO}</code> (${c.status})`); } catch (e) { log("sweep-error", e.message); } } }
    const bal = S.pub ? await balance() : null;
    const dayStart = londonDayStart(), tl = totals("live"), ts = totals("shadow");
    const openRow = (p) => ({ id: p.paper_id, exit: p.exit, book: p.book, name: p.name, mint: p.mint, mode: p.mode, opened_ts: p.opened_ts, cost: sol(p.cost_lamports), tokens: p.tokens, paperPx: p.paper_entry_price, livePx: p.tokens > 0 ? (p.cost_lamports / 1e9) / (p.tokens / 1e6) : null });
    const tot = (mode, x) => { const t = totals(mode, x); return { n: t.n, pnl: sol(t.pnl), win: t.n ? t.w / t.n : null }; };
    const books = Object.fromEntries(BOOK_IDS.map((x) => [x, { name: BOOKS[x].name, strategy: BOOKS[x].strategy, exit: BOOKS[x].exit, rule: BOOKS[x].rule || null, mode: modeOf(x), on: modeOf(x) !== "off", stake: stakeOf(x), open: ops.filter((p) => p.book === x).map(openRow), dayLive: dayNet("live", x), dayShadow: dayNet("shadow", x), h24Live: net24("live", x), h24Shadow: net24("shadow", x), h6Live: net24("live", x, 21600), h6Shadow: net24("shadow", x, 21600), totalLive: tot("live", x), totalShadow: tot("shadow", x), recent: recentClosed(100, x) }]));
    writeFileSync(join(EXEC_HOME, "status.json"), JSON.stringify({ version: VERSION, mode: S.mode, strategy: S.strategy, exit: S.exit, exits: exitsActive(), exitNames: EXIT_NAMES, stake: S.stake, stakeChoices: STAKE_CHOICES, wallet: S.pub?.toBase58() || null, balance: bal != null ? sol(bal) : null, sweepTo: CFG.SWEEP_TO || null,
      open: ops.map(openRow), books,
      dayLive: dayNet("live"), dayShadow: dayNet("shadow"), h24Live: net24("live"), h24Shadow: net24("shadow"), totalLive: tot("live"), totalShadow: tot("shadow"),
      recent: recentClosed(100), skipsToday: skipSummary(dayStart), stats: stats(), rpc: rpcStats, trackerSeenS: S.lastTracker ? Math.round((Date.now() - S.lastTracker) / 1000) : null, now: nowS() }));
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
  if (v.kind !== "none") for (const kind of v.kind === "curve" ? ["v3", "classic"] : ["amm", "amm2"]) {
    const b = buyIxs(v, user, lamports(stakeSol), CFG.SLIP_BUY, kind); const tx = await buildTx(user, wrap(user, [...pre, ...b.ixs], lamports(CFG.TIP_SOL), CFG.CU_PRICE)); const sim = await simulate(tx, [ata(user, v.mint, v.tokenProgram)]);
    console.log(`buy ${kind}: expected ${b.expected} tokens (min ${b.minOut}) feeBps ${b.feeBps} · sim ${sim.ok ? "OK" : "FAILED " + sim.err} · units ${sim.units} · ${sim.ms} ms`); if (!sim.ok) console.log("   logs:", sim.logs.slice(-6).join("\n         "));
    const simTok = parseTokenAccount(sim.post?.[0])?.amount; const spot = v.kind === "curve" ? Number(v.curve.vSol) / Number(v.curve.vTok) : Number(v.quoteRes) / Number(v.baseRes); // lamports per raw token
    if (sim.ok) console.log(`   chain fill: ${simTok ?? "?"} tokens (${simTok ? ((Number(simTok) / Number(b.expected) - 1) * 100).toFixed(1) + "% vs our quote" : "post-state not returned"}) · spot ${(spot * 1e3).toFixed(4)} · our quote ${(lamports(stakeSol) / Number(b.expected) * 1e3).toFixed(4)} · chain ${simTok ? (lamports(stakeSol) / Number(simTok) * 1e3).toFixed(4) : "?"} (SOL per 1M tokens)${v.kind === "amm" ? ` · pool virtualQuote ${v.pool.virtualQuote} creatorFeeBps ${v.pool.creatorFeeBps}` : ""}`);
    if (b.expected > 0n) { // the sell is quoted against the state our buy would leave behind, so the round trip is what we would really pay in fees
      const net = BigInt(lamports(stakeSol)) - (BigInt(lamports(stakeSol)) * BigInt(b.feeBps)) / 10000n;
      const after = v.kind === "curve" ? { ...v, curve: { ...v.curve, vSol: v.curve.vSol + net, vTok: v.curve.vTok - b.expected } } : { ...v, baseRes: BigInt(v.baseRes) - b.expected, quoteRes: BigInt(v.quoteRes) + net };
      const sIx = sellIxs(after, user, b.expected, CFG.SLIP_SELL, kind); console.log(`sell ${kind}: ${b.expected} tokens → ${sol(sIx.expected).toFixed(5)} SOL expected (min ${sol(sIx.minOut).toFixed(5)}) — round trip ${((Number(sIx.expected) / lamports(stakeSol) - 1) * 100).toFixed(2)}% if the price did not move`);
      // (a buy and a sell together do not fit in one 1232-byte transaction, so the sell layout is checked by the first real position, not here)
    }
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
  console.log(`[executor] v${VERSION} · books ${BOOK_IDS.map((k) => `${k}:${modeOf(k)}@${stakeOf(k)}`).join(" ")} · wallet ${S.pub ? S.pub.toBase58() : "none"} · rpc ${CFG.RPC_URL.replace(/api-key=.*/, "api-key=…")}`);
  if (CFG.SMOKE) setTimeout(() => { console.log("[smoke] executor alive — ok"); try { unlinkSync(sockPath); } catch {} process.exit(0); }, Number(process.env.EXEC_SMOKE_MS || 15000));
  // (no Telegram on boot — quiet by design; `/live` answers with the status whenever you want it)
  process.on("uncaughtException", (e) => { console.error("[uncaught]", e); log("uncaught", e.stack || e.message); });
  process.on("unhandledRejection", (e) => { console.error("[unhandled]", e); log("unhandled", e?.stack || String(e)); });
}
