import * as XLSX from "xlsx";

/**
 * Turns a portfolio's target holdings + weights into a priced, sized buy list.
 * Only holdings with an available quote are included; weights are renormalized
 * among just the quoted subset (mirrors the original client-side lockPortfolio logic).
 */
export function buildBuyList({ portfolioName, dollarAmount, holdings }, quotes) {
  const withPrice = holdings.filter(h => quotes[h.ticker]);
  if (withPrice.length === 0) {
    return { error: "No live prices available for any holding in this portfolio." };
  }
  const wSum = withPrice.reduce((a, h) => a + h.weight, 0) || 1;
  const priced = withPrice.map(h => {
    const w = h.weight / wSum;
    const { price, currency, asOf } = quotes[h.ticker];
    const amount = w * dollarAmount;
    return {
      ticker: h.ticker,
      name: h.name,
      sector: h.sector || "",
      country: h.country || "",
      weight: w * 100,
      price,
      currency,
      asOf,
      shares: amount / price,
      amount,
    };
  });
  const totalAllocated = priced.reduce((a, h) => a + h.amount, 0);
  const skipped = holdings.length - withPrice.length;

  return {
    portfolioName,
    dollarAmount,
    holdings: priced,
    totalAllocated,
    cash: dollarAmount - totalAllocated,
    skippedCount: skipped,
  };
}

/**
 * Combines every buy list submitted for a given trade date into one workbook, one set of sheets
 * per asset class actually submitted that day (equity uses tickers/shares/dollars; bonds use
 * ISIN/coupon/maturity/YTM/duration and pounds — different enough fields that forcing them into
 * one shared sheet shape would lose information, so each class gets its own three-sheet block):
 *  - "Bulk Order": one row per instrument, net amount summed across ALL portfolios submitted
 *    that day for that asset class — this is what actually gets placed as a single order at the
 *    next market open.
 *  - "Allocations": one row per (portfolio, instrument) so the position can be handed back out to
 *    the originating portfolio after the bulk order fills.
 *  - "Portfolios": one row per submitted portfolio in that asset class, for a quick daily summary.
 */
export function buildDailyWorkbook(buyLists, tradeDate) {
  const wb = XLSX.utils.book_new();
  const equityLists = buyLists.filter(bl => bl.assetClass !== "bond");
  const bondLists = buyLists.filter(bl => bl.assetClass === "bond");

  if (equityLists.length) appendEquitySheets(wb, equityLists);
  if (bondLists.length) appendBondSheets(wb, bondLists);

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function appendEquitySheets(wb, buyLists) {
  const byTicker = new Map();
  const allocations = [];
  const portfolioRows = [];

  for (const bl of buyLists) {
    portfolioRows.push({
      "Portfolio": bl.portfolioName,
      "Submitted At": bl.createdAt,
      "Target $": round2(bl.dollarAmount),
      "Allocated $": round2(bl.totalAllocated),
      "Cash $": round2(bl.cash),
      "Holdings": bl.holdings.length,
    });

    for (const h of bl.holdings) {
      allocations.push({
        "Portfolio": bl.portfolioName,
        "Ticker": h.ticker,
        "Company": h.name,
        "Shares": round4(h.shares),
        "Price": round2(h.price),
        "Amount $": round2(h.amount),
        "Weight %": round2(h.weight),
      });

      const existing = byTicker.get(h.ticker) || {
        ticker: h.ticker, name: h.name, shares: 0, amount: 0, portfolios: new Set(), price: h.price,
      };
      existing.shares += h.shares;
      existing.amount += h.amount;
      existing.portfolios.add(bl.portfolioName);
      existing.price = h.price; // most recent price wins
      byTicker.set(h.ticker, existing);
    }
  }

  const bulkRows = [...byTicker.values()]
    .sort((a, b) => b.amount - a.amount)
    .map(t => ({
      "Ticker": t.ticker,
      "Company": t.name,
      "Total Shares": round4(t.shares),
      "Whole Shares (round down)": Math.floor(t.shares),
      "Latest Price": round2(t.price),
      "Total Amount $": round2(t.amount),
      "# Portfolios": t.portfolios.size,
    }));

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bulkRows), "Equity Bulk Order");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allocations), "Equity Allocations");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(portfolioRows), "Equity Portfolios");
}

function appendBondSheets(wb, buyLists) {
  const byIsin = new Map();
  const allocations = [];
  const portfolioRows = [];

  for (const bl of buyLists) {
    portfolioRows.push({
      "Portfolio": bl.portfolioName,
      "Submitted At": bl.createdAt,
      "Target £": round2(bl.dollarAmount),
      "Allocated £": round2(bl.totalAllocated),
      "Cash £": round2(bl.cash),
      "Holdings": bl.holdings.length,
    });

    for (const h of bl.holdings) {
      allocations.push({
        "Portfolio": bl.portfolioName,
        "Instrument": h.name,
        "ISIN": h.isin,
        "Region": h.region,
        "Sector": h.sector,
        "Coupon %": h.coupon != null ? round2(h.coupon) : "",
        "Maturity": h.maturity,
        "YTM %": round2(h.ytm),
        "Duration (y)": round2(h.duration),
        "Price": h.price != null ? round2(h.price) : "",
        "Amount £": round2(h.amount),
        "Weight %": round2(h.weight),
      });

      const existing = byIsin.get(h.isin) || {
        isin: h.isin, name: h.name, amount: 0, portfolios: new Set(), price: h.price,
      };
      existing.amount += h.amount;
      existing.portfolios.add(bl.portfolioName);
      existing.price = h.price; // most recent price wins
      byIsin.set(h.isin, existing);
    }
  }

  const bulkRows = [...byIsin.values()]
    .sort((a, b) => b.amount - a.amount)
    .map(b => ({
      "Instrument": b.name,
      "ISIN": b.isin,
      "Latest Price": b.price != null ? round2(b.price) : "",
      "Total Amount £": round2(b.amount),
      "# Portfolios": b.portfolios.size,
    }));

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bulkRows), "Bond Bulk Order");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allocations), "Bond Allocations");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(portfolioRows), "Bond Portfolios");
}

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;
