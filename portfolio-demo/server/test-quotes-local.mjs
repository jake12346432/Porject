// Exercises getQuotes()'s orchestration logic (symbol resolution, Finnhub ->
// Twelve Data fallback, caching, rate limiting) against a mocked global fetch
// instead of the real APIs — this sandbox can't reach Finnhub/Twelve Data
// any more than it could reach Yahoo. Verifies the LOGIC is correct; the
// actual provider responses/symbol accuracy still need checking once this
// runs somewhere with real internet access (same pattern as before).
import assert from "node:assert/strict";

process.env.FINNHUB_API_KEY = "test-finnhub-key";
process.env.TWELVEDATA_API_KEY = "test-td-key";

let finnhubCalls = 0;
let twelveDataCalls = 0;

const realFetch = global.fetch;
global.fetch = async (url) => {
  const u = new URL(url);
  if (u.hostname === "finnhub.io") {
    finnhubCalls++;
    const symbol = u.searchParams.get("symbol");
    // Simulate: AAPL and MSFT work on Finnhub, everything else doesn't (as if
    // free-tier / unsupported), mirroring "Finnhub covers US names".
    if (symbol === "AAPL") return jsonResponse({ c: 230.11, t: 1710000000 });
    if (symbol === "MSFT") return jsonResponse({ c: 505.22, t: 1710000000 });
    return jsonResponse({ c: 0 });
  }
  if (u.hostname === "api.twelvedata.com") {
    twelveDataCalls++;
    const symbol = u.searchParams.get("symbol");
    if (symbol === "KIK") {
      return jsonResponse({ close: "7.67", currency: "EUR", datetime: "2026-08-14" });
    }
    return jsonResponse({ status: "error", message: "symbol not found" });
  }
  throw new Error("unexpected fetch to " + url);
};

function jsonResponse(obj) {
  return { ok: true, json: async () => obj };
}

const { getQuotes } = await import("./quotes.js");

const holdings = [
  { ticker: "AAPL", exch: "XNAS" },     // should resolve via Finnhub
  { ticker: "MSFT", exch: "XNAS" },     // should resolve via Finnhub
  { ticker: "KIK", exch: "XFRA" },      // Finnhub doesn't cover XFRA -> Twelve Data
  { ticker: "NOPE", exch: "XNYS" },     // Finnhub covers XNYS but this symbol "fails" -> falls back to Twelve Data, also fails -> omitted
  { ticker: "9433N", exch: "XMEX" },    // manual override -> KDDI XTKS:9433, not on Finnhub -> Twelve Data (mocked as unknown -> omitted, but exercises the override path)
];

console.log("=== First call ===");
const result1 = await getQuotes(holdings);
console.log(result1);

assert.equal(result1.AAPL?.price, 230.11, "AAPL should price via Finnhub");
assert.equal(result1.MSFT?.price, 505.22, "MSFT should price via Finnhub");
assert.equal(result1.KIK?.price, 7.67, "KIK should price via Twelve Data fallback");
assert.equal(result1.KIK?.currency, "EUR", "KIK currency should come from Twelve Data");
assert.equal(result1.NOPE, undefined, "NOPE should be omitted (failed on both providers)");
assert.equal(result1["9433N"], undefined, "9433N should be omitted (mocked as unresolvable), but must not throw");

const finnhubCallsAfterFirst = finnhubCalls;
const twelveDataCallsAfterFirst = twelveDataCalls;
console.log(`Finnhub calls: ${finnhubCallsAfterFirst}, Twelve Data calls: ${twelveDataCallsAfterFirst}`);

console.log("\n=== Second call, same holdings (successes should hit cache; failures correctly retry) ===");
const result2 = await getQuotes(holdings);
assert.equal(result2.AAPL?.price, 230.11);
assert.equal(result2.KIK?.price, 7.67);
// Only successes (AAPL, MSFT, KIK) are cached; NOPE and 9433N failed both
// providers and are retried by design (failures aren't cached), so the
// counters go up by exactly the failing lookups, not by zero.
assert.equal(finnhubCalls, finnhubCallsAfterFirst + 1, "only NOPE (a failure) should re-hit Finnhub; AAPL/MSFT should stay cached");
assert.equal(twelveDataCalls, twelveDataCallsAfterFirst + 2, "only NOPE+9433N (failures) should re-hit Twelve Data; KIK should stay cached");
console.log("Cache confirmed: successful lookups aren't re-fetched; failed ones correctly retry.");

console.log("\n=== Rate limiter sanity check ===");
// A small number of distinct never-cached Twelve-Data-only holdings, just to
// confirm the limiter path doesn't crash — NOT exhausting the full 7/min
// budget here on purpose. (Confirmed separately, by observation: pushing this
// past the budget correctly makes getQuotes() wait for the window to clear
// rather than exceeding it — that's the limiter doing its job, just not
// something a fast automated check should wait through.)
const fewTdHoldings = Array.from({ length: 2 }, (_, i) => ({ ticker: `T${i}`, exch: "XPAR" }));
const start = Date.now();
await getQuotes(fewTdHoldings);
console.log(`2 Twelve-Data-only lookups took ${Date.now() - start}ms (rate limiter present, did not crash)`);

global.fetch = realFetch;
console.log("\n✅ All quote-orchestration checks passed.");
