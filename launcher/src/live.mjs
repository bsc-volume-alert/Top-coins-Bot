// launcher 0.8.17 (owner, 5 Nov 2026 06:15 UK: "just build it … each trade at the minimum … choose one of the books … trade really minimalistically,
// but in real time … what price are we actually buying into"): LIVE SHADOW TRADES — real money, tiny size, one book.
// Every paper entry of the live book (livebook.txt: "FD 0.02" = the FD rule, 0.02 SOL a trade) is bought for real through Jupiter's swap
// (pump.fun curve or PumpSwap, whichever the coin is on), the position is re-quoted for the sell every few seconds and sold for real the moment the
// venue trail (25% off the high graduated / 40% on the curve, same as the paper columns) fires on those quotes — or at 2 h, the paper horizon.
// What is kept per trade is the chain's own account of it: SOL that left the wallet for the buy (network fee, priority fee and token-account rent
// included), tokens received, SOL that came back from the sell and from closing the token account. x = SOL back ÷ SOL out; r = x − 1 is the real
// net return, set beside the paper venue exit (r_venue) and the 0.2 SOL quote on the same trade. Wallet = the launcher's (its key never leaves the box).
// Stops: launcher/livebook.txt missing or "off", a file /root/launcher/live_stop, the wallet under MIN_BALANCE_SOL + stake, or 6 open positions.
import { PublicKey, VersionedTransaction, TransactionInstruction } from "@solana/web3.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { CFG, HOME } from "./config.mjs";
import { conn, rpcStats, getBalance, simulate, waitConfirm, readFill, buildTx, blockHeight } from "./rpc.mjs";
import { jqRaw, swapTxFor, SOL, qStat } from "./quote.mjs";
import { trailPct } from "./volpaper.mjs";
import { ixBudget } from "./pump.mjs";

const n = (k, d) => (process.env[k] != null && process.env[k] !== "" && Number.isFinite(Number(process.env[k])) ? Number(process.env[k]) : d);
const PRIO_MAX = n("LAUNCH_LIVE_PRIO_LAMPORTS", 1_000_000), MAX_OPEN = n("LAUNCH_LIVE_MAX_OPEN", 6), SLIP_BUY = n("LAUNCH_LIVE_SLIP_BUY", 1500), SLIP_SELL = n("LAUNCH_LIVE_SLIP_SELL", 2500);
const HORIZON = 120 * 60, GIVE_UP = 180 * 60; // sell at 2 h like the paper score; a coin with no route for 3 h is written off
const now = () => Math.floor(Date.now() / 1000);
export const liveStat = { enabled: false, book: null, stake: 0, buys: 0, buyFails: 0, sells: 0, sellFails: 0, skipped: 0, open: 0, writtenOff: 0, balanceSol: null, lastErr: "", lastSig: "", polls: 0 };
let db = null, wallet = null, ME = null, cfgAt = 0, cfg = { book: null, stake: 0 };

/** livebook.txt in the launcher folder: "<BOOK> <SOL>" (e.g. "FD 0.02"); "off" or missing = no live trades. Env LAUNCH_LIVE_BOOK / LAUNCH_LIVE_SOL override. Re-read every 5 s. */
export function liveCfg() {
  if (Date.now() - cfgAt < 5000) return cfg; cfgAt = Date.now();
  let book = process.env.LAUNCH_LIVE_BOOK || null, stake = n("LAUNCH_LIVE_SOL", 0);
  if (!book) { try { const [b, s] = readFileSync(new URL("../livebook.txt", import.meta.url), "utf8").trim().split(/\s+/); if (b && b.toLowerCase() !== "off") { book = b.toUpperCase(); stake = Number(s) || 0.02; } } catch {} }
  if (existsSync(join(HOME, "live_stop"))) book = null;
  if (CFG.SMOKE || !wallet) book = null;
  cfg = { book, stake: book ? Math.max(0.005, stake) : 0 }; liveStat.enabled = !!book; liveStat.book = book; liveStat.stake = cfg.stake; return cfg;
}
export const isLiveBook = (k) => liveCfg().book === k;

export function initLive(d, kp) {
  db = d; wallet = kp; ME = kp.publicKey;
  db.exec(`CREATE TABLE IF NOT EXISTS live_trades (id INTEGER PRIMARY KEY AUTOINCREMENT, vol_id INTEGER UNIQUE, strat TEXT, mint TEXT, name TEXT, curve INTEGER, entry_ts INTEGER, entry_price REAL, sol_usd REAL, stake_sol REAL,
    buy_ts INTEGER, buy_sig TEXT, buy_status TEXT, buy_ms INTEGER, buy_err TEXT, buy_impact REAL, sol_in REAL, tokens REAL, buy_px REAL, in_gap REAL,
    hi REAL, last_x REAL, last_ts INTEGER, n_quotes INTEGER DEFAULT 0, sell_ts INTEGER, sell_sig TEXT, sell_status TEXT, sell_reason TEXT, sell_tries INTEGER DEFAULT 0, sell_err TEXT, sell_impact REAL,
    sol_out REAL, x REAL, r REAL, closed INTEGER DEFAULT 0, done INTEGER DEFAULT 0)`);
  for (const c of ["buy_quote_ms INTEGER", "buy_sim_ms INTEGER", "buy_land_ms INTEGER", "buy_slot INTEGER", "buy_lag_s INTEGER", "sell_ms INTEGER", "sell_land_ms INTEGER", "sell_slot INTEGER"]) try { db.exec(`ALTER TABLE live_trades ADD COLUMN ${c}`); } catch {} // 0.8.19 (owner, 07:45 UK: "transaction speed … both ways … is the key")
  db.exec("CREATE INDEX IF NOT EXISTS live_open ON live_trades (done, buy_status)");
  liveCfg(); try { if (cfg.book) db.prepare("INSERT OR IGNORE INTO fd_rules (k, since_ts, ver) VALUES ('LIVE', ?, ?)").run(now(), (() => { try { return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version; } catch { return null; } })()); } catch {} // when live trading was first switched on (the page's "Loaded" time)
}
const openCount = () => db.prepare("SELECT COUNT(*) n FROM live_trades WHERE done=0").get().n;

/** Send a signed transaction (plain RPC; Jupiter's transaction carries no Sender tip) and keep re-sending the same bytes until it lands, fails, or its blockhash expires. */
async function land(tx, lastValid, ms = 25000) {
  const raw = tx.serialize(); const t0 = Date.now(); rpcStats.sends++;
  const sig = await conn.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 }); let resends = 0;
  while (Date.now() - t0 < ms) {
    const c = await waitConfirm(sig, 2500); if (c.status !== "timeout") return { ...c, sig, resends, ms: Date.now() - t0 };
    if (lastValid) { try { if ((await blockHeight()) > lastValid) return { status: "expired", sig, resends, ms: Date.now() - t0, err: null }; } catch {} }
    try { await conn.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 }); resends++; } catch {}
  }
  const late = await waitConfirm(sig, 8000); return { ...late, sig, resends, ms: Date.now() - t0 };
}
async function fill(sig, mint) { for (let i = 0; i < 8; i++) { const f = await readFill(sig, ME, new PublicKey(mint), 1); if (f) return f; await new Promise((r) => setTimeout(r, 700)); } return null; }

/** The real buy for a paper entry of the live book. Not awaited by the caller; everything it learns goes into live_trades. */
export async function liveBuy(row) {
  const c = liveCfg(); if (!c.book || row.strat !== c.book) return;
  const t = now(), lamports = Math.round(c.stake * 1e9);
  const ins = (status, err = null) => db.prepare("INSERT OR IGNORE INTO live_trades (vol_id, strat, mint, name, curve, entry_ts, entry_price, sol_usd, stake_sol, buy_ts, buy_status, buy_err, done) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(row.id, row.strat, row.mint, row.name, row.curve, t, row.entry_price, row.su, c.stake, t, status, err, status === "skipped" ? 1 : 0).changes;
  const upd = (status, extra = {}) => { const ks = Object.keys(extra); db.prepare(`UPDATE live_trades SET buy_status=?${ks.map((k) => `, ${k}=?`).join("")} WHERE vol_id=?`).run(status, ...ks.map((k) => extra[k]), row.id); };
  if (openCount() >= MAX_OPEN) { if (ins("skipped", `${MAX_OPEN} open`)) liveStat.skipped++; return; }
  let bal = null; try { bal = await getBalance(ME); liveStat.balanceSol = +(bal / 1e9).toFixed(4); } catch (e) { liveStat.lastErr = "balance: " + e.message.slice(0, 80); }
  if (bal == null || bal < (CFG.MIN_BALANCE_SOL + c.stake) * 1e9) { if (ins("skipped", bal == null ? "balance unknown" : `balance ${(bal / 1e9).toFixed(3)} < ${(CFG.MIN_BALANCE_SOL + c.stake).toFixed(3)}`)) liveStat.skipped++; return; }
  if (!ins("quoting")) return;
  const t0 = Date.now();
  try {
    const q = await jqRaw(SOL, row.mint, lamports, SLIP_BUY); qStat.buys++;
    const s = await swapTxFor(q, ME.toBase58(), PRIO_MAX); const tQ = Date.now() - t0;
    const tx = VersionedTransaction.deserialize(Buffer.from(s.tx64, "base64")); tx.sign([wallet]);
    const t1 = Date.now(); const sim = await simulate(tx); const tS = Date.now() - t1; if (!sim.ok) throw new Error("sim: " + String(sim.err).slice(0, 60) + " " + (sim.logs || []).filter((l) => /Error|insufficient|slippage/i.test(l)).slice(-1).join("").slice(0, 60));
    upd("sent", { buy_impact: Number(q.priceImpactPct) || 0 });
    const L = await land(tx, s.lastValidBlockHeight); liveStat.lastSig = L.sig;
    if (L.status !== "confirmed") throw new Error(`${L.status}${L.err ? " " + L.err.slice(0, 60) : ""} sig ${L.sig.slice(0, 12)}`);
    const f = await fill(L.sig, row.mint);
    if (!f || !(f.tokenDelta > 0)) throw new Error(`no fill read (sig ${L.sig.slice(0, 12)})`);
    const solIn = -f.solDelta / 1e9, rent = 0.00203928, px = (solIn - rent - f.fee / 1e9) / (f.tokenDelta / 1e6) * (row.su || 0), gap = row.entry_price > 0 && px > 0 ? px / row.entry_price - 1 : null;
    upd("confirmed", { buy_sig: L.sig, buy_ms: Date.now() - t0, buy_quote_ms: tQ, buy_sim_ms: tS, buy_land_ms: L.ms, buy_slot: L.slot || null, buy_lag_s: (f.blockTime || t) - row.t, sol_in: +solIn.toFixed(6), tokens: f.tokenDelta, buy_px: px || null, in_gap: gap != null ? +gap.toFixed(4) : null, hi: 1, buy_ts: f.blockTime || t }); // buy_lag_s = paper entry → fill, in seconds
    liveStat.buys++;
  } catch (e) { liveStat.buyFails++; liveStat.lastErr = `buy ${row.mint.slice(0, 6)}: ${e.message}`.slice(0, 140); upd("failed", { buy_err: e.message.slice(0, 120), buy_ms: Date.now() - t0, done: 1 }); }
}

/** Every 4 s: the open live position quoted longest ago gets a sell quote for its actual tokens; the venue trail off the quoted high (from 1 = what went in) or the 2-hour horizon sells it for real. */
let polling = false;
export async function livePoll() {
  if (!db || polling || Date.now() < qStat.pauseUntil) return; polling = true;
  try {
    const t = now(); liveStat.open = openCount();
    const r = db.prepare("SELECT * FROM live_trades WHERE done=0 AND buy_status='confirmed' AND tokens>0 ORDER BY (last_ts IS NOT NULL), last_ts, buy_ts LIMIT 1").get();
    if (!r) return; liveStat.polls++;
    let q; try { q = await jqRaw(r.mint, SOL, Math.floor(r.tokens), SLIP_SELL); }
    catch (e) { qStat.errors++; liveStat.lastErr = `poll ${r.mint.slice(0, 6)}: ${e.message}`.slice(0, 120);
      if (!/paused|429/.test(e.message)) { db.prepare("UPDATE live_trades SET last_ts=?, n_quotes=n_quotes+1, sell_err=? WHERE id=?").run(t, e.message.slice(0, 80), r.id);
        if (t - r.buy_ts > GIVE_UP) { db.prepare("UPDATE live_trades SET done=1, sell_status='written_off', sell_reason='no route 3 h', sol_out=0, x=0, r=-1, sell_ts=? WHERE id=?").run(t, r.id); liveStat.writtenOff++; } }
      return; }
    const x = Number(q.outAmount) / 1e9 / r.stake_sol, hi = Math.max(r.hi || 1, x), keep = 1 - trailPct(r.curve); // quoted SOL back ÷ SOL staked, from 1 at entry — the same measure as the shadow poll's q_live_x (r = the money result is computed at the sell from the chain's figures)
    const reason = x <= (r.hi || 1) * keep ? "trail" : t - r.buy_ts >= HORIZON ? "2h" : null;
    db.prepare("UPDATE live_trades SET last_ts=?, last_x=?, hi=?, n_quotes=n_quotes+1 WHERE id=?").run(t, +x.toFixed(4), +hi.toFixed(4), r.id);
    if (reason) await liveSell(r, q, reason);
  } catch (e) { liveStat.lastErr = "poll: " + e.message.slice(0, 120); }
  finally { polling = false; }
}

async function liveSell(r, q, reason) {
  const t = now(), t0 = Date.now();
  db.prepare("UPDATE live_trades SET sell_status='sending', sell_reason=?, sell_tries=sell_tries+1, sell_ts=? WHERE id=?").run(reason, t, r.id);
  try {
    const s = await swapTxFor(q, ME.toBase58(), PRIO_MAX);
    const tx = VersionedTransaction.deserialize(Buffer.from(s.tx64, "base64")); tx.sign([wallet]);
    const L = await land(tx, s.lastValidBlockHeight); liveStat.lastSig = L.sig; const tSell = Date.now() - t0; // trail trigger (the quote) → landed or failed
    if (L.status !== "confirmed") throw new Error(`${L.status}${L.err ? " " + L.err.slice(0, 60) : ""}`);
    const f = await fill(L.sig, r.mint); if (!f) throw new Error("no fill read");
    const left = r.tokens + f.tokenDelta; let solOut = f.solDelta / 1e9;
    if (left > r.tokens * 0.001) { // exact-in sells everything; anything left is a partial fill — keep it open with what came back so far recorded
      db.prepare("UPDATE live_trades SET sell_status='partial', sell_sig=?, sell_err=?, sol_out=COALESCE(sol_out,0)+?, tokens=? WHERE id=?").run(L.sig, `partial: ${left} left`, +solOut.toFixed(6), left, r.id); liveStat.lastErr = `sell ${r.mint.slice(0, 6)}: partial`; return; }
    let closed = 0; try { solOut += await closeTokenAccounts(r.mint); closed = 1; } catch (e) { liveStat.lastErr = `close ${r.mint.slice(0, 6)}: ${e.message}`.slice(0, 120); }
    const total = (r.sol_out || 0) + solOut, x = total / r.sol_in;
    db.prepare("UPDATE live_trades SET sell_status='confirmed', sell_sig=?, sell_ts=?, sell_impact=?, sol_out=?, x=?, r=?, closed=?, done=1, sell_err=NULL, sell_ms=?, sell_land_ms=?, sell_slot=? WHERE id=?").run(L.sig, f.blockTime || t, Number(q.priceImpactPct) || 0, +total.toFixed(6), +x.toFixed(4), +(x - 1).toFixed(4), closed, tSell, L.ms, L.slot || null, r.id);
    liveStat.sells++;
  } catch (e) { liveStat.sellFails++; liveStat.lastErr = `sell ${r.mint.slice(0, 6)}: ${e.message}`.slice(0, 140); db.prepare("UPDATE live_trades SET sell_status='failed', sell_err=? WHERE id=?").run(e.message.slice(0, 120), r.id); } // stays open: the next poll quotes and tries again
}

/** After a full sell: close the (empty) token account(s) of that mint to get the rent back. Returns the SOL that came back (≈ 0.002). */
async function closeTokenAccounts(mint) {
  rpcStats.calls++; const res = await conn.getTokenAccountsByOwner(ME, { mint: new PublicKey(mint) }, "confirmed");
  const ixs = []; for (const a of res.value) { const amt = a.account.data.readBigUInt64LE(64); if (amt !== 0n) continue; // bytes 64–71 of a token account = amount
    ixs.push(new TransactionInstruction({ programId: a.account.owner, data: Buffer.from([9]), keys: [{ pubkey: a.pubkey, isSigner: false, isWritable: true }, { pubkey: ME, isSigner: false, isWritable: true }, { pubkey: ME, isSigner: true, isWritable: false }] })); }
  if (!ixs.length) return 0;
  const tx = await buildTx(ME, [...ixBudget(20000, 200000), ...ixs], wallet);
  const L = await land(tx, tx.lastValidBlockHeight, 20000); if (L.status !== "confirmed") throw new Error(L.status);
  const f = await fill(L.sig, mint); return f ? f.solDelta / 1e9 : 0;
}
