import WebSocket from "ws";
import { CFG } from "./config.js";
/** Resilient logsSubscribe to the pump.fun program. onTx({sig, slot, logs, err}) */
export function subscribeLogs(onTx, onStatus = () => {}) {
  let i = 0, ws, pingT, idleT, backoff = 1000, reconnects = 0, lastMsg = Date.now();
  const connect = () => {
    const url = CFG.WS_URLS[i % CFG.WS_URLS.length];
    onStatus(`connecting ${url.replace(/api-key=.*/, "api-key=***")}`);
    ws = new WebSocket(url, { handshakeTimeout: 10000 });
    ws.on("open", () => {
      backoff = 1000; lastMsg = Date.now();
      ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "logsSubscribe",
        params: [{ mentions: [CFG.PUMP_PROGRAM] }, { commitment: "processed" }] }));
      pingT = setInterval(() => { try { ws.ping(); } catch {} }, 20000);
      idleT = setInterval(() => { if (Date.now() - lastMsg > 60000) { onStatus("idle 60s, reconnecting"); try { ws.terminate(); } catch {} } }, 10000);
      onStatus("open");
    });
    ws.on("message", (raw) => {
      lastMsg = Date.now();
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.id === 1) return onStatus(`subscribed id=${m.result}`);
      const v = m?.params?.result?.value; if (!v) return;
      onTx({ sig: v.signature, slot: m.params.result.context?.slot, logs: v.logs, err: v.err });
    });
    const down = (why) => {
      clearInterval(pingT); clearInterval(idleT);
      reconnects++; i++;
      onStatus(`closed (${why}); reconnect #${reconnects} in ${backoff}ms`);
      setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 30000);
    };
    ws.on("close", (c) => down(`close ${c}`));
    ws.on("error", (e) => { onStatus(`error ${e.message}`); try { ws.terminate(); } catch {} });
  };
  connect();
  return { stats: () => ({ reconnects }) };
}
