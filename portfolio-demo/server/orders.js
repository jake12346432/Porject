import * as XLSX from "xlsx";

// json_to_sheet leaves every column at Excel's default ~8.4-char width, so
// tickers/ISINs/company names get clipped until someone manually double-clicks
// each column border. Auto-sizing off the actual header + cell text fixes that
// without needing a person to touch formatting every time the sheet is opened.
function autoSizeColumns(rows) {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map(key => {
    const maxLen = rows.reduce((max, row) => {
      const len = row[key] == null ? 0 : String(row[key]).length;
      return Math.max(max, len);
    }, key.length);
    return { wch: Math.min(maxLen + 2, 40) };
  });
}

function sheetFrom(rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = autoSizeColumns(rows);
  return ws;
}

/**
 * Turns a portfolio's target holdings + weights into a priced, sized buy list.
 * Only holdings with an available quote are included; weights are renormalized
 * among just the quoted subset (mirrors the original client-side lockPortfolio logic).
 * `exch` is carried through onto every priced holding (not just used to look up the quote) so a
 * later sell — which needs to requote the same tickers — has what it needs without asking the
 * client to remember exchange codes for a portfolio bought days ago.
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
      exch: h.exch,
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
 * Liquidates an existing equity holding set at current prices — the sell-side mirror of
 * buildBuyList. There's no "target amount" here (selling isn't sized against a goal, it's sizing
 * against what's actually held), so dollarAmount/totalAllocated end up equal and cash is always 0.
 */
export function buildSellList({ portfolioName, holdings }, quotes) {
  const withPrice = holdings.filter(h => quotes[h.ticker]);
  if (withPrice.length === 0) {
    return { error: "No live prices available to sell any holding in this portfolio." };
  }
  const priced = withPrice.map(h => {
    const { price, currency, asOf } = quotes[h.ticker];
    return {
      ticker: h.ticker,
      exch: h.exch,
      name: h.name,
      sector: h.sector || "",
      country: h.country || "",
      price,
      currency,
      asOf,
      shares: h.shares,
      amount: h.shares * price,
    };
  });
  const totalAllocated = priced.reduce((a, h) => a + h.amount, 0);
  priced.forEach(h => { h.weight = totalAllocated > 0 ? (h.amount / totalAllocated) * 100 : 0; });
  const skipped = holdings.length - withPrice.length;

  return {
    portfolioName,
    dollarAmount: totalAllocated,
    holdings: priced,
    totalAllocated,
    cash: 0,
    skippedCount: skipped,
  };
}

/**
 * Combines every buy/sell list submitted for a given trade date into one workbook, one set of
 * sheets per asset class actually submitted that day (equity uses tickers/shares/dollars; bonds
 * use ISIN/coupon/maturity/YTM/duration and pounds — different enough fields that forcing them
 * into one shared sheet shape would lose information, so each class gets its own three-sheet
 * block):
 *  - "Bulk Order": one row per (instrument, side), net amount summed across ALL portfolios
 *    submitted that day for that asset class and side — this is what actually gets placed as
 *    orders at the next market open. Buys and sells are listed separately, not netted against
 *    each other, so a buy and a sell of the same instrument on the same day both show up rather
 *    than silently cancelling out.
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

function sideLabel(side) {
  return side === "sell" ? "Sell" : "Buy";
}

function appendEquitySheets(wb, buyLists) {
  const byTickerSide = new Map();
  const allocations = [];
  const portfolioRows = [];

  for (const bl of buyLists) {
    portfolioRows.push({
      "Portfolio": bl.portfolioName,
      "Side": sideLabel(bl.side),
      "Submitted At": bl.createdAt,
      "Target $": round2(bl.dollarAmount),
      "Allocated $": round2(bl.totalAllocated),
      "Cash $": round2(bl.cash),
      "Holdings": bl.holdings.length,
    });

    for (const h of bl.holdings) {
      allocations.push({
        "Portfolio": bl.portfolioName,
        "Side": sideLabel(bl.side),
        "Ticker": h.ticker,
        "Company": h.name,
        "Shares": round4(h.shares),
        "Price": round2(h.price),
        "Amount $": round2(h.amount),
        "Weight %": round2(h.weight),
      });

      const key = `${h.ticker}|${bl.side}`;
      const existing = byTickerSide.get(key) || {
        ticker: h.ticker, side: bl.side, name: h.name, shares: 0, amount: 0, portfolios: new Set(), price: h.price,
      };
      existing.shares += h.shares;
      existing.amount += h.amount;
      existing.portfolios.add(bl.portfolioName);
      existing.price = h.price; // most recent price wins
      byTickerSide.set(key, existing);
    }
  }

  const bulkRows = [...byTickerSide.values()]
    .sort((a, b) => b.amount - a.amount)
    .map(t => ({
      "Ticker": t.ticker,
      "Side": sideLabel(t.side),
      "Company": t.name,
      "Total Shares": round4(t.shares),
      "Whole Shares (round down)": Math.floor(t.shares),
      "Latest Price": round2(t.price),
      "Total Amount $": round2(t.amount),
      "# Portfolios": t.portfolios.size,
    }));

  XLSX.utils.book_append_sheet(wb, sheetFrom(bulkRows), "Equity Bulk Order");
  XLSX.utils.book_append_sheet(wb, sheetFrom(allocations), "Equity Allocations");
  XLSX.utils.book_append_sheet(wb, sheetFrom(portfolioRows), "Equity Portfolios");
}

function appendBondSheets(wb, buyLists) {
  const byIsinSide = new Map();
  const allocations = [];
  const portfolioRows = [];

  for (const bl of buyLists) {
    portfolioRows.push({
      "Portfolio": bl.portfolioName,
      "Side": sideLabel(bl.side),
      "Submitted At": bl.createdAt,
      "Target £": round2(bl.dollarAmount),
      "Allocated £": round2(bl.totalAllocated),
      "Cash £": round2(bl.cash),
      "Holdings": bl.holdings.length,
    });

    for (const h of bl.holdings) {
      allocations.push({
        "Portfolio": bl.portfolioName,
        "Side": sideLabel(bl.side),
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

      const key = `${h.isin}|${bl.side}`;
      const existing = byIsinSide.get(key) || {
        isin: h.isin, side: bl.side, name: h.name, amount: 0, portfolios: new Set(), price: h.price,
      };
      existing.amount += h.amount;
      existing.portfolios.add(bl.portfolioName);
      existing.price = h.price; // most recent price wins
      byIsinSide.set(key, existing);
    }
  }

  const bulkRows = [...byIsinSide.values()]
    .sort((a, b) => b.amount - a.amount)
    .map(b => ({
      "Instrument": b.name,
      "ISIN": b.isin,
      "Side": sideLabel(b.side),
      "Latest Price": b.price != null ? round2(b.price) : "",
      "Total Amount £": round2(b.amount),
      "# Portfolios": b.portfolios.size,
    }));

  XLSX.utils.book_append_sheet(wb, sheetFrom(bulkRows), "Bond Bulk Order");
  XLSX.utils.book_append_sheet(wb, sheetFrom(allocations), "Bond Allocations");
  XLSX.utils.book_append_sheet(wb, sheetFrom(portfolioRows), "Bond Portfolios");
}

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;
