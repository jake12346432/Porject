// In dev, frontend (5174) and backend (8788) run as separate processes, so
// the frontend needs the backend's full URL. In a production build, Express
// serves this same build as static files from the same origin as the API,
// so relative paths ("") just work — no separate URL needed at all.
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:8788" : "");

async function asJson(resp) {
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(body.error || `Request failed (${resp.status})`);
  return body;
}

// Turns a plain-English bond portfolio request into the filter-panel config via a
// server-side Claude API call (the server holds the API key, never the browser).
export async function getAIBondPortfolioConfig({ prompt }) {
  const resp = await fetch(`${API_BASE}/api/ai/portfolio-config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const body = await asJson(resp);
  return body.config;
}

export { API_BASE };
