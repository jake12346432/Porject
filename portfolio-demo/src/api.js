const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

async function asJson(resp) {
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(body.error || `Request failed (${resp.status})`);
  return body;
}

// Prices + sizes a portfolio's holdings at current market prices and PERSISTS
// it server-side, tagged with today's date — every portfolio submitted today
// lands in the same combined daily order sheet.
export async function submitBuy({ portfolioName, dollarAmount, holdings }) {
  const resp = await fetch(`${API_BASE}/api/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ portfolioName, dollarAmount, holdings }),
  });
  return asJson(resp);
}

// Summary of everything submitted for a given trade date (defaults server-side to today).
export async function getDailyOrdersSummary(date) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const resp = await fetch(`${API_BASE}/api/daily-orders/summary${qs}`);
  return asJson(resp);
}

// Downloads the combined bulk-order workbook for a given trade date as a Blob.
export async function downloadDailyOrdersFile(date) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const resp = await fetch(`${API_BASE}/api/daily-orders${qs}`);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${resp.status})`);
  }
  return resp.blob();
}

// Turns a plain-English portfolio request into the filter-panel config via a
// server-side Claude API call (the server holds the API key, never the browser).
export async function getAIPortfolioConfig({ prompt, sectors, regions }) {
  const resp = await fetch(`${API_BASE}/api/ai/portfolio-config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, sectors, regions }),
  });
  const body = await asJson(resp);
  return body.config;
}

export { API_BASE };
