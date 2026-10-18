// The bot's wallet. The key is created on the box and stays in KEY_PATH (0600, outside the repo). It is never printed, logged or sent.
//   node src/wallet.mjs init      → creates the key file if missing and prints the PUBLIC address
//   node src/wallet.mjs address   → prints the public address
//   node src/wallet.mjs balance   → public address + SOL balance
import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { CFG } from "./config.mjs";

export function loadKeypair() {
  if (!existsSync(CFG.KEY_PATH)) return null;
  const arr = JSON.parse(readFileSync(CFG.KEY_PATH, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}
export function createKeypair() {
  if (existsSync(CFG.KEY_PATH)) throw new Error(`key file already exists at ${CFG.KEY_PATH} — not overwriting`);
  mkdirSync(dirname(CFG.KEY_PATH), { recursive: true, mode: 0o700 });
  try { chmodSync(dirname(CFG.KEY_PATH), 0o700); } catch {}
  const kp = Keypair.generate();
  writeFileSync(CFG.KEY_PATH, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  chmodSync(CFG.KEY_PATH, 0o600);
  return kp;
}
export const address = () => loadKeypair()?.publicKey.toBase58() || null;

if (process.argv[1] && process.argv[1].endsWith("wallet.mjs")) {
  const cmd = process.argv[2] || "address";
  if (cmd === "init") {
    const kp = existsSync(CFG.KEY_PATH) ? loadKeypair() : createKeypair();
    console.log(`wallet ${existsSync(CFG.KEY_PATH) ? "ready" : "created"} — public address: ${kp.publicKey.toBase58()}`);
    console.log(`key file: ${CFG.KEY_PATH} (never share this file)`);
  } else if (cmd === "address") {
    const a = address(); console.log(a ? `public address: ${a}` : `no wallet yet — run: node src/wallet.mjs init`);
  } else if (cmd === "balance") {
    const kp = loadKeypair(); if (!kp) { console.log("no wallet yet — run: node src/wallet.mjs init"); process.exit(1); }
    const c = new Connection(CFG.RPC_URL, "confirmed"); const b = await c.getBalance(kp.publicKey);
    console.log(`public address: ${kp.publicKey.toBase58()}\nbalance: ${(b / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  } else console.log("usage: node src/wallet.mjs init | address | balance");
}
