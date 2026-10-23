// v0.18.184 (owner, 23 Oct 12:48 UK: "a website where I can paste in the contract… the initial bundles and all the information initially, the current
// information, the top 10 wallets… a full diagnosis of the coin"). One lookup = one report: the launch (bundle, dev, snipers — from our database when
// the tracker saw the launch, and rebuilt from the chain either way), what those wallets did since (held / sold / sold and bought back / moved out),
// the coin now (price, MC, holders, top 20 with labels), fresh-wallet share and shared funders, every book that traded it, and a plain-English diagnosis.
// Read-only. Its own call counter and daily budget (COIN_RPC_DAILY, default 30000) on the Helius URL, so a lookup never touches the bots' RPC budget.
import { createHash } from "node:crypto";
import "./env.mjs";
import Database from "better-sqlite3";
// Reads the tracker's database read-only (launch facts, checkpoints, books) when it is there; works without it.
let db = null; try { db = new Database(process.env.TRACKER_DB || "/root/tracker/data/tracker.db", { readonly: true, fileMustExist: true }); } catch (e) { console.log("[scope] tracker database not available:", e.message); }
const HELIUS = () => process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : (process.env.SCOPE_RPC_URL || "");
const A58E = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function bs58(buf) { const d = []; for (const b of buf) { let c = b; for (let j = 0; j < d.length; j++) { c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0; } while (c > 0) { d.push(c % 58); c = (c / 58) | 0; } }
  let s = ""; for (const b of buf) { if (b === 0) s += "1"; else break; } for (let i = d.length - 1; i >= 0; i--) s += A58E[d[i]]; return s; }
function solUsdNow() { try { const r = db?.prepare("SELECT usd FROM sol_px ORDER BY ts DESC LIMIT 1").get(); if (r?.usd > 0) return r.usd; } catch {} return null; }

const PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", AMM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", WSOL = "So11111111111111111111111111111111111111112";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", ATA_PROG = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const DAILY = Number(process.env.SCOPE_RPC_DAILY || 60000), PER_LOOKUP = Number(process.env.SCOPE_RPC_LOOKUP || 1500);
export const coinStat = { lookups: 0, calls: 0, day: new Date().getUTCDate(), lastMs: 0, lastErr: "" };

// ---------- base58 decode + program-derived addresses (no web3 library in the tracker) ----------
const A58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function unb58(s) {
  const out = []; for (const ch of s) { let c = A58.indexOf(ch); if (c < 0) throw new Error("not base58");
    for (let j = 0; j < out.length; j++) { c += out[j] * 58; out[j] = c & 255; c >>= 8; } while (c > 0) { out.push(c & 255); c >>= 8; } }
  for (const ch of s) { if (ch === "1") out.push(0); else break; }
  return Buffer.from(out.reverse());
}
const P = 2n ** 255n - 19n, md = (a) => { a %= P; return a < 0n ? a + P : a; };
const pw = (b, e) => { let r = 1n; b = md(b); while (e > 0n) { if (e & 1n) r = (r * b) % P; b = (b * b) % P; e >>= 1n; } return r; };
const DC = md(-121665n * pw(121666n, P - 2n));
function onCurve(buf) { // ed25519 point decompression check — a PDA is the first bump whose hash is NOT a valid point
  const b = Buffer.from(buf); b[31] &= 0x7f; let y = 0n; for (let i = 31; i >= 0; i--) y = (y << 8n) | BigInt(b[i]);
  if (y >= P) return false; const y2 = (y * y) % P, u = md(y2 - 1n), v = md(DC * y2 + 1n), x2 = (u * pw(v, P - 2n)) % P;
  return x2 === 0n || pw(x2, (P - 1n) / 2n) === 1n;
}
const seedBuf = (s) => (Buffer.isBuffer(s) ? s : s.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(s) ? unb58(s) : Buffer.from(s));
export function pda(seeds, program) {
  const pg = unb58(program);
  for (let bump = 255; bump >= 0; bump--) {
    const h = createHash("sha256"); for (const s of seeds) h.update(seedBuf(s)); h.update(Buffer.from([bump])); h.update(pg); h.update(Buffer.from("ProgramDerivedAddress"));
    const d = h.digest(); if (!onCurve(d)) return bs58(d);
  }
  throw new Error("no PDA");
}
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
export const curveOf = (mint) => pda(["bonding-curve", mint], PUMP);
export const poolOf = (mint) => pda([Buffer.from("pool"), u16(0), unb58(pda(["pool-authority", mint], PUMP)), unb58(mint), unb58(WSOL)], AMM);
export const ataOf = (owner, mint, tokenProg = TOKEN) => pda([unb58(owner), unb58(tokenProg), unb58(mint)], ATA_PROG);

// ---------- calls (own counter, own budget) ----------
const URL_ = HELIUS;
let used = 0;
function charge(method, n = 1) {
  const d = new Date().getUTCDate(); if (d !== coinStat.day) { coinStat.day = d; coinStat.calls = 0; }
  if (coinStat.calls + n > DAILY) throw new Error(`coin lookup budget used up today (${DAILY} calls)`);
  if (used + n > PER_LOOKUP) throw new Error(`this lookup hit its ${PER_LOOKUP}-call cap`);
  coinStat.calls += n; used += n;
}
async function call(method, params) {
  charge(method);
  const r = await fetch(URL_(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(15000) });
  const j = await r.json(); if (j.error) throw new Error(`${method}: ${j.error.message || JSON.stringify(j.error).slice(0, 80)}`); return j.result;
}
async function batch(method, list, size = 40) { // JSON-RPC batch: many getTransaction in one HTTP request
  const out = [];
  for (let i = 0; i < list.length; i += size) {
    const part = list.slice(i, i + size); charge(method, part.length);
    const r = await fetch(URL_(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(part.map((p, k) => ({ jsonrpc: "2.0", id: k, method, params: p }))), signal: AbortSignal.timeout(30000) });
    const j = await r.json(); const arr = Array.isArray(j) ? j : [];
    const byId = new Map(arr.map((x) => [x.id, x.result ?? null])); for (let k = 0; k < part.length; k++) out.push(byId.get(k) ?? null);
  }
  return out;
}
const TX = (sig) => [sig, { maxSupportedTransactionVersion: 0, encoding: "json", commitment: "confirmed" }];

// ---------- transaction reading ----------
const keysOf = (tx) => [...(tx?.transaction?.message?.accountKeys || []).map((k) => (typeof k === "string" ? k : k.pubkey)), ...(tx?.meta?.loadedAddresses?.writable || []), ...(tx?.meta?.loadedAddresses?.readonly || [])];
/** per-owner change of this mint's balance (raw units) and SOL change (lamports) in one transaction */
function deltas(tx, mint) {
  const pre = new Map(), post = new Map();
  for (const b of tx?.meta?.preTokenBalances || []) if (b.mint === mint) pre.set(b.owner, (pre.get(b.owner) || 0n) + BigInt(b.uiTokenAmount.amount));
  for (const b of tx?.meta?.postTokenBalances || []) if (b.mint === mint) post.set(b.owner, (post.get(b.owner) || 0n) + BigInt(b.uiTokenAmount.amount));
  const keys = keysOf(tx), solPre = tx?.meta?.preBalances || [], solPost = tx?.meta?.postBalances || [], out = new Map();
  for (const o of new Set([...pre.keys(), ...post.keys()])) {
    const d = (post.get(o) || 0n) - (pre.get(o) || 0n); if (d === 0n) continue;
    const i = keys.indexOf(o); out.set(o, { tok: d, sol: i >= 0 ? (solPost[i] || 0) - (solPre[i] || 0) : null });
  }
  return { out, payer: keys[0], ts: tx?.blockTime, slot: tx?.slot, err: tx?.meta?.err };
}

async function allSigs(addr, maxPages) { // newest first; walks back to the oldest (or the page cap)
  let before, all = [], done = false;
  for (let p = 0; p < maxPages; p++) {
    const page = await call("getSignaturesForAddress", [addr, { limit: 1000, ...(before ? { before } : {}) }]);
    all = all.concat(page); if (page.length < 1000) { done = true; break; } before = page[page.length - 1].signature;
  }
  return { sigs: all, complete: done };
}
async function walletAge(w) { // first transaction time, funder of a young wallet
  const s = await call("getSignaturesForAddress", [w, { limit: 1000 }]);
  if (!s.length) return { firstTs: null, txs: 0 };
  if (s.length >= 1000) return { firstTs: null, txs: 1000, old: true };
  const first = s[s.length - 1], info = { firstTs: first.blockTime, txs: s.length };
  if (Date.now() / 1000 - first.blockTime < 7 * 86400) { try { const tx = await call("getTransaction", TX(first.signature)); const keys = keysOf(tx), pre = tx?.meta?.preBalances || [], post = tx?.meta?.postBalances || [];
    let best = null, drop = 0; for (let i = 0; i < keys.length; i++) { const d = (pre[i] || 0) - (post[i] || 0); if (keys[i] !== w && d > drop) { drop = d; best = keys[i]; } } info.funder = best; info.fundedSol = drop / 1e9; } catch {} }
  return info;
}

// ---------- the report ----------
const cache = new Map(); let running = null;
export async function coinReport(mint, force = false) {
  mint = String(mint || "").trim();
  try { if (unb58(mint).length !== 32) throw 0; } catch { return { ok: false, error: "that is not a Solana address" }; }
  const c = cache.get(mint); if (!force && c && Date.now() - c.at < 60_000) return c.r;
  if (running) { try { await running; } catch {} } // one lookup at a time
  const t0 = Date.now(); used = 0; coinStat.lookups++;
  running = build(mint).catch((e) => ({ ok: false, error: e.message }));
  const r = await running; running = null; r.calls = used; r.ms = Date.now() - t0; coinStat.lastMs = r.ms; if (!r.ok) coinStat.lastErr = r.error;
  if (r.ok) { cache.set(mint, { at: Date.now(), r }); if (cache.size > 200) cache.delete(cache.keys().next().value); }
  return r;
}

const BOOK = { grf: "GR (GR2 if a bundle launch)", sn8: "S8 (BL if a bundle launch)", p5e30: "A (AS if it passed)", grad: "every graduation", momentum: "E momentum", k: "K", sn3: "S3", sn4: "S4", gradrec: "gradrec", early: "early" };
const one = (sql, ...a) => { try { return db ? db.prepare(sql).get(...a) : null; } catch { return null; } };
const all = (sql, ...a) => { try { return db ? db.prepare(sql).all(...a) : []; } catch { return []; } };

async function build(mint) {
  const R = { ok: true, mint, now: Math.floor(Date.now() / 1000), notes: [] }; let solUsd = solUsdNow(); if (!HELIUS()) return { ok: false, error: "no Helius key on the box (HELIUS_API_KEY in /root/tracker/.env)" };

  // 1. our database (only coins the tracker saw)
  const tok = one(`SELECT * FROM tokens WHERE mint=?`, mint);
  R.db = tok ? { seen: true, name: tok.name, symbol: tok.symbol, creator: tok.creator, create_ts: tok.create_ts, bundle_pct: tok.bundle_pct, bundle_sol: tok.bundle_sol, bundle_wallets: tok.bundle_wallets, dev_buy_sol: tok.dev_buy_sol, tier: tok.tier, factory: tok.factory, handoffs: tok.handoffs,
    has_socials: tok.has_socials, socials: tok.socials, outside_buyers: tok.outside_buyers, cluster_sol_in: tok.cluster_sol_in, cluster_sol_out: tok.cluster_sol_out, creator_age_s: tok.creator_age_s, creator_funded_sol: tok.creator_funded_sol,
    creator_fee_sol: tok.creator_fee_sol, peak_mc_usd: tok.peak_mc_usd, entry_mc_usd: tok.entry_mc_usd, graduated: tok.graduated } : { seen: false };
  if (tok?.creator) {
    const h = one(`SELECT COUNT(*) n, SUM(CASE WHEN graduated=1 THEN 1 ELSE 0 END) grads, MAX(peak_mc_usd) best, SUM(CASE WHEN create_ts>? THEN 1 ELSE 0 END) n24 FROM tokens WHERE creator=? AND mint<>?`, R.now - 86400, tok.creator, mint);
    R.db.creatorHistory = h; R.db.creatorClaims = one(`SELECT COUNT(*) n, SUM(sol) sol FROM creator_claims WHERE creator=?`, tok.creator);
  }
  R.db.life = all(`SELECT cp, mc, holders, top10_pct, buyers_total, vol5m_usd, graduated FROM token_life WHERE mint=? ORDER BY cp`, mint);
  R.books = all(`SELECT * FROM paper_trades WHERE mint=? ORDER BY entry_ts`, mint).map((b) => ({ strategy: b.strategy, book: BOOK[b.strategy] || b.strategy, entry_ts: b.entry_ts, entry_mc: b.entry_mc, peak_mult: b.peak_mult, exit_reason: b.exit_reason, closed: b.closed, x_tsl40: b.x_tsl40, x_h3: b.x_h3, x_h5: b.x_h5, x_flow4: b.x_flow4, holders_entry: b.holders_entry, top10_entry: b.top10_entry }));
  R.db.early = all(`SELECT wallet, role, tokens, sol_in, sol_out, wallet_age_s, funder FROM cluster_wallets WHERE mint=?`, mint);

  // 2. mint account: supply, decimals, authorities, token program
  const mi = await call("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
  if (!mi?.value) return { ok: false, error: "no such token on Solana (the mint account does not exist)" };
  const info = mi.value.data?.parsed?.info || {}, tokenProg = mi.value.owner;
  const dec = Number(info.decimals ?? 6), supplyRaw = BigInt(info.supply || 0), supply = Number(supplyRaw) / 10 ** dec;
  R.token = { decimals: dec, supply, program: tokenProg === TOKEN ? "SPL Token" : "Token-2022", mintAuthority: info.mintAuthority || null, freezeAuthority: info.freezeAuthority || null };
  const pctOf = (raw) => (supply > 0 ? (Number(raw) / 10 ** dec / supply) * 100 : null);

  // 3. venue now: bonding curve or PumpSwap pool
  const curve = curveOf(mint), pool = poolOf(mint), poolAuth0 = pda(["pool-authority", mint], PUMP);
  const [cv] = (await call("getMultipleAccounts", [[curve], { encoding: "base64" }])).value;
  let complete = null, creatorOnCurve = null, priceSol = null, venue = "unknown";
  if (cv) { const b = Buffer.from(cv.data[0], "base64");
    if (b.length >= 49) { const vTok = b.readBigUInt64LE(8), vSol = b.readBigUInt64LE(16); complete = b[48] === 1; if (b.length >= 81) creatorOnCurve = bs58(b.subarray(49, 81));
      if (!complete && vTok > 0n) { priceSol = (Number(vSol) / 1e9) / (Number(vTok) / 10 ** dec); venue = "bonding curve"; R.curveProgress = Math.min(100, (Number(b.readBigUInt64LE(32)) / 1e9 / 85) * 100); } } }
  if (complete !== false) {
    const [pa, pb] = (await call("getMultipleAccounts", [[ataOf(pool, mint, tokenProg), ataOf(pool, WSOL, TOKEN)], { encoding: "jsonParsed" }])).value;
    const base = Number(pa?.data?.parsed?.info?.tokenAmount?.uiAmount || 0), quote = Number(pb?.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
    if (base > 0 && quote > 0) { priceSol = quote / base; venue = "PumpSwap pool"; R.poolSol = quote; }
  }
  if (!cv) R.notes.push("Not a pump.fun coin (no bonding curve): the launch section is skipped; holders and the now section still work.");
  R.nowMarket = { venue, priceSol, mcUsd: null, graduated: complete, pool, curve };

  // 4. DexScreener (free, from the box): volume, liquidity, change, socials
  try { const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(6000) }); const j = await r.json();
    const p = (j.pairs || []).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    if (p) R.dex = { dex: p.dexId, priceUsd: Number(p.priceUsd), mc: p.marketCap || p.fdv, liq: p.liquidity?.usd, vol24: p.volume?.h24, vol1h: p.volume?.h1, ch5m: p.priceChange?.m5, ch1h: p.priceChange?.h1, ch6h: p.priceChange?.h6, ch24: p.priceChange?.h24,
      buys24: p.txns?.h24?.buys, sells24: p.txns?.h24?.sells, pairCreated: p.pairCreatedAt ? Math.floor(p.pairCreatedAt / 1000) : null, name: p.baseToken?.name, symbol: p.baseToken?.symbol, links: [...(p.info?.websites || []).map((w) => w.url), ...(p.info?.socials || []).map((s) => s.url)], paid: !!(p.info?.imageUrl) };
    if (!solUsd && Number(p.priceNative) > 0 && Number(p.priceUsd) > 0) solUsd = Number(p.priceUsd) / Number(p.priceNative); } catch {}
  R.solUsd = solUsd; if (priceSol && solUsd) R.nowMarket.mcUsd = priceSol * supply * solUsd;
  const mcAt = (solAbs, tokAbs) => (solUsd && tokAbs > 0 ? (solAbs / (tokAbs / 10 ** dec)) * supply * solUsd : null); // market cap implied by one trade (SOL incl. fees; today's SOL price)

  // 5. the launch, rebuilt from the curve's oldest transactions
  let launch = null;
  if (cv) {
    const { sigs, complete: reached } = await allSigs(curve, 25);
    if (!reached) R.notes.push("The bonding curve had more than 25,000 transactions; the launch could not be rebuilt from the chain" + (tok ? " — the database figures are used." : "."));
    else if (sigs.length) {
      const asc = sigs.filter((s) => !s.err).reverse(), slot0 = asc[0].slot, early = asc.filter((s) => s.slot <= slot0 + 150).slice(0, 160); // ~first minute, at most 160 transactions
      const txs = await batch("getTransaction", early.map((s) => TX(s.signature)));
      const skip = new Set([curve, pool]), trades = [];
      let creator = creatorOnCurve || tok?.creator || null, createTs = txs[0]?.blockTime || asc[0].blockTime;
      for (const tx of txs) { if (!tx || tx.meta?.err) continue; const d = deltas(tx, mint);
        for (const [o, v] of d.out) { if (skip.has(o)) continue; trades.push({ wallet: o, slot: d.slot, ts: d.ts, tok: v.tok, sol: v.sol, sig: tx.transaction?.signatures?.[0] }); } }
      if (!creator) creator = keysOf(txs[0])[0];
      const W = new Map();
      for (const t of trades) { const w = W.get(t.wallet) || { wallet: t.wallet, tok: 0n, sol: 0, firstSlot: t.slot, firstTs: t.ts, buys: 0, sells: 0 }; w.tok += t.tok; if (t.sol != null) w.sol += t.sol; if (t.tok > 0n) w.buys++; else w.sells++; W.set(t.wallet, w); }
      const role = (w) => (w.wallet === creator ? "dev" : w.firstSlot === slot0 ? "bundle" : w.firstSlot <= slot0 + 4 ? "sniper" : "early");
      const list = [...W.values()].map((w) => { const bought = trades.filter((t) => t.wallet === w.wallet && t.tok > 0n).reduce((a, t) => a + t.tok, 0n), solIn = -trades.filter((t) => t.wallet === w.wallet && t.tok > 0n && t.sol != null).reduce((a, t) => a + t.sol, 0) / 1e9;
        return { wallet: w.wallet, role: role(w), slotAfter: w.firstSlot - slot0, secAfter: w.firstTs != null && createTs != null ? w.firstTs - createTs : null, boughtPct: pctOf(bought), solIn: +solIn.toFixed(3), heldAfter1mPct: pctOf(w.tok > 0n ? w.tok : 0n), soldIn1m: w.sells > 0 }; });
      const sum = (r) => list.filter((w) => w.role === r).reduce((a, w) => ({ n: a.n + 1, pct: a.pct + (w.boughtPct || 0), sol: a.sol + (w.solIn || 0) }), { n: 0, pct: 0, sol: 0 });
      launch = { createTs, slot0, creator, windowTxs: early.length, dev: sum("dev"), bundle: sum("bundle"), snipers: sum("sniper"), early1m: sum("early"),
        wallets: list.sort((a, b) => (b.boughtPct || 0) - (a.boughtPct || 0)), curveTxs: sigs.length };
      const buyersFirstMin = list.filter((w) => w.secAfter != null && w.secAfter <= 60 && (w.boughtPct || 0) > 0);
      launch.first60s = { buyers: buyersFirstMin.length, pct: buyersFirstMin.reduce((a, w) => a + (w.boughtPct || 0), 0) };
      const gradTx = sigs.find((s) => !s.err); // newest curve tx; for a graduated coin this is around migration
      if (complete) launch.gradAfterS = gradTx?.blockTime && createTs ? gradTx.blockTime - createTs : null;
    }
  }
  R.launch = launch;

  // 6. what the launch wallets did since: balance now + their history on this coin
  const RO = { dev: 0, bundle: 1, sniper: 2, early: 3 };
  const tracked = launch ? launch.wallets.filter((w) => w.role !== "early" || (w.boughtPct || 0) >= 1).sort((a, b) => RO[a.role] - RO[b.role] || (b.boughtPct || 0) - (a.boughtPct || 0)).slice(0, 25) : (R.db.early || []).slice(0, 25).map((w) => ({ wallet: w.wallet, role: w.role }));
  if (tracked.length) {
    const atas = tracked.map((w) => ataOf(w.wallet, mint, tokenProg));
    const accs = (await call("getMultipleAccounts", [atas, { encoding: "jsonParsed" }])).value;
    tracked.forEach((w, i) => { const a = accs[i]?.data?.parsed?.info?.tokenAmount; w.nowPct = a ? pctOf(BigInt(a.amount)) : 0; w.ata = atas[i]; });
    // history: the token account's signatures (buys, sells, transfers in and out), up to 30 a wallet, for the 15 biggest
    const hist = tracked.slice(0, 15);
    const sigLists = await batch("getSignaturesForAddress", hist.map((w) => [w.ata, { limit: 30 }]), 15);
    const want = []; hist.forEach((w, i) => { const s = (sigLists[i] || []).filter((x) => !x.err); w.histN = s.length; w.histPartial = s.length >= 30; for (const x of s) want.push([i, x.signature]); });
    const htx = await batch("getTransaction", want.map(([, s]) => TX(s)));
    hist.forEach((w) => (w.ev = []));
    const skipO = new Set([curve, pool]);
    want.forEach(([i, s], k) => { const tx = htx[k]; if (!tx) return; const D = deltas(tx, mint).out, d = D.get(hist[i].wallet); if (!d) return;
      const solMove = d.sol == null ? 0 : d.sol, kind = d.tok > 0n ? (solMove < -2e6 ? "buy" : "in") : (solMove > 2e6 ? "sell" : "out"), tokAbs = Number(d.tok < 0n ? -d.tok : d.tok);
      const other = kind === "in" || kind === "out" ? [...D.entries()].find(([o, v]) => o !== hist[i].wallet && !skipO.has(o) && (d.tok < 0n ? v.tok > 0n : v.tok < 0n))?.[0] || null : null;
      hist[i].ev.push({ ts: tx.blockTime, kind, pct: pctOf(d.tok < 0n ? -d.tok : d.tok), sol: +(solMove / 1e9).toFixed(3), mc: kind === "buy" || kind === "sell" ? mcAt(Math.abs(solMove) / 1e9, tokAbs) : null, other }); });
    for (const w of hist) { w.ev.sort((a, b) => a.ts - b.ts); let sold = false, rebuy = false, outs = 0, firstSell = null;
      for (const e of w.ev) { if (e.kind === "sell") { sold = true; firstSell ??= e.ts; } if (e.kind === "buy" && sold) rebuy = true; if (e.kind === "out") outs++; }
      w.sold = sold; w.rebought = rebuy; w.movedOut = outs; w.firstSellAfterS = firstSell && launch?.createTs ? firstSell - launch.createTs : null;
      const sells = w.ev.filter((e) => e.kind === "sell"); w.soldSol = +sells.reduce((a, e) => a + e.sol, 0).toFixed(2);
      w.firstSellMc = sells[0]?.mc ?? null; const ws_ = sells.filter((e) => e.mc != null); w.avgSellMc = ws_.length ? ws_.reduce((a, e) => a + e.mc * e.sol, 0) / ws_.reduce((a, e) => a + e.sol, 0) : null;
      w.sentTo = [...new Set(w.ev.filter((e) => e.kind === "out" && e.other).map((e) => e.other))]; w.events = w.ev.map((e) => ({ ts: e.ts, kind: e.kind, pct: e.pct, sol: e.sol, mc: e.mc, other: e.other }));
      w.status = w.nowPct > 0.01 ? (rebuy ? "sold, bought back, holds" : sold ? "sold part, holds" : outs ? "moved some out, holds" : "still holds") : (rebuy ? "sold, bought back, sold again" : outs && !sold ? "moved it all out (transfer)" : sold ? "sold out" : "holds none"); }
    for (const w of tracked.slice(15)) w.status = w.nowPct > 0.01 ? "holds (history not read)" : "holds none (history not read)";
    R.tracked = tracked;
    const grp = (r) => tracked.filter((w) => w.role === r);
    R.launchNow = Object.fromEntries(["dev", "bundle", "sniper"].map((r) => [r, { n: grp(r).length, atLaunchPct: grp(r).reduce((a, w) => a + (w.boughtPct || 0), 0), nowPct: grp(r).reduce((a, w) => a + (w.nowPct || 0), 0), soldOut: grp(r).filter((w) => !(w.nowPct > 0.01)).length, rebought: grp(r).filter((w) => w.rebought).length, movedOut: grp(r).filter((w) => w.movedOut).length }]));
  }

  // 7. holders now: largest 20 accounts with owners and labels; holder count (DAS, up to 5,000)
  const big = (await call("getTokenLargestAccounts", [mint, { commitment: "confirmed" }]))?.value || [];
  const owners = big.length ? (await call("getMultipleAccounts", [big.map((b) => b.address), { encoding: "jsonParsed" }])).value : [];
  const poolAuth = poolAuth0, roleOf = new Map((R.tracked || []).map((w) => [w.wallet, w.role]));
  let holders = big.map((b, i) => ({ owner: owners[i]?.data?.parsed?.info?.owner || null, pct: pctOf(BigInt(b.amount)) })).filter((h) => h.owner);
  holders = holders.map((h) => ({ ...h, label: h.owner === pool || h.owner === poolAuth ? "PumpSwap pool" : h.owner === curve ? "bonding curve" : h.owner === (launch?.creator || tok?.creator) ? "dev" : roleOf.get(h.owner) || "" }));
  const real = holders.filter((h) => !/pool|curve/.test(h.label));
  R.holders = { top: holders, top10Pct: real.slice(0, 10).reduce((a, h) => a + h.pct, 0), top20Pct: real.slice(0, 20).reduce((a, h) => a + h.pct, 0), largestPct: real[0]?.pct ?? null };
  try { let n = 0; for (let page = 1; page <= 5; page++) { charge("getTokenAccounts"); const r = await fetch(URL_(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenAccounts", params: { mint, limit: 1000, page, options: { showZeroBalance: false } } }), signal: AbortSignal.timeout(10000) });
    const j = await r.json(); const accs = j?.result?.token_accounts || []; n += accs.filter((a) => Number(a.amount || 0) > 0).length; if (accs.length < 1000) { R.holders.count = n; break; } if (page === 5) R.holders.count = "5,000+"; } } catch {}

  // 7b. who is buying now: the last 200 trades on the pool (or the curve), buyers by SOL — the wallets that came in after the launch
  let recent = null;
  try { const venueAddr = complete ? pool : curve; const sg = ((await call("getSignaturesForAddress", [venueAddr, { limit: 300 }])) || []).filter((x) => !x.err).slice(0, 200);
    const rt = await batch("getTransaction", sg.map((x) => TX(x.signature))); const B = new Map(); let sells = 0, from = null, to = null;
    for (const tx of rt) { if (!tx) continue; from = from == null ? tx.blockTime : Math.min(from, tx.blockTime); to = Math.max(to || 0, tx.blockTime);
      for (const [o, v] of deltas(tx, mint).out) { if (o === pool || o === curve || o === poolAuth0) continue;
        if (v.tok > 0n && (v.sol ?? 0) < -2e6) { const b = B.get(o) || { wallet: o, sol: 0, buys: 0, last: 0, tok: 0n }; b.sol += -(v.sol) / 1e9; b.buys++; b.last = Math.max(b.last, tx.blockTime); b.tok += v.tok; B.set(o, b); }
        else if (v.tok < 0n && (v.sol ?? 0) > 2e6) sells++; } }
    const list = [...B.values()].sort((a, b) => b.sol - a.sol).map((b) => ({ wallet: b.wallet, sol: +b.sol.toFixed(3), buys: b.buys, last: b.last, pct: pctOf(b.tok) }));
    recent = { from, to, trades: rt.filter(Boolean).length, buyers: list.length, sells, list: list.slice(0, 60) }; } catch (e) { R.notes.push("Recent buyers could not be read: " + e.message); }

  // 8. fresh wallets and shared funders: the top 20 real holders, the launch wallets and the recent buyers (at most 100 wallets)
  const ws = [...new Set([...real.slice(0, 20).map((h) => h.owner), ...(R.tracked || []).map((w) => w.wallet), ...(recent?.list || []).map((b) => b.wallet)])].slice(0, 100);
  const ages = new Map(); let capped = false;
  for (let i = 0; i < ws.length && !capped; i += 8) await Promise.all(ws.slice(i, i + 8).map(async (w) => { try { ages.set(w, await walletAge(w)); } catch (e) { if (/budget|cap/.test(e.message) && !capped) { capped = true; R.notes.push(e.message + " — fresh-wallet figures are partial."); } } }));
  const ref = launch?.createTs || tok?.create_ts || R.now, FRESH = 86400;
  const fresh = (w) => { const a = ages.get(w); return !!(a && a.firstTs != null && !a.old && a.firstTs > ref - FRESH); }; // fresh = first transaction less than a day before the launch, or any time after it
  const funders = new Map(); for (const [w, a] of ages) if (a.funder) funders.set(a.funder, [...(funders.get(a.funder) || []), w]);
  const linked = [...funders.entries()].filter(([, l]) => l.length >= 2).map(([f, l]) => ({ funder: f, wallets: l, n: l.length }));
  for (const h of holders) { const a = ages.get(h.owner); if (a) { h.fresh = fresh(h.owner); h.ageH = a.firstTs ? +((R.now - a.firstTs) / 3600).toFixed(1) : null; h.funder = a.funder || null; } }
  for (const w of R.tracked || []) { const a = ages.get(w.wallet); if (a) { w.fresh = fresh(w.wallet); w.ageAtLaunchH = a.firstTs && ref ? +((ref - a.firstTs) / 3600).toFixed(1) : null; w.funder = a.funder || null; } }
  const rf = real.slice(0, 20).filter((h) => ages.has(h.owner)), lf = (R.tracked || []).filter((w) => ages.has(w.wallet));
  R.fresh = { top20: rf.length ? { n: rf.length, fresh: rf.filter((h) => h.fresh).length, pctSupply: rf.filter((h) => h.fresh).reduce((a, h) => a + h.pct, 0) } : null,
    launch: lf.length ? { n: lf.length, fresh: lf.filter((w) => w.fresh).length } : null, linked, creatorAgeH: (() => { const a = ages.get(launch?.creator || tok?.creator); return a?.firstTs ? +((ref - a.firstTs) / 3600).toFixed(1) : tok?.creator_age_s != null ? +(tok.creator_age_s / 3600).toFixed(1) : null; })() };

  // 8b. did the launch wallets come back in through new wallets? (funded by a launch wallet, funded by the same wallet as one, or handed tokens by one)
  const launchW = new Map((R.tracked || []).filter((w) => w.role !== "early").map((w) => [w.wallet, w])), launchFunder = new Map();
  for (const [w, l] of launchW) if (l.funder) launchFunder.set(l.funder, l);
  const sentBy = new Map(); for (const [, l] of launchW) for (const r of l.sentTo || []) sentBy.set(r, l);
  const recycle = [];
  for (const w of new Set([...real.slice(0, 20).map((h) => h.owner), ...(recent?.list || []).map((b) => b.wallet), ...sentBy.keys()])) {
    if (launchW.has(w)) continue; const a = ages.get(w), f = a?.funder, ln = f && launchW.get(f), lf2 = f && launchFunder.get(f), sb = sentBy.get(w);
    const how = sb ? ["was handed tokens by", sb] : ln ? ["was funded by", ln] : lf2 ? ["has the same funder as", lf2] : null; if (!how) continue;
    const h = holders.find((x) => x.owner === w), rb = recent?.list.find((b) => b.wallet === w);
    recycle.push({ wallet: w, how: how[0], from: how[1].wallet, role: how[1].role, fresh: fresh(w), holdsPct: h?.pct ?? null, boughtSol: rb?.sol ?? null }); }
  R.recycle = recycle;
  if (recent) { for (const b of recent.list) { const a = ages.get(b.wallet); b.fresh = fresh(b.wallet); b.ageH = a?.firstTs ? +((R.now - a.firstTs) / 3600).toFixed(1) : null; b.funder = a?.funder || null; b.link = recycle.find((r) => r.wallet === b.wallet) || null; }
    const chk = recent.list.filter((b) => ages.has(b.wallet)); recent.checked = chk.length; recent.fresh = chk.filter((b) => b.fresh).length; recent.freshSol = +chk.filter((b) => b.fresh).reduce((a, b) => a + b.sol, 0).toFixed(2); recent.sol = +chk.reduce((a, b) => a + b.sol, 0).toFixed(2); recent.linked = chk.filter((b) => b.link).length; }
  R.recent = recent;

  // 9. diagnosis — facts in plain words, worst first
  R.diag = diagnose(R);
  R.name = R.db.name || R.dex?.name || null; R.symbol = R.db.symbol || R.dex?.symbol || null;
  return R;
}

function diagnose(R) {
  const d = [], add = (lvl, txt) => d.push({ lvl, txt }), f1 = (x) => (x == null ? "?" : x.toFixed(1)), L = R.launch, N = R.launchNow, H = R.holders, F = R.fresh;
  if (R.token.mintAuthority) add("red", `Mint authority is NOT revoked (${R.token.mintAuthority.slice(0, 6)}…): more tokens can be printed.`);
  if (R.token.freezeAuthority) add("red", `Freeze authority is set: wallets can be frozen so they cannot sell.`);
  const bp = L?.bundle?.pct ?? R.db.bundle_pct;
  if (bp != null) { const bw = L?.bundle?.n ?? R.db.bundle_wallets;
    if (bp >= 79 && bw === 1) add("red", `Full-curve factory launch: one wallet bought ${f1(bp)}% in the create block. These graduate instantly and the next price is ~8x higher — not buyable.`);
    else if (bp >= 70 && bp < 80 && bw >= 4 && bw <= 10) add("amber", `Bundle launch (the GR2 / BL type): ${f1(bp)}% of supply bought in the create block over ${bw} wallets. 80% of these graduate; nearly all are dumped in one burst within 15–30 min.`);
    else if (bp >= 30) add("amber", `Heavily bundled: ${f1(bp)}% of supply bought in the create block over ${bw} wallets.`);
    else add("ok", `Launch bundle ${f1(bp)}% over ${bw} wallets — ordinary.`); }
  const op = (L?.bundle?.pct >= 74.2 && L?.bundle?.pct <= 74.9 && L?.bundle?.n >= 4 && L?.bundle?.n <= 6 && !(L?.dev?.pct > 0.01)) && F?.creatorAgeH >= 10 && F?.creatorAgeH <= 30;
  if (op) add("good", `Matches the operator fingerprint behind GR2's 10–30x coins (bundle 74.3–74.8% over 4–6 wallets, no dev buy, creator wallet made ${f1(F.creatorAgeH)} h before launch).`);
  if (R.db.bundle_wallets === 10 && R.db.bundle_pct >= 37 && R.db.bundle_pct <= 41 && (R.db.dev_buy_sol || 0) < 0.2) add("red", "Matches the 10-wallet pump-and-dump operator (bundle 37–41% over 10 wallets): typically $200K at 60 s, $4K at 1 h.");
  if (N?.bundle?.n) { const b = N.bundle; add(b.nowPct > 5 ? "amber" : "ok", `Bundle wallets: held ${f1(b.atLaunchPct)}% at launch, hold ${f1(b.nowPct)}% now; ${b.soldOut} of ${b.n} sold out${b.rebought ? `, ${b.rebought} sold and bought back` : ""}${b.movedOut ? `, ${b.movedOut} moved tokens to other wallets` : ""}.`); }
  if (N?.dev?.n) { const v = N.dev; add(v.nowPct > 5 ? "amber" : "ok", v.nowPct > 0.01 ? `Dev bought ${f1(v.atLaunchPct)}% at launch and still holds ${f1(v.nowPct)}%.` : `Dev bought ${f1(v.atLaunchPct)}% at launch and holds none now${v.rebought ? " (sold, bought back, sold again)" : ""}.`); }
  else if (L) add("ok", "Dev made no buy at launch.");
  if (N?.sniper?.n) { const s = N.sniper; add(s.nowPct > 10 ? "amber" : "ok", `Snipers (bought in the 4 blocks after the create): ${s.n} wallet${s.n === 1 ? "" : "s"} took ${f1(s.atLaunchPct)}%, hold ${f1(s.nowPct)}% now${s.rebought ? `; ${s.rebought} sold and bought back` : ""}.`); }
  const RC = R.recycle || []; if (RC.length) { const c = (h) => RC.filter((r) => r.how === h).length, parts = [[c("was handed tokens by"), "handed tokens by one"], [c("was funded by"), "funded by one"], [c("has the same funder as"), "sharing a funder with one"]].filter(([n]) => n).map(([n, t]) => `${n} ${t}`);
    add("red", `The launch came back in through other wallets: ${RC.length} wallet${RC.length === 1 ? "" : "s"} trace back to a dev, bundle or sniper wallet (${parts.join(", ")})${RC.filter((r) => r.fresh).length ? `; ${RC.filter((r) => r.fresh).length} are fresh` : ""}. Between them they hold ${f1(RC.reduce((a, r) => a + (r.holdsPct || 0), 0))}% now.`); }
  const bs = (R.tracked || []).filter((w) => w.role === "bundle" && w.firstSellMc); if (bs.length) { const m = bs.map((w) => w.firstSellMc).sort((a, b) => a - b); add("ok", `The bundle started selling at about $${Math.round(m[0] / 1000)}K–$${Math.round(m[m.length - 1] / 1000)}K market cap (first sale of each wallet; today's SOL price).`); }
  const RB = R.recent; if (RB?.checked) add(RB.fresh >= RB.checked / 2 ? "amber" : "ok", `Buyers in the last ${RB.trades} trades: ${RB.buyers} wallets; of the ${RB.checked} checked, ${RB.fresh} are fresh (made less than a day before the launch or after it), putting in ${RB.freshSol} of ${RB.sol} SOL.`);
  if (H?.top10Pct != null) add(H.top10Pct > 35 ? "amber" : "ok", `Top 10 holders (pool and curve left out) hold ${f1(H.top10Pct)}%; the largest ${f1(H.largestPct)}%.`);
  if (F?.top20) add(F.top20.fresh >= F.top20.n / 2 ? "amber" : "ok", `Fresh wallets (first transaction under a day before launch): ${F.top20.fresh} of the top ${F.top20.n} holders, holding ${f1(F.top20.pctSupply)}% of supply.`);
  for (const l of F?.linked || []) if (l.n >= 2) add(l.n >= 3 ? "amber" : "ok", `${l.n} of these wallets were funded by the same wallet (${l.funder.slice(0, 6)}…) — one person behind several holders.`);
  if (F?.creatorAgeH != null) add("ok", `Creator wallet was ${F.creatorAgeH < 1 ? "under an hour" : F.creatorAgeH > 48 ? Math.round(F.creatorAgeH / 24) + " days" : f1(F.creatorAgeH) + " h"} old at launch.`);
  const ch = R.db.creatorHistory; if (ch?.n) add(ch.n >= 20 && (ch.grads || 0) <= 2 ? "amber" : "ok", `Creator's other launches we saw: ${ch.n} (${ch.n24 || 0} in the last 24 h), ${ch.grads || 0} graduated, best $${Math.round((ch.best || 0) / 1000)}K.`);
  if (R.db.peak_mc_usd && R.nowMarket.mcUsd) add("ok", `Market cap now $${Math.round(R.nowMarket.mcUsd / 1000)}K against a recorded peak of $${Math.round(R.db.peak_mc_usd / 1000)}K (${f1((R.nowMarket.mcUsd / R.db.peak_mc_usd) * 100)}% of peak).`);
  return d.sort((a, b) => ["red", "amber", "good", "ok"].indexOf(a.lvl) - ["red", "amber", "good", "ok"].indexOf(b.lvl));
}
