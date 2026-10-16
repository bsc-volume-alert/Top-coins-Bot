// v0.18.23: live dashboard. A tiny HTTP server inside the tracker (no extra process) serving one page and one JSON endpoint.
// Read-only; protected by WEB_KEY (.env). Disabled when WEB_KEY is unset. http://<droplet-ip>:<WEB_PORT>/?key=<WEB_KEY>
import { createServer } from "node:http";
import { CFG } from "./config.js";
import { db } from "./db.js";
import { openPositions } from "./momentum.js";
import { solUsdCached } from "./price.js";
import { memMb } from "./commands.js";

const KEY = () => process.env.WEB_KEY || "", PORT = () => Number(process.env.WEB_PORT || 8787);
// Project 2's exit (flow4) exists from v0.18.10 (15 Oct 12:52 UTC); Project 3's (split) from v0.18.22 (16 Oct 16:00 UTC). Earlier rows
// were filled by the sweeper, not scored live, so each project's book starts when its exit started recording.
const P2_FROM = Date.UTC(2026, 9, 15, 12, 52) / 1000, P3_FROM = Date.UTC(2026, 9, 16, 16, 0) / 1000;
const qCore = db.prepare(`SELECT id, name, mint, entry_ts, entry_mc, entry_price, peak_mult, after_peak_mult, closed, exit_reason, core_v40, x_t15s40, x_flow4, x_split, split_branch, x_flow4ff, vol1m_usd, age_s, venue
  FROM paper_trades WHERE strategy='momentum' AND core=1 AND COALESCE(invalid,0)=0 AND entry_ts>=? ORDER BY entry_ts`);
const qRecent = db.prepare(`SELECT id, name, mint, entry_ts, entry_mc, peak_mult, after_peak_mult, closed, exit_reason, core_v40, x_t15s40, x_flow4, x_split, split_branch FROM paper_trades WHERE strategy='momentum' AND core=1 AND COALESCE(invalid,0)=0 ORDER BY entry_ts DESC LIMIT 25`);

function book(rows, col, from, size, cost) {
  const t = rows.filter((r) => r.entry_ts >= from && r[col] != null);
  const x = t.map((r) => r[col]);
  const w = x.filter((v) => v > 1).length;
  let cum = 0; const curve = t.map((r) => { cum += size * (r[col] * (1 - cost) - 1); return [r.entry_ts, +cum.toFixed(3)]; });
  const day = Math.floor(Date.now() / 1000) - 86400, t24 = t.filter((r) => r.entry_ts >= day), x24 = t24.map((r) => r[col]);
  const sum = (a) => a.reduce((p, c) => p + c, 0);
  return {
    n: t.length, win: t.length ? w / t.length : null, avg: t.length ? sum(x) / t.length - 1 : null,
    net: +sum(x.map((v) => size * (v * (1 - cost) - 1))).toFixed(3), gross: +sum(x.map((v) => size * (v - 1))).toFixed(3),
    n24: t24.length, net24: +sum(x24.map((v) => size * (v * (1 - cost) - 1))).toFixed(3), win24: t24.length ? x24.filter((v) => v > 1).length / t24.length : null,
    big: x.filter((v) => v >= 2).length, cap: x.filter((v) => v >= 4).length, curve, open: rows.filter((r) => r.entry_ts >= from && !r.closed).length,
    wins: w, losses: t.length - w, best: t.length ? +Math.max(...x.map((v) => size * (v * (1 - cost) - 1))).toFixed(3) : 0, worst: t.length ? +Math.min(...x.map((v) => size * (v * (1 - cost) - 1))).toFixed(3) : 0,
  };
}
export function snapshot(size = 0.25, cost = 0.05) {
  const rows = qCore.all(P2_FROM - 86400 * 2);
  const projects = {
    p1: { name: "Project 1", rule: "sell at 1.5x · −40% hard stop", ...book(rows, "x_t15s40", P2_FROM, size, cost) },
    p2: { name: "Project 2", rule: "runner: hold while 5m vol ≥ $100K · cap 4x · −40% stop before 1.5x", ...book(rows, "x_flow4", P2_FROM, size, cost) },
    p3: { name: "Project 3", rule: "at 2 min: <0.90× sell · ≥1.20× hold (40% trail, cap 4x) · else half at 1.5x, rest rides", ...book(rows, "x_split", P3_FROM, size, cost) },
  };
  const v40 = rows.filter((r) => r.entry_ts >= P3_FROM && r.core_v40 === 1);
  projects.p3.filtered = { n: v40.filter((r) => r.x_split != null).length, net: +v40.filter((r) => r.x_split != null).reduce((a, r) => a + size * (r.x_split * (1 - cost) - 1), 0).toFixed(3), note: "Project 3 with its entry filter (1m vol ≥ $40K, age < 10 min)" };
  const open = openPositions().map((p) => {
    const r = rows.find((z) => z.id === p.id);
    return { ...p, core: !!r, coreV40: r?.core_v40 === 1, p1: p.x.t15s40 != null ? (p.x.t15s40 >= 1.5 ? "took 1.5x" : `stopped ${p.x.t15s40.toFixed(2)}x`) : p.mult <= 0.6 ? "stopping" : "running",
      p2: p.x.flow4 != null ? `exited ${p.x.flow4.toFixed(2)}x` : p.flowArmed ? "armed (holding)" : "running", p3: p.x.split != null ? `exited ${p.x.split.toFixed(2)}x (${p.splitBranch})` : p.splitBranch ? `${p.splitBranch}${p.splitHalf ? " · half taken" : ""}` : p.ageS < 120 ? `deciding in ${120 - p.ageS}s` : "running" };
  });
  const recent = qRecent.all().map((r) => ({ ...r, peak: Math.max(r.peak_mult || 1, r.after_peak_mult || 1) }));
  return { now: Math.floor(Date.now() / 1000), sol: solUsdCached(), size, cost, mem: memMb(), projects, open, recent,
    params: { trigger: `$${(CFG.VOL5M_USD / 1e3).toFixed(0)}K traded in 5 min`, entryCap: `MC under $${(CFG.MOM_CORE_MC / 1e3).toFixed(0)}K at entry`, first: "first entry on the coin only", minAge: `coin ≥ ${CFG.MOM_MIN_AGE_S}s old`, v40: `P3 filter: 1m vol ≥ $${(CFG.MOM_V40_USD / 1e3).toFixed(0)}K and age < ${CFG.MOM_V40_AGE_S / 60} min`, hold: `max hold ${CFG.MOM_MAX_HOLD_MIN / 60}h`, flow: `P2 hold: 5m vol ≥ $${(CFG.FLOW_MIN_VOL / 1e3).toFixed(0)}K · cap ${CFG.FLOW_CAP}x · 50% trail backstop`, split: "P3: decide at 120s · fail <0.90× · run ≥1.20× · trail 40% · cap 4x · half at 1.5x", costs: `${(cost * 100).toFixed(0)}% round trip assumed · ${size} SOL per trade` } };
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ismael — live</title>
<style>
:root{--bg:#0f1115;--card:#171a21;--line:#262b36;--tx:#e7e9ee;--mut:#8b93a7;--up:#3ddc84;--dn:#ff5c5c;--acc:#7aa2ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.45 -apple-system,Segoe UI,Roboto,sans-serif}
header{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;position:sticky;top:0;background:var(--bg);z-index:2}
h1{font-size:16px;margin:0}.mut{color:var(--mut)}.up{color:var(--up)}.dn{color:var(--dn)}
main{padding:12px 16px;max-width:1280px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px}
.card h2{margin:0 0 2px;font-size:15px}.rule{font-size:12px;color:var(--mut);min-height:32px}
.big{font-size:32px;font-weight:700;margin:6px 0 0}.kv{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:13px;margin-top:10px}.kv b{font-weight:600}
svg.chart{width:100%;height:150px;margin-top:10px;display:block}
.wl{display:flex;height:10px;border-radius:5px;overflow:hidden;margin-top:10px;background:#232a3a}.wl i{display:block;height:100%}.wl .w{background:var(--up)}.wl .l{background:var(--dn)}
.wlt{display:flex;justify-content:space-between;font-size:12px;margin-top:4px}
h3{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);margin:22px 0 8px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);white-space:nowrap}th{color:var(--mut);font-weight:500}
tr.win td:first-child{box-shadow:inset 3px 0 0 var(--up)}tr.loss td:first-child{box-shadow:inset 3px 0 0 var(--dn)}
.tbl{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:12px}
.tag{display:inline-block;padding:1px 6px;border-radius:6px;background:#232a3a;color:var(--acc);font-size:11px;margin-left:4px}
.params{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:6px 16px;font-size:13px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}.seg button{background:transparent;color:var(--mut);border:0;padding:6px 10px;font-size:13px;cursor:pointer}.seg button.on{background:#232a3a;color:var(--tx)}
footer{padding:16px;color:var(--mut);font-size:12px;text-align:center}
</style></head><body>
<header><div><h1>Ismael — live paper trading</h1><div class="mut" id="sub">loading…</div></div>
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="mut">per trade</span><span class="seg" id="size"><button data-v="0.1">0.1</button><button data-v="0.25" class="on">0.25</button><button data-v="0.5">0.5</button><button data-v="1">1 SOL</button></span><span class="mut">costs</span><span class="seg" id="cost"><button data-v="0">0%</button><button data-v="0.05" class="on">5%</button><button data-v="0.1">10%</button></span></div></header>
<main>
<div class="grid" id="projects"></div>
<h3>Live positions</h3><div class="tbl"><table id="open"><thead><tr><th>coin</th><th>entered</th><th>age</th><th>entry MC</th><th>now</th><th>peak</th><th>5m vol</th><th>P1</th><th>P2</th><th>P3</th></tr></thead><tbody></tbody></table></div>
<h3>Last 25 core trades <span class="mut" style="text-transform:none;letter-spacing:0">— P&L per project at the selected size; row colour = Project 3 (or Project 2 before it existed)</span></h3><div class="tbl"><table id="recent"><thead><tr><th>coin</th><th>entered (UTC)</th><th>entry MC</th><th>peak</th><th>P1</th><th>P2</th><th>P3</th><th>P3 branch</th><th>P3 filter</th><th>state</th></tr></thead><tbody></tbody></table></div>
<h3>Parameters</h3><div class="card params" id="params"></div>
</main><footer id="foot"></footer>
<script>
const key=new URLSearchParams(location.search).get('key')||'';let SIZE=0.25,COST=0.05;
const $=s=>document.querySelector(s);const fmt=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':String(Math.round(n));
const pc=v=>v==null?'—':((v-1)*100).toFixed(0)+'%';const sol=v=>(v>=0?'+':'')+v.toFixed(2)+' SOL';const cls=v=>v>0?'up':v<0?'dn':'';
const pl=v=>v==null?'—':'<span class="'+cls(v*(1-COST)-1)+'">'+((v*(1-COST)-1)*SIZE>=0?'+':'')+((v*(1-COST)-1)*SIZE).toFixed(2)+'</span> <span class="mut">'+pc(v)+'</span>';
const ago=s=>s<60?s+'s':s<3600?Math.floor(s/60)+'m':(s/3600).toFixed(1)+'h';const hhmm=t=>{const d=new Date(t*1000);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')};
function chart(c){const W=360,H=150,L=38,R=6,T=8,B=20;if(!c||c.length<2)return '<svg class="chart" viewBox="0 0 '+W+' '+H+'"><text x="'+(W/2)+'" y="'+(H/2)+'" fill="#8b93a7" font-size="12" text-anchor="middle">no closed trades yet</text></svg>';
const xs=c.map(p=>p[0]),ys=c.map(p=>p[1]);const x0=xs[0],x1=xs[xs.length-1],mn=Math.min(0,...ys),mx=Math.max(0,...ys);const X=t=>L+(t-x0)/((x1-x0)||1)*(W-L-R),Y=v=>T+(1-(v-mn)/((mx-mn)||1))*(H-T-B);
const d=c.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');const z=Y(0);const last=ys[ys.length-1];const col=last>=0?'#3ddc84':'#ff5c5c';
const area='M'+X(x0).toFixed(1)+' '+z.toFixed(1)+' '+c.map(p=>'L'+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ')+' L'+X(x1).toFixed(1)+' '+z.toFixed(1)+' Z';
const ticks=[mn,0,mx].filter((v,i,a)=>a.indexOf(v)===i);const tx=[x0,x0+(x1-x0)/2,x1];
return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><defs><linearGradient id="g'+(last>=0?'u':'d')+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".35"/><stop offset="1" stop-color="'+col+'" stop-opacity=".02"/></linearGradient></defs>'+
ticks.map(v=>'<line x1="'+L+'" y1="'+Y(v).toFixed(1)+'" x2="'+(W-R)+'" y2="'+Y(v).toFixed(1)+'" stroke="#262b36" stroke-dasharray="'+(v===0?'0':'3 3')+'"/><text x="'+(L-4)+'" y="'+(Y(v)+4).toFixed(1)+'" fill="#8b93a7" font-size="10" text-anchor="end">'+(v>0?'+':'')+v.toFixed(1)+'</text>').join('')+
'<path d="'+area+'" fill="url(#g'+(last>=0?'u':'d')+')"/><path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke"/>'+
'<circle cx="'+X(x1).toFixed(1)+'" cy="'+Y(last).toFixed(1)+'" r="3" fill="'+col+'"/>'+
tx.map((t,i)=>'<text x="'+X(t).toFixed(1)+'" y="'+(H-6)+'" fill="#8b93a7" font-size="10" text-anchor="'+(i===0?'start':i===2?'end':'middle')+'">'+new Date(t*1000).toLocaleDateString(undefined,{weekday:'short'})+' '+hhmm(t)+'</text>').join('')+'</svg>'}
function wl(p){const n=p.wins+p.losses;if(!n)return '';return '<div class="wl"><i class="w" style="width:'+(p.wins/n*100)+'%"></i><i class="l" style="width:'+(p.losses/n*100)+'%"></i></div><div class="wlt"><span class="up">'+p.wins+' profitable</span><span class="dn">'+p.losses+' losses</span></div>'}
async function load(){const r=await fetch('/api/snapshot?key='+encodeURIComponent(key)+'&size='+SIZE+'&cost='+COST);if(!r.ok){$('#sub').textContent='access denied — check the key in the link';return}const d=await r.json();
$('#sub').textContent='updated '+new Date(d.now*1000).toLocaleTimeString()+' · SOL $'+d.sol.toFixed(0)+' · mem '+d.mem+' MB';
$('#projects').innerHTML=['p1','p2','p3'].map(k=>{const p=d.projects[k];const f=p.filtered?'<div class="kv" style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><span class="mut">with entry filter</span><b class="'+cls(p.filtered.net)+'">'+(p.filtered.n?sol(p.filtered.net)+' <span class="mut">('+p.filtered.n+')</span>':'—')+'</b></div>':'';
return '<div class="card"><h2>'+p.name+'</h2><div class="rule">'+p.rule+'</div><div class="big '+cls(p.net)+'">'+(p.n?sol(p.net):'—')+'</div><div class="mut">net after costs · '+p.n+' trades'+(p.open?' · '+p.open+' open now':'')+'</div>'+chart(p.curve)+wl(p)+
'<div class="kv"><span class="mut">win rate</span><b>'+(p.win==null?'—':(p.win*100).toFixed(0)+'%')+'</b><span class="mut">avg per trade</span><b>'+pc(p.avg==null?null:p.avg+1)+'</b><span class="mut">last 24h</span><b class="'+cls(p.net24)+'">'+(p.n24?sol(p.net24)+' <span class="mut">('+p.n24+')</span>':'—')+'</b><span class="mut">reached 2x / 4x</span><b>'+p.big+' / '+p.cap+'</b><span class="mut">best / worst trade</span><b><span class="up">'+(p.best>=0?'+':'')+p.best.toFixed(2)+'</span> / <span class="dn">'+p.worst.toFixed(2)+'</span></b></div>'+f+'</div>'}).join('');
$('#open tbody').innerHTML=d.open.length?d.open.map(p=>'<tr class="'+(p.mult>1?'win':p.mult<1?'loss':'')+'"><td>'+p.name+(p.core?'':'<span class="tag">non-core</span>')+(p.coreV40?'<span class="tag">P3 filter</span>':'')+'</td><td>'+hhmm(p.entryTs)+'</td><td>'+ago(p.ageS)+'</td><td>$'+fmt(p.entryMc)+'</td><td class="'+cls(p.mult-1)+'"><b>'+p.mult.toFixed(2)+'x</b> <span class="mut">$'+fmt(p.lastMc)+'</span></td><td>'+p.peakMult.toFixed(2)+'x</td><td>$'+fmt(p.v5)+'</td><td>'+p.p1+'</td><td>'+p.p2+'</td><td>'+p.p3+'</td></tr>').join(''):'<tr><td colspan="10" class="mut">no open positions</td></tr>';
$('#recent tbody').innerHTML=d.recent.map(r=>{const ref=r.x_split??r.x_flow4;const rc=ref==null?'':ref>1?'win':'loss';return '<tr class="'+rc+'"><td>'+r.name+'</td><td>'+new Date(r.entry_ts*1000).toISOString().slice(5,16).replace('T',' ')+'</td><td>$'+fmt(r.entry_mc||0)+'</td><td>'+r.peak.toFixed(2)+'x</td><td>'+pl(r.x_t15s40)+'</td><td>'+pl(r.x_flow4)+'</td><td>'+pl(r.x_split)+'</td><td>'+(r.split_branch||'—')+'</td><td>'+(r.core_v40?'yes':'no')+'</td><td class="mut">'+(r.closed?(r.exit_reason||'closed'):'open')+'</td></tr>'}).join('');
$('#params').innerHTML=Object.values(d.params).map(v=>'<div>'+v+'</div>').join('');
$('#foot').textContent='Books start when each exit began recording live: P1/P2 from 15 Oct 12:52 UTC, P3 from 16 Oct 16:00 UTC. Paper trades, no real money. Chart: cumulative net SOL over time at the selected size. Refreshes every 10 s.';}
for(const id of ['size','cost'])$('#'+id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$('#'+id).children].forEach(x=>x.classList.remove('on'));b.classList.add('on');if(id==='size')SIZE=Number(b.dataset.v);else COST=Number(b.dataset.v);load()});
load();setInterval(load,10000);
</script></body></html>`;

export function startWeb() {
  if (!KEY()) { console.log("[web] WEB_KEY not set — dashboard disabled"); return; }
  const srv = createServer((req, res) => {
    try {
      const u = new URL(req.url, "http://x");
      if (u.searchParams.get("key") !== KEY()) { res.writeHead(403, { "content-type": "text/plain" }); return res.end("forbidden"); }
      if (u.pathname === "/api/snapshot") { const size = Math.min(5, Math.max(0.01, Number(u.searchParams.get("size")) || 0.25)), cost = Math.min(0.5, Math.max(0, Number(u.searchParams.get("cost") ?? 0.05))); res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(snapshot(size, cost))); }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }); res.end(PAGE);
    } catch (e) { res.writeHead(500, { "content-type": "text/plain" }); res.end("error: " + e.message); console.error("[web]", e.message); }
  });
  srv.on("error", (e) => console.error("[web] server error", e.message));
  srv.listen(PORT(), "0.0.0.0", () => console.log(`[web] dashboard on :${PORT()}`));
}
