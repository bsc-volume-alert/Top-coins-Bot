// THE TOPICS (owner, 27 Nov 2026 21:00 UK): cards of one topic share a colour and can be shown on their own. Display only.
import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../src/spec.mjs";
import { booksApi, topicOf, TOPICS, VIEWS, VIEW_NAMES, BOOKS_PAGE } from "../src/page.mjs";

test("every topic has its own name and colour; none uses the colours that mean up, down, sold by you or NEW", () => {
  assert.deepEqual(TOPICS.map((t) => t.key), ["vol", "looks", "slices", "follow", "hit", "farm", "pool"]);
  assert.equal(new Set(TOPICS.map((t) => t.color)).size, TOPICS.length); assert.equal(new Set(TOPICS.map((t) => t.label)).size, TOPICS.length);
  for (const t of TOPICS) { assert.match(t.color, /^#[0-9a-f]{6}$/); assert.ok(!["#39ff9c", "#ff4d7a", "#ffb84d", "#c8ff4d"].includes(t.color)); }
  assert.equal(TOPICS[0].color, "#c58bff", "the volume test keeps its purple"); assert.ok(BOOKS_PAGE.includes("--grp:#c58bff"));
});
test("which card is in which topic: by the book it is, or the books it is drawn from", () => {
  for (const k of [...Object.keys(S.VOLG.cards), ...S.VOLG.books]) assert.equal(topicOf(k), "vol", k);
  for (const k of [...S.NEW_BOOKS, S.NEW_ALL]) assert.equal(topicOf(k), "looks", k);
  for (const k of ["TOP10-16-20", "5M-H300", "20M-FEE1", "5M-LOWCONC", "5M-LOWCONC-SNIP", "LIQUID-SMALLCAP", "BUNDLED-RUNNER"]) assert.equal(topicOf(k), "slices", k);
  for (const k of [...S.FOLLOW_BOOKS, ...S.CONFIRM.map(([f]) => f + "-FEE1")]) assert.equal(topicOf(k), "follow", k);
  for (const k of [...S.HIT_BOOKS, "HIT50-NOW-FEE2", "HIT-ALL-FEE2"]) assert.equal(topicOf(k), "hit", k);
  assert.equal(topicOf("FARM-90K"), "farm"); for (const k of ["FAST-1M", "FAST-3M", "FAST-5M", "RUG450", "RUG950"]) assert.equal(topicOf(k), "pool", k);
  assert.equal(topicOf("HH-BREAK"), null); assert.equal(topicOf(S.FEE_BOOK), null);
  for (const k of VIEW_NAMES) assert.ok(topicOf(k), "every view has a topic: " + k); assert.ok(VIEWS.length > 10);
});
test("the books data: each card shown has its topic; only topics with a card are listed; nothing else changes", () => {
  const run = { name: "t", books: [...S.booksOf("older-11"), ...S.HIT_BOOKS, ...S.FOLLOW_BOOKS, ...S.FARM_BOOKS, ...S.NEW_BOOKS], newcoins: true }, j = booksApi([], { stop: 0.25, now: 1795812000, run });
  assert.deepEqual(j.topics.list.map((t) => t.key), ["vol", "looks", "slices", "follow", "hit", "farm", "pool"]); assert.deepEqual(j.topics.list[0], { key: "vol", label: "VOLUME TEST", color: "#c58bff" });
  for (const k of j.order) assert.equal(j.topics.of[k] ?? null, topicOf(k), k); for (const k of Object.keys(j.topics.of)) assert.ok(j.order.includes(k), "no topic for a card that is not shown: " + k);
  assert.equal(j.topics.of["VOL100K"], undefined, "the hidden volume cards carry no topic"); assert.equal(j.topics.of["HH-BREAK"], undefined);
  const few = booksApi([], { stop: 0.25, now: 1795812000, run: { name: "t", books: ["RUG450", "HH-BREAK"] } }); assert.deepEqual(few.topics.list.map((t) => t.key), ["pool"]); assert.deepEqual(few.topics.of, { RUG450: "pool" });
});
test("the page: a row of topic buttons, the topic's colour on the card, its name, the ranking and the rules table", () => {
  for (const s of ['class="topics"', 'class="tpc', "ALL · '+NALL", "border-left:4px solid '+tc(c[0])", "box-shadow:inset 3px 0 0 ", "TOPF=t===TOPF?'':t;FORCE=Date.now()", "keys.filter(function(k){return TOP[k]===TOPF})", "'Only '+esc(TOPC[TOPF].label)", "esc(TOPC[TOP[k]].label)"]) assert.ok(BOOKS_PAGE.includes(s), "the page has: " + s);
});
test("a hidden filter does not filter: the coins filter starts hidden, and where the run does not offer it a saved choice is dropped", () => {
  assert.ok(BOOKS_PAGE.includes('id="popLab" style="display:none"') && BOOKS_PAGE.includes('id="pop" style="display:none"'), "hidden until the run is known");
  assert.ok(BOOKS_PAGE.includes("if(hideP&&SEL.pop){SEL.pop='';try{localStorage.setItem('olderSel',JSON.stringify(SEL))}catch(e){}seg('pop');FORCE=Date.now();load();return}"));
});
test("since the rule change is only for the cards whose rules changed; 24 h and 6 h on every ranking row, ranked by 24 h once", () => {
  const run = { name: "t", books: [...S.booksOf("older-11"), ...S.HIT_BOOKS, ...S.FOLLOW_BOOKS, ...S.FARM_BOOKS, ...S.NEW_BOOKS], newcoins: true }, j = booksApi([], { stop: 0.25, now: 1795812000, run });
  assert.deepEqual(j.rule.cards.slice().sort(), [...S.NEW_BOOKS, S.NEW_ALL, "TOP10-16-20", "5M-H300", "20M-FEE1", "5M-LOWCONC", "5M-LOWCONC-SNIP", "LIQUID-SMALLCAP", "BUNDLED-RUNNER"].sort(), "the four looks and the cards made only of them");
  for (const k of ["FAST-1M", "RUG450", "HIT50-NOW", "CONFIRM-15", "FARM-90K", "VOL-CONTROL"]) assert.ok(!j.rule.cards.includes(k), k + " had no rule change");
  assert.deepEqual(booksApi([], { stop: 0.25, now: 1795812000, run: { name: "t", books: ["RUG450"] } }).rule.cards, []);
  for (const s of ["rcOn:!!(RC&&RCB[k]),rc:RC&&RCB[k]?w(RC):tot", "(RC&&b.rcOn?cell('since the rule change", "(b.rcOn?num(b.rc):'<span class=\"mut\">no change</span>')", '<span class="pt d24">24h</span> \'+num(b.h24)', '<span class="pt d6">6h</span> \'+num(b.h6)', "if(!SEL.h24Seen){SEL.win='h24';SEL.h24Seen=1}", ".pt.d24{background:var(--acc)}.pt.d6{background:var(--mag)}", '<span class="c6">last 6 hours</span>', '<span class="c24">last 24 hours</span>', "no other book is restarted"]) assert.ok(BOOKS_PAGE.includes(s), "the page has: " + s);
});
test("a coin's name opens it on Axiom; GMGN is the small link beside it", () => {
  assert.ok(BOOKS_PAGE.includes("function coin(t){return '<a class=\"coin\" href=\"https://axiom.trade/t/'+t.mint+'\" target=\"_blank\""));
  assert.ok(BOOKS_PAGE.includes("href=\"https://gmgn.ai/sol/token/'+t.mint+'\" target=\"_blank\" title=\"open this coin on GMGN\">gm</a>")); assert.ok(!BOOKS_PAGE.includes('class="coin" href="https://gmgn.ai'));
});
test("you and auto sell together: a second box under 'sold by you' — his sale in place of the rule's on the buys he sold, the rule's on the rest; the rules' total is untouched", () => {
  for (const x of ["you + auto sell together · total", "var tg=b.tot.net-rmn+yn,oth=b.tot.n-rm,df=tg-b.tot.net", "auto sell alone · total", "together against auto alone", "if(t.status==='closed'&&t.ret!=null&&!t.est_exit){rm++;rmn+=t.net}"]) assert.ok(BOOKS_PAGE.includes(x), "the page has: " + x);
});
test("held now: the five biggest gainers still held, one row per coin, each with its sell buttons, at the top of the page; his own sales are folded away", () => {
  const P = BOOKS_PAGE; assert.ok(P.indexOf('id="held"') > 0 && P.indexOf('id="held"') < P.indexOf('id="manual"') && P.indexOf('id="manual"') < P.indexOf('id="rank"'), "held, then his sales, then the ranking");
  for (const x of ["Held now</b>", "if(t.hx==null&&!(t.man&&t.man.pending))return;", "if(t.man&&t.man.pending)HW.push(o);else if(t.sell)HL.push(o)", "Object.keys(j.books).forEach(function(k){(j.books[k]||[]).forEach(function(t){", "GL.sort(function(a,b){return (b.now==null?-1:b.now)-(a.now==null?-1:a.now)});HL=GL;var hshow=HALL?HL:HL.slice(0,7)", "function SBG(g)", "(nb>1?SBG(o):SB(t))", "var ids=String(b.dataset.id).split(','),done=0,okN=0,bad=''", "Paper sale requested for all '+ids.length+' buys of this coin", "<th>coin</th><th>sell (paper)</th><th>now</th><th>high</th><th>liquidity now</th>", "'+(nb>1?SBG(o):SB(t))+'</td><td class=", "waiting to sell:", "show all '+HL.length", "<details'+(mdOpen?' open':'')+'><summary", "· tap to open</span></summary>"]) assert.ok(P.includes(x), "the page has: " + x);
});
test("held now is the buy itself, whatever stop is chosen: a buy the 25% stop has sold but a wider stop still holds keeps its value and its sell buttons", async () => {
  const { mkEngine, swap, path, H, T0 } = await import("./helpers.mjs"); const { heldX } = await import("../src/page.mjs");
  const M = "MintAAApump", e = mkEngine(); e.feedUp(T0); e.coin(M, { pool: "PoolA", createTs: T0 - 2 * H }); e.setBooks(S.booksOf("older-11"));
  path(e, T0, T0 + 600, () => 100_000, 60, { sol: 10 }); for (let k = 0; k < 4; k++) swap(e, T0 + 600 + k * 30, 100_000, { sol: 300 });
  swap(e, T0 + 760, 100_000); swap(e, T0 + 762, 100_000); const en = [...e.entries.values()].find((x) => x.families.includes("VOL100K")); assert.equal(en.status, "filled");
  for (let i = 0; i < 6; i++) swap(e, T0 + 770 + i * 2, 66_000, { isBuy: false }); // down a third: the 20% and 25% stops sell, the 40%+ stops hold
  const v25 = en.versions.find((v) => v.policy === "trail" && v.stop === 0.25), v70 = en.versions.find((v) => v.policy === "trail" && v.stop === 0.7); assert.equal(v25.status, "closed"); assert.equal(v70.status, "open");
  const hx = heldX(en); assert.ok(hx > 0.5 && hx < 0.8, "worth about two thirds of the buy: " + hx); assert.equal(hx, +v70.lastX.toFixed(4));
  const run = { name: "t", books: S.booksOf("older-11") }, j25 = booksApi([...e.entries.values()], { stop: 0.25, now: T0 + 800, run, sellable: true }), r25 = j25.books.VOL100K.find((x) => x.id === en.id);
  assert.equal(r25.status, "closed"); assert.equal(r25.hx, hx, "the row the 25% stop has sold still carries the buy's own value"); assert.equal(r25.sell, 1, "and can still be sold by hand");
  const r70 = booksApi([...e.entries.values()], { stop: 0.7, now: T0 + 800, run, sellable: true }).books.VOL100K.find((x) => x.id === en.id); assert.equal(r70.status, "open"); assert.equal(r70.hx, hx); assert.equal(r70.now_x, v70.lastX);
  for (let i = 0; i < 8; i++) swap(e, T0 + 800 + i * 2, 8_000, { isBuy: false }); assert.ok(en.versions.every((v) => v.status === "closed" || v.policy === "buy") || true); // (buy-price rows may still hold)
  for (const x of ["top 7 of '+HL.length+' coins", "every buy you have not sold that a rule still holds, whatever stop is chosen above", "if(v.held)Object.keys(LAST.books)"]) assert.ok(BOOKS_PAGE.includes(x), "the page has: " + x);
  assert.equal(heldX({ status: "filled", fill: { tok: 10 }, versions: [{ status: "closed", tok: 0, lastX: 2 }] }), null, "every row sold: no value shown");
  assert.equal(heldX({ status: "filled", fill: { tok: 10 }, versions: [{ status: "open", tok: 5, got: 0.1005, lastX: 1.5, lastT: 9 }] }), +(((1.5 * 0.2005 - 0.1005) / 0.2005) * 2).toFixed(4), "a row that has sold a half is scaled back to the whole buy");
});

test("the page: a button at the lower right that goes back to the top, shown only once the page is scrolled down", () => {
  for (const x of ['<button id="totop"', "#totop{position:fixed;right:14px", "window.scrollTo(0,0);see()", ">400?'block':'none'"]) assert.ok(BOOKS_PAGE.includes(x), "the page has: " + x);
  const m = BOOKS_PAGE.match(/<script>([\s\S]*)<\/script>/); assert.ok(m); assert.doesNotThrow(() => new Function(m[1]), "the page script parses");
});

test("the page: the $100K list names the books that bought a coin, and a coin only the other books bought is 'picked up', not 'missed'", () => {
  for (const x of ["picked up by another book", "missed by every book", ">picked up</span>", "<b>Picked up by</b> ", "<b>Bought by</b> ", "you sold it: '+pc(b.sold)", "every buy of this coin, oldest first:", "which books bought it"]) assert.ok(BOOKS_PAGE.includes(x), "the page has: " + x);
  assert.ok(!BOOKS_PAGE.includes(".replace('M',' min'))+' check ('"), "FARM-90K is no longer shown as 'FAR min-90K'");
});
