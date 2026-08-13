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
 * Combines every buy list submitted for a given trade date into one workbook:
 *  - "Bulk Order": one row per ticker, net shares/dollars summed across ALL
 *    portfolios submitted that day — this is what actually gets placed as a
 *    single order at the next market open.
 *  - "Allocations": one row per (portfolio, ticker) so shares can be handed
 *    back out to the originating portfolio after the bulk order fills.
 *  - "Portfolios": one row per submitted portfolio, for a quick daily summary.
 */
export function buildDailyWorkbook(buyLists, tradeDate) {
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

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bulkRows), "Bulk Order");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allocations), "Allocations");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(portfolioRows), "Portfolios");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;
