// scope 0.9.0: the Launcher page — every post from the watched X accounts and the coin made from it, read-only from the launcher's database
// (/root/launcher/launcher.db). The two buttons (Relaunch, Sell) don't touch the chain from here: they drop a small request file into
// /root/launcher/requests/, which the launcher app picks up within 2 s. Same key as the rest of the site.
import Database from "better-sqlite3";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const LDB = process.env.LAUNCH_DB || "/root/launcher/launcher.db", REQ = process.env.LAUNCH_REQ_DIR || "/root/launcher/requests", STATUS = (process.env.LAUNCH_OUT || "/root/tracker/data/launcher_out") + "/status.json";
let ldb = null;
const open = () => { if (!ldb) { ldb = new Database(LDB, { readonly: true, fileMustExist: true }); ldb.pragma("busy_timeout = 2000"); } return ldb; };

export function launcherApi(days = 3) {
  let status = null; try { status = JSON.parse(readFileSync(STATUS, "utf8")); } catch {}
  let rows = [], posts = 0;
  try {
    const d = open(), since = Math.floor(Date.now() / 1000) - days * 86400;
    rows = d.prepare(`SELECT l.*, p.text AS post_text, p.parent_user, p.parent_text FROM launches l LEFT JOIN posts p ON p.id=l.post_id WHERE l.created_ts>=? ORDER BY l.id DESC LIMIT 500`).all(since);
    // 0.9.2: the copy-coin paper test (launcher 0.2.0) — other coins with the same name, and the two paper picks
    try { const cp = d.prepare("SELECT launch_id, COUNT(*) n, MIN(CASE WHEN created_ts>0 THEN created_ts END) first_ts, MAX(COALESCE(volume,0)) best_vol FROM copies WHERE ours=0 GROUP BY launch_id").all(), byL = new Map(cp.map((c) => [c.launch_id, c]));
      const pk = d.prepare("SELECT * FROM copy_picks").all(), jobs = new Set(d.prepare("SELECT DISTINCT launch_id FROM copy_jobs").all().map((x) => x.launch_id));
      for (const r of rows) { const c = byL.get(r.id); r.copies = c ? { n: c.n, firstS: c.first_ts ? c.first_ts - Math.floor((r.t_post_ms || 0) / 1000) : null, bestVol: c.best_vol } : jobs.has(r.id) ? { n: 0 } : null;
        r.pick_first = pk.find((p) => p.launch_id === r.id && p.kind === "first") || null; r.pick_strongest = pk.find((p) => p.launch_id === r.id && p.kind === "strongest") || null; } } catch {}
    posts = d.prepare("SELECT COUNT(*) n FROM posts WHERE recv_ms>=?").get(since * 1000).n;
  } catch (e) { return { ok: true, status, rows: [], posts: 0, note: "launcher database not there yet: " + e.message }; }
  return { ok: true, status, rows, posts, at: Math.floor(Date.now() / 1000) };
}
/** Relaunch / Sell button → a request file for the launcher. */
export function launcherAct(action, id) {
  const global = ["pause", "resume", "sellall"].includes(action); // 0.9.1: whole-launcher buttons carry no coin id
  if (!global && (!["relaunch", "sell"].includes(action) || !Number.isInteger(id) || id <= 0)) return { ok: false, error: "bad request" };
  if (global) id = 0;
  mkdirSync(REQ, { recursive: true }); writeFileSync(`${REQ}/${Date.now()}-${id}-${action}.json`, JSON.stringify({ action, id, at: Math.floor(Date.now() / 1000) }));
  return { ok: true, queued: action, id };
}

export const LAUNCHER_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Launcher</title>
<style>
:root{--bg:#0d1117;--card:#161b22;--line:#30363d;--txt:#e6edf3;--mut:#8b949e;--grn:#3fb950;--red:#f85149;--amb:#e3b341;--blu:#58a6ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.45 -apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:1500px;margin:0 auto;padding:16px}h1{font-size:20px;margin:0 0 4px}.sub{color:var(--mut);font-size:12.5px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin:12px 0}
.kpis{display:flex;gap:10px;flex-wrap:wrap}.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;min-width:150px}.kpi b{display:block;font-size:18px}
table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap;vertical-align:top}th{color:var(--mut);font-weight:500;position:sticky;top:0;background:var(--card)}
td.l,th.l{text-align:left}td.txt{white-space:normal;min-width:260px;max-width:420px;text-align:left}.tw{overflow:auto;max-height:78vh}.pos{color:var(--grn)}.neg{color:var(--red)}.amb{color:var(--amb)}
a{color:var(--blu);text-decoration:none}button{background:#21262d;color:var(--txt);border:1px solid var(--line);border-radius:6px;padding:3px 8px;cursor:pointer;font-size:12px}button.go{border-color:#1f6feb}
.tag{display:inline-block;border-radius:4px;padding:0 5px;font-size:11px;background:#21262d;color:var(--mut)}.live{background:#5f2f2f;color:#ffb4b4}.shadow{background:#1f3a5f;color:#9cc6ff}.paper{background:#2d2d2d;color:#bbb}
</style></head><body><div class="wrap"><h1>Launcher <a class="sub" id="back" href="/">← Radar</a></h1><div class="sub" id="hd">loading…</div>
<div id="ctl" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:12px 0"></div>
<div class="kpis" id="k"></div><div class="card sub" id="st"></div>
<div class="card tw"><table><thead><tr><th class="l">UK time</th><th class="l">Post</th><th class="l">Coin</th><th>Same name 7d</th><th class="l">Mode / status</th><th>Tweet→sent</th><th>Cost</th><th>Peak</th><th>Now</th><th>Sold for</th><th>P&amp;L</th><th class="l">Copies (other coins, same name)</th><th class="l">Paper: first copy</th><th class="l">Paper: strongest copy</th><th class="l"></th></tr></thead><tbody id="tb"></tbody></table></div>
<div class="sub">Cost = what the launch transaction took from the wallet (our buy + deployment + fees). Peak / Now = what our tokens would sell for ÷ the stake. Copies = other pump.fun coins with the same name or ticker made from 1 min before the post to 30 min after (GMGN). Paper = what buying that copy 3 min after the post would have done (nothing is bought): first copy made, and the copy with the most early buying. Buttons work only with the key in this link.</div>
</div><script>
var key=new URLSearchParams(location.search).get('key')||'';document.getElementById('back').href='/?key='+encodeURIComponent(key);
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function uk(ts){return ts?new Date(ts*1000).toLocaleString('en-GB',{timeZone:'Europe/London',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'–'}
function s4(v){return v==null?'–':(v>0?'+':'')+v.toFixed(4)}function xx(v){return v==null?'–':v.toFixed(2)+'x'}function usd(v){return v==null?'–':v>=1e6?'$'+(v/1e6).toFixed(2)+'M':v>=1e3?'$'+(v/1e3).toFixed(1)+'K':'$'+Math.round(v)}
function uki(iso){return iso?uk(Math.floor(Date.parse(iso)/1000)):'–'}function copiesCell(r){var c=r.copies;if(c==null)return '<span class="sub">–</span>';if(!c.n)return '<span class="sub">none yet</span>';return c.n+' coin'+(c.n>1?'s':'')+(c.firstS!=null?'<br><span class="sub">first '+(c.firstS<0?c.firstS+'s (before us)':'+'+c.firstS+'s')+'</span>':'')+(c.bestVol?'<br><span class="sub">top vol $'+Math.round(c.bestVol).toLocaleString('en-GB')+'</span>':'')}
function pickCell(p){if(!p)return '<span class="sub">–</span>';var h='<a target="_blank" href="https://dexscreener.com/solana/'+esc(p.mint)+'">'+esc((p.name||p.mint.slice(0,6)).slice(0,18))+'</a>';if(!p.done)return h+'<br><span class="sub">scored 65 min after</span>';if(p.err)return h+'<br><span class="sub">'+esc(p.err)+'</span>';return h+'<br>15m '+xx(p.x15)+' · 60m '+xx(p.x60)+'<br><span class="sub">peak '+xx(p.peak60)+' · 2x/−50% '+xx(p.x_tp2sl50)+'</span>'}
function secs(ms){return ms==null?'–':(ms/1000).toFixed(1)+'s'}
function act(a,id,label){if(!confirm(label))return;fetch('/api/launcher/act?key='+encodeURIComponent(key)+'&action='+a+'&id='+id,{method:'POST'}).then(function(r){return r.json()}).then(function(j){alert(j.ok?'Sent to the launcher — it acts within a few seconds.':'Not sent: '+j.error);setTimeout(load,4000)})}
function load(){fetch('/api/launcher?key='+encodeURIComponent(key)).then(function(r){return r.json()}).then(draw).catch(function(e){document.getElementById('hd').textContent='error: '+e})}
function draw(D){var S=D.status||{},R=D.rows||[],T=S.twitter||{},st=S.selfTest||{};
 document.getElementById('ctl').innerHTML=(S.paused?'<span style="background:#5f2f2f;color:#ffb4b4;padding:6px 12px;border-radius:6px;font-weight:600">⏸ PAUSED — no new launches</span> <button class="go" style="padding:8px 16px;font-size:14px" onclick="act(\\'resume\\',0,\\'Resume launching?\\')">▶ Resume launches</button>':'<button style="padding:8px 16px;font-size:14px;background:#5f2f2f;border-color:#f85149;color:#fff" onclick="act(\\'pause\\',0,\\'Pause ALL new launches now? Coins already bought keep their sell rules.\\')">⏸ Pause everything</button>')+' <button style="padding:8px 16px;font-size:14px;background:#3d2a00;border-color:#e3b341;color:#fff" onclick="act(\\'sellall\\',0,\\'Sell ALL coins we hold right now ('+(S.openCoins||0)+' open)?\\')">Sell all ('+(S.openCoins||0)+' open)</button>'+(S.lastSellAll?' <span class="sub">last sell-all: '+esc(S.lastSellAll)+'</span>':'');
 document.getElementById('hd').innerHTML='Mode <span class="tag '+esc(S.mode)+'">'+esc(S.mode||'?')+'</span> · v'+esc(S.ver||'?')+' · stake '+(S.stakeSol||'?')+' SOL · cap '+(S.liveToday||0)+'/'+(S.cap||'?')+' live today · sell back if nobody else buys in '+(S.deadMin||'?')+' min, or after '+(S.quietMin||'?')+' min with no trades'+(S.tpX?' · take-profit '+S.tpX+'x':'')+' · updated '+uk(S.at);
 var live=R.filter(function(r){return r.mode==='live'&&r.cost_sol!=null}),spent=live.reduce(function(a,r){return a+r.cost_sol},0),back=live.reduce(function(a,r){return a+(r.sell_sol||0)},0),open=live.filter(function(r){return r.status==='open'||r.status==='selling'}).length;
 document.getElementById('k').innerHTML=[['Posts seen ('+3+' days)',D.posts],['Coins named',R.length],['Live launches',live.length],['Open now',open],['SOL spent',s4(spent)],['SOL back',s4(back)],['Net (sold ones)',s4(live.filter(function(r){return r.pnl_sol!=null}).reduce(function(a,r){return a+r.pnl_sol},0))],['Wallet',S.balanceSol==null?'–':S.balanceSol+' SOL']].map(function(k){return '<div class="kpi"><span class="sub">'+k[0]+'</span><b>'+k[1]+'</b></div>'}).join('');
 var cl=st.classic||{},v3=st.v3||{};
 document.getElementById('st').innerHTML='Launch wallet (public address — send SOL here to fund it): <b>'+esc(S.wallet||'–')+'</b> · profits above 1 SOL go only to '+esc(S.phantom||'')+'<br>X stream: '+(T.keySet?(T.connected?'<span class="pos">connected</span> since '+esc(T.since):'<span class="neg">not connected</span> '+esc(T.lastClose||T.lastErr||'')):'<span class="neg">no TWITTERAPI_KEY in the .env</span>')+' · posts '+(T.tweets||0)+' · last event '+uki(T.lastEventAt)+' · lookups '+(T.lookups||0)+(T.lookupErr?' (<span class="amb">'+T.lookupErr+' failed: '+esc(T.lastLookupErr)+'</span>)':'')+' · AI naming '+(S.ai?'on':'off (rules)')+
 '<br>Self-test '+uki(st.at)+': create+buy simulation — classic '+(cl.ok?'<span class="pos">ok</span>':'<span class="neg">'+esc(cl.err||'–')+'</span>')+', v3 '+(v3.ok?'<span class="pos">ok</span>':'<span class="neg">'+esc(v3.err||'–')+'</span>')+' · '+esc(st.payer||'')+(st.pctSupply?' · '+(S.stakeSol)+' SOL buys '+st.pctSupply+'% of supply':'')+' · metadata upload '+(st.upload?(st.upload.ok?'<span class="pos">ok</span> '+st.upload.ms+' ms':'<span class="neg">'+esc(st.upload.err)+'</span>'):'–')+(st.error?' · <span class="neg">'+esc(st.error)+'</span>':'')+(S.lastSweep?'<br>Last sweep: '+esc(S.lastSweep):'')+(S.lastFeeCollect?' · last creator-fee collect: '+esc(S.lastFeeCollect):'')+(D.note?'<br>'+esc(D.note):'');
 document.getElementById('tb').innerHTML=R.map(function(r){var url=r.user&&r.post_id?'https://x.com/'+r.user+'/status/'+r.post_id:'';
  var post='<a target="_blank" href="'+url+'">@'+esc(r.user)+'</a> <span class="tag">'+esc(r.kind||'')+'</span> '+esc((r.post_text||'').slice(0,180))+(r.parent_text?'<br><span class="sub">↳ @'+esc(r.parent_user||'?')+': '+esc(r.parent_text.slice(0,160))+'</span>':'');
  var coin=(r.image_url?'<a target="_blank" href="'+esc(r.image_url)+'"><img src="'+esc(r.image_url)+'" style="width:56px;height:56px;object-fit:cover;border-radius:6px;float:left;margin-right:8px" alt=""></a>':'')+(r.name?'<b>'+esc(r.name)+'</b> $'+esc(r.ticker)+' <span class="sub">'+esc(r.name_by||'')+(r.ai_name&&r.rule_name&&r.ai_name!==r.rule_name?' (rules: '+esc(r.rule_name)+')':'')+'</span>'+(r.mint&&r.mode==='live'&&r.status!=='failed'?'<br><a target="_blank" href="https://pump.fun/coin/'+r.mint+'">pump.fun</a> · <a target="_blank" href="https://dexscreener.com/solana/'+r.mint+'">DexScreener</a> · <a target="_blank" href="https://gmgn.ai/sol/token/'+r.mint+'">gmgn</a>':''):'–');
  var stt='<span class="tag '+esc(r.mode)+'">'+esc(r.mode)+'</span> '+esc(r.status)+(r.reason?'<br><span class="sub">'+esc(r.reason.slice(0,120))+'</span>':'')+(r.sim_err?'<br><span class="neg sub">'+esc(r.sim_err.slice(0,140))+'</span>':'')+(r.sell_reason?'<br><span class="sub">sold: '+esc(r.sell_reason)+'</span>':'');
  var btn=(r.name?'<button class="go" onclick="act(\\'relaunch\\','+r.id+',\\'Relaunch '+esc(r.name).replace(/'/g,'')+' for '+(D.status&&D.status.stakeSol||'?')+' SOL?\\')">Relaunch</button> ':'')+(r.mode==='live'&&(r.status==='open'||r.status==='stuck')?'<button onclick="act(\\'sell\\','+r.id+',\\'Sell all of '+esc(r.ticker)+' now?\\')">Sell</button>':'');
  return '<tr><td class="l">'+uk(r.created_ts)+'</td><td class="txt">'+post+'</td><td class="l">'+coin+'</td><td>'+(r.same_name_7d==null?'–':r.same_name_7d+(r.same_ticker_7d?' <span class="sub">/ '+r.same_ticker_7d+' tkr</span>':''))+'</td><td class="l">'+stt+'</td><td>'+secs(r.t_sent_ms&&r.t_post_ms?r.t_sent_ms-r.t_post_ms:null)+'</td><td>'+s4(r.cost_sol)+'</td><td>'+xx(r.peak_x)+'</td><td>'+xx(r.last_x)+'</td><td>'+s4(r.sell_sol)+'</td><td class="'+(r.pnl_sol>0?'pos':r.pnl_sol<0?'neg':'')+'">'+s4(r.pnl_sol)+'</td><td class="l">'+copiesCell(r)+'</td><td class="l">'+pickCell(r.pick_first)+'</td><td class="l">'+pickCell(r.pick_strongest)+'</td><td class="l">'+btn+'</td></tr>'}).join('')||'<tr><td class="l" colspan="15">No posts yet.</td></tr>'}
load();setInterval(load,15000);
</script></body></html>`;
