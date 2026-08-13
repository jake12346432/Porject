import YahooFinance from "yahoo-finance2";

// v3+ of this library exports a class instead of a ready-to-use singleton —
// has to be instantiated once and reused.
const yahooFinance = new YahooFinance();

// yahoo-finance2 prints a "you should silence this warning" survey notice on
// first use in some versions; harmless, but keep server logs clean.
yahooFinance.suppressNotices?.(["yahooSurvey"]);

/**
 * Fetches current (Yahoo-delayed, ~15min) quotes for a list of ticker symbols.
 * Returns { [ticker]: { price, currency, asOf } } — tickers that fail to quote
 * are simply omitted, not thrown, so one bad symbol doesn't fail the whole batch.
 */
export async function getQuotes(tickers) {
  const unique = [...new Set(tickers)].filter(Boolean);
  const results = {};

  await Promise.all(unique.map(async (ticker) => {
    try {
      const q = await yahooFinance.quote(ticker);
      const price = q?.regularMarketPrice;
      if (typeof price === "number" && price > 0) {
        results[ticker] = {
          price,
          currency: q.currency || "USD",
          asOf: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : new Date().toISOString(),
        };
      }
    } catch (err) {
      // omitted from results; caller decides how to handle missing tickers, but
      // log the real reason so failures are diagnosable instead of silent.
      console.error(`[quotes] ${ticker} failed:`, err?.message || err);
    }
  }));

  return results;
}
