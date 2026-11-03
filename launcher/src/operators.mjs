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
import { rpc, keysOf } from "./study.mjs"; // 0.7.6: cheap RPC reads for throwaway creator wallets

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
  CREATE TABLE IF NOT EXISTS creator_trace (mint TEXT PRIMARY KEY, creator TEXT, create_ts INTEGER, peak_mc_usd REAL, graduated INTEGER, bundle_pct REAL, bundle_sol REAL, funder TEXT, funder_sol REAL, funded_ts INTEGER, creator_txs INTEGER, err TEXT, checked_ts INTEGER);
  CREATE INDEX IF NOT EXISTS ct_funder ON creator_trace(funder); CREATE INDEX IF NOT EXISTS ct_creator ON creator_trace(creator);
  CREATE TABLE IF NOT EXISTS snipers (wallet TEXT PRIMARY KEY, coins INTEGER, census INTEGER, runners INTEGER, hit_rate REAL, buy_sol REAL, sell_sol REAL, block0 INTEGER, creator_linked INTEGER, funder TEXT, funder_name TEXT, txs INTEGER, first_ts INTEGER, last_ts INTEGER, updated INTEGER);
  CREATE INDEX IF NOT EXISTS wt_funder ON wallet_trace(funder);`);
  for (const c of ["launches INTEGER", "graduated_all INTEGER", "hits_all INTEGER", "hit_rate_all REAL"]) try { db.exec(`ALTER TABLE operators ADD COLUMN ${c}`); } catch {} // 0.7.6
}

/** funded-by for one wallet, cached forever. Returns the row. */
export async function trace(db, wallet, hop = 0) {
  const have = db ? db.prepare("SELECT * FROM wallet_trace WHERE wallet=?").get(wallet) : null;
  if (have && (!have.err || have.err === "404")) return have;
  let row = { wallet, funder: null, funder_name: null, funder_type: null, amount_sol: null, funded_ts: null, sig: null, hop, err: null, checked_ts: Math.floor(Date.now() / 1000) };
  try {
    const j = await wget(`/v1/wallet/${wallet}/funded-by`);
    if (!j) { row.err = "404"; opStat.unknown404++; }
    else { row.funder = j.funder || null; row.funder_name = j.funderName || null; row.funder_type = j.funderType || null; row.amount_sol = j.amount != null ? Number(j.amount) : null; row.funded_ts = j.timestamp || null; row.sig = j.signature || null;
      if (!opStat.sample) opStat.sample = JSON.stringify(j).slice(0, 400); if (row.funder_type) opStat.cex += /exchange/i.test(row.funder_type) ? 1 : 0; }
    opStat.traced++;
  } catch (e) { row.err = e.message.slice(0, 120); opStat.errors++; opStat.lastErr = `${wallet.slice(0, 6)} ${row.err}`; if (e.http === 403 || e.http === 401) throw e; }
  if (db) db.prepare("INSERT OR REPLACE INTO wallet_trace VALUES (@wallet,@funder,@funder_name,@funder_type,@amount_sol,@funded_ts,@sig,@hop,@err,@checked_ts)").run(row);
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

/** 0.7.5: wallets that were in the creation block or the first 3 s of REPEAT_SNIPER or more studied coins are sniper bots, not an operator's identity
 *  (3 Nov 20:32 UK: 74 of 461 early wallets sat on 2+ of 43 census coins, the top ones on 14–15, buying 0.05–0.2 SOL each; they stitched 91 coins into one "operator"). */
const REPEAT_SNIPER = n("LAUNCH_OP_REPEAT_SNIPER", 3);
let repeatSet = new Set(), repeatAt = 0;
function repeatSnipers(db) {
  if (Date.now() - repeatAt < 60000) return repeatSet;
  const cnt = new Map();
  for (const r of db.prepare("SELECT wallet, data FROM study_buyers").all()) { let b; try { b = JSON.parse(r.data); } catch { continue; } if ((b.block0 || b.sniper) && !b.creatorLinked) cnt.set(r.wallet, (cnt.get(r.wallet) || 0) + 1); }
  repeatSet = new Set([...cnt].filter(([, c]) => c >= REPEAT_SNIPER).map(([w]) => w)); repeatAt = Date.now(); return repeatSet;
}

/** The wallets that matter for a coin: creator, block-0 buyers (bundle), first-3-s snipers. 0.7.5: a block-0 wallet that is a repeat sniper and not creator-linked is "sniper", not "bundle". */
function keyWallets(db, mint) {
  const c = db.prepare("SELECT data FROM study_coins WHERE mint=? AND err IS NULL").get(mint); if (!c) return null;
  let d; try { d = JSON.parse(c.data); } catch { return null; }
  const rep = repeatSnipers(db);
  const out = new Map(); if (d.creator) out.set(d.creator, "creator");
  for (const r of db.prepare("SELECT wallet, data FROM study_buyers WHERE mint=? ORDER BY rank").all(mint)) { let b; try { b = JSON.parse(r.data); } catch { continue; }
    if (b.block0 && (b.creatorLinked || !rep.has(r.wallet))) out.set(r.wallet, out.get(r.wallet) || "bundle"); else if (b.block0 || b.sniper) out.set(r.wallet, out.get(r.wallet) || "sniper"); }
  return { d, wallets: out };
}

/** 0.7.5: the sniper table — every wallet in the creation block / first 3 s of 2+ studied coins: coins, how many ran, SOL bought, SOL sold back inside the study window. (Studied coins are mostly winners, so this hit rate is an upper bound until the wallet's own history is read.) */
export function rebuildSnipers(db) {
  db.exec("CREATE TABLE IF NOT EXISTS snipers (wallet TEXT PRIMARY KEY, coins INTEGER, census INTEGER, runners INTEGER, hit_rate REAL, buy_sol REAL, sell_sol REAL, block0 INTEGER, creator_linked INTEGER, funder TEXT, funder_name TEXT, txs INTEGER, first_ts INTEGER, last_ts INTEGER, updated INTEGER)");
  const peak = new Map(db.prepare("SELECT mint, peak_mc FROM copy_peaks").all().map((r) => [r.mint, r.peak_mc || 0]));
  const role = new Map(db.prepare("SELECT mint, role, studied_ts FROM study_coins WHERE err IS NULL").all().map((r) => [r.mint, r]));
  const traceOf = new Map(db.prepare("SELECT wallet, funder, funder_name FROM wallet_trace").all().map((r) => [r.wallet, r]));
  const acc = new Map();
  for (const r of db.prepare("SELECT mint, wallet, data FROM study_buyers").all()) { let b; try { b = JSON.parse(r.data); } catch { continue; } if (!(b.block0 || b.sniper) || !role.has(r.mint)) continue;
    const a = acc.get(r.wallet) || { coins: 0, census: 0, runners: 0, buy: 0, sell: 0, block0: 0, linked: 0, txs: b.txs, ts: [] }; a.coins++; if (role.get(r.mint).role === "census") a.census++; if ((peak.get(r.mint) || 0) >= 100000) a.runners++;
    a.buy += b.buy_sol || 0; a.sell += b.sell_sol || 0; a.block0 += b.block0 ? 1 : 0; a.linked += b.creatorLinked ? 1 : 0; a.ts.push(role.get(r.mint).studied_ts || 0); acc.set(r.wallet, a); }
  db.exec("DELETE FROM snipers");
  const ins = db.prepare("INSERT INTO snipers VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"); const now = Math.floor(Date.now() / 1000);
  for (const [w, a] of acc) if (a.coins >= 2) { const t = traceOf.get(w); ins.run(w, a.coins, a.census, a.runners, +(a.runners / a.coins).toFixed(2), +a.buy.toFixed(2), +a.sell.toFixed(2), a.block0, a.linked, t?.funder || null, t?.funder_name || null, a.txs, Math.min(...a.ts), Math.max(...a.ts), now); }
}

// ---------- 0.7.6: the denominator — every launch's creator, traced to its funder (owner, 3 Nov 21:03 UK: "how many coins they launch and how many are successful") ----------
// Creator wallets are throwaway (median age 0 s), so two 1-credit RPC calls find the funder: the wallet's first transaction and who paid SOL into it.
// The 100-credit wallet-API lookup is spent only on funders that stand behind 2+ creators (the second hop), cached forever in wallet_trace.
const CT_DAYS = n("LAUNCH_CT_DAYS", 14), CT_PER_RUN = n("LAUNCH_CT_PER_RUN", 800), CT_PARALLEL = n("LAUNCH_CT_PARALLEL", 4), CT_FUNDER_PER_RUN = n("LAUNCH_CT_FUNDERS", 60);
export const ctStat = { runs: 0, creators: 0, traced: 0, errors: 0, lastErr: "", funders: 0, queued: 0, running: false, lastRun: null };
async function creatorFunder(w) {
  const recent = await rpc("getSignaturesForAddress", [w, { limit: 1000, commitment: "confirmed" }]); const txs = recent?.length ?? 0;
  if (!txs) return { txs, err: "no transactions" };
  if (txs >= 1000) { const fb = await trace(null, w); return { txs, funder: fb?.funder || null, funder_sol: fb?.amount_sol ?? null, funded_ts: fb?.funded_ts ?? null, err: fb?.err || null }; } // busy creator (rare): wallet API
  const first = recent[recent.length - 1];
  const t = await rpc("getTransaction", [first.signature, { maxSupportedTransactionVersion: 1, encoding: "json", commitment: "confirmed" }]);
  if (!t?.meta) return { txs, err: "first tx unreadable" };
  const keys = keysOf(t), pre = t.meta.preBalances, post = t.meta.postBalances, me = keys.indexOf(w); let best = -1, drop = 0;
  keys.forEach((k, i) => { if (i !== me && i < pre.length && pre[i] - post[i] > drop) { drop = pre[i] - post[i]; best = i; } });
  return { txs, funder: best >= 0 ? keys[best] : null, funder_sol: me >= 0 && me < pre.length ? (post[me] - pre[me]) / 1e9 : null, funded_ts: first.blockTime || null, err: null };
}
export async function creatorCensus(db, tdb, done) {
  if (ctStat.running || !tdb) return; ctStat.running = true; ctStat.runs++;
  try {
    const since = Math.floor(Date.now() / 1000) - CT_DAYS * 86400;
    const todo = tdb.prepare("SELECT mint, creator, create_ts, peak_mc_usd, graduated, bundle_pct, bundle_sol FROM tokens WHERE create_ts>=? AND creator IS NOT NULL AND creator<>'' ORDER BY create_ts DESC LIMIT 20000").all(since)
      .filter((t) => !db.prepare("SELECT 1 FROM creator_trace WHERE mint=?").get(t.mint));
    ctStat.queued = todo.length; const queue = todo.slice(0, CT_PER_RUN);
    const ins = db.prepare("INSERT OR REPLACE INTO creator_trace VALUES (@mint,@creator,@create_ts,@peak_mc_usd,@graduated,@bundle_pct,@bundle_sol,@funder,@funder_sol,@funded_ts,@creator_txs,@err,@checked_ts)");
    const worker = async () => { for (let t; (t = queue.shift()); ) {
      const known = db.prepare("SELECT funder, funder_sol, funded_ts, creator_txs FROM creator_trace WHERE creator=? AND funder IS NOT NULL LIMIT 1").get(t.creator); // the same creator wallet used twice: no new calls
      let r; try { r = known ? { txs: known.creator_txs, funder: known.funder, funder_sol: known.funder_sol, funded_ts: known.funded_ts, err: null } : await creatorFunder(t.creator); ctStat.traced++; } catch (e) { r = { err: e.message.slice(0, 100) }; ctStat.errors++; ctStat.lastErr = `${t.creator.slice(0, 6)} ${r.err}`; }
      ins.run({ mint: t.mint, creator: t.creator, create_ts: t.create_ts, peak_mc_usd: t.peak_mc_usd ?? null, graduated: t.graduated ? 1 : 0, bundle_pct: t.bundle_pct ?? null, bundle_sol: t.bundle_sol ?? null, funder: r.funder || null, funder_sol: r.funder_sol ?? null, funded_ts: r.funded_ts ?? null, creator_txs: r.txs ?? null, err: r.err || null, checked_ts: Math.floor(Date.now() / 1000) });
      ctStat.creators++;
    } };
    await Promise.all(Array.from({ length: CT_PARALLEL }, worker));
    // second hop, wallet API, only for funders behind 2+ creators and not yet traced
    const multi = db.prepare("SELECT funder, COUNT(*) c FROM creator_trace WHERE funder IS NOT NULL GROUP BY funder HAVING c>=2 ORDER BY c DESC").all().filter((f) => !db.prepare("SELECT 1 FROM wallet_trace WHERE wallet=? AND (err IS NULL OR err='404')").get(f.funder)).slice(0, CT_FUNDER_PER_RUN);
    for (const f of multi) { if (!key()) break; await trace(db, f.funder, 1); ctStat.funders++; }
    ctStat.lastRun = new Date().toISOString();
  } catch (e) { ctStat.errors++; ctStat.lastErr = e.message.slice(0, 160); }
  finally { ctStat.running = false; try { done?.(); } catch {} }
}
/** Launch counts behind an anchor wallet, from creator_trace: creators it funded directly, or through one private hop. */
export function launchesBehind(db, anchor) {
  const direct = db.prepare("SELECT mint, peak_mc_usd, graduated FROM creator_trace WHERE funder=?").all(anchor);
  const hop = db.prepare("SELECT c.mint, c.peak_mc_usd, c.graduated FROM creator_trace c JOIN wallet_trace w ON w.wallet=c.funder WHERE w.funder=? AND w.funder_type IS NULL").all(anchor);
  const seen = new Map(); for (const r of [...direct, ...hop]) seen.set(r.mint, r);
  const all = [...seen.values()]; return { launches: all.length, graduated: all.filter((r) => r.graduated).length, hits: all.filter((r) => (r.peak_mc_usd || 0) >= 100000).length };
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
    recluster(db); rebuildSnipers(db);
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
      if (role === "sniper") continue; // 0.7.5: snipers are everyone's; only the creator and the bundle wallets say who made the coin
      if (role === "bundle" || role === "creator") add(w, role === "creator" ? "creator" : "bundle_wallet", c.mint); // the same bundle wallet in two coins = one operator
      let cur = w; for (let h = 0; h < HOPS; h++) { const t = traceOf.get(cur); if (!t || !t.funder || t.funder_type) break; add(t.funder, "funder", c.mint); cur = t.funder; }
    }
  }
  for (const o of outs) if (!o.dest_type) add(o.dest, "payout", o.mint);
  // 0.7.1: the launch fingerprint — the same bundle % and SOL to two decimals on two coins is the same software and money (GR.md, 23 Oct: 79.31% / 85.0 SOL)
  for (const c of coins) { const t = c.d.tracker; if (t && t.bundle_pct >= 20 && t.bundle_sol >= 5) add(`${(+t.bundle_pct).toFixed(2)}/${(+t.bundle_sol).toFixed(1)}`, "fingerprint", c.mint); }
  // a key shared by too many coins is a public hub (a bot service, a popular distributor), not one operator
  const MAX_SHARE = n("LAUNCH_OP_MAX_SHARE", 60), MAX_PAYOUT_SHARE = n("LAUNCH_OP_MAX_PAYOUT_SHARE", 4);
  // 0.7.5: a payout destination that receives from the bundle wallets of 5+ coins is shared plumbing (tip accounts, fee wallets, unlabelled exchanges), not a person
  const good = [...links.values()].filter((l) => l.mints.size >= 2 && l.mints.size <= (l.kind === "payout" ? MAX_PAYOUT_SHARE : MAX_SHARE) && l.kind !== "creator");
  const pairKinds = new Map(); // "a|b" -> set of distinct link KINDS joining a and b (0.7.5: two shared payouts count once; funder + bundle wallet count twice)
  for (const l of good) { const ms = [...l.mints]; for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) { const k = ms[i] < ms[j] ? ms[i] + "|" + ms[j] : ms[j] + "|" + ms[i]; if (!pairKinds.has(k)) pairKinds.set(k, new Set()); pairKinds.get(k).add(l.kind); } }
  const pairLinks = new Map([...pairKinds].map(([k, v]) => [k, v.size]));
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
    if (kind === "funder") { const lb = launchesBehind(db, anchor); if (lb.launches) db.prepare("UPDATE operators SET launches=?, graduated_all=?, hits_all=?, hit_rate_all=? WHERE anchor=?").run(lb.launches, lb.graduated, lb.hits, +(lb.hits / lb.launches).toFixed(2), anchor); } // 0.7.6: the true denominator, duds included
    nOps++;
  }
  opStat.operators = nOps;
}
