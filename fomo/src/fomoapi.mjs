// fomo's own API (prod-api.fomo.family) with the owner's login. Colour only: handles → wallets, theses, the per-trader feed, fomo's
// trending lists. Nothing here is trusted for a trade decision and nothing breaks if it stops working. Auth = Privy: the 1-hour
// access token (FOMO_COOKIE, cookie privy-token) is refreshed with the refresh token (FOMO_REFRESH, cookie privy-refresh-token).
// Endpoints were observed from the web app on 21 Oct 2026; the refresh flow is Privy's standard one and is confirmed on first run
// (fa.lastErr says what happened). Tokens never leave the box and are never logged.
import { CFG } from "./config.mjs";
import { db, q, nowS } from "./db.mjs";
import { typeOf } from "./theses.mjs";
export const fa = { enabled: !!process.env.FOMO_COOKIE, tokenExp: 0, calls: 0, errors: 0, lastErr: "", lastOk: 0, refreshes: 0, refreshErr: "", theses: 0, feedRows: 0, handles: 0, mode: "cookie" };
const B = "https://prod-api.fomo.family";
let access = process.env.FOMO_COOKIE || "", refresh = process.env.FOMO_REFRESH || "", accessExp = 0;
try { if (access) { const p = JSON.parse(Buffer.from(access.split(".")[1], "base64url").toString()); accessExp = p.exp || 0; fa.tokenExp = accessExp; } } catch {}
const PRIVY_APP = (() => { try { return JSON.parse(Buffer.from(access.split(".")[1], "base64url").toString()).aud || ""; } catch { return ""; } })();
async function doRefresh() {
  if (process.env.FOMO_REFRESH_ENABLED !== "1") { fa.refreshErr = "refresh disabled (FOMO_REFRESH_ENABLED=1 to enable) — a box-side refresh can log the owner's browser out"; return false; } // 22 Oct 2026: the owner's fomo session dropped after the box tried the refresh; off until the API route is proven
  if (!refresh) return false; fa.refreshes++;
  // Privy's session refresh: POST /api/v1/sessions with the refresh token; the app id is the token's audience
  for (const url of ["https://privy.fomo.family/api/v1/sessions", "https://auth.privy.io/api/v1/sessions"]) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "privy-app-id": PRIVY_APP, "privy-client": "react-auth:unknown", "authorization": `Bearer ${access}` }, body: JSON.stringify({ refresh_token: refresh }), signal: AbortSignal.timeout(10000) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.token) { access = j.token; if (j.refresh_token) refresh = j.refresh_token; try { accessExp = JSON.parse(Buffer.from(access.split(".")[1], "base64url").toString()).exp || 0; } catch {} fa.refreshErr = ""; return true; }
      fa.refreshErr = `${url.replace("https://", "").split("/")[0]}: ${r.status} ${JSON.stringify(j).slice(0, 120)}`;
    } catch (e) { fa.refreshErr = e.message; }
  }
  return false;
}
async function call(path, opts = {}) {
  if (!fa.enabled) throw new Error("no FOMO_COOKIE");
  if (accessExp && nowS() > accessExp - 120) await doRefresh();
  fa.calls++;
  // the browser sends privy-token + privy-session + privy-refresh-token cookies with an Origin of the app; a bare token gets 430 unauthorized
  const cookie = [`privy-token=${access}`, `privy-session=privy.fomo.family`, refresh ? `privy-refresh-token=${refresh}` : null].filter(Boolean).join("; ");
  const r = await fetch(B + path, { ...opts, headers: { ...(opts.headers || {}), cookie, authorization: `Bearer ${access}`, accept: "application/json, text/plain, */*", origin: "https://fomo.family", referer: "https://fomo.family/discover", "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", "accept-language": "en-GB,en;q=0.9" }, signal: AbortSignal.timeout(15000) });
  if (r.status === 430) { fa.lastErr = `430 unauthorized on ${path.split("?")[0]} (token ${accessExp && nowS() > accessExp ? "expired" : "valid"})`; }
  if (r.status === 401 || r.status === 403) { if (await doRefresh()) return call(path, { ...opts, _retried: true }); }
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { throw new Error(`HTTP ${r.status}: ${t.slice(0, 80)}`); }
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(j.message || t).slice(0, 120)}`);
  fa.lastOk = nowS(); return j.responseObject ?? j;
}
export const userByHandle = (h) => call(`/v2/users/userHandle/${encodeURIComponent(h)}`);
export const userById = (id) => call(`/v2/users/${id}`);
export async function usersByIds(ids) { const out = []; for (let i = 0; i < ids.length; i += 40) { const r = await call(`/v2/users?${ids.slice(i, i + 40).map((x) => "userIds=" + x).join("&")}`); out.push(...(r.users || [])); } return out; }
export const followingIds = async () => (await call(`/v2/users/current/followingIds`)).followingIds || [];
export async function probe() { // what the feed / theses endpoints want — recorded in fa.probe for the Status tab, so the shapes can be fixed from the box rather than the browser
  const tries = ["/v2/users/userHandle/Rowdy", "/v2/users/current/followingIds", "/feed?feedTypes=swap&limit=5", "/feed?feedTypes[]=swap&limit=5", "/feed?feedTypes=SWAP,THESIS&limit=5", "/feed/tradingActivity?limit=5", "/v2/theses?limit=5", "/theses?limit=5"];
  const out = {}; for (const p of tries) { try { const r = await call(p); out[p] = JSON.stringify(r).slice(0, 300); } catch (e) { out[p] = "ERR " + e.message.slice(0, 160); } }
  fa.probe = out; return out;
}
// handle sync: every watched wallet without a handle gets one from the API (by wallet is not an endpoint; handles come in from handles.txt, so this fills display names for page-added wallets)
export async function syncHandles(watched) {
  let n = 0; for (const w of watched) { if (w.handle || !w.label) continue; try { const u = await userByHandle(w.label); if (u?.address === w.wallet) { q.addWallet.run(w.wallet, u.userHandle, w.label, "api", nowS()); n++; } } catch (e) { fa.errors++; fa.lastErr = e.message; } }
  fa.handles += n; return n;
}
export function startFomoApi(watchedList) {
  if (!fa.enabled) { fa.lastErr = "FOMO_COOKIE not set"; return; }
  if (CFG.SMOKE) return;
  if (process.env.FOMO_API_ENABLED !== "1") { fa.lastErr = "API calls off (FOMO_API_ENABLED=1 to enable) — every call returns 430 from the box; see FOMO.md"; return; }
  setTimeout(() => probe().catch((e) => { fa.errors++; fa.lastErr = e.message; }), 8000);
  setInterval(() => syncHandles(watchedList()).catch((e) => { fa.errors++; fa.lastErr = e.message; }), 10 * 60_000).unref();
}
