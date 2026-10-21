// Resilient logsSubscribe. One socket, any number of "mentions" subscriptions (one address each — Solana allows one per subscription).
import WebSocket from "ws";
export function openLogs({ url, label, addresses, onTx, onStatus = () => {} }) {
  let ws, pingT, idleT, backoff = 1000, lastMsg = Date.now(), closed = false; const st = { reconnects: 0, notifs: 0, subs: 0, label, open: false };
  const subs = new Map(); // request id -> address
  const connect = () => {
    if (closed) return;
    onStatus(`connecting ${url.replace(/api-key=.*/, "api-key=***")}`);
    ws = new WebSocket(url, { handshakeTimeout: 10000 });
    ws.on("open", () => {
      backoff = 1000; lastMsg = Date.now(); st.open = true; subs.clear(); let id = 1;
      for (const a of addresses()) { subs.set(id, a); ws.send(JSON.stringify({ jsonrpc: "2.0", id: id++, method: "logsSubscribe", params: [{ mentions: [a] }, { commitment: "processed" }] })); }
      st.subs = subs.size;
      pingT = setInterval(() => { try { ws.ping(); } catch {} }, 20000);
      idleT = setInterval(() => { if (Date.now() - lastMsg > 90000) { onStatus("idle 90s, reconnecting"); try { ws.terminate(); } catch {} } }, 10000);
      onStatus(`open, ${subs.size} subscriptions`);
    });
    ws.on("message", (raw) => {
      lastMsg = Date.now();
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.id != null && m.result !== undefined) return; // subscription acks
      if (m.error) { onStatus(`error ${JSON.stringify(m.error).slice(0, 120)}`); return; }
      const v = m?.params?.result?.value; if (!v) return;
      st.notifs++;
      onTx({ sig: v.signature, slot: m.params.result.context?.slot, logs: v.logs || [], err: v.err });
    });
    const down = (why) => { clearInterval(pingT); clearInterval(idleT); st.open = false; if (closed) return; st.reconnects++; onStatus(`closed (${why}); reconnect #${st.reconnects} in ${backoff}ms`); setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 30000); };
    ws.on("close", (c) => down(`close ${c}`));
    ws.on("error", (e) => { onStatus(`error ${e.message}`); try { ws.terminate(); } catch {} });
  };
  connect();
  return { st, resubscribe: () => { try { ws?.terminate(); } catch {} }, close: () => { closed = true; try { ws?.terminate(); } catch {} }, lastMsg: () => lastMsg };
}
