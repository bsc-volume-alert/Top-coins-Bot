// coin scope 0.7.0 (owner, 24 Oct 17:06 UK: "we should have a website of the coins that are over 100K, with all the relevant data"):
// /radar — every coin the radar app caught ($50K / $100K / $200K in 5 minutes under $2M market cap, or two listed wallets buying early), what GMGN
// and FOMO showed at that moment, how far it ran, and the paper result of buying it at each level. Reads radar.db read-only; writes nothing.
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
let rdb = null;
function open() { if (rdb) return rdb; const p = process.env.RADAR_DB || "/root/tracker/data/radar.db"; if (!existsSync(p)) return null; try { rdb = new Database(p, { readonly: true, fileMustExist: true }); } catch { rdb = null; } return rdb; }
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
export function radarApi(days = 3) {
  const db = open(); if (!db) return { ok: false, error: "the radar has no data yet" };
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const coins = db.prepare("SELECT mint, name, symbol, launchpad, exchange, trig, flag_ts, created_ts, flag_vol5m, flag_mc, t50, t100, t200, mc50, mc100, mc200, early_ts, early_n, early_mc, early_wallets, base_mc, peak_mc, last_mc, sum0, confirmed, bird FROM coins WHERE flag_ts>=? ORDER BY flag_ts DESC LIMIT 600").all(since);
  const papers = db.prepare("SELECT * FROM paper WHERE entry_ts>=?").all(since - 86400), byMint = new Map();
  for (const p of papers) { if (!byMint.has(p.mint)) byMint.set(p.mint, []); byMint.get(p.mint).push(p); }
  const out = coins.map((c) => { let s = null, ew = []; try { s = JSON.parse(c.sum0 || "null"); } catch {} try { ew = JSON.parse(c.early_wallets || "[]"); } catch {}
    return { ...c, sum0: undefined, early_wallets: undefined, s, early: ew.map((x) => ({ w: x.w, src: x.src, sol: x.sol })), paper: byMint.get(c.mint) || [] }; });
  const groups = {};
  for (const p of papers) { const g = groups[p.trig] || (groups[p.trig] = { n: 0, scored: 0, x2: 0, x3: 0, x5: 0, hold: [], trail: [], tp: [], won: 0 }); g.n++;
    if (p.done && p.peak360 != null) { g.scored++; if (p.peak360 >= 2) g.x2++; if (p.peak360 >= 3) g.x3++; if (p.peak360 >= 5) g.x5++; g.hold.push(p.r_hold); g.trail.push(p.r_trail40); g.tp.push(p.r_tp2sl50); if (p.r_trail40 > 0) g.won++; } }
  const summary = Object.fromEntries(Object.entries(groups).map(([k, g]) => [k, { n: g.n, scored: g.scored, x2: g.x2, x3: g.x3, x5: g.x5, won: g.won, hold: avg(g.hold), trail: avg(g.trail), tp: avg(g.tp) }]));
  const st = db.prepare("SELECT v FROM kv WHERE k='lastFlag'").get();
  return { ok: true, at: Math.floor(Date.now() / 1000), days, coins: out, summary, listed: db.prepare("SELECT src, COUNT(*) n FROM wallets GROUP BY src").all(), stamp: st?.v ?? null };
}

export const RADAR_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Radar</title>
<style>
:root{--bg:#0d1117;--card:#161b22;--line:#30363d;--txt:#e6edf3;--mut:#8b949e;--grn:#3fb950;--red:#f85149;--amb:#e3b341;--blu:#58a6ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.45 -apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:1500px;margin:0 auto;padding:16px}h1{font-size:20px;margin:0 0 4px}.sub{color:var(--mut);font-size:12.5px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin:12px 0}
table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}th{color:var(--mut);font-weight:500;position:sticky;top:0;background:var(--card)}
td.l,th.l{text-align:left}.tw{overflow:auto;max-height:75vh}.pos{color:var(--grn)}.neg{color:var(--red)}.amb{color:var(--amb)}
a{color:var(--blu);text-decoration:none}.btns{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.btns button{background:#21262d;color:var(--txt);border:1px solid var(--line);border-radius:6px;padding:5px 10px;cursor:pointer}
.btns button.on{background:#1f6feb;border-color:#1f6feb}.tag{display:inline-block;border-radius:4px;padding:0 5px;margin-right:3px;font-size:11px;background:#21262d;color:var(--mut)}
.t50{background:#1f3a5f;color:#9cc6ff}.t100{background:#3b2f5f;color:#cdb4ff}.t200{background:#5f2f2f;color:#ffb4b4}.early{background:#1f4f2f;color:#a6f4b5}
</style></head><body><div class="wrap"><h1>Radar</h1><div class="sub" id="hd">loading…</div>
<div class="card"><b>Paper results by trigger</b> <span class="sub">— a paper buy at the moment of each trigger, scored 6 hours later from GMGN's candles, after real costs</span><div id="sum" style="margin-top:8px"></div></div>
<div class="card"><div class="btns" id="btns"></div><div class="tw"><table id="tb"></table></div>
<div class="sub" style="margin-top:8px">Labels are what GMGN and FOMO showed at the first snapshot — never looked up again later. "x" = price now or at that time ÷ price at the first trigger. Trail = 40% trailing stop, TP/SL = sell at 2x or at −50%, Hold = held 6 h. Paper only — nothing is bought.</div></div>
</div><script>
var key=new URLSearchParams(location.search).get('key')||'',D=null,F='all';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function usd(x){if(x==null)return '–';return x>=1e6?'$'+(x/1e6).toFixed(2)+'M':x>=1e3?'$'+(x/1e3).toFixed(1)+'K':'$'+Math.round(x)}
function pc(x){return x==null?'–':(x>=0?'+':'')+(x*100).toFixed(1)+'%'}
function xx(x){return x==null?'–':'<span class="'+(x>=2?'pos':x<1?'neg':'')+'">'+x.toFixed(2)+'x</span>'}
function uk(t){return t?new Date(t*1000).toLocaleString('en-GB',{timeZone:'Europe/London',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'–'}
function age(s){if(s==null)return '–';return s<3600?Math.round(s/60)+'m':s<86400?(s/3600).toFixed(1)+'h':(s/86400).toFixed(1)+'d'}
function n1(x){return x==null?'–':x}
function trigs(c){var h='';if(c.t50)h+='<span class="tag t50">50K '+uk(c.t50).slice(-5)+'</span>';if(c.t100)h+='<span class="tag t100">100K '+uk(c.t100).slice(-5)+'</span>';if(c.t200)h+='<span class="tag t200">200K '+uk(c.t200).slice(-5)+'</span>';if(c.early_ts)h+='<span class="tag early" title="'+esc((c.early||[]).map(function(e){return e.src+' '+e.w.slice(0,4)}).join(', '))+'">early '+c.early_n+'w</span>';return h}
function best(c){var p=(c.paper||[]).filter(function(x){return x.done&&x.peak360!=null});if(!p.length)return null;p.sort(function(a,b){return a.entry_ts-b.entry_ts});return p[0]}
function first(c){var p=(c.paper||[]).slice().sort(function(a,b){return a.entry_ts-b.entry_ts});return p[0]||null}
function sumHtml(S){var order=['v50','v100','v200','early'],nm={v50:'$50K / 5 min',v100:'$100K / 5 min',v200:'$200K / 5 min',early:'Early (listed wallets)'};
 return '<table><tr><th class="l">trigger</th><th>paper buys</th><th>scored (6 h)</th><th>reached 2x</th><th>reached 3x</th><th>reached 5x</th><th>Hold 6 h</th><th>Trail 40%</th><th>TP 2x / SL 50%</th><th>won (trail)</th></tr>'+order.filter(function(k){return S[k]}).map(function(k){var g=S[k],r=function(a){return g.scored?Math.round(a/g.scored*100)+'%':'–'};return '<tr><td class="l">'+nm[k]+'</td><td>'+g.n+'</td><td>'+g.scored+'</td><td>'+r(g.x2)+'</td><td>'+r(g.x3)+'</td><td>'+r(g.x5)+'</td><td class="'+(g.hold>0?'pos':'neg')+'">'+pc(g.hold)+'</td><td class="'+(g.trail>0?'pos':'neg')+'">'+pc(g.trail)+'</td><td class="'+(g.tp>0?'pos':'neg')+'">'+pc(g.tp)+'</td><td>'+r(g.won)+'</td></tr>'}).join('')+'</table>'+(Object.keys(S).length?'':'<div class="sub">no paper buys yet</div>')}
function chainCells(ch){if(!ch)return '<td>–</td><td>–</td><td>–</td><td class="l">–</td>';var r=[];if(ch.delegate)r.push('<span class="neg" title="this address can take tokens from any wallet">permanent delegate</span>');if(ch.taxBps)r.push('<span class="amb">tax '+(ch.taxBps/100).toFixed(2)+'%</span>');if(ch.hook)r.push('<span class="amb">transfer hook</span>');if(ch.mintAuth)r.push('<span class="neg">mint on</span>');if(ch.freezeAuth)r.push('<span class="neg">freeze on</span>');
 return '<td>'+(ch.seen?(ch.bundlePct==null?'–':ch.bundlePct.toFixed(1)+'% <span class="sub">'+n1(ch.bundleWallets)+'w</span>'):'<span class="sub">not seen</span>')+'</td><td class="'+(ch.launchHoldNowPct>=20?'neg':ch.launchHoldNowPct>=5?'amb':'')+'">'+(ch.launchHoldNowPct==null?'–':ch.launchHoldNowPct.toFixed(1)+'%'+(ch.devHoldNowPct?' <span class="sub">dev '+ch.devHoldNowPct.toFixed(1)+'%</span>':''))+'</td><td>'+(ch.devIsNamed===0?'<span class="amb" title="launched by '+esc(ch.deployer||'')+' — a different wallet from the creator named on the coin">hidden'+(ch.deployerBuyPct?' · bought '+ch.deployerBuyPct.toFixed(1)+'%':'')+'</span>':ch.devIsNamed===1?'named':'–')+'</td><td class="l">'+(r.join(' ')||'<span class="sub">none</span>')+'</td>'}
function show(c){if(F==='all')return true;if(F==='early')return !!c.early_ts;if(F==='ran')return (c.paper||[]).some(function(p){return p.peak360>=2});return !!c['t'+F]}
function render(){if(!D)return;var C=D.coins.filter(show);
 document.getElementById('hd').innerHTML=D.coins.length+' coins caught in the last '+D.days+' days · wallet list: '+(D.listed||[]).map(function(x){return x.src+' '+x.n}).join(' · ')+' · updated '+uk(D.at);
 document.getElementById('sum').innerHTML=sumHtml(D.summary||{});
 document.getElementById('btns').innerHTML=[['all','All'],['50','50K'],['100','100K'],['200','200K'],['early','Early'],['ran','Ran 2x+']].map(function(b){return '<button class="'+(F===b[0]?'on':'')+'" onclick="F=\\''+b[0]+'\\';render()">'+b[1]+'</button>'}).join('');
 document.getElementById('tb').innerHTML='<tr><th class="l">caught (UK)</th><th class="l">coin</th><th class="l">triggers</th><th>age</th><th>MC then</th><th>peak 6 h</th><th>5 m</th><th>15 m</th><th>1 h</th><th>6 h</th><th>trail</th><th>TP/SL</th><th>smart</th><th>KOL</th><th>bundler</th><th>insider</th><th>fresh</th><th>bots</th><th>phishing</th><th>top 10</th><th>dev</th><th>dev coins</th><th>FOMO buyers</th><th title="bought in the create block (our tracker&#39;s live record)">launch bundle</th><th title="how much the dev and the launch wallets still held when the radar caught it (read from the chain)">launch still hold</th><th title="the wallet that signed the launch vs the creator named on the coin">real dev</th><th class="l">token risks</th></tr>'+
 C.map(function(c){var s=c.s||{},p=first(c),b=best(c);return '<tr><td class="l">'+uk(c.flag_ts)+'</td><td class="l"><a target="_blank" href="https://gmgn.ai/sol/token/'+c.mint+'">'+esc(c.symbol||c.mint.slice(0,6))+'</a> <a class="sub" href="/coin?key='+encodeURIComponent(key)+'&mint='+c.mint+'" title="deep check: wallets, side wallets, owner groups (2–4 min)">deep</a></td><td class="l">'+trigs(c)+'</td><td>'+age(c.created_ts?c.flag_ts-c.created_ts:null)+'</td><td>'+usd(c.flag_mc||c.early_mc)+'</td><td>'+(b?xx(b.peak360):'–')+'</td><td>'+(p&&p.done?xx(p.x5):'–')+'</td><td>'+(p&&p.done?xx(p.x15):'–')+'</td><td>'+(p&&p.done?xx(p.x60):'–')+'</td><td>'+(p&&p.done?xx(p.x_hold):'<span class="sub">'+(p?'in '+age(p.entry_ts+21600-D.at):'–')+'</span>')+'</td><td>'+(p&&p.done?'<span class="'+(p.r_trail40>0?'pos':'neg')+'">'+pc(p.r_trail40)+'</span>':'–')+'</td><td>'+(p&&p.done?'<span class="'+(p.r_tp2sl50>0?'pos':'neg')+'">'+pc(p.r_tp2sl50)+'</span>':'–')+'</td><td>'+n1(s.smart)+'</td><td>'+n1(s.kol)+'</td><td>'+(s.bundler==null?'–':s.bundler+'%')+'</td><td>'+(s.insider==null?'–':s.insider+'%')+'</td><td>'+(s.fresh==null?'–':s.fresh+'%')+'</td><td>'+(s.bots==null?'–':s.bots+'%')+'</td><td class="'+(s.phishing>=20?'neg':'')+'">'+(s.phishing==null?'–':s.phishing+'%')+'</td><td>'+(s.top10==null?'–':s.top10+'%')+'</td><td>'+(s.dev==null?'–':s.dev+'%')+'</td><td>'+n1(s.devLaunches)+'</td><td>'+n1(s.fomoBuyers)+'</td>'+chainCells(s.chain)+'</tr>'}).join('')}
function load(){fetch('/api/radar?key='+encodeURIComponent(key)).then(function(r){return r.json()}).then(function(j){if(!j.ok){document.getElementById('hd').textContent=j.error||'error';return}D=j;render()}).catch(function(e){document.getElementById('hd').textContent='could not load: '+e.message})}
load();setInterval(load,60000);
</script></body></html>`;
