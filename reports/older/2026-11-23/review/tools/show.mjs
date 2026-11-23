import { readCsv } from "./lib.mjs";
const D = process.argv[2], sb = readCsv(D + "/scoreboard.csv"), want = process.argv[3] || "first buys";
const pad = (s, n) => String(s ?? "").padEnd(n).slice(0, n);
console.log(pad("book", 14), "cls  mints net     mean%  med%  win%  l40%  2x/fol  exB1    exB3    h1     h2     open  DD    expo");
for (const r of sb.filter((r) => r.buys === want)) console.log(pad(r.book, 14), pad(r.closed_measured, 4), pad(r.mints, 5), pad(r.net_sol, 7), pad(r.mean_ret_pct, 6), pad(r.median_ret_pct, 5), pad(r.win_pct, 5), pad(r.loss40_pct, 5), pad(r.reachable_2x + "/" + r.followed_24h, 7), pad(r.net_without_best1, 7), pad(r.net_without_best3, 7), pad(r.first_half_net, 6), pad(r.second_half_net, 6), pad(r.open, 5), pad(r.max_drawdown_sol, 5), r.peak_exposure_sol);
