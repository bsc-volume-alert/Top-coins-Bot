// Imports every trader the owner follows on fomo as a watched wallet (runs on the box; needs FOMO_COOKIE). Writes fomo/data/following.csv for the record.
import "../src/env.mjs";
import { writeFileSync } from "node:fs";
import { followingIds, usersByIds, fa } from "../src/fomoapi.mjs";
const PORT = Number(process.env.FOMO_PORT || 8789), base = `http://127.0.0.1:${PORT}`;
const ids = await followingIds(); const users = await usersByIds(ids);
const rows = users.map((u) => [u.userHandle, u.displayName, u.address, u.evmAddress, u.id, u.followers ?? "", u.following ?? ""]);
writeFileSync("/root/tracker/data/fomo_following.csv", "handle,display,sol,evm,id,followers,following\n" + rows.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n") + "\n");
let n = 0; for (const u of users) { if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(u.address || "")) continue; try { const a = await (await fetch(`${base}/api/wallets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "add", wallet: u.address, label: u.displayName || u.userHandle, handle: u.userHandle }) })).json(); if (a.ok) n++; } catch (e) { console.log("add failed", u.userHandle, e.message); } }
console.log(`following ${ids.length}, users ${users.length}, watching ${n}; api calls ${fa.calls}, errors ${fa.errors} ${fa.lastErr}`);
process.exit(0);
