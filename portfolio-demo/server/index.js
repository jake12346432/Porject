import express from "express";
import cors from "cors";
import { insertBuyList, getBuyListsForDate } from "./db.js";
import { getQuotes } from "./quotes.js";
import { buildBuyList, buildDailyWorkbook } from "./orders.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8787;

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, today: todayStr() });
});

// Fetch live-ish quotes for a batch of tickers, without saving anything.
// Used by the frontend to show current prices before someone commits to buying.
app.post("/api/quotes", async (req, res) => {
  const { tickers } = req.body || {};
  if (!Array.isArray(tickers) || tickers.length === 0) {
    return res.status(400).json({ error: "Body must include a non-empty 'tickers' array." });
  }
  try {
    const quotes = await getQuotes(tickers);
    res.json({ quotes, asOf: new Date().toISOString() });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch quotes: " + err.message });
  }
});

// Prices a portfolio's holdings at current market prices, sizes an order,
// and PERSISTS it — this is what "hit buy" calls. Every submission today
// lands in the same day's combined order sheet, regardless of who submitted it.
app.post("/api/buy", async (req, res) => {
  const { portfolioName, dollarAmount, holdings } = req.body || {};
  if (!portfolioName || typeof dollarAmount !== "number" || dollarAmount <= 0 || !Array.isArray(holdings) || holdings.length === 0) {
    return res.status(400).json({ error: "Body must include portfolioName, a positive dollarAmount, and a non-empty holdings array." });
  }
  try {
    const quotes = await getQuotes(holdings.map(h => h.ticker));
    const buyList = buildBuyList({ portfolioName, dollarAmount, holdings }, quotes);
    if (buyList.error) return res.status(422).json(buyList);

    const tradeDate = todayStr();
    const id = insertBuyList({
      tradeDate,
      portfolioName: buyList.portfolioName,
      dollarAmount: buyList.dollarAmount,
      totalAllocated: buyList.totalAllocated,
      cash: buyList.cash,
      holdings: buyList.holdings,
    });

    res.json({ id, tradeDate, ...buyList });
  } catch (err) {
    res.status(502).json({ error: "Failed to price and save buy list: " + err.message });
  }
});

// Quick summary of what's been submitted for a given day (defaults to today) —
// powers the "Today's Combined Orders" admin panel.
app.get("/api/daily-orders/summary", (req, res) => {
  const date = req.query.date || todayStr();
  const buyLists = getBuyListsForDate(date);
  res.json({
    tradeDate: date,
    count: buyLists.length,
    totalDollars: buyLists.reduce((a, b) => a + b.dollarAmount, 0),
    portfolios: buyLists.map(bl => ({
      id: bl.id,
      portfolioName: bl.portfolioName,
      createdAt: bl.createdAt,
      dollarAmount: bl.dollarAmount,
      holdingCount: bl.holdings.length,
    })),
  });
});

// Downloads the combined bulk-order workbook for a given day (defaults to today).
app.get("/api/daily-orders", (req, res) => {
  const date = req.query.date || todayStr();
  const buyLists = getBuyListsForDate(date);
  if (buyLists.length === 0) {
    return res.status(404).json({ error: `No buy lists submitted for ${date} yet.` });
  }
  const buffer = buildDailyWorkbook(buyLists, date);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="combined_order_${date}.xlsx"`);
  res.send(buffer);
});

app.listen(PORT, () => {
  console.log(`Buy-list server listening on http://localhost:${PORT}`);
});
