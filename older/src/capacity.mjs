// capacity.mjs — request budget for the quote/price provider. Not "requests × 50 tokens": every job is budgeted separately.
/** all rates in requests per second; credits per 30-day month. */
export function budget({ hot = 0, hotEvery = 10, cold = 0, coldEvery = 60, inventories = 0, quoteEvery = 2, entriesPerDay = 0, exitsPerDay = 0, halfSalesPerDay = 0, discoveryPerMin = 2, metaTokensPerDay = 0, headroom = 0.3 } = {}) {
  const j = {
    price_scan_hot: Math.ceil(hot / 50) / hotEvery, price_scan_cold: Math.ceil(cold / 50) / coldEvery,
    position_quotes: inventories / quoteEvery,                         // one request per DISTINCT inventory, never per result row
    entry_exit_quotes: (entriesPerDay + exitsPerDay + halfSalesPerDay) * 3 / 86400, // scheduled quote + up to 2 retries inside the 5 s window
    discovery: discoveryPerMin / 60, metadata: Math.ceil(metaTokensPerDay / 100) / 86400,
  };
  const rps = Object.values(j).reduce((a, b) => a + b, 0), need = rps * (1 + headroom);
  const sec = 30 * 86400, credits = (j.price_scan_hot + j.price_scan_cold + j.position_quotes + j.entry_exit_quotes) * sec + j.discovery * sec * 5 + j.metadata * sec * 10;
  const TIERS = [["Keyless", 0.5, Infinity, 0], ["Free", 1, Infinity, 0], ["Developer", 10, 25e6, 25], ["Launch", 50, 100e6, 100], ["Pro", 150, 500e6, 500]];
  const tier = TIERS.find(([, r, c]) => r >= need && c >= credits) || ["Enterprise", null, null, null];
  return { jobs: Object.fromEntries(Object.entries(j).map(([k, v]) => [k, +v.toFixed(3)])), rps: +rps.toFixed(2), rps_with_headroom: +need.toFixed(2), credits_month: Math.round(credits), tier: tier[0], tier_usd_month: tier[3] };
}
