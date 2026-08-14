import YahooFinance from "yahoo-finance2";

// v3+ of this library exports a class instead of a ready-to-use singleton —
// has to be instantiated once and reused. Node's default fetch User-Agent
// ("node") is a trivial bot fingerprint on top of already being a
// cloud-hosting IP, so requests carry realistic browser-style headers here —
// this alone won't beat a hard IP-range block, but it's free to try and may
// help if Yahoo's blocking is scored rather than a flat IP ban.
const yahooFinance = new YahooFinance({
  fetchOptions: {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
    },
  },
});

// yahoo-finance2 prints a "you should silence this warning" survey notice on
// first use in some versions; harmless, but keep server logs clean.
yahooFinance.suppressNotices?.(["yahooSurvey"]);

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 150;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOne(ticker, results, { retryOn429 = true } = {}) {
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
    const is429 = /429|Too Many Requests/i.test(err?.message || "");
    if (is429 && retryOn429) {
      await sleep(1000);
      return fetchOne(ticker, results, { retryOn429: false });
    }
    // omitted from results; caller decides how to handle missing tickers, but
    // log the real reason so failures are diagnosable instead of silent.
    console.error(`[quotes] ${ticker} failed:`, err?.message || err);
  }
}

/**
 * Fetches current (Yahoo-delayed, ~15min) quotes for a list of ticker symbols.
 * Returns { [ticker]: { price, currency, asOf } } — tickers that fail to quote
 * are simply omitted, not thrown, so one bad symbol doesn't fail the whole batch.
 *
 * yahoo-finance2 has to negotiate a session token ("crumb") with Yahoo before
 * ANY quote request succeeds, and caches it after the first success. Firing
 * many requests at once on a cold start means they all race to negotiate that
 * token simultaneously — Yahoo rate-limits that burst with 429s across the
 * board (seen in production on a cloud host hitting this for the first time
 * after a deploy). Fetching the first ticker alone warms the cached token,
 * then the rest go through in small batches instead of all at once.
 */
export async function getQuotes(tickers) {
  const unique = [...new Set(tickers)].filter(Boolean);
  const results = {};
  if (unique.length === 0) return results;

  await fetchOne(unique[0], results);

  const rest = unique.slice(1);
  for (let i = 0; i < rest.length; i += BATCH_SIZE) {
    const batch = rest.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((ticker) => fetchOne(ticker, results)));
    if (i + BATCH_SIZE < rest.length) await sleep(BATCH_DELAY_MS);
  }

  return results;
}
