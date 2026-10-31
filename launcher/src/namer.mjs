// Turns a post (and the post it replies to / quotes / reposts) into a coin name and ticker.
// Rules first (no key needed); when ANTHROPIC_API_KEY is in the .env, an AI model picks instead and the rules are the fallback. Both are recorded.
import { CFG } from "./config.mjs";

const STOP = new Set("a an the and or but if of in on at to for from by with as is are was were be been being it its this that these those i you he she we they me my our your his her their them us not no yes so just very really can will would should could do does did done have has had what who why how when where which there here than then too also into over under about after before again more most less much many some any all only own same other such up down out off now new one two get got make made like".split(" "));
const clean = (s) => String(s || "").replace(/https?:\/\/\S+/g, " ").replace(/(^|\s)@\w+/g, " ").replace(/^RT\s*:?/i, " ").replace(/&amp;/g, "&").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu, " ").replace(/\s+/g, " ").trim();
const words = (s) => clean(s).split(/[^A-Za-z0-9'’-]+/).map((w) => w.replace(/^['’-]+|['’-]+$/g, "")).filter(Boolean);
const title = (w, i = 1) => (i > 0 && STOP.has(w.toLowerCase()) ? w.toLowerCase() : w === w.toUpperCase() && w.length <= 5 ? w : w[0].toUpperCase() + w.slice(1));
/** ≤ 32 characters: drop the small words first, then words from the end. */
const fit = (ws) => { if (ws.join(" ").length <= 32) return ws; const big = ws.filter((w, i) => i === 0 || !STOP.has(w.toLowerCase())); while (big.join(" ").length > 32 && big.length > 1) big.pop(); return big; };

/** Ticker from a name: the words run together if that is ≤ 10 letters, else the initials of the main words ("Super Intelligence" → SI). */
export function tickerOf(name) {
  const ws = name.split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9]/g, "")).filter(Boolean);
  const joined = ws.join("").toUpperCase(); if (joined.length && joined.length <= 10) return joined;
  const main = ws.filter((w) => !STOP.has(w.toLowerCase()));
  return main.length >= 2 ? main.map((w) => w[0]).join("").toUpperCase().slice(0, 10) : joined.slice(0, 10);
}

/** Candidate phrases in priority order: #hashtags, "quoted phrases", runs of Capitalised words (small words allowed inside), then the longest uncommon words. */
export function candidates(text) {
  const out = [], push = (p, why) => { p = fit(p.replace(/\s+/g, " ").trim().split(" ")).map(title).join(" "); if (p && [...p].length <= 32 && /[A-Za-z]/.test(p) && !out.some((o) => o.name.toLowerCase() === p.toLowerCase())) out.push({ name: p, why }); };
  for (const m of String(text || "").matchAll(/#([A-Za-z][A-Za-z0-9_]{2,30})/g)) push(m[1].replace(/_/g, " "), "hashtag");
  for (const m of clean(text).matchAll(/["“”']([^"“”']{3,32})["“”']/g)) if (words(m[1]).length <= 4) push(words(m[1]).join(" "), "quoted");
  const ws = words(text); let run = [];
  const flush = () => { while (run.length && STOP.has(run[run.length - 1].toLowerCase())) run.pop(); if (run.length && !(run.length === 1 && STOP.has(run[0].toLowerCase()))) push(run.slice(0, 5).join(" "), "capitalised"); run = []; };
  ws.forEach((w, i) => { const cap = /^[A-Z0-9]/.test(w) && !(i === 0 && STOP.has(w.toLowerCase())); if (cap) run.push(w); else if (run.length && STOP.has(w.toLowerCase()) && /^[A-Z]/.test(ws[i + 1] || "")) run.push(w); else flush(); });
  flush();
  // the first two neighbouring uncommon words ("super intelligence"), then the longest uncommon word
  for (let i = 0; i + 1 < ws.length; i++) { const a = ws[i], b = ws[i + 1]; if (a.length >= 3 && b.length >= 3 && !STOP.has(a.toLowerCase()) && !STOP.has(b.toLowerCase())) { push(a + " " + b, "pair"); break; } }
  const rare = ws.filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase())).sort((a, b) => b.length - a.length);
  if (rare[0]) push(rare[0], "word");
  return out;
}

/** The rules' pick for a post. subjectText = the text the narrative comes from (original post for a reply / repost; quoted + own text for a quote). */
export function ruleName({ ownText, subjectText }) {
  const own = candidates(ownText), sub = candidates(subjectText);
  const ownWords = words(ownText).filter((w) => !STOP.has(w.toLowerCase()));
  // a short reaction ("Wow", "True!!", "💯") carries no name of its own → the subject decides
  const pool = ownWords.length >= 2 && own.length ? [...own, ...sub] : [...sub, ...own];
  const best = pool[0]; if (!best) return null;
  const name = best.name.slice(0, 32);
  return { name, ticker: tickerOf(name), why: best.why, from: pool === own || own.includes(best) ? "own" : "subject", score: null, by: "rules" };
}

/** AI pick (optional). Returns null on any failure so the rules stand. */
export const aiStat = { calls: 0, ok: 0, errors: 0, lastErr: "", lastMs: null };
export async function aiName({ user, kind, ownText, subjectText, subjectUser, images = [] }) {
  if (!CFG.AI_KEY) return null;
  const prompt = `A memecoin will be launched on pump.fun the moment this X post appears. Pick the coin name and ticker that traders would most likely search for.\n` +
    `Post by @${user} (${kind}): "${String(ownText).slice(0, 600)}"\n` + (subjectText ? `It ${kind === "reply" ? "replies to" : kind === "quote" ? "quotes" : "reposts"} @${subjectUser || "?"}: "${String(subjectText).slice(0, 900)}"\n` : "") +
    (images.length ? `The post has ${images.length} picture(s), attached below. LOOK AT THEM: the narrative is often in the picture — a title, a brand, a character, words written on it (e.g. a post "Dems in charge? Nothing scarier." whose pictures are Goosebumps-style covers → name "Goosebumps").\n` : "") +
    `Rules (owner's): the name must be the post's OWN words or the words/thing shown in its picture, like for like — never invent a different phrase. Pick the single most distinctive, recognisable word or short phrase a trader would search for; prefer a title, brand, character or catchphrase over generic words (Dems, AI, Elon, Trump, Bitcoin). Name ≤ 32 characters, ticker 2–10 letters/digits, no $ sign.\n` +
    `Reply with JSON only: {"name":"…","ticker":"…","score":0-10 (how likely traders pile into this narrative),"why":"≤ 12 words"}`;
  aiStat.calls++; const t0 = Date.now();
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal: AbortSignal.timeout(images.length ? 8000 : 5000),
      headers: { "x-api-key": CFG.AI_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: CFG.AI_MODEL, max_tokens: 800, messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...images.slice(0, 4).map((im) => (typeof im === "string" ? { type: "image", source: { type: "url", url: im } } : { type: "image", source: { type: "base64", media_type: im.type, data: im.b64 } }))] }] }) });
    const j = await r.json(); if (!r.ok) { aiStat.errors++; aiStat.lastErr = `HTTP ${r.status} ${(j.error?.message || "").slice(0, 140)}`; return null; }
    const txt = (j.content || []).map((c) => c.text || "").join(""); let m = txt.match(/\{[\s\S]*\}/);
    if (!m) { const cut = txt.match(/\{[\s\S]*/); if (cut) { const fixed = cut[0].replace(/,?\s*"why"\s*:\s*"[^"]*$/, "") + "}"; try { JSON.parse(fixed); m = [fixed]; } catch {} } } // a cut-off answer still gives name, ticker and score
    if (!m) { aiStat.errors++; aiStat.lastErr = `no JSON in answer (stop: ${j.stop_reason}): ` + txt.slice(0, 100); return null; }
    const o = JSON.parse(m[0]); const name = String(o.name || "").trim().slice(0, 32); let ticker = String(o.ticker || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
    if (!name) return null; if (ticker.length < 2) ticker = tickerOf(name);
    aiStat.ok++; aiStat.lastMs = Date.now() - t0;
    return { name, ticker, why: String(o.why || "").slice(0, 120), score: Number.isFinite(+o.score) ? +o.score : null, by: "ai" };
  } catch (e) { aiStat.errors++; aiStat.lastErr = e.message; return null; }
}
