// web.mjs — the project's page (visual reference: the old books page). GET / (page), GET /api/state (JSON).
// Optional key: if OLDER_SITE_KEY is set, every request needs ?k=<key>. Read-only.
import http from "node:http";
import { gzip } from "node:zlib";
import { bookRows, overlap } from "./report.mjs";
import * as S from "./spec.mjs";
import { BOOKS_PAGE, booksApi, entryRows, rowCtx } from "./page.mjs";

/** everything the bot has on record about one coin, with a one-line verdict in plain words (see /api/coin) */
export function coinLookup({ mint, store, engine, lookup = null, run = null, now = Date.now() / 1000 }) {
  const nc = lookup ? lookup(mint) : { on: false }, coin = engine.coins.get(mint) || null, on = run?.books?.length ? new Set(run.books) : null;
  const buys = store.entriesOf(mint).map((e) => { const rows = {}; for (const v of e.versions || []) if (!v.stall) rows[S.POLICY_KEY[v.policy] + Math.round(v.stop * 100)] = v.exit?.ret != null ? +v.exit.ret.toFixed(4) : v.status === "closed" ? null : "open";
    return { id: e.id, books: e.families, t: e.decisionT, status: e.status, mc: Math.round(e.signalMc || 0), pop: e.pop ?? null, max: e.runner?.maxX != null ? +e.runner.maxX.toFixed(3) : null, rows, fees: e.gate?.reading?.fees_sol ?? null, top10: e.gate?.reading?.top10 ?? null, hidden: on ? !e.families.some((f) => on.has(f)) : false }; });
  const notes = store.notesOf(mint, 12).map((n) => ({ book: n.family, t: n.t, why: n.reason })).filter((n) => !on || on.has(n.book));
  const checks = nc.checks || [], bought = buys.filter((b) => b.status !== "cancelled"), sym = coin?.info?.symbol ?? nc.waiting?.symbol ?? checks.find((c) => c.sym)?.sym ?? null;
  let verdict;
  if (bought.length) verdict = "BOUGHT (paper) by " + [...new Set(bought.flatMap((b) => b.books))].join(", ");
  else if (checks.length) { const left = nc.waiting?.next?.length || 0; verdict = "Seen and measured, NOT bought" + (left ? " so far — " + left + " check" + (left > 1 ? "s" : "") + " still to come" : ""); }
  else if (nc.waiting) { const n = nc.waiting.next[0]; verdict = "Seen, waiting for its first check" + (n ? " (" + n.book + " in " + Math.max(0, n.in_s) + " s)" : ""); }
  else if (notes.length) verdict = "Not bought — the pool books looked at it (reasons below)";
  else if (coin) verdict = "Known to the bot, never measured by the new-coin books and never bought";
  else verdict = "No record of this coin";
  return { ok: true, mint, sym, at: now, verdict, newcoins: nc, buys, notes, known: !!coin, created: coin?.createTs ?? nc.waiting?.created ?? null, pool: coin?.pool ?? null };
}
export function startWeb({ port, store, engine, status, run = () => null, sell = null, lookup = null, runners = null }) { // runners(): the runners list (newcoin.mjs, runnersView) // lookup(mint): what the new-coin books know about one coin (newcoin.mjs); null = no new-coin books in this program // sell(id, frac): the owner's paper "sell now" (engine.manualSell); null = the page has no such button // run(): older-11 — the run's own books and settings, or null (every book, as before)
  const KEY = process.env.OLDER_SITE_KEY || "";
  const cache = new Map(), BUILD = String(process.env.OLDER_COMMIT || "dev").slice(0, 12) + ":" + Math.round(Date.now() / 1000); // changes on every start: the books page reloads itself when it sees a new one
  const state = (pop = "", given = null, tm = null) => { // given: every buy, already read (the status dump reads them once, in slices, for all its files)
    // tm: when the status dump passes an object, the time each part of this build holds the program is added to it — { part: { ms, max, n } } (27 Nov 2026: the
    // five-minute hold was still 4.3 s on d7210db, from the first dump after a start: it is measured before anything else is changed)
    const T = (k, f) => { if (!tm) return f(); const t0 = performance.now(); try { return f(); } finally { const d = performance.now() - t0, r = (tm[k] ||= { ms: 0, max: 0, n: 0 }); r.ms = +(r.ms + d).toFixed(1); r.max = +Math.max(r.max, d).toFixed(1); r.n++; } };
    const hit = cache.get(pop); if (hit && Date.now() - hit.at < 15000) return hit;
    const all = given ?? store.allEntries(), entries = pop ? all.filter((e) => (e.pop || "pumpswap-canonical") === pop) : all;
    const pops = {}; for (const e of all) { const k = (e.pop || "pumpswap-canonical") + " · " + (e.mode || "live") + " · " + (e.exec || "reconstructed-pool-state"); pops[k] = (pops[k] || 0) + 1; }
    const costs = { server: Number(process.env.OLDER_COST_SERVER_USD_MO || 0), gmgn: Number(process.env.OLDER_COST_GMGN_USD_MO || 30), rpc: Number(process.env.OLDER_COST_RPC_USD_MO || 0) };
    const R = run(), on = R?.books?.length ? new Set([...R.books, "*"]) : null; // a run that chose its books: the table, the overlap and the refusal counts show those books only
    const out = { at: Date.now(), spec: S.SPEC_VER, pop, populations: pops, run: R, rows: T("book_rows", () => bookRows(entries, T("note_counts", () => store.noteCounts()), on)).filter((r) => !on || on.has(r.family)), overlap: T("overlap", () => overlap(entries)).filter((o) => !on || (on.has(o.a) && on.has(o.b))), notes: T("note_counts", () => store.noteCounts()).filter((n) => !on || on.has(n.family)), status: T("status", () => status()), disk: T("disk", () => store.disk()), costs,
      recent: entries.slice(-40).reverse().map((e) => ({ snap: e.snap ?? null, win: e.features ? { w1: e.features.w1 ?? null, w3: e.features.w3 ?? null, w5: e.features.w5 ?? null, vol_surge5: e.features.vol_surge5 ?? null, buyers15: e.features.buyers15 ?? null } : null, id: e.id, mint: e.mint, ag: e.ag, families: e.families, t: e.decisionT, mc: Math.round(e.signalMc), status: e.status, startup: !!e.startup, pop: e.pop || "pumpswap-canonical", mode: e.mode || "live", exec: e.exec || "reconstructed-pool-state", origin: e.token?.origin ?? null, risk: e.token?.risk_status ?? null, cadence: e.token?.cadence_s ?? e.evidence?.trigger?.cadence_s ?? null, route: e.fill?.quote?.route ?? null, fill_delay: e.fill?.delay_s ?? null, state_age: e.fill?.state_age_s ?? null, verify: e.verify ? (e.verify.error ? "error" : e.verify.suspect ? "SUSPECT" : `Δ ${(e.verify.diff_quote * 100).toFixed(2)}%`) : null, versions: e.versions.map((v) => ({ stop: v.stop, policy: v.policy, stall: v.stall, status: v.status, reason: v.reason, half: !!v.half, ret: v.exit ? +v.exit.ret.toFixed(3) : null })), runner_max: e.runner.maxX ? +e.runner.maxX.toFixed(2) : null, flags: e.flags })) };
    cache.set(pop, out); return out;
  };
  // THE ANSWERS ARE KEPT PER SELECTION (stop, exit, stake, age…), each 1–2 MB, and the list was never emptied: every selector the
  // owner taps added one for the life of the program. An answer nobody has asked for in two minutes is now dropped (27 Nov 2026).
  { const put = cache.set.bind(cache); cache.set = (k, v) => { const now = Date.now(); for (const [kk, vv] of cache) if (now - (vv?.atMs ?? vv?.at ?? now) > 120_000) cache.delete(kk); return put(k, v); }; }
  // SENT COMPRESSED (27 Nov 2026): the page itself and its three large answers. Compressed once per kept answer, off the
  // program's own thread; a browser that does not accept it, or a failed compression, gets the plain answer as before.
  const PAGE_HIT = { body: BOOKS_PAGE };
  const sendZ = (req, res, type, hit) => { if (!/\bgzip\b/.test(String(req.headers["accept-encoding"] || ""))) { res.writeHead(200, { "content-type": type }); return void res.end(hit.body); }
    hit.gz ||= new Promise((ok) => gzip(hit.body, { level: 1 }, (e, b) => ok(e ? null : b)));
    hit.gz.then((b) => { if (b) { res.writeHead(200, { "content-type": type, "content-encoding": "gzip", vary: "accept-encoding" }); res.end(b); } else { res.writeHead(200, { "content-type": type }); res.end(hit.body); } }); };
  // THE BOOKS ANSWER WITHOUT READING EVERY BUY AGAIN (27 Nov 2026). It used to read and unpack every buy the run has ever made from
  // the database for each answer — about a thousand large records every 8 seconds while the site is open: a pause of the whole
  // program each time and a great deal of memory turned over. Now, per selection:
  //   a FINISHED buy (database flag `done`, decided more than DONE_SETTLE_S ago) is read ONCE and its page rows are kept;
  //   an unfinished buy is taken from the program's own memory (the same object /api/live shows) — no database read;
  //   anything else (finished moments ago; unfinished but not in memory) is read from the database for this answer only.
  // The rows are built by the same function as before (page.entryRows), so the answer is the same. A kept row of a finished
  // buy carries no sell button (a finished buy cannot be sold). Kept rows of a selection not asked for in 15 minutes are dropped.
  const KEPT = new Map(), DONE_SETTLE_S = 600, stats = { answers: 0, read: 0, kept: 0, live: 0 };
  const booksOf = (sel, ck) => { const opts = { ...sel, since: store.since ? store.since(Date.now() / 1000) : null, build: BUILD, run: run(), sellable: !!(KEY && sell), liq: engine?.liq ?? null };
    if (!store.entryFlags || !store.entriesByIds || !engine?.entries?.get) return booksApi(store.allEntries(), opts); // a store without the two readers: as before
    const nowMs = Date.now(), sig = JSON.stringify(opts.run?.books ?? null); for (const [k, v] of KEPT) if (nowMs - v.atMs > 900_000) KEPT.delete(k);
    let K = KEPT.get(ck); if (!K || K.sig !== sig) { K = { sig, rows: new Map() }; KEPT.set(ck, K); } K.atMs = nowMs;
    const C = rowCtx(opts), flags = store.entryFlags(), settled = nowMs / 1000 - DONE_SETTLE_S, need = [], loose = [];
    for (const f of flags) { if (f.done && f.t < settled) { if (!K.rows.has(f.id)) need.push(f.id); } else if (!engine.entries.get(f.id)) loose.push(f.id); }
    if (need.length) for (const e of store.entriesByIds(need)) { const R = entryRows(e, C); for (const x of R) delete x[1].sell; K.rows.set(e.id, R); }
    const L = new Map(loose.length ? store.entriesByIds(loose).map((e) => [e.id, e]) : []), list = [];
    for (const f of flags) { if (f.done && f.t < settled) list.push({ __rows: K.rows.get(f.id) || [] }); else { const e = engine.entries.get(f.id) ?? L.get(f.id); if (e) list.push(e); } }
    stats.answers++; stats.read += need.length + loose.length; stats.kept = K.rows.size; stats.live = list.length - K.rows.size - loose.length;
    return booksApi(list, opts); };
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (KEY && (u.searchParams.get("k") || u.searchParams.get("key")) !== KEY) { res.writeHead(403); return res.end("key required"); }
    // THE ONE WRITE ON THIS SITE — a PAPER sale by the owner (book.mjs, MANUAL SALE). POST only, and only when the site has a
    // key (checked above for every request): without a key nothing can be sold from the page. Nothing here can touch a wallet.
    if (u.pathname === "/api/sell") { const j = (code, o) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
      if (req.method !== "POST") return j(405, { ok: false, why: "POST only" }); if (!KEY || !sell) return j(403, { ok: false, why: "manual paper sales are switched off (the site has no key, or this run has no sell button)" });
      const id = Number(u.searchParams.get("id")), frac = Number(u.searchParams.get("frac")); if (!Number.isInteger(id)) return j(400, { ok: false, why: "which buy?" });
      const r = sell(id, frac); cache.clear(); return j(r.ok ? 200 : 409, r); }
    // OPEN POSITIONS ONLY, FROM MEMORY (owner 25 Nov 2026 22:49 UK: "refreshed every 2 or 3 seconds"): the current value and the high
    // of every position that is still held, for the selected stop / exit / stake — the same figures /api/books gives, worked out
    // by the same code, but from the engine's own unfinished buys, so the database is not read. The page asks every 2 s and
    // repaints only when a figure moved. (The full page data stays on its 10 s cycle: it reads every buy from the database.)
    if (u.pathname === "/api/live") { const sk = Number(u.searchParams.get("stake")), sel = { stop: Number(u.searchParams.get("stop") || 0.25), policy: S.POLICIES.includes(u.searchParams.get("policy")) ? u.searchParams.get("policy") : "trail", stake: S.STAKE_VIEWS.includes(sk) ? sk : S.STAKE_SOL }, ck = "l|" + JSON.stringify(sel);
      let hit = cache.get(ck); if (!hit || Date.now() - hit.atMs > 1500) { const j = booksApi([...engine.entries.values()].filter((e) => e.status === "filled"), { ...sel, run: run(), liq: engine?.liq ?? null }), rows = {};
        for (const [k, list] of Object.entries(j.books)) for (const r of list) if (r.status === "open") rows[k + "|" + r.id] = r.liq ? [r.now_x, r.hi, r.hi_held ?? null, r.liq] : [r.now_x, r.hi, r.hi_held ?? null];
        hit = { atMs: Date.now(), body: JSON.stringify({ at: Date.now() / 1000, ...sel, rows }) }; cache.set(ck, hit); }
      res.writeHead(200, { "content-type": "application/json" }); return res.end(hit.body); }
    // THE COIN LOOKUP (owner 26 Nov 2026 04:49 UK: "when I paste the contract, we need to know immediately why the coin was rejected or
    // not"). Read-only and from the bot's own records only — no provider is asked, so it costs nothing and answers at once:
    // the new-coin books' waiting list and every check they made of the coin, every paper buy of it by any book, and the pool
    // books' latest recorded reasons for not buying it.
    if (u.pathname === "/api/runners") { let hit = cache.get("runners"); if (!hit || Date.now() - hit.atMs > 10000) { let j; try { j = runners ? runners() : { on: false }; } catch (e) { j = { on: false, why: String(e.message).slice(0, 160) }; } hit = { atMs: Date.now(), body: JSON.stringify(j) }; cache.set("runners", hit); }
      return sendZ(req, res, "application/json", hit); } // read-only, from the bot's own records; rebuilt at most every 10 s
    if (u.pathname === "/api/coin") { const mint = (u.searchParams.get("mint") || "").trim(), j = (code, o) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) return j(400, { ok: false, why: "that is not a coin address" });
      try { return j(200, coinLookup({ mint, store, engine, lookup, run: run() })); } catch (e) { return j(500, { ok: false, why: String(e.message).slice(0, 160) }); } }
    if (u.pathname === "/api/books") { // one stop / exit policy / age group / population at a time; cached 8 s per selection
      const sk = Number(u.searchParams.get("stake")), sel = { stop: Number(u.searchParams.get("stop") || 0.25), policy: S.POLICIES.includes(u.searchParams.get("policy")) ? u.searchParams.get("policy") : "trail", ag: u.searchParams.get("ag") || "", pop: u.searchParams.get("pop") || "", stake: S.STAKE_VIEWS.includes(sk) ? sk : S.STAKE_SOL, first: u.searchParams.get("buys") === "first", checks: ["pass", "late"].includes(u.searchParams.get("chk")) ? u.searchParams.get("chk") : "all" }, ck = "b|" + JSON.stringify(sel);
      let hit = cache.get(ck); if (!hit || Date.now() - hit.atMs > 8000) { hit = { atMs: Date.now(), body: JSON.stringify(booksOf(sel, ck)) }; cache.set(ck, hit); }
      return sendZ(req, res, "application/json", hit); }
    // THE PAGE'S HEALTH STRIP (27 Nov 2026): it asked for the whole state every 10 seconds — 1.5 MB, and a full build of every
    // result row on the bot — to show a few status figures. This answers with those figures only; nothing else is built.
    if (u.pathname === "/api/health") { let hit = cache.get("health"); if (!hit || Date.now() - hit.atMs > 5000) { hit = { atMs: Date.now(), body: JSON.stringify({ at: Date.now(), status: status(), disk: store.disk() }) }; cache.set("health", hit); }
      return sendZ(req, res, "application/json", hit); }
    if (u.pathname === "/table") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(PAGE); }
    if (u.pathname === "/api/state") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(state(u.searchParams.get("pop") || ""))); }
    if (u.pathname === "/") return sendZ(req, res, "text/html; charset=utf-8", PAGE_HIT);
    res.writeHead(404); res.end();
  }).listen(port, () => console.log(`[web] :${port}`));
  return { state, server, cached: () => cache.size, books: () => ({ ...stats, selections: KEPT.size }) };
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Older Coins Books</title>
<style>
:root{color-scheme:dark}body{margin:0;background:#0b0d12;color:#e6e8ef;font:14px/1.45 -apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:1500px;margin:0 auto;padding:14px}h1{font-size:19px;margin:0 0 4px}h2{font-size:15px;margin:0 0 8px}.sub{color:#9aa3b5;font-size:12.5px}
.card{background:#141825;border:1px solid #232a3b;border-radius:10px;padding:12px;margin:12px 0}
.kpis{display:flex;flex-wrap:wrap;gap:8px}.k{background:#0f1320;border:1px solid #232a3b;border-radius:8px;padding:8px 10px;min-width:130px}.k b{display:block;font-size:17px}.k span{color:#9aa3b5;font-size:11.5px}
table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{padding:5px 7px;border-bottom:1px solid #1f2535;text-align:right;white-space:nowrap}th{color:#9aa3b5;font-weight:600;position:sticky;top:0;background:#141825}
th.l,td.l{text-align:left}.tw{overflow:auto;max-height:70vh}.pos{color:#4ade80}.neg{color:#f87171}.mut{color:#6b7280}.open{color:#fbbf24}
select{background:#0f1320;color:#e6e8ef;border:1px solid #232a3b;border-radius:6px;padding:4px}
</style></head><body><div class="wrap">
<h1>Older coins — paper books <span class="sub" id="hd">loading…</span></h1>
<div class="sub" id="intro">PAPER ONLY. Pump.fun coins on their <b>canonical SOL-quoted PumpSwap pool only</b> (other venues are not covered — see Coverage), 8 hours to 90 days old at entry, entry market cap $40K–$1M, 0.2 SOL an entry. 29 entry families (21 from 8 hours old in 4 age groups; 8 from migration on in 5) × 5 trailing stops (20 / 25 / 30 / 40 / 60%) = 620 rows, each under two exit policies (pure trailing; sell half at 2× then trail) = 1,240 comparisons. Returns are after pool fees, price impact and a declared 0.0005 SOL per transaction. Fills are priced from the pool state in force at signal + 1 s (buy) and trigger + 0.7 s (sell). Rows sharing coins or entries are <b>correlated</b> (Overlap table) — not 1,240 independent results. Small samples are provisional.</div>
<div class="card"><div class="kpis" id="kpis"></div></div>
<div class="card"><h2>Books</h2>Population <select id="fpop"><option value="">all (mixed methods — see note)</option><option value="pumpswap-canonical">PumpSwap · live events · pool-state fills</option><option value="solana-wide">Solana-wide · sampled prices · routed quotes</option></select> Family <select id="ff"><option value="">all</option></select> Exit <select id="fp"><option value="trail">pure trailing</option><option value="scale">half at 2×, trail rest</option><option value="">both</option></select> Age <select id="fa"><option value="">all</option><option>A0</option><option>A1</option><option>A2</option><option>A3</option><option>A4</option></select>
<div class="tw"><table id="bt"></table></div><div class="sub"><b>Two observation methods are kept apart.</b> "PumpSwap · live" rows come from every decoded pool event and fills priced on the reconstructed pool. "Solana-wide" rows come from <b>sampled</b> prices (cadence shown per entry) and routed quotes: they can miss fast triggers, highs and stop crossings between samples, and HH-BREAK is not evaluated there (no volume source). A quote is an expected output, not a confirmed on-chain fill. Summing overlapping rows is not a funded portfolio's return. Fills priced before the reserve reading is validated are simulation only — the tile above says UNVALIDATED until transaction evidence exists.</div><div class="sub">avg / quantiles = after-cost return per entry (on cost: 0.2 SOL + the buy transaction). "startup" = entries in the first 24 h after the project first started (kept in the totals). −40% is the project's severe-loss measure; −50% / −60% shown too. "ex top 3" removes the three best coins. H1 / H2 = first / second half of closed trades by fill time. Runners = entries whose after-cost value reached 2×/3×/5×/10× of cost within 24 h of the fill (counted even after an exit; separate from profit).</div></div>
<div class="card"><h2>Overlap between families</h2><div class="tw"><table id="ov"></table></div></div>
<div class="card"><h2>Coverage, rejections and missing data</h2><div class="tw"><table id="nt"></table></div></div>
<div class="card"><h2>Latest entries</h2><div class="tw"><table id="re"></table></div></div>
</div><script>
const $=(i)=>document.getElementById(i),k=new URLSearchParams(location.search).get("k"),pc=(x)=>x==null?'<span class=mut>–</span>':'<span class='+(x>0?'pos':x<0?'neg':'')+'>'+(x*100).toFixed(1)+'%</span>',sol=(x)=>x==null?'–':'<span class='+(x>0?'pos':x<0?'neg':'')+'>'+x.toFixed(3)+'</span>',ago=(t)=>t?Math.round(Date.now()/1000-t)+' s ago':'–';
let S=null;
async function load(){const q=new URLSearchParams();if(k)q.set('k',k);if($('fpop').value)q.set('pop',$('fpop').value);S=await (await fetch('/api/state?'+q)).json();draw();}
function draw(){const st=S.status,d=S.disk,c=S.costs;
if(S.run){const R=S.run,fam=[...new Set(S.rows.map(r=>r.family))];$('intro').innerHTML='PAPER ONLY. Run <b>'+(R.name||'')+'</b>: the '+fam.length+' books of this run only ('+fam.join(', ')+'). Pump.fun coins on their canonical SOL-quoted PumpSwap pool, '+R.min_age_h+' hours to 90 days old at entry (the VOL, RUG and DIP books: any age after migration; a buy under 8 hours old is in age group A0), 0.2 SOL an entry, 5 trailing stops (20 / 25 / 30 / 40 / 60%), each under two exit policies (pure trailing; sell half at 2× then trail) = '+S.rows.length+' rows.'+(R.gates?' Every buy must pass the GMGN checks read at the buy; a missing or late reading cancels it.':'')+(R.rebuy?'':' Buying again is off.')+' Returns are after pool fees, price impact and a declared 0.0005 SOL per transaction. Rows sharing coins or entries are <b>correlated</b> (Overlap table). Small samples are provisional.'}
$('hd').textContent='spec '+S.spec+(S.run&&S.run.name?' · run '+S.run.name:'')+' · '+new Date(S.at).toLocaleString('en-GB',{timeZone:'Europe/London'})+' UK';
const net=S.rows.filter(r=>r.stop===0.2).reduce((s,r)=>s+(r.net_sol||0),0);
const dv=st.decoder,tv=st.tx_validation;
const kp=[['Feed',st.feed.connected?'up':'DOWN','last message '+ago(st.feed.lastMsg)+' · avg lag '+(st.feed.lag_ms_avg??'–')+' ms · reconnects '+st.feed.reconnects],['Events',st.feed.emitted,'held '+st.feed.held+' / replayed '+st.feed.replayed+' / rejected '+st.feed.rejected],['Coins in memory',st.engine.coins,'creation unknown: '+st.engine.noCreation+' · over 90 days: '+st.engine.tooOld],['Entries',st.engine.entries,'candidates '+st.engine.cands+' · open '+(st.engine.open??0)],['Reserve reading: '+dv.mode,(tv?'validated':'UNVALIDATED'),'fits pre '+dv.fitPre+' · post '+dv.fitPost+' · both '+dv.fitBoth+' · neither '+dv.fitNeither+' · chain ok '+dv.chainOk+' / bad '+dv.chainBad],['Entry checks',(st.verify?.done??0)+' read','within 1%: '+(st.verify?.within1pct??0)+' · suspect: '+(st.verify?.suspect??0)+' · failed: '+(st.verify?.failed??0)],['Solana-wide',(st.poller?st.poller.watched+' watched':'off'),st.poller?('hot '+st.poller.hot+' · avg sample gap '+(st.poller.cadence_avg_s??'–')+' s · omitted '+st.poller.omitted+' · no route '+st.poller.noRoute+' · Jupiter credits '+st.jupiter.credits):'Jupiter adapter not enabled'],['SOL/USD',st.sol.px?'$'+st.sol.px.toFixed(2):'none',st.sol.src||''],['GMGN',st.gmgn.calls+' calls',st.gmgn.limited+' rate-limited · '+(st.gmgn.lastErr||'ok')],['Back-fill',st.backfill.done+' done','queue '+st.backfillQ+' · refs ok '+st.backfill.refsOk+' / missing '+st.backfill.refsMissing],['Disk',d.db_mb+' MB db','WAL '+d.wal_mb+' MB · free '+d.free_gb+' GB · bars '+d.bars],['Running costs','$'+(c.server+c.gmgn+c.rpc)+'/month','server $'+c.server+' · GMGN $'+c.gmgn+' · RPC $'+c.rpc+' — separate from paper returns']];
$('kpis').innerHTML=kp.map(x=>'<div class=k><b>'+x[1]+'</b><span>'+x[0]+' · '+x[2]+'</span></div>').join('');
const ff=$('ff');if(ff.options.length<2)[...new Set(S.rows.map(r=>r.family))].forEach(f=>ff.add(new Option(f,f)));
const rows=S.rows.filter(r=>(!ff.value||r.family===ff.value)&&(!$('fa').value||r.ag===$('fa').value)&&(!$('fp').value||r.policy===$('fp').value));
$('bt').innerHTML='<tr><th class=l>Book</th><th>coins</th><th>filled</th><th>open</th><th>closed</th><th>est.</th><th>re-buys</th><th>cancelled</th><th>unres.</th><th>net SOL</th><th>avg</th><th>win</th><th>q10</th><th>median</th><th>q90</th><th>≤−40%</th><th>≤−50%</th><th>≤−60%</th><th>ex top 3 net</th><th>ex top 3 avg</th><th>H1 avg</th><th>H2 avg</th><th>hold min</th><th>stake SOL</th><th>2×/3×/5×/10×</th><th>startup n / net</th><th class=l>exits</th></tr>'+rows.map(r=>'<tr><td class=l>'+r.book+'</td><td>'+r.mints+'</td><td>'+r.filled+'</td><td class=open>'+r.open+'</td><td>'+r.closed+'</td><td>'+(r.estimated_exits?r.estimated_exits+' ('+sol(r.estimated_net_sol)+')':'')+'</td><td>'+(r.rebuys_closed||r.rebuys_open?r.rebuys_closed+' ('+sol(r.rebuys_net_sol)+')'+(r.rebuys_open?' +'+r.rebuys_open+' open':''):'')+'</td><td>'+r.cancelled+'</td><td>'+r.unresolved+'</td><td>'+sol(r.net_sol)+'</td><td>'+pc(r.avg_ret)+'</td><td>'+(r.win_rate==null?'–':(r.win_rate*100).toFixed(0)+'%')+'</td><td>'+pc(r.q10)+'</td><td>'+pc(r.median)+'</td><td>'+pc(r.q90)+'</td><td>'+r.loss40+'</td><td>'+r.loss50+'</td><td>'+r.loss60+'</td><td>'+sol(r.ex_top3_net)+'</td><td>'+pc(r.ex_top3_avg)+'</td><td>'+pc(r.h1_avg)+'</td><td>'+pc(r.h2_avg)+'</td><td>'+(r.hold_median_min??'–')+'</td><td>'+(r.stake_committed_sol??0)+'</td><td>'+r.runners.x2+'/'+r.runners.x3+'/'+r.runners.x5+'/'+r.runners.x10+' of '+r.runners.n+(r.runners.partial?' ('+r.runners.partial+' partial)':'')+'</td><td>'+r.startup_entries+' / '+(r.startup_net_sol??0)+'</td><td class=l>'+Object.entries(r.exit_reasons).map(e=>e[0]+' '+e[1]).join(', ')+'</td></tr>').join('');
$('ov').innerHTML='<tr><th class=l>Family A</th><th class=l>Family B</th><th>shared coin·age</th><th>shared entries</th><th>A total</th><th>B total</th></tr>'+S.overlap.filter(o=>o.shared_mint_ages).map(o=>'<tr><td class=l>'+o.a+'</td><td class=l>'+o.b+'</td><td>'+o.shared_mint_ages+'</td><td>'+o.shared_entries+'</td><td>'+o.a_n+'</td><td>'+o.b_n+'</td></tr>').join('');
const inv=st.inventory;$('nt').innerHTML='<tr><th class=l>What</th><th class=l>Reason</th><th>count</th></tr>'+(inv?'<tr><td class=l>Inventory</td><td class=l>'+(inv.complete?'':'<b>INCOMPLETE</b> '+(inv.error||inv.stopped||'')+' · ')+'PumpSwap SOL pools '+inv.solPools+' · canonical '+inv.canonical+' · non-canonical '+inv.nonCanonical+' · priced '+inv.priced+' · ≥ $'+inv.minMc+' '+inv.aboveMin+' · in band '+inv.inBand+'</td><td></td></tr>':'')+'<tr><td class=l>Feed</td><td class=l>events on non-canonical pools (not priced) · non-SOL pools · coins whose history had to restart</td><td>'+st.feed.nonCanonical+' · '+st.feed.nonSol+' · '+(st.engine.coinLost||0)+'</td></tr><tr><td class=l>Entries by method</td><td class=l>'+Object.entries(S.populations).map(x=>x[0]+': '+x[1]).join(' &nbsp;|&nbsp; ')+'</td><td></td></tr><tr><td class=l>Solana-wide coverage</td><td class=l>'+(st.poller?'discovered '+st.poller.discovered+' · already live (not polled twice) '+st.poller.skippedLive+' · no metadata '+st.poller.noMeta+' · history restarted '+st.poller.lost+' · origins '+JSON.stringify(st.poller.by_origin)+' · risk '+JSON.stringify(st.poller.risk):'adapter off: only canonical PumpSwap pools are observed')+'</td><td></td></tr><tr><td class=l>Not covered</td><td class=l>Live (event-level) observation of Meteora, Raydium, Orca; a complete start-up inventory of already-existing coins outside PumpSwap; pump.fun bonding-curve history except via GMGN back-fill</td><td></td></tr>'+S.notes.map(n=>'<tr><td class=l>'+n.family+'</td><td class=l>'+n.reason+'</td><td>'+n.n+'</td></tr>').join('');
$('re').innerHTML='<tr><th>#</th><th class=l>coin</th><th class=l>origin · method</th><th>age</th><th class=l>families</th><th>mc</th><th class=l>status</th><th>fill delay / state age s</th><th>account check</th><th class=l>exits (stop: return)</th><th>best ×</th></tr>'+S.recent.map(e=>'<tr><td>'+e.id+'</td><td class=l><a href="https://gmgn.ai/sol/token/'+e.mint+'" target=_blank>'+e.mint.slice(0,6)+'</a></td><td class=l>'+(e.origin||(e.pop==='pumpswap-canonical'?'pump.fun':'?'))+' · '+e.mode+(e.cadence?' '+e.cadence+' s':'')+(e.route?' · '+e.route.join(' → '):'')+(e.risk&&e.risk!=='clean'?' · risk '+e.risk:'')+'</td><td>'+e.ag+'</td><td class=l>'+e.families.join(', ')+'</td><td>$'+e.mc.toLocaleString()+'</td><td class=l>'+e.status+(e.startup?' · startup':'')+(e.flags.length?' ('+e.flags.join('; ')+')':'')+'</td><td>'+(e.fill_delay??'–')+' / '+(e.state_age??'–')+'</td><td>'+(e.verify??'–')+'</td><td class=l>'+e.versions.filter(v=>!$('fp').value||v.policy===$('fp').value).map(v=>Math.round(v.stop*100)+(v.policy==='scale'?'h':'')+(v.stall?'s':'')+': '+(v.ret==null?v.status:(v.ret*100).toFixed(0)+'% '+v.reason)).join(' · ')+'</td><td>'+(e.runner_max??'–')+'</td></tr>').join('');}
$('fpop').onchange=load;$('ff').onchange=draw;$('fa').onchange=draw;$('fp').onchange=draw;load();setInterval(load,30000);
</script></body></html>`;
