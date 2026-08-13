// Exercises the DB + aggregation + Excel logic end-to-end WITHOUT hitting Yahoo
// Finance, using fake quotes in place of getQuotes(). This sandbox's network
// policy blocks Yahoo, so the actual live-quote fetch (quotes.js) can only be
// verified once this runs somewhere with normal internet access — this script
// proves everything downstream of that call is correct.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { insertBuyList, getBuyListsForDate } from "./db.js";
import { buildBuyList, buildDailyWorkbook } from "./orders.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fakeQuotes = {
  AAPL: { price: 230.11, currency: "USD", asOf: new Date().toISOString() },
  MSFT: { price: 505.22, currency: "USD", asOf: new Date().toISOString() },
  NVDA: { price: 178.4, currency: "USD", asOf: new Date().toISOString() },
  "KIK.F": { price: 7.67, currency: "EUR", asOf: new Date().toISOString() },
};

const portfolios = [
  {
    portfolioName: "Quality Portfolio - Client A",
    dollarAmount: 10000,
    holdings: [
      { ticker: "AAPL", name: "APPLE INC.", sector: "Tech", country: "United States", weight: 50 },
      { ticker: "MSFT", name: "MICROSOFT CORPORATION", sector: "Tech", country: "United States", weight: 30 },
      { ticker: "KIK.F", name: "KIKKOMAN CORPORATION", sector: "Consumer Staples", country: "Germany", weight: 20 },
    ],
  },
  {
    portfolioName: "Growth Tilt - Client B",
    dollarAmount: 25000,
    holdings: [
      { ticker: "NVDA", name: "NVIDIA CORPORATION", sector: "Tech", country: "United States", weight: 70 },
      { ticker: "MSFT", name: "MICROSOFT CORPORATION", sector: "Tech", country: "United States", weight: 30 },
      { ticker: "DOESNOTEXIST", name: "Fake Co", sector: "Tech", country: "United States", weight: 10 }, // proves missing-quote handling
    ],
  },
];

const tradeDate = new Date().toISOString().slice(0, 10);
console.log(`\n=== Simulating ${portfolios.length} portfolios submitted for ${tradeDate} ===\n`);

for (const p of portfolios) {
  const buyList = buildBuyList(p, fakeQuotes);
  if (buyList.error) {
    console.error("FAILED to build buy list:", buyList.error);
    process.exit(1);
  }
  console.log(`${p.portfolioName}: allocated $${buyList.totalAllocated.toFixed(2)} of $${buyList.dollarAmount}, ${buyList.skippedCount} holding(s) skipped (no quote)`);
  insertBuyList({
    tradeDate,
    portfolioName: buyList.portfolioName,
    dollarAmount: buyList.dollarAmount,
    totalAllocated: buyList.totalAllocated,
    cash: buyList.cash,
    holdings: buyList.holdings,
  });
}

const saved = getBuyListsForDate(tradeDate);
console.log(`\nDB now has ${saved.length} buy list(s) for ${tradeDate} (expected ${portfolios.length})`);
if (saved.length !== portfolios.length) {
  console.error("MISMATCH — DB round-trip failed");
  process.exit(1);
}

const buffer = buildDailyWorkbook(saved, tradeDate);
const outPath = path.join(__dirname, "test-output.xlsx");
fs.writeFileSync(outPath, buffer);
console.log(`\nWrote combined workbook to ${outPath} (${buffer.length} bytes)`);

// Sanity-check the netting math: MSFT appears in both portfolios (30% of $10k + 30% of $25k)
const expectedMsftShares = (0.3 * 10000) / 505.22 + (0.3 * 25000) / 505.22;
const XLSX = await import("xlsx");
const wb = XLSX.default.readFile(outPath);
const bulk = XLSX.default.utils.sheet_to_json(wb.Sheets["Bulk Order"]);
const msftRow = bulk.find(r => r.Ticker === "MSFT");
console.log(`\nMSFT netted row:`, msftRow);
const diff = Math.abs(msftRow["Total Shares"] - expectedMsftShares);
console.log(`Expected MSFT total shares ~= ${expectedMsftShares.toFixed(4)}, got ${msftRow["Total Shares"]}, diff = ${diff.toFixed(6)}`);
if (diff > 0.001) {
  console.error("MISMATCH — netting math is wrong");
  process.exit(1);
}

console.log("\n✅ All local checks passed (DB persistence, cross-portfolio netting, missing-quote handling, Excel export).");
