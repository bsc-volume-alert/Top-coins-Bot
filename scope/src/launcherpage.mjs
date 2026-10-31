// scope 0.9.0: the Launcher page — every post from the watched X accounts and the coin made from it, read-only from the launcher's database
// (/root/launcher/launcher.db). The two buttons (Relaunch, Sell) don't touch the chain from here: they drop a small request file into
// /root/launcher/requests/, which the launcher app picks up within 2 s. Same key as the rest of the site.
import Database from "better-sqlite3";
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";

const LDB = process.env.LAUNCH_DB || "/root/launcher/launcher.db", REQ = process.env.LAUNCH_REQ_DIR || "/root/launcher/requests", STATUS = (process.env.LAUNCH_OUT || "/root/tracker/data/launcher_out") + "/status.json";
let ldb = null;
const open = () => { if (!ldb) { ldb = new Database(LDB, { readonly: true, fileMustExist: true }); ldb.pragma("busy_timeout = 2000"); } return ldb; };

export function launcherApi(days = 3) {
  let status = null; try { status = JSON.parse(readFileSync(STATUS, "utf8")); } catch {}
  let rows = [], posts = 0, runners = [], vol = [];
  try {
    const d = open(), since = Math.floor(Date.now() / 1000) - days * 86400;
    rows = d.prepare(`SELECT l.*, p.text AS post_text, p.parent_user, p.parent_text FROM launches l LEFT JOIN posts p ON p.id=l.post_id WHERE l.created_ts>=? ORDER BY l.id DESC LIMIT 500`).all(since);
    // 0.9.2: the copy-coin paper test (launcher 0.2.0) — other coins with the same name, and the two paper picks
    try { const cp = d.prepare("SELECT launch_id, COUNT(*) n, MIN(CASE WHEN created_ts>0 THEN created_ts END) first_ts, MAX(COALESCE(volume,0)) best_vol FROM copies WHERE ours=0 GROUP BY launch_id").all(), byL = new Map(cp.map((c) => [c.launch_id, c]));
      const pk = d.prepare("SELECT * FROM copy_picks").all(), jobs = new Set(d.prepare("SELECT DISTINCT launch_id FROM copy_jobs").all().map((x) => x.launch_id));
      for (const r of rows) { const c = byL.get(r.id); r.copies = c ? { n: c.n, firstS: c.first_ts ? c.first_ts - Math.floor((r.t_post_ms || 0) / 1000) : null, bestVol: c.best_vol } : jobs.has(r.id) ? { n: 0 } : null;
        r.pick_first = pk.find((p) => p.launch_id === r.id && p.kind === "first") || null; r.pick_strongest = pk.find((p) => p.launch_id === r.id && p.kind === "strongest") || null; } } catch {}
    posts = d.prepare("SELECT COUNT(*) n FROM posts WHERE recv_ms>=?").get(since * 1000).n;
    // 0.9.4 (owner, 31 Oct 18:41 UK): copycats that ran (launcher 0.2.2 prices) and the V300 / V500 volume paper trades (launcher 0.4.0)
    try { runners = d.prepare(`SELECT p.mint, p.name, p.symbol, p.created_ts, p.peak_mc, p.peak_min, p.mc_now, p.holders, p.progress, l.name post_name, l.user, l.post_id, l.t_post_ms FROM copy_peaks p LEFT JOIN launches l ON l.id=p.launch_id
      WHERE p.ours=0 AND p.peak_mc>=30000 AND p.created_ts>=? ORDER BY p.peak_mc DESC LIMIT 40`).all(since); } catch {}
    try { vol = d.prepare("SELECT id, strat, mint, name, symbol, entry_ts, entry_mc, vol5, age_min, holders, exchange, done, err, x15, x60, x120, peak120, peak_min, x_tp2sl50, x_tp15sl30, x_trail40, r_tp2sl50, r_tp15sl30, r_trail40, r_hold60, r_hold120 FROM vol_paper WHERE entry_ts>=? ORDER BY entry_ts DESC LIMIT 400").all(since); } catch {}
  } catch (e) { return { ok: true, status, rows: [], posts: 0, note: "launcher database not there yet: " + e.message }; }
  return { ok: true, status, rows, posts, runners, vol, at: Math.floor(Date.now() / 1000) };
}
/** Relaunch / Sell button → a request file for the launcher. */
// 0.9.3 (owner, 31 Oct 09:58 UK): the Launch-now box. "suggest" asks the launcher to name a pasted post (it waits up to 20 s for the answer);
// "manual" queues the launch. An uploaded picture is saved under /root/launcher/uploads and only its path is passed on.
const UPL = (process.env.LAUNCH_HOME || "/root/launcher") + "/uploads";
function saveUpload(b) {
  if (!b.imageB64) return null; const type = String(b.imageType || "image/jpeg"); if (!/^image\/(png|jpe?g|gif|webp)$/.test(type)) throw new Error("picture must be png, jpg, gif or webp");
  const bytes = Buffer.from(String(b.imageB64), "base64"); if (bytes.length < 200 || bytes.length > 8e6) throw new Error("picture too small or over 8 MB");
  mkdirSync(UPL, { recursive: true }); const f = `${UPL}/${randomUUID()}.${type.split("/")[1].replace("jpeg", "jpg")}`; writeFileSync(f, bytes); return f;
}
const clean = (b) => ({ text: String(b.text || "").slice(0, 2000), link: String(b.link || "").trim().slice(0, 300), imageUrl: /^https:\/\/\S+$/.test(String(b.imageUrl || "").trim()) ? String(b.imageUrl).trim().slice(0, 500) : "" });
export async function launcherSuggest(b) {
  const reqId = randomUUID(), imageFile = saveUpload(b) || (b.imageRef && String(b.imageRef).startsWith(UPL + "/") ? b.imageRef : null);
  mkdirSync(REQ, { recursive: true }); writeFileSync(`${REQ}/${Date.now()}-suggest.json`, JSON.stringify({ action: "suggest", reqId, ...clean(b), imageFile, at: Math.floor(Date.now() / 1000) }));
  const f = `${REQ}/resp-${reqId}.out`;
  for (let i = 0; i < 80; i++) { await new Promise((r) => setTimeout(r, 250)); if (existsSync(f)) { const out = JSON.parse(readFileSync(f, "utf8")); try { unlinkSync(f); } catch {} return { ...out, imageRef: imageFile }; } }
  return { ok: false, error: "no answer from the launcher in 20 s (is it running?)", imageRef: imageFile };
}
export function launcherManual(b) {
  const name = String(b.name || "").trim(), ticker = String(b.ticker || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!name || [...name].length > 32) return { ok: false, error: "name must be 1–32 characters" }; if (ticker.length < 2 || ticker.length > 10) return { ok: false, error: "ticker must be 2–10 letters or digits" };
  const imageFile = b.imageRef && String(b.imageRef).startsWith(UPL + "/") ? b.imageRef : saveUpload(b);
  const reqId = randomUUID(); mkdirSync(REQ, { recursive: true });
  writeFileSync(`${REQ}/${Date.now()}-manual.json`, JSON.stringify({ action: "manual", reqId, name, ticker, ...clean(b), imageFile, nameBy: b.nameBy === "ai" ? "ai" : "manual", score: Number.isFinite(+b.score) ? +b.score : null, at: Math.floor(Date.now() / 1000) }));
  return { ok: true, queued: name, ticker };
}
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
<div class="card" id="ln"><b>Launch now</b> <span class="sub">— paste a post you saw (Axiom, Truth Social, X…): the AI names it from the words and the picture, you check it, then launch. Same 0.1 SOL buy and sell rules.</span>
<div style="display:grid;gap:8px;margin-top:10px;max-width:760px">
<textarea id="lnText" rows="3" placeholder="The post's text" style="width:100%;background:#0d1117;color:var(--txt);border:1px solid var(--line);border-radius:6px;padding:8px;font:inherit"></textarea>
<input id="lnLink" placeholder="Link to the post (x.com/…/status/… or truthsocial.com/@…/…) — goes on the coin" style="background:#0d1117;color:var(--txt);border:1px solid var(--line);border-radius:6px;padding:8px;font:inherit">
<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="lnImgUrl" placeholder="Picture link (https://…), or upload →" style="flex:1;min-width:220px;background:#0d1117;color:var(--txt);border:1px solid var(--line);border-radius:6px;padding:8px;font:inherit"><input id="lnFile" type="file" accept="image/*" style="color:var(--mut)"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button id="lnSuggest" class="go" style="padding:7px 14px;font-size:13px">Suggest name</button><input id="lnName" placeholder="Name (≤ 32)" maxlength="32" style="width:220px;background:#0d1117;color:var(--txt);border:1px solid var(--line);border-radius:6px;padding:7px;font:inherit"><input id="lnTicker" placeholder="TICKER" maxlength="10" style="width:120px;background:#0d1117;color:var(--txt);border:1px solid var(--line);border-radius:6px;padding:7px;font:inherit;text-transform:uppercase"><button id="lnGo" style="padding:7px 14px;font-size:13px;background:#1f6feb;border-color:#1f6feb;color:#fff">Launch</button></div>
<div id="lnMsg" class="sub"></div></div></div>
<div class="kpis" id="k"></div><div class="card sub" id="st"></div>
<div class="card"><b>Copycats that ran</b> <span class="sub">— other people's coins made on the same posts that reached a $30K+ peak market cap (GMGN prices, checked hourly)</span><div class="tw" style="max-height:50vh"><table><thead><tr><th class="l">Made (UK)</th><th class="l">Post</th><th class="l">Copycat</th><th>Made after post</th><th>Peak MC</th><th>Peak at</th><th>MC now</th><th>Holders</th><th>Graduated</th></tr></thead><tbody id="rn"></tbody></table></div></div>
<div class="card"><b>Volume paper trades</b> <span class="sub">— nothing bought. Any Solana coin, any age: paper buy the first time its 5-minute volume is ≥ $300K (V300) or ≥ $500K (V500) and under $1M (GMGN top 100 by 5-min volume, every 30 s). Scored 2 h later from 1-minute candles, after real costs.</span><div id="vs" class="kpis" style="margin:10px 0"></div><div class="tw" style="max-height:60vh"><table><thead><tr><th class="l">Entry (UK)</th><th class="l">Book</th><th class="l">Coin</th><th>Entry MC</th><th>5-min vol</th><th>Age</th><th>15m</th><th>60m</th><th>120m</th><th>Peak (2 h)</th><th>2x / −50%</th><th>1.5x / −30%</th><th>40% trail</th></tr></thead><tbody id="vp"></tbody></table></div></div>
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
function pct(v){return v==null?'–':'<span class="'+(v>0?'pos':v<0?'neg':'')+'">'+(v>0?'+':'')+(v*100).toFixed(1)+'%</span>'}
function age(m){return m==null?'–':m<60?Math.round(m)+'m':m<2880?(m/60).toFixed(1)+'h':Math.round(m/1440)+'d'}
function drawExtra(D){var RN=D.runners||[],V=D.vol||[];
 document.getElementById('rn').innerHTML=RN.length?RN.map(function(r){var url=r.user&&r.post_id?'https://x.com/'+r.user+'/status/'+r.post_id:'';var after=r.t_post_ms?r.created_ts-Math.floor(r.t_post_ms/1000):null;
  return '<tr><td class="l">'+uk(r.created_ts)+'</td><td class="l">'+(url?'<a target="_blank" href="'+url+'">@'+esc(r.user)+'</a> ':'')+esc((r.post_name||'').slice(0,28))+'</td><td class="l"><a target="_blank" href="https://gmgn.ai/sol/token/'+esc(r.mint)+'">'+esc((r.name||'').slice(0,24))+'</a> <span class="sub">'+esc(r.symbol||'')+'</span></td><td>'+(after==null?'–':after<120?after+'s':(after/60).toFixed(1)+' min')+'</td><td><b>'+usd(r.peak_mc)+'</b></td><td>'+(r.peak_min==null?'–':r.peak_min+' min')+'</td><td>'+usd(r.mc_now)+'</td><td>'+(r.holders==null?'–':r.holders)+'</td><td>'+(r.progress>=1?'yes':'no')+'</td></tr>'}).join(''):'<tr><td class="l sub" colspan="9">none yet</td></tr>';
 var sum=function(k){var d=V.filter(function(v){return v.strat===k&&v.done&&!v.err&&v.r_tp2sl50!=null}),avg=function(f){return d.length?d.reduce(function(s,v){return s+(v[f]||0)},0)/d.length:null};
  return '<div class="kpi">'+k+' <span class="sub">'+V.filter(function(v){return v.strat===k}).length+' entries · '+d.length+' scored</span><b>'+(d.length?pct(avg('r_tp2sl50')):'–')+'</b><span class="sub">2x/−50% avg · 1.5x/−30% '+(d.length?pct(avg('r_tp15sl30')):'–')+' · trail '+(d.length?pct(avg('r_trail40')):'–')+' · hold 2 h '+(d.length?pct(avg('r_hold120')):'–')+'</span></div>'};
 document.getElementById('vs').innerHTML=sum('V300')+sum('V500');
 document.getElementById('vp').innerHTML=V.length?V.map(function(v){var sc=v.done&&!v.err;
  return '<tr><td class="l">'+uk(v.entry_ts)+'</td><td class="l">'+esc(v.strat)+'</td><td class="l"><a target="_blank" href="https://gmgn.ai/sol/token/'+esc(v.mint)+'">'+esc((v.name||v.mint.slice(0,6)).slice(0,22))+'</a> <span class="sub">'+esc(v.symbol||'')+'</span></td><td>'+usd(v.entry_mc)+'</td><td>'+usd(v.vol5)+'</td><td>'+age(v.age_min)+'</td>'+
   (sc?'<td>'+xx(v.x15)+'</td><td>'+xx(v.x60)+'</td><td>'+xx(v.x120)+'</td><td>'+xx(v.peak120)+(v.peak_min!=null?' <span class="sub">'+v.peak_min+'m</span>':'')+'</td><td>'+pct(v.r_tp2sl50)+'</td><td>'+pct(v.r_tp15sl30)+'</td><td>'+pct(v.r_trail40)+'</td>':'<td class="sub" colspan="7">'+(v.err?esc(v.err):'scored 2 h after entry')+'</td>')+'</tr>'}).join(''):'<tr><td class="l sub" colspan="13">no entries yet</td></tr>'}
function draw(D){try{drawExtra(D)}catch(e){}var S=D.status||{},R=D.rows||[],T=S.twitter||{},st=S.selfTest||{};
 document.getElementById('ctl').innerHTML=(S.paused?'<span style="background:#5f2f2f;color:#ffb4b4;padding:6px 12px;border-radius:6px;font-weight:600">⏸ PAUSED — no new launches</span> <button class="go" style="padding:8px 16px;font-size:14px" onclick="act(\\'resume\\',0,\\'Resume launching?\\')">▶ Resume launches</button>':'<button style="padding:8px 16px;font-size:14px;background:#5f2f2f;border-color:#f85149;color:#fff" onclick="act(\\'pause\\',0,\\'Pause ALL new launches now? Coins already bought keep their sell rules.\\')">⏸ Pause everything</button>')+' <button style="padding:8px 16px;font-size:14px;background:#3d2a00;border-color:#e3b341;color:#fff" onclick="act(\\'sellall\\',0,\\'Sell ALL coins we hold right now ('+(S.openCoins||0)+' open)?\\')">Sell all ('+(S.openCoins||0)+' open)</button>'+(S.lastSellAll?' <span class="sub">last sell-all: '+esc(S.lastSellAll)+'</span>':'');
 document.getElementById('hd').innerHTML='Mode <span class="tag '+esc(S.mode)+'">'+esc(S.mode||'?')+'</span> · v'+esc(S.ver||'?')+' · stake '+(S.stakeSol||'?')+' SOL · cap '+(S.liveToday||0)+'/'+(S.cap||'?')+' live today · sell back if nobody else buys in '+(S.deadMin||'?')+' min, or after '+(S.quietMin||'?')+' min with no trades'+(S.tpX?' · take-profit '+S.tpX+'x':'')+' · updated '+uk(S.at);
 var live=R.filter(function(r){return r.mode==='live'&&r.cost_sol!=null}),spent=live.reduce(function(a,r){return a+r.cost_sol},0),back=live.reduce(function(a,r){return a+(r.sell_sol||0)},0),open=live.filter(function(r){return r.status==='open'||r.status==='selling'}).length;
 document.getElementById('k').innerHTML=[['Posts seen ('+3+' days)',D.posts],['Coins named',R.length],['Live launches',live.length],['Open now',open],['SOL spent',s4(spent)],['SOL back',s4(back)],['Net (sold ones)',s4(live.filter(function(r){return r.pnl_sol!=null}).reduce(function(a,r){return a+r.pnl_sol},0))],['Wallet',S.balanceSol==null?'–':S.balanceSol+' SOL']].map(function(k){return '<div class="kpi"><span class="sub">'+k[0]+'</span><b>'+k[1]+'</b></div>'}).join('');
 var cl=st.classic||{},v3=st.v3||{};
 document.getElementById('st').innerHTML='Launch wallet (public address — send SOL here to fund it): <b>'+esc(S.wallet||'–')+'</b> · profits above 1 SOL go only to '+esc(S.phantom||'')+'<br>X stream: '+(T.keySet?(T.connected?'<span class="pos">connected</span> since '+esc(T.since):'<span class="neg">not connected</span> '+esc(T.lastClose||T.lastErr||'')):'<span class="neg">no TWITTERAPI_KEY in the .env</span>')+' · posts '+(T.tweets||0)+' · last event '+uki(T.lastEventAt)+' · lookups '+(T.lookups||0)+(T.lookupErr?' (<span class="amb">'+T.lookupErr+' failed: '+esc(T.lastLookupErr)+'</span>)':'')+' · AI naming '+(S.ai?'on':'off (rules)')+
 '<br>Self-test '+uki(st.at)+': create+buy simulation — classic '+(cl.ok?'<span class="pos">ok</span>':'<span class="neg">'+esc(cl.err||'–')+'</span>')+', v3 '+(v3.ok?'<span class="pos">ok</span>':'<span class="neg">'+esc(v3.err||'–')+'</span>')+' · '+esc(st.payer||'')+(st.pctSupply?' · '+(S.stakeSol)+' SOL buys '+st.pctSupply+'% of supply':'')+' · metadata upload '+(st.upload?(st.upload.ok?'<span class="pos">ok</span> '+st.upload.ms+' ms':'<span class="neg">'+esc(st.upload.err)+'</span>'):'–')+(st.error?' · <span class="neg">'+esc(st.error)+'</span>':'')+(S.lastSweep?'<br>Last sweep: '+esc(S.lastSweep):'')+(S.lastFeeCollect?' · last creator-fee collect: '+esc(S.lastFeeCollect):'')+(D.note?'<br>'+esc(D.note):'');
 document.getElementById('tb').innerHTML=R.map(function(r){var url=r.user&&r.post_id?'https://x.com/'+r.user+'/status/'+r.post_id:'';
  if(r.kind==='manual')url=r.src_link||'';
  var post='<a target="_blank" href="'+url+'">@'+esc(r.user)+'</a> <span class="tag">'+esc(r.kind||'')+'</span> '+esc((r.post_text||'').slice(0,180))+(r.parent_text?'<br><span class="sub">↳ @'+esc(r.parent_user||'?')+': '+esc(r.parent_text.slice(0,160))+'</span>':'');
  var coin=(r.image_url&&/^https?:/.test(r.image_url)?'<a target="_blank" href="'+esc(r.image_url)+'"><img src="'+esc(r.image_url)+'" style="width:56px;height:56px;object-fit:cover;border-radius:6px;float:left;margin-right:8px" alt=""></a>':'')+(r.name?'<b>'+esc(r.name)+'</b> $'+esc(r.ticker)+' <span class="sub">'+esc(r.name_by||'')+(r.ai_name&&r.rule_name&&r.ai_name!==r.rule_name?' (rules: '+esc(r.rule_name)+')':'')+'</span>'+(r.mint&&r.mode==='live'&&r.status!=='failed'?'<br><a target="_blank" href="https://pump.fun/coin/'+r.mint+'">pump.fun</a> · <a target="_blank" href="https://dexscreener.com/solana/'+r.mint+'">DexScreener</a> · <a target="_blank" href="https://gmgn.ai/sol/token/'+r.mint+'">gmgn</a>':''):'–');
  var stt='<span class="tag '+esc(r.mode)+'">'+esc(r.mode)+'</span> '+esc(r.status)+(r.reason?'<br><span class="sub">'+esc(r.reason.slice(0,120))+'</span>':'')+(r.sim_err?'<br><span class="neg sub">'+esc(r.sim_err.slice(0,140))+'</span>':'')+(r.sell_reason?'<br><span class="sub">sold: '+esc(r.sell_reason)+'</span>':'');
  var btn=(r.name?'<button class="go" onclick="act(\\'relaunch\\','+r.id+',\\'Relaunch '+esc(r.name).replace(/'/g,'')+' for '+(D.status&&D.status.stakeSol||'?')+' SOL?\\')">Relaunch</button> ':'')+(r.mode==='live'&&(r.status==='open'||r.status==='stuck')?'<button onclick="act(\\'sell\\','+r.id+',\\'Sell all of '+esc(r.ticker)+' now?\\')">Sell</button>':'');
  return '<tr><td class="l">'+uk(r.created_ts)+'</td><td class="txt">'+post+'</td><td class="l">'+coin+'</td><td>'+(r.same_name_7d==null?'–':r.same_name_7d+(r.same_ticker_7d?' <span class="sub">/ '+r.same_ticker_7d+' tkr</span>':''))+'</td><td class="l">'+stt+'</td><td>'+secs(r.t_sent_ms&&r.t_post_ms?r.t_sent_ms-r.t_post_ms:null)+'</td><td>'+s4(r.cost_sol)+'</td><td>'+xx(r.peak_x)+'</td><td>'+xx(r.last_x)+'</td><td>'+s4(r.sell_sol)+'</td><td class="'+(r.pnl_sol>0?'pos':r.pnl_sol<0?'neg':'')+'">'+s4(r.pnl_sol)+'</td><td class="l">'+copiesCell(r)+'</td><td class="l">'+pickCell(r.pick_first)+'</td><td class="l">'+pickCell(r.pick_strongest)+'</td><td class="l">'+btn+'</td></tr>'}).join('')||'<tr><td class="l" colspan="15">No posts yet.</td></tr>'}
var lnRef=null,lnBy='manual',lnScore=null;
function lnBody(){return{text:document.getElementById('lnText').value,link:document.getElementById('lnLink').value,imageUrl:document.getElementById('lnImgUrl').value,imageRef:lnRef}}
function withFile(body){var f=document.getElementById('lnFile').files[0];if(!f||lnRef)return Promise.resolve(body);return new Promise(function(ok,no){var rd=new FileReader();rd.onload=function(){var s=String(rd.result);body.imageB64=s.slice(s.indexOf(',')+1);body.imageType=f.type||'image/jpeg';ok(body)};rd.onerror=no;rd.readAsDataURL(f)})}
function post(path,body){return fetch(path+'?key='+encodeURIComponent(key),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()})}
document.getElementById('lnFile').addEventListener('change',function(){lnRef=null});
document.getElementById('lnSuggest').addEventListener('click',function(){var m=document.getElementById('lnMsg');m.textContent='Asking the AI…';withFile(lnBody()).then(function(b){return post('/api/launcher/suggest',b)}).then(function(j){lnRef=j.imageRef||lnRef;if(!j.ok){m.textContent='No name: '+(j.error||'?');return}document.getElementById('lnName').value=j.name;document.getElementById('lnTicker').value=j.ticker;lnBy=j.by==='ai'?'ai':'manual';lnScore=j.score;m.textContent=(j.by==='ai'?'AI':'Rules')+' suggests '+j.name+' / $'+j.ticker+(j.score!=null?' — score '+j.score+'/10':'')+(j.why?' — '+j.why:'')+(j.repeatOf?' ⚠ already launched as #'+j.repeatOf+' in the last 6 h':'')+'. Edit if you like, then Launch.'}).catch(function(e){m.textContent='Error: '+e})});
document.getElementById('lnGo').addEventListener('click',function(){var m=document.getElementById('lnMsg'),n=document.getElementById('lnName').value.trim(),t=document.getElementById('lnTicker').value.trim().toUpperCase();if(!n||!t){m.textContent='Put a name and ticker first (or press Suggest name).';return}if(!confirm('Launch '+n+' / $'+t+' on pump.fun now with a 0.1 SOL buy?'))return;var b=lnBody();b.name=n;b.ticker=t;b.nameBy=lnBy;b.score=lnScore;withFile(b).then(function(b){return post('/api/launcher/manual',b)}).then(function(j){if(!j.ok){m.textContent='Not launched: '+j.error;return}m.textContent='Sent: '+j.queued+' / $'+j.ticker+' — it appears in the list below within a few seconds.';['lnText','lnLink','lnImgUrl','lnName','lnTicker'].forEach(function(i){document.getElementById(i).value=''});document.getElementById('lnFile').value='';lnRef=null;lnBy='manual';lnScore=null;setTimeout(load,4000)}).catch(function(e){m.textContent='Error: '+e})});
load();setInterval(load,15000);
</script></body></html>`;
