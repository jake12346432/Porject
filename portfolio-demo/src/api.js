// In dev, frontend (5173) and backend (8787) run as separate processes, so
// the frontend needs the backend's full URL. In a production build, Express
// serves this same build as static files from the same origin as the API,
// so relative paths ("") just work — no separate URL needed at all.
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:8787" : "");

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

// Bonds have no live quote feed to hit — bondData.js already bakes in a price for each
// instrument, so the frontend prices the order itself and this just persists the result
// (see BondPortfolioBuilder.jsx's buildBondBuyOrder).
export async function submitBondBuy({ portfolioName, poundAmount, holdings, totalAllocated, cash }) {
  const resp = await fetch(`${API_BASE}/api/buy-bonds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ portfolioName, poundAmount, holdings, totalAllocated, cash }),
  });
  return asJson(resp);
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

// ============ Guided-flow portfolios (RPQ -> Equity -> Fixed Income -> Dashboard) ============

// Creates the portfolio record once the equity leg's buy is saved — returns { id }, which the
// browser keeps (localStorage) as the only way back to this portfolio's dashboard.
export async function createPortfolio({ rpqEquityPct, rpqFiPct, equityBuyListId }) {
  const resp = await fetch(`${API_BASE}/api/portfolios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rpqEquityPct, rpqFiPct, equityBuyListId }),
  });
  return asJson(resp);
}

// Attaches the bond leg once the Fixed Income step's buy is saved.
export async function attachBondLeg(portfolioId, bondBuyListId) {
  const resp = await fetch(`${API_BASE}/api/portfolios/${portfolioId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bondBuyListId }),
  });
  return asJson(resp);
}

// The dashboard's one fetch — portfolio metadata plus both legs' full buy/sell records.
export async function getPortfolio(portfolioId) {
  const resp = await fetch(`${API_BASE}/api/portfolios/${portfolioId}`);
  return asJson(resp);
}

// side: 'equity' | 'bond' | 'all'.
export async function sellPortfolioLeg(portfolioId, side) {
  const resp = await fetch(`${API_BASE}/api/portfolios/${portfolioId}/sell`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ side }),
  });
  return asJson(resp);
}

export { API_BASE };
