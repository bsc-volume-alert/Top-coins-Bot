// The launch wallet. Created on the box; the key stays in KEY_PATH (0600, outside the repo). It is never printed, logged or sent — only the PUBLIC address is shown.
//   node src/wallet.mjs init      → creates the key file if missing and prints the public address
//   node src/wallet.mjs address   → prints the public address
//   node src/wallet.mjs balance   → public address + SOL balance
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { CFG } from "./config.mjs";

export function loadKeypair() { if (!existsSync(CFG.KEY_PATH)) return null; return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(CFG.KEY_PATH, "utf8")))); }
export function ensureKeypair() {
  if (existsSync(CFG.KEY_PATH)) return loadKeypair();
  mkdirSync(dirname(CFG.KEY_PATH), { recursive: true, mode: 0o700 }); try { chmodSync(dirname(CFG.KEY_PATH), 0o700); } catch {}
  const kp = Keypair.generate(); writeFileSync(CFG.KEY_PATH, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 }); chmodSync(CFG.KEY_PATH, 0o600); return kp;
}
/** shadow mode only: the PUBLIC key of a funded wallet (bytes 32–63 of a Solana key file are the public key), used as the simulated payer while ours is empty. No secret is kept. */
// 0.1.4: the executor wallet holds only ~0.02 SOL — too little to simulate a 0.1 SOL launch — so the stand-in is a well-funded public address
// (pump.fun's first fee recipient in its own SDK). Simulation only: nothing is signed, nothing is sent, nothing changes on chain.
export function simPayer() { try { return new PublicKey(process.env.LAUNCH_SIM_PAYER || "62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV"); } catch { return null; } }

if (process.argv[1] && process.argv[1].endsWith("wallet.mjs")) {
  const cmd = process.argv[2] || "address";
  if (cmd === "init") { const had = existsSync(CFG.KEY_PATH); const kp = ensureKeypair(); console.log(`launch wallet ${had ? "ready" : "created"} — public address: ${kp.publicKey.toBase58()}`); }
  else if (cmd === "address") { const kp = loadKeypair(); console.log(kp ? `public address: ${kp.publicKey.toBase58()}` : "no launch wallet yet — run: node src/wallet.mjs init"); }
  else if (cmd === "balance") { const kp = loadKeypair(); if (!kp) { console.log("no launch wallet yet"); process.exit(1); } const b = await new Connection(CFG.RPC_URL, "confirmed").getBalance(kp.publicKey); console.log(`public address: ${kp.publicKey.toBase58()}\nbalance: ${(b / 1e9).toFixed(4)} SOL`); }
  else console.log("usage: node src/wallet.mjs init | address | balance");
}
