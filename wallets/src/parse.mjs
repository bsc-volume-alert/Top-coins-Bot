// parse.mjs — turns one Solana transaction (standard RPC getTransaction, "jsonParsed" or "json") into what happened to ONE coin:
// who bought, who sold, how much SOL, and plain wallet-to-wallet transfers. Pure functions, no network.
//
// Method (balance changes only — works on any exchange or launchpad, no program-specific decoding):
//   for every account owner in the transaction: change in the coin, change in SOL (wrapped SOL + native lamports).
//   VENUE  = a non-signer whose coin change and SOL change have opposite signs (a pool or bonding curve: gives coin, takes SOL).
//   TRADER = any other owner whose coin balance changed in a transaction that has a venue.
//   No venue → the coin moved between wallets without a sale: recorded as a TRANSFER (a strong link between wallets).
export const WSOL = "So11111111111111111111111111111111111111112";
const DUST = 1e-9;

export function parseTx(tx, mint) {
  const meta = tx?.meta; if (!tx || !meta || meta.err) return null;
  const msg = tx.transaction?.message; if (!msg?.accountKeys?.length) return null;
  let keys, signers;
  if (typeof msg.accountKeys[0] === "string") {
    keys = [...msg.accountKeys, ...(meta.loadedAddresses?.writable || []), ...(meta.loadedAddresses?.readonly || [])];
    signers = new Set(keys.slice(0, msg.header?.numRequiredSignatures ?? 1));
  } else { keys = msg.accountKeys.map((k) => k.pubkey); signers = new Set(msg.accountKeys.filter((k) => k.signer).map((k) => k.pubkey)); }
  const payer = keys[0];
  const native = new Map();
  for (let i = 0; i < keys.length; i++) { const d = (meta.postBalances?.[i] ?? 0) - (meta.preBalances?.[i] ?? 0); if (d) native.set(keys[i], (native.get(keys[i]) || 0) + d / 1e9); }
  const coin = new Map(), wsol = new Map();
  const add = (arr, sign) => { for (const b of arr || []) {
    if (b.mint !== mint && b.mint !== WSOL) continue;
    const owner = b.owner || keys[b.accountIndex]; const amt = Number(b.uiTokenAmount?.uiAmountString ?? b.uiTokenAmount?.uiAmount ?? 0);
    if (!owner || !Number.isFinite(amt) || !amt) continue;
    const m = b.mint === mint ? coin : wsol; m.set(owner, (m.get(owner) || 0) + sign * amt); } };
  add(meta.preTokenBalances, -1); add(meta.postTokenBalances, +1);
  const moved = [...coin].filter(([, d]) => Math.abs(d) > DUST);
  if (!moved.length) return { kind: "none", payer, trades: [], transfers: [] };
  const quote = (o) => (wsol.get(o) || 0) + (native.get(o) || 0);
  const venues = [], users = [];
  for (const [o, dM] of moved) { const dQ = quote(o); if (!signers.has(o) && Math.abs(dQ) > 1e-6 && Math.sign(dQ) !== Math.sign(dM)) venues.push({ o, dM, dQ }); else users.push({ o, dM }); }
  if (venues.length) {
    const sol = venues.reduce((a, v) => a + Math.abs(v.dQ), 0), tok = venues.reduce((a, v) => a + Math.abs(v.dM), 0);
    if (!users.length) return { kind: "arb", payer, trades: [], transfers: [] };
    const price = tok > 0 ? sol / tok : 0;
    return { kind: "trade", payer, price, venues: venues.map((v) => v.o), transfers: [],
      trades: users.map((u) => ({ wallet: u.o, side: u.dM > 0 ? "buy" : "sell", tokens: Math.abs(u.dM), sol: Math.abs(u.dM) * price, signer: signers.has(u.o) ? 1 : 0 })) };
  }
  const from = users.filter((u) => u.dM < 0), to = users.filter((u) => u.dM > 0);
  const transfers = to.length
    ? to.map((t) => ({ from: from.length === 1 ? from[0].o : from.length ? "multi" : "", to: t.o, tokens: t.dM }))
    : from.map((f) => ({ from: f.o, to: "", tokens: -f.dM }));
  return { kind: "transfer", payer, trades: [], transfers };
}

/** who first sent SOL to `wallet` in its oldest transaction: the account with the largest SOL outflow while the wallet gained */
export function funderOf(tx, wallet) {
  const meta = tx?.meta; const msg = tx?.transaction?.message; if (!meta || !msg) return null;
  const keys = typeof msg.accountKeys[0] === "string" ? [...msg.accountKeys, ...(meta.loadedAddresses?.writable || []), ...(meta.loadedAddresses?.readonly || [])] : msg.accountKeys.map((k) => k.pubkey);
  let gained = 0, best = null, bestD = 0;
  for (let i = 0; i < keys.length; i++) { const d = ((meta.postBalances?.[i] ?? 0) - (meta.preBalances?.[i] ?? 0)) / 1e9; if (keys[i] === wallet) gained = d; else if (d < bestD) { bestD = d; best = keys[i]; } }
  if (gained <= 0 || !best) return null;
  return { funder: best, sol: +gained.toFixed(6) };
}
