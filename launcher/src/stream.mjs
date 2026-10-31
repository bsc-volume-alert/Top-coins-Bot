// TwitterAPI.io: the Stream websocket (posts of the accounts set in the owner's Stream dashboard — originals, replies, quotes, reposts) and the REST
// tweet lookup used to find what a reply / quote / repost is about. Key from TWITTERAPI_KEY (never logged).
// Docs read 24 Oct 2026: wss://ws.twitterapi.io/twitter/tweet/websocket, header x-api-key, one connection per key, events connected / ping / fast_tweet / tweet,
// reconnect no sooner than 90 s after a drop (60 s+ after 1013). REST GET /twitter/tweets?tweet_ids=… costs 15 credits ($0.00015) a tweet.
import WebSocket from "ws";
import { CFG } from "./config.mjs";

export const twStat = { connected: false, since: null, events: 0, pings: 0, tweets: 0, reconnects: 0, lastClose: "", lastErr: "", lookups: 0, lookupErr: 0, lastLookupErr: "", lastEventAt: null };

/** Normalise one tweet object from either event shape into { id, user, text, kind?, createdMs, replyTo, quoted, retweeted, media, full }. */
export function norm(t) {
  if (!t || !t.id) return null;
  const a = t.author || {};
  const user = String(t.screen_name || a.userName || a.username || a.screen_name || t.userName || "").replace(/^@/, "");
  const createdMs = Number(t.created_ms) || (t.createdAt ? Date.parse(t.createdAt) : NaN) || snowMs(t.id);
  const kindRaw = String(t.type || "").toLowerCase();
  const sub = (x) => (x && typeof x === "object" && x.id ? norm(x) : null);
  return { id: String(t.id), user, text: String(t.text || t.full_text || ""), kindRaw, createdMs,
    replyTo: t.inReplyToId || t.in_reply_to_status_id || t.in_reply_to_tweet_id || null, isReply: t.isReply ?? null,
    quoted: sub(t.quoted_tweet), retweeted: sub(t.retweeted_tweet), media: (t.media || t.extendedEntities?.media || []).map((m) => (typeof m === "string" ? m : m.media_url_https || m.url)).filter(Boolean).slice(0, 4),
    full: !!(t.author || "isReply" in t || "inReplyToId" in t) };
}
/** A tweet id carries its creation time (Twitter snowflake: ms since 2010-11-04 01:42:54.657 UTC in the bits above 22). */
export const snowMs = (id) => { try { return Number((BigInt(id) >> 22n) + 1288834974657n); } catch { return NaN; } };

/** REST lookup of up to 20 tweets by id → Map(id → normalised tweet). */
export async function lookup(ids) {
  ids = [...new Set(ids.filter(Boolean).map(String))]; if (!ids.length || !CFG.TWITTER_KEY) return new Map();
  twStat.lookups++;
  try {
    const r = await fetch(`${CFG.REST}/twitter/tweets?tweet_ids=${ids.join(",")}`, { headers: { "X-API-Key": CFG.TWITTER_KEY }, signal: AbortSignal.timeout(4000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.status === "error") throw new Error(`HTTP ${r.status} ${(j.msg || j.message || "").slice(0, 100)}`);
    return new Map((j.tweets || []).map((t) => norm(t)).filter(Boolean).map((t) => [t.id, t]));
  } catch (e) { twStat.lookupErr++; twStat.lastLookupErr = e.message; return new Map(); }
}

/** What a post is about: { kind: post|reply|quote|repost, subject: the tweet the narrative comes from (the original for replies / reposts, both for quotes) }. */
export async function context(t) {
  let full = t;
  // 0.1.8: the stream marks plain posts type "post" (seen 31 Oct 00:49 UK) — those need no lookup (saves ~0.5 s); replies, quotes and reposts do
  const plain = ["post", "tweet"].includes(t.kindRaw) && !/^(@|RT @)/.test(t.text);
  const maybeLinked = !t.full && !plain;
  if (maybeLinked) { const m = await lookup([t.id]); if (m.get(t.id)) full = { ...m.get(t.id), kindRaw: t.kindRaw }; }
  let kind = full.retweeted || /retweet|repost/.test(full.kindRaw) || /^RT @/.test(full.text) ? "repost" : full.quoted || /quote/.test(full.kindRaw) ? "quote" : full.replyTo || full.isReply || /reply/.test(full.kindRaw) ? "reply" : "post";
  let parent = full.retweeted || full.quoted || null;
  if (!parent && full.replyTo) parent = (await lookup([full.replyTo])).get(String(full.replyTo)) || null;
  return { kind, tweet: full, parent };
}

/** Keep one websocket open; call onTweet(normalisedTweet, rawEvent) for every post. Never two connections (the key allows one). */
export function startStream(onTweet) {
  if (!CFG.TWITTER_KEY) { twStat.lastErr = "no TWITTERAPI_KEY in /root/tracker/.env"; return { stop() {} }; }
  let ws = null, stopped = false, timer = null, lastMsg = Date.now();
  const connect = () => {
    if (stopped) return;
    ws = new WebSocket(CFG.WS_URL, { headers: { "x-api-key": CFG.TWITTER_KEY }, handshakeTimeout: 15000 });
    ws.on("open", () => { twStat.connected = true; twStat.since = new Date().toISOString(); lastMsg = Date.now(); });
    ws.on("message", (buf) => {
      lastMsg = Date.now(); twStat.events++; twStat.lastEventAt = new Date().toISOString();
      let ev; try { ev = JSON.parse(buf.toString()); } catch { return; }
      if (ev.event_type === "ping") { twStat.pings++; return; }
      if (ev.event_type === "connected") return;
      const raw = ev.event_type === "fast_tweet" ? [ev.tweet] : Array.isArray(ev.tweets) ? ev.tweets : ev.tweet ? [ev.tweet] : [];
      for (const r of raw) { const t = norm(r); if (t) { twStat.tweets++; try { onTweet(t, ev); } catch (e) { twStat.lastErr = "onTweet: " + e.message; } } }
    });
    ws.on("error", (e) => { twStat.lastErr = "ws: " + e.message; });
    ws.on("close", (code, why) => {
      twStat.connected = false; twStat.lastClose = `${code} ${String(why || "").slice(0, 80)} at ${new Date().toISOString()}`; if (stopped) return;
      twStat.reconnects++; clearTimeout(timer); timer = setTimeout(connect, code === 1013 ? 120000 : 90000); // the docs: wait ≥ 90 s after a drop, ≥ 60 s after 1013
    });
  };
  connect();
  const watchdog = setInterval(() => { if (ws && twStat.connected && Date.now() - lastMsg > 150000) { twStat.lastErr = "no message for 150 s — reconnecting"; try { ws.terminate(); } catch {} } }, 30000); // server pings every ~40 s
  return { stop() { stopped = true; clearTimeout(timer); clearInterval(watchdog); try { ws?.close(); } catch {} } };
}
