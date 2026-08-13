const SECTORS_PLACEHOLDER = "__SECTORS__";
const REGIONS_PLACEHOLDER = "__REGIONS__";

const SYSTEM_PROMPT_TEMPLATE = `You convert a natural-language portfolio request into a JSON configuration for a stock screener. Respond with ONLY a raw JSON object — no markdown fences, no prose before or after.

Available sectors (use exact strings): ${SECTORS_PLACEHOLDER}
Available regions (use exact strings): ${REGIONS_PLACEHOLDER}

Return exactly this shape:
{
  "regions": [subset of regions, or [] to mean all],
  "sectors": [subset of sectors, or [] to mean all],
  "qvgm": {"Q":number,"V":number,"G":number,"M":number} (should sum to ~100, reflects emphasis on Quality/Value/Growth/Momentum; use 25/25/25/25 if unspecified),
  "sectorWeights": {} OR an object covering ANY subset of sectors with numbers (only include this key at all if the user expressed a sector tilt/emphasis; omit or leave {} otherwise),
  "locWeights": {} OR an object covering ANY subset of regions with numbers (only include if the user expressed a geographic tilt; omit or leave {} otherwise),
  "dividend": {"enabled":bool,"min":number},
  "esg": {"enabled":bool,"min":number}
}
Infer sensible values. Leave things at neutral defaults if not mentioned (equal QVGM, no sector/location tilt, all regions/sectors included, thresholds disabled). The portfolio always shows the top 10 highest-scoring stocks — there is no holding-count setting.`;

// Cheap + fast is plenty for this — it's structured extraction, not open-ended
// reasoning. Swap to a bigger model here if quality ever falls short.
const MODEL = "claude-haiku-4-5-20251001";

/**
 * Turns a natural-language portfolio request into the same JSON config shape
 * the frontend's filter panel produces, via a single Claude API call made
 * server-side (never expose the API key to the browser).
 */
export async function promptToPortfolioConfig(prompt, { sectors, regions }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "AI portfolio description isn't set up yet — no ANTHROPIC_API_KEY configured on the server. " +
      "See server/.env.example."
    );
    err.status = 501;
    throw err;
  }

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE
    .replace(SECTORS_PLACEHOLDER, JSON.stringify(sectors))
    .replace(REGIONS_PLACEHOLDER, JSON.stringify(regions));

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system: systemPrompt,
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
