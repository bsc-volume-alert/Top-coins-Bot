// launcher 0.7.0 (owner, 3 Nov 2026 10:16–10:22 UK: "find the early wallet buyers linked to the actual coin dev … trace it back to its source … the funder wallet …
// build up an excellent database of funder wallets … use Helius as much as you need"). THE OPERATOR DATABASE.
//
// What it does. For every studied coin (study_buyers: creator + first-100 buyers, with block-0 / sniper flags) it traces the wallets that matter —
// the creator, the creation-block (bundle) wallets and the first-3-second snipers — back through Helius's Wallet API:
//   funded-by  : the wallet's FIRST incoming SOL transfer (who, how much, when) with Helius's entity label when the sender is known (Centralized Exchange…)
//   transfers  : where a wallet's SOL went OUT after the coin (the profit trail, one hop)
// Each hop is cached for good (a wallet's first funding never changes). Private funders are followed one more hop (funder of the funder).
// Then it clusters: two coins share an operator when they share a funder (private, not a CEX / program / public wallet), a bundle wallet, or a
// payout destination. Operators are scored: launches, runners (peak ≥ $30K and ≥ $25K at 5 or 15 min), hit rate, median peak, CEX habit.
// Read-only. Nothing is bought. Tables: wallet_trace, wallet_out, operators, operator_coins. Exported as operators.csv, operator_coins.csv, wallet_trace.csv.
import { CFG } from "./config.mjs";

const n = (k, d) => (process.env[k] != null && process.env[k] !== "" && Number.isFinite(Number(process.env[k])) ? Number(process.env[k]) : d);
const HOPS = n("LAUNCH_OP_HOPS", 2), PER_RUN = n("LAUNCH_OP_PER_RUN", 400), OUT_HOP = n("LAUNCH_OP_OUT", 1);
export const opStat = { runs: 0, traced: 0, outs: 0, errors: 0, lastErr: "", lastRun: null, running: false, calls: 0, cex: 0, unknown404: 0, operators: 0, sample: null };
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
const API = process.env.LAUNCH_HELIUS_WALLET_API || "https://api.helius.xyz";
const key = () => CFG.HELIUS_KEY;

// Helius Wallet API (paid plan). 429 → back off; 404 → never funded by a SOL transfer (airdrop / program-created); 403 → plan.
async function wget(path, params = {}) {
  const q = new URLSearchParams({ ...params, "api-key": key() });
  for (let i = 0; i < 5; i++) {
    opStat.calls++;
    const r = await fetch(`${API}${path}?${q}`, { signal: AbortSignal.timeout(20000) });
    if (r.status === 429) { await nap(1500 * (i + 1)); continue; }
    if (r.status === 404) return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(`${path.split("/").pop()}: HTTP ${r.status} ${(j.error || j.message || "").toString().slice(0, 100)}`); e.http = r.status; throw e; }
    return j;
  }
  throw new Error("rate limited");
}

export function initOperators(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS wallet_trace (wallet TEXT PRIMARY KEY, funder TEXT, funder_name TEXT, funder_type TEXT, amount_sol REAL, funded_ts INTEGER, sig TEXT, hop INTEGER, err TEXT, checked_ts INTEGER);
  CREATE TABLE IF NOT EXISTS wallet_out (wallet TEXT, mint TEXT, dest TEXT, dest_name TEXT, dest_type TEXT, amount_sol REAL, ts INTEGER, sig TEXT, PRIMARY KEY (wallet, sig));
  CREATE TABLE IF NOT EXISTS operators (op_id INTEGER PRIMARY KEY AUTOINCREMENT, anchor TEXT UNIQUE, kind TEXT, coins INTEGER, runners INTEGER, hit_rate REAL, med_peak REAL, best_peak REAL, bundle_sol REAL, wallets INTEGER, cex_funded INTEGER, first_ts INTEGER, last_ts INTEGER, updated INTEGER);
  CREATE TABLE IF NOT EXISTS operator_coins (anchor TEXT, mint TEXT, role TEXT, link TEXT, PRIMARY KEY (anchor, mint, link));
  CREATE INDEX IF NOT EXISTS wt_funder ON wallet_trace(funder);`);
}

/** funded-by for one wallet, cached forever. Returns the row. */
export async function trace(db, wallet, hop = 0) {
  const have = db.prepare("SELECT * FROM wallet_trace WHERE wallet=?").get(wallet);
  if (have && (!have.err || have.err === "404")) return have;
  let row = { wallet, funder: null, funder_name: null, funder_type: null, amount_sol: null, funded_ts: null, sig: null, hop, err: null, checked_ts: Math.floor(Date.now() / 1000) };
  try {
    const j = await wget(`/v1/wallet/${wallet}/funded-by`);
    if (!j) { row.err = "404"; opStat.unknown404++; }
    else { row.funder = j.funder || null; row.funder_name = j.funderName || null; row.funder_type = j.funderType || null; row.amount_sol = j.amount != null ? Number(j.amount) : null; row.funded_ts = j.timestamp || null; row.sig = j.signature || null;
      if (!opStat.sample) opStat.sample = JSON.stringify(j).slice(0, 400); if (row.funder_type) opStat.cex += /exchange/i.test(row.funder_type) ? 1 : 0; }
    opStat.traced++;
  } catch (e) { row.err = e.message.slice(0, 120); opStat.errors++; opStat.lastErr = `${wallet.slice(0, 6)} ${row.err}`; if (e.http === 403 || e.http === 401) throw e; }
  db.prepare("INSERT OR REPLACE INTO wallet_trace VALUES (@wallet,@funder,@funder_name,@funder_type,@amount_sol,@funded_ts,@sig,@hop,@err,@checked_ts)").run(row);
  return row;
}
const isPublic = (r) => !!(r?.funder_type) || !r?.funder; // labelled entity (CEX, DeFi, market maker…) or none: not a private link

/** Outgoing SOL from a wallet after `sinceTs` (profit trail), one hop; cached per signature. */
export async function outflows(db, wallet, mint, sinceTs) {
  if (db.prepare("SELECT 1 FROM wallet_out WHERE wallet=? AND mint=? LIMIT 1").get(wallet, mint)) return;
  try {
    const j = await wget(`/v1/wallet/${wallet}/transfers`, { limit: "100", type: "native" });
    const list = j?.transfers || j?.data || j?.items || (Array.isArray(j) ? j : []);
    const ins = db.prepare("INSERT OR IGNORE INTO wallet_out VALUES (?,?,?,?,?,?,?,?)"); let k = 0;
    for (const t of list) {
      const ts = Number(t.timestamp || t.blockTime || 0), dir = String(t.direction || "").toLowerCase(), amt = Number(t.amount ?? t.uiAmount ?? 0);
      const dest = t.counterparty || t.to || t.destination || null;
      if (!dest || ts < sinceTs || !(dir === "out" || dir === "sent" || dir === "outgoing") || !(amt >= 0.05)) continue;
      ins.run(wallet, mint, dest, t.counterpartyName || null, t.counterpartyType || null, amt, ts, t.signature || `${wallet}:${ts}:${dest}`); k++;
    }
    if (!k) ins.run(wallet, mint, "", null, null, 0, sinceTs, `${wallet}:${mint}:none`); // mark as checked
    opStat.outs++;
  } catch (e) { opStat.errors++; opStat.lastErr = `out ${wallet.slice(0, 6)} ${e.message.slice(0, 100)}`; if (e.http === 403 || e.http === 401) throw e; }
}

/** The wallets that matter for a coin: creator, block-0 buyers, first-3-s snipers. */
function keyWallets(db, mint) {
  const c = db.prepare("SELECT data FROM study_coins WHERE mint=? AND err IS NULL").get(mint); if (!c) return null;
  let d; try { d = JSON.parse(c.data); } catch { return null; }
  const out = new Map(); if (d.creator) out.set(d.creator, "creator");
  for (const r of db.prepare("SELECT wallet, data FROM study_buyers WHERE mint=? ORDER BY rank").all(mint)) { let b; try { b = JSON.parse(r.data); } catch { continue; }
    if (b.block0) out.set(r.wallet, out.get(r.wallet) || "bundle"); else if (b.sniper) out.set(r.wallet, out.get(r.wallet) || "sniper"); }
  return { d, wallets: out };
}

/** One run: trace every key wallet of every studied coin not yet traced (HOPS deep), outflows for bundle wallets of runners, then recluster. */
export async function runOperators(db, done) {
  if (opStat.running || !key()) return; opStat.running = true; opStat.runs++;
  try {
    const coins = db.prepare("SELECT s.mint, p.created_ts FROM study_coins s LEFT JOIN copy_peaks p ON p.mint=s.mint WHERE s.err IS NULL ORDER BY s.studied_ts DESC").all();
    let budget = PER_RUN;
    for (const c of coins) {
      if (budget <= 0) break;
      const kw = keyWallets(db, c.mint); if (!kw) continue;
      for (const [w, role] of kw.wallets) {
        if (budget <= 0) break;
        let cur = w;
        for (let h = 0; h < HOPS && cur; h++) {
          const had = db.prepare("SELECT funder, funder_type, err FROM wallet_trace WHERE wallet=?").get(cur);
          const r = had && (!had.err || had.err === "404") ? had : (budget--, await trace(db, cur, h));
          if (!r || isPublic(r)) break; cur = r.funder;
        }
        if (OUT_HOP && role === "bundle" && kw.d.peak_mc_usd >= 30000 && budget > 0) { budget--; await outflows(db, w, c.mint, (kw.d.t0 || c.created_ts || 0)); }
      }
    }
    recluster(db);
    opStat.lastRun = new Date().toISOString();
  } catch (e) { opStat.errors++; opStat.lastErr = e.message.slice(0, 160); }
  finally { opStat.running = false; try { done?.(); } catch {} }
}

/** Cluster coins into operators by shared private funder (any hop), shared bundle wallet, or shared payout destination. Union-find over coins. */
export function recluster(db) {
  const coins = db.prepare("SELECT mint, data FROM study_coins WHERE err IS NULL").all().map((r) => { let d = {}; try { d = JSON.parse(r.data); } catch {} return { mint: r.mint, d }; }).filter((c) => c.d.venue === "pump.fun");
  const parent = new Map(); const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; }; const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent.set(a, b); };
  for (const c of coins) parent.set(c.mint, c.mint);
  const links = new Map(); // key -> {kind, mints:Set}
  const add = (keyS, kind, mint) => { if (!keyS) return; const k = kind + ":" + keyS; if (!links.has(k)) links.set(k, { kind, key: keyS, mints: new Set() }); links.get(k).mints.add(mint); };
  const traceOf = new Map(db.prepare("SELECT wallet, funder, funder_type, err FROM wallet_trace").all().map((r) => [r.wallet, r]));
  const outs = db.prepare("SELECT wallet, mint, dest, dest_type FROM wallet_out WHERE dest<>''").all();
  for (const c of coins) {
    const kw = keyWallets(db, c.mint); if (!kw) continue;
    for (const [w, role] of kw.wallets) {
      if (role === "bundle" || role === "creator") add(w, role === "creator" ? "creator" : "bundle_wallet", c.mint); // the same bundle wallet in two coins = one operator
      let cur = w; for (let h = 0; h < HOPS; h++) { const t = traceOf.get(cur); if (!t || !t.funder || t.funder_type) break; add(t.funder, "funder", c.mint); cur = t.funder; }
    }
  }
  for (const o of outs) if (!o.dest_type) add(o.dest, "payout", o.mint);
  // 0.7.1: the launch fingerprint — the same bundle % and SOL to two decimals on two coins is the same software and money (GR.md, 23 Oct: 79.31% / 85.0 SOL)
  for (const c of coins) { const t = c.d.tracker; if (t && t.bundle_pct >= 20 && t.bundle_sol >= 5) add(`${(+t.bundle_pct).toFixed(2)}/${(+t.bundle_sol).toFixed(1)}`, "fingerprint", c.mint); }
  // a key shared by too many coins is a public hub (a bot service, a popular distributor), not one operator
  const MAX_SHARE = n("LAUNCH_OP_MAX_SHARE", 60);
  const good = [...links.values()].filter((l) => l.mints.size >= 2 && l.mints.size <= MAX_SHARE && l.kind !== "creator");
  const pairLinks = new Map(); // "a|b" -> count of distinct link kinds/keys joining a and b
  for (const l of good) { const ms = [...l.mints]; for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) { const k = ms[i] < ms[j] ? ms[i] + "|" + ms[j] : ms[j] + "|" + ms[i]; pairLinks.set(k, (pairLinks.get(k) || 0) + 1); } }
  const size = () => { const sz = new Map(); for (const c of coins) { const r = find(c.mint); sz.set(r, (sz.get(r) || 0) + 1); } return sz; };
  // pass 1: pairs with 2+ independent links always merge; pass 2: single links merge only while both groups are small (< 8 coins) — one shared wallet must not glue two big operators together
  for (const [k, cnt] of pairLinks) if (cnt >= 2) { const [a, b] = k.split("|"); union(a, b); }
  const sz = size();
  for (const [k, cnt] of pairLinks) if (cnt === 1) { const [a, b] = k.split("|"); const ra = find(a), rb = find(b); if (ra !== rb && (sz.get(ra) || 1) < 8 && (sz.get(rb) || 1) < 8) { union(a, b); const m = (sz.get(ra) || 1) + (sz.get(rb) || 1); sz.set(find(a), m); } }
  // build operators
  const groups = new Map(); for (const c of coins) { const r = find(c.mint); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(c); }
  db.exec("DELETE FROM operators; DELETE FROM operator_coins");
  const insO = db.prepare("INSERT INTO operators (anchor, kind, coins, runners, hit_rate, med_peak, best_peak, bundle_sol, wallets, cex_funded, first_ts, last_ts, updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
  const insC = db.prepare("INSERT OR IGNORE INTO operator_coins VALUES (?,?,?,?)");
  const now = Math.floor(Date.now() / 1000); let nOps = 0;
  const peakRow = (m) => db.prepare("SELECT peak_mc, peak_close_mc, mc5, mc15, created_ts FROM copy_peaks WHERE mint=?").get(m);
  for (const [root, cs] of groups) {
    if (cs.length < 2) continue; // a lone coin is not (yet) an operator
    const myLinks = good.filter((l) => [...l.mints].some((m) => find(m) === root));
    const funders = myLinks.filter((l) => l.kind === "funder").sort((a, b) => b.mints.size - a.mints.size);
    const anchor = (funders[0] || myLinks.sort((a, b) => b.mints.size - a.mints.size)[0])?.key || root, kind = funders[0] ? "funder" : (myLinks[0]?.kind || "coin");
    const peaks = [], run = []; let bsol = [], cex = 0, wallets = new Set(), ts = [];
    for (const c of cs) {
      const p = peakRow(c.mint); const pk = Math.min(p?.peak_mc ?? c.d.peak_mc_usd ?? 0, (p?.peak_close_mc || Infinity) * 1.5) || 0; peaks.push(pk); const isRun = pk >= 30000 && Math.max(p?.mc5 || 0, p?.mc15 || 0, c.d.tracker ? pk : 0) >= 25000; run.push(isRun ? 1 : 0);
      if (c.d.block0_sol) bsol.push(c.d.block0_sol); ts.push(p?.created_ts || 0);
      const kw = keyWallets(db, c.mint); if (kw) for (const [w, role] of kw.wallets) { if (role !== "sniper") wallets.add(w); const t = traceOf.get(w); if (t?.funder_type && /exchange/i.test(t.funder_type)) cex++; }
      for (const l of myLinks) if (l.mints.has(c.mint)) insC.run(anchor, c.mint, c.d.role || "", `${l.kind}:${l.key}`);
    }
    const sorted = [...peaks].sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)] || 0;
    insO.run(anchor, kind, cs.length, run.reduce((a, b) => a + b, 0), +(run.reduce((a, b) => a + b, 0) / cs.length).toFixed(2), Math.round(med), Math.round(Math.max(...peaks)), bsol.length ? +(bsol.reduce((a, b) => a + b, 0) / bsol.length).toFixed(1) : null, wallets.size, cex, Math.min(...ts.filter(Boolean)) || null, Math.max(...ts) || null, now);
    nOps++;
  }
  opStat.operators = nOps;
}
