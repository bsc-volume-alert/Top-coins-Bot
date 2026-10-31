// launcher 0.5.0 (owner, 31 Oct 2026 19:22 UK, "go"): RUNNER-FOLLOW paper test. The copycat study (LAUNCHER.md, 19:10 UK) found that at birth the
// runners and the copies that died look alike (12-wallet bundle, creator buy, snipers, 100–400 buyers); what separated them was net buying holding up
// over minutes 1–5 (+80 SOL on both genuine runners vs +3…+16 SOL on the losers), and the biggest "runners" were wash-traded by one funder.
// So, for every post the launcher names: search GMGN for same-name coins every 30 s for 12 min; for each copy, read its trades from the chain
// (Helius) at 2, 3, 4, 5, 7 and 10 min after it was made; paper-buy (GMGN price) the first time a rule passes:
//   RF50  net buying ≥ 50 SOL, ≥ 300 different buyers, round trips < 60% of volume, median buy ≥ 0.02 SOL (not micro-buy spam)
//   RF30  net ≥ 30 SOL, ≥ 200 buyers, same wash filters
//   RF50W net ≥ 50 SOL, ≥ 100 buyers, NO wash filter (to see what the filter costs or saves)
// Entries go into vol_paper and are scored 2 h later like the volume books. Every checkpoint of every copy is kept (rf_watch.checks) so the levels
// can be re-tuned from data. Nothing is bought.
import { gget, N } from "./gmgn.mjs";
import { earlyTrades, studyStat } from "./study.mjs";

const n = (k, d) => (process.env[k] != null && process.env[k] !== "" && Number.isFinite(Number(process.env[k])) ? Number(process.env[k]) : d);
const WATCH_POST_S = n("LAUNCH_RF_POST_S", 720), CHECKS = [120, 180, 240, 300, 420, 600], DAY_CREDITS = n("LAUNCH_RF_DAY_CREDITS", 150000);
export const RULES = [
  { k: "RF50", ok: (m) => m.net >= 50 && m.buyers >= 300 && m.rt < 60 && m.median >= 0.02 },
  { k: "RF30", ok: (m) => m.net >= 30 && m.buyers >= 200 && m.rt < 60 && m.median >= 0.02 },
  { k: "RF50W", ok: (m) => m.net >= 50 && m.buyers >= 100 },
];
export const rfStat = { searches: 0, found: 0, checks: 0, entries: 0, errors: 0, lastErr: "", credits: 0, creditsDay: "", lastCheck: null };
const now = () => Math.floor(Date.now() / 1000), norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const today = () => new Date().toISOString().slice(0, 10);

export function initRF(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS rf_watch (mint TEXT PRIMARY KEY, launch_id INTEGER, name TEXT, symbol TEXT, created_ts INTEGER, found_ts INTEGER, checks TEXT DEFAULT '[]', entered TEXT DEFAULT '', done INTEGER DEFAULT 0)`);
}

const tsOf = (c) => { const v = N(c.created_at) || N(c.creation_timestamp) || N(c.open_timestamp) || 0; return v > 1e12 ? Math.floor(v / 1000) : v; };
async function search(q) { const d = await gget("/v1/market/search", { q, chain: "sol" }); return Array.isArray(d?.coins) ? d.coins : Array.isArray(d?.tokens) ? d.tokens : Array.isArray(d) ? d : []; }

/** every 30 s: find new same-name coins for posts named in the last 12 min */
let finding = false;
export async function rfFind(db) {
  if (finding) return; finding = true;
  try {
    const posts = db.prepare("SELECT id, name, ticker, mint, t_post_ms FROM launches WHERE name IS NOT NULL AND name<>'' AND t_post_ms>=? ORDER BY id DESC LIMIT 15").all((now() - WATCH_POST_S) * 1000);
    const ins = db.prepare("INSERT OR IGNORE INTO rf_watch (mint, launch_id, name, symbol, created_ts, found_ts) VALUES (?,?,?,?,?,?)");
    for (const L of posts) {
      const t0 = Math.floor(L.t_post_ms / 1000), want = [norm(L.name), norm(L.ticker)].filter(Boolean), seen = new Map();
      for (const q of [...new Set([L.name, L.ticker].filter(Boolean))]) { try { for (const c of await search(q)) if (c?.address) seen.set(c.address, c); rfStat.searches++; } catch (e) { rfStat.errors++; rfStat.lastErr = "search: " + e.message.slice(0, 120); } }
      for (const c of seen.values()) {
        const nm = norm(c.name), sy = norm(c.symbol), created = tsOf(c);
        if (c.address === L.mint || !created || created < t0 - 60 || created > t0 + 1800) continue;
        if (!want.some((w) => w && (nm === w || sy === w || (w.length >= 5 && nm.includes(w))))) continue;
        if (ins.run(c.address, L.id, String(c.name || "").slice(0, 60), String(c.symbol || "").slice(0, 20), created, now()).changes) rfStat.found++;
      }
    }
  } catch (e) { rfStat.errors++; rfStat.lastErr = "find: " + e.message.slice(0, 160); }
  finally { finding = false; }
}

function metrics(r, upto) {
  const xs = r.trades.filter((x) => x.t <= upto), buys = xs.filter((x) => x.isBuy), sells = xs.filter((x) => !x.isBuy);
  const bs = buys.reduce((s, x) => s + x.sol, 0) / 1e9, ss = sells.reduce((s, x) => s + x.sol, 0) / 1e9, per = new Map();
  for (const x of xs) { const p = per.get(x.user) || { b: 0, s: 0 }; if (x.isBuy) p.b += x.sol; else p.s += x.sol; per.set(x.user, p); }
  const vol = bs + ss, rt = vol ? [...per.values()].reduce((s, p) => s + 2 * Math.min(p.b, p.s), 0) / 1e9 / vol * 100 : 0;
  const sizes = buys.map((x) => x.sol / 1e9).sort((a, b) => a - b), last = xs[xs.length - 1];
  const top = [...per.values()].map((p) => p.b / 1e9).sort((a, b) => b - a)[0] || 0;
  return { net: +(bs - ss).toFixed(2), buySol: +bs.toFixed(2), sellSol: +ss.toFixed(2), buyers: new Set(buys.map((x) => x.user)).size, buys: buys.length, sells: sells.length,
    rt: +rt.toFixed(1), median: sizes.length ? +sizes[Math.floor(sizes.length / 2)].toFixed(4) : 0, topBuyerPct: bs ? +(top / bs * 100).toFixed(1) : 0, mcSol: last?.mc ? +last.mc.toFixed(1) : null };
}

/** every 20 s: run due checkpoints */
let checking = false;
export async function rfCheck(db) {
  if (checking) return; checking = true;
  try {
    if (rfStat.creditsDay !== today()) { rfStat.creditsDay = today(); rfStat.credits = 0; }
    const t = now();
    for (const w of db.prepare("SELECT * FROM rf_watch WHERE done=0 ORDER BY created_ts").all()) {
      const age = t - w.created_ts, checks = JSON.parse(w.checks || "[]"), doneAt = new Set(checks.map((c) => c.at));
      if (age > CHECKS[CHECKS.length - 1] + 120) { db.prepare("UPDATE rf_watch SET done=1 WHERE mint=?").run(w.mint); continue; }
      const due = CHECKS.filter((c) => c <= age && !doneAt.has(c)); if (!due.length) continue;
      if (rfStat.credits >= DAY_CREDITS) { rfStat.lastErr = `daily Helius budget ${DAY_CREDITS} reached`; break; }
      const at = due[due.length - 1]; // the latest due checkpoint (skip ones we were too busy to run)
      try {
        const c0 = studyStat.credits, r = await earlyTrades(w.mint, w.created_ts + at); rfStat.credits += studyStat.credits - c0; rfStat.checks++; rfStat.lastCheck = new Date().toISOString();
        const m = { at, ...metrics(r, (r.t0 || w.created_ts) + at), txs: r.txs, venue: r.pumpCurve ? (r.complete ? "pump.fun graduated" : "pump.fun curve") : "other" };
        checks.push(m); const entered = new Set(String(w.entered || "").split(",").filter(Boolean));
        for (const rule of RULES) if (!entered.has(rule.k) && rule.ok(m)) {
          let info = null; try { info = await gget("/v1/token/info", { chain: "sol", address: w.mint }); } catch {}
          const px = N(info?.price?.price ?? info?.price), supply = N(info?.total_supply) || N(info?.circulating_supply) || 1e9;
          if (!(px > 0)) { m["skip_" + rule.k] = "no GMGN price"; continue; }
          const curve = r.pumpCurve && !r.complete && N(info?.launchpad_progress) != null && N(info.launchpad_progress) < 1 ? 1 : 0;
          db.prepare(`INSERT OR IGNORE INTO vol_paper (strat, mint, name, symbol, entry_ts, entry_price, entry_mc, vol5, created_ts, age_min, holders, exchange, launchpad, curve, row) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
            .run(rule.k, w.mint, w.name, w.symbol, t, px, px * supply, null, w.created_ts, +(age / 60).toFixed(1), N(info?.holder_count), m.venue, info?.launchpad ?? null, curve, JSON.stringify({ launch_id: w.launch_id, ...m }));
          entered.add(rule.k); rfStat.entries++;
        }
        db.prepare("UPDATE rf_watch SET checks=?, entered=? WHERE mint=?").run(JSON.stringify(checks), [...entered].join(","), w.mint);
      } catch (e) { rfStat.errors++; rfStat.lastErr = `${w.mint.slice(0, 6)}: ${e.message}`.slice(0, 160); checks.push({ at, err: e.message.slice(0, 80) }); db.prepare("UPDATE rf_watch SET checks=? WHERE mint=?").run(JSON.stringify(checks), w.mint); }
    }
  } finally { checking = false; }
}
