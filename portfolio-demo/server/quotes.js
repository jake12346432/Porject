import { finnhubSymbol, twelveDataSymbol } from "./providers/symbolMap.js";
import { fetchFinnhubQuote } from "./providers/finnhub.js";
import { fetchTwelveDataQuote } from "./providers/twelvedata.js";

// Quotes are shared across EVERYONE using this app (one server, one set of
// API keys), so two things matter beyond just "fetch a price": don't let
// different people's overlapping holdings each cost a fresh API call, and
// don't blow past either provider's per-minute limit when many holdings
// need fetching at once.

const CACHE_TTL_MS = 60_000;
const cache = new Map(); // "EXCH:TICKER" -> { value, expiresAt }

function getCached(key) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  cache.delete(key);
  return null;
}
function setCached(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Simple sliding-window rate limiter shared across all requests to this process. */
class RateLimiter {
  constructor(maxPerMinute) {
    this.max = maxPerMinute;
    this.timestamps = [];
  }
  async acquire() {
    for (;;) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((t) => now - t < 60_000);
      if (this.timestamps.length < this.max) {
        this.timestamps.push(now);
        return;
      }
      const waitMs = 60_000 - (now - this.timestamps[0]) + 50;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

// Leave a little headroom under each provider's stated cap.
const finnhubLimiter = new RateLimiter(55);
const twelveDataLimiter = new RateLimiter(7);

async function fetchOneHolding(holding, results) {
  const key = `${holding.exch}:${holding.ticker}`;
  const cached = getCached(key);
  if (cached) {
    results[holding.ticker] = cached;
    return;
  }

  const fhSymbol = finnhubSymbol(holding.exch, holding.ticker);
  if (fhSymbol) {
    try {
      await finnhubLimiter.acquire();
      const quote = await fetchFinnhubQuote(fhSymbol, process.env.FINNHUB_API_KEY);
      results[holding.ticker] = quote;
      setCached(key, quote);
      return;
    } catch (err) {
      console.error(`[quotes] Finnhub ${key} (${fhSymbol}) failed:`, err?.message || err);
    }
  }

  const td = twelveDataSymbol(holding.exch, holding.ticker);
  try {
    await twelveDataLimiter.acquire();
    const quote = await fetchTwelveDataQuote(td.symbol, td.exchange, process.env.TWELVEDATA_API_KEY);
    results[holding.ticker] = quote;
    setCached(key, quote);
  } catch (err) {
    console.error(`[quotes] Twelve Data ${key} (${td.symbol}${td.exchange ? "@" + td.exchange : ""}) failed:`, err?.message || err);
  }
}

/**
 * Fetches current quotes for a list of {ticker, exch} holdings. Returns
 * { [ticker]: { price, currency, asOf } } — holdings that fail on every
 * provider are simply omitted, not thrown, so one bad symbol doesn't fail
 * the whole batch.
 *
 * Tries Finnhub first (fast, 55/min budget) where the exchange is one its
 * free tier is expected to cover; anything left over falls back to Twelve
 * Data (broader international coverage, much stricter 7/min budget — a
 * portfolio with many non-US holdings can take a few minutes to fully
 * price). Both providers need API keys (FINNHUB_API_KEY / TWELVEDATA_API_KEY)
 * — holdings simply get skipped, with a clear log line, if a key is missing.
 */
export async function getQuotes(holdings) {
  const seen = new Set();
  const unique = holdings.filter((h) => {
    if (!h?.ticker || !h?.exch || seen.has(h.ticker)) return false;
    seen.add(h.ticker);
    return true;
  });
  const results = {};
  if (unique.length === 0) return results;

  if (!process.env.FINNHUB_API_KEY && !process.env.TWELVEDATA_API_KEY) {
    console.error("[quotes] Neither FINNHUB_API_KEY nor TWELVEDATA_API_KEY is set — no quotes can be fetched.");
    return results;
  }

  // Finnhub-eligible holdings first and in parallel (cheap, high limit);
  // Twelve-Data-only holdings afterward, rate-limited by the class above —
  // sequencing this way means the (likely larger) US-heavy portion of a
  // portfolio resolves quickly instead of queueing behind the slow provider.
  const finnhubEligible = unique.filter((h) => finnhubSymbol(h.exch, h.ticker));
  const twelveDataOnly = unique.filter((h) => !finnhubSymbol(h.exch, h.ticker));

  await Promise.all(finnhubEligible.map((h) => fetchOneHolding(h, results)));
  for (const h of twelveDataOnly) {
    await fetchOneHolding(h, results);
  }

  return results;
}
