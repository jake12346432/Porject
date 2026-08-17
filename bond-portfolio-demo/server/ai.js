import { REGIONS, SECTORS, GOV_CORP_TYPES, YTM_MIN, YTM_MAX, DURATION_MIN, DURATION_MAX } from "../src/bondData.js";

const SYSTEM_PROMPT = `You convert a natural-language fixed income portfolio request into a JSON configuration for a bond screener. Respond with ONLY a raw JSON object — no markdown fences, no prose before or after.

Available regions (use exact strings): ${JSON.stringify(REGIONS)}
Available sectors (use exact strings): ${JSON.stringify(SECTORS)}
Available bond types: ${JSON.stringify(["All", ...GOV_CORP_TYPES])}
YTM range available in this universe: ${YTM_MIN}% to ${YTM_MAX}%
Duration range available in this universe: ${DURATION_MIN} to ${DURATION_MAX} years

Return exactly this shape:
{
  "regions": [subset of regions, or [] to mean all],
  "sectors": [subset of sectors, or [] to mean all],
  "govCorp": one of "All"/"Government"/"Corporate"/"Government-Related",
  "ytmMin": number (>= ${YTM_MIN}), "ytmMax": number (<= ${YTM_MAX}),
  "durationMin": number (>= ${DURATION_MIN}), "durationMax": number (<= ${DURATION_MAX}),
  "objective": {"Y": number, "S": number} (Income vs. Stability emphasis, should sum to ~100; use 50/50 if unspecified)
}

Guidance:
- "regions"/"sectors" are a HARD FILTER — anything left out is 100% excluded. Only restrict these for explicit geography/sector language: "only emerging markets", "no corporates", "exclude technology", "US treasuries only". Otherwise leave as [] (nothing excluded).
- "govCorp": "Government" for sovereign/treasury-only requests, "Corporate" for corporate-only, "Government-Related" only if agency/MBS is specifically mentioned, otherwise "All".
- "ytmMin"/"ytmMax" and "durationMin"/"durationMax" narrow the universe — use the full available range unless the user gives a specific income or rate-sensitivity preference ("short duration", "long duration", "high yield", "safe/low yield", explicit numeric ranges like "5 to 10 year duration").
- "income", "yield", "high yield", "maximize income" → push objective.Y up (e.g. 70-80) and objective.S down to match.
- "safe", "stable", "low risk", "capital preservation", "short duration" → push objective.S up, and consider narrowing durationMax down.
- There is NO credit-rating data in this universe — never mention or infer a credit rating.

Infer sensible values. Leave things at neutral defaults if not mentioned: govCorp "All", the full YTM/duration ranges, objective 50/50.`;

// Cheap + fast is plenty for this — it's structured extraction, not open-ended
// reasoning. Swap to a bigger model here if quality ever falls short.
const MODEL = "claude-haiku-4-5-20251001";

/**
 * Turns a natural-language bond portfolio request into the same JSON config
 * shape the frontend's filter panel produces, via a single Claude API call
 * made server-side (never expose the API key to the browser).
 */
export async function promptToBondPortfolioConfig(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "AI portfolio description isn't set up yet — no ANTHROPIC_API_KEY configured on the server. " +
      "See server/.env.example."
    );
    err.status = 501;
    throw err;
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    const err = new Error(`Anthropic API request failed (${resp.status}): ${body.slice(0, 300)}`);
    err.status = 502;
    throw err;
  }

  const data = await resp.json();
  const textBlocks = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  const clean = textBlocks.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    const err = new Error("Model response wasn't valid JSON — try rephrasing the request.");
    err.status = 502;
    throw err;
  }
}
