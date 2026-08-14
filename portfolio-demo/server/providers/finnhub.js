// Finnhub free tier: 60 requests/minute, shared across everyone using this
// app (one API key). Reliable, authenticated API (not scraping) — doesn't
// have the datacenter-IP-blocking problem Yahoo did, but free-tier coverage
// is strongest for US-listed names; see symbolMap.js for which exchanges
// this is even attempted for.
export async function fetchFinnhubQuote(symbol, apiKey) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Finnhub HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const price = data?.c;
  if (typeof price !== "number" || price <= 0) {
    throw new Error("Finnhub returned no price (unsupported symbol on this plan, or invalid symbol)");
  }
  return {
    price,
    currency: "USD", // Finnhub's free /quote endpoint doesn't return currency; free-tier symbols are US-listed
    asOf: data.t ? new Date(data.t * 1000).toISOString() : new Date().toISOString(),
  };
}
