// launcher 0.1.5 (owner, 30 Oct 2026 23:09 UK: "just add it in for me"): a way to hand the box a key without the owner pasting it into the console
// and without it ever being readable in the repo, which is PUBLIC. The box makes its own X25519 key pair (private half in /root/launcher/inbox.key,
// 0600, never leaves the box) and shows only the public half in status.json. A key sent to the box is encrypted to that public half
// (ephemeral X25519 + SHA-256 → AES-256-GCM) and committed as launcher/secrets.enc.json; only this box can open it. Opened values go into
// /root/launcher/.env (0600); only the names in ALLOWED are accepted. The values are never logged.
import { generateKeyPairSync, createPrivateKey, createPublicKey, diffieHellman, createHash, createDecipheriv } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { HOME } from "./config.mjs";

const KEYFILE = join(HOME, "inbox.key"), ENVFILE = join(HOME, ".env"), DONE = join(HOME, "inbox.done");
const SECRETS = new URL("../secrets.enc.json", import.meta.url).pathname;
const ALLOWED = new Set(["PINATA_JWT", "TWITTERAPI_KEY", "ANTHROPIC_API_KEY", "LAUNCH_RPC_URL"]);

export function inboxPublic() {
  if (!existsSync(KEYFILE)) { const { privateKey } = generateKeyPairSync("x25519"); writeFileSync(KEYFILE, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 }); chmodSync(KEYFILE, 0o600); }
  return createPublicKey(createPrivateKey(readFileSync(KEYFILE))).export({ type: "spki", format: "der" }).toString("base64");
}
/** Opens launcher/secrets.enc.json if it is new; returns the names applied (never the values). Exits the process after a change so pm2 restarts it with the new .env. */
export function inboxApply() {
  if (!existsSync(SECRETS)) return [];
  const raw = readFileSync(SECRETS, "utf8"), h = createHash("sha256").update(raw).digest("hex");
  if (existsSync(DONE) && readFileSync(DONE, "utf8").trim() === h) return [];
  const priv = createPrivateKey(readFileSync(KEYFILE)), myPub = createPublicKey(priv).export({ type: "spki", format: "der" });
  const applied = [];
  for (const e of JSON.parse(raw).items || []) {
    if (!ALLOWED.has(e.name)) continue;
    const epk = createPublicKey({ key: Buffer.from(e.epk, "base64"), format: "der", type: "spki" });
    const shared = diffieHellman({ privateKey: priv, publicKey: epk });
    const k = createHash("sha256").update(Buffer.concat([shared, Buffer.from(e.epk, "base64"), myPub])).digest();
    const d = createDecipheriv("aes-256-gcm", k, Buffer.from(e.iv, "base64")); d.setAuthTag(Buffer.from(e.tag, "base64"));
    const val = Buffer.concat([d.update(Buffer.from(e.ct, "base64")), d.final()]).toString("utf8").trim();
    if (!val || /[\r\n]/.test(val)) continue;
    let env = existsSync(ENVFILE) ? readFileSync(ENVFILE, "utf8") : "";
    env = env.split("\n").filter((l) => !l.startsWith(e.name + "=")).join("\n").replace(/\n*$/, "\n");
    writeFileSync(ENVFILE, env + `${e.name}=${val}\n`, { mode: 0o600 }); chmodSync(ENVFILE, 0o600);
    applied.push(e.name);
  }
  writeFileSync(DONE, h);
  return applied;
}
