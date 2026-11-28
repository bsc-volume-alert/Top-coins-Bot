// BANNED NAMES (owner 28 Nov 2026 02:00–02:06 UK: "we must have the option on the web page… you can ban and unban… as opposed
// to buy it and then try to sell it, because you're worried about a liquidity rug pull very quickly").
//
// HIS list, by his hand only: a name he has banned is not bought again by the new-coin books (the looks, FARM-90K, the
// follow-up books — every buy that goes through engine.openDirect) from the moment he bans it until he takes the ban off.
// Nothing here bans a name by itself: the test of an automatic ban on FARM-90K's own buys (notes, 28 Nov 02:04) LOST money,
// because the winners were mostly later launches of a name that had already rugged. The pool books (the frozen volume test,
// HIT, FAST, RUG) are not touched. What a ban keeps out is written down — one line per coin, with the books that would have
// bought it — so the ban can be judged afterwards.
//
// A name is matched without regard to capitals, spaces or punctuation ("Space X" = "SPACEX" = "space-x"); "SPACEXLIFE" is a
// different name from "SpaceX". The list lives in the run's database (table meta, key "bans"): it survives a restart.
import * as S from "./spec.mjs";

export const banKey = (name) => String(name ?? "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 40);

export class Bans {
  constructor(store = null) { this.store = store; this.map = new Map(); /* key → { key, name, t, kept, last } */ this.hits = []; /* newest first: { t, key, sym, mint, mc, books } — one per coin */
    try { const r = store?.db?.prepare("SELECT v FROM meta WHERE k='bans'").get(); const j = r ? JSON.parse(r.v) : null; for (const b of j?.list || []) if (b?.key) this.map.set(b.key, { key: b.key, name: String(b.name ?? b.key), t: b.t ?? null, kept: b.kept || 0, last: b.last ?? null }); if (Array.isArray(j?.hits)) this.hits = j.hits.slice(0, S.BAN_KEEP); } catch {} }
  save() { try { this.store?.db?.prepare("INSERT OR REPLACE INTO meta VALUES ('bans', ?)").run(JSON.stringify({ v: 1, list: [...this.map.values()], hits: this.hits })); } catch {} }
  keys() { return new Set(this.map.keys()); }
  match(sym) { if (!this.map.size) return null; const k = banKey(sym); return k ? this.map.get(k) || null : null; }
  add(name, t = Date.now() / 1000) { const key = banKey(name); if (!key) return { ok: false, why: "which name? (a coin without a name cannot be banned)" };
    if (this.map.has(key)) return { ok: true, key, name: this.map.get(key).name, already: true }; if (this.map.size >= S.BAN_MAX) return { ok: false, why: `the list is full (${S.BAN_MAX} names): take one off first` };
    const nm = String(name).trim().slice(0, 40); this.map.set(key, { key, name: nm, t: Math.round(t), kept: 0, last: null }); this.save(); return { ok: true, key, name: nm }; }
  remove(name) { const key = banKey(name), b = this.map.get(key); if (!b) return { ok: false, why: "that name is not on the list" }; this.map.delete(key); this.save(); return { ok: true, key, name: b.name }; }
  /** a banned coin was kept out of one book: one line per coin, the books collected on it */
  hit(b, { t, sym, mint, family, mc }) { let h = this.hits.find((x) => x.mint === mint);
    if (!h) { h = { t: Math.round(t), key: b.key, sym: sym ?? null, mint, mc: mc == null ? null : Math.round(mc), books: [] }; this.hits.unshift(h); if (this.hits.length > S.BAN_KEEP) this.hits.length = S.BAN_KEEP; b.kept++; b.last = Math.round(t); }
    if (family && !h.books.includes(family)) h.books.push(family); this.save(); return h; }
  view() { return { list: [...this.map.values()].sort((a, b) => (b.t || 0) - (a.t || 0)), hits: this.hits }; }
}
