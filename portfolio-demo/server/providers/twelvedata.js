// Twelve Data free tier: 8 requests/minute, 800/day, shared across everyone
// using this app (one API key) — much stricter than Finnhub, so this is only
// tried as a fallback for symbols Finnhub can't price (mainly international
// exchanges Finnhub's free tier doesn't cover).
export async function fetchTwelveDataQuote(symbol, exchange, apiKey) {
  const params = new URLSearchParams({ symbol, apikey: apiKey });
  if (exchange) params.set("exchange", exchange);
  const url = `https://api.twelvedata.com/quote?${params.toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Twelve Data HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (data.status === "error" || data.code) {
    throw new Error(`Twelve Data: ${data.message || "unknown error"}`);
  }
  const price = parseFloat(data?.close ?? data?.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Twelve Data returned no usable price");
  }
  return {
    price,
    currency: data.currency || "USD",
    asOf: data.datetime ? new Date(data.datetime).toISOString() : new Date().toISOString(),
  };
}
