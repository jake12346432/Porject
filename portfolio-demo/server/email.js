import { getBuyListsForDate } from "./db.js";
import { buildDailyWorkbook } from "./orders.js";
import { sendEmailWithAttachment } from "./providers/resend.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Builds today's combined order workbook and emails it to DAILY_REPORT_EMAIL
 * via Resend. This is the only way the combined order book leaves the
 * system now — there's no on-site download button anymore, by design (the
 * site shows individual buy confirmations only; the daily roll-up is a
 * report for whoever executes the bulk order, not something every visitor
 * should be able to pull).
 */
export async function sendDailyOrderReport() {
  const tradeDate = todayStr();
  const buyLists = getBuyListsForDate(tradeDate);
  const to = process.env.DAILY_REPORT_EMAIL;

  if (buyLists.length === 0) {
    return { sent: false, reason: `No buy lists submitted for ${tradeDate} — nothing to send.`, tradeDate };
  }

  const buffer = buildDailyWorkbook(buyLists, tradeDate);
  const totalDollars = buyLists.reduce((a, b) => a + b.dollarAmount, 0);

  await sendEmailWithAttachment({
    to,
    subject: `Titan Wealth — combined order book for ${tradeDate}`,
    text: `${buyLists.length} portfolio(s) submitted today, totaling $${totalDollars.toLocaleString()}. Combined order sheet attached — Bulk Order / Allocations / Portfolios sheets, ready for the next market open.`,
    filename: `combined_order_${tradeDate}.xlsx`,
    buffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return { sent: true, tradeDate, count: buyLists.length, totalDollars };
}
