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

  const equity = buyLists.filter(bl => bl.assetClass !== "bond");
  const bonds = buyLists.filter(bl => bl.assetClass === "bond");
  const buffer = buildDailyWorkbook(buyLists, tradeDate);
  const totalDollars = equity.reduce((a, b) => a + b.dollarAmount, 0);
  const totalPounds = bonds.reduce((a, b) => a + b.dollarAmount, 0);

  const parts = [];
  if (equity.length) parts.push(`${equity.length} equity portfolio(s) totaling $${totalDollars.toLocaleString()}`);
  if (bonds.length) parts.push(`${bonds.length} bond portfolio(s) totaling £${totalPounds.toLocaleString()}`);

  await sendEmailWithAttachment({
    to,
    subject: `Titan Wealth — combined order book for ${tradeDate}`,
    text: `${parts.join(" and ")} submitted today. Combined order sheet attached — separate Bulk Order / Allocations / Portfolios sheets per asset class, ready for the next market open.`,
    filename: `combined_order_${tradeDate}.xlsx`,
    buffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return { sent: true, tradeDate, count: buyLists.length, equityCount: equity.length, bondCount: bonds.length, totalDollars, totalPounds };
}
