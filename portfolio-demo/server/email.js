import { getBuyListsForDate } from "./db.js";
import { buildDailyWorkbook } from "./orders.js";
import { sendEmailWithAttachment } from "./providers/resend.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Falls back to the standing recipient if DAILY_REPORT_EMAIL isn't set on the host — still
// overridable via that env var for a different deployment.
const DEFAULT_RECIPIENT = "jake.vendrell@titanwh.com";

/**
 * Builds today's combined order workbook (equity + bonds, each in their own sheets — see
 * buildDailyWorkbook) and emails it via Resend. This is the only way the combined order book
 * leaves the system now — there's no on-site download button anymore, by design (the site shows
 * individual buy confirmations only; the daily roll-up is a report for whoever executes the bulk
 * order, not something every visitor should be able to pull).
 */
export async function sendDailyOrderReport() {
  const tradeDate = todayStr();
  const buyLists = getBuyListsForDate(tradeDate);
  const to = process.env.DAILY_REPORT_EMAIL || DEFAULT_RECIPIENT;

  if (buyLists.length === 0) {
    return { sent: false, reason: `No buy lists submitted for ${tradeDate} — nothing to send.`, tradeDate };
  }

  const equityBuys = buyLists.filter(bl => bl.assetClass !== "bond" && bl.side !== "sell");
  const equitySells = buyLists.filter(bl => bl.assetClass !== "bond" && bl.side === "sell");
  const bondBuys = buyLists.filter(bl => bl.assetClass === "bond" && bl.side !== "sell");
  const bondSells = buyLists.filter(bl => bl.assetClass === "bond" && bl.side === "sell");
  const buffer = buildDailyWorkbook(buyLists, tradeDate);
  // Buy and sell dollar amounts are opposite-direction cash flows — summing them into one figure
  // would understate/overstate activity, so buys and sells are reported (and totaled) separately.
  const totalBuyDollars = equityBuys.reduce((a, b) => a + b.dollarAmount, 0);
  const totalSellDollars = equitySells.reduce((a, b) => a + b.dollarAmount, 0);
  const totalBuyPounds = bondBuys.reduce((a, b) => a + b.dollarAmount, 0);
  const totalSellPounds = bondSells.reduce((a, b) => a + b.dollarAmount, 0);

  const parts = [];
  if (equityBuys.length) parts.push(`${equityBuys.length} equity buy(s) totaling $${totalBuyDollars.toLocaleString()}`);
  if (equitySells.length) parts.push(`${equitySells.length} equity sell(s) totaling $${totalSellDollars.toLocaleString()}`);
  if (bondBuys.length) parts.push(`${bondBuys.length} bond buy(s) totaling £${totalBuyPounds.toLocaleString()}`);
  if (bondSells.length) parts.push(`${bondSells.length} bond sell(s) totaling £${totalSellPounds.toLocaleString()}`);

  await sendEmailWithAttachment({
    to,
    subject: `Titan Wealth — combined order book for ${tradeDate}`,
    text: `${parts.join(", ")} submitted today. Combined order sheet attached — separate Bulk Order / Allocations / Portfolios sheets per asset class, buys and sells listed separately, ready for the next market open.`,
    filename: `combined_order_${tradeDate}.xlsx`,
    buffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return {
    sent: true, tradeDate, count: buyLists.length,
    equityBuyCount: equityBuys.length, equitySellCount: equitySells.length,
    bondBuyCount: bondBuys.length, bondSellCount: bondSells.length,
    totalBuyDollars, totalSellDollars, totalBuyPounds, totalSellPounds,
  };
}
