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
