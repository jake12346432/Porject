import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { insertBuyList, getBuyListsForDate } from "./db.js";
import { getQuotes } from "./quotes.js";
import { buildBuyList, buildDailyWorkbook } from "./orders.js";
import { promptToPortfolioConfig } from "./ai.js";
import { siteAuth } from "./auth.js";
import { sendDailyOrderReport } from "./email.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");

const app = express();
app.use(cors());
app.use(express.json());
app.use(siteAuth);

const PORT = process.env.PORT || 8787;

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, today: todayStr() });
});

// Fetch live-ish quotes for a batch of {ticker, exch} holdings, without
// saving anything. Not currently called by the frontend, kept for debugging.
app.post("/api/quotes", async (req, res) => {
  const { holdings } = req.body || {};
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return res.status(400).json({ error: "Body must include a non-empty 'holdings' array of {ticker, exch}." });
  }
  try {
    const quotes = await getQuotes(holdings);
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
    const quotes = await getQuotes(holdings);
    const buyList = buildBuyList({ portfolioName, dollarAmount, holdings }, quotes);
    if (buyList.error) return res.status(422).json(buyList);

    const tradeDate = todayStr();
    const id = insertBuyList({
      tradeDate,
      assetClass: "equity",
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

// Bonds have no live quote feed — bondData.js already bakes in a price for each instrument, so
// the frontend prices and sizes the order itself (see BondPortfolioBuilder.jsx) and this endpoint
// just validates and PERSISTS the already-priced result, no server-side pricing step needed.
app.post("/api/buy-bonds", (req, res) => {
  const { portfolioName, poundAmount, holdings, totalAllocated, cash } = req.body || {};
  if (!portfolioName || typeof poundAmount !== "number" || poundAmount <= 0 || !Array.isArray(holdings) || holdings.length === 0) {
    return res.status(400).json({ error: "Body must include portfolioName, a positive poundAmount, and a non-empty holdings array." });
  }
  if (typeof totalAllocated !== "number" || typeof cash !== "number") {
    return res.status(400).json({ error: "Body must include numeric totalAllocated and cash." });
  }
  try {
    const tradeDate = todayStr();
    const id = insertBuyList({
      tradeDate,
      assetClass: "bond",
      portfolioName,
      dollarAmount: poundAmount,
      totalAllocated,
      cash,
      holdings,
    });
    res.json({ id, tradeDate, portfolioName, poundAmount, holdings, totalAllocated, cash });
  } catch (err) {
    res.status(502).json({ error: "Failed to save bond buy list: " + err.message });
  }
});

// Quick summary of what's been submitted for a given day (defaults to today).
// Not surfaced in the UI — the daily roll-up goes out by email (see
// /api/daily-orders/email-report below) rather than being downloadable by
// anyone who opens the site. Kept as a manual fallback for checking state.
app.get("/api/daily-orders/summary", (req, res) => {
  const date = req.query.date || todayStr();
  const buyLists = getBuyListsForDate(date);
  const equity = buyLists.filter(bl => bl.assetClass !== "bond");
  const bonds = buyLists.filter(bl => bl.assetClass === "bond");
  res.json({
    tradeDate: date,
    count: buyLists.length,
    totalDollars: equity.reduce((a, b) => a + b.dollarAmount, 0),
    totalPounds: bonds.reduce((a, b) => a + b.dollarAmount, 0),
    portfolios: buyLists.map(bl => ({
      id: bl.id,
      assetClass: bl.assetClass,
      portfolioName: bl.portfolioName,
      createdAt: bl.createdAt,
      amount: bl.dollarAmount,
      holdingCount: bl.holdings.length,
    })),
  });
});

// Downloads the combined bulk-order workbook for a given day (defaults to
// today). Manual fallback only — not linked from the UI; the daily email is
// the intended delivery path.
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

// Builds today's combined order workbook and emails it to DAILY_REPORT_EMAIL
// via Resend. Meant to be triggered by an external scheduler (a GitHub
// Actions cron job — see .github/workflows/daily-order-email.yml) rather
// than a person clicking a button; an external trigger also has the useful
// side effect of waking this service up if Render's free tier had it asleep.
// Protected by the same site password as everywhere else (Basic Auth) — the
// scheduler sends credentials the same way a browser would.
app.post("/api/daily-orders/email-report", async (req, res) => {
  try {
    const result = await sendDailyOrderReport();
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

// Turns a plain-English portfolio request into the filter-panel JSON config,
// via a server-side Claude API call — keeps the API key off the browser
// entirely (the frontend never had one; this used to call api.anthropic.com
// directly from client JS, which can't work at all — no CORS, no key).
app.post("/api/ai/portfolio-config", async (req, res) => {
  const { prompt, sectors, regions } = req.body || {};
  if (!prompt || typeof prompt !== "string" || !Array.isArray(sectors) || !Array.isArray(regions)) {
    return res.status(400).json({ error: "Body must include a 'prompt' string plus 'sectors' and 'regions' arrays." });
  }
  try {
    const config = await promptToPortfolioConfig(prompt, { sectors, regions });
    res.json({ config });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

// In production this server also serves the built frontend (`npm run build`
// output), so the whole app — UI and API — is one deployable service behind
// one password gate. In local dev the frontend instead runs separately via
// `npm run dev` (Vite), so `dist/` won't exist yet — that's fine, this is
// skipped and only the API runs here.
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // Express 5 removed bare "*" route patterns, so this fallback (for
  // client-side routes with no matching static file) is a plain middleware
  // instead of app.get("*", ...).
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
  console.log("Serving built frontend from", DIST_DIR);
}

app.listen(PORT, () => {
  console.log(`Buy-list server listening on http://localhost:${PORT}`);
});
