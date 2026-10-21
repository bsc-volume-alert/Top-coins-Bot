// The /fomo page and its JSON API. Listens on 127.0.0.1 only; the tracker's web server (src/web.js) checks WEB_KEY and proxies
// /fomo and /fomo/* here, so the page has one URL and one key: http://<box>:8787/fomo?key=<WEB_KEY>
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { CFG } from "./config.mjs";
import { db, q, nowS } from "./db.mjs";
import { fo, flowSockets } from "./flow.mjs";
import { wa, walletsStatus, watchedList, addWallet, removeWallet } from "./wallets.mjs";
import { sc, realCost, openCount } from "./score.mjs";
import { px, solUsd, lastPx } from "./price.mjs";
import { rpcStat, budgetLeft } from "./rpc.mjs";
import { thesesStatus } from "./theses.mjs";
const VERSION = (() => { try { return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version; } catch { return "?"; } })();
const W = { "15m": 900, "1h": 3600, "6h": 21600, "24h": 86400 };
const json = (res, o, code = 200) => { res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(o)); };
const csv = (rows) => { if (!rows.length) return ""; const k = Object.keys(rows[0]); const esc = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)); return k.join(",") + "\n" + rows.map((r) => k.map((c) => esc(r[c])).join(",")).join("\n") + "\n"; };
function status() {
  const f = q.flowCount.get(nowS() - 3600);
  return { version: VERSION, up_s: Math.round(process.uptime()), mem_mb: Math.round(process.memoryUsage().rss / 1048576), sol_usd: solUsd(), signer: CFG.SIGNER,
    flow: { ...fo, sockets: flowSockets(), last_hour: f }, wallets: { ...wa, ...walletsStatus(), open_trades: openCount(), scoring: sc }, prices: px, rpc: { ...rpcStat, budget: CFG.DECODE_BUDGET, budget_left: budgetLeft() }, theses: thesesStatus() };
}
function trending(w) {
  const rows = q.trending.all(nowS() - (W[w] || 3600), 60);
  for (const r of rows) { const c = q.coin.get(r.mint); r.symbol = c?.symbol || null; r.name = c?.name || null; r.mc_usd = c?.mc_usd ?? null; r.liq_usd = c?.liq_usd ?? null; r.px_usd = lastPx(r.mint)?.usd ?? c?.px_usd ?? null; r.net_usd = (r.buy_usd || 0) - (r.sell_usd || 0); }
  rows.sort((a, b) => (b.buyers - a.buyers) || (b.buys - a.buys) || (b.buy_usd - a.buy_usd));
  return rows;
}
function wallets() {
  const list = watchedList().map((w) => ({ ...w, stats: q.walletTrades.get(w.wallet) }));
  const trades = q.recentTrades.all(nowS() - 7 * 86400, 200).map((t) => ({ ...t, net_h5: realCost(t.x_h5), net_tsl40: realCost(t.x_tsl40), net_t15s40: realCost(t.x_t15s40), net_copy: realCost(t.x_copy), live_mult: t.closed ? null : (lastPx(t.mint)?.usd || t.last_px) / t.entry_px }));
  const candidates = q.walletBuyers.all(nowS() - 86400, 3, 40); // the most active fomo buyers seen in the last 24 h (from decoded transactions)
  return { list, trades, candidates };
}
export function startWeb() {
  const srv = createServer((req, res) => {
    try {
      const u = new URL(req.url, "http://x"); let p = u.pathname.replace(/^\/fomo(?=\/|$)/, "") || "/";
      if (p === "/" || p === "/index.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); return res.end(PAGE); }
      if (p === "/api/status") return json(res, status());
      if (p === "/api/trending") return json(res, { window: u.searchParams.get("w") || "1h", rows: trending(u.searchParams.get("w") || "1h"), ts: nowS() });
      if (p === "/api/wallets" && req.method === "GET") return json(res, wallets());
      if (p === "/api/wallets" && req.method === "POST") { let body = ""; req.on("data", (c) => { body += c; if (body.length > 1e4) req.destroy(); }); req.on("end", () => { try { const b = JSON.parse(body || "{}"); const w = String(b.wallet || "").trim(); if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w)) return json(res, { ok: false, error: "not a Solana address" }, 400); if (b.action === "remove") removeWallet(w); else addWallet(w, { label: b.label ? String(b.label).slice(0, 40) : null, handle: b.handle ? String(b.handle).slice(0, 40) : null }); json(res, { ok: true }); } catch (e) { json(res, { ok: false, error: e.message }, 400); } }); return; }
      if (p === "/api/theses") return json(res, { rows: q.thesesCsv.all(nowS() - 7 * 86400), status: thesesStatus() });
      if (p.startsWith("/api/csv/")) { const days = Math.min(90, Math.max(1, Number(u.searchParams.get("days")) || 7)), since = nowS() - days * 86400; const which = p.slice(9); const rows = which === "trades" ? q.tradesCsv.all(since) : which === "theses" ? q.thesesCsv.all(since) : which === "flow_hourly" ? q.hourlyCsv.all(since) : null; if (!rows) return json(res, { error: "unknown csv" }, 404); res.writeHead(200, { "content-type": "text/csv; charset=utf-8" }); return res.end(csv(rows)); }
      json(res, { error: "not found" }, 404);
    } catch (e) { console.error("[web]", e.stack || e.message); try { json(res, { error: e.message }, 500); } catch {} }
  });
  srv.listen(CFG.PORT, "127.0.0.1", () => console.log(`[web] fomo on 127.0.0.1:${CFG.PORT}`));
  srv.on("error", (e) => console.error("[web]", e.message));
}
const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>fomo watcher</title>
<style>
:root{--bg:#0f1115;--card:#171a21;--mut:#8b93a7;--fg:#e6e9f0;--up:#4ade80;--dn:#f87171;--acc:#7dd3fc;--line:#252a35}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 -apple-system,system-ui,Segoe UI,Roboto,sans-serif}
header{display:flex;gap:14px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line);flex-wrap:wrap}
header b{font-size:16px} header a{color:var(--acc);text-decoration:none} .mut{color:var(--mut)} .up{color:var(--up)} .dn{color:var(--dn)}
nav{display:flex;gap:6px;padding:10px 14px} nav button,.w button{background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:6px 12px;cursor:pointer} nav button.on,.w button.on{border-color:var(--acc);color:var(--acc)}
main{padding:0 14px 40px} .card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:10px 0}
table{width:100%;border-collapse:collapse;font-size:13px} th{text-align:left;color:var(--mut);font-weight:500;padding:4px 6px;border-bottom:1px solid var(--line);white-space:nowrap} td{padding:4px 6px;border-bottom:1px solid var(--line);white-space:nowrap} tr:hover td{background:#1d212b}
.wrap{overflow-x:auto} a.coin{color:var(--fg);text-decoration:none;font-weight:600} .pill{display:inline-block;padding:1px 7px;border-radius:999px;background:#232838;color:var(--mut);font-size:12px}
input{background:#0f1115;color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:6px 8px} .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
h3{margin:4px 0 8px;font-size:14px;color:var(--mut);font-weight:500} .kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 14px;font-size:13px} .kv div span{color:var(--mut)}
</style></head><body>
<header><b>fomo watcher</b><span id="sub" class="mut">loading…</span><a id="back" href="#">← tracker</a></header>
<nav><button data-t="trending" class="on">Trending</button><button data-t="wallets">Wallets</button><button data-t="theses">Theses</button><button data-t="status">Status</button></nav>
<main><div id="trending"></div><div id="wallets" style="display:none"></div><div id="theses" style="display:none"></div><div id="status" style="display:none"></div></main>
<script>
const key=new URLSearchParams(location.search).get('key')||'';document.getElementById('back').href='/?key='+encodeURIComponent(key);
const $=s=>document.querySelector(s);const api=p=>fetch('/fomo'+p+(p.includes('?')?'&':'?')+'key='+encodeURIComponent(key)).then(r=>r.json());
const uk=ts=>new Date(ts*1000).toLocaleString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit'});const ukd=ts=>new Date(ts*1000).toLocaleString('en-GB',{timeZone:'Europe/London',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const fmt=n=>n==null?'—':n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':Number(n).toFixed(0);const pc=x=>x==null?'—':'<span class="'+(x>0?'up':x<0?'dn':'')+'">'+(x>0?'+':'')+(x*100).toFixed(1)+'%</span>';const mx=x=>x==null?'—':'<span class="'+(x>1?'up':x<1?'dn':'')+'">'+Number(x).toFixed(2)+'x</span>';
const ago=ts=>{const d=Math.floor(Date.now()/1000-ts);return d<60?d+'s':d<3600?Math.floor(d/60)+'m':(d/3600).toFixed(1)+'h'};const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let TAB='trending',WIN='1h';document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{TAB=b.dataset.t;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));['trending','wallets','theses','status'].forEach(t=>$('#'+t).style.display=t===TAB?'':'none');load()});
async function load(){try{if(TAB==='trending')await trending();else if(TAB==='wallets')await wallets();else if(TAB==='theses')await theses();else await status();}catch(e){$('#sub').textContent='page error: '+e.message}}
async function trending(){const j=await api('/api/trending?w='+WIN);const rows=j.rows||[];$('#sub').textContent=rows.length+' coins bought on fomo in the last '+WIN+' · '+uk(j.ts)+' UK';
$('#trending').innerHTML='<div class="card"><div class="row w">'+['15m','1h','6h','24h'].map(w=>'<button data-w="'+w+'" class="'+(w===WIN?'on':'')+'">'+w+'</button>').join('')+'<span class="mut">ranked by unique fomo buyers, then buys, then $ bought · buyers are exact only where the transaction was decoded (top coins first; the rest sampled) · prices from Jupiter / DexScreener</span></div></div>'+
'<div class="card wrap"><table><thead><tr><th>#</th><th>coin</th><th>buyers</th><th>buys</th><th>sells</th><th>$ bought</th><th>$ sold</th><th>net $</th><th>MC</th><th>liq</th><th>first</th><th>last</th><th>decoded</th></tr></thead><tbody>'+rows.map((r,i)=>'<tr><td class="mut">'+(i+1)+'</td><td><a class="coin" href="https://dexscreener.com/solana/'+r.mint+'" target="_blank">'+esc(r.symbol||r.mint.slice(0,6)+'…')+'</a> <span class="mut">'+esc((r.name||'').slice(0,18))+'</span></td><td><b>'+r.buyers+'</b></td><td>'+r.buys+'</td><td>'+r.sells+'</td><td>$'+fmt(r.buy_usd)+'</td><td>$'+fmt(r.sell_usd)+'</td><td>'+(r.net_usd>=0?'<span class="up">+':'<span class="dn">')+'$'+fmt(Math.abs(r.net_usd))+'</span></td><td>'+(r.mc_usd?'$'+fmt(r.mc_usd):'—')+'</td><td>'+(r.liq_usd?'$'+fmt(r.liq_usd):'—')+'</td><td class="mut">'+ago(r.first_ts)+'</td><td class="mut">'+ago(r.last_ts)+'</td><td class="mut">'+r.buys_decoded+'/'+r.buys+'</td></tr>').join('')+'</tbody></table>'+(rows.length?'':'<p class="mut">nothing yet — the firehose fills this within minutes of the first fomo trades</p>')+'</div>';
document.querySelectorAll('.w button').forEach(b=>b.onclick=()=>{WIN=b.dataset.w;trending()})}
async function wallets(){const j=await api('/api/wallets');$('#sub').textContent=j.list.length+' watched wallets · '+j.trades.filter(t=>!t.closed).length+' open paper trades';
const st=w=>{const s=w.stats||{};return s.n?('<b>'+s.n+'</b> buys · closed '+(s.closed||0)+' · won '+(s.closed?Math.round(100*(s.won40||0)/s.closed)+'%':'—')+' · trail '+pc(s.tsl40==null?null:s.tsl40-1)+' · 5-min '+pc(s.h5==null?null:s.h5-1)+' · copy '+pc(s.copy==null?null:s.copy-1)+' · avg $'+fmt(s.avg_usd)):'<span class="mut">no buys yet</span>'};
$('#wallets').innerHTML='<div class="card"><h3>Add a fomo wallet to watch (Solana address; a label helps — the fomo handle if you know it)</h3><div class="row"><input id="aw" placeholder="wallet address" size="46"><input id="al" placeholder="label / handle" size="18"><button id="ab">watch</button></div><p class="mut">Every buy by a watched wallet becomes a paper trade at the trader\\'s own fill, then scored at real costs: 5-min sale, 40% trail, 1.5x/−40%, copy-their-sell, 6 h. Figures below are gross multiples; the net columns apply the pool cost model.</p></div>'+
'<div class="card"><h3>Watched</h3>'+(j.list.length?'<table><thead><tr><th>wallet</th><th>label</th><th>record (gross)</th><th></th></tr></thead><tbody>'+j.list.map(w=>'<tr><td><a class="coin" href="https://solscan.io/account/'+w.wallet+'" target="_blank">'+w.wallet.slice(0,8)+'…'+w.wallet.slice(-4)+'</a></td><td>'+esc(w.label||w.handle||'')+'</td><td>'+st(w)+'</td><td><button class="rm" data-w="'+w.wallet+'">stop</button></td></tr>').join('')+'</tbody></table>':'<p class="mut">none yet — add one above, or pick from the candidates below</p>')+'</div>'+
'<div class="card wrap"><h3>Paper trades, last 7 days (newest first)</h3><table><thead><tr><th>time UK</th><th>trader</th><th>coin</th><th>$ in</th><th>entry MC</th><th>+5s</th><th>+30s</th><th>+2m</th><th>peak</th><th>now</th><th>5-min</th><th>trail 40</th><th>1.5x/−40</th><th>copy</th><th>net trail</th><th>their sell</th><th>state</th></tr></thead><tbody>'+j.trades.map(t=>{const d=(p)=>p==null?'—':mx(p/t.entry_px);return '<tr><td class="mut">'+ukd(t.entry_ts)+'</td><td>'+esc(t.handle||t.wallet.slice(0,6))+'</td><td><a class="coin" href="https://dexscreener.com/solana/'+t.mint+'" target="_blank">'+esc(t.symbol||t.csym||t.mint.slice(0,6))+'</a></td><td>$'+fmt(t.entry_usd)+'</td><td>'+(t.entry_mc?'$'+fmt(t.entry_mc):'—')+'</td><td>'+d(t.px5)+'</td><td>'+d(t.px30)+'</td><td>'+d(t.px120)+'</td><td>'+mx(t.peak)+'</td><td>'+(t.closed?'—':mx(t.live_mult))+'</td><td>'+mx(t.x_h5)+'</td><td>'+mx(t.x_tsl40)+'</td><td>'+mx(t.x_t15s40)+'</td><td>'+mx(t.x_copy)+'</td><td>'+pc(t.net_tsl40)+'</td><td class="mut">'+(t.their_sell_ts?ago(t.their_sell_ts)+' ago, held '+Math.round((t.their_sell_ts-t.entry_ts)/60)+'m':'holding')+'</td><td class="mut">'+(t.closed?(t.exit_reason||'closed'):'open')+'</td></tr>'}).join('')+'</tbody></table>'+(j.trades.length?'':'<p class="mut">no trades yet</p>')+'</div>'+
'<div class="card wrap"><h3>Candidates — the most active fomo buyers in the last 24 h (from decoded transactions; our own data, no leaderboard)</h3><table><thead><tr><th>wallet</th><th>coins</th><th>buys</th><th>first</th><th>last</th><th></th></tr></thead><tbody>'+(j.candidates||[]).map(c=>'<tr><td><a class="coin" href="https://solscan.io/account/'+c.wallet+'" target="_blank">'+c.wallet.slice(0,8)+'…'+c.wallet.slice(-4)+'</a></td><td>'+c.coins+'</td><td>'+c.buys+'</td><td class="mut">'+ago(c.first_ts)+'</td><td class="mut">'+ago(c.last_ts)+'</td><td><button class="add" data-w="'+c.wallet+'">watch</button></td></tr>').join('')+'</tbody></table></div>';
const post=async(b)=>{const r=await fetch('/fomo/api/wallets?key='+encodeURIComponent(key),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});const j=await r.json();if(!j.ok)alert(j.error||'failed');wallets()};
$('#ab').onclick=()=>post({action:'add',wallet:$('#aw').value.trim(),label:$('#al').value.trim()});document.querySelectorAll('.rm').forEach(b=>b.onclick=()=>{if(confirm('Stop watching this wallet? Its trades stay recorded.'))post({action:'remove',wallet:b.dataset.w})});document.querySelectorAll('.add').forEach(b=>b.onclick=()=>post({action:'add',wallet:b.dataset.w}))}
async function theses(){const j=await api('/api/theses');$('#sub').textContent=(j.rows||[]).length+' theses in 7 days';$('#theses').innerHTML='<div class="card"><p class="mut">'+esc(j.status.note||'')+'</p>'+((j.rows||[]).length?'<table><thead><tr><th>time UK</th><th>handle</th><th>coin</th><th>type</th><th>thesis</th><th>1h</th><th>6h</th><th>24h</th><th>poster exit</th></tr></thead><tbody>'+j.rows.map(t=>'<tr><td class="mut">'+ukd(t.ts)+'</td><td>'+esc(t.handle)+'</td><td>'+esc(t.mint.slice(0,6))+'</td><td><span class="pill">'+esc(t.type)+'</span></td><td style="white-space:normal;max-width:420px">'+esc(t.text)+'</td><td>'+mx(t.px1h&&t.px0?t.px1h/t.px0:null)+'</td><td>'+mx(t.px6h&&t.px0?t.px6h/t.px0:null)+'</td><td>'+mx(t.px24h&&t.px0?t.px24h/t.px0:null)+'</td><td class="mut">'+(t.poster_exit_s!=null?Math.round(t.poster_exit_s/60)+'m':'—')+'</td></tr>').join('')+'</tbody></table>':'')+'</div>'}
async function status(){const s=await api('/api/status');$('#sub').textContent='v'+s.version+' · up '+Math.round(s.up_s/60)+' min · '+s.mem_mb+' MB';const f=s.flow,w=s.wallets,r=s.rpc,p=s.prices;const kv=o=>'<div class="kv">'+Object.entries(o).map(([k,v])=>'<div><span>'+esc(k)+'</span><br>'+esc(typeof v==='object'?JSON.stringify(v):v)+'</div>').join('')+'</div>';
$('#status').innerHTML='<div class="card"><h3>Firehose (signer '+s.signer.slice(0,6)+'…)</h3>'+kv({mode:f.mode,'notifs public':f.notifsPublic,'notifs helius':f.notifsHelius,'helius today':f.heliusToday+' / cap '+(f.sockets&&f.sockets.helius?'on':'off'),'txs':f.txs,'failed txs':f.failed,'legs':f.legs,'rows':f.rows,'dupes':f.dupes,'by venue':f.byVenue,'unknown pools':f.unknownPool,'pool lookups today':f.sockets.poolBudgetUsed+' / '+f.sockets.poolBudget,'pending pools':f.sockets.pendingPools,'buffered':f.buffered,'dropped':f.dropped,'last hour':f.last_hour,'wallet from event':f.walletFromEvent,'wallet from tx':f.walletFromTx,'event wallet check':f.walletMatch+' match / '+f.walletMismatch+' mismatch','decode runs':f.decodeRuns,'decode errors':f.decodeErrors,'last tx':f.lastTx?ago(f.lastTx)+' ago':'—','public socket':f.sockets.public,'helius socket':f.sockets.helius,'last log':f.lastLog})+'</div>'+
'<div class="card"><h3>Watched wallets</h3>'+kv({watched:w.watched,txs:w.txs,decoded:w.decoded,buys:w.buys,sells:w.sells,errors:w.errors,'open trades':w.open_trades,scoring:w.scoring,socket:w.socket,'last log':w.lastLog})+'</div>'+
'<div class="card"><h3>RPC / prices</h3>'+kv({'decode budget':r.used+' used / '+r.budget+' a day ('+r.budget_left+' left)','rpc calls':r.calls,'rpc errors':r.errors,'last error':r.lastErr,'jupiter calls':p.jupCalls,'jupiter fails':p.jupFails,'dexscreener calls':p.dsCalls,'dexscreener fails':p.dsFails,'coins quoted':p.quoted,'last price tick':p.lastTick?ago(p.lastTick)+' ago':'—','SOL/USD':s.sol_usd})+'</div>'}
load();setInterval(load,30000);
</script></body></html>`;
