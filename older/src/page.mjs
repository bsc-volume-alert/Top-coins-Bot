// page.mjs — the books page in the ORIGINAL site's design (owner, 20 Nov 2026: "just copy the website that we had before, the
// format, it was perfect"): purple gradient, a ranked strip best-first, one card per book with today / last 6 h / last 24 h /
// total, what is open now, and the latest trades with fill in → out, timing and the high. Refreshes every 10 s.
// A "book" here is one entry family under the selected stop, exit policy, age group and population (selectors in the header);
// the dense table (families × 4 ages × 5 stops × 2 exits) is at /table.
// STAKE VIEW: the stake selector re-prices every pool-priced trade at 0.5 / 1 / 2 / 5 SOL (book.mjs atStake) — display only.
import * as S from "./spec.mjs";
import { versionsFor, atStake, COST } from "./book.mjs";

export const RULES = {
  "AGE-DOUBLE": "market cap freshly crosses 2× what it was at the start of the coin's age group (8 / 16 / 24 / 36 h)",
  "LOW4H": "price freshly crosses 2× its lowest of the last 4 hours — no pullback needed",
  "CONT": "price 30%+ above 15 minutes ago and within 5% of its 1-hour high",
  "SLOW-BUILD": "LOW4H's first doubling, only if it took 30+ minutes from the low with no single 1-minute candle above +20%",
  "HH-BREAK": "new 60-minute high with the last 15 completed minutes' volume at 2× the 4-hour norm",
  "CONT-STALL": "CONT's buys, closed at 60 minutes if the position never reached 1.15× cost",
  "LOW4H-LIQ25K": "LOW4H's first doubling, only with $25K+ pool liquidity and small price impact",
  "FAST-1M": "price doubles inside 1 minute", "FAST-3M": "price doubles inside 3 minutes", "FAST-5M": "price doubles inside 5 minutes",
  "FAST-10M": "price doubles inside 10 minutes", "FAST-30M": "price doubles inside 30 minutes",
  "FAST150-1M": "price up 1.5× inside 1 minute", "FAST150-3M": "price up 1.5× inside 3 minutes", "FAST150-5M": "price up 1.5× inside 5 minutes", "FAST150-10M": "price up 1.5× inside 10 minutes",
  "SECOND-WAVE": "after a fast double: falls 25%+ from its high, then breaks above that high within 60 minutes",
};

/** every trade of every family under one stop / policy (+ optional age group and population) — the page computes the windows.
 *  stake ≠ 0.2: each filled trade is shown re-priced at that stake (atStake). A trade that cannot be re-priced (a routed-quote
 *  trade; an open position not yet valued since a restart) is NOT left out — leaving it out changed which trades a book held
 *  from one stake button to the next (owner, 21 Nov 14:25 UK: the 0.5 SOL total was more than 2.5 × the 0.2 SOL total because
 *  two losing sampled trades had dropped out). It keeps its 0.2 SOL percentage result on the larger stake, with no extra price
 *  impact taken off, and is flagged `flat` and counted. Every stake button therefore shows the same set of trades. */
export function booksApi(entries, { stop = 0.25, policy = "trail", ag = "", pop = "", stake = S.STAKE_SOL } = {}) {
  const books = Object.fromEntries(S.FAMILIES.map((f) => [f, []])), view = stake !== S.STAKE_SOL, cost = view ? stake + S.TX_COST_SOL : COST;
  for (const e of entries) {
    if (ag && e.ag !== ag) continue; if (pop && (e.pop || "pumpswap-canonical") !== pop) continue;
    for (const f of e.families) {
      const v = versionsFor(e, f, policy).find((x) => x.stop === stop); if (!v || !books[f]) continue;
      const live = v.status === "open" || v.status === "selling" || v.status === "scaling";
      books[f].push({ id: e.id, mint: e.mint, sym: e.token?.symbol ?? null, ag: e.ag, mode: e.mode || "live", origin: e.token?.origin ?? (e.pop === "solana-wide" ? null : "pump.fun"), route: e.fill?.quote?.route ?? null,
        t: e.decisionT, mc: Math.round(e.signalMc), status: e.status === "filled" ? (live ? "open" : v.status) : e.status, why: e.status === "cancelled" ? e.flags.join("; ") : null,
        fill_t: e.fill?.t ?? null, buy_delay: e.fill?.delay_s ?? null, hi: e.runner?.maxX ?? null, now_x: live ? (v.lastX ?? null) : null, half: v.half ? +(v.half.sol / COST).toFixed(3) : null,
        exit_t: v.exit?.t ?? null, ret: v.exit?.ret ?? null, net: v.exit ? v.exit.sol - COST : null, reason: v.reason ?? null, sell_delay: v.exit?.delay_s ?? null, hold_s: v.exit?.hold_s ?? null,
        startup: !!e.startup, shared: e.families.length > 1 ? e.families.filter((x) => x !== f) : null, check: e.verify ? (e.verify.error ? "error" : e.verify.suspect ? "SUSPECT" : +(e.verify.diff_quote * 100).toFixed(2)) : null, flags: e.flags?.length ? e.flags : null });
      if (view && e.status === "filled") { // the same trade at another stake; the high stays the 0.2 SOL multiple (labelled on the page)
        const r = books[f][books[f].length - 1], z = atStake(e, v, stake);
        if (!z) Object.assign(r, { flat: true, net: v.exit ? v.exit.ret * cost : null }); // same % as at 0.2 SOL: ret, now_x and the half multiple stay as recorded
        else Object.assign(r, { est: z.est || undefined, half: z.half != null ? +(z.half / z.cost).toFixed(3) : null, ret: z.closed ? z.ret : null, net: z.closed ? z.net : null, now_x: z.closed ? null : (live ? z.now_x : null) });
      }
    }
  }
  return { at: Date.now() / 1000, spec: S.SPEC_VER, stop, policy, ag, pop, stake, stakes: S.STAKE_VIEWS, cost, rows_total: S.FAMILIES.length * S.AGES.length * S.STOPS.length * S.POLICIES.length, rules: RULES, order: S.FAMILIES, books };
}

export const BOOKS_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Older coins — paper books</title>
<style>
:root{--card:rgba(14,10,40,.72);--line:#3a2a6a;--tx:#e9e6ff;--mut:#9a8fd0;--up:#39ff9c;--dn:#ff4d7a;--acc:#4ad8ff;--mag:#ff3ea5;--amb:#ffb84d}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(180deg,#1b0b3a 0%,#2a0f5a 30%,#0e1f5a 70%,#071a3f 100%) fixed;color:var(--tx);font:14px/1.45 ui-monospace,'SF Mono',Menlo,Consolas,'Cascadia Mono','JetBrains Mono',monospace}
header{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;position:sticky;top:0;background:rgba(18,10,42,.85);backdrop-filter:blur(8px);z-index:2}
h1{font-size:24px;margin:0;color:var(--mag);letter-spacing:.02em;font-weight:800;text-shadow:0 0 18px rgba(255,62,165,.35)}h1 a{font-size:12px;color:var(--acc);margin-left:10px;font-weight:500;text-decoration:none}#sub{font-size:12px;margin-top:2px;color:var(--mut)}
main{padding:12px 16px;max-width:1280px;margin:0 auto}.mut{color:var(--mut)}.up{color:var(--up)}.dn{color:var(--dn)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;box-shadow:0 0 0 1px rgba(255,62,165,.08),0 10px 30px rgba(0,0,0,.35);margin-bottom:12px}
.rule{font-size:12px;color:var(--mut);min-height:16px;margin:2px 0 6px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;vertical-align:middle}.seg button{background:transparent;color:var(--mut);border:0;padding:6px 10px;font:inherit;font-size:13px;cursor:pointer}.seg button.on{background:rgba(255,62,165,.18);color:#fff}
.mode{display:inline-block;padding:2px 9px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:.08em;margin-left:8px;vertical-align:middle}.mode.sim{background:#ffb84d;color:#1a0f00}.mode.warn{background:#ff4d4d;color:#fff}
.grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:8px 0 4px}.lab{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}.big{font-size:26px;font-weight:800;line-height:1.15;margin:2px 0 0}.big.ok{color:var(--up)}.big.bad{color:var(--dn)}.small{font-size:12px;opacity:.8}
.bookhead{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}.bookrow{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.rk{color:var(--mut);font-size:12px}
table{width:100%;border-collapse:collapse;font-size:12.5px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap}th{color:var(--mag);font-weight:500}
.tbl{overflow-x:auto;background:rgba(0,0,0,.18);border:1px solid var(--line);border-radius:10px;margin-top:4px}.tbl.scroll{max-height:46vh;overflow:auto}.tbl.scroll thead th{position:sticky;top:0;background:#1a1040;z-index:1}
.pill{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-size:12px}.pill.win{background:#5fff87;color:#04140a}.pill.loss{background:#ff5f6f;color:#1a0008}.pill.hold{border:1px solid #5fd7ff;color:#5fd7ff}.pill.na{color:#6c6ca0;border:1px solid #3a3a6a}
a.coin{color:var(--tx);text-decoration:none;border-bottom:1px dotted var(--acc)}a.coin:hover{color:var(--acc)}
.rank{display:flex;gap:6px 18px;flex-wrap:wrap;align-items:baseline;font-size:13px}.rank .mut{font-size:12px}
@keyframes fl{from{background:rgba(74,216,255,.35)}to{background:transparent}}.chg{animation:fl 1.2s ease-out}
.kp{display:flex;gap:6px 16px;flex-wrap:wrap;font-size:12px}.kp b{color:#fff}
footer{padding:16px;color:var(--mut);font-size:12px;text-align:center}
</style></head><body>
<header><div><h1>Older coins — paper books <a id="tbl" href="#">full table →</a></h1><div id="sub">loading…</div></div>
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="mut small" id="tick"></span>
<span class="mut">stop</span><span class="seg" id="stop"><button data-v="0.2">20%</button><button data-v="0.25" class="on">25%</button><button data-v="0.3">30%</button><button data-v="0.4">40%</button><button data-v="0.6">60%</button></span>
<span class="mut">stake</span><span class="seg" id="stake"><button data-v="0.2" class="on">0.2</button><button data-v="0.5">0.5</button><button data-v="1">1</button><button data-v="2">2</button><button data-v="5">5 SOL</button></span>
<span class="mut">exit</span><span class="seg" id="policy"><button data-v="trail" class="on">trail</button><button data-v="scale">half at 2×</button></span>
<span class="mut">age</span><span class="seg" id="ag"><button data-v="" class="on">all</button><button data-v="A1">8–16h</button><button data-v="A2">16–24h</button><button data-v="A3">24–36h</button><button data-v="A4">36h+</button></span>
<span class="mut">coins</span><span class="seg" id="pop"><button data-v="" class="on">all</button><button data-v="pumpswap-canonical">pump.fun live</button><button data-v="solana-wide">rest of Solana</button></span>
<input id="q" type="search" placeholder="find a coin: paste its contract address or type its name" autocomplete="off" autocapitalize="off" spellcheck="false" style="flex:1 1 260px;min-width:220px;background:rgba(0,0,0,.25);border:1px solid var(--line);border-radius:8px;color:var(--tx);font:inherit;font-size:13px;padding:6px 10px"></div></header>
<main>
<div class="card" id="found" style="padding:10px 14px;display:none"></div>
<div class="card" id="size" style="padding:10px 14px;display:none;border-color:var(--amb)"></div>
<div class="card" id="rank" style="padding:10px 14px"></div>
<div class="card" id="health" style="padding:10px 14px"></div>
<div id="books"></div>
<div class="card mut" style="font-size:12px">PAPER ONLY — nothing here is a real trade. Every figure is a <b>simulated fill</b> at 0.2 SOL (the stake buttons re-price the same trades at a bigger size — an estimate, see the amber note): bought 1 s after the rule fires, sold 0.7 s after the stop triggers (or at 24 h), after pool fees, price impact and an assumed 0.0005 SOL per transaction. <b>pump.fun live</b> coins are watched trade by trade and priced on the pool itself. <b>Rest of Solana</b> coins are checked every few seconds through Jupiter and priced from Jupiter quotes — they can miss fast moves between checks. Books share coins and buys (one coin can appear in several books): do not add the books together as if it were one wallet. UK times. Refreshes every 10 s.</div>
</main><footer id="foot"></footer>
<script>
var Q=new URLSearchParams(location.search),key=Q.get('k')||Q.get('key')||'';document.getElementById('tbl').href='/table'+(key?'?k='+encodeURIComponent(key):'');
var SEL={stop:'0.25',policy:'trail',ag:'',pop:'',stake:'0.2'};try{var sv=JSON.parse(localStorage.getItem('olderSel')||'null');if(sv)SEL=sv}catch(e){}if(!SEL.stake)SEL.stake='0.2';
function UKT(ts){return new Date(ts*1000).toLocaleString('en-GB',{timeZone:'Europe/London',hour12:false,day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
function HM(ts){return new Date(ts*1000).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function DT(ts){return new Date(ts*1000).toLocaleString('en-GB',{timeZone:'Europe/London',hour12:false,day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function ago(ts){var s=Math.floor(Date.now()/1000-ts);return s<60?s+' s':s<3600?Math.floor(s/60)+' min':(s/3600).toFixed(1)+' h'}
function sl(v){return (v>=0?'+':'')+v.toFixed(3)+' SOL'}function pc(v){return (v>=0?'+':'')+(v*100).toFixed(0)+'%'}function esc(s){return String(s==null?'':s).replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]})}
function ukDayStart(){var d=new Date();var p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(d);var o={};p.forEach(function(x){o[x.type]=x.value});return Math.floor(d.getTime()/1000)-((+o.hour)*3600+(+o.minute)*60+(+o.second))}
function sumR(rows){var n=0,s=0,w=0;rows.forEach(function(t){n++;s+=t.net;if(t.ret>0)w++});return {n:n,net:s,won:w}}
function coin(t){return '<a class="coin" href="https://gmgn.ai/sol/token/'+t.mint+'" target="_blank">'+esc(t.sym||t.mint.slice(0,8))+'</a>'+(t.sym?' <span class="mut small" title="'+esc(t.mint)+'">'+esc(t.mint.slice(0,6))+'…</span>':'')}
var FIND='';function hit(t){if(!FIND)return true;var f=FIND.toLowerCase();return t.mint.toLowerCase().indexOf(f)>=0||String(t.sym||'').toLowerCase().indexOf(f)>=0}
function how(t){return '<span class="mut">'+t.ag+' · '+(t.mode==='polled'?'sampled'+(t.route?' · '+esc(t.route.join('→')):''):'live')+(t.origin&&t.origin!=='pump.fun'?' · '+esc(t.origin):'')+(t.startup?' · startup':'')+'</span>'}
var PREV={},LAST=null,ST=null;
function draw(j){
 var now=Math.floor(Date.now()/1000),day0=ukDayStart(),B={},SK=(j.stake||0.2)+' SOL',VIEW=j.stake&&j.stake!==0.2,UNS=0,PRICED=0,EST=0;
 j.order.forEach(function(k){var all=j.books[k]||[];var done=all.filter(function(t){return t.status==='closed'&&t.ret!=null}),open=all.filter(function(t){return t.status==='open'}),other=all.filter(function(t){return t.status!=='closed'&&t.status!=='open'});
  var w=function(s){return sumR(done.filter(function(t){return t.fill_t>=s}))};var tot=sumR(done),h12=w(now-43200);
  var byMint={};done.forEach(function(t){byMint[t.mint]=(byMint[t.mint]||0)+t.net});var top3=Object.keys(byMint).sort(function(a,b){return byMint[b]-byMint[a]}).slice(0,3);var ex=sumR(done.filter(function(t){return top3.indexOf(t.mint)<0}));
  var uns=all.filter(function(t){return t.flat});UNS+=done.filter(function(t){return t.flat}).length;PRICED+=done.length;EST+=done.filter(function(t){return t.est}).length;
  B[k]={all:all,done:done,open:open,other:other,uns:uns,day:w(day0),h6:w(now-21600),h24:w(now-86400),h12:h12,tot:tot,ex3:ex,perTrade:h12.n?h12.net/h12.n:(tot.n?tot.net/tot.n:null)}});
 var keys=j.order.slice().sort(function(a,b){var pa=B[a].tot.n?B[a].tot.net:null,pb=B[b].tot.n?B[b].tot.net:null;if(pa==null&&pb==null)return B[b].all.length-B[a].all.length;if(pa==null)return 1;if(pb==null)return -1;return pb-pa});
 var pol=j.policy==='scale'?'half sold at 2×, rest trailed':'pure trailing stop';
 document.getElementById('sub').textContent='spec '+j.spec+' · '+Math.round(j.stop*100)+'% stop · '+pol+' · stake '+SK+(j.ag?' · age group '+j.ag:'')+(j.pop?' · '+(j.pop==='solana-wide'?'rest of Solana (sampled)':'pump.fun (live)'):'')+' · updated '+HM(j.at)+' UK';
 document.getElementById('rank').innerHTML='<div class="rank"><b>Every book · total profit so far · '+(VIEW?'re-priced at '+SK+' a trade':'simulated fills at 0.2 SOL')+' · most profitable first</b>'+keys.map(function(k,i){var b=B[k];return '<span>'+(i+1)+'. <b>'+k+'</b> <span class="'+(b.tot.net>0?'up':b.tot.net<0?'dn':'mut')+'">'+(b.tot.n?sl(b.tot.net):'—')+'</span> <span class="mut">('+b.tot.n+')</span>'+(b.h6.n?' <span class="mut">6h</span> <span class="'+(b.h6.net>0?'up':'dn')+'">'+sl(b.h6.net)+'</span>':'')+'</span>'}).join('')+'</div><div class="mut" style="font-size:12px;margin-top:4px">ranked by total profit in SOL on closed trades, most profitable book first · inside each book the newest trade is first · the same coin and buy can sit in several books</div>';
 var sz=document.getElementById('size');
 if(VIEW){sz.style.display='';sz.innerHTML='<b style="color:var(--amb)">Stake view: '+SK+' a trade.</b> <span class="mut">Each trade is re-priced on the pool sizes saved at its own buy and sale, so the extra price impact of a bigger trade is included — the result is <b>not</b> the 0.2 SOL profit multiplied up. It uses the same buy and sell moments as the 0.2 SOL paper trade: a real '+SK+' position would hit its stop slightly earlier, and nobody can know how other traders would have reacted to a bigger buy. It is on the <b>cautious</b> side: it assumes the price falls straight back after your buy, as if you had never bought. Treat it as an estimate. The "high" column is still the 0.2 SOL multiple. <b>'+PRICED+'</b> closed book entries, the same ones at every stake'+(EST?' · <b>'+EST+'</b> are older trades whose pool size at the sale was not saved and is worked out from the sale itself (a rougher estimate)':'')+(UNS?' · <b>'+UNS+'</b> could not be re-priced (coins priced through Jupiter quotes): they keep their 0.2 SOL percentage result, with no extra price impact taken off, so they look slightly better than they would be':'')+'.</span>'}
 else sz.style.display='none';
 var fd=document.getElementById('found');
 if(FIND){var n=0,cl=0,net=0,names={};keys.forEach(function(k){B[k].all.filter(hit).forEach(function(t){n++;names[t.sym||t.mint.slice(0,8)]=1;if(t.status==='closed'&&t.ret!=null){cl++;net+=t.net}})});
  fd.style.display='';fd.innerHTML=n?'<b>Showing only '+esc(Object.keys(names).slice(0,4).join(', '))+'</b> <span class="mut">· '+n+' book entries at this stop and exit · '+cl+' closed, '+sl(net)+' in total across the books (the same buy can sit in several books) · all dates, not just the last 24 hours · the today / 6 h / 24 h / total boxes of each book still show the WHOLE book, not this coin · clear the search box to see everything</span>':'<b>No paper buy found for "'+esc(FIND)+'"</b> <span class="mut">at this stop, exit, age group and coin filter. Try age = all and coins = all. If it is still empty, the program never bought that coin.</span>'}
 else fd.style.display='none';
 var h='';keys.forEach(function(k,i){var b=B[k];if(FIND&&!b.all.some(hit))return;
  var head='<div class="bookhead"><div class="bookrow"><span class="rk">#'+(i+1)+'</span><b style="font-size:16px">'+k+'</b><span class="mode sim">PAPER</span><span class="mut small"> simulated fill · '+Math.round(j.stop*100)+'% stop · '+pol+'</span></div><span class="mut small">'+b.all.length+' signals · '+b.open.length+' open · '+b.done.length+' closed'+(b.other.length?' · '+b.other.length+' not filled / unresolved':'')+(b.uns.length?' · <span style="color:var(--amb)">'+b.uns.length+' at the 0.2 SOL % result</span>':'')+'</span></div><div class="rule">'+esc(j.rules[k]||'')+'</div>';
  var cell=function(lab,o,extra){return '<div><div class="lab">'+lab+'</div><div class="big '+(o.n?(o.net>=0?'ok':'bad'):'')+'">'+(o.n?sl(o.net):'—')+'</div><div class="small">'+o.n+' trades'+(o.n?' · '+Math.round(100*o.won/o.n)+'% won':'')+(extra||'')+'</div></div>'};
  var stats='<div class="grid4">'+cell('today (UK)',b.day)+cell('last 6 hours',b.h6)+cell('last 24 hours',b.h24)+cell('total',b.tot,b.tot.n>3?' · <span class="mut">without top 3 coins: '+sl(b.ex3.net)+'</span>':'')+'</div>';
  var open=b.open.filter(hit).length?'<div class="lab" style="margin-top:6px">open now · newest first</div><div class="tbl"><table><tr><th>coin</th><th>bought</th><th>bought at (market cap)</th><th>now</th><th>high</th><th>fill</th></tr>'+b.open.filter(hit).sort(function(x,y){return (y.fill_t||y.t)-(x.fill_t||x.t)}).map(function(t){var id=k+t.id,ch=PREV[id]!=null&&PREV[id]!==t.now_x;PREV[id]=t.now_x;return '<tr><td>'+coin(t)+' '+how(t)+'</td><td>'+DT(t.fill_t||t.t)+' <span class="mut">('+ago(t.fill_t||t.t)+' ago)</span></td><td><b>$'+t.mc.toLocaleString('en-GB')+'</b></td><td class="'+(t.now_x>=1?'up':'dn')+(ch?' chg':'')+'"><b>'+(t.now_x!=null?t.now_x.toFixed(2)+'x':'—')+'</b>'+(t.half!=null?' <span class="mut">half banked '+t.half.toFixed(2)+'x</span>':'')+'</td><td>'+(t.hi!=null?t.hi.toFixed(2)+'x':'—')+'</td><td class="mut">'+(t.buy_delay!=null?'bought '+(1+t.buy_delay).toFixed(1)+' s after signal':'')+(t.check!=null?' · pool check '+(typeof t.check==='number'?'Δ'+t.check+'%':t.check):'')+'</td></tr>'}).join('')+'</table></div>':'<div class="small mut" style="margin:6px 0 2px">nothing held right now</div>';
  var rows=b.done.filter(function(t){return FIND?hit(t):t.fill_t>=now-86400}).sort(function(x,y){return y.fill_t-x.fill_t}).slice(0,120);
  var recent=rows.length?'<div class="lab" style="margin-top:8px">'+(FIND?'this coin · all dates':'last 24 hours')+' · '+rows.length+' trades · newest first</div><div class="tbl scroll"><table><thead><tr><th>coin</th><th>bought → sold</th><th>bought at (market cap)</th><th>result</th><th>high</th><th>buy → sell</th><th>timing</th></tr></thead><tbody>'+rows.map(function(t){var x=1+t.ret;return '<tr><td>'+coin(t)+' '+how(t)+'</td><td style="white-space:nowrap">'+DT(t.fill_t)+(t.exit_t?' <span class="mut">→</span> '+HM(t.exit_t):'')+'</td><td style="white-space:nowrap"><b>$'+t.mc.toLocaleString('en-GB')+'</b></td><td style="white-space:nowrap"><span class="pill '+(t.ret>0?'win':'loss')+'">'+pc(t.ret)+'</span> <span class="mut">'+sl(t.net)+'</span></td><td class="'+((t.hi||1)>=1.5?'up':'')+'"><b>'+(t.hi!=null?t.hi.toFixed(2)+'x':'—')+'</b></td><td>1.000x <span class="mut">→</span> '+x.toFixed(3)+'x <span class="mut">'+esc(t.reason||'')+(t.half!=null?' · half at '+t.half.toFixed(2)+'x':'')+'</span></td><td class="mut">'+(t.buy_delay!=null?'buy +'+(1+t.buy_delay).toFixed(1)+' s':'')+(t.sell_delay!=null?' · sold '+(0.7+t.sell_delay).toFixed(1)+' s after trigger':'')+(t.hold_s!=null?' · held '+(t.hold_s<3600?Math.round(t.hold_s/60)+' min':(t.hold_s/3600).toFixed(1)+' h'):'')+'</td></tr>'}).join('')+'</tbody></table></div>':'<div class="small mut" style="margin-top:6px">no closed trades in the last 24 hours</div>';
  var nf=b.other.length?'<div class="small mut" style="margin-top:6px">not filled / unresolved: '+b.other.slice(-4).map(function(t){return esc(t.sym||t.mint.slice(0,6))+' ('+esc(t.status)+(t.why?': '+esc(t.why).slice(0,70):'')+')'}).join(' · ')+'</div>':'';
  h+='<div class="card">'+head+stats+open+recent+nf+'</div>'});
 document.getElementById('books').innerHTML=h;
 document.getElementById('foot').textContent='older-coins paper project · '+j.spec+' · full '+(j.rows_total||j.order.length*40)+'-row table at /table';
}
function health(s){var st=s.status,f=st.feed,d=st.decoder,p=st.poller,age=f.lastMsg?Math.round(Date.now()/1000-f.lastMsg):null;
 document.getElementById('health').innerHTML='<div class="kp"><span>pump.fun feed <b class="'+(f.connected&&age<30?'up':'dn')+'">'+(f.connected?'live':'DOWN')+'</b> <span class="mut">last trade '+(age==null?'–':age+' s')+' ago · '+f.emitted.toLocaleString('en-GB')+' trades read</span></span><span>coins watched <b>'+st.engine.coins.toLocaleString('en-GB')+'</b> <span class="mut">live</span>'+(p?' + <b>'+p.watched+'</b> <span class="mut">rest of Solana, checked every ~'+(p.cadence_avg_s||'–')+' s</span>':'')+'</span><span>buys so far <b>'+st.engine.entries+'</b></span><span>pool reading <b class="'+(st.tx_validation?'up':'')+'" style="'+(st.tx_validation?'':'color:var(--amb)')+'">'+(st.tx_validation?'validated':'being validated')+'</b> <span class="mut">'+d.fitNeither+' unreadable of '+(d.buy+d.sell).toLocaleString('en-GB')+'</span></span><span>memory <b>'+st.mem_mb+' MB</b></span><span>disk <b>'+s.disk.db_mb+' MB</b> <span class="mut">'+s.disk.free_gb+' GB free</span></span></div>'}
function seg(id){document.querySelectorAll('#'+id+' button').forEach(function(b){b.classList.toggle('on',b.dataset.v===SEL[id]);b.onclick=function(){SEL[id]=b.dataset.v;try{localStorage.setItem('olderSel',JSON.stringify(SEL))}catch(e){}seg(id);load()}})}
['stop','stake','policy','ag','pop'].forEach(seg);
var qi=document.getElementById('q');qi.addEventListener('input',function(){FIND=qi.value.trim();if(LAST)draw(LAST)});
function load(){var q=new URLSearchParams(SEL);if(key)q.set('k',key);fetch('/api/books?'+q).then(function(r){return r.json()}).then(function(j){LAST=j;draw(j)}).catch(function(e){document.getElementById('sub').textContent='error: '+e});
 var q2=new URLSearchParams();if(key)q2.set('k',key);fetch('/api/state?'+q2).then(function(r){return r.json()}).then(health).catch(function(){})}
var NEXT=10;load();setInterval(function(){load();NEXT=10},10000);setInterval(function(){NEXT=Math.max(0,NEXT-1);var e=document.getElementById('tick');if(e)e.textContent='refreshes in '+NEXT+' s'},1000);
</script></body></html>`;
