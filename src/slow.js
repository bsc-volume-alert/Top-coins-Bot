// v0.18.120 — names the synchronous jobs that stall the event loop. timed(name, fn) runs fn and remembers it when it took over 300 ms;
// the stall monitor prints the last few, so a "[stall] blocked 9 s" line says what ran (CSV export, restart flags, page snapshot…) instead of leaving us guessing.
const recent = [];
export function timed(name, fn) { const t0 = Date.now(); try { return fn(); } finally { const dt = Date.now() - t0; if (dt > 300) { recent.push(`${name} ${dt} ms @${new Date(t0).toISOString().slice(11, 19)}Z`); if (recent.length > 6) recent.shift(); console.error(`[slow] ${name} took ${dt} ms`); } } }
export const slowJobs = () => (recent.length ? recent.join(" · ") : "none over 300 ms");
